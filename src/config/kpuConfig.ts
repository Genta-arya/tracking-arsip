/**
 * KONFIGURASI LINK GOOGLE DRIVE KPU SEKADAU VIA .env
 * 
 * Nilai dibaca otomatis dari file `.env`:
 * - VITE_GAS_WEB_APP_URL
 * - VITE_ROOT_FOLDER_ID
 * 
 * 1x konfigurasi di file .env, seluruh perangkat kantor langsung otomatis terhubung!
 */

export const KPU_DEFAULT_CONFIG = {
  gasWebAppUrl: (import.meta.env.VITE_GAS_WEB_APP_URL || '').trim(),
  rootFolderId: (import.meta.env.VITE_ROOT_FOLDER_ID || '').trim(),
  kabupatenName: 'KPU Kabupaten Sekadau',
  provinsiName: 'Kalimantan Barat',
  tahunPemilu: '2024',
};
