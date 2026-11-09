import * as XLSX from 'xlsx';
import { TPSRecord, KecamatanSummary } from '@/types';
import { KPU_EXCEL_TEMPLATE_BASE64 } from './templateBase64';

function normalizeText(s: string | undefined | null): string {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Ekspor data ke file Excel (.xlsx) dengan Format Resmi KPU Sekadau (8 Sheet Kecamatan + Sheet Rekap Anomali):
 * 1. DATA KECAMATAN (Rekapitulasi resmi seluruh kecamatan)
 * 2. SEKADAU HILIR (20 Desa, 204 TPS)
 * 3. SEKADAU HULU (15 Desa, 100 TPS)
 * 4. NANGA TAMAN (15 Desa, 91 TPS)
 * 5. NANGA MAHAP (13 Desa, 97 TPS)
 * 6. BELITANG HILIR (11 Desa, 83 TPS)
 * 7. BELITANG HULU (13 Desa, 80 TPS)
 * 8. BELITANG (7 Desa, 43 TPS)
 * 9. DAFTAR ANOMALI & KEKURANGAN (Rincian seluruh kekurangan berkas & anomali)
 */
export function exportToExcel(
  tpsRecords: TPSRecord[],
  kecamatanSummaries: KecamatanSummary[]
) {
  let wb: XLSX.WorkBook;

  try {
    // Muat template resmi KPU Sekadau dari Base64
    wb = XLSX.read(KPU_EXCEL_TEMPLATE_BASE64, { type: 'base64' });
  } catch (err) {
    console.error('Gagal memuat template KPU dari Base64, fallback ke workbook baru:', err);
    wb = XLSX.utils.book_new();
  }

  // Buat lookup map TPSRecord berdasarkan kombinasi kecamatan, desa, dan tpsNumber
  const recordMap = new Map<string, TPSRecord>();
  tpsRecords.forEach((r) => {
    const key = `${normalizeText(r.kecamatan)}_${normalizeText(r.desa)}_${r.tpsNumber}`;
    recordMap.set(key, r);
  });

  // Buat lookup map KecamatanSummary
  const summaryMap = new Map<string, KecamatanSummary>();
  kecamatanSummaries.forEach((k) => {
    summaryMap.set(normalizeText(k.name), k);
  });

  // ==========================================
  // 1. UPDATE SHEET: DATA KECAMATAN
  // ==========================================
  const wsDataKec = wb.Sheets['DATA KECAMATAN'];
  if (wsDataKec) {
    // Tambah header metrik lanjutan di baris 6 (Row 6)
    wsDataKec['E6'] = { t: 's', v: 'BERKAS MASUK (SAH)' };
    wsDataKec['F6'] = { t: 's', v: 'TARGET BERKAS (TPS x 5)' };
    wsDataKec['G6'] = { t: 's', v: 'PERSENTASE (%)' };
    wsDataKec['H6'] = { t: 's', v: 'TPS LENGKAP (5/5)' };
    wsDataKec['I6'] = { t: 's', v: 'TPS KURANG' };
    wsDataKec['J6'] = { t: 's', v: 'TPS KOSONG' };
    wsDataKec['K6'] = { t: 's', v: 'TPS ADA ANOMALI' };

    let sumValidFiles = 0;
    let sumExpected = 0;
    let sumComplete = 0;
    let sumPartial = 0;
    let sumEmpty = 0;
    let sumAnomaly = 0;

    // Baris 7 sampai 13 berisi 7 Kecamatan
    for (let r = 6; r <= 12; r++) {
      const kecNameCell = wsDataKec[XLSX.utils.encode_cell({ r, c: 1 })];
      if (kecNameCell && kecNameCell.v) {
        const kecName = String(kecNameCell.v).trim();
        const s = summaryMap.get(normalizeText(kecName));
        if (s) {
          sumValidFiles += s.validFiles ?? s.totalFiles;
          sumExpected += s.expectedFiles;
          sumComplete += s.completedTPS;
          sumPartial += s.partialTPS;
          sumEmpty += s.emptyTPS;
          sumAnomaly += s.anomalyTPS;

          wsDataKec[XLSX.utils.encode_cell({ r, c: 4 })] = { t: 'n', v: s.validFiles ?? s.totalFiles };
          wsDataKec[XLSX.utils.encode_cell({ r, c: 5 })] = { t: 'n', v: s.expectedFiles };
          wsDataKec[XLSX.utils.encode_cell({ r, c: 6 })] = { t: 's', v: `${s.percentage.toFixed(1)}%` };
          wsDataKec[XLSX.utils.encode_cell({ r, c: 7 })] = { t: 'n', v: s.completedTPS };
          wsDataKec[XLSX.utils.encode_cell({ r, c: 8 })] = { t: 'n', v: s.partialTPS };
          wsDataKec[XLSX.utils.encode_cell({ r, c: 9 })] = { t: 'n', v: s.emptyTPS };
          wsDataKec[XLSX.utils.encode_cell({ r, c: 10 })] = { t: 'n', v: s.anomalyTPS };
        }
      }
    }

    // Baris 14: Total Kabupaten Sekadau
    const totalPct = sumExpected > 0 ? (sumValidFiles / sumExpected) * 100 : 0;
    wsDataKec['E14'] = { t: 'n', v: sumValidFiles };
    wsDataKec['F14'] = { t: 'n', v: sumExpected };
    wsDataKec['G14'] = { t: 's', v: `${totalPct.toFixed(1)}%` };
    wsDataKec['H14'] = { t: 'n', v: sumComplete };
    wsDataKec['I14'] = { t: 'n', v: sumPartial };
    wsDataKec['J14'] = { t: 'n', v: sumEmpty };
    wsDataKec['K14'] = { t: 'n', v: sumAnomaly };

    // Atur lebar kolom
    wsDataKec['!cols'] = [
      { wch: 6 },  // A: NO
      { wch: 22 }, // B: KECAMATAN
      { wch: 14 }, // C: JUMLAH DESA
      { wch: 14 }, // D: JUMLAH TPS
      { wch: 20 }, // E: BERKAS MASUK
      { wch: 22 }, // F: TARGET BERKAS
      { wch: 16 }, // G: PERSENTASE
      { wch: 18 }, // H: TPS LENGKAP
      { wch: 16 }, // I: TPS KURANG
      { wch: 16 }, // J: TPS KOSONG
      { wch: 18 }, // K: TPS ANOMALI
    ];

    // Perluas jangkauan sel sampai kolom K
    const dataRange = XLSX.utils.decode_range(wsDataKec['!ref'] || 'A1:D14');
    if (dataRange.e.c < 10) dataRange.e.c = 10;
    wsDataKec['!ref'] = XLSX.utils.encode_range(dataRange);
  }

  // ==========================================
  // 2. UPDATE 7 SHEET KECAMATAN
  // ==========================================
  const KECAMATAN_SHEETS = [
    'SEKADAU HILIR',
    'SEKADAU HULU',
    'NANGA TAMAN',
    'NANGA MAHAP',
    'BELITANG HILIR',
    'BELITANG HULU',
    'BELITANG',
  ];

  KECAMATAN_SHEETS.forEach((sheetName) => {
    const ws = wb.Sheets[sheetName];
    if (!ws) return;

    // Header Kolom I, J, K pada Baris 6 & Baris 9
    ws['I6'] = { t: 's', v: 'STATUS KELENGKAPAN' };
    ws['J6'] = { t: 's', v: 'CATATAN / ANOMALI' };
    ws['K6'] = { t: 's', v: 'LINK FOLDER GOOGLE DRIVE' };
    ws['I9'] = { t: 'n', v: 9 };
    ws['J9'] = { t: 'n', v: 10 };
    ws['K9'] = { t: 'n', v: 11 };

    ws['!merges'] = ws['!merges'] || [];
    ws['!merges'].push(
      { s: { c: 8, r: 5 }, e: { c: 8, r: 7 } },
      { s: { c: 9, r: 5 }, e: { c: 9, r: 7 } },
      { s: { c: 10, r: 5 }, e: { c: 10, r: 7 } }
    );

    ws['!cols'] = [
      { wch: 5 },  // A: NO DESA
      { wch: 24 }, // B: NAMA DESA/KEL
      { wch: 8 },  // C: TPS
      { wch: 14 }, // D: PRESIDEN (PPWP)
      { wch: 14 }, // E: DPD
      { wch: 14 }, // F: DPR RI
      { wch: 14 }, // G: DPRD PROV
      { wch: 15 }, // H: DPRD KAB/KOTA
      { wch: 20 }, // I: STATUS KELENGKAPAN
      { wch: 38 }, // J: CATATAN / ANOMALI
      { wch: 48 }, // K: LINK FOLDER DRIVE
    ];

    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:H100');
    if (range.e.c < 10) range.e.c = 10;
    ws['!ref'] = XLSX.utils.encode_range(range);

    let currentDesa = '';

    for (let r = 9; r <= range.e.r; r++) {
      // Cek apakah baris ini memuat nama desa baru di kolom B (c: 1)
      const desaCell = ws[XLSX.utils.encode_cell({ r, c: 1 })];
      if (desaCell && desaCell.v && String(desaCell.v).trim()) {
        currentDesa = String(desaCell.v).trim();
      }

      // Cek nomor TPS di kolom C (c: 2)
      const tpsCell = ws[XLSX.utils.encode_cell({ r, c: 2 })];
      if (tpsCell && typeof tpsCell.v === 'number') {
        const tpsNum = tpsCell.v;
        const key = `${normalizeText(sheetName)}_${normalizeText(currentDesa)}_${tpsNum}`;
        const rec = recordMap.get(key);

        if (rec) {
          // Centang 5 Jenis Pemilihan
          ws[XLSX.utils.encode_cell({ r, c: 3 })] = {
            t: 's',
            v: rec.slotPPWP ? '✓' : '',
          };
          ws[XLSX.utils.encode_cell({ r, c: 4 })] = {
            t: 's',
            v: rec.slotDPD ? '✓' : '',
          };
          ws[XLSX.utils.encode_cell({ r, c: 5 })] = {
            t: 's',
            v: rec.slotDPR_RI ? '✓' : '',
          };
          ws[XLSX.utils.encode_cell({ r, c: 6 })] = {
            t: 's',
            v: rec.slotDPRD_PROV ? '✓' : '',
          };
          ws[XLSX.utils.encode_cell({ r, c: 7 })] = {
            t: 's',
            v: rec.slotDPRD_KAB ? '✓' : '',
          };

          // Status Kelengkapan TPS
          let statusText = 'LENGKAP (5/5)';
          if (rec.completedCount === 0) {
            statusText = 'KOSONG (0/5)';
          } else if (rec.completedCount < 5) {
            statusText = `KURANG (${rec.completedCount}/5)`;
          }
          ws[XLSX.utils.encode_cell({ r, c: 8 })] = { t: 's', v: statusText };

          // Catatan / Anomali Berkas
          let anomalyNote = 'Normal';
          if (rec.hasAnomaly) {
            anomalyNote = rec.anomalies.map((a) => a.message).join('; ');
          }
          ws[XLSX.utils.encode_cell({ r, c: 9 })] = { t: 's', v: anomalyNote };

          // Link Google Drive Folder TPS
          if (rec.tpsFolderUrl) {
            ws[XLSX.utils.encode_cell({ r, c: 10 })] = {
              t: 's',
              v: rec.tpsFolderUrl,
            };
          }
        }
      }
    }
  });

  // ==========================================
  // 3. SHEET 9: DAFTAR KEKURANGAN & ANOMALI
  // ==========================================
  const incompleteRows: any[] = [];
  incompleteRows.push([
    'NO',
    'KECAMATAN',
    'DESA',
    'TPS',
    'BERKAS YANG BELUM ADA',
    'JUMLAH SUDAH TERSEDIA',
    'CATATAN PERBAIKAN / ANOMALI',
    'STATUS KOREKSI',
    'LINK FOLDER GOOGLE DRIVE',
  ]);

  const incompleteList = tpsRecords.filter(
    (t) => !t.isComplete || t.hasAnomaly
  );

  incompleteList.forEach((tps, idx) => {
    const missing: string[] = [];
    if (!tps.slotPPWP) missing.push('PPWP (Presiden)');
    if (!tps.slotDPD) missing.push('DPD');
    if (!tps.slotDPR_RI) missing.push('DPR RI');
    if (!tps.slotDPRD_PROV) missing.push('DPRD Prov');
    if (!tps.slotDPRD_KAB) missing.push('DPRD Kab/Kota');

    const anomalyNotes = tps.anomalies.map((a) => a.message).join('; ');

    // Cek apakah ada file yang ditandai SUDAH_DIBENARKAN
    const hasPendingSync = tps.files.some(
      (f) => f.overrideElection === 'SUDAH_DIBENARKAN'
    );
    const statusKoreksi = hasPendingSync
      ? 'Sudah Dibenarkan (Menunggu Sync Drive)'
      : tps.hasAnomaly
      ? 'Perlu Koreksi / Pengecekan'
      : 'Menunggu Unggah Berkas';

    incompleteRows.push([
      idx + 1,
      tps.kecamatan,
      tps.desa,
      tps.tpsFolderName,
      missing.join(', ') || 'Semua 5 Berkas Ada (Periksa Anomali)',
      `${tps.completedCount}/5`,
      anomalyNotes || 'Menunggu operator mengunggah berkas yang kurang',
      statusKoreksi,
      tps.tpsFolderUrl || '-',
    ]);
  });

  const wsIncomplete = XLSX.utils.aoa_to_sheet(incompleteRows);
  wsIncomplete['!cols'] = [
    { wch: 6 },  // NO
    { wch: 20 }, // KECAMATAN
    { wch: 22 }, // DESA
    { wch: 12 }, // TPS
    { wch: 45 }, // BERKAS YANG BELUM ADA
    { wch: 22 }, // JUMLAH SUDAH ADA
    { wch: 45 }, // CATATAN
    { wch: 35 }, // STATUS KOREKSI
    { wch: 45 }, // LINK GOOGLE DRIVE
  ];

  XLSX.utils.book_append_sheet(wb, wsIncomplete, 'DAFTAR KEKURANGAN & ANOMALI');

  // Unduh Berkas
  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `REKAP_C_HASIL_KPU_SEKADAU_${today}.xlsx`);
}
