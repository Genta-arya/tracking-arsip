const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const ts = require('typescript');
const script = fs.readFileSync('apps-script/scan-misplaced.gs', 'utf8');
function iterator(items, offset = 0) {
  return { hasNext: () => offset < items.length, next: () => items[offset++], getContinuationToken: () => String(offset) };
}
function fixture() {
  const folders = {};
  function folder(id, name, parent) {
    const entry = { getId: () => id, getName: () => name, getUrl: () => `https://drive.google.com/drive/folders/${id}`,
      getParents: () => iterator(parent ? [parent] : []), getFiles: () => iterator(entry.files),
      getFolders: () => iterator(entry.children), isTrashed: () => false, files: [], children: [] };
    folders[id] = entry;
    if (parent) parent.children.push(entry);
    return entry;
  }
  const root = folder('root', 'Arsip');
  const kec = folder('kec', 'Belitang', root);
  const desa = folder('desa', 'Belitang Satu', kec);
  const tps = folder('tps', 'TPS 001', desa);
  const nested = folder('nested', 'Tambahan', tps);
  const bad = folder('bad', 'Lainnya', root);
  function file(parent, id) {
    const entry = { getId: () => id, getName: () => `${id}.pdf`, getUrl: () => `https://drive.google.com/file/d/${id}/view`,
      getParents: () => iterator([parent]), isTrashed: () => false };
    parent.files.push(entry);
    return entry;
  }
  [root, kec, desa, tps, nested, bad].forEach((f, i) => file(f, String(i)));
  const context = vm.createContext({ DriveApp: { getFolderById: id => { if (!folders[id]) throw Error('Forbidden'); return folders[id]; },
    continueFileIterator: token => iterator(root.files, Number(token)),
    continueFolderIterator: token => iterator(root.children, Number(token)) } });
  vm.runInContext(script, context);
  return { context, root, kec, desa, tps, nested, bad, folder, file };
}
test('reports root, kecamatan, desa, unknown branches and extra TPS subfolders with full paths', () => {
  const { context } = fixture();
  for (const id of ['root', 'kec', 'desa', 'nested', 'bad']) {
    const result = context.scanMisplacedFolderPage({ rootFolderId: 'root', folderId: id });
    assert.equal(result.data.length, 1);
    assert.ok(result.data[0].reason);
    assert.ok(result.data[0].path.startsWith('Arsip'));
  }
  assert.equal(context.scanMisplacedFolderPage({ rootFolderId: 'root', folderId: 'tps' }).data.length, 0);
});
test('rejects folders outside archive root and invalid TPS names', () => {
  const { context, folder } = fixture();
  folder('outside', 'External');
  assert.throws(() => context.scanMisplacedFolderPage({ rootFolderId: 'root', folderId: 'outside' }), /luar root/);
  assert.ok(context.misplacedFolderReason([{ name: 'Belitang' }, { name: 'Desa' }, { name: 'Dokumen' }]));
  assert.equal(context.misplacedFolderReason([{ name: ' BELITANG  HILIR ' }, { name: 'Desa' }, { name: 'TPS_01' }]), '');
});
test('paginates large folders without dropping files or repeating subfolders', () => {
  const { context, root, file } = fixture();
  for (let i = 1; i < 205; i++) file(root, `large-${i}`);
  let params = { rootFolderId: 'root', folderId: 'root' };
  const found = []; const children = [];
  do {
    const page = context.scanMisplacedFolderPage(params);
    found.push(...page.data); children.push(...page.children);
    params = { ...params, filesDone: String(page.filesDone), foldersDone: String(page.foldersDone), fileToken: page.fileToken };
  } while (params.filesDone !== 'true' || params.foldersDone !== 'true');
  assert.equal(found.length, 205);
  assert.equal(new Set(found.map(f => f.id)).size, 205);
  assert.equal(children.length, 2);
});
function service(fetch) {
  const context = vm.createContext({ exports: {}, URL, fetch, Error });
  vm.runInContext(ts.transpileModule(fs.readFileSync('src/services/driveService.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText, context);
  return context.exports.scanMisplacedFiles;
}
const ok = page => ({ ok: true, json: async () => ({ status: 'success', data: [], children: [], filesDone: true, foldersDone: true, ...page }) });
test('client follows pagination, deduplicates folders and marks permission failures as incomplete', async () => {
  const calls = [];
  const scan = service(async url => {
    calls.push(url);
    const id = url.searchParams.get('folderId');
    if (id === 'bad') throw Error('Access denied');
    if (id === 'root' && !url.searchParams.get('fileToken')) return ok({ filesDone: false, fileToken: 'next', children: [{ id: 'bad', name: 'Private' }] });
    return ok({ children: [{ id: 'bad', name: 'Private' }] });
  });
  const result = await scan('https://script.google.com/exec', 'root', new AbortController().signal, () => {});
  assert.equal(calls.length, 3);
  assert.equal(result.scannedFolders, 1);
  assert.match(result.failures[0], /Private: Access denied/);
});
test('old deployment does not falsely report a clean scan', async () => {
  const scan = service(async () => ok({ data: [], children: undefined }));
  const result = await scan('https://script.google.com/exec', 'root', new AbortController().signal, () => {});
  assert.equal(result.failures.length, 1);
  assert.equal(result.scannedFolders, 0);
});
test('cancellation stops requests', async () => {
  const controller = new AbortController(); controller.abort();
  const scan = service(async () => { throw Error('Must not fetch'); });
  await assert.rejects(scan('https://script.google.com/exec', 'root', controller.signal, () => {}));
});

test('paginates more than 100 child folders without skipping branches', () => {
  const { context, root, folder } = fixture();
  for (let i = 0; i < 203; i++) folder(`branch-${i}`, `Branch ${i}`, root);
  let params = { rootFolderId: 'root', folderId: 'root' };
  const children = [];
  do {
    const page = context.scanMisplacedFolderPage(params);
    children.push(...page.children);
    params = { ...params, filesDone: String(page.filesDone), foldersDone: String(page.foldersDone),
      fileToken: page.fileToken, folderToken: page.folderToken };
  } while (params.filesDone !== 'true' || params.foldersDone !== 'true');
  assert.equal(children.length, 205);
  assert.equal(new Set(children.map(child => child.id)).size, 205);
});
test('repeated continuation tokens stop instead of looping indefinitely', async () => {
  let requests = 0;
  const scan = service(async () => { requests++; return ok({ filesDone: false, fileToken: 'same' }); });
  const result = await scan('https://script.google.com/exec', 'root', new AbortController().signal, () => {});
  assert.equal(requests, 2);
  assert.equal(result.scannedFolders, 0);
  assert.match(result.failures[0], /Token lanjutan berulang/);
});
