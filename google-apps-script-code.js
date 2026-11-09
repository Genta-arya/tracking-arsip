// =========================================================================
// KODE GOOGLE APPS SCRIPT KPU KABUPATEN SEKADAU (C-HASIL ARCHIVE TRACKER)
// VERSI DILENGKAPI SMART QUICK-SCAN (DETEKSI CEPAT BERKAS CAMSCANNER)
// =========================================================================
// Panduan Pasang:
// 1. Buka https://script.google.com -> Buka proyek script KPU Anda.
// 2. Ganti seluruh isi Kode.gs dengan kode di bawah ini.
// 3. Klik Deploy -> Manage Deployments -> Klik ikon Pensil (Edit) -> Version: New Version -> Klik Deploy.
// =========================================================================

function doGet(e) {
  var action = e.parameter.action || 'listKecamatan';
  var folderId = e.parameter.folderId;
  
  if (!folderId && action !== 'quickScan') {
    return responseJSON({ status: 'error', message: 'Parameter folderId wajib diisi' });
  }

  try {
    // -------------------------------------------------------------
    // FITUR 1: Smart Quick-Scan (Deteksi Kilat Berkas Baru 1-2 Detik)
    // -------------------------------------------------------------
    if (action === 'quickScan') {
      var mins = parseInt(e.parameter.minutes || '25', 10);
      var pastIso = new Date(Date.now() - mins * 60 * 1000).toISOString();
      var query = "trashed = false and mimeType != 'application/vnd.google-apps.folder' and modifiedDate > '" + pastIso + "'";
      
      var files = DriveApp.searchFiles(query);
      var recentFiles = [];
      var count = 0;
      
      while (files.hasNext() && count < 100) {
        var file = files.next();
        var parents = file.getParents();
        var tpsFolder = parents.hasNext() ? parents.next() : null;
        var tpsName = tpsFolder ? tpsFolder.getName() : '';
        var tpsId = tpsFolder ? tpsFolder.getId() : '';
        
        var desaFolder = (tpsFolder && tpsFolder.getParents().hasNext()) ? tpsFolder.getParents().next() : null;
        var desaName = desaFolder ? desaFolder.getName() : '';
        
        var kecFolder = (desaFolder && desaFolder.getParents().hasNext()) ? desaFolder.getParents().next() : null;
        var kecName = kecFolder ? kecFolder.getName() : '';
        
        var uploaderName = '';
        try {
          var owner = file.getOwner();
          if (owner) uploaderName = owner.getName() || owner.getEmail() || '';
        } catch (uErr) {}

        recentFiles.push({
          file: {
            id: file.getId(),
            name: file.getName(),
            url: file.getUrl(),
            createdAt: file.getDateCreated() ? file.getDateCreated().toISOString() : '',
            updatedAt: file.getLastUpdated() ? file.getLastUpdated().toISOString() : '',
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
        kecamatanList.push({ id: kec.getId(), name: kec.getName() });
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
        var tpsFolders = desa.getFolders();
        
        while (tpsFolders.hasNext()) {
          var tps = tpsFolders.next();
          var files = tps.getFiles();
          var fileList = [];
          
          while (files.hasNext()) {
            var file = files.next();
            
            var uploaderName = '';
            try {
              var owner = file.getOwner();
              if (owner) {
                uploaderName = owner.getName() || owner.getEmail() || '';
              }
            } catch (err) {}

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
