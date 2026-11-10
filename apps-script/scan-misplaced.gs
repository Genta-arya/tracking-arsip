/**
 * Tambahkan file ini ke proyek Apps Script yang sama dengan Kode.gs.
 * Tambahkan cabang doGet sesuai README.md. Tidak menulis Drive maupun Firestore.
 */
function scanMisplacedFolderPage(params) {
  var rootId = params.rootFolderId;
  var folderId = params.folderId;
  if (!rootId || !folderId) throw new Error('rootFolderId dan folderId wajib disertakan');
  var folder = DriveApp.getFolderById(folderId);
  var path = [];
  var ancestor = folder;
  var visited = {};
  // Verifikasi batas root dari Drive, bukan dari path yang dikirim browser.
  while (ancestor.getId() !== rootId) {
    if (visited[ancestor.getId()] || path.length >= 50) throw new Error('Jalur folder tidak valid atau terlalu dalam');
    visited[ancestor.getId()] = true;
    path.unshift({ id: ancestor.getId(), name: ancestor.getName() });
    var parents = ancestor.getParents();
    if (!parents.hasNext()) throw new Error('Folder berada di luar root arsip');
    ancestor = parents.next();
  }
  var fullPath = [ancestor.getName()].concat(path.map(function (p) { return p.name; })).join(' / ');
  var reason = misplacedFolderReason(path);
  var data = [];
  var children = [];
  var files = !reason || params.filesDone === 'true' ? null :
    (params.fileToken ? DriveApp.continueFileIterator(params.fileToken) : folder.getFiles());
  var folders = params.foldersDone === 'true' ? null :
    (params.folderToken ? DriveApp.continueFolderIterator(params.folderToken) : folder.getFolders());
  var started = Date.now();
  var count = 0;
  while (files && files.hasNext() && count < 100 && Date.now() - started < 15000) {
    var file = files.next();
    assertMisplacedParent(file, folderId);
    count++;
    if (!file.isTrashed() && reason) {
      data.push({ id: file.getId(), name: file.getName(), url: file.getUrl(),
        folderId: folderId, folderUrl: folder.getUrl(), path: fullPath, reason: reason });
    }
  }
  count = 0;
  while (folders && folders.hasNext() && count < 100 && Date.now() - started < 20000) {
    var child = folders.next();
    assertMisplacedParent(child, folderId);
    count++;
    if (!child.isTrashed()) children.push({ id: child.getId(), name: child.getName() });
  }
  var filesDone = !files || !files.hasNext();
  var foldersDone = !folders || !folders.hasNext();
  return { status: 'success', data: data, children: children, path: fullPath,
    filesDone: filesDone, foldersDone: foldersDone,
    fileToken: filesDone ? '' : files.getContinuationToken(),
    folderToken: foldersDone ? '' : folders.getContinuationToken() };
}

function assertMisplacedParent(item, folderId) {
  var parents = item.getParents();
  while (parents.hasNext()) if (parents.next().getId() === folderId) return;
  throw new Error('Token pemindaian tidak sesuai folder; mulai ulang pemindaian');
}

function misplacedFolderReason(path) {
  if (path.length === 0) return 'Berkas langsung di root arsip';
  var kecamatan = ['belitang', 'belitang hilir', 'belitang hulu', 'nanga mahap', 'nanga taman', 'sekadau hilir', 'sekadau hulu'];
  var kec = path[0].name.trim().replace(/\s+/g, ' ').toLowerCase();
  if (kecamatan.indexOf(kec) === -1) return 'Di luar folder kecamatan yang dikenali';
  if (path.length === 1) return 'Berkas langsung di folder kecamatan';
  if (path.length === 2) return 'Berkas di luar folder TPS (langsung di folder desa atau folder perantara)';
  if (!/^TPS[\s._-]*0*[1-9]\d*$/i.test(path[2].name.trim())) return 'Folder tingkat TPS tidak memakai format TPS + nomor';
  if (path.length > 3) return 'Berkas di subfolder tambahan di bawah TPS';
  return '';
}
