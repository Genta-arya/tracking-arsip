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
