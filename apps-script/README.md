# Pemindaian berkas tersesat

**Jika Kode.gs lengkap dengan action `scanMisplaced` sudah dipasang dan di-deploy, langsung gunakan tombol di aplikasi. Jangan menambahkan fungsi yang sama lagi dari file tambahan ini.**

Untuk memperbarui script lama secara terpisah:

1. Tambahkan isi `scan-misplaced.gs` sebagai file baru di proyek Google Apps Script yang sudah digunakan aplikasi. Pertahankan Kode.gs dan trigger yang ada.
2. Di dalam blok `try` fungsi `doGet(e)` yang ada, **sebelum cabang diagnose**, tambahkan:

```js
if (action === 'scanMisplaced') {
  return responseJSON(scanMisplacedFolderPage(e.parameter));
}
```

3. Deploy → Manage Deployments → Edit → New Version → Deploy. URL deployment yang digunakan aplikasi tetap sama.
4. Buka dialog sinkronisasi Drive di aplikasi, lalu klik **Pindai Berkas Tersesat**.

Endpoint ini hanya membaca Drive; tidak memindahkan, menghapus, menulis Firestore, atau menjalankan auditAll. Tidak memerlukan kredensial Firebase tambahan. Jangan menyalin password Firebase ke repositori.

Cakupan: seluruh turunan root arsip yang dapat dibaca akun deployment, tanpa batas waktu modifikasi. Jalur normal adalah root → salah satu dari tujuh kecamatan Sekadau → desa → TPS bernomor → berkas langsung. TPS menerima nama seperti TPS 001, TPS_1, TPS-01, dan TPS1. Folder kecamatan dibandingkan tanpa membedakan kapital/spasi berulang. Nama desa mengikuti struktur posisi; validitas nama desa atau kecocokan isi berkas dengan TPS tidak dipastikan oleh audit ini. Itu tetap ditangani pemeriksaan anomali aplikasi. Berkas pendukung di luar TPS juga akan ditampilkan untuk ditinjau.

Penelusuran dibagi per folder dan halaman maksimal 100 berkas/100 subfolder; token Drive melanjutkan folder besar. Hasil bertambah selama proses; kegagalan folder dilaporkan sebagai hasil belum lengkap dan tidak dianggap bersih. Pemindaian dapat dihentikan dan dimulai ulang. Menutup dialog membatalkan scan; hasil sesi tidak disimpan. Shortcut tidak diikuti (shortcut di lokasi salah tetap dilaporkan sebagai berkas); berkas di luar root, trash, dan folder yang tidak dapat diakses tidak dicari. Hasil merupakan pembacaan bertahap, sehingga pemindahan berkas selama scan memerlukan pemindaian ulang. Tidak ada penentuan otomatis tujuan pemindahan yang belum diketahui.

Validasi lokal menggunakan mock DriveApp tersedia dengan `node --test tests/misplaced-scan.test.cjs`. Validasi deployment nyata tetap membutuhkan pembaruan Apps Script dan akses Drive.
