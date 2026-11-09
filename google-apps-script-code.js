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
 * 1-CLICK INSTALL TRIGGER:
 * Jalankan fungsi ini SEKALI di editor Google Apps Script (klik 'Run' / 'Jalankan')
 * untuk mengaktifkan pemindaian otomatis di server Google setiap 1-2 menit.
 */
function installAutoTrigger() {
  uninstallAutoTrigger(); // Bersihkan trigger lama jika ada agar tidak ganda

  // Pasang trigger waktu: Otomatis berjalan setiap 1 menit di Cloud Google
  ScriptApp.newTrigger('autoPushRecentFilesToFirestore')
    .timeBased()
    .everyMinutes(1)
    .create();

  Logger.log('✅ BERHASIL! Trigger Auto-Push ke Firestore aktif. Skrip akan berjalan otomatis setiap 1 menit tanpa perlu membuka web.');
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
 * FUNGSI DIAGNOSIS:
 * Jalankan fungsi ini di editor Apps Script (Pilih 'testDiagnoseUpload' lalu klik 'Run')
 * untuk mengecek apakah Google Apps Script dapat melihat folder dan berkas yang Anda unggah.
 */
function testDiagnoseUpload() {
  Logger.log('=== MEMULAI DIAGNOSIS GOOGLE DRIVE C-HASIL ===');
  var rootId = FIREBASE_CONFIG.ROOT_FOLDER_ID;
  Logger.log('1. ID Root Folder: ' + rootId);
  var rootFolder = DriveApp.getFolderById(rootId);
  Logger.log('2. Nama Root Folder: ' + rootFolder.getName());

  // Cek apakah ada file dalam 12 jam terakhir
  var halfDayAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
  var q = "trashed = false and mimeType != 'application/vnd.google-apps.folder' and modifiedDate > '" + halfDayAgo + "'";
  Logger.log('3. Mencari berkas dalam 12 jam terakhir di folder ini...');

  var files = rootFolder.searchFiles(q);
  var count = 0;
  while (files.hasNext() && count < 10) {
    var f = files.next();
    Logger.log('   -> Berkas ditemukan: ' + f.getName() + ' | Updated: ' + f.getLastUpdated().toISOString());
    count++;
  }
  Logger.log('4. Total berkas 12 jam terakhir ditemukan: ' + count);

  if (count === 0) {
    Logger.log('⚠️ CATATAN: searchFiles() pada Google Shared Drive mengembalikan 0.');
    Logger.log('   Mencoba membaca folder TPS secara langsung (Folder Traversal)...');
    var kecs = rootFolder.getFolders();
    if (kecs.hasNext()) {
      var k = kecs.next();
      Logger.log('   Contoh Kecamatan: ' + k.getName());
      var des = k.getFolders();
      if (des.hasNext()) {
        var d = des.next();
        Logger.log('   Contoh Desa: ' + d.getName());
        var tps = d.getFolders();
        if (tps.hasNext()) {
          var t = tps.next();
          Logger.log('   Contoh TPS: ' + t.getName());
          var tFiles = t.getFiles();
          var fCount = 0;
          while (tFiles.hasNext() && fCount < 5) {
            var tf = tFiles.next();
            Logger.log('   ==> DITEMUKAN BERKAS DI TPS: ' + tf.getName() + ' | Size: ' + tf.getSize() + ' bytes');
            fCount++;
          }
        }
      }
    }
  }
  Logger.log('=== DIAGNOSIS SELESAI ===');
}

/**
 * Fungsi Inti Auto-Push:
 * Dipanggil otomatis oleh Google Cloud Trigger setiap menit.
 */
function autoPushRecentFilesToFirestore() {
  try {
    // 1. Cari berkas yang baru diunggah / dimodifikasi dalam 30 menit terakhir
    var pastIso = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    var query = "trashed = false and mimeType != 'application/vnd.google-apps.folder' and modifiedDate > '" + pastIso + "'";

    var recentFiles = [];
    var seenIds = {};
    var count = 0;

    // 1A. Jika Advanced Drive API aktif, cari di seluruh Shared Drive & My Drive
    try {
      if (typeof Drive !== 'undefined' && Drive.Files && Drive.Files.list) {
        var sharedResp = Drive.Files.list({
          q: query,
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
          corpora: 'allDrives',
          maxResults: 60,
          fields: 'items(id,title,alternateLink,createdDate,modifiedDate,fileSize,owners,lastModifyingUser,parents)'
        });

        if (sharedResp && sharedResp.items && sharedResp.items.length > 0) {
          for (var s = 0; s < sharedResp.items.length; s++) {
            var sItem = sharedResp.items[s];
            var sId = sItem.id;
            if (seenIds[sId]) continue;

            // Dapatkan hirarki parent folder via DriveApp
            try {
              var sFile = DriveApp.getFileById(sId);
              var sParents = sFile.getParents();
              var sTpsFolder = sParents.hasNext() ? sParents.next() : null;
              var sTpsName = sTpsFolder ? sTpsFolder.getName().trim() : '';
              var sTpsId = sTpsFolder ? sTpsFolder.getId() : '';

              var sDesaFolder = (sTpsFolder && sTpsFolder.getParents().hasNext()) ? sTpsFolder.getParents().next() : null;
              var sDesaName = sDesaFolder ? sDesaFolder.getName().trim() : '';

              var sKecFolder = (sDesaFolder && sDesaFolder.getParents().hasNext()) ? sDesaFolder.getParents().next() : null;
              var sKecName = sKecFolder ? sKecFolder.getName().trim() : '';

              if (sTpsName && sDesaName && sKecName) {
                var sUploader = extractFileUploader(sFile);
                seenIds[sId] = true;
                recentFiles.push({
                  file: {
                    id: sId,
                    name: sItem.title || sFile.getName(),
                    url: sItem.alternateLink || sFile.getUrl(),
                    createdAt: sItem.createdDate || '',
                    updatedAt: sItem.modifiedDate || '',
                    size: sItem.fileSize ? parseInt(sItem.fileSize, 10) : sFile.getSize(),
                    uploader: sUploader
                  },
                  tpsFolderName: sTpsName,
                  tpsFolderId: sTpsId,
                  desa: sDesaName,
                  kecamatan: sKecName
                });
                count++;
              }
            } catch (errParent) {}
          }
        }
      }
    } catch (errAdv) {}

    // 1B. Pencarian via Target Root Folder C-Hasil (Mendukung Shared Folder)
    var searchCount = 0;
    try {
      var rootTargetFolder = null;
      if (FIREBASE_CONFIG.ROOT_FOLDER_ID) {
        try {
          rootTargetFolder = DriveApp.getFolderById(FIREBASE_CONFIG.ROOT_FOLDER_ID);
        } catch (eR) {}
      }
      var files = rootTargetFolder ? rootTargetFolder.searchFiles(query) : DriveApp.searchFiles(query);
      while (files.hasNext() && count < 60) {
        var file = files.next();
        searchCount++;
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

        // Abaikan berkas di luar struktur folder TPS -> Desa -> Kecamatan
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
    } catch (errSearch) {
      Logger.log('[Search Error]: ' + errSearch.toString());
    }

    Logger.log('[Auto-Push] Memindai berkas 30 menit terakhir. Ditemukan ' + recentFiles.length + ' berkas C-Hasil.');

    // Jika tidak ada berkas baru: selesai seketika
    if (recentFiles.length === 0) {
      Logger.log('ℹ️ Hasil: Tidak ada berkas baru yang diunggah ke folder TPS dalam 30 menit terakhir.');
      return;
    }

    Logger.log('[Auto-Push Server] Menemukan ' + recentFiles.length + ' berkas baru. Menghubungkan ke Firestore...');

    // 2. Dapatkan Token Autentikasi Firebase
    var idToken = getFirebaseAuthToken();

    // 3. Kelompokkan berkas per kecamatan
    var filesByKec = {};
    for (var i = 0; i < recentFiles.length; i++) {
      var item = recentFiles[i];
      if (!filesByKec[item.kecamatan]) {
        filesByKec[item.kecamatan] = [];
      }
      filesByKec[item.kecamatan].push(item);
    }

    // 4. Update data Firestore per kecamatan yang terpengaruh
    for (var kecName in filesByKec) {
      var kecItems = filesByKec[kecName];
      var existingDoc = getFirestoreDocument('scanned_data', kecName, idToken);
      var tpsList = (existingDoc && Array.isArray(existingDoc.tpsList)) ? existingDoc.tpsList : [];

      var hasChanges = false;
      for (var j = 0; j < kecItems.length; j++) {
        var nItem = kecItems[j];
        var tpsIdx = -1;

        for (var t = 0; t < tpsList.length; t++) {
          if (
            (nItem.tpsFolderId && tpsList[t].tpsFolderId === nItem.tpsFolderId) ||
            (tpsList[t].desa.toLowerCase() === nItem.desa.toLowerCase() &&
             tpsList[t].tpsFolderName.toLowerCase() === nItem.tpsFolderName.toLowerCase())
          ) {
            tpsIdx = t;
            break;
          }
        }

        if (tpsIdx >= 0) {
          var targetTps = tpsList[tpsIdx];
          var existingFiles = targetTps.files || [];
          var fIdx = -1;
          for (var f = 0; f < existingFiles.length; f++) {
            if (existingFiles[f].id === nItem.file.id) {
              fIdx = f;
              break;
            }
          }

          if (fIdx >= 0) {
            if (
              existingFiles[fIdx].updatedAt !== nItem.file.updatedAt ||
              existingFiles[fIdx].name !== nItem.file.name ||
              existingFiles[fIdx].size !== nItem.file.size
            ) {
              existingFiles[fIdx] = nItem.file;
              hasChanges = true;
            }
          } else {
            existingFiles.push(nItem.file);
            hasChanges = true;
          }
          targetTps.files = existingFiles;
        } else {
          tpsList.push({
            kecamatan: kecName,
            desa: nItem.desa,
            tpsFolderName: nItem.tpsFolderName,
            tpsFolderId: nItem.tpsFolderId,
            tpsFolderUrl: '',
            files: [nItem.file]
          });
          hasChanges = true;
        }
      }

      if (hasChanges) {
        var payloadKec = {
          kecamatan: kecName,
          tpsList: tpsList,
          tpsCount: tpsList.length,
          updatedAt: new Date().toISOString(),
          updatedBy: 'Google Apps Script (Cloud Auto-Push)'
        };
        setFirestoreDocument('scanned_data', kecName, payloadKec, idToken);
        Logger.log('[Auto-Push Server] Berhasil memperbarui Kecamatan ' + kecName + ' di Firestore.');
      }
    }

    // Perbarui metadata waktu sinkronisasi global di Firestore
    var metaPayload = {
      lastSyncedAt: new Date().toISOString(),
      lastSyncedKecamatan: Object.keys(filesByKec).join(', '),
      lastSyncedBy: 'Google Apps Script (Cloud Auto-Push)'
    };
    setFirestoreDocument('app_config', 'sync_metadata', metaPayload, idToken);
    Logger.log('[Auto-Push Server] Selesai sinkronisasi seluruh berkas baru ke Firestore!');
  } catch (err) {
    Logger.log('[Auto-Push Server Error]: ' + err.toString());
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
