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
    'Menua Pela',
    'Nanga Ansar',
    'Padak',
    'Setuntung',
  ],
  'Belitang Hilir': [
    'Entabuk',
    'Kumpang Bis',
    'Menunggal',
    'Merbang',
    'Semadu',
    'Sepadu',
    'Sungai Ayak Satu',
    'Sungai Ayak Dua',
    'Tapang Pulau',
  ],
  'Belitang Hulu': [
    'Balai Sepuak',
    'Batuk Mulau',
    'Kerapa Sepana',
    'Mengkadau Permai',
    'Pakit Mulau',
    'Sebetung',
    'Sekar Putih',
    'Sungai Antu Hulu',
    'Sungai Tamara',
    'Tabuk Hulu',
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
    'Meragun',
    'Nanga Koman',
    'Nanga Mentukak',
    'Nanga Mongko',
    'Nanga Taman',
    'Pantok',
    'Rirang Jati',
    'Senangak',
    'Tapang Tingang',
  ],
  'Sekadau Hilir': [
    'Beringkai Raya',
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
    'Sempulau Indah',
    'Seraras',
    'Sungai Kunyit',
    'Sungai Ringin',
    'Tanjung',
    'Tapang Semadak',
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
    'Sungai Samban',
    'Sunsong',
    'Tinting Boyok',
  ],
};

/**
 * Generator data simulasi realistis untuk 7 Kecamatan KPU Sekadau
 */
export function generateMockSekadauData(): RawTpsData[] {
  const data: RawTpsData[] = [];

  Object.entries(MOCK_DESA_MAP).forEach(([kecamatan, desaList]) => {
    desaList.forEach((desa) => {
      // Setiap desa memiliki antara 2 s/d 6 TPS
      const tpsCount = desa === 'Mungguk' || desa === 'Sungai Ringin' ? 7 : (desa.length % 3) + 3;

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

