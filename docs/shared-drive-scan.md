# Riwayat lama dan scan bersama

## Aktivasi

1. Publish seluruh `firestore.rules` terbaru melalui Firebase Console. Tambahan
   kali ini adalah match `/app_config/drive_scan_lock`.
2. Tidak perlu memasang pengunci baru di GAS. Jika versi pengunci router
   sebelumnya sudah dipasang, gunakan `apps-script/Kode.gs` terbaru dan deploy
   versi baru untuk menghapusnya. Pengunci lama pada trigger auto-push tidak diubah.
3. Deploy frontend hasil `npm run build`, lalu muat ulang aplikasi di semua
   perangkat admin. Klien lama tidak mengetahui status lease dari frontend baru.

Sesi ini tidak memiliki login Firebase/Apps Script untuk publikasi aturan atau
backend tersebut; file siap disalin dari repositori. Kode.gs menjaga akses Drive
read-only.

## Cara kerja

- Satu lease global di `app_config/drive_scan_lock`, diperoleh dalam transaksi
  Firestore sebelum memanggil GAS. Token unik per sesi, bukan UID, karena satu
  akun dapat digunakan bersama oleh beberapa perangkat.
- Status pemilik, tahap, dan persentase didengarkan realtime. Navbar dan tombol
  scan menampilkan status bersama; scan biasa/tersesat dikunci saat lease aktif
  atau status server belum diketahui.
- Kepemilikan diperiksa sebelum/sesudah request, dengan konfirmasi server
  dibatasi maksimal sekali per 3 detik agar tidak boros write Firestore.
  Heartbeat tetap berjalan setiap 25 detik.
  Lease terputus kedaluwarsa setelah 180 detik. Aturan Firestore menggunakan waktu
  server untuk memvalidasi pengambilalihan, bukan hanya jam perangkat.
- Penyimpanan hasil kecamatan dan metadata memeriksa token dalam transaksi yang
  sama. Sesi lama tidak boleh menimpa hasil pemilik baru. Release hanya dapat
  melepaskan tokennya sendiri.
- Sync penuh, quick sync, scan per kecamatan dan scan berkas tersesat berbagi
  pengunci yang sama. Permintaan kamera Scan Berkas tidak memakai lease Drive.
- Pengunci scan tidak ditambahkan pada router GAS. Koordinasi hanya berlaku
  untuk perangkat yang memakai frontend terbaru dan lease Firestore ini.
  Klien lama atau pemanggilan GAS langsung tidak tercakup oleh pengunci aplikasi.

## Riwayat lama

Section riwayat menggabungkan audit baru dengan koreksi terakhir yang masih
tersimpan di scanned_data dan file_overrides. Catatan lama diberi label terpisah;
waktu/email dipertahankan jika ada, status sebelum yang hilang tidak ditebak.
Ini bukan rekonstruksi seluruh aktivitas masa lalu: perubahan yang sudah
tertindih atau terhapus sebelum audit diaktifkan tidak dapat dipulihkan.

## Verifikasi

- `node --test tests/*.test.cjs`
- `npm run build`
- Uji dua browser login: mulai scan di A, lihat status/progres di B, pastikan
  tombol B tidak menjalankan request scan. Setelah A selesai, B dapat memulai.
- Tutup perangkat pemilik dan tunggu lease kedaluwarsa; perangkat lain dapat
  mengambil alih. Sesi lama tetap ditolak bila mencoba menyimpan hasil.

## Identitas pemindai

Lease memuat nama/email akun, nama perangkat lokal yang dapat diedit, ID lokal
browser, jenis perangkat, OS, browser, user agent, dan waktu mulai dari server.
Nama perangkat disimpan di localStorage; ID ini bukan nomor seri hardware dan
akan berbeda pada profil browser lain atau setelah penyimpanan dibersihkan.
Label OS/browser diturunkan dari user agent, bukan identifikasi model pasti.
Identitas perangkat dilaporkan klien; UID/email dan timestamp divalidasi rules.
Alamat IP tidak dikumpulkan atau dicari melalui pihak ketiga. Detail tersedia
di modal scan dan kartu status sinkronisasi.

Publish `firestore.rules` terbaru lagi agar field metadata perangkat diterima.
