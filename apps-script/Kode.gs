// ============================================================================
// C-HASIL ARCHIVE TRACKER — KPU KABUPATEN SEKADAU
//
// GOOGLE DRIVE: READ-ONLY.
// Tidak memindahkan, mengganti nama, atau menghapus berkas/folder Drive.
//
// Auto-push tetap menulis hasil audit ke Firestore.
// scanMisplaced hanya membaca Drive dan mengembalikan hasil ke aplikasi.
//
// KONFIGURASI:
// Isi Project Settings → Script Properties:
// FIREBASE_AUTH_PASSWORD = sandi akun Firebase
//
// Opsional, untuk mengganti konfigurasi default:
// FIREBASE_PROJECT_ID
// FIREBASE_API_KEY
// ROOT_FOLDER_ID
// FIREBASE_AUTH_EMAIL
// ============================================================================

var FIREBASE_CONFIG = {
  PROJECT_ID: 'tracking-chasil',
  API_KEY: 'AIzaSyBy0sw8e7TcNrdoZkQHg0fZ992Gc-WMY6U',
  ROOT_FOLDER_ID: '1cvw-44j6Tao85OLxn0jzR4jVInkquT5r',
  AUTH_EMAIL: 'teknis.kpusekadau@gmail.com'
};

var KECAMATAN_SEKADAU = [
  'Belitang',
  'Belitang Hilir',
  'Belitang Hulu',
  'Nanga Mahap',
  'Nanga Taman',
  'Sekadau Hilir',
  'Sekadau Hulu'
];

// ============================================================================
// ROUTER WEB APP
// ============================================================================

function doGet(e) {
  var params = (e && e.parameter) || {};
  var action = params.action || 'listKecamatan';
  var folderId = params.folderId;

  try {
    if (action === 'scanMisplacedFast') {
      return responseJSON(scanMisplacedFastPage(params));
    }

    if (action === 'scanMisplacedPdf') {
      return responseJSON(scanMisplacedPdfPage(params));
    }

    if (action === 'scanMisplaced') {
      return responseJSON(scanMisplacedFolderPage(params));
    }

    if (action === 'quickScan') {
      return responseJSON(quickScanRecentDriveFiles(params));
    }

    if (action === 'auditAll') {
      var audit = autoPushRecentFilesToFirestore();
      return responseJSON({
        status: 'success',
        message: 'Audit fisik seluruh kecamatan selesai.',
        data: audit
      });
    }

    if (action === 'diagnose') {
      return responseJSON(
        diagnoseDriveFolder(folderId || getConfig('ROOT_FOLDER_ID'))
      );
    }

    if (!folderId) {
      throw new Error('Parameter folderId wajib disertakan');
    }

    if (action === 'listKecamatan') {
      return responseJSON({
        status: 'success',
        data: listKecamatanFolders(folderId)
      });
    }

    if (action === 'scanKecamatan') {
      var kecFolder = DriveApp.getFolderById(folderId);

      return responseJSON({
        status: 'success',
        kecamatan: kecFolder.getName().trim(),
        data: readKecamatanData(kecFolder, {})
      });
    }

    if (action === 'auditKecamatan') {
      return responseJSON({
        status: 'success',
        data: auditSingleKecamatan(
          DriveApp.getFolderById(folderId),
          getFirebaseAuthToken()
        )
      });
    }

    throw new Error('Aksi tidak dikenali: ' + action);
  } catch (err) {
    return responseJSON({
      status: 'error',
      message: errorMessage(err)
    });
  }
}

function responseJSON(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function errorMessage(err) {
  return err && err.message ? err.message : String(err);
}

function getConfig(name) {
  var properties = PropertiesService.getScriptProperties();
  var propertyName = name === 'ROOT_FOLDER_ID'
    ? 'ROOT_FOLDER_ID'
    : 'FIREBASE_' + name;

  var value = properties.getProperty(propertyName);

  if (value) return value.trim();

  return FIREBASE_CONFIG[name] || '';
}

function normalizeFolderName(name) {
  return String(name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function isKnownKecamatan(name) {
  var normalized = normalizeFolderName(name);

  return KECAMATAN_SEKADAU.some(function (item) {
    return normalizeFolderName(item) === normalized;
  });
}

// ============================================================================
// LIST KECAMATAN
// ============================================================================

function listKecamatanFolders(rootId) {
  var root = DriveApp.getFolderById(rootId);
  var folders = root.getFolders();
  var result = [];

  while (folders.hasNext()) {
    var folder = folders.next();

    if (!folder.isTrashed() && isKnownKecamatan(folder.getName())) {
      result.push({
        id: folder.getId(),
        name: folder.getName().trim()
      });
    }
  }

  result.sort(function (a, b) {
    return a.name.localeCompare(b.name);
  });

  return result;
}

// ============================================================================
// METADATA BERKAS
// ============================================================================

function extractFileUploader(file) {
  var uploaderName = '';

  try {
    var owner = file.getOwner();

    if (owner) {
      uploaderName = owner.getName() || owner.getEmail() || '';
    }
  } catch (errOwner) {}

  if (!uploaderName) {
    try {
      if (typeof Drive !== 'undefined' && Drive.Files) {
        var metadata = Drive.Files.get(file.getId(), {
          supportsAllDrives: true,
          fields: 'owners,lastModifyingUser'
        });

        if (metadata.lastModifyingUser) {
          uploaderName =
            metadata.lastModifyingUser.displayName ||
            metadata.lastModifyingUser.emailAddress ||
            '';
        } else if (metadata.owners && metadata.owners.length) {
          uploaderName =
            metadata.owners[0].displayName ||
            metadata.owners[0].emailAddress ||
            '';
        }
      }
    } catch (errAdvanced) {}
  }

  if (!uploaderName) {
    try {
      var editors = file.getEditors();

      if (editors && editors.length) {
        uploaderName =
          editors[0].getName() ||
          editors[0].getEmail() ||
          '';
      }
    } catch (errEditors) {}
  }

  return uploaderName;
}

function readFileMetadata(file, cachedFile) {
  var id = file.getId();
  var name = file.getName();
  var size = file.getSize();
  var updatedAt = '';
  var createdAt = '';

  try {
    var updated = file.getLastUpdated();
    updatedAt = updated ? updated.toISOString() : '';

    var created = file.getDateCreated();
    createdAt = created ? created.toISOString() : '';
  } catch (errDates) {}

  if (
    cachedFile &&
    cachedFile.name === name &&
    Number(cachedFile.size || 0) === Number(size || 0) &&
    cachedFile.updatedAt === updatedAt
  ) {
    return JSON.parse(JSON.stringify(cachedFile));
  }

  var result = {
    id: id,
    name: name,
    url: file.getUrl(),
    createdAt: createdAt,
    updatedAt: updatedAt,
    size: size,
    uploader: extractFileUploader(file)
  };

  preserveFileOverrides(cachedFile, result);

  return result;
}

function preserveFileOverrides(source, target) {
  if (!source) return;

  [
    'overrideElection',
    'isResolved',
    'resolutionNote',
    'resolvedAt',
    'resolvedBy'
  ].forEach(function (key) {
    if (source[key] !== undefined) {
      target[key] = source[key];
    }
  });
}

// ============================================================================
// SCAN KECAMATAN — KOMPATIBEL DENGAN FRONTEND LAMA
// ============================================================================

function readKecamatanData(kecFolder, existingLookup) {
  var result = [];
  var desaFolders = kecFolder.getFolders();
  var kecName = kecFolder.getName().trim();

  while (desaFolders.hasNext()) {
    var desa = desaFolders.next();

    if (desa.isTrashed()) continue;

    var desaName = desa.getName().trim();
    var tpsFolders = desa.getFolders();

    while (tpsFolders.hasNext()) {
      var tps = tpsFolders.next();

      if (tps.isTrashed()) continue;

      var files = tps.getFiles();
      var fileList = [];

      while (files.hasNext()) {
        var file = files.next();

        if (file.isTrashed()) continue;

        fileList.push(
          readFileMetadata(file, existingLookup[file.getId()])
        );
      }

      result.push({
        kecamatan: kecName,
        desa: desaName,
        tpsFolderName: tps.getName().trim(),
        tpsFolderId: tps.getId(),
        tpsFolderUrl: tps.getUrl(),
        files: fileList
      });
    }
  }

  return result;
}

// ============================================================================
// VERIFIKASI PATH DALAM ROOT ARSIP
// ============================================================================

function getArchiveFolderPath(folder, rootId) {
  if (!rootId) {
    throw new Error('Root folder arsip belum dikonfigurasi');
  }

  var path = [];
  var ancestor = folder;
  var visited = {};

  while (ancestor.getId() !== rootId) {
    var ancestorId = ancestor.getId();

    if (visited[ancestorId] || path.length >= 50) {
      throw new Error('Jalur folder tidak valid atau terlalu dalam');
    }

    visited[ancestorId] = true;

    path.unshift({
      id: ancestorId,
      name: ancestor.getName()
    });

    var parents = ancestor.getParents();

    if (!parents.hasNext()) {
      throw new Error('Folder berada di luar root arsip');
    }

    ancestor = parents.next();
  }

  return {
    folders: path,
    rootName: ancestor.getName(),
    fullPath: [ancestor.getName()]
      .concat(path.map(function (item) {
        return item.name;
      }))
      .join(' / ')
  };
}

function assertMisplacedParent(item, folderId) {
  var parents = item.getParents();

  while (parents.hasNext()) {
    if (parents.next().getId() === folderId) return;
  }

  throw new Error(
    'Token pemindaian tidak sesuai folder. Mulai ulang pemindaian.'
  );
}

// ============================================================================
// FITUR BARU: DETEKSI BERKAS TERSESAT
//
// Struktur normal:
// ROOT → KECAMATAN → DESA → TPS 001 → BERKAS
//
// Terdeteksi:
// - Berkas langsung di root.
// - Berkas langsung di kecamatan.
// - Berkas langsung di desa.
// - Berkas di cabang kecamatan yang tidak dikenali.
// - Berkas di folder tingkat TPS dengan nama tidak sesuai.
// - Berkas di subfolder tambahan di bawah TPS.
//
// Audit struktur ini tidak menebak tujuan pemindahan berkas.
// Tidak mengikuti shortcut atau mencari di luar root.
// ============================================================================

function misplacedFolderReason(path) {
  if (path.length === 0) {
    return 'Berkas langsung di root arsip';
  }

  if (!isKnownKecamatan(path[0].name)) {
    return 'Di luar folder kecamatan yang dikenali';
  }

  if (path.length === 1) {
    return 'Berkas langsung di folder kecamatan';
  }

  if (path.length === 2) {
    return 'Berkas di luar folder TPS (langsung di folder desa atau folder perantara)';
  }

  var tpsName = path[2].name.trim();

  if (!/^TPS[\s._-]*0*[1-9]\d*$/i.test(tpsName)) {
    return 'Folder tingkat TPS tidak memakai format TPS + nomor';
  }

  if (path.length > 3) {
    return 'Berkas di subfolder tambahan di bawah TPS';
  }

  return '';
}

/**
 * Satu request membaca satu halaman dari satu folder.
 * Frontend melanjutkan token dan menelusuri children sampai selesai.
 *
 * Maksimal 100 berkas dan 100 subfolder per halaman.
 * Tidak memakai filter tanggal, sehingga berkas lama tetap diperiksa.
 */
function scanMisplacedFolderPage(params) {
  var rootId = params.rootFolderId;
  var folderId = params.folderId;

  if (!rootId || !folderId) {
    throw new Error(
      'rootFolderId dan folderId wajib disertakan'
    );
  }

  var folder = DriveApp.getFolderById(folderId);
  var location = getArchiveFolderPath(folder, rootId);
  var reason = misplacedFolderReason(location.folders);

  var data = [];
  var children = [];

  // Berkas langsung dalam TPS valid tidak perlu dibaca.
  // Subfolder TPS tetap ditelusuri untuk mendeteksi berkas terlalu dalam.
  var files = null;

  if (reason && params.filesDone !== 'true') {
    files = params.fileToken
      ? DriveApp.continueFileIterator(params.fileToken)
      : folder.getFiles();
  }

  var folders = null;

  if (params.foldersDone !== 'true') {
    folders = params.folderToken
      ? DriveApp.continueFolderIterator(params.folderToken)
      : folder.getFolders();
  }

  var started = Date.now();
  var count = 0;

  while (
    files &&
    files.hasNext() &&
    count < 100 &&
    Date.now() - started < 15000
  ) {
    var file = files.next();

    assertMisplacedParent(file, folderId);
    count++;

    if (!file.isTrashed()) {
      data.push({
        id: file.getId(),
        name: file.getName(),
        url: file.getUrl(),
        folderId: folderId,
        folderUrl: folder.getUrl(),
        path: location.fullPath,
        reason: reason
      });
    }
  }

  count = 0;

  while (
    folders &&
    folders.hasNext() &&
    count < 100 &&
    Date.now() - started < 20000
  ) {
    var child = folders.next();

    assertMisplacedParent(child, folderId);
    count++;

    if (!child.isTrashed()) {
      children.push({
        id: child.getId(),
        name: child.getName()
      });
    }
  }

  var filesDone = !files || !files.hasNext();
  var foldersDone = !folders || !folders.hasNext();

  return {
    status: 'success',
    data: data,
    children: children,
    path: location.fullPath,
    filesDone: filesDone,
    foldersDone: foldersDone,
    fileToken: filesDone ? '' : files.getContinuationToken(),
    folderToken: foldersDone ? '' : folders.getContinuationToken()
  };
}

// ============================================================================
// QUICK SCAN
//
// Cari berkas terbaru, lalu verifikasi ancestry terhadap root arsip.
// Berkas di luar struktur TPS tidak dimasukkan ke hitungan TPS.
// ============================================================================

function quickScanRecentDriveFiles(params) {
  var rootId = params.folderId || getConfig('ROOT_FOLDER_ID');

  if (!rootId) {
    throw new Error('Root folder arsip belum dikonfigurasi');
  }

  // Pastikan root dapat dibaca sebelum melakukan pencarian.
  DriveApp.getFolderById(rootId).getName();

  var minutes = parseInt(params.minutes || '60', 10);

  if (!isFinite(minutes) || minutes <= 0) minutes = 60;

  minutes = Math.min(minutes, 1440);

  var pastIso = new Date(
    Date.now() - minutes * 60 * 1000
  ).toISOString();

  var query =
    "trashed = false " +
    "and mimeType != 'application/vnd.google-apps.folder' " +
    "and modifiedDate > '" + pastIso + "'";

  var files = DriveApp.searchFiles(query);
  var result = [];
  var seen = {};
  var examined = 0;
  var started = Date.now();

  while (
    files.hasNext() &&
    result.length < 100 &&
    examined < 1000 &&
    Date.now() - started < 20000
  ) {
    var file = files.next();
    examined++;

    if (seen[file.getId()]) continue;

    var parents = file.getParents();

    while (parents.hasNext()) {
      var tpsFolder = parents.next();
      var location;

      try {
        location = getArchiveFolderPath(tpsFolder, rootId);
      } catch (outsideRoot) {
        continue;
      }

      if (misplacedFolderReason(location.folders)) continue;

      var path = location.folders;

      result.push({
        file: readFileMetadata(file, null),
        tpsFolderName: tpsFolder.getName().trim(),
        tpsFolderId: tpsFolder.getId(),
        desa: path[1].name.trim(),
        kecamatan: path[0].name.trim()
      });

      seen[file.getId()] = true;
      break;
    }
  }

  return {
    status: 'success',
    count: result.length,
    data: result,
    partial: files.hasNext()
  };
}

// ============================================================================
// DIAGNOSIS DRIVE
// ============================================================================

function diagnoseDriveFolder(rootId) {
  var folder = DriveApp.getFolderById(rootId);
  var files = folder.getFiles();
  var sample = [];

  while (files.hasNext() && sample.length < 10) {
    var file = files.next();

    sample.push({
      name: file.getName(),
      id: file.getId(),
      lastUpdated: file.getLastUpdated().toISOString(),
      dateCreated: file.getDateCreated().toISOString()
    });
  }

  return {
    status: 'success',
    rootId: rootId,
    rootName: folder.getName(),
    searchFilesSample: sample
  };
}

// ============================================================================
// FIREBASE AUTH
// ============================================================================

function getFirebaseAuthToken() {
  var props = PropertiesService.getScriptProperties();

  var cachedToken = props.getProperty('FIREBASE_ID_TOKEN');
  var expiry = Number(
    props.getProperty('FIREBASE_TOKEN_EXPIRY') || 0
  );

  if (cachedToken && Date.now() < expiry) {
    return cachedToken;
  }

  var apiKey = getConfig('API_KEY');
  var email = getConfig('AUTH_EMAIL');
  var password = props.getProperty('FIREBASE_AUTH_PASSWORD');

  if (!apiKey || !email || !password) {
    throw new Error(
      'Konfigurasi Firebase belum lengkap. Isi FIREBASE_AUTH_PASSWORD ' +
      'di Project Settings → Script Properties.'
    );
  }

  var url =
    'https://identitytoolkit.googleapis.com/v1/' +
    'accounts:signInWithPassword?key=' +
    encodeURIComponent(apiKey);

  var response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      email: email,
      password: password,
      returnSecureToken: true
    }),
    muteHttpExceptions: true
  });

  if (response.getResponseCode() !== 200) {
    throw new Error(
      'Gagal login Firebase Auth. Status: ' +
      response.getResponseCode()
    );
  }

  var json = JSON.parse(response.getContentText());

  if (!json.idToken) {
    throw new Error('Firebase tidak mengembalikan ID token');
  }

  var validFor = Math.max(
    Number(json.expiresIn || 3600) - 300,
    60
  );

  props.setProperty('FIREBASE_ID_TOKEN', json.idToken);
  props.setProperty(
    'FIREBASE_TOKEN_EXPIRY',
    String(Date.now() + validFor * 1000)
  );

  return json.idToken;
}

function clearFirebaseTokenCache() {
  var props = PropertiesService.getScriptProperties();

  props.deleteProperty('FIREBASE_ID_TOKEN');
  props.deleteProperty('FIREBASE_TOKEN_EXPIRY');

  Logger.log('Cache token Firebase dibersihkan.');
}

function authorizeAppScript() {
  var root = DriveApp.getFolderById(getConfig('ROOT_FOLDER_ID'));

  Logger.log('Akses Drive berhasil: ' + root.getName());

  getFirebaseAuthToken();

  Logger.log('Otorisasi Drive dan Firebase berhasil.');
}

// ============================================================================
// HELPER FIRESTORE REST
// ============================================================================

function firestoreDocumentUrl(collectionPath, docId) {
  var projectId = getConfig('PROJECT_ID');

  if (!projectId) {
    throw new Error('FIREBASE_PROJECT_ID belum dikonfigurasi');
  }

  return (
    'https://firestore.googleapis.com/v1/projects/' +
    encodeURIComponent(projectId) +
    '/databases/(default)/documents/' +
    encodeURIComponent(collectionPath) +
    '/' +
    encodeURIComponent(docId)
  );
}

function getFirestoreDocument(collectionPath, docId, idToken) {
  var response = UrlFetchApp.fetch(
    firestoreDocumentUrl(collectionPath, docId),
    {
      method: 'get',
      headers: {
        Authorization: 'Bearer ' + idToken
      },
      muteHttpExceptions: true
    }
  );

  var code = response.getResponseCode();

  if (code === 404) return null;

  if (code !== 200) {
    throw new Error(
      'Gagal membaca Firestore. Status: ' + code
    );
  }

  return firestoreDocToJson(
    JSON.parse(response.getContentText())
  );
}

function setFirestoreDocument(
  collectionPath,
  docId,
  plainData,
  idToken
) {
  var response = UrlFetchApp.fetch(
    firestoreDocumentUrl(collectionPath, docId),
    {
      method: 'patch',
      contentType: 'application/json',
      headers: {
        Authorization: 'Bearer ' + idToken
      },
      payload: JSON.stringify({
        fields: jsonToFirestoreFields(plainData)
      }),
      muteHttpExceptions: true
    }
  );

  if (response.getResponseCode() !== 200) {
    throw new Error(
      'Gagal menyimpan Firestore. Status: ' +
      response.getResponseCode()
    );
  }
}

function jsonToFirestoreFields(obj) {
  var fields = {};

  Object.keys(obj).forEach(function (key) {
    fields[key] = jsonValueToFirestore(obj[key]);
  });

  return fields;
}

function jsonValueToFirestore(value) {
  if (value === null || value === undefined) {
    return { nullValue: null };
  }

  if (typeof value === 'boolean') {
    return { booleanValue: value };
  }

  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }

  if (typeof value === 'string') {
    return { stringValue: value };
  }

  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map(jsonValueToFirestore)
      }
    };
  }

  if (typeof value === 'object') {
    return {
      mapValue: {
        fields: jsonToFirestoreFields(value)
      }
    };
  }

  return { stringValue: String(value) };
}

function firestoreDocToJson(doc) {
  if (!doc || !doc.fields) return null;

  return firestoreFieldsToJson(doc.fields);
}

function firestoreFieldsToJson(fields) {
  var obj = {};

  Object.keys(fields).forEach(function (key) {
    obj[key] = firestoreValueToJson(fields[key]);
  });

  return obj;
}

function firestoreValueToJson(value) {
  if (!value) return null;

  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('nullValue' in value) return null;

  if ('arrayValue' in value) {
    return (value.arrayValue.values || []).map(
      firestoreValueToJson
    );
  }

  if ('mapValue' in value) {
    return firestoreFieldsToJson(value.mapValue.fields || {});
  }

  return null;
}

// ============================================================================
// AUDIT FISIK KECAMATAN & AUTO-PUSH FIRESTORE
// ============================================================================

function fingerprintTpsList(tpsList) {
  return tpsList.map(function (tps) {
    var files = (tps.files || []).map(function (file) {
      return [
        file.id,
        file.name,
        Number(file.size || 0),
        file.updatedAt || ''
      ];
    });

    files.sort(function (a, b) {
      return String(a[0]).localeCompare(String(b[0]));
    });

    return [
      tps.kecamatan,
      tps.desa,
      tps.tpsFolderId,
      tps.tpsFolderName,
      files
    ];
  }).sort(function (a, b) {
    return String(a[2]).localeCompare(String(b[2]));
  });
}

function countTpsFiles(tpsList) {
  return tpsList.reduce(function (total, tps) {
    return total + (tps.files || []).length;
  }, 0);
}

function auditSingleKecamatan(kecFolder, idToken) {
  var kecName = kecFolder.getName().trim();

  var existing = getFirestoreDocument(
    'scanned_data',
    kecName,
    idToken
  );

  var oldTpsList =
    existing && Array.isArray(existing.tpsList)
      ? existing.tpsList
      : [];

  var lookup = {};

  oldTpsList.forEach(function (tps) {
    (tps.files || []).forEach(function (file) {
      lookup[file.id] = file;
    });
  });

  var newTpsList = readKecamatanData(kecFolder, lookup);
  var oldCount = countTpsFiles(oldTpsList);
  var newCount = countTpsFiles(newTpsList);

  // Sertakan lokasi TPS dalam fingerprint agar perpindahan berkas
  // tetap terdeteksi meskipun total berkas tidak berubah.
  var changed =
    !existing ||
    !Array.isArray(existing.tpsList) ||
    JSON.stringify(fingerprintTpsList(oldTpsList)) !==
      JSON.stringify(fingerprintTpsList(newTpsList));

  if (changed) {
    setFirestoreDocument(
      'scanned_data',
      kecName,
      {
        kecamatan: kecName,
        tpsList: newTpsList,
        tpsCount: newTpsList.length,
        updatedAt: new Date().toISOString(),
        updatedBy: 'Google Apps Script (Cloud Auto-Push)'
      },
      idToken
    );
  }

  Logger.log(
    '[' + kecName + '] ' +
    oldCount + ' → ' + newCount + ' berkas. ' +
    (changed ? 'Firestore diperbarui.' : 'Tidak ada perubahan.')
  );

  return {
    changed: changed,
    kecName: kecName,
    oldCount: oldCount,
    newCount: newCount,
    activeCount: countActiveArchiveFiles(newTpsList)
  };
}

function autoPushRecentFilesToFirestore() {
  var lock = LockService.getScriptLock();

  if (!lock.tryLock(1000)) {
    throw new Error('Audit sebelumnya masih berjalan');
  }

  var started = Date.now();

  try {
    var rootId = getConfig('ROOT_FOLDER_ID');
    var kecFolders = listKecamatanFolders(rootId);
    var token = getFirebaseAuthToken();
    var changed = [];
    var failures = [];
    var totalFiles = 0;
    var totalActiveFiles = 0;
    var completed = 0;

    for (var i = 0; i < kecFolders.length; i++) {
      var kec = kecFolders[i];

      try {
        var result = auditSingleKecamatan(
          DriveApp.getFolderById(kec.id),
          token
        );

        completed++;
        totalFiles += result.newCount;
        totalActiveFiles += result.activeCount;

        if (result.changed) changed.push(result);
      } catch (errKecamatan) {
        failures.push({
          kecamatan: kec.name,
          message: errorMessage(errKecamatan)
        });

        Logger.log(
          'Gagal audit ' + kec.name + ': ' +
          errorMessage(errKecamatan)
        );
      }
    }

    if (changed.length) {
      var summary = changed.map(function (item) {
        var diff = item.newCount - item.oldCount;

        return item.kecName +
          ' (' + (diff > 0 ? '+' : '') + diff + ')';
      }).join(', ');

      mergeFirestoreMetadata(
        {
          lastSyncedAt: new Date().toISOString(),
          lastSyncedKecamatan: summary,
          lastSyncedBy: 'Google Apps Script (Cloud Auto-Push)'
        },
        token
      );
    }

    // Satu snapshot per audit lengkap, termasuk audit tanpa perubahan.
    // Jangan mencatat total parsial ketika salah satu kecamatan gagal.
    if (!failures.length && completed > 0) {
      recordArchiveScanComparison(token, totalActiveFiles, 'Google Apps Script (Audit lengkap)');
    }

    var report = {
      completedKecamatan: completed,
      totalFiles: totalFiles,
      changedKecamatan: changed,
      failures: failures,
      durationSeconds: (Date.now() - started) / 1000
    };

    Logger.log(JSON.stringify(report));

    if (failures.length) {
      throw new Error(
        'Audit belum lengkap. Gagal pada: ' +
        failures.map(function (item) {
          return item.kecamatan;
        }).join(', ') +
        '. Periksa Execution log.'
      );
    }

    return report;
  } finally {
    lock.releaseLock();
  }
}

// ============================================================================
// TRIGGER OTOMATIS
// ============================================================================

function uninstallAutoTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  var removed = 0;

  triggers.forEach(function (trigger) {
    if (
      trigger.getHandlerFunction() ===
      'autoPushRecentFilesToFirestore'
    ) {
      ScriptApp.deleteTrigger(trigger);
      removed++;
    }
  });

  Logger.log(removed + ' trigger auto-push dinonaktifkan.');
}

function installAutoTrigger() {
  installAutoTriggerForMinutes(5);
}

function installAutoTrigger1Min() {
  installAutoTriggerForMinutes(1);
}

function installAutoTrigger2Min() {
  // Apps Script everyMinutes hanya menerima 1, 5, 10, 15, atau 30.
  // Gunakan interval resmi terdekat yang lebih ringan.
  installAutoTriggerForMinutes(5);

  Logger.log(
    'Interval 2 menit tidak didukung Apps Script. ' +
    'Trigger dipasang setiap 5 menit.'
  );
}

function installAutoTriggerForMinutes(minutes) {
  // Verifikasi konfigurasi terlebih dahulu sebelum mengganti trigger.
  getFirebaseAuthToken();
  DriveApp.getFolderById(getConfig('ROOT_FOLDER_ID')).getName();

  // Buat pengganti lebih dulu agar kegagalan pembuatan
  // tidak menghapus trigger lama.
  var replacement = ScriptApp
    .newTrigger('autoPushRecentFilesToFirestore')
    .timeBased()
    .everyMinutes(minutes)
    .create();

  var replacementId = replacement.getUniqueId();

  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (
      trigger.getHandlerFunction() ===
        'autoPushRecentFilesToFirestore' &&
      trigger.getUniqueId() !== replacementId
    ) {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  Logger.log(
    'Trigger auto-push aktif setiap ' + minutes + ' menit.'
  );
}

// ============================================================================
// DIAGNOSIS MANUAL DARI EDITOR APPS SCRIPT
// ============================================================================

function testDiagnoseUpload() {
  var rootId = getConfig('ROOT_FOLDER_ID');
  var root = DriveApp.getFolderById(rootId);

  Logger.log('Root arsip: ' + root.getName());

  var token = getFirebaseAuthToken();

  Logger.log('Firebase Auth berhasil.');

  var kecFolders = listKecamatanFolders(rootId);

  if (!kecFolders.length) {
    throw new Error('Tidak ditemukan folder kecamatan yang dikenali');
  }

  var selected = kecFolders.filter(function (item) {
    return normalizeFolderName(item.name) === 'belitang';
  })[0] || kecFolders[0];

  var result = auditSingleKecamatan(
    DriveApp.getFolderById(selected.id),
    token
  );

  Logger.log(JSON.stringify(result));
}

function testScanMisplacedRoot() {
  var rootId = getConfig('ROOT_FOLDER_ID');

  var result = scanMisplacedFolderPage({
    rootFolderId: rootId,
    folderId: rootId
  });

  Logger.log(JSON.stringify(result));

  Logger.log(
    'Tes ini hanya membaca halaman pertama root. ' +
    'Gunakan tombol Pindai Berkas Tersesat di aplikasi ' +
    'untuk menelusuri seluruh folder.'
  );
}

// ============================================================================
// TAMBAHAN: PEMINDAIAN PDF MASSAL VIA DRIVE API V3
// ============================================================================

/** PDF massal via Drive REST API v3. Lihat README.md untuk cabang doGet. */
function scanMisplacedPdfPage(params) {
  var rootId = params.rootFolderId;
  if (!rootId) throw new Error('rootFolderId wajib disertakan');
  var cursor = params.cursor ? JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(params.cursor)).getDataAsString()) :
    { rootId: rootId, session: Utilities.getUuid(), pageToken: '', offset: 0 };
  if (cursor.rootId !== rootId || !/^[a-zA-Z0-9-]+$/.test(cursor.session) || !Number.isInteger(cursor.offset) || cursor.offset < 0) throw new Error('Cursor tidak valid; mulai ulang scan');
  var cache = CacheService.getScriptCache();
  var local = {};
  function metadata(id) {
    if (local[id]) return local[id];
    var key = 'pdf-folder:' + cursor.session + ':' + id;
    var saved = cache.get(key);
    var value = saved ? JSON.parse(saved) : misplacedDriveGet('files/' + encodeURIComponent(id), {
      supportsAllDrives: true, fields: 'id,name,parents,driveId,mimeType,trashed'
    });
    if (!saved) cache.put(key, JSON.stringify(value), 300);
    local[id] = value;
    return value;
  }
  var root = metadata(rootId);
  if (root.trashed || root.mimeType !== 'application/vnd.google-apps.folder') throw new Error('Root arsip bukan folder aktif');
  var options = {
    q: "trashed = false and mimeType = 'application/pdf'",
    pageSize: 100, spaces: 'drive', supportsAllDrives: true, includeItemsFromAllDrives: true,
    fields: 'nextPageToken,incompleteSearch,files(id,name,parents,webViewLink)',
    corpora: root.driveId ? 'drive' : 'user'
  };
  if (root.driveId) options.driveId = root.driveId;
  if (cursor.pageToken) options.pageToken = cursor.pageToken;
  var page = misplacedDriveGet('files', options);
  if (page.incompleteSearch) throw new Error('Pencarian Drive belum lengkap. Persempit cakupan ke Shared Drive arsip');
  var files = page.files || [];
  if (cursor.offset > files.length) throw new Error('Daftar Drive berubah; mulai ulang scan');
  var data = [], failures = [], checked = {}, examined = 0;
  var started = Date.now();
  var index = cursor.offset;
  for (; index < files.length; index++) {
    if (examined > 0 && Date.now() - started > 18000) break;
    var file = files[index];
    examined++;
    try {
      if (!file.parents || !file.parents.length) throw new Error('Folder induk tidak tersedia');
      var folderId = file.parents[0];
      var id = folderId, path = [], seen = {}, inside = false;
      while (id) {
        if (seen[id] || path.length > 50) throw new Error('Jalur folder tidak valid atau terlalu dalam');
        seen[id] = true;
        if (id === rootId) { inside = true; break; }
        var folder = metadata(id);
        if (folder.trashed) throw new Error('Folder induk berada di trash');
        path.unshift({ id: folder.id, name: folder.name });
        id = folder.parents && folder.parents[0];
      }
      if (!inside) continue;
      checked[rootId] = true;
      path.forEach(function (part) { checked[part.id] = true; });
      var reason = misplacedFolderReason(path);
      if (reason) data.push({ id: file.id, name: file.name,
        url: file.webViewLink || 'https://drive.google.com/file/d/' + encodeURIComponent(file.id) + '/view',
        folderId: folderId, folderUrl: 'https://drive.google.com/drive/folders/' + encodeURIComponent(folderId),
        path: [root.name].concat(path.map(function (part) { return part.name; })).join(' / '), reason: reason });
    } catch (error) {
      failures.push(file.name + ': ' + String(error.message || error));
    }
  }
  var next = null;
  if (index < files.length) next = { rootId: rootId, session: cursor.session, pageToken: cursor.pageToken, offset: index };
  else if (page.nextPageToken) next = { rootId: rootId, session: cursor.session, pageToken: page.nextPageToken, offset: 0 };
  return { status: 'success', mode: 'pdf-batch-v1', data: data, failures: failures,
    examinedFiles: examined, checkedFolderIds: Object.keys(checked),
    scope: root.driveId ? 'shared-drive' : 'user-drive',
    nextCursor: next ? Utilities.base64EncodeWebSafe(JSON.stringify(next)) : '' };
}

function misplacedDriveGet(resource, params) {
  var query = Object.keys(params).map(function (key) {
    return encodeURIComponent(key) + '=' + encodeURIComponent(String(params[key]));
  }).join('&');
  var response = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/' + resource + '?' + query, {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true
  });
  if (response.getResponseCode() !== 200) throw new Error('Drive API HTTP ' + response.getResponseCode() + '. Periksa izin Drive API dan otorisasi Apps Script');
  return JSON.parse(response.getContentText());
}

function testScanMisplacedPdf() {
  var result = scanMisplacedPdfPage({
    rootFolderId: getConfig('ROOT_FOLDER_ID')
  });

  Logger.log(JSON.stringify({
    status: result.status,
    scope: result.scope,
    pdfDiperiksa: result.examinedFiles,
    temuan: result.data,
    kendala: result.failures,
    masihAdaHalaman: Boolean(result.nextCursor)
  }));

  Logger.log(
    'Tes ini hanya memeriksa halaman pertama. ' +
    'Gunakan aplikasi untuk seluruh halaman.'
  );
}

// ============================================================================
// SCAN CEPAT BERKAS TERSESAT: ROOT → KECAMATAN → DESA
// Tidak membaca isi TPS, tidak mengunduh PDF, tidak menulis Drive/Firestore.
// Tahap 1 mendata folder. Tahap 2 memeriksa PDF dengan total lokasi yang tetap.
// ============================================================================

function scanMisplacedFastPage(params) {
  var rootId = params.rootFolderId;

  if (!rootId || !/^[A-Za-z0-9_-]+$/.test(rootId)) {
    throw new Error('rootFolderId tidak valid');
  }

  var session;
  var state;

  if (params.cursor) {
    var match = /^([A-Za-z0-9-]+):(\d+)$/.exec(params.cursor);

    if (!match) {
      throw new Error('Cursor scan tidak valid. Mulai ulang pemindaian.');
    }

    session = match[1];
    state = misplacedFastLoad(session, Number(match[2]));

    if (state.rootId !== rootId) {
      throw new Error('Cursor tidak sesuai root arsip');
    }
  } else {
    var root = misplacedDriveGet('files/' + encodeURIComponent(rootId), {
      supportsAllDrives: true,
      fields: 'id,name,driveId,mimeType,trashed'
    });

    if (root.trashed || root.mimeType !== 'application/vnd.google-apps.folder') {
      throw new Error('Root arsip bukan folder aktif');
    }

    session = Utilities.getUuid();
    state = {
      rootId: rootId,
      driveId: root.driveId || '',
      step: 0,
      phase: 'root',
      token: '',
      index: 0,
      kecamatan: [],
      targets: [{ id: rootId, path: [], fullPath: root.name }]
    };
  }

  var data = [];
  var examined = 0;
  var checked = [];
  var groups;
  var page;
  var inventoryCompleted = false;
  var inventoryProcessed = 0;
  var inventoryTotal = null;

  if (state.phase === 'root') {
    page = misplacedFastList(state, [state.targets[0]], 'application/vnd.google-apps.folder');
    misplacedFastDiscover(state, [state.targets[0]], page.files, true);
    state.token = page.nextPageToken || '';

    if (!state.token) {
      state.phase = 'desa';
      state.index = 0;
      inventoryProcessed = 1;
      inventoryTotal = 1 + state.kecamatan.length;
    }
  } else if (state.phase === 'desa') {
    groups = state.kecamatan.slice(state.index, state.index + 20);

    if (groups.length) {
      page = misplacedFastList(state, groups, 'application/vnd.google-apps.folder');
      misplacedFastDiscover(state, groups, page.files, false);
      state.token = page.nextPageToken || '';

      if (!state.token) {
        state.index += groups.length;
      }
    }

    inventoryProcessed = 1 + state.index;
    inventoryTotal = 1 + state.kecamatan.length;

    if (state.index >= state.kecamatan.length) {
      inventoryCompleted = true;
    }
  } else if (state.phase === 'pdf') {
    groups = state.targets.slice(state.index, state.index + 20);
    page = misplacedFastList(state, groups, 'application/pdf');
    var parents = {};

    groups.forEach(function (target) {
      parents[target.id] = target;
    });

    page.files.forEach(function (file) {
      examined++;
      var parentId = (file.parents || []).filter(function (id) {
        return Boolean(parents[id]);
      })[0];

      if (!parentId) {
        throw new Error('Respons Drive memuat PDF di luar kelompok folder. Pindai ulang.');
      }

      var target = parents[parentId];
      var reason = misplacedFolderReason(target.path);

      data.push({
        id: file.id,
        name: file.name,
        url: file.webViewLink || 'https://drive.google.com/file/d/' + encodeURIComponent(file.id) + '/view',
        folderId: parentId,
        folderUrl: 'https://drive.google.com/drive/folders/' + encodeURIComponent(parentId),
        path: target.fullPath,
        reason: reason || 'PDF berada di luar folder TPS'
      });
    });

    state.token = page.nextPageToken || '';

    if (!state.token) {
      checked = groups.map(function (target) { return target.id; });
      state.index += groups.length;
    }
  }

  if (inventoryCompleted || (state.phase === 'desa' && !state.kecamatan.length)) {
    state.phase = 'pdf';
    state.index = 0;
    state.token = '';
  }

  var done = state.phase === 'pdf' && state.index >= state.targets.length;
  var progress;

  if (state.phase === 'pdf') {
    progress = {
      phase: done ? 'done' : 'scan',
      processedFolders: state.index,
      totalFolders: state.targets.length,
      percent: Math.floor(state.index * 100 / state.targets.length)
    };
  } else {
    progress = {
      phase: 'inventory',
      processedFolders: inventoryProcessed,
      totalFolders: inventoryTotal,
      percent: inventoryTotal === null ? null : Math.floor(inventoryProcessed * 100 / inventoryTotal)
    };
  }

  state.step++;
  var nextCursor = '';

  if (!done) {
    misplacedFastSave(session, state);
    nextCursor = session + ':' + state.step;
  }

  return {
    status: 'success',
    mode: 'location-fast-v1',
    data: data,
    failures: [],
    examinedFiles: examined,
    checkedFolderIds: checked,
    progress: progress,
    nextCursor: nextCursor
  };
}

// Beberapa folder diperiksa dalam satu pencarian, dibatasi oleh ID parent.
// Tidak ada pencarian PDF global di seluruh akun atau seluruh Shared Drive.
function misplacedFastList(state, groups, mimeType) {
  if (!groups.length) {
    return { files: [] };
  }

  var parentQuery = groups.map(function (target) {
    if (!/^[A-Za-z0-9_-]+$/.test(target.id)) {
      throw new Error('ID folder tidak valid');
    }
    return "'" + target.id + "' in parents";
  }).join(' or ');

  var options = {
    q: "trashed = false and mimeType = '" + mimeType + "' and (" + parentQuery + ')',
    pageSize: 1000,
    spaces: 'drive',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    fields: 'nextPageToken,incompleteSearch,files(id,name,parents,webViewLink)',
    corpora: state.driveId ? 'drive' : 'user'
  };

  if (state.driveId) {
    options.driveId = state.driveId;
  }

  if (state.token) {
    options.pageToken = state.token;
  }

  var page = misplacedDriveGet('files', options);

  if (state.token && page.nextPageToken === state.token) {
    throw new Error('Token halaman Drive berulang. Mulai ulang pemindaian.');
  }

  if (page.incompleteSearch) {
    throw new Error('Drive mengembalikan pencarian belum lengkap. Mulai ulang pemindaian.');
  }

  if (!Array.isArray(page.files)) {
    page.files = [];
  }

  return page;
}

// Hanya mendata dua tingkat folder di bawah root. Folder TPS tidak dibuka.
// Folder dengan nama tidak dikenal pada tingkat tersebut tetap diperiksa.
function misplacedFastDiscover(state, groups, files, isKecamatan) {
  var parents = {};
  var known = {};

  groups.forEach(function (target) { parents[target.id] = target; });
  state.targets.forEach(function (target) { known[target.id] = true; });

  files.forEach(function (file) {
    if (known[file.id]) {
      return;
    }

    var parentId = (file.parents || []).filter(function (id) {
      return Boolean(parents[id]);
    })[0];

    if (!parentId) {
      throw new Error('Respons folder berada di luar kelompok parent. Mulai ulang scan.');
    }

    var parent = parents[parentId];
    var target = {
      id: file.id,
      path: parent.path.concat([{ id: file.id, name: file.name }]),
      fullPath: parent.fullPath + ' / ' + file.name
    };

    state.targets.push(target);
    known[file.id] = true;

    if (isKecamatan) {
      state.kecamatan.push(target);
    }
  });
}

// Simpan sesi sementara dalam potongan kecil agar tidak melewati batas cache.
// Jika cache terhapus/kedaluwarsa, scan harus diulang; tidak dilaporkan sukses.
function misplacedFastSave(session, state) {
  var cache = CacheService.getScriptCache();
  var prefix = 'fast-scan:' + session + ':' + state.step;
  var text = JSON.stringify(state);
  var size = 12000;
  var parts = Math.ceil(text.length / size);

  if (parts > 40) {
    throw new Error('Daftar lokasi terlalu besar untuk sesi ini. Pilih root arsip yang lebih kecil.');
  }

  for (var i = 0; i < parts; i++) {
    cache.put(prefix + ':' + i, text.slice(i * size, (i + 1) * size), 1200);
  }

  cache.put(prefix + ':parts', String(parts), 1200);
}

function misplacedFastLoad(session, step) {
  var cache = CacheService.getScriptCache();
  var prefix = 'fast-scan:' + session + ':' + step;
  var count = Number(cache.get(prefix + ':parts'));

  if (!Number.isInteger(count) || count < 1 || count > 40) {
    throw new Error('Sesi scan kedaluwarsa atau cache terhapus. Mulai ulang pemindaian.');
  }

  var text = '';

  for (var i = 0; i < count; i++) {
    var part = cache.get(prefix + ':' + i);

    if (part === null || part === undefined) {
      throw new Error('Sesi scan tidak lengkap. Mulai ulang pemindaian.');
    }

    text += part;
  }

  return JSON.parse(text);
}

function testScanMisplacedFast() {
  var result = scanMisplacedFastPage({
    rootFolderId: getConfig('ROOT_FOLDER_ID')
  });

  Logger.log(JSON.stringify(result));
  Logger.log('Tes halaman pertama saja. Gunakan aplikasi untuk melanjutkan pendataan dan scan sampai 100%.');
}

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
