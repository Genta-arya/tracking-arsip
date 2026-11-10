# Versi terbaru: scan cepat berdasarkan lokasi

Gunakan **Kode.gs** di folder ini untuk mengganti seluruh isi Kode.gs di Apps Script. Seluruh kode lama dan formatnya dipertahankan; router ditambah action `scanMisplacedFast`, lalu fungsi baru ditambahkan di akhir file. Fungsi scan lama tetap tersedia untuk kompatibilitas. Jangan memasang helper `scan-misplaced*.gs` sebagai tambahan jika menggunakan file lengkap: seluruh fungsi sudah digabung.

## Pemasangan

1. Salin seluruh isi `Kode.gs` ke Kode.gs di proyek Apps Script yang sama.
2. Pertahankan Script Properties, termasuk `FIREBASE_AUTH_PASSWORD`. Tidak perlu mengisi ulang sandi atau memasang ulang trigger.
3. Jika sebelumnya memasang file helper terpisah, hapus hanya helper duplikat yang fungsinya kini sudah ada dalam Kode.gs lengkap.
4. Jalankan `testScanMisplacedFast` dari editor. Tes ini membaca halaman pertama pendataan lokasi, bukan seluruh scan.
5. Deploy → Manage Deployments → Edit → New version → Deploy, memakai URL deployment yang sama.

Google Drive API harus aktif pada Google Cloud project terkait Apps Script. Mesin menggunakan REST v3 lewat UrlFetchApp dan OAuth Apps Script; tidak membutuhkan password baru. Jika manifest memakai oauthScopes eksplisit, pertahankan scope yang digunakan fungsi lama dan pastikan `https://www.googleapis.com/auth/drive.readonly` serta `https://www.googleapis.com/auth/script.external_request` tersedia. Selesaikan otorisasi ulang jika diminta.

## Cakupan dan persentase

- Tahap 1: daftar folder langsung di root, lalu daftar folder langsung di bawah tingkat kecamatan. Folder dengan nama tidak dikenal pada kedua tingkat tetap masuk daftar lokasi. Root/kecamatan/desa ditentukan oleh posisi; validitas nama desa belum diperiksa.
- Tahap 2: cari PDF langsung di root, kecamatan, dan desa secara berkelompok, maksimal 20 ID parent per request dan 1.000 hasil per halaman API. Semua halaman sebuah kelompok harus selesai sebelum lokasi dalam kelompok itu dihitung selesai.
- Persentase tahap pendataan baru tersedia setelah daftar folder root selesai dibaca; dihitung dari root dan tingkat kecamatan yang selesai didata. Saat pindah ke tahap pemeriksaan, persentase tahap baru dimulai dari 0, dengan jumlah lokasi tetap yang sudah didata.
- Persentase pemeriksaan = floor(lokasi selesai × 100 / total lokasi). Penyebutnya mencakup root, folder tingkat kecamatan, dan folder tingkat desa, bukan jumlah PDF. Contoh 20 dari 50 lokasi = 40%. Setelah seluruh kelompok dan seluruh halamannya selesai, hasilnya 100%.
- Isi folder TPS sama sekali tidak dibaca oleh scan cepat. Salah TPS, subfolder di dalam TPS, shortcut, dan berkas non-PDF berada di luar cakupan. Endpoint lama tetap ada tetapi bukan mesin yang digunakan tab Berkas Tersesat terbaru.
- Pencarian selalu dibatasi oleh ID parent di dalam root; tidak lagi mencari seluruh PDF akun. Shared Drive dan folder biasa yang dibagikan didukung.
- Sesi sementara disimpan dalam CacheService selama maksimal 20 menit per langkah, dalam potongan kecil. Cache Google dapat terhapus lebih awal; jika hilang, pemindaian berhenti dengan pesan untuk mulai ulang. Tidak ada scan yang diam-diam di-reset menjadi hasil bersih. Membuka ulang scan membuat sesi baru.
- Izin gagal, incompleteSearch, dan halaman gagal menghentikan scan dengan hasil belum lengkap. Data yang berubah saat scan berjalan memerlukan scan ulang; API bukan snapshot atomik. Kecepatan deployment nyata belum diukur.

## Validasi

`node --test tests/fast-scan.test.cjs tests/misplaced-scan.test.cjs` memeriksa scope lokasi, pengecualian isi TPS, pengelompokan parent, pagination, persentase, cache kedaluwarsa, izin gagal, kompatibilitas, dan pelestarian fungsi lama pada file lengkap. Browser dapat diuji dengan respons simulasi. Validasi Drive asli memerlukan deployment pengguna.

Helper `scan-misplaced.gs`, `scan-misplaced-pdf.gs`, dan `scan-misplaced-fast.gs` disediakan sebagai sumber modul; pilih pemasangan modular atau satu file lengkap, bukan keduanya.
