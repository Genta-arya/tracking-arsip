import { RawTpsData } from '@/types';
import { fetchKecamatanList, scanKecamatanFolder } from './driveService';
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
export async function performFullDriveSync(
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
  const kecFolders = await fetchKecamatanList(gasWebAppUrl, rootFolderId);
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
      const scannedKecData = await scanKecamatanFolder(gasWebAppUrl, kec.id);

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
        await saveKecamatanScanToFirestore(kec.name, scannedKecData);
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
