// ============================================================================
// RIWAYAT DUA HASIL SCAN TOTAL ARSIP (BERKAS AKTIF, BUKAN HAPUS/IGNORE)
// Hanya menulis field archiveComparison pada app_config/sync_metadata.
// lastSyncedAt tetap berarti terakhir data berubah; bukan heartbeat audit.
// ============================================================================

function countActiveArchiveFiles(tpsList) {
  return tpsList.reduce(function (total, tps) {
    return total + (tps.files || []).filter(function (file) {
      return file.overrideElection !== 'HAPUS' && file.overrideElection !== 'IGNORE';
    }).length;
  }, 0);
}

// Update metadata secara merge agar tidak menghapus riwayat perbandingan.
function mergeFirestoreMetadata(plainData, idToken) {
  var mask = Object.keys(plainData).map(function (key) {
    return 'updateMask.fieldPaths=' + encodeURIComponent(key);
  }).join('&');

  var response = UrlFetchApp.fetch(
    firestoreDocumentUrl('app_config', 'sync_metadata') + '?' + mask,
    {
      method: 'patch',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + idToken },
      payload: JSON.stringify({ fields: jsonToFirestoreFields(plainData) }),
      muteHttpExceptions: true
    }
  );

  if (response.getResponseCode() !== 200) {
    throw new Error('Gagal memperbarui metadata Firestore. Status: ' + response.getResponseCode());
  }
}

// Precondition updateTime mencegah dua penulis memakai baseline lama bersamaan.
// Konflik dengan scan manual/browser dibaca ulang sebelum mencoba lagi.
function recordArchiveScanComparison(idToken, totalActiveFiles, source) {
  var url = firestoreDocumentUrl('app_config', 'sync_metadata');
  var rootFolderId = getConfig('ROOT_FOLDER_ID');

  for (var attempt = 0; attempt < 3; attempt++) {
    var existingResponse = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: { Authorization: 'Bearer ' + idToken },
      muteHttpExceptions: true
    });

    var code = existingResponse.getResponseCode();

    if (code !== 200 && code !== 404) {
      throw new Error('Gagal membaca riwayat scan. Status: ' + code);
    }

    var document = code === 200 ? JSON.parse(existingResponse.getContentText()) : null;
    var data = document ? firestoreDocToJson(document) : null;
    var previous = data && data.archiveComparison && data.archiveComparison.current;

    if (!previous || previous.metric !== 'active-files-v1' || previous.rootFolderId !== rootFolderId ||
      !Number.isInteger(previous.total) || previous.total < 0 ||
      typeof previous.at !== 'string' || isNaN(new Date(previous.at).getTime())) {
      previous = null;
    }

    var comparison = {
      current: {
        total: totalActiveFiles,
        at: new Date().toISOString(),
        source: source,
        rootFolderId: rootFolderId,
        metric: 'active-files-v1'
      },
      previous: previous
    };

    var precondition = document
      ? '&currentDocument.updateTime=' + encodeURIComponent(document.updateTime)
      : '&currentDocument.exists=false';

    var response = UrlFetchApp.fetch(url + '?updateMask.fieldPaths=archiveComparison' + precondition, {
      method: 'patch',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + idToken },
      payload: JSON.stringify({ fields: { archiveComparison: jsonValueToFirestore(comparison) } }),
      muteHttpExceptions: true
    });

    if (response.getResponseCode() === 200) {
      return comparison;
    }

    if (response.getResponseCode() !== 409 && response.getResponseCode() !== 412) {
      throw new Error('Gagal mencatat riwayat scan. Status: ' + response.getResponseCode());
    }
  }

  throw new Error('Riwayat scan sedang diperbarui proses lain. Coba audit berikutnya.');
}
