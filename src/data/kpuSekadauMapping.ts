// Mapping resmi kode wilayah KPU / Kemendagri untuk Kabupaten Sekadau (6109)
// Provinsi Kalimantan Barat (61)
// Digunakan untuk navigasi & URL shortcut hitung-suara pemilu2024.kpu.go.id

export interface KpuDesaMapping {
  code: string; // 10 digit (misal: 6109012001)
  name: string;
}

export interface KpuKecamatanMapping {
  code: string; // 6 digit (misal: 610901)
  name: string;
  desas: Record<string, string>; // namaDesa -> kodeDesa (10 digit)
}

export const KPU_SEKADAU_MAPPING: Record<string, KpuKecamatanMapping> = {
  'Sekadau Hilir': {
    code: '610901',
    name: 'Sekadau Hilir',
    desas: {
      'Sungai Ringin': '6109012001',
      'Mungguk': '6109012002',
      'Tanjung': '6109012003',
      'Merapi': '6109012004',
      'Seraras': '6109012005',
      'Semabi': '6109012006',
      'Seberang Kapuas': '6109012007',
      'Landau Kodah': '6109012008',
      'Timpuk': '6109012009',
      'Sungai Kunyit': '6109012010',
      'Peniti': '6109012011',
      'Gonis Tekam': '6109012012',
      'Tapang Semadak': '6109012013',
      'Engkersik': '6109012014',
      'Ensalang': '6109012015',
      'Bokak Sebumbun': '6109012016',
      'Selalong': '6109012017',
      'Sempulau Indah': '6109012018',
      'Tigur Jaya': '6109012019',
      'Beringkai Raya': '6109012020',
    },
  },
  'Sekadau Hulu': {
    code: '610902',
    name: 'Sekadau Hulu',
    desas: {
      'Rawak Hilir': '6109022001',
      'Rawak Hulu': '6109022002',
      'Nanga Menterap': '6109022003',
      'Boti': '6109022004',
      'Perongkan': '6109022005',
      'Tinting Boyok': '6109022006',
      'Sekonau': '6109022007',
      'Setawar': '6109022008',
      'Nanga Pemubuh': '6109022009',
      'Tapang Perodah': '6109022010',
      'Sungai Sambang': '6109022011',
      'Mondi': '6109022012',
      'Cupang Gading': '6109022013',
      'Nanga Biaban': '6109022014',
      'Sunsong': '6109022015',
    },
  },
  'Nanga Taman': {
    code: '610903',
    name: 'Nanga Taman',
    desas: {
      'Nanga Taman': '6109032001',
      'Rirang Jati': '6109032002',
      'Senangak': '6109032003',
      'Nanga Kiungkang': '6109032004',
      'Sungai Lawak': '6109032005',
      'Tapang Tingang': '6109032006',
      'Nanga Mongko': '6109032007',
      'Nanga Engkulun': '6109032008',
      'Nanga Koman': '6109032009',
      'Lubuk Tajau': '6109032010',
      'Pantok': '6109032011',
      'Meragun': '6109032012',
      'Nanga Mentukak': '6109032013',
      'Semerawai': '6109032014',
      'Engkulun Hulu': '6109032015',
    },
  },
  'Nanga Mahap': {
    code: '610904',
    name: 'Nanga Mahap',
    desas: {
      'Nanga Mahap': '6109042001',
      'Batu Pahat': '6109042002',
      'Lembah Beringin': '6109042003',
      'Teluk Kebau': '6109042004',
      'Landau Apin': '6109042005',
      'Tembaga': '6109042006',
      'Cenayan': '6109042007',
      'Landau Kumpai': '6109042008',
      'Nanga Suri': '6109042009',
      'Sebabas': '6109042010',
      'Karang Betung': '6109042011',
      'Tamang': '6109042012',
      'Tembesuk': '6109042013',
    },
  },
  'Belitang Hilir': {
    code: '610905',
    name: 'Belitang Hilir',
    desas: {
      'Sungai Ayak Satu': '6109052001',
      'Sungai Ayak Dua': '6109052002',
      'Entabuk': '6109052003',
      'Tapang Pulau': '6109052004',
      'Kumpang Bis': '6109052005',
      'Menawai Tekam': '6109052006',
      'Semadu': '6109052007',
      'Merbang': '6109052008',
      'Empajak': '6109052009',
      'Sepantak': '6109052010',
      'Melanjan Raya': '6109052011',
    },
  },
  'Belitang Hulu': {
    code: '610906',
    name: 'Belitang Hulu',
    desas: {
      'Sebetung': '6109062001',
      'Seburuk Satu': '6109062002',
      'Sungai Tapah': '6109062003',
      'Ijuk': '6109062004',
      'Mengaret': '6109062005',
      'Kumpang Ilong': '6109062006',
      'Sungai Antu Hulu': '6109062007',
      'Terduk Dampak': '6109062008',
      'Pakit Mulau': '6109062009',
      'Tabuk Hulu': '6109062010',
      'Batuk Mulau': '6109062011',
      'Balai Sepuak': '6109062012',
      'Bukit Rambat': '6109062013',
    },
  },
  'Belitang': {
    code: '610907',
    name: 'Belitang',
    desas: {
      'Nanga Ansar': '6109072001',
      'Padak': '6109072002',
      'Setuntung': '6109072003',
      'Belitang Satu': '6109072004',
      'Belitang Dua': '6109072005',
      'Menua Prama': '6109072006',
      'Maboh Permai': '6109072007',
    },
  },
};

/**
 * Helper untuk normalisasi string (case-insensitive & whitespace)
 */
function normalizeName(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Menghasilkan URL lengkap hitung-suara KPU hingga ke level TPS / Desa / Kecamatan
 * Format standar KPU:
 * https://pemilu2024.kpu.go.id/{slug}/hitung-suara/61/6109/{kodeKecamatan}/{kodeDesa}/{kodeTps}
 */
export function buildKpuHitungSuaraUrl(
  electionKey: string,
  kecamatan?: string,
  desa?: string,
  tpsNumber?: string | number
): string {
  const KPU_ELECTION_SLUGS: Record<string, string> = {
    PPWP: 'pilpres',
    DPR_RI: 'pilegdpr',
    DPD: 'pemilu_dpd',
    DPRD_PROV: 'pilegdprd_prov',
    DPRD_KAB: 'pilegdprd_kab',
  };
  const slug = KPU_ELECTION_SLUGS[electionKey] || 'pilpres';
  const baseUrl = `https://uji-pemilu2024.kpu.go.id/${slug}/hitung-suara/61/6109`;

  if (!kecamatan) {
    return `${baseUrl}/`;
  }

  // Cari kecamatan
  const kecNorm = normalizeName(kecamatan);
  const matchedKecEntry = Object.entries(KPU_SEKADAU_MAPPING).find(
    ([k]) => normalizeName(k) === kecNorm
  );

  if (!matchedKecEntry) {
    return `${baseUrl}/`;
  }

  const kecMapping = matchedKecEntry[1];
  const kecCode = kecMapping.code;

  if (!desa) {
    return `${baseUrl}/${kecCode}/`;
  }

  // Cari desa
  const desaNorm = normalizeName(desa);
  const matchedDesaEntry = Object.entries(kecMapping.desas).find(
    ([d]) => normalizeName(d) === desaNorm
  );

  if (!matchedDesaEntry) {
    return `${baseUrl}/${kecCode}/`;
  }

  const desaCode = matchedDesaEntry[1];

  if (!tpsNumber) {
    return `${baseUrl}/${kecCode}/${desaCode}/`;
  }

  // Format kode TPS di KPU adalah 10 digit desaCode + 3 digit nomor TPS (contoh: 6109012001001)
  const tpsStr = String(tpsNumber).replace(/[^0-9]/g, '');
  const tpsPadded = tpsStr.padStart(3, '0');
  const tpsFullCode = `${desaCode}${tpsPadded}`;

  return `${baseUrl}/${kecCode}/${desaCode}/${tpsFullCode}/`;
}
