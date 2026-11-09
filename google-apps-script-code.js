// =========================================================================
// KODE GOOGLE APPS SCRIPT KPU KABUPATEN SEKADAU (C-HASIL ARCHIVE TRACKER)
// 100% STRICT READ-ONLY (HANYA MEMBACA / PREVIEW, TIDAK MENGUBAH / MENGHAPUS BERKAS)
// =========================================================================
// Panduan Pasang / Update di Google Apps Script:
// 1. Buka https://script.google.com -> Buka proyek script KPU Anda.
// 2. Ganti seluruh isi Kode.gs dengan kode di bawah ini.
// 3. Klik "Deploy" (Terapkan) -> "Manage Deployments" (Kelola Penerapan).
// 4. Klik ikon Pensil (Edit) -> Version: "New Version" (Versi Baru) -> Klik "Deploy".
//
// Catatan Kompatibilitas:
// Frontend C-Hasil Tracker dirancang 100% kompatibel baik dengan script lama
// (listKecamatan & scanKecamatan) maupun script versi baru dengan quickScan.
// =========================================================================

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'listKecamatan';
  var folderId = e && e.parameter && e.parameter.folderId;

  if (!folderId && action !== 'quickScan') {
    return responseJSON({ status: 'error', message: 'Parameter folderId wajib disertakan' });
  }

  try {
    // -------------------------------------------------------------
    // FITUR 1: Smart Quick-Scan (Deteksi Kilat Berkas Baru 1-2 Detik)
    // -------------------------------------------------------------
    if (action === 'quickScan') {
      var mins = parseInt((e && e.parameter && e.parameter.minutes) || '30', 10);
      var pastIso = new Date(Date.now() - mins * 60 * 1000).toISOString();
      var query = "trashed = false and mimeType != 'application/vnd.google-apps.folder' and modifiedDate > '" + pastIso + "'";

      var recentFiles = [];
      var seenIds = {};
      var count = 0;

      try {
        var files = DriveApp.searchFiles(query);
        while (files.hasNext() && count < 100) {
          var file = files.next();
          var fileId = file.getId();
          if (seenIds[fileId]) continue;

          var parents = file.getParents();
          var tpsFolder = parents.hasNext() ? parents.next() : null;
          var tpsName = tpsFolder ? tpsFolder.getName().trim() : '';
          var tpsId = tpsFolder ? tpsFolder.getId() : '';

          var desaFolder = (tpsFolder && tpsFolder.getParents().hasNext()) ? tpsFolder.getParents().next() : null;
          var desaName = desaFolder ? desaFolder.getName().trim() : '';

          var kecFolder = (desaFolder && desaFolder.getParents().hasNext()) ? desaFolder.getParents().next() : null;
          var kecName = kecFolder ? kecFolder.getName().trim() : '';

          // Wajib hanya memproses berkas yang berada di struktur Folder TPS -> Desa -> Kecamatan
          if (!tpsName || !desaName || !kecName) continue;

          var uploaderName = extractFileUploader(file);

          var createdAt = '';
          var updatedAt = '';
          try {
            if (file.getDateCreated()) createdAt = file.getDateCreated().toISOString();
            if (file.getLastUpdated()) updatedAt = file.getLastUpdated().toISOString();
          } catch (err) {}

          seenIds[fileId] = true;
          recentFiles.push({
            file: {
              id: fileId,
              name: file.getName(),
              url: file.getUrl(),
              createdAt: createdAt,
              updatedAt: updatedAt,
              size: file.getSize(),
              uploader: uploaderName
            },
            tpsFolderName: tpsName,
            tpsFolderId: tpsId,
            desa: desaName,
            kecamatan: kecName
          });
          count++;
        }
      } catch (errSearch) {}

      return responseJSON({ status: 'success', count: recentFiles.length, data: recentFiles });
    }

    // -------------------------------------------------------------
    // FITUR 2: List Kecamatan di dalam Root Folder
    // -------------------------------------------------------------
    if (action === 'listKecamatan') {
      var rootFolder = DriveApp.getFolderById(folderId);
      var kecFolders = rootFolder.getFolders();
      var kecamatanList = [];
      while (kecFolders.hasNext()) {
        var kec = kecFolders.next();
        kecamatanList.push({ id: kec.getId(), name: kec.getName().trim() });
      }
      return responseJSON({ status: 'success', data: kecamatanList });
    }

    // -------------------------------------------------------------
    // FITUR 3: Pindai 1 Kecamatan Lengkap (Desa -> TPS -> Berkas)
    // -------------------------------------------------------------
    if (action === 'scanKecamatan') {
      var kecFolder = DriveApp.getFolderById(folderId);
      var desaFolders = kecFolder.getFolders();
      var result = [];

      while (desaFolders.hasNext()) {
        var desa = desaFolders.next();
        var desaName = desa.getName().trim();
        var tpsFolders = desa.getFolders();

        while (tpsFolders.hasNext()) {
          var tps = tpsFolders.next();
          var tpsName = tps.getName().trim();
          var files = tps.getFiles();
          var fileList = [];

          while (files.hasNext()) {
            var file = files.next();
            var uploaderName = extractFileUploader(file);

            // Waktu Upload & Waktu Terakhir Diedit
            var createdAt = '';
            var updatedAt = '';
            try {
              if (file.getDateCreated()) createdAt = file.getDateCreated().toISOString();
              if (file.getLastUpdated()) updatedAt = file.getLastUpdated().toISOString();
            } catch (err) {}

            fileList.push({
              id: file.getId(),
              name: file.getName(),
              url: file.getUrl(),
              createdAt: createdAt,
              updatedAt: updatedAt,
              size: file.getSize(),
              uploader: uploaderName
            });
          }

          result.push({
            kecamatan: kecFolder.getName().trim(),
            desa: desaName,
            tpsFolderName: tpsName,
            tpsFolderId: tps.getId(),
            tpsFolderUrl: tps.getUrl(),
            files: fileList
          });
        }
      }
      return responseJSON({
        status: 'success',
        kecamatan: kecFolder.getName().trim(),
        data: result
      });
    }

    return responseJSON({ status: 'error', message: 'Aksi tidak dikenali' });
  } catch (err) {
    return responseJSON({ status: 'error', message: err.toString() });
  }
}

/**
 * Helper Ekstraksi Nama Pengunggah Berkas (Uploader) 3-Tingkat
 * 1. getOwner() resmi DriveApp
 * 2. Drive.Files.get() untuk Google Workspace Shared Drive
 * 3. getEditors() fallback
 */
function extractFileUploader(file) {
  var uploaderName = '';

  // 1. Ambil Pemilik File Menggunakan getOwner()
  try {
    var owner = file.getOwner();
    if (owner) {
      uploaderName = owner.getName() || owner.getEmail() || '';
    }
  } catch (err) {}

  // 2. Jika di Google Drive Bersama (Shared Drive) di mana getOwner bernilai null
  if (!uploaderName) {
    try {
      if (typeof Drive !== 'undefined' && Drive.Files) {
        var meta = Drive.Files.get(file.getId(), {
          supportsAllDrives: true,
          fields: 'owners,lastModifyingUser'
        });
        if (meta.lastModifyingUser) {
          uploaderName = meta.lastModifyingUser.displayName || meta.lastModifyingUser.emailAddress || '';
        } else if (meta.owners && meta.owners.length > 0) {
          uploaderName = meta.owners[0].displayName || meta.owners[0].emailAddress || '';
        }
      }
    } catch (err) {}
  }

  // 3. Fallback editor jika email akun disembunyikan oleh domain
  if (!uploaderName) {
    try {
      var editors = file.getEditors();
      if (editors && editors.length > 0) {
        uploaderName = editors[0].getName() || editors[0].getEmail() || '';
      }
    } catch (err) {}
  }

  return uploaderName;
}

function responseJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
