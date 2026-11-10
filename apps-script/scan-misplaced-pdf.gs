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
