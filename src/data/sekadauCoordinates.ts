// Data Koordinat Geografis Wilayah Kabupaten Sekadau, Kalimantan Barat
// Hasil Geocoding & Validasi Otentik OpenStreetMap (OSM) & BPS / Kemendagri
// Digunakan untuk peta interaktif React Leaflet monitoring berkas scan C-Hasil

export interface LocationCoordinate {
  lat: number;
  lng: number;
}

export interface DesaCoordinate extends LocationCoordinate {
  name: string;
  kecamatan: string;
}

export interface KecamatanCoordinate extends LocationCoordinate {
  name: string;
  zoom: number;
  desas: Record<string, LocationCoordinate>;
}

export const SEKADAU_CENTER: LocationCoordinate = {
  lat: 0.05,
  lng: 110.98,
};

export const SEKADAU_DEFAULT_ZOOM = 9.5;

export const SEKADAU_COORDINATES: Record<string, KecamatanCoordinate> = {
  'Sekadau Hilir': {
    name: 'Sekadau Hilir',
    lat: 0.05199,
    lng: 110.8982,
    zoom: 12,
    desas: {
      'Bokak Sebumbun': { lat: -0.0061263, lng: 110.9545864 },
      'Engkersik': { lat: -0.0758593, lng: 111.0737065 },
      'Ensalang': { lat: -0.0202131, lng: 110.8101976 },
      'Gonis Tekam': { lat: -0.0001067, lng: 111.0122476 },
      'Landau Kodah': { lat: 0.1197093, lng: 110.9208238 },
      'Merapi': { lat: 0.0333063, lng: 110.9892435 },
      'Mungguk': { lat: 0.0068665, lng: 110.9100294 },
      'Peniti': { lat: -0.004201, lng: 110.7909539 },
      'Seberang Kapuas': { lat: 0.0321783, lng: 110.8910498 },
      'Selalong': { lat: -0.031178, lng: 110.872575 },
      'Semabi': { lat: 0.100349, lng: 110.8759446 },
      'Seraras': { lat: 0.0558563, lng: 111.0195056 },
      'Sungai Kunyit': { lat: 0.0449221, lng: 110.763145 },
      'Sungai Ringin': { lat: 0.0176349, lng: 110.8821031 },
      'Tanjung': { lat: 0.0242595, lng: 110.8949883 },
      'Tapang Semadak': { lat: -0.0024701, lng: 111.1008413 },
      'Timpuk': { lat: 0.1476425, lng: 110.9390352 },
    },
  },
  'Sekadau Hulu': {
    name: 'Sekadau Hulu',
    lat: -0.1818,
    lng: 110.9306,
    zoom: 12,
    desas: {
      'Boti': { lat: -0.1305051, lng: 110.9496151 },
      'Cupang Gading': { lat: -0.2245954, lng: 110.9219382 },
      'Mondi': { lat: -0.1876192, lng: 110.9437561 },
      'Nanga Biaban': { lat: -0.2645634, lng: 110.9536031 },
      'Nanga Menterap': { lat: -0.0508412, lng: 110.9311182 },
      'Nanga Pemubuh': { lat: -0.1065761, lng: 111.0580268 },
      'Perongkan': { lat: -0.0887706, lng: 110.899752 },
      'Rawak Hilir': { lat: -0.1301941, lng: 110.8789102 },
      'Rawak Hulu': { lat: -0.1349962, lng: 110.8748655 },
      'Sekonau': { lat: -0.1776815, lng: 110.820649 },
      'Setawar': { lat: -0.1076462, lng: 111.0093289 },
      'Sungai Sambang': { lat: -0.1586714, lng: 110.9538002 },
      'Sunsong': { lat: -0.3231079, lng: 111.0224247 },
      'Tapang Perodah': { lat: -0.1590851, lng: 111.0338146 },
      'Tinting Boyok': { lat: -0.0801729, lng: 110.7875529 },
    },
  },
  'Nanga Taman': {
    name: 'Nanga Taman',
    lat: -0.3255,
    lng: 110.7739,
    zoom: 12,
    desas: {
      'Lubuk Tajau': { lat: -0.3417309, lng: 110.8307542 },
      'Meragun': { lat: -0.2847165, lng: 110.882859 },
      'Nanga Engkulun': { lat: -0.3794433, lng: 110.6974507 },
      'Nanga Kiungkang': { lat: -0.2059278, lng: 110.7992236 },
      'Nanga Koman': { lat: -0.3337892, lng: 110.7500129 },
      'Nanga Mentukak': { lat: -0.2688161, lng: 110.8160206 },
      'Nanga Mongko': { lat: -0.3042851, lng: 110.7461952 },
      'Nanga Taman': { lat: -0.3540511, lng: 110.8301338 },
      'Pantok': { lat: -0.3682, lng: 110.8451 },
      'Rirang Jati': { lat: -0.2233579, lng: 110.8325415 },
      'Senangak': { lat: -0.2733274, lng: 110.7737725 },
      'Sungai Lawak': { lat: -0.2345814, lng: 110.7582977 },
      'Tapang Tingang': { lat: -0.1867823, lng: 110.7120917 },
    },
  },
  'Nanga Mahap': {
    name: 'Nanga Mahap',
    lat: -0.5236,
    lng: 110.7918,
    zoom: 12,
    desas: {
      'Batu Pahat': { lat: -0.4390308, lng: 110.755239 },
      'Cenayan': { lat: -0.3857225, lng: 110.6381742 },
      'Karang Betung': { lat: -0.5740972, lng: 110.8709025 },
      'Landau Apin': { lat: -0.4990844, lng: 110.7035098 },
      'Landau Kumpai': { lat: -0.3822155, lng: 110.7435972 },
      'Lembah Beringin': { lat: -0.4802746, lng: 110.7595325 },
      'Nanga Mahap': { lat: -0.512, lng: 110.818 },
      'Nanga Suri': { lat: -0.558, lng: 110.842 },
      'Sebabas': { lat: -0.4482014, lng: 110.7871589 },
      'Tamang': { lat: -0.4126474, lng: 110.6816088 },
      'Teluk Kebau': { lat: -0.5047352, lng: 110.7367204 },
      'Tembaga': { lat: -0.5015088, lng: 110.6786807 },
      'Tembesuk': { lat: -0.4838543, lng: 110.794448 },
    },
  },
  'Belitang Hilir': {
    name: 'Belitang Hilir',
    lat: 0.2259,
    lng: 111.0439,
    zoom: 12,
    desas: {
      'Empajak': { lat: 0.1951355, lng: 111.0619319 },
      'Entabuk': { lat: 0.0797796, lng: 111.1977124 },
      'Kumpang Bis': { lat: 0.2822087, lng: 111.0946538 },
      'Menawai Tekam': { lat: 0.2597641, lng: 110.9848054 },
      'Merbang': { lat: 0.2133333, lng: 110.9814534 },
      'Semadu': { lat: 0.358954, lng: 111.0073725 },
      'Sungai Ayak Dua': { lat: 0.1153421, lng: 111.075322 },
      'Sungai Ayak Satu': { lat: 0.1285, lng: 111.082 },
      'Tapang Pulau': { lat: 0.1948043, lng: 111.1088646 },
    },
  },
  'Belitang Hulu': {
    name: 'Belitang Hulu',
    lat: 0.537,
    lng: 111.1361,
    zoom: 12,
    desas: {
      'Balai Sepuak': { lat: 0.4413625, lng: 111.2074577 },
      'Batuk Mulau': { lat: 0.497941, lng: 111.1415514 },
      'Bukit Rambat': { lat: 0.581136, lng: 111.2163858 },
      'Ijuk': { lat: 0.4093016, lng: 111.1791623 },
      'Kumpang Ilong': { lat: 0.3541737, lng: 111.186176 },
      'Mengaret': { lat: 0.5747334, lng: 111.2668738 },
      'Pakit Mulau': { lat: 0.5455463, lng: 111.1537987 },
      'Sebetung': { lat: 0.5908321, lng: 111.0973679 },
      'Seburuk Satu': { lat: 0.5638484, lng: 111.0164091 },
      'Sungai Antu Hulu': { lat: 0.6496388, lng: 111.1455722 },
      'Sungai Tapah': { lat: 0.4554173, lng: 111.0647507 },
      'Tabuk Hulu': { lat: 0.5024484, lng: 111.2363389 },
      'Terduk Dampak': { lat: 0.6016288, lng: 111.1653068 },
    },
  },
  'Belitang': {
    name: 'Belitang',
    lat: 0.225,
    lng: 111.1927,
    zoom: 12,
    desas: {
      'Belitang Satu': { lat: 0.1314413, lng: 111.2507928 },
      'Belitang Dua': { lat: 0.152, lng: 111.242 },
      'Maboh Permai': { lat: 0.1798614, lng: 111.182343 },
      'Menua Prama': { lat: 0.2891302, lng: 111.1743986 },
      'Nanga Ansar': { lat: 0.2765942, lng: 111.1936118 },
      'Padak': { lat: 0.2528489, lng: 111.1838187 },
      'Setuntung': { lat: 0.2287788, lng: 111.2098636 },
    },
  },
};

/**
 * Helper untuk mencari koordinat desa, dengan fallback jika nama berbeda sedikit (case insensitive / trimming)
 */
export function getDesaCoordinate(kecamatan: string, desa: string): LocationCoordinate | null {
  const kecEntry = Object.entries(SEKADAU_COORDINATES).find(
    ([k]) => k.toLowerCase() === kecamatan.trim().toLowerCase()
  );
  if (!kecEntry) return null;

  const desas = kecEntry[1].desas;
  const desaEntry = Object.entries(desas).find(
    ([d]) => d.toLowerCase() === desa.trim().toLowerCase()
  );

  if (desaEntry) {
    return desaEntry[1];
  }

  // Jika nama desa belum spesifik, kembalikan koordinat kecamatan dengan sedikit jitter agar tidak tumpang tindih
  const seed = (desa.charCodeAt(0) || 1) + (desa.charCodeAt(desa.length - 1) || 1);
  const jitterLat = ((seed % 10) - 5) * 0.005;
  const jitterLng = (((seed * 3) % 10) - 5) * 0.005;

  return {
    lat: kecEntry[1].lat + jitterLat,
    lng: kecEntry[1].lng + jitterLng,
  };
}

/**
 * Helper untuk mencari koordinat kecamatan
 */
export function getKecamatanCoordinate(kecamatan: string): KecamatanCoordinate | null {
  const kecEntry = Object.entries(SEKADAU_COORDINATES).find(
    ([k]) => k.toLowerCase() === kecamatan.trim().toLowerCase()
  );
  return kecEntry ? kecEntry[1] : null;
}
