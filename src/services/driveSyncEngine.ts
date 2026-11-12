import { withDriveScan, driveScanToken, ensureDriveScanOwned } from './driveScanLock';
import { RawTpsData } from '@/types';
import { fetchKecamatanList, scanKecamatanFolder, quickScanRecentFiles } from './driveService';
import {
  fetchAllFileOverrides,
  deleteFileOverride,
  saveKecamatanScanToFirestore,
} from './firebase';

export interface SyncProgressCallback {
  (progressPercent: number, message: string, currentKecamatan?: string): void;
}

export interface SyncResult {
  updatedRawData: RawTpsData[];
  errors: string[];
}

/**
 * Mesin inti sinkronisasi Google Drive ke Firestore & Lokal.
 * Dapat dipanggil oleh modal manual maupun background auto-sync scheduler secara senyap.
 */
async function fullDriveSync(
  gasWebAppUrl: string,
  rootFolderId: string,
  currentRawData: RawTpsData[],
  onProgress?: SyncProgressCallback
): Promise<SyncResult> {
  const errors: string[] = [];

  if (!gasWebAppUrl || !rootFolderId) {
    throw new Error('URL Google Apps Script atau ID Root Folder belum terkonfigurasi.');
  }

  // 1. Ambil daftar folder kecamatan dari Google Drive
  const kecFolders = await fetchKecamatanList(gasWebAppUrl, rootFolderId, ensureDriveScanOwned);
  if (!kecFolders || kecFolders.length === 0) {
    throw new Error('Tidak ditemukan folder kecamatan di dalam root folder Google Drive.');
  }

  // 2. Ambil seluruh riwayat override anomali (termasuk status Hapus & Verifikasi) dari Firestore
  const overrides = await fetchAllFileOverrides();
  currentRawData.forEach((tps) => {
    tps.files.forEach((f) => {
      if ((f.overrideElection || f.isResolved) && !overrides.has(f.id)) {
        overrides.set(f.id, f);
      }
    });
  });

  let combinedData: RawTpsData[] = [...currentRawData];

  // 3. Pindai dan perbarui per folder kecamatan
  for (let i = 0; i < kecFolders.length; i++) {
    const kec = kecFolders[i];
    if (onProgress) {
      const pct = Math.round((i / kecFolders.length) * 100);
      onProgress(
        pct,
        `(${i + 1}/${kecFolders.length}) Memindai Kecamatan ${kec.name}...`,
        kec.name
      );
    }

    try {
      const scannedKecData = await scanKecamatanFolder(gasWebAppUrl, kec.id, undefined, ensureDriveScanOwned);

      // Pertahankan status anomali berdasarkan compare file.id
      scannedKecData.forEach((tps) => {
        tps.files.forEach((f) => {
          const savedOverride = overrides.get(f.id);
          if (savedOverride) {
            // Jika statusnya SUDAH_DIBENARKAN, lepas status sementara ini agar dievaluasi murni dari Drive terkini
            if (savedOverride.overrideElection === 'SUDAH_DIBENARKAN') {
              deleteFileOverride(f.id).catch(() => {});
              return;
            }
            f.overrideElection = savedOverride.overrideElection;
            f.isResolved = savedOverride.isResolved;
            f.resolutionNote = savedOverride.resolutionNote;
            f.resolvedAt = savedOverride.resolvedAt;
            f.resolvedBy = savedOverride.resolvedBy;
          }
        });
      });

      // Bersihkan file_overrides berstatus SUDAH_DIBENARKAN di kecamatan ini
      for (const [fId, ov] of overrides.entries()) {
        if (
          ov.overrideElection === 'SUDAH_DIBENARKAN' &&
          ov.kecamatan?.toLowerCase() === kec.name.toLowerCase()
        ) {
          deleteFileOverride(fId).catch(() => {});
        }
      }

      // Simpan per kecamatan ke Cloud Firestore
      try {
        await ensureDriveScanOwned();
        await saveKecamatanScanToFirestore(kec.name, scannedKecData, driveScanToken());
      } catch (dbErr: any) {
        console.error(`Gagal menyimpan ${kec.name} ke Firestore:`, dbErr);
        errors.push(`Firestore error ${kec.name}: ${dbErr.message || String(dbErr)}`);
      }

      // Hapus data lama kecamatan ini dan ganti dengan data baru
      combinedData = combinedData.filter(
        (r) => r.kecamatan.toLowerCase() !== kec.name.toLowerCase()
      );
      combinedData.push(...scannedKecData);
    } catch (err: any) {
      console.error(`Gagal memindai ${kec.name}:`, err);
      errors.push(`Scan error ${kec.name}: ${err.message || String(err)}`);
    }
  }

  if (onProgress) {
    onProgress(100, 'Sinkronisasi selesai!', undefined);
  }

  return {
    updatedRawData: combinedData,
    errors,
  };
}

/**
 * Smart Quick-Scan Engine:
 * Memindai berkas yang baru diunggah/diubah dalam 25 menit terakhir dari Google Drive
 * dan memperbarui data TPS & Firestore seketika (hanya 1-2 detik eksekusi).
 */
export interface QuickSyncResult {
  success: boolean;
  hasChanges: boolean;
  newFilesCount: number;
  updatedRawData: RawTpsData[];
  error?: string;
}

/**
 * Smart Quick-Scan: Memindai berkas yang baru diunggah/diubah dalam 30 menit terakhir.
 * Berjalan super kilat (1-2 detik) dan hanya mengupdate data TPS/Kecamatan yang terpengaruh ke Firestore.
 * Tidak melakukan full scan 7 kecamatan sehingga sangat hemat kuota dan tidak membuat lemot.
 */
async function smartQuickSync(
  gasWebAppUrl: string,
  rootFolderId: string,
  currentRawData: RawTpsData[]
): Promise<QuickSyncResult> {
  if (!gasWebAppUrl || !rootFolderId) {
    return {
      success: false,
      hasChanges: false,
      newFilesCount: 0,
      updatedRawData: currentRawData,
      error: 'URL Google Apps Script atau ID Folder belum terkonfigurasi.',
    };
  }

  // Pindai berkas 30 menit terakhir (cepat 1-2 detik)
  const recentItems = await quickScanRecentFiles(gasWebAppUrl, rootFolderId, 30, ensureDriveScanOwned);
  
  // Jika recentItems null (gagal HTTP atau action quickScan belum didukung di GAS lama)
  if (recentItems === null) {
    return {
      success: false,
      hasChanges: false,
      newFilesCount: 0,
      updatedRawData: currentRawData,
      error: 'Respon quickScan tidak valid dari server Google Apps Script.',
    };
  }

  // Jika tidak ada berkas baru dalam 30 menit terakhir: SELESAI SUKSES (0 berkas baru)
  if (recentItems.length === 0) {
    return {
      success: true,
      hasChanges: false,
      newFilesCount: 0,
      updatedRawData: currentRawData,
    };
  }

  const overrides = await fetchAllFileOverrides();
  let updatedData = [...currentRawData];
  let hasChanges = false;
  let newFilesCount = 0;
  const changedKecamatans = new Set<string>();

  for (const item of recentItems) {
    const { file, tpsFolderName, tpsFolderId, desa, kecamatan } = item;
    if (!tpsFolderId && !tpsFolderName) continue;
    if (!desa || !kecamatan) continue;

    // Temukan TPS dalam database
    const tpsIndex = updatedData.findIndex(
      (t) =>
        (tpsFolderId && t.tpsFolderId === tpsFolderId) ||
        (t.kecamatan.toLowerCase() === kecamatan.toLowerCase() &&
          t.desa.toLowerCase() === desa.toLowerCase() &&
          t.tpsFolderName.toLowerCase() === tpsFolderName.toLowerCase())
    );

    const fileOverride = overrides.get(file.id);
    const enrichedFile = {
      ...file,
      overrideElection: fileOverride?.overrideElection,
      isResolved: fileOverride?.isResolved,
      resolutionNote: fileOverride?.resolutionNote,
    };

    if (tpsIndex >= 0) {
      const existingTps = updatedData[tpsIndex];
      const existingFileIdx = existingTps.files.findIndex((f) => f.id === file.id);
      let nextFiles = [...existingTps.files];

      if (existingFileIdx >= 0) {
        // Periksa apakah ada perubahan metadata (nama, waktu update, atau ukuran)
        const oldFile = nextFiles[existingFileIdx];
        if (
          oldFile.updatedAt !== enrichedFile.updatedAt ||
          oldFile.size !== enrichedFile.size ||
          oldFile.name !== enrichedFile.name
        ) {
          nextFiles[existingFileIdx] = { ...oldFile, ...enrichedFile };
          hasChanges = true;
          changedKecamatans.add(existingTps.kecamatan);
        }
      } else {
        // Berkas C-Hasil baru ditambahkan ke TPS ini!
        nextFiles.push(enrichedFile as any);
        hasChanges = true;
        newFilesCount++;
        changedKecamatans.add(existingTps.kecamatan);
      }

      updatedData[tpsIndex] = { ...existingTps, files: nextFiles };
    }
  }

  // Jika ada perubahan, simpan HANYA kecamatan yang berubah ke Cloud Firestore
  if (hasChanges && changedKecamatans.size > 0) {
    for (const kec of changedKecamatans) {
      const kecData = updatedData.filter(
        (t) => t.kecamatan.toLowerCase() === kec.toLowerCase()
      );
      try {
        await ensureDriveScanOwned();
        await saveKecamatanScanToFirestore(kec, kecData, driveScanToken());
      } catch (dbErr) {
        console.warn(`Gagal menyimpan quick-sync ${kec} ke Firestore:`, dbErr);
      }
    }
    return {
      success: true,
      hasChanges: true,
      newFilesCount,
      updatedRawData: updatedData,
    };
  }

  return {
    success: true,
    hasChanges: false,
    newFilesCount: 0,
    updatedRawData: currentRawData,
  };
}


export const performFullDriveSync = (...args:Parameters<typeof fullDriveSync>) => withDriveScan('Sinkronisasi penuh Drive',()=>fullDriveSync(...args));
export const performSmartQuickSync = (...args:Parameters<typeof smartQuickSync>) => withDriveScan('Sinkronisasi otomatis Drive',()=>smartQuickSync(...args));
