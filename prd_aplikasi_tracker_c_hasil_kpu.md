# Product Requirements Document (PRD)
## Sistem Monitoring & Rekapitulasi Otomatis Arsip Scan C-Hasil Pemilu 2024 (KPU Kabupaten Sekadau)

---

## 1. Latar Belakang & Masalah (Problem Statement)
Saat ini tim KPU Kabupaten Sekadau sedang melakukan pengarsipan digital berkas **C-Hasil Pemilu 2024** ke dalam Google Drive dengan struktur hierarki:
`SCAN C HASIL PEMILU 2024 (Root)` $\rightarrow$ `Kecamatan` $\rightarrow$ `Desa/Kelurahan` $\rightarrow$ `TPS X` $\rightarrow$ `5 File PDF/Scan`.

Setiap folder TPS wajib memiliki **5 file** yang merepresentasikan 5 jenis pemilihan:
1. **Presiden (PPWP)**
2. **DPR RI**
3. **DPD RI**
4. **DPRD Provinsi**
5. **DPRD Kab/Ko**

**Masalah Utama:**
Pengecekan kelengkapan berkas saat ini dilakukan secara manual dengan membuka satu per satu folder Kecamatan, Desa, dan TPS di Google Drive lalu mencatatnya ke dalam Microsoft Excel. Dengan 7 Kecamatan, puluhan Desa, dan ratusan TPS, cara manual ini sangat memakan waktu, melelahkan, dan rentan mengalami kesalahan manusia (*human error*) atau terlewat saat ada *update* file baru.

**Solusi:**
Membangun aplikasi web **C-Hasil Archive Tracker** berbasis **React.js** yang terhubung dengan struktur Google Drive untuk memindai, mengklasifikasikan nama file secara cerdas (menggunakan *smart regex parser*), menampilkan matriks kelengkapan per TPS secara visual, dan mengekspor laporan rekapitulasi langsung ke format Excel (`.xlsx`) secara otomatis.

---

## 2. Alur Perancangan Sistem (System Workflow & Architecture)

Berikut adalah alur kerja sistem dari pembacaan Google Drive hingga menghasilkan laporan Excel otomatis:

```
+-----------------------------------------------------------------------+
|                    SUMBER DATA: GOOGLE DRIVE KPU                      |
|  Root: SCAN C HASIL PEMILU 2024                                       |
|   └── Kecamatan (7 Folder: Belitang, Sekadau Hilir, dll.)             |
|        └── Desa (Contoh: BERINGKAI RAYA, MUNGGUK, SUNGAI RINGIN, dll) |
|             └── TPS (TPS 1, TPS 2, ... TPS N)                         |
|                  └── File Scan: "[Nama Desa] TPS [No] [Pemilihan]"    |
+-----------------------------------------------------------------------+
                                   │
                                   ▼
+-----------------------------------------------------------------------+
|              LAPISAN INTEGRASI DATA (2 Opsi Fleksibel)                |
|  Opsi A (Direkomendasikan & Tanpa Setup Rumit):                       |
|    - Google Apps Script (GAS) Web App sebagai jembatan API JSON       |
|      (Membaca isi folder Drive & mengirimkan JSON ke aplikasi React). |
|  Opsi B (Direct Frontend API):                                        |
|    - Google Drive API v3 (Read-Only) langsung dari React.js.          |
+-----------------------------------------------------------------------+
                                   │
                                   ▼
+-----------------------------------------------------------------------+
|              MESIN PEMROSESAN & SMART FILENAME PARSER                 |
|  1. Membaca seluruh folder TPS beserta daftar file di dalamnya.       |
|  2. Mencocokkan nama file dengan Regex 5 Pemilihan (Case-Insensitive) |
|     - Presiden: /presiden|ppwp|pilpres/i                              |
|     - DPR RI  : /dpr[\s\-_]*ri|dprri/i                                |
|     - DPD     : /\bdpd\b/i                                            |
|     - DPRD Prov: /dprd[\s\-_]*(prov|provinsi)/i                       |
|     - DPRD Kab : /dprd[\s\-_]*(kab|kabko|kab\/ko|kabupaten)/i         |
|  3. Deteksi Anomali: File duplikat, salah kamar TPS, atau typo nama.  |
+-----------------------------------------------------------------------+
                                   │
                                   ▼
+-----------------------------------------------------------------------+
|                   DASHBOARD REACT.JS & FITUR OUTPUT                   |
|  - Progress Bar Global & Per Kecamatan (Belitang s/d Sekadau Hulu)    |
|  - Tabel Matriks Checklist (✅ Lengkap / ❌ Belum / ⚠️ Nama Typo)     |
|  - Filter Cepat: "Tampilkan Hanya TPS yang Belum Lengkap"             |
|  - Tombol "Buka Folder TPS di Drive" untuk perbaikan cepat            |
|  - Tombol "Export Rekap ke Excel (.xlsx)" siap pakai                  |
+-----------------------------------------------------------------------+
```

---

## 3. Spesifikasi Struktur Data & Domain KPU Kabupaten Sekadau

### 3.1. Daftar 7 Kecamatan (Level 1)
Aplikasi harus mengenali 7 Kecamatan di Kabupaten Sekadau sebagai struktur utama:
1. `Belitang`
2. `Belitang Hilir`
3. `Belitang Hulu`
4. `Nanga Mahap`
5. `Nanga Taman`
6. `Sekadau Hilir` (Contoh Desa: *Beringkai Raya, Bokak Sebumbun, Engkersik, Ensalang, Gonis Tekam, Landau Kodah, Merapi, Mungguk, Peniti, Seberang Kapuas, Selalong, Semabi, Sempulau Indah, Seraras, Sungai Kunyit, Sungai Ringin, Tanjung, Tapang Semadak*)
7. `Sekadau Hulu`

### 3.2. Struktur Folder TPS (Level 3)
* Format nama folder: `TPS 1`, `TPS 2`, ..., `TPS 18`, dst.
* **Catatan Teknis Penting (Natural Sorting):** Aplikasi wajib mengurutkan nama folder TPS menggunakan **Natural Sort** (`numeric: true`), sehingga urutannya adalah `TPS 1, TPS 2, TPS 3 ... TPS 10`, **bukan** urutan abjad biasa (`TPS 1, TPS 10, TPS 11, TPS 2`).

### 3.3. Aturan Penamaan & Klasifikasi 5 File Pemilihan (Level 4)
Format penamaan standar: `[Nama Desa] TPS [Angka] [Jenis Pemilihan]` (Contoh: `Beringkai Raya TPS 1 DPRD Kabko.pdf`).
Karena pengetikan manual oleh operator scan sering memiliki variasi spasi atau singkatan, aplikasi harus menggunakan pencocokan cerdas (*Fuzzy/Regex Matching*):

| Kode | Kategori Pemilihan | Kata Kunci / Regex Pencocokan (Case-Insensitive) |
| :--- | :--- | :--- |
| `PPWP` | **Presiden & Wapres** | `presiden`, `ppwp`, `pilpres`, `capres` |
| `DPR_RI` | **DPR RI** | `dpr ri`, `dpr-ri`, `dprri`, `dpr_ri` |
| `DPD` | **DPD RI** | `dpd`, `dpd ri`, `dpd-ri` |
| `DPRD_PROV` | **DPRD Provinsi** | `dprd prov`, `dprd provinsi`, `dprd-prov`, `provinsi` (pastikan tidak tertukar dengan kabko) |
| `DPRD_KAB` | **DPRD Kab/Ko** | `dprd kab`, `dprd kabko`, `dprd kab/ko`, `dprd kabupaten`, `kabko`, `kab` |

**Validasi Tambahan (Deteksi Anomali):**
1. **Salah Nomor TPS (*Mismatch TPS*):** Jika di dalam folder `TPS 1` terdapat file bernama `Merapi TPS 2 Presiden.pdf`, sistem harus memberi peringatan (`⚠️ Salah Folder TPS`).
2. **Nama File Tidak Dikenali (*Unrecognized*):** Jika ada file `Scan_001.pdf` yang tidak mengandung kata kunci 5 pemilihan di atas, sistem menandainya sebagai `⚠️ Nama File Tidak Sesuai Format`.
3. **File Ganda (*Duplicate*):** Jika dalam 1 TPS ada 2 file untuk pemilihan yang sama (misal 2 file `DPR RI`), sistem memberi tanda `⚠️ Duplikat`.

---

## 4. Fitur Utama Aplikasi (Functional Requirements)

### 4.1. Dashboard Ringkasan Eksekutif (Overview)
* **Kartu Statistik Utama (KPI Cards):**
  * Total Kecamatan (7 Kecamatan) & Total Desa Terdata.
  * Total TPS Terdata vs Total TPS Lengkap (5/5 File).
  * Total File Terkumpul vs Target Total File ($\text{Total TPS} \times 5$).
  * Persentase Progres Keseluruhan (Progress Bar).
* **Grafik / Progress Bar per Kecamatan:** Menampilkan persentase kelengkapan masing-masing dari 7 Kecamatan agar langsung terlihat kecamatan mana yang paling cepat dan mana yang perlu dibantu.

### 4.2. Tabel Matriks Tracker (Pengganti Rekap Excel Manual)
Tabel interaktif yang menampilkan baris per TPS dengan kolom:
* `No`
* `Kecamatan`
* `Desa / Kelurahan`
* `Nomor TPS` (diurutkan dengan *Natural Sort*)
* `Presiden` (Ikon ✅ Hijau jika ada, ❌ Merah jika kosong)
* `DPR RI` (✅ / ❌)
* `DPD` (✅ / ❌)
* `DPRD Prov` (✅ / ❌)
* `DPRD Kab/Ko` (✅ / ❌)
* `Status Kelengkapan` (Badge: **Lengkap 5/5**, **Kurang X File**, **Kosong 0/5**, atau **Ada Anomali**)
* `Aksi` (Tombol klik langsung menuju Folder TPS di Google Drive & tombol lihat detail nama file).

### 4.3. Filter & Pencarian Cepat
* Filter berdasarkan **Kecamatan** (Dropdown: Semua, Belitang, Belitang Hilir, dst.).
* Filter berdasarkan **Desa/Kelurahan** (Menyesuaikan Kecamatan yang dipilih).
* Filter berdasarkan **Status**:
  * *Semua TPS*
  * *Belum Lengkap (1-4 File)* $\rightarrow$ Memudahkan operator mencari TPS yang kurang 1-2 file saja.
  * *Masih Kosong (0 File)*
  * *Lengkap (5/5 File)*
  * *Perlu Perbaikan Nama / Anomali*
* Filter berdasarkan **Jenis Pemilihan yang Kurang** (Misal: "Tampilkan semua TPS yang belum ada scan `DPRD Kab/Ko`").

### 4.4. Sinkronisasi per Kecamatan & Caching Lokal
* Karena jumlah folder di Google Drive sangat banyak, pemindaian (*scanning*) dilengkapi fitur **Scan per Kecamatan** atau **Scan Semua**, serta menyimpan hasilnya di `localStorage` / `IndexedDB` agar aplikasi terbuka secara instan tanpa harus menunggu *loading* berulang kali.
* Tombol **"Refresh / Sinkronkan Ulang Kecamatan Ini"** untuk memperbarui data ketika operator baru saja mengunggah file scan baru.

### 4.5. Export ke Excel (`.xlsx`) Satu Klik
Menggunakan library `xlsx` (SheetJS), pengguna dapat mengunduh file Excel yang sudah rapi berisi:
* **Sheet 1 (Rekap Per Kecamatan & Desa):** Jumlah TPS, Jumlah Lengkap, Jumlah Kurang, Persentase.
* **Sheet 2 (Detail Matriks Semua TPS):** Tabel lengkap seluruh TPS dengan tanda `1` (Sudah) atau `0` (Belum) / `SUDAH` atau `BELUM` pada masing-masing kolom 5 Pemilihan, persis seperti format rekapitulasi yang dikerjakan manual oleh staf KPU.
* **Sheet 3 (Daftar Kekurangan & Anomali):** Daftar khusus TPS yang belum lengkap beserta jenis pemilihan apa yang belum di-scan agar mudah dicetak sebagai daftar kerja harian operator scan.

---

## 5. Arsitektur Koneksi ke Google Drive (Sangat Penting!)

Agar tim KPU Kabupaten Sekadau dapat langsung menggunakan aplikasi ini tanpa terkendala izin Google Cloud Console yang rumit, sediakan **2 Mode Integrasi Data** di dalam aplikasi React:

### Mode 1: Jembatan Google Apps Script (Paling Mudah & Tanpa Biaya/Limit)
1. Buat komponen menu **"Setup Koneksi Drive"** di aplikasi React yang menyediakan kode **Google Apps Script (`Code.gs`)** siap *copy-paste*.
2. Pengguna cukup membuka [script.google.com](https://script.google.com) menggunakan akun Google KPU (`teknis.kpusekadau`), menempelkan kode script tersebut, memasukkan `Folder ID` dari folder `SCAN C HASIL PEMILU 2024`, lalu klik **Deploy as Web App**.
3. Pengguna menyalin **Web App URL** ke dalam aplikasi React.
4. Keuntungan: Tidak perlu mengurus OAuth verification Google Cloud, otomatis memiliki akses baca ke folder `Dibagikan kepada saya > SCAN C HASIL PEMILU 2024`, dan bisa memindai per Kecamatan dengan sangat cepat.

### Mode 2: Google Drive API v3 / Simulasi & Import Data
* Mendukung input `Google Drive API Key` + `Root Folder ID` (jika folder diset *Anyone with the link can view*).
* Sediakan juga **Mode Demo / Simulasi Data Realistis KPU Sekadau** saat aplikasi pertama kali dibuka, sehingga pengguna bisa langsung mencoba seluruh fitur tabel, filter, deteksi anomali, dan export Excel sebelum menghubungkan URL Google Drive asli.

---

## 6. Spesifikasi Teknis (Tech Stack untuk Google Antigravity)

* **Framework:** React.js (Vite + TypeScript / JavaScript)
* **Styling:** Tailwind CSS (Desain bersih, modern, profesional dengan aksen warna khas KPU: Merah Marun/Merah KPU `#991B1B` / `#DC2626`, Putih, dan Abu-abu Slate)
* **Icons:** `lucide-react`
* **Excel Export:** `xlsx` (SheetJS) untuk membuat file `.xlsx` multi-sheet secara langsung di browser
* **State & Storage:** React Hooks (`useState`, `useMemo`, `useEffect`) + `localStorage` untuk menyimpan cache hasil scan Google Drive dan URL konfigurasi

---

## 7. Contoh Kode Backend Google Apps Script (Wajib Disertakan di Modal Bantuan Aplikasi)

Aplikasi React harus menyertakan tombol **"Panduan & Kode penghubung Google Drive"** yang menampilkan kode Google Apps Script berikut agar pengguna tinggal *copy-paste*:

```javascript
// KODE GOOGLE APPS SCRIPT UNTUK KPU SEKADAU C-HASIL TRACKER
// Cara Pakai:
// 1. Buka https://script.google.com -> Buat Proyek Baru
// 2. Paste kode ini, lalu klik Deploy -> New Deployment -> Web App
// 3. Execute as: "Me", Who has access: "Anyone"
// 4. Copy Web App URL ke aplikasi React C-Hasil Tracker

function doGet(e) {
  var action = e.parameter.action || 'listKecamatan';
  var folderId = e.parameter.folderId;
  
  if (!folderId) {
    return responseJSON({ status: 'error', message: 'Parameter folderId wajib diisi' });
  }

  try {
    if (action === 'listKecamatan') {
      // Mengambil daftar folder Kecamatan di dalam Root Folder
      var rootFolder = DriveApp.getFolderById(folderId);
      var kecFolders = rootFolder.getFolders();
      var kecamatanList = [];
      while (kecFolders.hasNext()) {
        var kec = kecFolders.next();
        kecamatanList.push({ id: kec.getId(), name: kec.getName() });
      }
      return responseJSON({ status: 'success', data: kecamatanList });
    } 
    
    if (action === 'scanKecamatan') {
      // Memindai 1 Kecamatan: mengambil seluruh Desa -> TPS -> Daftar File
      var kecFolder = DriveApp.getFolderById(folderId);
      var desaFolders = kecFolder.getFolders();
      var result = [];

      while (desaFolders.hasNext()) {
        var desa = desaFolders.next();
        var tpsFolders = desa.getFolders();
        
        while (tpsFolders.hasNext()) {
          var tps = tpsFolders.next();
          var files = tps.getFiles();
          var fileList = [];
          
          while (files.hasNext()) {
            var file = files.next();
            
            // Ambil info pengunggah / pembuat file jika tersedia
            var uploaderName = '';
            try {
              var owner = file.getOwner();
              if (owner) {
                uploaderName = owner.getName() || owner.getEmail() || '';
              }
            } catch (err) {}

            // Jika di Google Drive Bersama / Shared Drive (getOwner bernilai null)
            if (!uploaderName) {
              try {
                if (typeof Drive !== 'undefined' && Drive.Files) {
                  var meta = Drive.Files.get(file.getId(), { supportsAllDrives: true, fields: 'owners,lastModifyingUser' });
                  if (meta.lastModifyingUser) {
                    uploaderName = meta.lastModifyingUser.displayName || meta.lastModifyingUser.emailAddress || '';
                  } else if (meta.owners && meta.owners.length > 0) {
                    uploaderName = meta.owners[0].displayName || meta.owners[0].emailAddress || '';
                  }
                }
              } catch (err) {}
            }

            // Fallback editor jika email disembunyikan
            if (!uploaderName) {
              try {
                var editors = file.getEditors();
                if (editors && editors.length > 0) {
                  uploaderName = editors[0].getName() || editors[0].getEmail() || '';
                }
              } catch (err) {}
            }

            fileList.push({
              id: file.getId(),
              name: file.getName(),
              url: file.getUrl(),
              createdAt: file.getDateCreated() ? file.getDateCreated().toISOString() : '',
              updatedAt: file.getLastUpdated() ? file.getLastUpdated().toISOString() : '',
              size: file.getSize(),
              uploader: uploaderName
            });
          }
          
          result.push({
            kecamatan: kecFolder.getName(),
            desa: desa.getName(),
            tpsFolderName: tps.getName(),
            tpsFolderId: tps.getId(),
            tpsFolderUrl: tps.getUrl(),
            files: fileList
          });
        }
      }
      return responseJSON({ status: 'success', kecamatan: kecFolder.getName(), data: result });
    }
  } catch (err) {
    return responseJSON({ status: 'error', message: err.toString() });
  }
}

function responseJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
```

---

## 8. Prompt Instruksi untuk Google Antigravity

Salin perintah di bawah ini saat kamu memasukkan file `prd.md` ini ke **Google Antigravity**:

> *"Tolong bangunkan aplikasi web lengkap berdasarkan spesifikasi di `prd.md` ini menggunakan React, Tailwind CSS, Lucide Icons, dan SheetJS (`xlsx`). Pastikan aplikasi memiliki:*
> *1. Data awal (Mock Data realistis) sesuai struktur KPU Kabupaten Sekadau (7 Kecamatan: Belitang, Belitang Hilir, Belitang Hulu, Nanga Mahap, Nanga Taman, Sekadau Hilir beserta desa-desanya seperti Beringkai Raya, Bokak Sebumbun, Engkersik, Ensalang, Gonis Tekam, Merapi, Mungguk, Sungai Ringin, dll., serta Sekadau Hulu) agar dashboard langsung tampil hidup dan interaktif.*
> *2. Fitur koneksi nyata ke Google Drive melalui integrasi Web App Google Apps Script (lengkap dengan modal berisi kode script siap copy-paste dan input Folder ID Google Drive) serta progres pemindaian per Kecamatan.*
> *3. Mesin Smart Regex Parser yang otomatis mencocokkan nama file ke dalam 5 jenis pemilihan (Presiden, DPR RI, DPD, DPRD Prov, DPRD Kab/Ko) sekaligus mendeteksi jika ada file yang salah penamaan atau kurang.*
> *4. Fitur Export ke Excel (`.xlsx`) satu klik yang menghasilkan rekapitulasi rapi per Kecamatan, Desa, dan matriks TPS."*
> *5. Agent AI tidak boleh mengedit / memindahkan file apa lagi sampe menghapus file !!!!! , aksesn hanyan preview/melihat