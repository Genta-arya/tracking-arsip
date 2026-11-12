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
  rootFolderId: string,
  guard?: () => Promise<void>
): Promise<GasKecamatanItem[]> {
  const url = new URL(webAppUrl);
  url.searchParams.set('action', 'listKecamatan');
  url.searchParams.set('folderId', rootFolderId);

  await guard?.();
  const res = await fetch(url.toString(), {
    method: 'GET',
    redirect: 'follow',
  });

  if (!res.ok) {
    throw new Error(`Koneksi HTTP gagal: Status ${res.status}`);
  }

  const json: GasListKecResponse = await res.json();
  await guard?.();
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
  kecFolderId: string,
  onProgress?: (percent: number, desaName?: string) => void,
  guard?: () => Promise<void>,
): Promise<RawTpsData[]> {
  const request = async (action: string, desaId?: string) => {
    const url = new URL(webAppUrl);
    url.searchParams.set('action', action);
    url.searchParams.set('folderId', kecFolderId);
    if (desaId) url.searchParams.set('desaId', desaId);
    await guard?.();
    const res = await fetch(url.toString(), { method: 'GET', redirect: 'follow' });
    if (!res.ok) throw new Error(`Koneksi HTTP gagal: Status ${res.status}`);
    const json = await res.json();
    await guard?.();
    if (json.status !== 'success' || !Array.isArray(json.data)) {
      if (json.message?.includes('SCAN_BUSY')) throw new Error(json.message);
      throw new Error(`${json.message || 'Respons scan tidak valid'}. Pastikan Kode.gs terbaru sudah di-deploy sebagai versi baru.`);
    }
    return json.data;
  };

  onProgress?.(0);
  const villages: GasKecamatanItem[] = await request('listScanDesa');
  if (villages.some(village => !village || typeof village.id !== 'string' || typeof village.name !== 'string') ||
      new Set(villages.map(village => village.id)).size !== villages.length) {
    throw new Error('Daftar desa tidak valid; pemindaian dihentikan.');
  }
  const data: RawTpsData[] = [];
  for (let i = 0; i < villages.length; i++) {
    const village = villages[i];
    data.push(...await request('scanDesa', village.id));
    onProgress?.(Math.round((i + 1) * 100 / villages.length), village.name);
  }
  if (!villages.length) onProgress?.(100);
  return data;
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
  sinceMinutes: number = 20,
  guard?: () => Promise<void>
): Promise<GasQuickScanItem[] | null> {
  try {
    const url = new URL(webAppUrl);
    url.searchParams.set('action', 'quickScan');
    url.searchParams.set('folderId', rootFolderId);
    url.searchParams.set('minutes', sinceMinutes.toString());

    await guard?.();
    const res = await fetch(url.toString(), {
      method: 'GET',
      redirect: 'follow',
    });

    if (!res.ok) return null;
    const json: GasQuickScanResponse = await res.json();
    await guard?.();
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

export interface MisplacedLocationProgress {
  phase: 'inventory' | 'scan' | 'done';
  processedFolders: number;
  totalFolders: number | null;
  percent: number | null;
}

export interface MisplacedScanProgress {
  files: MisplacedFile[];
  scannedFolders: number;
  examinedFiles: number;
  completedBatches: number;
  progress?: MisplacedLocationProgress;
  failures: string[];
}

/** Penelusuran terpisah dari scan TPS; hasil tidak masuk scanned_data. */
export async function scanMisplacedFiles(
  webAppUrl: string,
  rootFolderId: string,
  signal: AbortSignal,
  onProgress: (progress: MisplacedScanProgress) => void,
  guard?: () => Promise<void>,
): Promise<MisplacedScanProgress> {
  const found = new Map<string, MisplacedFile>();
  const folders = new Set<string>();
  const failures: string[] = [];
  const seenCursors = new Set<string>();
  let examinedFiles = 0;
  let completedBatches = 0;
  let cursor = '';
  let progress: MisplacedLocationProgress | undefined;
  const snapshot = () => ({ files: [...found.values()], scannedFolders: folders.size, examinedFiles, completedBatches, progress, failures: [...failures] });
  try {
    do {
      signal.throwIfAborted();
      const url = new URL(webAppUrl);
      Object.entries({ action: 'scanMisplacedFast', folderId: rootFolderId, rootFolderId, cursor })
        .forEach(([key, value]) => url.searchParams.set(key, value));
      await guard?.();
      const response = await fetch(url, { signal, redirect: 'follow' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const page = await response.json();
      await guard?.();
      if (page?.status !== 'success' || page.mode !== 'location-fast-v1') {
        throw new Error(`${page?.message || 'Respons tidak sesuai'}. Perbarui GAS untuk action scanMisplacedFast dan deploy versi baru.`);
      }
      if (!Array.isArray(page.data) || !Array.isArray(page.failures) || !Array.isArray(page.checkedFolderIds) ||
        !Number.isInteger(page.examinedFiles) || page.examinedFiles < 0 || typeof page.nextCursor !== 'string' ||
        page.failures.some((value: unknown) => typeof value !== 'string') ||
        page.checkedFolderIds.some((value: unknown) => typeof value !== 'string') ||
        page.data.some((item: MisplacedFile) => !item || !['id', 'name', 'url', 'folderId', 'folderUrl', 'path', 'reason']
          .every(key => typeof (item as unknown as Record<string, unknown>)[key] === 'string'))) {
        throw new Error('Respons pemindaian PDF tidak valid; hasil belum lengkap.');
      }
      const locationProgress = page.progress;
      if (!locationProgress || !['inventory', 'scan', 'done'].includes(locationProgress.phase) ||
        !Number.isInteger(locationProgress.processedFolders) || locationProgress.processedFolders < 0 ||
        (locationProgress.totalFolders !== null && (!Number.isInteger(locationProgress.totalFolders) || locationProgress.totalFolders < 1 || locationProgress.processedFolders > locationProgress.totalFolders)) ||
        (locationProgress.percent !== null && (!Number.isInteger(locationProgress.percent) || locationProgress.percent < 0 || locationProgress.percent > 100)) ||
        (locationProgress.totalFolders === null ? locationProgress.percent !== null : locationProgress.percent !== Math.floor(locationProgress.processedFolders * 100 / locationProgress.totalFolders)) ||
        (locationProgress.phase !== 'inventory' && locationProgress.totalFolders === null) ||
        (!page.nextCursor && (locationProgress.phase !== 'done' || locationProgress.percent !== 100)) ||
        (page.nextCursor && locationProgress.phase === 'done')) {
        throw new Error('Respons progres scan tidak valid; hasil belum lengkap.');
      }
      signal.throwIfAborted();
      progress = locationProgress;
      page.data.forEach((file: MisplacedFile) => found.set(`${file.id}:${file.folderId}`, file));
      page.checkedFolderIds.forEach((id: string) => folders.add(id));
      examinedFiles += page.examinedFiles;
      completedBatches++;
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
