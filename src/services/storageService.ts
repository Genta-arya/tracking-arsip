import { get, set, del } from 'idb-keyval';
import { RawTpsData, AppConfig } from '@/types';
import { KPU_DEFAULT_CONFIG } from '@/config/kpuConfig';

const STORAGE_KEY_CONFIG = 'kpu_sekadau_app_config_v1';
const IDB_KEY_RAW_DATA = 'kpu_sekadau_raw_tps_data_v1';

export const DEFAULT_CONFIG: AppConfig = {
  gasWebAppUrl: KPU_DEFAULT_CONFIG.gasWebAppUrl,
  rootFolderId: KPU_DEFAULT_CONFIG.rootFolderId,
  lastSyncedAt: null,
  isDemoMode: !(KPU_DEFAULT_CONFIG.gasWebAppUrl && KPU_DEFAULT_CONFIG.rootFolderId),
};

export async function loadAppConfig(): Promise<AppConfig> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      gasWebAppUrl: parsed.gasWebAppUrl || DEFAULT_CONFIG.gasWebAppUrl,
      rootFolderId: parsed.rootFolderId || DEFAULT_CONFIG.rootFolderId,
    };
  } catch (err) {
    console.error('Gagal memuat konfigurasi dari localStorage:', err);
    return DEFAULT_CONFIG;
  }
}

export function saveAppConfig(config: AppConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  } catch (err) {
    console.error('Gagal menyimpan konfigurasi ke localStorage:', err);
  }
}

export async function loadStoredRawData(): Promise<RawTpsData[] | null> {
  try {
    const data = await get<RawTpsData[]>(IDB_KEY_RAW_DATA);
    return data || null;
  } catch (err) {
    console.error('Gagal memuat data dari IndexedDB:', err);
    return null;
  }
}

export async function saveStoredRawData(data: RawTpsData[]): Promise<void> {
  try {
    await set(IDB_KEY_RAW_DATA, data);
  } catch (err) {
    console.error('Gagal menyimpan data ke IndexedDB:', err);
  }
}

export async function clearAllLocalCache(): Promise<void> {
  try {
    await del(IDB_KEY_RAW_DATA);
    localStorage.removeItem(STORAGE_KEY_CONFIG);
  } catch (err) {
    console.error('Gagal mereset cache:', err);
  }
}

/**
 * Backup seluruh data hasil scan ke file JSON (bisa dipindah ke laptop lain)
 */
export function downloadBackupJson(data: RawTpsData[]): void {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `BACKUP_DATA_C_HASIL_KPU_SEKADAU_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

