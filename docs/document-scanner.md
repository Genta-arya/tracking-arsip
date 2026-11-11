# Deteksi dokumen

Scanner menjalankan OpenCV.js di Web Worker lokal. Runtime OpenCV dimuat dari
asset hasil build, saat panel scan dibuka; tidak memakai CDN dan tidak mengirim
foto ke layanan lain. Deploy seluruh folder `dist`, termasuk asset OpenCV dan
worker yang dibuat Vite. Versi OpenCV dipatok karena API runtime dapat berbeda
antar build.

Preview kamera dianalisis pada sisi terpanjang 480 piksel. Foto dari kamera,
galeri, dan tombol Auto crop dianalisis hingga 960 piksel. Mesin mencari kontur
pada grayscale serta kanal R/G/B menggunakan beberapa ambang Canny, penutupan
celah, Otsu, dan threshold adaptif. Kandidat empat sisi dinilai dari luas,
kesesuaian kontur, posisi, dan transisi warna di batas kertas. Garis batas asli
kemudian dipasangkan ulang untuk memperhalus sudut sebelum pelurusan perspektif.

Permintaan kamera menunggu analisis frame sebelumnya selesai. Hasil lama tidak
boleh diterapkan setelah kamera ditutup. Indikator membedakan mesin yang masih
dimuat, dokumen yang ditemukan, dan kegagalan mesin. Auto crop yang tidak
menemukan kandidat mempertahankan crop sebelumnya; sudut tetap dapat diedit
manual. Foto tetap tersedia untuk crop manual jika mesin gagal dimuat.

Pengujian:

- `node --test tests/*.test.cjs`
- `npm run build`
- Browser: cek pemuatan worker dan runtime pada hasil build, izin kamera,
  kamera berhenti setelah capture/tutup, impor maksimal 25 halaman,
  Auto crop, Warna Ajaib, serta rename dan unduh PDF.

Deteksi tetap bergantung pada batas kertas yang terlihat. Tepi tertutup tangan,
kertas melengkung, atau warna kertas yang menyatu dengan latar dapat memerlukan
penyesuaian sudut manual.

## Kamera layar penuh dan ketuk fokus

Video memakai `object-fit: cover`. Konversi layar/sensor memperhitungkan sisi
video yang terpotong, sehingga tanda bidik dan polygon dokumen tetap selaras.
Titik pilihan diteruskan ke worker untuk memilih kandidat dokumen yang
melingkupinya. Titik itu ikut disimpan dengan halaman hasil kamera agar Auto
crop berikutnya tetap memilih dokumen yang sama. Hasil frame sebelum ketukan
terbaru diabaikan; ketukan segera meminta analisis baru tanpa menumpuk antrean.

Pengaturan fokus lensa hanya diminta jika track kamera mengiklankan dukungan
`pointsOfInterest`. Jika tidak didukung atau permintaan ditolak, pemilihan area
deteksi tetap berfungsi. Tombol Fokus otomatis menghapus titik pilihan dan
mengembalikan mode fokus continuous pada kamera yang mendukungnya.

## Pratinjau dan berbagi PDF

Preview PDF membuat dokumen tanpa memulai unduhan dan menampilkan pratinjau halaman dari
raster yang dipakai untuk membuat PDF. File PDF asli dapat dibuka lewat Buka
file PDF, diunduh ulang, atau dibagikan melalui Web Share API dengan `File`
bertipe `application/pdf`. Tombol WhatsApp/Drive membuka share sheet perangkat;
aplikasi tujuan dipilih pengguna. Tidak ada upload Drive otomatis atau tautan
WhatsApp yang berpura-pura melampirkan file. Browser tanpa dukungan berbagi file
menampilkan petunjuk unduh dan lampirkan/unggah manual. Batal berbagi tidak
menutup pratinjau. URL hasil PDF tetap hidup selama sesi, dan dibersihkan saat
PDF diganti atau komponen dilepas.

Unduhan baru dimulai saat pengguna menekan Unduh PDF di panel pratinjau.
