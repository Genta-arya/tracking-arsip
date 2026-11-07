// Data Koordinat Geografis Wilayah Kabupaten Sekadau, Kalimantan Barat
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
  lat: 0.035,
  lng: 110.95,
};

export const SEKADAU_DEFAULT_ZOOM = 9.5;

export const SEKADAU_COORDINATES: Record<string, KecamatanCoordinate> = {
  'Sekadau Hilir': {
    name: 'Sekadau Hilir',
    lat: 0.0345,
    lng: 110.9512,
    zoom: 12,
    desas: {
      'Mungguk': { lat: 0.036, lng: 110.952 },
      'Sungai Ringin': { lat: 0.031, lng: 110.948 },
      'Tanjung': { lat: 0.04, lng: 110.945 },
      'Seberang Kapuas': { lat: 0.048, lng: 110.956 },
      'Peniti': { lat: 0.021, lng: 110.932 },
      'Semabi': { lat: 0.065, lng: 110.985 },
      'Landau Kodah': { lat: 0.015, lng: 110.91 },
      'Bokak Sebumbun': { lat: 0.052, lng: 110.92 },
      'Seraras': { lat: 0.075, lng: 110.965 },
      'Sungai Kunyit': { lat: 0.012, lng: 110.97 },
      'Selalong': { lat: 0.028, lng: 110.99 },
      'Sempulau Indah': { lat: 0.045, lng: 110.975 },
      'Merapi': { lat: -0.015, lng: 110.925 },
      'Ensalang': { lat: 0.055, lng: 111.01 },
      'Engkersik': { lat: 0.068, lng: 111.035 },
      'Gonis Tekam': { lat: -0.005, lng: 110.89 },
      'Beringkai Raya': { lat: -0.022, lng: 110.875 },
      'Tapang Semadak': { lat: -0.035, lng: 110.855 },
    },
  },
  'Sekadau Hulu': {
    name: 'Sekadau Hulu',
    lat: -0.098,
    lng: 110.985,
    zoom: 12,
    desas: {
      'Rawak Hilir': { lat: -0.095, lng: 110.982 },
      'Rawak Hulu': { lat: -0.102, lng: 110.988 },
      'Nanga Biaban': { lat: -0.125, lng: 110.96 },
      'Nanga Menterap': { lat: -0.082, lng: 111.015 },
      'Cupang Gading': { lat: -0.115, lng: 111.02 },
      'Boti': { lat: -0.075, lng: 110.955 },
      'Mondi': { lat: -0.138, lng: 110.978 },
      'Nanga Pemubuh': { lat: -0.145, lng: 111.01 },
      'Perongkan': { lat: -0.062, lng: 110.97 },
      'Sekonau': { lat: -0.108, lng: 110.94 },
      'Setawar': { lat: -0.155, lng: 110.945 },
      'Sungai Samban': { lat: -0.13, lng: 111.045 },
      'Sunsong': { lat: -0.165, lng: 110.995 },
      'Tinting Boyok': { lat: -0.085, lng: 110.935 },
    },
  },
  'Nanga Taman': {
    name: 'Nanga Taman',
    lat: -0.305,
    lng: 110.965,
    zoom: 12,
    desas: {
      'Nanga Taman': { lat: -0.302, lng: 110.962 },
      'Meragun': { lat: -0.345, lng: 110.92 },
      'Nanga Koman': { lat: -0.278, lng: 110.975 },
      'Nanga Mentukak': { lat: -0.315, lng: 110.99 },
      'Nanga Mongko': { lat: -0.265, lng: 110.95 },
      'Pantok': { lat: -0.332, lng: 110.97 },
      'Rirang Jati': { lat: -0.289, lng: 111.005 },
      'Senangak': { lat: -0.355, lng: 110.985 },
      'Tapang Tingang': { lat: -0.32, lng: 110.94 },
    },
  },
  'Nanga Mahap': {
    name: 'Nanga Mahap',
    lat: -0.515,
    lng: 110.82,
    zoom: 12,
    desas: {
      'Nanga Mahap': { lat: -0.512, lng: 110.818 },
      'Lembah Beringin': { lat: -0.535, lng: 110.835 },
      'Karang Betung': { lat: -0.495, lng: 110.795 },
      'Batu Pahat': { lat: -0.48, lng: 110.83 },
      'Cenayan': { lat: -0.525, lng: 110.785 },
      'Landau Apin': { lat: -0.548, lng: 110.805 },
      'Landau Kumpai': { lat: -0.465, lng: 110.85 },
      'Nanga Suri': { lat: -0.56, lng: 110.84 },
      'Sebabas': { lat: -0.505, lng: 110.855 },
      'Tamang': { lat: -0.475, lng: 110.78 },
      'Teluk Kebau': { lat: -0.53, lng: 110.865 },
      'Tembaga': { lat: -0.575, lng: 110.81 },
      'Tembesuk': { lat: -0.455, lng: 110.815 },
    },
  },
  'Belitang': {
    name: 'Belitang',
    lat: 0.18,
    lng: 111.12,
    zoom: 12,
    desas: {
      'Belitang Satu': { lat: 0.178, lng: 111.118 },
      'Belitang Dua': { lat: 0.184, lng: 111.125 },
      'Maboh Permai': { lat: 0.165, lng: 111.14 },
      'Menua Pela': { lat: 0.195, lng: 111.105 },
      'Nanga Ansar': { lat: 0.21, lng: 111.135 },
      'Padak': { lat: 0.155, lng: 111.095 },
      'Setuntung': { lat: 0.172, lng: 111.16 },
    },
  },
  'Belitang Hilir': {
    name: 'Belitang Hilir',
    lat: 0.105,
    lng: 111.25,
    zoom: 12,
    desas: {
      'Sungai Ayak Satu': { lat: 0.102, lng: 111.248 },
      'Sungai Ayak Dua': { lat: 0.108, lng: 111.254 },
      'Entabuk': { lat: 0.085, lng: 111.22 },
      'Kumpang Bis': { lat: 0.125, lng: 111.275 },
      'Menunggal': { lat: 0.092, lng: 111.285 },
      'Merbang': { lat: 0.138, lng: 111.24 },
      'Semadu': { lat: 0.075, lng: 111.265 },
      'Sepadu': { lat: 0.118, lng: 111.215 },
      'Tapang Pulau': { lat: 0.065, lng: 111.24 },
    },
  },
  'Belitang Hulu': {
    name: 'Belitang Hulu',
    lat: 0.35,
    lng: 111.28,
    zoom: 12,
    desas: {
      'Balai Sepuak': { lat: 0.348, lng: 111.278 },
      'Batuk Mulau': { lat: 0.365, lng: 111.26 },
      'Kerapa Sepana': { lat: 0.33, lng: 111.295 },
      'Mengkadau Permai': { lat: 0.375, lng: 111.31 },
      'Pakit Mulau': { lat: 0.358, lng: 111.24 },
      'Sebetung': { lat: 0.32, lng: 111.265 },
      'Sekar Putih': { lat: 0.385, lng: 111.285 },
      'Sungai Antu Hulu': { lat: 0.31, lng: 111.315 },
      'Sungai Tamara': { lat: 0.395, lng: 111.255 },
      'Tabuk Hulu': { lat: 0.338, lng: 111.33 },
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

