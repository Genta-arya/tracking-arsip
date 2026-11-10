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


## Statistik perubahan harian dan hasil scan

Kode.gs lengkap juga menyimpan `archiveComparison.current` dan `archiveComparison.previous` dalam `app_config/sync_metadata`. Untuk mengaktifkan statistik dari scan background, ganti seluruh Kode.gs dengan versi lengkap terbaru, simpan, dan deploy New Version. Pertahankan Script Properties dan trigger yang ada. Jangan memasang `archive-comparison.gs` sebagai tambahan jika memakai file lengkap karena fungsinya sudah digabung.

- Satu snapshot setelah audit background seluruh kecamatan berhasil, termasuk audit tanpa perubahan. Audit sebagian gagal tidak menghasilkan snapshot total parsial. Fungsi diagnosis/audit satu kecamatan di editor tidak dianggap audit global baru.
- Browser mencatat satu snapshot setelah scan manual yang dipilih berhasil. Scan semua kecamatan menghasilkan satu snapshot, bukan satu per kecamatan. Quick-sync hanya mencatat snapshot setelah perubahan berhasil disimpan, dan diberi label pembaruan parsial karena totalnya menggabungkan data terbaru dengan data kecamatan lain yang sudah tersimpan.
- Total menghitung berkas aktif di TPS, mengikuti dashboard (bukan HAPUS/IGNORE); berkas tersesat di luar TPS tidak ikut. Snapshot menyimpan rootFolderId agar arsip berbeda tidak memakai baseline yang sama. Selisih adalah perubahan bersih; bukan jumlah penambahan dan penghapusan secara terpisah.
- Dua hasil terakhir disimpan terpusat. Scan pertama menjadi baseline tanpa persentase; tidak ada rekonstruksi riwayat palsu. Dua scan tanpa perubahan menunjukkan 0 berkas/0%.
- Browser menggunakan transaksi Firestore, GAS memakai precondition updateTime/retry untuk mencegah dua penulis menimpa baseline yang sama. Metadata lastSyncedAt tetap hanya diperbarui saat data disinkronkan/berubah; field perbandingan di-merge agar tidak terhapus.
- Grafik harian memakai timestamp createdAt, atau updatedAt jika createdAt tidak valid, dari berkas yang masih tercatat. Waktu dikelompokkan dalam Asia/Jakarta (WIB). Ini adalah aktivitas berkas masuk yang masih tercatat, bukan snapshot total historis per hari. Penurunan penerimaan harian bukan bukti penghapusan berkas.
- Grafik hanya memuat tanggal dan kategori dengan jumlah >0. Tanpa timestamp valid, tampil kondisi kosong; tidak dibuat distribusi atau angka simulasi. Pembanding harian tetap sehari sebelumnya menurut kalender, meskipun hari kosong tidak ditampilkan di grafik. Nilai sebelumnya 0 dengan nilai baru >0 ditampilkan sebagai baru, bukan Infinity%.

Pengujian seluruh fitur: `node --test tests/*.test.cjs`. Pengujian Firebase/Drive lokal menggunakan mock; pembacaan dan penulisan pada deployment pengguna harus diverifikasi setelah GAS diperbarui. Tidak diperlukan perubahan Firestore Rules karena field baru menggunakan dokumen sync_metadata yang sudah diizinkan.
