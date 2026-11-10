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
  examinedFiles: number;
  failures: string[];
}

/** Penelusuran terpisah dari scan TPS; hasil tidak masuk scanned_data. */
export async function scanMisplacedFiles(
  webAppUrl: string,
  rootFolderId: string,
  signal: AbortSignal,
  onProgress: (progress: MisplacedScanProgress) => void,
): Promise<MisplacedScanProgress> {
  const found = new Map<string, MisplacedFile>();
  const folders = new Set<string>();
  const failures: string[] = [];
  const seenCursors = new Set<string>();
  let examinedFiles = 0;
  let cursor = '';
  const snapshot = () => ({ files: [...found.values()], scannedFolders: folders.size, examinedFiles, failures: [...failures] });
  try {
    do {
      signal.throwIfAborted();
      const url = new URL(webAppUrl);
      Object.entries({ action: 'scanMisplacedPdf', folderId: rootFolderId, rootFolderId, cursor })
        .forEach(([key, value]) => url.searchParams.set(key, value));
      const response = await fetch(url, { signal, redirect: 'follow' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const page = await response.json();
      if (page?.status !== 'success' || page.mode !== 'pdf-batch-v1') {
        throw new Error(`${page?.message || 'Respons tidak sesuai'}. Perbarui GAS untuk action scanMisplacedPdf dan deploy versi baru.`);
      }
      if (!Array.isArray(page.data) || !Array.isArray(page.failures) || !Array.isArray(page.checkedFolderIds) ||
        !Number.isInteger(page.examinedFiles) || page.examinedFiles < 0 || typeof page.nextCursor !== 'string' ||
        page.failures.some((value: unknown) => typeof value !== 'string') ||
        page.checkedFolderIds.some((value: unknown) => typeof value !== 'string') ||
        page.data.some((item: MisplacedFile) => !item || !['id', 'name', 'url', 'folderId', 'folderUrl', 'path', 'reason']
          .every(key => typeof (item as unknown as Record<string, unknown>)[key] === 'string'))) {
        throw new Error('Respons pemindaian PDF tidak valid; hasil belum lengkap.');
      }
      signal.throwIfAborted();
      page.data.forEach((file: MisplacedFile) => found.set(`${file.id}:${file.folderId}`, file));
      page.checkedFolderIds.forEach((id: string) => folders.add(id));
      examinedFiles += page.examinedFiles;
      failures.push(...page.failures);
      cursor = page.nextCursor;
      if (cursor && seenCursors.has(cursor)) throw new Error('Token lanjutan berulang');
      seenCursors.add(cursor);
      onProgress(snapshot());
    } while (cursor);
  } catch (error) {
    if (signal.aborted) throw error;
    failures.push(error instanceof Error ? error.message : String(error));
    onProgress(snapshot());
  }
  return snapshot();
}
