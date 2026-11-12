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
  deleteDoc,
  collection,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { correctionState, correctionAuditPayload, type CorrectionAudit } from '@/utils/correctionAudit';
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
}

/**
 * Menyimpan hasil pemindaian Google Drive untuk 1 Kecamatan ke Cloud Firestore.
 * Tersimpan terpusat sehingga semua pengguna lain langsung mendapatkan data terbaru.
 */
export async function saveKecamatanScanToFirestore(
  kecamatanName: string,
  tpsList: RawTpsData[],
  scanToken: string
): Promise<void> {
  if (!auth.currentUser) {
    throw new Error('Akses ditolak: Anda harus login untuk menyimpan hasil sinkronisasi.');
  }

  const cleanKecName = kecamatanName.trim();
  const docRef = doc(db, 'scanned_data', cleanKecName);

  const cleanTpsList = JSON.parse(JSON.stringify(tpsList));
  const user=auth.currentUser;
  await runTransaction(db,async tx=>{
    const lease=await tx.get(doc(db,'app_config','drive_scan_lock'));
    if(!lease.data()?.active || lease.data()?.token!==scanToken)throw new Error('Scan telah beralih ke perangkat lain. Data sesi lama tidak disimpan.');
    const now=new Date().toISOString();
    tx.set(docRef,{kecamatan:cleanKecName,tpsList:cleanTpsList,tpsCount:cleanTpsList.length,updatedAt:now,updatedBy:user.email || DEFAULT_AUTH_EMAIL});
    tx.set(doc(db,'app_config','sync_metadata'),{lastSyncedAt:now,lastSyncedKecamatan:cleanKecName,lastSyncedBy:user.email || DEFAULT_AUTH_EMAIL},{merge:true});
  });
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
  const user = auth.currentUser;
  if (!user || user.email?.toLowerCase() !== ADMIN_AUTH_EMAIL) {
    throw new Error('Akses ditolak: Hanya Admin Teknis yang dapat mengoreksi berkas.');
  }
  const cleanKec = params.kecamatan.trim();
  const docRef = doc(db, 'scanned_data', cleanKec);
  const overrideRef = doc(db, 'file_overrides', params.fileId);
  const auditRef = doc(collection(db, 'correction_history'));
  // Ketiga perubahan harus berhasil bersama: kegagalan riwayat membatalkan koreksi.
  await runTransaction(db, async transaction => {
    const snap = await transaction.get(docRef);
    if (!snap.exists()) throw new Error('Data kecamatan tidak ditemukan. Muat ulang data sebelum mengoreksi.');
    const tpsList: RawTpsData[] = snap.data().tpsList || [];
    const tps = tpsList.find(t => t.tpsFolderId === params.tpsFolderId);
    const file = tps?.files.find(f => f.id === params.fileId);
    if (!tps || !file) throw new Error('Berkas tidak ditemukan di TPS ini. Muat ulang data sebelum mengoreksi.');
    const reset = !params.overrideElection && !params.isResolved;
    const after = correctionState({ overrideElection:reset ? undefined : params.overrideElection, isResolved:params.isResolved, resolutionNote:reset ? '' : params.resolutionNote });
    if (JSON.stringify(correctionState(file)) === JSON.stringify(after)) return;
    const event = correctionAuditPayload(tps, file, after, {uid:user.uid,email:user.email!,displayName:user.displayName});
    if (reset) {
      delete file.overrideElection; file.isResolved = false;
      delete file.resolutionNote; delete file.resolvedAt; delete file.resolvedBy;
      transaction.delete(overrideRef);
    } else {
      const resolvedAt = new Date().toISOString();
      Object.assign(file, {overrideElection:params.overrideElection,isResolved:params.isResolved,resolutionNote:params.resolutionNote || '',resolvedAt,resolvedBy:user.email});
      transaction.set(overrideRef, {fileId:params.fileId,kecamatan:cleanKec,tpsFolderId:params.tpsFolderId,...after,resolvedAt,resolvedBy:user.email}, {merge:true});
    }
    transaction.update(docRef, {tpsList:JSON.parse(JSON.stringify(tpsList))});
    transaction.set(auditRef, {...event,createdAt:serverTimestamp()});
  });
}

/** Riwayat append-only; waktu berasal dari server dan ditampilkan dalam WIB. */
export function subscribeCorrectionHistory(callback: (rows: CorrectionAudit[]) => void, onError: (error: Error) => void) {
  return onSnapshot(query(collection(db,'correction_history'),orderBy('createdAt','desc'),limit(100)), snapshot => {
    callback(snapshot.docs.map(item => {
      const data=item.data();
      return {...data,id:item.id,createdAt:data.createdAt?.toDate?.().toISOString() || ''} as CorrectionAudit;
    }));
  },onError);
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



export function subscribeLegacyOverrides(callback:(rows:Record<string,unknown>[])=>void,onError:(error:Error)=>void){
 return onSnapshot(collection(db,'file_overrides'),snapshot=>callback(snapshot.docs.map(item=>({...item.data(),fileId:item.id}))),onError);
}
