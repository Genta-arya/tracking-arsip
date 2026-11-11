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
