import { RawTpsData } from '@/types';

export interface GasKecamatanItem {
  id: string;
  name: string;
}

export interface GasScanResponse {
  status: 'success' | 'error';
  kecamatan?: string;
  data?: RawTpsData[];
  message?: string;
}

export interface GasListKecResponse {
  status: 'success' | 'error';
  data?: GasKecamatanItem[];
  message?: string;
}

/**
 * Service koneksi ke Google Apps Script Web App (STRICT READ-ONLY)
 */
export async function fetchKecamatanList(
  webAppUrl: string,
  rootFolderId: string
): Promise<GasKecamatanItem[]> {
  const url = new URL(webAppUrl);
  url.searchParams.set('action', 'listKecamatan');
  url.searchParams.set('folderId', rootFolderId);

  const res = await fetch(url.toString(), {
    method: 'GET',
    redirect: 'follow',
  });

  if (!res.ok) {
    throw new Error(`Koneksi HTTP gagal: Status ${res.status}`);
  }

  const json: GasListKecResponse = await res.json();
  if (json.status !== 'success' || !json.data) {
    throw new Error(json.message || 'Gagal mengambil daftar folder kecamatan');
  }

  return json.data;
}

/**
 * Memindai 1 Folder Kecamatan (Desa -> TPS -> Berkas) secara Read-Only
 */
export async function scanKecamatanFolder(
  webAppUrl: string,
  kecFolderId: string
): Promise<RawTpsData[]> {
  const url = new URL(webAppUrl);
  url.searchParams.set('action', 'scanKecamatan');
  url.searchParams.set('folderId', kecFolderId);

  const res = await fetch(url.toString(), {
    method: 'GET',
    redirect: 'follow',
  });

  if (!res.ok) {
    throw new Error(`Koneksi HTTP gagal: Status ${res.status}`);
  }

  const json: GasScanResponse = await res.json();
  if (json.status !== 'success' || !json.data) {
    throw new Error(json.message || 'Gagal memindai folder kecamatan');
  }

  return json.data;
}

