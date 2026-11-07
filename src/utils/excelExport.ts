import * as XLSX from 'xlsx';
import { TPSRecord, KecamatanSummary } from '@/types';

/**
 * Ekspor data ke file Excel (.xlsx) dengan 3 Sheet:
 * 1. Rekap Per Kecamatan & Desa
 * 2. Matriks Lengkap Seluruh TPS
 * 3. Daftar Kerja / Kekurangan & Anomali
 */
export function exportToExcel(
  tpsRecords: TPSRecord[],
  kecamatanSummaries: KecamatanSummary[]
) {
  const wb = XLSX.utils.book_new();

  // ==========================================
  // SHEET 1: REKAPITULASI KECAMATAN & DESA
  // ==========================================
  const rekapRows: any[] = [];
  rekapRows.push([
    'NO',
    'KECAMATAN',
    'JUMLAH DESA',
    'TOTAL TPS',
    'TPS LENGKAP (5/5)',
    'TPS KURANG BERKAS',
    'TPS MASIH KOSONG',
    'TPS DENGAN ANOMALI',
    'TOTAL BERKAS TERKUMPUL',
    'TARGET BERKAS (TPS x 5)',
    'PERSENTASE (%)',
  ]);

  let totalDesaAll = 0;
  let totalTpsAll = 0;
  let completedTpsAll = 0;
  let partialTpsAll = 0;
  let emptyTpsAll = 0;
  let anomalyTpsAll = 0;
  let totalFilesAll = 0;
  let targetFilesAll = 0;

  kecamatanSummaries.forEach((k, idx) => {
    totalDesaAll += k.totalDesa;
    totalTpsAll += k.totalTPS;
    completedTpsAll += k.completedTPS;
    partialTpsAll += k.partialTPS;
    emptyTpsAll += k.emptyTPS;
    anomalyTpsAll += k.anomalyTPS;
    totalFilesAll += k.totalFiles;
    targetFilesAll += k.expectedFiles;

    rekapRows.push([
      idx + 1,
      k.name.toUpperCase(),
      k.totalDesa,
      k.totalTPS,
      k.completedTPS,
      k.partialTPS,
      k.emptyTPS,
      k.anomalyTPS,
      k.totalFiles,
      k.expectedFiles,
      `${k.percentage.toFixed(1)}%`,
    ]);
  });

  // Baris Total Keseluruhan
  const globalPercentage =
    targetFilesAll > 0 ? (totalFilesAll / targetFilesAll) * 100 : 0;
  rekapRows.push([]);
  rekapRows.push([
    '',
    'TOTAL KABUPATEN SEKADAU',
    totalDesaAll,
    totalTpsAll,
    completedTpsAll,
    partialTpsAll,
    emptyTpsAll,
    anomalyTpsAll,
    totalFilesAll,
    targetFilesAll,
    `${globalPercentage.toFixed(1)}%`,
  ]);

  const wsRekap = XLSX.utils.aoa_to_sheet(rekapRows);
  // Atur lebar kolom sheet 1
  wsRekap['!cols'] = [
    { wch: 6 },  // No
    { wch: 25 }, // Kecamatan
    { wch: 14 }, // Jml Desa
    { wch: 12 }, // Total TPS
    { wch: 18 }, // Lengkap
    { wch: 20 }, // Kurang
    { wch: 18 }, // Kosong
    { wch: 20 }, // Anomali
    { wch: 24 }, // Total Berkas
    { wch: 24 }, // Target Berkas
    { wch: 16 }, // Persentase
  ];
  XLSX.utils.book_append_sheet(wb, wsRekap, 'Rekapitulasi Kecamatan');

  // ==========================================
  // SHEET 2: DETAIL MATRIKS SEMUA TPS
  // ==========================================
  const matrixRows: any[] = [];
  matrixRows.push([
    'NO',
    'KECAMATAN',
    'DESA / KELURAHAN',
    'TPS',
    'PRESIDEN (PPWP)',
    'DPR RI',
    'DPD RI',
    'DPRD PROVINSI',
    'DPRD KAB/KOTA',
    'JUMLAH BERKAS',
    'STATUS KELENGKAPAN',
    'CATATAN / ANOMALI',
    'LINK FOLDER DRIVE',
  ]);

  tpsRecords.forEach((tps, idx) => {
    let statusText = 'LENGKAP';
    if (tps.completedCount === 0) {
      statusText = 'KOSONG';
    } else if (tps.completedCount < 5) {
      statusText = `KURANG (${tps.completedCount}/5)`;
    }

    const anomalyText = tps.anomalies.map((a) => a.message).join('; ');

    matrixRows.push([
      idx + 1,
      tps.kecamatan,
      tps.desa,
      tps.tpsFolderName,
      tps.slotPPWP ? 'SUDAH' : 'BELUM',
      tps.slotDPR_RI ? 'SUDAH' : 'BELUM',
      tps.slotDPD ? 'SUDAH' : 'BELUM',
      tps.slotDPRD_PROV ? 'SUDAH' : 'BELUM',
      tps.slotDPRD_KAB ? 'SUDAH' : 'BELUM',
      `${tps.completedCount}/5`,
      statusText,
      anomalyText || 'Normal',
      tps.tpsFolderUrl || '-',
    ]);
  });

  const wsMatrix = XLSX.utils.aoa_to_sheet(matrixRows);
  wsMatrix['!cols'] = [
    { wch: 6 },  // No
    { wch: 20 }, // Kecamatan
    { wch: 22 }, // Desa
    { wch: 12 }, // TPS
    { wch: 18 }, // PPWP
    { wch: 14 }, // DPR RI
    { wch: 14 }, // DPD
    { wch: 16 }, // DPRD Prov
    { wch: 16 }, // DPRD Kab
    { wch: 16 }, // Jumlah
    { wch: 20 }, // Status
    { wch: 40 }, // Catatan
    { wch: 45 }, // Link Drive
  ];
  XLSX.utils.book_append_sheet(wb, wsMatrix, 'Matriks Seluruh TPS');

  // ==========================================
  // SHEET 3: DAFTAR KEKURANGAN & KERJA OPERATOR
  // ==========================================
  const incompleteRows: any[] = [];
  incompleteRows.push([
    'NO',
    'KECAMATAN',
    'DESA',
    'TPS',
    'FILE YANG MASIH BELUM ADA',
    'JUMLAH SUDAH ADA',
    'CATATAN PERBAIKAN / ANOMALI',
    'LINK FOLDER GOOGLE DRIVE',
  ]);

  const incompleteList = tpsRecords.filter(
    (t) => !t.isComplete || t.hasAnomaly
  );

  incompleteList.forEach((tps, idx) => {
    const missing: string[] = [];
    if (!tps.slotPPWP) missing.push('PPWP (Presiden)');
    if (!tps.slotDPR_RI) missing.push('DPR RI');
    if (!tps.slotDPD) missing.push('DPD RI');
    if (!tps.slotDPRD_PROV) missing.push('DPRD Provinsi');
    if (!tps.slotDPRD_KAB) missing.push('DPRD Kab/Kota');

    const anomalyNotes = tps.anomalies.map((a) => a.message).join('; ');

    incompleteRows.push([
      idx + 1,
      tps.kecamatan,
      tps.desa,
      tps.tpsFolderName,
      missing.join(', ') || 'Semua File Ada (Cek Anomali)',
      `${tps.completedCount}/5`,
      anomalyNotes || 'Menunggu operator scan berkas yang kurang',
      tps.tpsFolderUrl || '-',
    ]);
  });

  const wsIncomplete = XLSX.utils.aoa_to_sheet(incompleteRows);
  wsIncomplete['!cols'] = [
    { wch: 6 },
    { wch: 20 },
    { wch: 22 },
    { wch: 12 },
    { wch: 45 },
    { wch: 18 },
    { wch: 45 },
    { wch: 45 },
  ];
  XLSX.utils.book_append_sheet(wb, wsIncomplete, 'Daftar TPS Belum Lengkap');

  // Unduh Berkas
  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(
    wb,
    `REKAP_ARSIP_C_HASIL_KPU_SEKADAU_${today}.xlsx`
  );
}

