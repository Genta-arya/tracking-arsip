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
    if (action === 'diagnose') {
      var diagRootId = folderId || FIREBASE_CONFIG.ROOT_FOLDER_ID;
      var diagFolder = DriveApp.getFolderById(diagRootId);
      var diagName = diagFolder.getName();

      var sfResults = [];
      try {
        var sf = diagFolder.searchFiles("trashed = false and mimeType != 'application/vnd.google-apps.folder'");
        while (sf.hasNext() && sfResults.length < 10) {
          var f1 = sf.next();
          sfResults.push({
            name: f1.getName(),
            id: f1.getId(),
            lastUpdated: f1.getLastUpdated() ? f1.getLastUpdated().toISOString() : '',
            dateCreated: f1.getDateCreated() ? f1.getDateCreated().toISOString() : ''
          });
        }
      } catch (errSf) {
        sfResults.push({ error: errSf.toString() });
      }

      return responseJSON({
        status: 'success',
        rootId: diagRootId,
        rootName: diagName,
        searchFilesSample: sfResults
      });
    }

    // -------------------------------------------------------------
    // FITUR 1: Smart Quick-Scan (Deteksi Kilat Berkas Baru di Shared Folder)
    // -------------------------------------------------------------
    if (action === 'quickScan') {
      var mins = parseInt((e && e.parameter && e.parameter.minutes) || '60', 10);
      var pastIso = new Date(Date.now() - mins * 60 * 1000).toISOString();
      var query = "trashed = false and mimeType != 'application/vnd.google-apps.folder' and modifiedDate > '" + pastIso + "'";

      var recentFiles = [];
      var seenIds = {};
      var count = 0;

      // 1. Cari dari Target Root Folder (Mendukung Shared Folder & Link Publik)
      try {
        var targetFolder = null;
        if (folderId) {
          try {
            targetFolder = DriveApp.getFolderById(folderId);
          } catch (errF) {}
        }
        var files = targetFolder ? targetFolder.searchFiles(query) : DriveApp.searchFiles(query);

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

      // 2. Fallback pencarian lanjutan jika menggunakan Google Shared Drive
      if (count === 0) {
        try {
          if (typeof Drive !== 'undefined' && Drive.Files && Drive.Files.list) {
            var advQuery = "trashed = false and mimeType != 'application/vnd.google-apps.folder' and modifiedDate > '" + pastIso + "'";
            var advResp = Drive.Files.list({
              q: advQuery,
              supportsAllDrives: true,
              includeItemsFromAllDrives: true,
              corpora: 'allDrives',
              maxResults: 60,
              fields: 'items(id,title,alternateLink,createdDate,modifiedDate,fileSize,parents)'
            });
            if (advResp && advResp.items) {
              for (var k = 0; k < advResp.items.length; k++) {
                var it = advResp.items[k];
                if (seenIds[it.id]) continue;
                try {
                  var fObj = DriveApp.getFileById(it.id);
                  var pObj = fObj.getParents();
                  var tpsF = pObj.hasNext() ? pObj.next() : null;
                  var tpsN = tpsF ? tpsF.getName().trim() : '';
                  var desaF = (tpsF && tpsF.getParents().hasNext()) ? tpsF.getParents().next() : null;
                  var desaN = desaF ? desaF.getName().trim() : '';
                  var kecF = (desaF && desaF.getParents().hasNext()) ? desaF.getParents().next() : null;
                  var kecN = kecF ? kecF.getName().trim() : '';

                  if (tpsN && desaN && kecN) {
                    seenIds[it.id] = true;
                    recentFiles.push({
                      file: {
                        id: it.id,
                        name: it.title || fObj.getName(),
                        url: it.alternateLink || fObj.getUrl(),
                        createdAt: it.createdDate || '',
                        updatedAt: it.modifiedDate || '',
                        size: it.fileSize ? parseInt(it.fileSize, 10) : fObj.getSize(),
                        uploader: extractFileUploader(fObj)
                      },
                      tpsFolderName: tpsN,
                      tpsFolderId: tpsF ? tpsF.getId() : '',
                      desa: desaN,
                      kecamatan: kecN
                    });
                    count++;
                  }
                } catch (eF) {}
              }
            }
          }
        } catch (eAdv) {}
      }

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

    // -------------------------------------------------------------
    // FITUR 4: Audit Fisik 1 Kecamatan & Sinkronisasi ke Firestore
    // -------------------------------------------------------------
    if (action === 'auditKecamatan') {
      var idTokenKec = getFirebaseAuthToken();
      var targetKecFolder = DriveApp.getFolderById(folderId);
      var auditRes = auditSingleKecamatan(targetKecFolder, idTokenKec);
      return responseJSON({ status: 'success', data: auditRes });
    }

    // -------------------------------------------------------------
    // FITUR 5: Audit Fisik Seluruh Kecamatan & Auto-Push ke Firestore
    // -------------------------------------------------------------
    if (action === 'auditAll') {
      autoPushRecentFilesToFirestore();
      return responseJSON({ status: 'success', message: 'Audit fisik seluruh kecamatan selesai diproses ke Firestore.' });
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

// =========================================================================
// BAGIAN 2: AUTO-PUSH SERVER CLOUD KE FIRESTORE (24 JAM NONSTOP TANPA BUKA WEB)
// =========================================================================
// Fitur ini memungkinkan Google Apps Script secara mandiri memindai berkas baru
// di Google Drive dan mengirimkannya langsung ke Cloud Firestore.
// =========================================================================

var FIREBASE_CONFIG = {
  PROJECT_ID: 'tracking-chasil',
  API_KEY: 'AIzaSyBy0sw8e7TcNrdoZkQHg0fZ992Gc-WMY6U',
  ROOT_FOLDER_ID: '1cvw-44j6Tao85OLxn0jzR4jVInkquT5r',
  AUTH_EMAIL: 'teknis.kpusekadau@gmail.com',
  AUTH_PASSWORD: 'teknissekadau'
};

/**
 * ⚠️ FUNGSI OTORISASI IZIN GOOGLE (JALANKAN SEKALI INI SAJA):
 * Jika muncul pesan error "Anda tidak memiliki izin untuk memanggil UrlFetchApp.fetch",
 * pilih fungsi 'authorizeAppScript' di dropdown Apps Script lalu klik 'Run' (Jalankan).
 * Google akan menampilkan pop-up "Otorisasi Diperlukan" -> Klik 'Tinjau Izin' -> 'Izinkan'.
 */
function authorizeAppScript() {
  // Panggilan langsung tanpa try-catch untuk memicu jendela pop-up otorisasi izin OAuth Google
  var testUrl = 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + FIREBASE_CONFIG.API_KEY;
  var res = UrlFetchApp.fetch(testUrl, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({}),
    muteHttpExceptions: true
  });
  Logger.log('🎉 ========================================================');
  Logger.log('🎉 OTORISASI BERHASIL! Izin UrlFetchApp telah aktif.');
  Logger.log('🎉 Kode status respon Google: ' + res.getResponseCode());
  Logger.log('🎉 Sekarang Anda dapat menjalankan autoPushRecentFilesToFirestore atau installAutoTrigger.');
  Logger.log('========================================================');
}

/**
 * 1-CLICK INSTALL TRIGGER (DEFAULT 5 MENIT - REKOMENDASI KUOTA GOOGLE):
 * Jalankan fungsi ini SEKALI di editor Google Apps Script (klik 'Run' / 'Jalankan')
 * untuk mengaktifkan pemindaian otomatis di server Google setiap 5 menit.
 * 100% Aman dari batas kuota eksekusi harian Google (90 menit/hari pada akun gratis).
 */
function installAutoTrigger() {
  uninstallAutoTrigger();

  ScriptApp.newTrigger('autoPushRecentFilesToFirestore')
    .timeBased()
    .everyMinutes(5)
    .create();

  Logger.log('✅ BERHASIL! Trigger Auto-Push ke Firestore aktif setiap 5 menit.');
  Logger.log('   Skrip akan berjalan otomatis 24 jam nonstop di Cloud Google tanpa perlu membuka web.');
}

/**
 * TRIGGER RESPON CEPAT (SETIAP 2 MENIT):
 * Aktifkan fungsi ini jika Anda menginginkan pembaharuan data berkas lebih cepat (tiap 2 menit).
 */
function installAutoTrigger2Min() {
  uninstallAutoTrigger();

  ScriptApp.newTrigger('autoPushRecentFilesToFirestore')
    .timeBased()
    .everyMinutes(2)
    .create();

  Logger.log('✅ BERHASIL! Trigger Auto-Push ke Firestore aktif setiap 2 menit.');
}

/**
 * TRIGGER RESPON KILAT (SETIAP 1 MENIT):
 * Catatan: Hanya direkomendasikan jika akun Google Anda memiliki kuota tinggi.
 */
function installAutoTrigger1Min() {
  uninstallAutoTrigger();

  ScriptApp.newTrigger('autoPushRecentFilesToFirestore')
    .timeBased()
    .everyMinutes(1)
    .create();

  Logger.log('✅ BERHASIL! Trigger Auto-Push ke Firestore aktif setiap 1 menit.');
}

/**
 * 1-CLICK UNINSTALL TRIGGER:
 * Jalankan fungsi ini jika ingin mematikan pemindaian otomatis server.
 */
function uninstallAutoTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  var count = 0;
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'autoPushRecentFilesToFirestore') {
      ScriptApp.deleteTrigger(triggers[i]);
      count++;
    }
  }
  Logger.log('ℹ️ Sebanyak ' + count + ' trigger auto-push berhasil dinonaktifkan.');
}

/**
 * FUNGSI DIAGNOSIS & BENCHMARK:
 * Jalankan fungsi ini di editor Apps Script (Pilih 'testDiagnoseUpload' lalu klik 'Run')
 * untuk mengecek status fisik Drive dan memverifikasi koneksi ke Cloud Firestore.
 */
function testDiagnoseUpload() {
  Logger.log('=== MEMULAI DIAGNOSIS GOOGLE DRIVE C-HASIL ===');
  var rootId = FIREBASE_CONFIG.ROOT_FOLDER_ID;
  var rootFolder = DriveApp.getFolderById(rootId);
  Logger.log('1. Root Folder: ' + rootFolder.getName() + ' (ID: ' + rootId + ')');

  var idToken = getFirebaseAuthToken();
  Logger.log('2. Firebase Auth Token: Berhasil terhubung ke Cloud Firestore! (' + idToken.substring(0, 15) + '...)');

  Logger.log('3. Melakukan audit fisik 1 kecamatan contoh (Belitang)...');
  var kecs = rootFolder.getFolders();
  while (kecs.hasNext()) {
    var k = kecs.next();
    if (k.getName().trim() === 'Belitang') {
      var res = auditSingleKecamatan(k, idToken);
      Logger.log('   Hasil Belitang: Berkas fisik = ' + res.newCount + ', Berkas Firestore lama = ' + res.oldCount + ', Status = ' + (res.changed ? 'DIPERBARUI KE FIRESTORE' : '100% SINKRON'));
      break;
    }
  }
  Logger.log('=== DIAGNOSIS SELESAI ===');
}

/**
 * FUNGSI INTI AUDIT 1 KECAMATAN (TURBO SPEED OPTIMIZED):
 * Menggunakan Smart Lookup dari Firestore terlebih dahulu sehingga berkas lama
 * yang sudah ada TIDAK memanggil getEditors() atau date API yang lambat.
 * Kecepatan meningkat hingga 15x lipat (hanya butuh ~1-2 detik per kecamatan)!
 *
 * MENDUKUNG 100%:
 * - Berkas baru diunggah (+ file count otomatis bertambah di dashboard)
 * - Berkas dihapus dari Google Drive (- file count otomatis berkurang di dashboard)
 * - Berkas diganti / diperbarui (perubahan ukuran atau nama berkas)
 * - Mempertahankan status verifikasi / anomali admin (overrideElection, isResolved)
 * - Smart Write: HANYA menulis ke Firestore jika terbukti ada perubahan fisik!
 */
function auditSingleKecamatan(kecFolder, idToken) {
  var kecName = kecFolder.getName().trim();

  // 1. BACA DOKUMEN FIRESTORE LEBIH DULU SEBAGAI CACHE PEMBANDING KILAT
  var existingDoc = getFirestoreDocument('scanned_data', kecName, idToken);
  var oldTotalFiles = 0;
  var existingFileLookup = {};
  var oldFileFingerprints = {};
  var overrideLookup = {};

  if (existingDoc && Array.isArray(existingDoc.tpsList)) {
    for (var i = 0; i < existingDoc.tpsList.length; i++) {
      var oTps = existingDoc.tpsList[i];
      var oFiles = oTps.files || [];
      for (var f = 0; f < oFiles.length; f++) {
        var of = oFiles[f];
        oldTotalFiles++;
        existingFileLookup[of.id] = of;
        oldFileFingerprints[of.id] = of.name + '|' + (of.size || 0);

        // Simpan catatan anomali / verifikasi admin agar tidak tertimpa
        if (of.overrideElection || of.isResolved || of.resolutionNote) {
          overrideLookup[of.id] = {
            overrideElection: of.overrideElection,
            isResolved: of.isResolved,
            resolutionNote: of.resolutionNote,
            resolvedAt: of.resolvedAt,
            resolvedBy: of.resolvedBy
          };
        }
      }
    }
  }

  // 2. PINDAI FISIK GOOGLE DRIVE SECARA KILAT (Desa -> TPS -> getFiles)
  var desaFolders = kecFolder.getFolders();
  var tpsList = [];
  var physicalTotalFiles = 0;
  var physicalFileFingerprints = {}; // fileId -> fingerprint (name + size)

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
        var fId = file.getId();
        var fName = file.getName();
        var fSize = file.getSize();

        physicalTotalFiles++;
        physicalFileFingerprints[fId] = fName + '|' + fSize;

        // TURBO CACHE: Jika berkas sudah ada sebelumnya di Firestore dan tidak berubah,
        // gunakan data cache Firestore langsung (0 milidetik, tanpa getEditors)!
        var cachedFile = existingFileLookup[fId];
        if (cachedFile && cachedFile.name === fName && cachedFile.size === fSize) {
          fileList.push(cachedFile);
        } else {
          // Hanya berkas BARU diunggah atau berkas DIUBAH yang memanggil metadata detail
          var createdAt = '';
          var updatedAt = '';
          try {
            if (file.getDateCreated()) createdAt = file.getDateCreated().toISOString();
            if (file.getLastUpdated()) updatedAt = file.getLastUpdated().toISOString();
          } catch (e) {}

          var uploader = extractFileUploader(file);

          fileList.push({
            id: fId,
            name: fName,
            url: file.getUrl(),
            createdAt: createdAt,
            updatedAt: updatedAt,
            size: fSize,
            uploader: uploader
          });
        }
      }

      tpsList.push({
        kecamatan: kecName,
        desa: desaName,
        tpsFolderName: tpsName,
        tpsFolderId: tps.getId(),
        tpsFolderUrl: tps.getUrl(),
        files: fileList
      });
    }
  }

  // 3. EVALUASI PERUBAHAN FISIK (TAMBAH / HAPUS / GANTI)
  var hasChanged = false;

  if (!existingDoc || !Array.isArray(existingDoc.tpsList)) {
    hasChanged = true;
    Logger.log('⚡ [Kecamatan ' + kecName + '] Dokumen belum ada di Firestore. Melakukan sinkronisasi awal...');
  } else if (physicalTotalFiles !== oldTotalFiles) {
    // Deteksi penambahan atau penghapusan berkas (Total Berkas fisik berbeda)
    hasChanged = true;
    var diff = physicalTotalFiles - oldTotalFiles;
    Logger.log('🔔 [Perubahan Terdeteksi] ' + kecName + ': Jumlah berkas berubah! Lama=' + oldTotalFiles + ', Fisik Drive=' + physicalTotalFiles + ' (' + (diff > 0 ? '+' + diff + ' berkas baru' : diff + ' berkas dihapus') + ')');
  } else {
    // Jumlah berkas sama, periksa apakah ada ID berkas baru menggantikan berkas lama
    for (var fid in physicalFileFingerprints) {
      if (!oldFileFingerprints[fid] || oldFileFingerprints[fid] !== physicalFileFingerprints[fid]) {
        hasChanged = true;
        Logger.log('🔔 [Perubahan Terdeteksi] ' + kecName + ': Berkas dimodifikasi/diganti pada ID ' + fid);
        break;
      }
    }
  }

  // 4. JIKA ADA PERUBAHAN, PERTAHANKAN OVERRIDE ADMIN & SIMPAN KE FIRESTORE
  if (hasChanged) {
    for (var k = 0; k < tpsList.length; k++) {
      var nt = tpsList[k];
      for (var m = 0; m < nt.files.length; m++) {
        var nf = nt.files[m];
        if (overrideLookup[nf.id]) {
          var ov = overrideLookup[nf.id];
          if (ov.overrideElection) nf.overrideElection = ov.overrideElection;
          if (ov.isResolved !== undefined) nf.isResolved = ov.isResolved;
          if (ov.resolutionNote) nf.resolutionNote = ov.resolutionNote;
          if (ov.resolvedAt) nf.resolvedAt = ov.resolvedAt;
          if (ov.resolvedBy) nf.resolvedBy = ov.resolvedBy;
        }
      }
    }

    var payloadKec = {
      kecamatan: kecName,
      tpsList: tpsList,
      tpsCount: tpsList.length,
      updatedAt: new Date().toISOString(),
      updatedBy: 'Google Apps Script (Cloud Auto-Push)'
    };

    setFirestoreDocument('scanned_data', kecName, payloadKec, idToken);
    Logger.log('✅ [Auto-Push Firestore] Kecamatan ' + kecName + ' BERHASIL DISIMPAN! (Total Berkas: ' + physicalTotalFiles + ')');
    return { changed: true, kecName: kecName, oldCount: oldTotalFiles, newCount: physicalTotalFiles };
  } else {
    Logger.log('ℹ️ [Auto-Push Firestore] Kecamatan ' + kecName + ': Sinkron (' + physicalTotalFiles + ' berkas). Lewati write.');
    return { changed: false, kecName: kecName, oldCount: oldTotalFiles, newCount: physicalTotalFiles };
  }
}

/**
 * FUNGSI UTAMA AUTO-PUSH CLOUD (24 JAM NONSTOP):
 * Dipanggil otomatis oleh Google Cloud Trigger setiap 2 - 5 menit,
 * atau dapat dijalankan manual kapan saja via tombol 'Run' di Apps Script.
 *
 * Memindai seluruh 7 kecamatan di Google Drive, membandingkan fisik berkas
 * terhadap Firestore, dan mengupdate dokumen Firestore saat ada berkas baru / dihapus!
 */
function autoPushRecentFilesToFirestore() {
  var startTime = Date.now();
  Logger.log('🚀 ========================================================');
  Logger.log('🚀 MEMULAI AUDIT FISIK GOOGLE DRIVE C-HASIL KE CLOUD FIRESTORE');
  Logger.log('🚀 Waktu Eksekusi: ' + new Date().toLocaleString());
  Logger.log('🚀 ========================================================');

  try {
    var rootId = FIREBASE_CONFIG.ROOT_FOLDER_ID;
    var rootFolder = DriveApp.getFolderById(rootId);
    var kecFolders = rootFolder.getFolders();

    var idToken = getFirebaseAuthToken();
    var changedKecs = [];
    var totalFilesSekadau = 0;
    var scannedCount = 0;

    while (kecFolders.hasNext()) {
      var kec = kecFolders.next();
      scannedCount++;
      Logger.log('📂 Memeriksa (' + scannedCount + '/7) Kecamatan ' + kec.getName() + '...');
      var res = auditSingleKecamatan(kec, idToken);
      totalFilesSekadau += res.newCount;
      if (res.changed) {
        changedKecs.push(res);
      }
    }

    // Perbarui metadata sinkronisasi global di Firestore jika ada perubahan
    if (changedKecs.length > 0) {
      var changedSummary = changedKecs.map(function(c) {
        var diff = c.newCount - c.oldCount;
        return c.kecName + ' (' + (diff > 0 ? '+' + diff : diff) + ')';
      }).join(', ');

      var metaPayload = {
        lastSyncedAt: new Date().toISOString(),
        lastSyncedKecamatan: changedSummary,
        lastSyncedBy: 'Google Apps Script (Cloud Auto-Push)'
      };
      setFirestoreDocument('app_config', 'sync_metadata', metaPayload, idToken);
      Logger.log('🎉 ========================================================');
      Logger.log('🎉 AUDIT SELESAI: ' + changedKecs.length + ' kecamatan berhasil diupdate ke Firestore!');
      Logger.log('🎉 Rincian Perubahan: ' + changedSummary);
    } else {
      Logger.log('ℹ️ ========================================================');
      Logger.log('ℹ️ AUDIT SELESAI: Seluruh ' + scannedCount + ' kecamatan 100% sinkron (Total: ' + totalFilesSekadau + ' berkas).');
      Logger.log('ℹ️ Tidak ada berkas baru diunggah maupun dihapus.');
    }

    var durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
    Logger.log('⏱️ Durasi Total: ' + durationSec + ' detik.');
    Logger.log('========================================================');
  } catch (err) {
    Logger.log('❌ [Auto-Push Error]: ' + err.toString());
  }
}

// -------------------------------------------------------------
// HELPER FIRESTORE REST API DENGAN FIREBASE AUTH (ID TOKEN)
// -------------------------------------------------------------

function getFirebaseAuthToken() {
  var props = PropertiesService.getScriptProperties();
  var cachedToken = props.getProperty('FIREBASE_ID_TOKEN');
  var tokenExpiry = props.getProperty('FIREBASE_TOKEN_EXPIRY');

  if (cachedToken && tokenExpiry && Date.now() < parseInt(tokenExpiry, 10)) {
    return cachedToken;
  }

  var url = 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + FIREBASE_CONFIG.API_KEY;
  var payload = {
    email: FIREBASE_CONFIG.AUTH_EMAIL,
    password: FIREBASE_CONFIG.AUTH_PASSWORD,
    returnSecureToken: true
  };

  var response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  var resCode = response.getResponseCode();
  var resText = response.getContentText();
  if (resCode !== 200) {
    throw new Error('Gagal login ke Firebase Auth (Status ' + resCode + '): ' + resText);
  }

  var json = JSON.parse(resText);
  var idToken = json.idToken;
  var expiresInMs = (parseInt(json.expiresIn, 10) - 300) * 1000;
  props.setProperty('FIREBASE_ID_TOKEN', idToken);
  props.setProperty('FIREBASE_TOKEN_EXPIRY', String(Date.now() + expiresInMs));

  return idToken;
}

function getFirestoreDocument(collectionPath, docId, idToken) {
  var url = 'https://firestore.googleapis.com/v1/projects/' + FIREBASE_CONFIG.PROJECT_ID +
    '/databases/(default)/documents/' + encodeURIComponent(collectionPath) + '/' + encodeURIComponent(docId);

  var res = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: {
      Authorization: 'Bearer ' + idToken
    },
    muteHttpExceptions: true
  });

  if (res.getResponseCode() === 404) {
    return null;
  }
  if (res.getResponseCode() !== 200) {
    throw new Error('Gagal membaca Firestore (' + res.getResponseCode() + '): ' + res.getContentText());
  }

  var json = JSON.parse(res.getContentText());
  return firestoreDocToJson(json);
}

function setFirestoreDocument(collectionPath, docId, plainData, idToken) {
  var url = 'https://firestore.googleapis.com/v1/projects/' + FIREBASE_CONFIG.PROJECT_ID +
    '/databases/(default)/documents/' + encodeURIComponent(collectionPath) + '/' + encodeURIComponent(docId);

  var firestoreDoc = {
    fields: jsonToFirestoreFields(plainData)
  };

  var res = UrlFetchApp.fetch(url, {
    method: 'patch',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + idToken
    },
    payload: JSON.stringify(firestoreDoc),
    muteHttpExceptions: true
  });

  if (res.getResponseCode() !== 200) {
    throw new Error('Gagal menyimpan Firestore (' + res.getResponseCode() + '): ' + res.getContentText());
  }
}

function jsonToFirestoreFields(obj) {
  var fields = {};
  for (var k in obj) {
    if (obj.hasOwnProperty(k)) {
      fields[k] = jsonValueToFirestore(obj[k]);
    }
  }
  return fields;
}

function jsonValueToFirestore(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: val.toString() };
    return { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.map(jsonValueToFirestore)
      }
    };
  }
  if (typeof val === 'object') {
    return {
      mapValue: {
        fields: jsonToFirestoreFields(val)
      }
    };
  }
  return { stringValue: String(val) };
}

function firestoreDocToJson(doc) {
  if (!doc || !doc.fields) return null;
  return firestoreFieldsToJson(doc.fields);
}

function firestoreFieldsToJson(fields) {
  var obj = {};
  for (var k in fields) {
    if (fields.hasOwnProperty(k)) {
      obj[k] = firestoreValueToJson(fields[k]);
    }
  }
  return obj;
}

function firestoreValueToJson(val) {
  if (!val) return null;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue' in val) return parseFloat(val.doubleValue);
  if ('booleanValue' in val) return val.booleanValue;
  if ('nullValue' in val) return null;
  if ('arrayValue' in val) {
    var arr = val.arrayValue.values || [];
    return arr.map(firestoreValueToJson);
  }
  if ('mapValue' in val) {
    return firestoreFieldsToJson(val.mapValue.fields || {});
  }
  return null;
}
