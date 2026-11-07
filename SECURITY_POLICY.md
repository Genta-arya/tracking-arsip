# ATURAN KEAMANAN & INTEGRITAS DATA (STRICT READ-ONLY POLICY)
## KPU Kabupaten Sekadau - C-Hasil Archive Tracker

Dokumen ini adalah aturan mutlak yang mengikat seluruh komponen aplikasi dan pengembang/AI:

### 1. Prinsip Mutlak: READ-ONLY (HANYA MELIHAT / PREVIEW)
1. **Tidak Ada Izin Edit:** Aplikasi maupun AI tidak boleh dan tidak memiliki fungsi untuk mengedit nama file, isi file, metadata, atau struktur folder di Google Drive.
2. **Tidak Ada Izin Pindah (*Move*):** Aplikasi dilarang memindahkan berkas dari satu folder ke folder lain.
3. **Tidak Ada Izin Hapus (*Delete / Trash*):** Aplikasi dan skrip pendukung sama sekali TIDAK MEMILIKI fungsi `deleteFile()`, `removeFolder()`, `setTrashed()`, atau operasi destruktif apa pun.
4. **Semua Aksi Bersifat Eksternal & Tautan:**
   - Tombol "Lihat Berkas" hanya membuka tautan preview resmi Google Drive (`https://drive.google.com/file/d/.../view` atau `.../preview`) di tab browser baru.
   - Tombol "Buka Folder TPS" hanya membuka URL folder Google Drive di tab browser baru agar operator manusia yang berwenang dapat meninjaunya langsung.

### 2. Batasan Teknis pada Google Apps Script (`Code.gs`)
1. Hanya mengimplementasikan `doGet(e)` untuk membaca struktur (*query*).
2. Hanya memanggil method pembacaan: `DriveApp.getFolderById()`, `folder.getFolders()`, `folder.getFiles()`, `file.getName()`, `file.getUrl()`, `file.getLastUpdated()`, `file.getSize()`.
3. Tidak ada method `doPost(e)` yang mengeksekusi operasi penulisan/penghapusan.

