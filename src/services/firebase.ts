import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  runTransaction,
} from 'firebase/firestore';
import { countActiveArchiveFiles, nextArchiveComparison, type ArchiveComparison } from '@/utils/progressAnalytics';
import { RawTpsData, OverrideElectionType } from '@/types';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

// Cek apakah konfigurasi Firebase sudah diisi di .env
export function isFirebaseConfigured(): boolean {
  return !!(firebaseConfig.apiKey && firebaseConfig.projectId);
}

// Inisialisasi Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

// Default email kantor untuk autentikasi sandi tunggal
export const DEFAULT_AUTH_EMAIL =
  import.meta.env.VITE_FIREBASE_AUTH_EMAIL || 'petugas@kpusekadau.local';

// Email akun admin teknis KPU
export const ADMIN_AUTH_EMAIL = 'teknis.kpusekadau@gmail.com';

/**
 * Login menggunakan Sandi Akses Kantor atau Email Admin
 * Di balik layar menggunakan Firebase Authentication (Email/Password)
 */
export async function loginWithPasscode(passcode: string, customEmail?: string): Promise<User> {
  if (!isFirebaseConfigured()) {
    throw new Error(
      'Konfigurasi Firebase belum diisi di file .env. Silakan lengkapi VITE_FIREBASE_API_KEY, dll.'
    );
  }

  // Jika passcode adalah 'teknissekadau' atau email ditentukan, targetkan akun admin
  const targetEmail = customEmail?.trim() || (passcode === 'teknissekadau' ? ADMIN_AUTH_EMAIL : DEFAULT_AUTH_EMAIL);

  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      targetEmail,
      passcode
    );
    return userCredential.user;
  } catch (err: any) {
    // Jika gagal dengan email default, otomatis coba akun admin teknis
    if (!customEmail && targetEmail === DEFAULT_AUTH_EMAIL) {
      try {
        const adminCred = await signInWithEmailAndPassword(
          auth,
          ADMIN_AUTH_EMAIL,
          passcode
        );
        return adminCred.user;
      } catch {
        throw err;
      }
    }
    throw err;
  }
}

/**
 * Mengambil link Google Drive & Google Apps Script secara AMAN dari Firestore
 * Hanya berhasil jika pengguna sudah terautentikasi (request.auth != null)
 */
export async function fetchSecureDriveConfig(): Promise<{
  gasWebAppUrl: string;
  rootFolderId: string;
}> {
  if (!auth.currentUser) {
    throw new Error('Akses ditolak: Anda belum memasukkan sandi autentikasi');
  }

  const docRef = doc(db, 'app_config', 'drive_settings');
  const snap = await getDoc(docRef);

  if (!snap.exists()) {
    console.warn(
      'Dokumen "drive_settings" belum ditemukan di koleksi "app_config" Firestore. Silakan buat dokumen tersebut di Firebase Console.'
    );
    return {
      gasWebAppUrl: '',
      rootFolderId: '',
    };
  }

  const data = snap.data();
  return {
    gasWebAppUrl: (data.gasWebAppUrl || '').trim(),
    rootFolderId: (data.rootFolderId || '').trim(),
  };
}

/**
 * Logout / Mengunci kembali akses dashboard
 */
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * Memantau status login Firebase
 */
export function subscribeAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export interface SyncMetadata {
  lastSyncedAt: string;
  lastSyncedKecamatan: string;
  lastSyncedBy: string;
  archiveComparison?: ArchiveComparison;
}

/** Catat satu snapshot total setelah seluruh pekerjaan scan yang diminta berhasil. */
export async function recordArchiveScanComparison(source: string, rootFolderId: string): Promise<void> {
  if (!auth.currentUser || !rootFolderId) throw new Error('Login dan root arsip diperlukan untuk mencatat perbandingan scan.');
  const documents = await getDocs(collection(db, 'scanned_data'));
  const metaRef = doc(db, 'app_config', 'sync_metadata');
  await runTransaction(db, async transaction => {
    const [meta, ...scans] = await Promise.all([
      transaction.get(metaRef), ...documents.docs.map(document => transaction.get(document.ref)),
    ]);
    const records = scans.flatMap(snapshot => {
      const data = snapshot.data();
      return Array.isArray(data?.tpsList) ? data.tpsList as RawTpsData[] : [];
    });
    const comparison = nextArchiveComparison(meta.data()?.archiveComparison, {
      total: countActiveArchiveFiles(records), at: new Date().toISOString(), source,
      rootFolderId, metric: 'active-files-v1',
    });
    transaction.set(metaRef, { archiveComparison: comparison }, { merge: true });
  });
}

/**
 * Menyimpan hasil pemindaian Google Drive untuk 1 Kecamatan ke Cloud Firestore.
 * Tersimpan terpusat sehingga semua pengguna lain langsung mendapatkan data terbaru.
 */
export async function saveKecamatanScanToFirestore(
  kecamatanName: string,
  tpsList: RawTpsData[]
): Promise<void> {
  if (!auth.currentUser) {
    throw new Error('Akses ditolak: Anda harus login untuk menyimpan hasil sinkronisasi.');
  }

  const cleanKecName = kecamatanName.trim();
  const docRef = doc(db, 'scanned_data', cleanKecName);

  // Bersihkan nilai undefined agar valid untuk Firestore
  const cleanTpsList = JSON.parse(JSON.stringify(tpsList));

  await setDoc(docRef, {
    kecamatan: cleanKecName,
    tpsList: cleanTpsList,
    tpsCount: cleanTpsList.length,
    updatedAt: new Date().toISOString(),
    updatedBy: auth.currentUser.email || DEFAULT_AUTH_EMAIL,
  });

  // Perbarui metadata sinkronisasi global
  const metaRef = doc(db, 'app_config', 'sync_metadata');
  await setDoc(
    metaRef,
    {
      lastSyncedAt: new Date().toISOString(),
      lastSyncedKecamatan: cleanKecName,
      lastSyncedBy: auth.currentUser.email || DEFAULT_AUTH_EMAIL,
    },
    { merge: true }
  );
}

/**
 * Mendengarkan perubahan data hasil scan secara REAL-TIME dari Firestore.
 * Jika ada admin lain yang melakukan sinkronisasi, fungsi ini akan langsung aktif.
 */
export function subscribeRealtimeScannedData(
  callback: (data: RawTpsData[], countKecamatan: number) => void,
  onError?: (err: Error) => void
) {
  const colRef = collection(db, 'scanned_data');

  return onSnapshot(
    colRef,
    (snapshot) => {
      const allRecords: RawTpsData[] = [];
      let count = 0;

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (Array.isArray(data.tpsList)) {
          allRecords.push(...(data.tpsList as RawTpsData[]));
          count++;
        }
      });

      callback(allRecords, count);
    },
    (err) => {
      console.error('Error saat mendengarkan data Firestore real-time:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Mendengarkan pembaruan metadata sinkronisasi global secara REAL-TIME.
 */
export function subscribeSyncMetadata(
  callback: (meta: SyncMetadata | null) => void
) {
  const docRef = doc(db, 'app_config', 'sync_metadata');
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      callback(snap.data() as SyncMetadata);
    } else {
      callback(null);
    }
  });
}

/**
 * Memperbarui status / penetapan anomali berkas oleh Admin Teknis.
 * Data disimpan ke Firestore doc kecamatan dan koleksi permanen file_overrides.
 */
export async function updateFileAnomalyStatus(params: {
  kecamatan: string;
  tpsFolderId: string;
  fileId: string;
  overrideElection?: OverrideElectionType;
  isResolved: boolean;
  resolutionNote?: string;
}): Promise<void> {
  if (!auth.currentUser) {
    throw new Error('Akses ditolak: Hanya admin terautentikasi yang dapat mengubah status anomali.');
  }

  const cleanKec = params.kecamatan.trim();
  const docRef = doc(db, 'scanned_data', cleanKec);
  const snap = await getDoc(docRef);

  if (snap.exists()) {
    const data = snap.data();
    const tpsList: RawTpsData[] = data.tpsList || [];

    // Cari TPS dan file yang bersangkutan
    const tps = tpsList.find((t) => t.tpsFolderId === params.tpsFolderId);
    if (tps) {
      const file = tps.files.find((f) => f.id === params.fileId);
      if (file) {
        if (!params.overrideElection && !params.isResolved) {
          delete file.overrideElection;
          file.isResolved = false;
          delete file.resolutionNote;
          delete file.resolvedAt;
          delete file.resolvedBy;
        } else {
          file.overrideElection = params.overrideElection;
          file.isResolved = params.isResolved;
          file.resolutionNote = params.resolutionNote || '';
          file.resolvedAt = new Date().toISOString();
          file.resolvedBy = auth.currentUser.email || ADMIN_AUTH_EMAIL;
        }

        // Simpan kembali ke doc kecamatan di Firestore
        const cleanTpsList = JSON.parse(JSON.stringify(tpsList));
        await setDoc(docRef, { ...data, tpsList: cleanTpsList }, { merge: true });
      }
    }
  }

  // Simpan juga ke koleksi permanen file_overrides
  const overrideRef = doc(db, 'file_overrides', params.fileId);
  if (!params.overrideElection && !params.isResolved) {
    try {
      await deleteDoc(overrideRef);
    } catch (e) {
      console.warn('Gagal menghapus file_overrides doc:', e);
    }
  } else {
    await setDoc(
      overrideRef,
      JSON.parse(
        JSON.stringify({
          fileId: params.fileId,
          kecamatan: cleanKec,
          tpsFolderId: params.tpsFolderId,
          overrideElection: params.overrideElection || null,
          isResolved: params.isResolved,
          resolutionNote: params.resolutionNote || '',
          resolvedAt: new Date().toISOString(),
          resolvedBy: auth.currentUser.email || ADMIN_AUTH_EMAIL,
        })
      ),
      { merge: true }
    );
  }
}

/**
 * Menghapus dokumen override berkas tertentu dari Firestore file_overrides
 */
export async function deleteFileOverride(fileId: string): Promise<void> {
  try {
    const overrideRef = doc(db, 'file_overrides', fileId);
    await deleteDoc(overrideRef);
  } catch (err) {
    console.warn(`Gagal menghapus file_overrides untuk ${fileId}:`, err);
  }
}

/**
 * Mengambil seluruh riwayat override/koreksi anomali dari Firestore berdasarkan fileId
 */
export async function fetchAllFileOverrides(): Promise<Map<string, any>> {
  const map = new Map<string, any>();
  try {
    const colRef = collection(db, 'file_overrides');
    const snap = await getDocs(colRef);
    snap.forEach((d) => {
      map.set(d.id, d.data());
    });
  } catch (err) {
    console.warn('Gagal memuat file_overrides dari Firestore:', err);
  }
  return map;
}


