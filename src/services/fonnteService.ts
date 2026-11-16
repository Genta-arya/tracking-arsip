/**
 * Layanan Notifikasi WhatsApp via Fonnte API untuk Anomali Berkas C-Hasil KPU Sekadau.
 * Mencegah duplikasi pesan (anti-spam) dengan melacak fileId yang sudah pernah dinotifikasi.
 */

import { RawTpsData } from '@/types';
import { processRawTps } from '@/utils/parser';
import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const FONNTE_API_URL = 'https://api.fonnte.com/send';
export const DEFAULT_WHATSAPP_TARGET = '6282261247070';
export const DEFAULT_FONNTE_TOKEN = 'VhUsXuPPBcEQAdPwZXYW';

const FIRESTORE_COLLECTION = 'app_config';
const FIRESTORE_DOC_NOTIFIED = 'notified_anomalies';
const LOCAL_STORAGE_KEY = 'kpu_sekadau_notified_anomalies_cache';

interface NotifiedCache {
  ids: string[];
}

/**
 * Format nomor WhatsApp ke standar Fonnte (misal +62 822-6124-7070 -> 6282261247070)
 */
export function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  }
  return cleaned;
}

/**
 * Mengambil daftar ID berkas yang sudah pernah dikirimi notifikasi WA.
 * Menggabungkan Indexed/Local Cache dengan Firestore terpusat agar sinkron antar perangkat.
 */
export async function getNotifiedFileIds(): Promise<Set<string>> {
  const ids = new Set<string>();

  // 1. Baca dari LocalStorage
  try {
    const rawLocal = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (rawLocal) {
      const parsed: string[] = JSON.parse(rawLocal);
      parsed.forEach((id) => ids.add(id));
    }
  } catch (err) {
    console.warn('[Fonnte] Gagal membaca cache lokal notified anomalies:', err);
  }

  // 2. Baca dari Firestore terpusat (jika online/terkoneksi)
  try {
    const docRef = doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC_NOTIFIED);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as NotifiedCache;
      if (Array.isArray(data.ids)) {
        data.ids.forEach((id) => ids.add(id));
      }
    }
  } catch (err) {
    console.warn('[Fonnte] Gagal membaca notified_anomalies dari Firestore (menggunakan cache lokal):', err);
  }

  return ids;
}

/**
 * Menyimpan ID berkas yang baru dinotifikasi ke Firestore dan LocalStorage.
 */
export async function markFileIdsAsNotified(newIds: string[]): Promise<void> {
  if (newIds.length === 0) return;

  const currentIds = await getNotifiedFileIds();
  newIds.forEach((id) => currentIds.add(id));
  const idArray = Array.from(currentIds);

  // Simpan ke LocalStorage
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(idArray));
  } catch (err) {
    console.warn('[Fonnte] Gagal menyimpan ke localStorage:', err);
  }

  // Simpan ke Firestore
  try {
    const docRef = doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC_NOTIFIED);
    await setDoc(docRef, { ids: idArray, lastUpdated: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.warn('[Fonnte] Gagal menyimpan ke Firestore notified_anomalies:', err);
  }
}

export interface AnomalyNotificationItem {
  fileId: string;
  fileName: string;
  fileUrl?: string;
  kecamatan: string;
  desa: string;
  tpsFolderName: string;
  anomalyMessages: string[];
}

/**
 * Mendeteksi anomali aktif yang belum terselesaikan dari data mentah TPS
 * dan menyaring hanya berkas yang BELUM pernah dinotifikasi ke WA.
 */
export async function findUnnotifiedAnomalies(
  rawData: RawTpsData[]
): Promise<AnomalyNotificationItem[]> {
  const notifiedIds = await getNotifiedFileIds();
  const unnotified: AnomalyNotificationItem[] = [];

  for (const rawTps of rawData) {
    const record = processRawTps(rawTps);

    // Periksa setiap berkas dalam record
    for (const file of record.files) {
      // Hanya berkas yang memiliki anomali dan BELUM terselesaikan (isResolved false)
      if (file.anomalies && file.anomalies.length > 0 && !file.isResolved) {
        if (!notifiedIds.has(file.id)) {
          unnotified.push({
            fileId: file.id,
            fileName: file.name,
            fileUrl: file.url,
            kecamatan: record.kecamatan,
            desa: record.desa,
            tpsFolderName: record.tpsFolderName,
            anomalyMessages: file.anomalies.map((a) => a.message),
          });
        }
      }
    }
  }

  return unnotified;
}

/**
 * Mengirim pesan WhatsApp via Fonnte API
 */
export async function sendWhatsAppViaFonnte(
  targetPhone: string,
  message: string,
  token: string = DEFAULT_FONNTE_TOKEN
): Promise<{ success: boolean; detail?: any; error?: string }> {
  try {
    const formattedTarget = formatPhoneNumber(targetPhone);
    const formData = new URLSearchParams();
    formData.append('target', formattedTarget);
    formData.append('message', message);
    formData.append('countryCode', '62');

    const res = await fetch(FONNTE_API_URL, {
      method: 'POST',
      headers: {
        Authorization: token,
      },
      body: formData,
    });

    const data = await res.json();
    if (data.status) {
      return { success: true, detail: data };
    } else {
      return { success: false, error: data.reason || 'Gagal mengirim pesan melalui Fonnte' };
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Koneksi ke server Fonnte gagal' };
  }
}

/**
 * Memeriksa data hasil pemindaian/sinkronisasi Drive dan mengirimkan notifikasi WA jika ada anomali baru.
 * Otomatis mencatat berkas yang sudah dinotifikasi agar tidak terjadi spam.
 */
export async function checkAndNotifyAnomalies(
  rawData: RawTpsData[],
  targetPhone: string = DEFAULT_WHATSAPP_TARGET,
  token: string = DEFAULT_FONNTE_TOKEN
): Promise<{ sentCount: number; errors: string[] }> {
  if (!rawData || rawData.length === 0) {
    return { sentCount: 0, errors: [] };
  }

  const unnotifiedItems = await findUnnotifiedAnomalies(rawData);
  if (unnotifiedItems.length === 0) {
    return { sentCount: 0, errors: [] };
  }

  const errors: string[] = [];
  const newlyNotifiedIds: string[] = [];

  // Format pesan WhatsApp yang rapi dan informatif
  const nowStr = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Pontianak',
  }).format(new Date());

  // Kelompokkan anomali per TPS/Desa/Kecamatan
  let message = `⚠️ *PERINGATAN ANOMALI BERKAS C-HASIL*\n`;
  message += `Sistem Tracking Arsip KPU Sekadau\n`;
  message += `Waktu: ${nowStr} WIB\n`;
  message += `Terdeteksi *${unnotifiedItems.length}* berkas anomali baru yang memerlukan penanganan:\n\n`;

  // Batasi rincian teks pesan jika terlalu banyak agar tidak melampaui batas karakter WA
  const maxDisplay = 10;
  const itemsToDisplay = unnotifiedItems.slice(0, maxDisplay);

  itemsToDisplay.forEach((item, idx) => {
    message += `*${idx + 1}. [${item.kecamatan.toUpperCase()} - ${item.desa}] ${item.tpsFolderName}*\n`;
    message += `📄 File: ${item.fileName}\n`;
    message += `❗ Kendala: ${item.anomalyMessages.join('; ')}\n`;
    if (item.fileUrl) {
      message += `🔗 Link: ${item.fileUrl}\n`;
    }
    message += `\n`;
  });

  if (unnotifiedItems.length > maxDisplay) {
    message += `_...dan ${unnotifiedItems.length - maxDisplay} berkas anomali lainnya._\n\n`;
  }

  message += `Mohon segera periksa dan lakukan perbaikan/verifikasi di Dashboard Tracking Arsip KPU Kab. Sekadau.`;

  // Kirim WhatsApp via Fonnte
  const sendRes = await sendWhatsAppViaFonnte(targetPhone, message, token);

  if (sendRes.success) {
    // Tandai semua item sebagai sudah dinotifikasi
    unnotifiedItems.forEach((it) => newlyNotifiedIds.push(it.fileId));
    await markFileIdsAsNotified(newlyNotifiedIds);
  } else {
    errors.push(sendRes.error || 'Gagal mengirim pesan');
  }

  return {
    sentCount: newlyNotifiedIds.length,
    errors,
  };
}
