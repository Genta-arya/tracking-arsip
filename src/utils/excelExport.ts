import XLSX from 'xlsx-js-style';
import { TPSRecord, KecamatanSummary } from '@/types';
import { KPU_EXCEL_TEMPLATE_BASE64 } from './templateBase64';

function normalizeText(s: string | undefined | null): string {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

// ==========================================
// PALET WARNA & STYLE RESMI KPU SEKADAU
// ==========================================
const BORDER_THIN = {
  top: { style: 'thin', color: { rgb: 'CBD5E1' } },
  bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
  left: { style: 'thin', color: { rgb: 'CBD5E1' } },
  right: { style: 'thin', color: { rgb: 'CBD5E1' } },
};

const BORDER_HEADER = {
  top: { style: 'medium', color: { rgb: '1E293B' } },
  bottom: { style: 'medium', color: { rgb: '1E293B' } },
  left: { style: 'thin', color: { rgb: '94A3B8' } },
  right: { style: 'thin', color: { rgb: '94A3B8' } },
};

const BORDER_TOTAL = {
  top: { style: 'thin', color: { rgb: '334155' } },
  bottom: { style: 'double', color: { rgb: '0F172A' } },
  left: { style: 'thin', color: { rgb: 'CBD5E1' } },
  right: { style: 'thin', color: { rgb: 'CBD5E1' } },
};

// 1. Header Utama Warna Merah Maroon KPU
const STYLE_HEADER_MAROON = {
  font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
  fill: { fgColor: { rgb: '7F1D1D' } }, // KPU Maroon
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: BORDER_HEADER,
};

// 2. Sub-Header Jenis Dokumen
const STYLE_HEADER_SUB = {
  font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '78350F' } },
  fill: { fgColor: { rgb: 'FEF3C7' } }, // Gold Tint
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: BORDER_THIN,
};

// 3. Sub-Header Lembar Berkas
const STYLE_HEADER_LEMBAR = {
  font: { name: 'Calibri', sz: 9, italic: true, color: { rgb: '475569' } },
  fill: { fgColor: { rgb: 'FFFBEB' } },
  alignment: { horizontal: 'center', vertical: 'center' },
  border: BORDER_THIN,
};

// 4. Nomor Urut Kolom (1 s/d 11)
const STYLE_HEADER_NUM = {
  font: { name: 'Calibri', sz: 9, bold: true, color: { rgb: '334155' } },
  fill: { fgColor: { rgb: 'E2E8F0' } },
  alignment: { horizontal: 'center', vertical: 'center' },
  border: BORDER_THIN,
};

// 5. Nama Desa Pemisah (Zebra/Section)
const STYLE_DESA_NAME = {
  font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '0F172A' } },
  fill: { fgColor: { rgb: 'F1F5F9' } },
  alignment: { vertical: 'center' },
  border: BORDER_THIN,
};

const STYLE_NO_DESA = {
  font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '475569' } },
  fill: { fgColor: { rgb: 'F1F5F9' } },
  alignment: { horizontal: 'center', vertical: 'center' },
  border: BORDER_THIN,
};

const STYLE_TPS_NUM = {
  font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '1E293B' } },
  alignment: { horizontal: 'center', vertical: 'center' },
  border: BORDER_THIN,
};

// 6. Centang Berkas Ada (Hijau Emerald Segar)
const STYLE_CHECKED = {
  font: { name: 'Segoe UI', sz: 12, bold: true, color: { rgb: '047857' } },
  fill: { fgColor: { rgb: 'ECFDF5' } },
  alignment: { horizontal: 'center', vertical: 'center' },
  border: BORDER_THIN,
};

// 7. Berkas Belum Ada
const STYLE_UNCHECKED = {
  font: { name: 'Calibri', sz: 10, color: { rgb: 'CBD5E1' } },
  alignment: { horizontal: 'center', vertical: 'center' },
  border: BORDER_THIN,
};

// 8. Status Lengkap (5/5)
const STYLE_STATUS_COMPLETE = {
  font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '065F46' } },
  fill: { fgColor: { rgb: 'D1FAE5' } },
  alignment: { horizontal: 'center', vertical: 'center' },
  border: BORDER_THIN,
};

// 9. Status Kurang
const STYLE_STATUS_PARTIAL = {
  font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '92400E' } },
  fill: { fgColor: { rgb: 'FEF3C7' } },
  alignment: { horizontal: 'center', vertical: 'center' },
  border: BORDER_THIN,
};

// 10. Status Kosong (0/5)
const STYLE_STATUS_EMPTY = {
  font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '991B1B' } },
  fill: { fgColor: { rgb: 'FEE2E2' } },
  alignment: { horizontal: 'center', vertical: 'center' },
  border: BORDER_THIN,
};

// 11. Catatan Anomali
const STYLE_ANOMALY = {
  font: { name: 'Calibri', sz: 9, bold: true, color: { rgb: 'C2410C' } },
  fill: { fgColor: { rgb: 'FFEDD5' } },
  alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
  border: BORDER_THIN,
};

const STYLE_NORMAL = {
  font: { name: 'Calibri', sz: 9, color: { rgb: '64748B' } },
  alignment: { horizontal: 'center', vertical: 'center' },
  border: BORDER_THIN,
};

// 12. Link Google Drive Interaktif (Bisa langsung diklik di Excel)
const STYLE_DRIVE_LINK = {
  font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '1D4ED8' }, underline: true },
  fill: { fgColor: { rgb: 'EFF6FF' } },
  alignment: { horizontal: 'center', vertical: 'center' },
  border: BORDER_THIN,
};

const STYLE_EMPTY_CELL = {
  border: BORDER_THIN,
};

const STYLE_TOTAL_ROW = {
  font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: '0F172A' } },
  fill: { fgColor: { rgb: 'E2E8F0' } },
  alignment: { horizontal: 'center', vertical: 'center' },
  border: BORDER_TOTAL,
};

/**
 * Ekspor data ke file Excel (.xlsx) dengan Format Resmi KPU Sekadau (8 Sheet Kecamatan + Sheet Rekap Anomali):
 * 1. DATA KECAMATAN (Rekapitulasi resmi seluruh kecamatan dengan pewarnaan & autofilter)
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
  let wb: any;

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
    // Header Kolom A s/d K (Baris 6)
    const headersDataKec = [
      { col: 'A', text: 'NO' },
      { col: 'B', text: 'KECAMATAN' },
      { col: 'C', text: 'JUMLAH DESA' },
      { col: 'D', text: 'JUMLAH TPS' },
      { col: 'E', text: 'BERKAS MASUK (SAH)' },
      { col: 'F', text: 'TARGET BERKAS (TPS x 5)' },
      { col: 'G', text: 'PERSENTASE (%)' },
      { col: 'H', text: 'TPS LENGKAP (5/5)' },
      { col: 'I', text: 'TPS KURANG' },
      { col: 'J', text: 'TPS KOSONG' },
      { col: 'K', text: 'TPS ADA ANOMALI' },
    ];

    headersDataKec.forEach((h) => {
      wsDataKec[`${h.col}6`] = {
        t: 's',
        v: h.text,
        s: STYLE_HEADER_MAROON,
      };
    });

    let sumValidFiles = 0;
    let sumExpected = 0;
    let sumComplete = 0;
    let sumPartial = 0;
    let sumEmpty = 0;
    let sumAnomaly = 0;

    // Baris 7 sampai 13 berisi 7 Kecamatan
    for (let r = 6; r <= 12; r++) {
      const rowIdx = r + 1;
      const kecNameCell = wsDataKec[`B${rowIdx}`];
      if (kecNameCell && kecNameCell.v) {
        const kecName = String(kecNameCell.v).trim();
        const s = summaryMap.get(normalizeText(kecName));

        // Format kolom A, B, C, D
        wsDataKec[`A${rowIdx}`].s = STYLE_NO_DESA;
        wsDataKec[`B${rowIdx}`].s = STYLE_DESA_NAME;
        if (wsDataKec[`C${rowIdx}`]) wsDataKec[`C${rowIdx}`].s = STYLE_TPS_NUM;
        if (wsDataKec[`D${rowIdx}`]) wsDataKec[`D${rowIdx}`].s = STYLE_TPS_NUM;

        if (s) {
          sumValidFiles += s.validFiles ?? s.totalFiles;
          sumExpected += s.expectedFiles;
          sumComplete += s.completedTPS;
          sumPartial += s.partialTPS;
          sumEmpty += s.emptyTPS;
          sumAnomaly += s.anomalyTPS;

          wsDataKec[`E${rowIdx}`] = { t: 'n', v: s.validFiles ?? s.totalFiles, s: STYLE_TPS_NUM };
          wsDataKec[`F${rowIdx}`] = { t: 'n', v: s.expectedFiles, s: STYLE_TPS_NUM };
          wsDataKec[`G${rowIdx}`] = {
            t: 's',
            v: `${s.percentage.toFixed(1)}%`,
            s: s.percentage >= 100 ? STYLE_STATUS_COMPLETE : s.percentage > 0 ? STYLE_STATUS_PARTIAL : STYLE_STATUS_EMPTY,
          };
          wsDataKec[`H${rowIdx}`] = { t: 'n', v: s.completedTPS, s: STYLE_STATUS_COMPLETE };
          wsDataKec[`I${rowIdx}`] = { t: 'n', v: s.partialTPS, s: s.partialTPS > 0 ? STYLE_STATUS_PARTIAL : STYLE_NORMAL };
          wsDataKec[`J${rowIdx}`] = { t: 'n', v: s.emptyTPS, s: s.emptyTPS > 0 ? STYLE_STATUS_EMPTY : STYLE_NORMAL };
          wsDataKec[`K${rowIdx}`] = { t: 'n', v: s.anomalyTPS, s: s.anomalyTPS > 0 ? STYLE_ANOMALY : STYLE_NORMAL };
        }
      }
    }

    // Baris 14: Total Keseluruhan
    const totalPct = sumExpected > 0 ? (sumValidFiles / sumExpected) * 100 : 0;
    wsDataKec['B14'] = { t: 's', v: 'TOTAL KABUPATEN SEKADAU', s: STYLE_TOTAL_ROW };
    if (wsDataKec['C14']) wsDataKec['C14'].s = STYLE_TOTAL_ROW;
    if (wsDataKec['D14']) wsDataKec['D14'].s = STYLE_TOTAL_ROW;
    wsDataKec['E14'] = { t: 'n', v: sumValidFiles, s: STYLE_TOTAL_ROW };
    wsDataKec['F14'] = { t: 'n', v: sumExpected, s: STYLE_TOTAL_ROW };
    wsDataKec['G14'] = { t: 's', v: `${totalPct.toFixed(1)}%`, s: STYLE_TOTAL_ROW };
    wsDataKec['H14'] = { t: 'n', v: sumComplete, s: STYLE_TOTAL_ROW };
    wsDataKec['I14'] = { t: 'n', v: sumPartial, s: STYLE_TOTAL_ROW };
    wsDataKec['J14'] = { t: 'n', v: sumEmpty, s: STYLE_TOTAL_ROW };
    wsDataKec['K14'] = { t: 'n', v: sumAnomaly, s: STYLE_TOTAL_ROW };

    // Atur AutoFilter pada sheet DATA KECAMATAN
    wsDataKec['!autofilter'] = { ref: 'A6:K13' };

    // Lebar Kolom
    wsDataKec['!cols'] = [
      { wch: 6 },  // A: NO
      { wch: 24 }, // B: KECAMATAN
      { wch: 15 }, // C: JUMLAH DESA
      { wch: 15 }, // D: JUMLAH TPS
      { wch: 22 }, // E: BERKAS MASUK
      { wch: 24 }, // F: TARGET BERKAS
      { wch: 16 }, // G: PERSENTASE
      { wch: 18 }, // H: TPS LENGKAP
      { wch: 16 }, // I: TPS KURANG
      { wch: 16 }, // J: TPS KOSONG
      { wch: 18 }, // K: TPS ANOMALI
    ];

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

    // 1. Format Header Baris 6 (Header Utama Merah Maroon KPU)
    ws['A6'] = { t: 's', v: 'NAMA \nDESA/KEL', s: STYLE_HEADER_MAROON };
    ws['C6'] = { t: 's', v: 'TPS', s: STYLE_HEADER_MAROON };
    ws['D6'] = { t: 's', v: 'JENIS DOKUMEN C HASIL', s: STYLE_HEADER_MAROON };
    ws['I6'] = { t: 's', v: 'STATUS KELENGKAPAN', s: STYLE_HEADER_MAROON };
    ws['J6'] = { t: 's', v: 'CATATAN / ANOMALI', s: STYLE_HEADER_MAROON };
    ws['K6'] = { t: 's', v: 'LINK FOLDER GOOGLE DRIVE', s: STYLE_HEADER_MAROON };

    // 2. Format Baris 7 (Sub-Header Jenis Pemilihan)
    const electionHeaders = [
      { col: 'D', text: 'PRESIDEN' },
      { col: 'E', text: 'DPD' },
      { col: 'F', text: 'DPR RI' },
      { col: 'G', text: 'DPRD PROV' },
      { col: 'H', text: 'DPRD KAB/KOTA' },
    ];
    electionHeaders.forEach((eh) => {
      ws[`${eh.col}7`] = { t: 's', v: eh.text, s: STYLE_HEADER_SUB };
    });

    // 3. Format Baris 8 (Keterangan Jumlah Lembar Berkas)
    const lembarHeaders = [
      { col: 'D', text: '(3 Lembar)' },
      { col: 'E', text: '(4 Lembar)' },
      { col: 'F', text: '(20 Lembar)' },
      { col: 'G', text: '(20 Lembar)' },
      { col: 'H', text: '(20 Lembar)' },
    ];
    lembarHeaders.forEach((lh) => {
      ws[`${lh.col}8`] = { t: 's', v: lh.text, s: STYLE_HEADER_LEMBAR };
    });

    // 4. Format Baris 9 (Nomor Urut Kolom 1..11)
    for (let c = 0; c < 11; c++) {
      const colLetter = XLSX.utils.encode_col(c);
      ws[`${colLetter}9`] = { t: 'n', v: c + 1, s: STYLE_HEADER_NUM };
    }

    // Merge Cells untuk Kolom I, J, K
    ws['!merges'] = ws['!merges'] || [];
    ws['!merges'].push(
      { s: { c: 8, r: 5 }, e: { c: 8, r: 7 } },
      { s: { c: 9, r: 5 }, e: { c: 9, r: 7 } },
      { s: { c: 10, r: 5 }, e: { c: 10, r: 7 } }
    );

    // Atur Lebar Kolom yang Ideal
    ws['!cols'] = [
      { wch: 6 },  // A: NO DESA
      { wch: 25 }, // B: NAMA DESA/KEL
      { wch: 8 },  // C: TPS
      { wch: 14 }, // D: PRESIDEN (PPWP)
      { wch: 14 }, // E: DPD
      { wch: 14 }, // F: DPR RI
      { wch: 14 }, // G: DPRD PROV
      { wch: 16 }, // H: DPRD KAB/KOTA
      { wch: 20 }, // I: STATUS KELENGKAPAN
      { wch: 38 }, // J: CATATAN / ANOMALI
      { wch: 26 }, // K: LINK GOOGLE DRIVE
    ];

    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:H100');
    if (range.e.c < 10) range.e.c = 10;
    ws['!ref'] = XLSX.utils.encode_range(range);

    let currentDesa = '';
    let lastTpsRow = 9;

    for (let r = 9; r <= range.e.r; r++) {
      const rowIdx = r + 1;

      // Cek apakah baris ini memuat nama desa baru di kolom B (c: 1)
      const desaCell = ws[`B${rowIdx}`];
      if (desaCell && desaCell.v && String(desaCell.v).trim()) {
        currentDesa = String(desaCell.v).trim();
        // Beri style pada baris judul desa
        if (ws[`A${rowIdx}`]) ws[`A${rowIdx}`].s = STYLE_NO_DESA;
        ws[`B${rowIdx}`].s = STYLE_DESA_NAME;
      }

      // Cek nomor TPS di kolom C (c: 2)
      const tpsCell = ws[`C${rowIdx}`];
      if (tpsCell && typeof tpsCell.v === 'number') {
        lastTpsRow = rowIdx;
        const tpsNum = tpsCell.v;
        const key = `${normalizeText(sheetName)}_${normalizeText(currentDesa)}_${tpsNum}`;
        const rec = recordMap.get(key);

        ws[`C${rowIdx}`].s = STYLE_TPS_NUM;

        // Pastikan kolom A & B pada baris anak tetap memiliki border rapi
        if (!ws[`A${rowIdx}`]) ws[`A${rowIdx}`] = { t: 's', v: '', s: STYLE_EMPTY_CELL };
        if (!ws[`B${rowIdx}`]) ws[`B${rowIdx}`] = { t: 's', v: '', s: STYLE_EMPTY_CELL };

        if (rec) {
          // Centang 5 Jenis Pemilihan
          ws[`D${rowIdx}`] = {
            t: 's',
            v: rec.slotPPWP ? '✓' : '-',
            s: rec.slotPPWP ? STYLE_CHECKED : STYLE_UNCHECKED,
          };
          ws[`E${rowIdx}`] = {
            t: 's',
            v: rec.slotDPD ? '✓' : '-',
            s: rec.slotDPD ? STYLE_CHECKED : STYLE_UNCHECKED,
          };
          ws[`F${rowIdx}`] = {
            t: 's',
            v: rec.slotDPR_RI ? '✓' : '-',
            s: rec.slotDPR_RI ? STYLE_CHECKED : STYLE_UNCHECKED,
          };
          ws[`G${rowIdx}`] = {
            t: 's',
            v: rec.slotDPRD_PROV ? '✓' : '-',
            s: rec.slotDPRD_PROV ? STYLE_CHECKED : STYLE_UNCHECKED,
          };
          ws[`H${rowIdx}`] = {
            t: 's',
            v: rec.slotDPRD_KAB ? '✓' : '-',
            s: rec.slotDPRD_KAB ? STYLE_CHECKED : STYLE_UNCHECKED,
          };

          // Status Kelengkapan TPS
          let statusText = 'LENGKAP (5/5)';
          let statusStyle = STYLE_STATUS_COMPLETE;
          if (rec.completedCount === 0) {
            statusText = 'KOSONG (0/5)';
            statusStyle = STYLE_STATUS_EMPTY;
          } else if (rec.completedCount < 5) {
            statusText = `KURANG (${rec.completedCount}/5)`;
            statusStyle = STYLE_STATUS_PARTIAL;
          }
          ws[`I${rowIdx}`] = { t: 's', v: statusText, s: statusStyle };

          // Catatan / Anomali Berkas
          let anomalyNote = 'Normal';
          let anomalyStyle = STYLE_NORMAL;
          if (rec.hasAnomaly) {
            anomalyNote = rec.anomalies.map((a) => a.message).join('; ');
            anomalyStyle = STYLE_ANOMALY;
          }
          ws[`J${rowIdx}`] = { t: 's', v: anomalyNote, s: anomalyStyle };

          // Link Google Drive Folder TPS Interaktif (Bisa langsung diklik di Excel)
          if (rec.tpsFolderUrl) {
            ws[`K${rowIdx}`] = {
              t: 's',
              v: '🔗 Buka Drive TPS',
              f: `HYPERLINK("${rec.tpsFolderUrl}", "🔗 Buka Drive TPS")`,
              l: { Target: rec.tpsFolderUrl, Tooltip: `Buka Folder Google Drive ${rec.tpsFolderName}` },
              s: STYLE_DRIVE_LINK,
            };
          } else {
            ws[`K${rowIdx}`] = { t: 's', v: '-', s: STYLE_UNCHECKED };
          }
        } else {
          // Jika TPS belum masuk pindaian Drive
          ['D', 'E', 'F', 'G', 'H'].forEach((c) => {
            ws[`${c}${rowIdx}`] = { t: 's', v: '-', s: STYLE_UNCHECKED };
          });
          ws[`I${rowIdx}`] = { t: 's', v: 'KOSONG (0/5)', s: STYLE_STATUS_EMPTY };
          ws[`J${rowIdx}`] = { t: 's', v: 'Belum ada berkas scan di Drive', s: STYLE_ANOMALY };
          ws[`K${rowIdx}`] = { t: 's', v: '-', s: STYLE_UNCHECKED };
        }
      }
    }

    // Aktifkan AutoFilter pada tabel kecamatan (dari baris 6 sampai baris data TPS terakhir)
    ws['!autofilter'] = { ref: `A6:K${lastTpsRow}` };
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

  // Styling Header Sheet 9
  const headerColsInc = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
  headerColsInc.forEach((col) => {
    if (wsIncomplete[`${col}1`]) {
      wsIncomplete[`${col}1`].s = STYLE_HEADER_MAROON;
    }
  });

  // Styling Data Rows Sheet 9 & Buat Hyperlink Interaktif pada Kolom I
  for (let idx = 0; idx < incompleteList.length; idx++) {
    const rowNum = idx + 2;
    const tps = incompleteList[idx];

    if (wsIncomplete[`A${rowNum}`]) wsIncomplete[`A${rowNum}`].s = STYLE_NO_DESA;
    if (wsIncomplete[`B${rowNum}`]) wsIncomplete[`B${rowNum}`].s = STYLE_DESA_NAME;
    if (wsIncomplete[`C${rowNum}`]) wsIncomplete[`C${rowNum}`].s = STYLE_DESA_NAME;
    if (wsIncomplete[`D${rowNum}`]) wsIncomplete[`D${rowNum}`].s = STYLE_TPS_NUM;
    if (wsIncomplete[`E${rowNum}`]) wsIncomplete[`E${rowNum}`].s = STYLE_STATUS_PARTIAL;
    if (wsIncomplete[`F${rowNum}`]) wsIncomplete[`F${rowNum}`].s = STYLE_TPS_NUM;
    if (wsIncomplete[`G${rowNum}`]) {
      wsIncomplete[`G${rowNum}`].s = tps.hasAnomaly ? STYLE_ANOMALY : STYLE_NORMAL;
    }
    if (wsIncomplete[`H${rowNum}`]) {
      const isPending = tps.files.some((f) => f.overrideElection === 'SUDAH_DIBENARKAN');
      wsIncomplete[`H${rowNum}`].s = isPending
        ? STYLE_STATUS_PARTIAL
        : tps.hasAnomaly
        ? STYLE_STATUS_EMPTY
        : STYLE_NORMAL;
    }

    // Link Interaktif Google Drive
    if (tps.tpsFolderUrl) {
      wsIncomplete[`I${rowNum}`] = {
        t: 's',
        v: '🔗 Buka Drive TPS',
        f: `HYPERLINK("${tps.tpsFolderUrl}", "🔗 Buka Drive TPS")`,
        l: { Target: tps.tpsFolderUrl, Tooltip: `Buka Folder Drive ${tps.tpsFolderName}` },
        s: STYLE_DRIVE_LINK,
      };
    } else {
      if (wsIncomplete[`I${rowNum}`]) wsIncomplete[`I${rowNum}`].s = STYLE_UNCHECKED;
    }
  }

  // AutoFilter aktif pada Sheet 9
  wsIncomplete['!autofilter'] = { ref: `A1:I${incompleteList.length + 1}` };

  // Lebar Kolom Sheet 9
  wsIncomplete['!cols'] = [
    { wch: 6 },  // A: NO
    { wch: 20 }, // B: KECAMATAN
    { wch: 22 }, // C: DESA
    { wch: 12 }, // D: TPS
    { wch: 45 }, // E: BERKAS YANG BELUM ADA
    { wch: 22 }, // F: JUMLAH SUDAH ADA
    { wch: 45 }, // G: CATATAN ANOMALI
    { wch: 38 }, // H: STATUS KOREKSI
    { wch: 25 }, // I: LINK GOOGLE DRIVE
  ];

  XLSX.utils.book_append_sheet(wb, wsIncomplete, 'DAFTAR KEKURANGAN & ANOMALI');

  // Unduh Berkas Excel (.xlsx) dengan styling & hyperlink utuh
  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `REKAP_C_HASIL_KPU_SEKADAU_${today}.xlsx`);
}
