# PRODUCT REQUIREMENTS DOCUMENT (PRD) & MASTER HANDOVER
## C-Hasil Archive Tracker Pemilu 2024 — KPU Kabupaten Sekadau

> **Status Dokumen:** Up-to-date & Terverifikasi (Siap Pindah Device Tablet ke PC)  
> **Terakhir Diperbarui:** 09 November 2026  
> **Target Pengguna:** Tim Teknis & Staf Pengarsipan KPU Kabupaten Sekadau  
> **Repository GitHub:** `git@github.com:Genta-arya/tracking-arsip.git` (Branch: `master`)

---

## 1. Ringkasan Eksekutif & Tujuan Proyek

Aplikasi **C-Hasil Archive Tracker** adalah sistem monitoring berbasis web untuk memantau, mendeteksi, dan merekapitulasi kelengkapan berkas digital **C-Hasil Pemilu 2024** dari Google Drive ke dalam dashboard visual interaktif dan ekspor Excel secara otomatis.

Struktur folder Google Drive KPU Sekadau:
```
SCAN C HASIL PEMILU 2024 (Root)
 └── [Kecamatan] (7 Kecamatan: Belitang, Belitang Hilir, Belitang Hulu, Nanga Mahap, Nanga Taman, Sekadau Hilir, Sekadau Hulu)
      └── [Desa/Kelurahan] (Total 87 Desa Resmi)
           └── [TPS X] (TPS 01, TPS 02, ...)
                └── 5 Berkas Wajib C-Hasil (Format Scan/PDF dari CamScanner/HP)
```

Setiap TPS wajib memiliki **5 jenis pemilihan**:
1. **PPWP** (Presiden & Wakil Presiden — Abu-Abu)
2. **DPR_RI** (DPR Republik Indonesia — Kuning)
3. **DPD** (Dewan Perwakilan Daerah — Merah)
4. **DPRD_PROV** (DPRD Provinsi Kalimantan Barat — Biru)
5. **DPRD_KAB** (DPRD Kabupaten Sekadau — Hijau)

Total cakupan wilayah: **7 Kecamatan**, **87 Desa**, dan tepat **698 TPS**.

---

## 2. Arsitektur Sistem & Aliran Data (Data Flow)

```
[ CamScanner / Petugas PPS di Lapangan ]
                   │  (Share/Upload to Google Drive)
                   ▼
       [ Google Drive KPU Sekadau ]
                   │
                   ▼  (doGet HTTP via Google Apps Script)
       [ Google Apps Script Web App ]
                   │
                   ▼  (Background Auto-Sync / Smart Quick-Scan)
       [ Frontend React (Dashboard KPU) ]
                   │
                   ▼  (Realtime Read/Write)
       [ Firebase Firestore Database ]
                   ▲
                   │  (Realtime Multi-User Sync)
       [ Seluruh Perangkat Petugas di Kantor KPU ]
```

### Komponen Inti:
1. **Google Apps Script (GAS):** Jembatan *read-only* aman dari Google Drive ke frontend.
   - **Kompatibilitas Ganda:** Sistem mendukung penuh script standar (`listKecamatan` & `scanKecamatan`) maupun versi baru dengan `quickScan`.
   - Mendukung Google Workspace Shared Drive menggunakan `Drive.Files.get(id, { supportsAllDrives: true })` serta fallback `getEditors()`.
   - Script lengkap tersimpan di berkas `google-apps-script-code.js`.
2. **Firebase Firestore:**
   - Koleksi `scanned_data`: Menyimpan data pindaian per kecamatan.
   - Koleksi `file_overrides`: Menyimpan status koreksi anomali petugas (termasuk status `HAPUS`).
   - Koleksi `app_config`: Menyimpan info sinkronisasi dan konfigurasi Drive.
3. **Frontend React + Tailwind CSS + Framer Motion:**
   - Desain **3D Tactical Command Deck** yang ringan, mewah, dan berakselerasi GPU (`box-shadow`, `transform: translateZ(0)`).
   - Dioptimalkan khusus agar lancar dan bebas lag di perangkat HP maupun PC.

---

## 3. Fitur Utama yang Sudah Selesai Diimplementasikan

### A. Dua Tab Utama (Segmented Floating Command Deck)

#### 1. Tab Progres (Pusat Analisis & Eksekutif)
- **Kartu Statistik Global 3D:** Total TPS (698), TPS Lengkap (5/5), TPS Belum Lengkap (1-4), TPS Kosong (0/5), Persentase Penyelesaian, Total Fisik Berkas, dan Total Berkas Anomali.
- **Grafik Tren Berkas Harian (`TrendChart3D`):** Visualisasi peningkatan berkas masuk per tanggal unggah dengan filter rentang waktu.
- **Peringkat Progres 7 Kecamatan (`KecamatanRanking3D`):** Urutan capaian kecamatan dengan tabung progres 3D silindris dan indikator anomali.
- **Kelengkapan 5 Jenis Pemilihan (`ElectionBreakdown3D`):** Bar progres warna resmi surat suara (Abu-Abu, Kuning, Merah, Biru, Hijau).
- **Monitoring Aktivitas Staf Pengunggah (`UploaderLeaderboard3D`):** Menampilkan staf pengunggah berkas ke Google Drive, jumlah file, dan tingkat akurasi penamaan.
- **Mobile Stack Cards 3D (`MobileStackCards3D`):** Kartu ringkasan interaktif yang ergonomis saat dibuka di layar ponsel.

#### 2. Tab Rekapitulasi (Operasional & Peninjauan Data TPS)
- **Header 1: Rekap Data Anomali Berkas Harian (`DailyAnomalyTable3D`):**
  - **Bypass Nama Berkas Asli:** Menampilkan nama file mentah apa adanya (`font-mono`) agar staf langsung menyadari letak kesalahan format.
  - **Filter Harian & Kategori:** Pengelompokan berkas per hari unggah (*Hari Ini, 19 Feb, 18 Feb, dll.*) serta filter jenis anomali.
  - **Aksi Cepat:** Tautan langsung ke Google Drive dan tombol *Koreksi* instan untuk membuka modal penetapan slot.
  - *Collapsible*: Dapat dilipat/dibuka kapan saja.
- **Section 2: Peta Pantauan Wilayah Sekadau (`SekadauInteractiveMap`):**
  - Berbasis tile open-source **100% Gratis Bebas API Key** (OpenStreetMap Standar, Citra Satelit Esri, dan Kontras).
  - *Fit-Bounds Cerdas*: Otomatis membingkai ke-7 kecamatan secara proporsional.
  - Bar navigasi cepat 7 kecamatan dan tombol perbesar kanvas.
- **Section 3 & 4 (Menempel Satu Kesatuan Tanpa Terhalang Peta):**
  - **Filter & Parameter Matriks (`FilterSection`):** Dropdown Kecamatan, Desa, Status Kelengkapan, Jenis yang Belum Ada, dan Pencarian teks.
  - **Matriks Kelengkapan Berkas Scan (`TrackerMatrix`):** Kolom checklist 5 pemilihan dalam bentuk permata/balok 3D timbul. Perubahan filter langsung mengubah tabel di bawahnya tanpa perlu scroll melewati peta.
  - **Export Excel (.xlsx):** Sekali klik mengekspor seluruh rekapitulasi ke file spreadsheet resmi.

---

### B. Deteksi & Pengelolaan Anomali Cerdas

1. **Smart Regex Classifier:** Mengidentifikasi jenis surat suara secara otomatis tanpa sensitif huruf besar/kecil.
2. **Deteksi Salah Folder Desa (`MISMATCH_DESA`):**
   - Mendeteksi jika ada berkas yang tertukar atau tersasar (contoh: berkas Desa B diunggah ke folder Desa A) dengan mencocokkan nama berkas terhadap 87 nama desa resmi di Kabupaten Sekadau.
   - Dilengkapi filter khusus: `📍 Salah Folder Desa (Mismatch Desa)`.
3. **Status "Hapus" (Soft Delete):**
   - Jika berkas tersesat sudah dipindahkan di Google Drive atau tidak diperlukan, petugas dapat memberi status **"HAPUS"**.
   - Berkas akan langsung disembunyikan dari tabel folder asal sebagai penanda anomali telah selesai diperbaiki, tanpa menyentuh/menghapus file fisik di Google Drive (Strict Read-Only).
4. **Proteksi Override Berlapis:**
   - Sinkronisasi dari Google Drive **TIDAK AKAN PERNAH menimpa atau menghilangkan** koreksi anomali yang sudah dibetulkan petugas. Status koreksi disimpan di Firestore dan di-inject ulang pada setiap pemindaian.

---

### C. Background Auto-Sync & Smart Quick-Scan

1. **Berjalan Murni Otomatis di Latar Belakang:**
   - Berjalan senyap setiap 2 menit sekali via `AutoSyncContext`.
   - Tampilan navbar tetap 100% bersih tanpa indikator yang mengganggu.
2. **Dukungan Smart Quick-Scan:**
   - Mengambil file baru CamScanner dalam hitungan 1–2 detik saja menggunakan query waktu Google Drive (`modifiedDate > ...`).
   - Jika GAS yang terpasang adalah versi standar (belum memiliki `quickScan`), sistem secara otomatis beralih ke `scanKecamatan` normal dengan aman.

---

## 4. Panduan Melanjutkan di PC Baru

### Langkah 1: Clone / Pull Repository di PC
Buka terminal / Command Prompt / Git Bash di PC Anda:
```bash
git clone git@github.com:Genta-arya/tracking-arsip.git
cd tracking-arsip
# Atau jika folder sudah ada, cukup jalankan:
git pull origin master
```

### Langkah 2: Instal Dependensi
Pastikan Node.js (v18 ke atas) sudah terpasang di PC:
```bash
npm install
```

### Langkah 3: Menjalankan Server Development
```bash
npm run dev
```
Buka browser di `http://localhost:5173`.

### Langkah 4: Build Produksi & Uji Type Checking
```bash
npm run build
# Atau:
npx tsc --noEmit && npx vite build
```

---

## 5. Struktur Berkas Penting Proyek

```
tracking-arsip/
├── google-apps-script-code.js      # Kode lengkap Google Apps Script (listKecamatan, scanKecamatan, quickScan)
├── prd_aplikasi_tracker_c_hasil_kpu.md # PRD awal proyek
├── PRD_MASTER_TRACKING_ARSIP.md    # Dokumen master handover ini
├── src/
│   ├── App.tsx                     # Komponen root, filter state, router tab, & modal wrapper
│   ├── components/
│   │   ├── Navbar.tsx              # Header bersih (Pindai Drive, Export, Info Akun)
│   │   ├── ProgressDashboard.tsx   # Dashboard analitik utama (Tab Progres)
│   │   ├── TrendChart3D.tsx        # Grafik tren peningkatan berkas harian
│   │   ├── KecamatanRanking3D.tsx  # Peringkat progres capaian 7 kecamatan
│   │   ├── ElectionBreakdown3D.tsx # Kelengkapan 5 jenis pemilihan (PPWP, DPR, DPD, PROV, KAB)
│   │   ├── UploaderLeaderboard3D.tsx # Pemantauan aktivitas staf pengunggah ke Drive
│   │   ├── MobileStackCards3D.tsx  # Tampilan swipe card 3D responsif ponsel
│   │   ├── DailyAnomalyTable3D.tsx # Header 1 Rekapitulasi: Tabel anomali harian (bypass nama file)
│   │   ├── SekadauInteractiveMap.tsx # Peta interaktif 7 kecamatan (OSM & Esri gratis tanpa API key)
│   │   ├── FilterSection.tsx       # Filter parameter matriks (melekat di atas tabel matriks)
│   │   ├── TrackerMatrix.tsx       # Matriks checklist TPS 5 pemilihan dengan balok 3D
│   │   ├── FileDetailModal.tsx     # Modal detail koreksi slot berkas & status Hapus
│   │   ├── DriveSyncModal.tsx      # Modal pemindaian manual Drive dengan log visual
│   │   ├── AuthGate.tsx            # Portal login 3D Tactical Vault
│   │   ├── TiltCard3D.tsx          # Komponen kartu 3D tilt fisik
│   │   └── AnimatedCounter.tsx     # Animasi transisi angka halus
│   ├── context/
│   │   └── AutoSyncContext.tsx     # Provider background auto-sync 2 menit
│   ├── services/
│   │   ├── driveService.ts         # Panggilan HTTP ke Google Apps Script (termasuk quickScan)
│   │   ├── driveSyncEngine.ts      # Mesin sinkronisasi, merge override, & simpan Firestore
│   │   ├── firebase.ts             # Koneksi Firestore, Auth, & realtime listeners
│   │   └── storageService.ts       # Fallback penyimpanan lokal
│   ├── utils/
│   │   ├── parser.ts               # Regex parser 5 pemilihan & deteksi MISMATCH_DESA
│   │   └── excelExport.ts          # Generator file spreadsheet (.xlsx)
│   └── data/
│       ├── mockSekadauData.ts      # Data 87 desa & alokasi 698 TPS KPU Sekadau
│       └── sekadauCoordinates.ts   # Koordinat geografis & bounding box Sekadau
```

---

## 6. Deployment ke Vercel (Produksi)

Aplikasi terhubung ke Vercel:
- Setiap commit yang dipush ke branch `master` di GitHub secara otomatis memicu build dan deploy ke domain produksi Vercel KPU Sekadau.
- Konfigurasi environment Firebase dan Google Drive Web App tersimpan aman di Firestore dan local storage browser.
