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



export interface MisplacedFile {
  id: string;
  name: string;
  url: string;
  folderId: string;
  folderUrl: string;
  path: string;
  reason: string;
}

export interface MisplacedScanProgress {
  files: MisplacedFile[];
  scannedFolders: number;
  failures: string[];
}

/** Penelusuran terpisah dari scan TPS; hasil tidak masuk scanned_data. */
export async function scanMisplacedFiles(
  webAppUrl: string,
  rootFolderId: string,
  signal: AbortSignal,
  onProgress: (progress: MisplacedScanProgress) => void,
): Promise<MisplacedScanProgress> {
  const queue = [{ id: rootFolderId, name: 'Root arsip' }];
  const seenFolders = new Set([rootFolderId]);
  const found = new Map<string, MisplacedFile>();
  const failures: string[] = [];
  let scannedFolders = 0;
  const snapshot = () => ({ files: [...found.values()], scannedFolders, failures: [...failures] });
  for (let index = 0; index < queue.length; index++) {
    const folder = queue[index];
    let fileToken = '';
    let folderToken = '';
    let filesDone = false;
    let foldersDone = false;
    const seenPages = new Set<string>();
    try {
      do {
        signal.throwIfAborted();
        const url = new URL(webAppUrl);
        const params = { action: 'scanMisplaced', rootFolderId, folderId: folder.id,
          fileToken, folderToken, filesDone: String(filesDone), foldersDone: String(foldersDone) };
        Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
        const response = await fetch(url, { signal, redirect: 'follow' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const page = await response.json();
        if (page.status !== 'success') throw new Error(page.message || 'Perbarui deployment Apps Script (action scanMisplaced).');
        if (!Array.isArray(page.data) || !Array.isArray(page.children) ||
          typeof page.filesDone !== 'boolean' || typeof page.foldersDone !== 'boolean' ||
          page.data.some((item: MisplacedFile) => !item || !['id', 'name', 'url', 'folderId', 'folderUrl', 'path', 'reason'].every(key => typeof (item as unknown as Record<string, unknown>)[key] === 'string')) ||
          page.children.some((item: GasKecamatanItem) => !item || typeof item.id !== 'string' || typeof item.name !== 'string')) {
          throw new Error('Respons tidak sesuai. Perbarui deployment Apps Script untuk scanMisplaced.');
        }
        signal.throwIfAborted();
        page.data.forEach((item: MisplacedFile) => found.set(`${item.id}:${item.folderId}`, item));
        page.children.forEach((child: GasKecamatanItem) => {
          if (!seenFolders.has(child.id)) { seenFolders.add(child.id); queue.push(child); }
        });
        filesDone = page.filesDone;
        foldersDone = page.foldersDone;
        fileToken = page.fileToken || '';
        folderToken = page.folderToken || '';
        if ((!filesDone && !fileToken) || (!foldersDone && !folderToken)) throw new Error('Token lanjutan tidak tersedia');
        const key = JSON.stringify([filesDone, foldersDone, fileToken, folderToken]);
        if ((!filesDone || !foldersDone) && seenPages.has(key)) throw new Error('Token lanjutan berulang');
        seenPages.add(key);
        onProgress(snapshot());
      } while (!filesDone || !foldersDone);
      scannedFolders++;
    } catch (error) {
      if (signal.aborted) throw error;
      failures.push(`${folder.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
    onProgress(snapshot());
  }
  return snapshot();
}
