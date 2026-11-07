import { RawTpsData } from '@/types';

export const MOCK_KECAMATAN_LIST = [
  'Belitang',
  'Belitang Hilir',
  'Belitang Hulu',
  'Nanga Mahap',
  'Nanga Taman',
  'Sekadau Hilir',
  'Sekadau Hulu',
];

export const MOCK_DESA_MAP: Record<string, string[]> = {
  'Belitang': [
    'Belitang Satu',
    'Belitang Dua',
    'Maboh Permai',
    'Menua Prama',
    'Nanga Ansar',
    'Padak',
    'Setuntung',
  ],
  'Belitang Hilir': [
    'Empajak',
    'Entabuk',
    'Kumpang Bis',
    'Menawai Tekam',
    'Merbang',
    'Semadu',
    'Sungai Ayak Dua',
    'Sungai Ayak Satu',
    'Tapang Pulau',
  ],
  'Belitang Hulu': [
    'Balai Sepuak',
    'Batuk Mulau',
    'Bukit Rambat',
    'Ijuk',
    'Kumpang Ilong',
    'Mengaret',
    'Pakit Mulau',
    'Sebetung',
    'Seburuk Satu',
    'Sungai Antu Hulu',
    'Sungai Tapah',
    'Tabuk Hulu',
    'Terduk Dampak',
  ],
  'Nanga Mahap': [
    'Batu Pahat',
    'Cenayan',
    'Karang Betung',
    'Landau Apin',
    'Landau Kumpai',
    'Lembah Beringin',
    'Nanga Mahap',
    'Nanga Suri',
    'Sebabas',
    'Tamang',
    'Teluk Kebau',
    'Tembaga',
    'Tembesuk',
  ],
  'Nanga Taman': [
    'Lubuk Tajau',
    'Meragun',
    'Nanga Engkulun',
    'Nanga Kiungkang',
    'Nanga Koman',
    'Nanga Mentukak',
    'Nanga Mongko',
    'Nanga Taman',
    'Pantok',
    'Rirang Jati',
    'Senangak',
    'Sungai Lawak',
    'Tapang Tingang',
  ],
  'Sekadau Hilir': [
    'Bokak Sebumbun',
    'Engkersik',
    'Ensalang',
    'Gonis Tekam',
    'Landau Kodah',
    'Merapi',
    'Mungguk',
    'Peniti',
    'Seberang Kapuas',
    'Selalong',
    'Semabi',
    'Seraras',
    'Sungai Kunyit',
    'Sungai Ringin',
    'Tanjung',
    'Tapang Semadak',
    'Timpuk',
  ],
  'Sekadau Hulu': [
    'Boti',
    'Cupang Gading',
    'Mondi',
    'Nanga Biaban',
    'Nanga Menterap',
    'Nanga Pemubuh',
    'Perongkan',
    'Rawak Hilir',
    'Rawak Hulu',
    'Sekonau',
    'Setawar',
    'Sungai Sambang',
    'Sunsong',
    'Tapang Perodah',
    'Tinting Boyok',
  ],
};

// Alokasi TPS per Desa resmi KPU Kabupaten Sekadau (Total: 698 TPS di 87 Desa)
export const OFFICIAL_DESA_TPS_COUNTS: Record<string, Record<string, number>> = {
  'Belitang': {
    'Belitang Satu': 7,
    'Belitang Dua': 6,
    'Maboh Permai': 6,
    'Menua Prama': 6,
    'Nanga Ansar': 6,
    'Padak': 6,
    'Setuntung': 6,
  },
  'Belitang Hilir': {
    'Sungai Ayak Satu': 10,
    'Sungai Ayak Dua': 10,
    'Empajak': 9,
    'Entabuk': 9,
    'Kumpang Bis': 9,
    'Menawai Tekam': 9,
    'Merbang': 9,
    'Semadu': 9,
    'Tapang Pulau': 9,
  },
  'Belitang Hulu': {
    'Balai Sepuak': 7,
    'Batuk Mulau': 7,
    'Bukit Rambat': 6,
    'Ijuk': 6,
    'Kumpang Ilong': 6,
    'Mengaret': 6,
    'Pakit Mulau': 6,
    'Sebetung': 6,
    'Seburuk Satu': 6,
    'Sungai Antu Hulu': 6,
    'Sungai Tapah': 6,
    'Tabuk Hulu': 6,
    'Terduk Dampak': 6,
  },
  'Nanga Mahap': {
    'Batu Pahat': 8,
    'Cenayan': 8,
    'Karang Betung': 8,
    'Landau Apin': 8,
    'Landau Kumpai': 8,
    'Lembah Beringin': 8,
    'Nanga Mahap': 7,
    'Nanga Suri': 7,
    'Sebabas': 7,
    'Tamang': 7,
    'Teluk Kebau': 7,
    'Tembaga': 7,
    'Tembesuk': 7,
  },
  'Nanga Taman': {
    'Lubuk Tajau': 7,
    'Meragun': 7,
    'Nanga Engkulun': 7,
    'Nanga Kiungkang': 7,
    'Nanga Koman': 7,
    'Nanga Mentukak': 7,
    'Nanga Mongko': 7,
    'Nanga Taman': 7,
    'Pantok': 7,
    'Rirang Jati': 7,
    'Senangak': 7,
    'Sungai Lawak': 7,
    'Tapang Tingang': 7,
  },
  'Sekadau Hilir': {
    'Mungguk': 26,
    'Sungai Ringin': 22,
    'Tanjung': 15,
    'Seberang Kapuas': 12,
    'Bokak Sebumbun': 12,
    'Engkersik': 11,
    'Gonis Tekam': 11,
    'Tapang Semadak': 11,
    'Seraras': 11,
    'Landau Kodah': 10,
    'Peniti': 10,
    'Selalong': 10,
    'Semabi': 10,
    'Timpuk': 9,
    'Merapi': 9,
    'Ensalang': 8,
    'Sungai Kunyit': 7,
  },
  'Sekadau Hulu': {
    'Rawak Hilir': 7,
    'Rawak Hulu': 7,
    'Boti': 7,
    'Cupang Gading': 7,
    'Mondi': 7,
    'Nanga Biaban': 7,
    'Nanga Menterap': 7,
    'Nanga Pemubuh': 7,
    'Perongkan': 7,
    'Sekonau': 7,
    'Setawar': 6,
    'Sungai Sambang': 6,
    'Sunsong': 6,
    'Tapang Perodah': 6,
    'Tinting Boyok': 6,
  },
};

/**
 * Generator data simulasi realistis untuk 7 Kecamatan & 87 Desa KPU Sekadau (Tepat 698 TPS)
 */
export function generateMockSekadauData(): RawTpsData[] {
  const data: RawTpsData[] = [];

  Object.entries(MOCK_DESA_MAP).forEach(([kecamatan, desaList]) => {
    desaList.forEach((desa) => {
      // Ambil alokasi TPS spesifik untuk desa ini
      const tpsCount = OFFICIAL_DESA_TPS_COUNTS[kecamatan]?.[desa] || 5;

      for (let t = 1; t <= tpsCount; t++) {
        const tpsFolderName = `TPS ${t}`;
        const tpsFolderId = `folder_${kecamatan}_${desa}_tps${t}`.replace(/\s+/g, '_').toLowerCase();
        const tpsFolderUrl = '';

        // Pola kelengkapan bervariasi agar mencerminkan kondisi lapangan riil
        const seed = (kecamatan.length * 7 + desa.length * 3 + t * 5) % 10;
        const files: RawTpsData['files'] = [];

        const fileTemplates = [
          { key: 'PPWP', name: `${desa} TPS ${t} Presiden.pdf` },
          { key: 'DPR_RI', name: `${desa} TPS ${t} DPR RI.pdf` },
          { key: 'DPD', name: `${desa} TPS ${t} DPD RI.pdf` },
          { key: 'DPRD_PROV', name: `${desa} TPS ${t} DPRD Prov.pdf` },
          { key: 'DPRD_KAB', name: `${desa} TPS ${t} DPRD Kabko.pdf` },
        ];

        if (seed >= 4) {
          // Kasus 1: TPS Lengkap 5/5 (60% kemungkinan)
          fileTemplates.forEach((tpl, fIdx) => {
            files.push({
              id: `${tpsFolderId}_f${fIdx + 1}`,
              name: tpl.name,
              url: '',
              size: 2450000 + fIdx * 150000,
              updatedAt: '2024-02-18T10:30:00Z',
            });
          });
        } else if (seed === 3) {
          // Kasus 2: Kurang 1 file (DPRD Kab belum di-scan)
          fileTemplates.slice(0, 4).forEach((tpl, fIdx) => {
            files.push({
              id: `${tpsFolderId}_f${fIdx + 1}`,
              name: tpl.name,
              url: '',
              size: 2300000 + fIdx * 120000,
              updatedAt: '2024-02-18T11:15:00Z',
            });
          });
        } else if (seed === 2) {
          // Kasus 3: Kurang 2 file (Hanya ada PPWP, DPR RI, DPD)
          fileTemplates.slice(0, 3).forEach((tpl, fIdx) => {
            files.push({
              id: `${tpsFolderId}_f${fIdx + 1}`,
              name: tpl.name,
              url: '',
              size: 2100000 + fIdx * 100000,
              updatedAt: '2024-02-19T08:45:00Z',
            });
          });
        } else if (seed === 1) {
          // Kasus 4: Ada anomali (Misal: salah nomor TPS, berkas ganda, typo)
          files.push({
            id: `${tpsFolderId}_f1`,
            name: `${desa} TPS ${t} Presiden.pdf`,
            url: '',
          });
          files.push({
            id: `${tpsFolderId}_f2`,
            name: `${desa} TPS ${t} DPR RI.pdf`,
            url: '',
          });
          // Duplikat DPR RI dengan nama sedikit beda
          files.push({
            id: `${tpsFolderId}_f2_dup`,
            name: `${desa} TPS ${t} DPR-RI Scan Ulang.pdf`,
            url: '',
          });
          // Salah nomor TPS di dalam file DPD
          files.push({
            id: `${tpsFolderId}_f3_wrong`,
            name: `${desa} TPS ${t + 1} DPD RI.pdf`,
            url: '',
          });
          // Ambigu DPRD
          files.push({
            id: `${tpsFolderId}_f4_ambigu`,
            name: `${desa} TPS ${t} C Hasil DPRD.pdf`,
            url: '',
          });
        } else {
          // Kasus 5: Masih Kosong (0 File) - Folder sudah dibuat tapi belum ada scan diunggah
          // files tetap kosong
        }

        data.push({
          kecamatan,
          desa,
          tpsFolderName,
          tpsFolderId,
          tpsFolderUrl,
          files,
        });
      }
    });
  });

  return data;
}
