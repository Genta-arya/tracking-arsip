## Cara paling mudah: satu file lengkap

Buka `Kode.gs` dalam folder ini. Ganti seluruh isi Kode.gs pada proyek Apps Script dengan isinya. File lengkap sudah berisi router, Firebase/Firestore, trigger lama, pemindaian lama, dan PDF massal. Jangan memasang file helper di bawah sebagai tambahan jika menggunakan file lengkap, agar fungsi tidak terduplikasi. Hapus file helper `scan-misplaced.gs` / `scan-misplaced-pdf.gs` dari proyek Apps Script jika sebelumnya sudah ditambahkan; seluruh fungsinya kini ada di Kode.gs. Pertahankan file/properti lain milik pengguna.

Script Properties tetap dipakai; sandi tidak perlu diisi ulang jika sudah tersimpan. Jalankan `testScanMisplacedPdf` dari editor untuk menguji halaman pertama dan menyelesaikan otorisasi jika diminta. Jika Drive API belum aktif, aktifkan Google Drive API pada Google Cloud project yang terhubung dengan Apps Script (atau tambahkan layanan Drive API dari menu Services). Bila memakai manifest scope eksplisit, lihat ketentuan scope di bawah. Lalu Deploy → Manage Deployments → Edit → New version → Deploy pada deployment dengan URL yang sama. Tes lokal: `GAS_TEST_SOURCE=apps-script/Kode.gs node --test tests/misplaced-scan.test.cjs`.

---

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

## Pembaruan: PDF massal

Tambahkan `scan-misplaced-pdf.gs` ke proyek Apps Script. Fungsi `misplacedFolderReason` dari script sebelumnya tetap diperlukan (sudah ada dalam Kode.gs lengkap atau `scan-misplaced.gs`). Jangan menduplikasi fungsi lama.

Di dalam `try` pada `doGet`, tambahkan sebelum cabang action lainnya:

```js
if (action === 'scanMisplacedPdf') {
  return responseJSON(scanMisplacedPdfPage(e.parameter));
}
```

Deploy versi baru. Mesin menggunakan Drive REST API v3 lewat UrlFetchApp dan token OAuth Apps Script; tidak memerlukan password baru atau mengubah audit/trigger Firestore. Drive API harus aktif pada Google Cloud project terkait. Jika manifest memakai oauthScopes eksplisit, pastikan mencakup `https://www.googleapis.com/auth/drive.readonly` dan `https://www.googleapis.com/auth/script.external_request`; pertahankan scope lama yang masih digunakan. Lakukan otorisasi ulang jika Google memintanya.

Root di Shared Drive dideteksi otomatis lewat driveId dan pencarian dibatasi ke Drive tersebut. Root di folder biasa memakai corpora=user. Hasil tetap divalidasi berdasarkan rantai induk sampai root; metadata folder di-cache selama lima menit per sesi. Pemindaian ulang membuat sesi baru agar perpindahan folder tidak memakai cache sesi lama.

Setiap request mengambil maksimal 100 PDF (dipilih lebih kecil daripada batas API 1.000 untuk menjaga waktu eksekusi saat cache masih kosong). Halaman berlanjut melalui nextPageToken; jika pemeriksaan metadata memakan waktu, cursor melanjutkan offset pada halaman yang sama. Isi PDF tidak diunduh. Jumlah PDF diperiksa mencakup kandidat di luar root, tetapi daftar temuan hanya berisi PDF di dalam root. IncompleteSearch, masalah izin, dan token gagal menghasilkan status belum lengkap, bukan laporan bersih. Pemindahan atau perubahan akses selama pemindaian memerlukan scan ulang; API ini bukan snapshot atomik. Kecepatan nyata perlu diukur pada deployment pengguna.
