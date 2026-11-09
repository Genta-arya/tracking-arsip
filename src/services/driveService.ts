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

export interface GasQuickScanItem {
  file: {
    id: string;
    name: string;
    url: string;
    createdAt?: string;
    updatedAt?: string;
    size?: number;
    uploader?: string;
  };
  tpsFolderName: string;
  tpsFolderId: string;
  desa: string;
  kecamatan: string;
}

export interface GasQuickScanResponse {
  status: 'success' | 'error';
  count?: number;
  data?: GasQuickScanItem[];
  message?: string;
}

/**
 * Smart Quick-Scan: Memindai berkas yang baru dimodifikasi/diunggah dalam kurun waktu tertentu (menit)
 */
export async function quickScanRecentFiles(
  webAppUrl: string,
  rootFolderId: string,
  sinceMinutes: number = 20
): Promise<GasQuickScanItem[] | null> {
  try {
    const url = new URL(webAppUrl);
    url.searchParams.set('action', 'quickScan');
    url.searchParams.set('folderId', rootFolderId);
    url.searchParams.set('minutes', sinceMinutes.toString());

    const res = await fetch(url.toString(), {
      method: 'GET',
      redirect: 'follow',
    });

    if (!res.ok) return null;
    const json: GasQuickScanResponse = await res.json();
    if (json.status === 'success' && Array.isArray(json.data)) {
      return json.data;
    }
    return null;
  } catch {
    return null;
  }
}


