# Riwayat perbaikan anomali

Setiap koreksi Admin Teknis menyimpan status TPS, file_overrides, dan satu
correction_history dalam transaksi Firestore. Bila salah satu penulisan gagal,
seluruh transaksi gagal. UI hanya memperbarui koreksi setelah commit berhasil.
Koreksi yang tidak mengubah status/catatan tidak menambah aktivitas duplikat.

Riwayat mencakup identitas Firebase admin (UID, display name bila ada, email),
waktu server, lokasi kecamatan/desa/TPS, ID/nama/URL berkas, kategori dan status
verifikasi sebelum/sesudah, serta catatan lama/baru. Reset, pemulihan, dan
penandaan hapus/pindah ikut dicatat. Riwayat menampilkan 100 aktivitas terbaru
secara realtime dalam tabel minimalis, dengan pencarian dan paginasi
10/25/50 baris per halaman. Data pendukung dapat dibuka per baris.
Waktu ditampilkan eksplisit dalam zona Asia/Jakarta (WIB).

## Aktivasi di produksi

1. Buka Firebase Console proyek `tracking-chasil` → Firestore Database → Rules.
2. Ganti isi aturan dengan seluruh isi file `firestore.rules` di repositori.
3. Tekan Publish. Deploy frontend hasil build terbaru melalui alur hosting biasa.
4. Login sebagai Admin Teknis, lakukan koreksi dan periksa section Riwayat
   Perbaikan Anomali di tab Rekapitulasi, lalu muat ulang untuk memeriksa persistensi.

Jika Firebase CLI sudah login pada mesin Anda, langkah aturan juga dapat
menggunakan `firebase deploy --only firestore:rules --project tracking-chasil`.
Tidak ada konfigurasi atau perubahan Kode.gs untuk fitur ini.

Aturan baru memberi akses baca ke pengguna login dan hanya mengizinkan Admin
Teknis menambah catatan dengan UID/email sesuai token serta timestamp server.
Update/delete riwayat ditolak dari aplikasi. Admin Firebase tetap mengelola data
melalui akses administratif server/console. Dengan aturan lama, penyimpanan
koreksi baru akan ditolak agar tidak ada koreksi tanpa catatan riwayat.

Audit lengkap dimulai setelah fitur diaktifkan. Koreksi terakhir pada data lama
dan file_overrides ditampilkan dengan label Koreksi lama; email/waktu yang ada
dipertahankan, status sebelumnya yang tidak diketahui tidak dibuat-buat.
