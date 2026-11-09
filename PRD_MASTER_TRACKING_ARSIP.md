# PRODUCT REQUIREMENTS DOCUMENT (PRD) & MASTER HANDOVER
## C-Hasil Archive Tracker Pemilu 2024 — KPU Kabupaten Sekadau

> **Status Dokumen:** Up-to-date (Siap Pindah Device Tablet ke PC)  
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
1. **PPWP** (Presiden & Wakil Presiden)
2. **DPR_RI** (DPR Republik Indonesia)
3. **DPD** (Dewan Perwakilan Daerah)
4. **DPRD_PROV** (DPRD Provinsi Kalimantan Barat)
5. **DPRD_KAB** (DPRD Kabupaten Sekadau)

---

## 2. Arsitektur Sistem & Aliran Data (Data Flow)

```
[ CamScanner / Petugas PPS di Lapangan ]
                   │  (Share to Google Drive)
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
1. **Google Apps Script (GAS):** Jembatan *read-only* aman dari Google Drive ke frontend. Mendukung 3 aksi:
   - `listKecamatan`: Mendapatkan daftar 7 folder kecamatan.
   - `scanKecamatan`: Memindai folder kecamatan hingga tingkat berkas TPS.
   - `quickScan`: Memindai kilat berkas yang baru diunggah dalam 25 menit terakhir menggunakan indeks pencarian Google Drive (1–2 detik).
2. **Firebase Firestore:**
   - Koleksi `tps_scans`: Menyimpan data pindaian per kecamatan.
   - Koleksi `file_overrides`: Menyimpan status koreksi anomali petugas (termasuk status `HAPUS`).
   - Koleksi `app_metadata`: Menyimpan info sinkronisasi terakhir.
3. **Frontend React + Tailwind CSS + Framer Motion:**
   - Dashboard responsif, ringan, tanpa efek 3D berat, animasi halus.

---

## 3. Fitur Utama yang Sudah Selesai Diimplementasikan

### A. Dua Tab Utama (Segmented Deck)
1. **Tab Progres:**
   - **Kartu Statistik Global:** Total TPS, TPS Lengkap (5/5), TPS Belum Lengkap (1-4), TPS Kosong (0/5), Persentase Penyelesaian, Total Fisik Berkas, dan Total Berkas Anomali.
   - **Peta Interaktif Wilayah Kabupaten Sekadau:** Visualisasi capaian per kecamatan dengan indikator warna.
   - **Tabel Daftar Anomali Berkas:** Menampilkan berkas bermasalah dengan filter tipe anomali dan tombol aksi verifikasi.
2. **Tab Rekapitulasi:**
   - **Tabel Matriks Rekapitulasi TPS:** Kolom checklist 5 pemilihan yang ringkas dan padat (`PPWP`, `DPR`, `DPD`, `PROV`, `KAB`).
   - **Filter Cepat:** Berdasarkan Kecamatan, Desa, Status (Lengkap, Parsial, Kosong, Anomali, Mismatch Desa), serta pencarian teks.
   - **Export Excel (.xlsx):** Sekali klik menghasilkan rekapitulasi lengkap dengan *formatting* resmi KPU.

### B. Deteksi & Pengelolaan Anomali Cerdas
1. **Smart Regex Classifier:** Mengidentifikasi nama file secara otomatis tanpa sensitif huruf besar/kecil.
2. **Deteksi Salah Folder Desa (`MISMATCH_DESA`):**
   - Mendeteksi jika ada berkas yang tertukar atau tersasar (contoh: berkas Desa B diunggah ke dalam folder Desa A) dengan mencocokkan nama berkas terhadap 87 nama desa resmi di Kabupaten Sekadau.
   - Dilengkapi filter pil khusus: `📍 Salah Folder Desa (Mismatch Desa)`.
3. **Status "Hapus" (Soft Delete):**
   - Jika berkas tersesat sudah dipindahkan di Google Drive atau tidak diperlukan, petugas dapat memberi status **"HAPUS"**.
   - Berkas akan langsung disembunyikan dari tabel folder asal sebagai penanda anomali telah selesai diperbaiki, tanpa menyentuh/menghapus file fisik di Google Drive (Strict Read-Only).
4. **Proteksi Override Berlapis:**
   - Sinkronisasi dari Google Drive **TIDAK AKAN PERNAH menimpa atau menghilangkan** koreksi anomali yang sudah dibetulkan petugas. Status koreksi disimpan di Firestore dan di-inject ulang pada setiap pemindaian.

### C. Background Auto-Sync & Smart Quick-Scan
1. **Berjalan Murni Otomatis di Latar Belakang:**
   - Berjalan senyap setiap 2 menit sekali.
   - Tidak ada tombol jeda atau indikator status di navbar yang mengganggu tampilan (*100% clean UI*).
2. **Dukungan Smart Quick-Scan:**
   - Mengambil file baru CamScanner dalam hitungan 1–2 detik saja menggunakan query waktu Google Drive, sangat menghemat kuota GAS.

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
├── google-apps-script-code.js      # Kode lengkap Google Apps Script + Smart Quick-Scan
├── prd_aplikasi_tracker_c_hasil_kpu.md # PRD awal proyek
├── PRD_MASTER_TRACKING_ARSIP.md    # Dokumen master ini
├── src/
│   ├── App.tsx                     # Komponen utama, filter, router tab, & modal wrapper
│   ├── components/
│   │   ├── Navbar.tsx              # Header bersih (Pindai Drive, Export, Info Akun)
│   │   ├── ProgressDashboard.tsx   # Kartu statistik global & progress bar
│   │   ├── SekadauInteractiveMap.tsx # Peta interaktif 7 kecamatan
│   │   ├── TrackerMatrix.tsx       # Matriks checklist TPS & rekapitulasi
│   │   ├── DailyAnomalyTable3D.tsx # Tabel pantau & aksi anomali berkas
│   │   ├── FileDetailModal.tsx     # Modal detail koreksi slot berkas & status Hapus
│   │   ├── DriveSyncModal.tsx      # Modal pemindaian manual Drive dengan log visual
│   │   ├── FilterSection.tsx       # Filter dropdown Kecamatan, Desa, & Status Anomali
│   │   ├── AuthGate.tsx            # Layar kunci sandi kantor KPU
│   │   └── AnimatedCounter.tsx     # Animasi angka halus
│   ├── context/
│   │   └── AutoSyncContext.tsx     # Provider auto-sync senyap di background
│   ├── services/
│   │   ├── driveService.ts         # Panggilan HTTP ke Google Apps Script (termasuk quickScan)
│   │   ├── driveSyncEngine.ts      # Mesin sinkronisasi, merge override, & simpan Firestore
│   │   ├── firebase.ts             # Koneksi Firestore, Auth, & realtime listeners
│   │   └── storageService.ts       # Fallback penyimpanan lokal IndexedDB
│   ├── utils/
│   │   ├── parser.ts               # Regex parser 5 pemilihan & deteksi MISMATCH_DESA
│   │   └── excelExport.ts          # Generator file spreadsheet (.xlsx)
│   └── data/
│       └── mockSekadauData.ts      # Data 87 desa & struktur TPS KPU Sekadau
```

---

## 6. Deployment ke Vercel (Produksi)

Aplikasi terhubung ke Vercel:
- Setiap commit yang dipush ke branch `master` di GitHub secara otomatis memicu build dan deploy ke domain produksi Vercel KPU Sekadau.
- Konfigurasi environment Firebase dan Google Drive Web App tersimpan aman di Firestore dan local storage browser.
