const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const ts = require('typescript');
const script = fs.readFileSync(process.env.GAS_TEST_SOURCE || 'apps-script/scan-misplaced.gs', 'utf8');
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

const ok = page => ({ ok: true, json: async () => ({ status: 'success', mode: 'pdf-batch-v1', data: [], failures: [], checkedFolderIds: [], examinedFiles: 0, nextCursor: '', ...page }) });
test('PDF client follows pages, counts candidates and deduplicates folders', async () => {
  let calls = 0;
  const scan = service(async url => {
    calls++;
    assert.equal(url.searchParams.get('action'), 'scanMisplacedPdf');
    assert.equal(url.searchParams.get('rootFolderId'), 'root');
    return ok({ examinedFiles: 100, checkedFolderIds: ['root', 'desa'], nextCursor: calls === 1 ? 'next' : '' });
  });
  const result = await scan('https://script.google.com/exec', 'root', new AbortController().signal, () => {});
  assert.equal(calls, 2);
  assert.equal(result.examinedFiles, 200);
  assert.equal(result.scannedFolders, 2);
  assert.equal(result.failures.length, 0);
});
test('old deployment is reported as incomplete with update instructions', async () => {
  const scan = service(async () => ({ ok: true, json: async () => ({ status: 'success', data: [] }) }));
  const result = await scan('https://script.google.com/exec', 'root', new AbortController().signal, () => {});
  assert.match(result.failures[0], /Perbarui GAS/);
});
test('cancellation stops requests', async () => {
  const controller = new AbortController(); controller.abort();
  const scan = service(async () => { throw Error('Must not fetch'); });
  await assert.rejects(scan('https://script.google.com/exec', 'root', controller.signal, () => {}));
});
test('repeated cursors and partial page failures cannot report a clean scan', async () => {
  let calls = 0;
  const scan = service(async () => { calls++; return ok({ nextCursor: 'same', failures: ['No access'] }); });
  const result = await scan('https://script.google.com/exec', 'root', new AbortController().signal, () => {});
  assert.equal(calls, 2);
  assert.ok(result.failures.includes('No access'));
  assert.match(result.failures.at(-1), /Token lanjutan berulang/);
});

function batchFixture(pages, metadata) {
  const calls = [];
  const saved = new Map();
  const context = vm.createContext({ Error, Date, Number,
    CacheService: { getScriptCache: () => ({ get: key => saved.get(key), put: (key, value) => saved.set(key, value) }) },
    Utilities: { getUuid: () => 'session-1', base64EncodeWebSafe: text => Buffer.from(text).toString('base64url'),
      base64DecodeWebSafe: text => Buffer.from(text, 'base64url'), newBlob: bytes => ({ getDataAsString: () => bytes.toString() }) },
    ScriptApp: { getOAuthToken: () => 'mock' },
    UrlFetchApp: { fetch: value => {
      const url = new URL(value); calls.push(url);
      const id = decodeURIComponent(url.pathname.split('/').at(-1));
      if (id === 'files') return { getResponseCode: () => 200, getContentText: () => JSON.stringify(pages[url.searchParams.get('pageToken') || 'first']) };
      return { getResponseCode: () => metadata[id] ? 200 : 403, getContentText: () => JSON.stringify(metadata[id]) };
    } }
  });
  vm.runInContext(script + (script.includes('function scanMisplacedPdfPage(') ? '' : '\n' + fs.readFileSync('apps-script/scan-misplaced-pdf.gs', 'utf8')), context);
  return { context, calls };
}
const folderMeta = {
  root: { id: 'root', name: 'Arsip', driveId: 'shared-1', mimeType: 'application/vnd.google-apps.folder', parents: ['shared-1'] },
  kec: { id: 'kec', name: 'Belitang', parents: ['root'] },
  desa: { id: 'desa', name: 'Belitang Satu', parents: ['kec'] },
  tps: { id: 'tps', name: 'TPS 001', parents: ['desa'] },
  external: { id: 'external', name: 'External', parents: [] }
};
test('batch search scopes Shared Drive, excludes normal TPS/outside-root, caches shared ancestors', () => {
  const { context, calls } = batchFixture({ first: { files: [
    { id: '1', name: 'wrong.pdf', parents: ['desa'] },
    { id: '2', name: 'wrong2.pdf', parents: ['desa'] },
    { id: '3', name: 'normal.pdf', parents: ['tps'] },
    { id: '4', name: 'outside.pdf', parents: ['external'] }
  ] } }, folderMeta);
  const result = context.scanMisplacedPdfPage({ rootFolderId: 'root' });
  assert.equal(result.data.length, 2);
  assert.equal(result.examinedFiles, 4);
  assert.equal(result.failures.length, 0);
  assert.equal(result.data[0].path, 'Arsip / Belitang / Belitang Satu');
  const list = calls.find(url => url.pathname.endsWith('/files'));
  assert.equal(list.searchParams.get('driveId'), 'shared-1');
  assert.equal(list.searchParams.get('corpora'), 'drive');
  assert.match(list.searchParams.get('q'), /application\/pdf/);
  assert.equal(calls.filter(url => url.pathname.endsWith('/desa')).length, 1);
});
test('batch cursors follow API pages and reuse metadata cache within session', () => {
  const { context, calls } = batchFixture({ first: { files: [{ id: '1', name: '1.pdf', parents: ['desa'] }], nextPageToken: 'second' },
    second: { files: [{ id: '2', name: '2.pdf', parents: ['desa'] }] } }, folderMeta);
  const first = context.scanMisplacedPdfPage({ rootFolderId: 'root' });
  const second = context.scanMisplacedPdfPage({ rootFolderId: 'root', cursor: first.nextCursor });
  assert.equal(first.data.length + second.data.length, 2);
  assert.equal(second.nextCursor, '');
  assert.equal(calls.filter(url => url.pathname.endsWith('/desa')).length, 1);
  assert.throws(() => context.scanMisplacedPdfPage({ rootFolderId: 'external', cursor: first.nextCursor }), /Cursor/);
});
test('incomplete search fails; unreadable parent is a partial failure', () => {
  const incomplete = batchFixture({ first: { incompleteSearch: true } }, folderMeta);
  assert.throws(() => incomplete.context.scanMisplacedPdfPage({ rootFolderId: 'root' }), /belum lengkap/);
  const denied = batchFixture({ first: { files: [{ id: '1', name: '1.pdf', parents: ['denied'] }] } }, folderMeta);
  const result = denied.context.scanMisplacedPdfPage({ rootFolderId: 'root' });
  assert.equal(result.failures.length, 1);
  assert.equal(result.data.length, 0);
});
test('time budget resumes inside the same API page without dropping PDFs', () => {
  const { context } = batchFixture({ first: { files: [
    { id: '1', name: '1.pdf', parents: ['desa'] },
    { id: '2', name: '2.pdf', parents: ['desa'] }
  ] } }, folderMeta);
  let clock = 0;
  context.Date = { now: () => { clock += 19000; return clock; } };
  const first = context.scanMisplacedPdfPage({ rootFolderId: 'root' });
  assert.equal(first.data.length, 1);
  const second = context.scanMisplacedPdfPage({ rootFolderId: 'root', cursor: first.nextCursor });
  assert.equal(second.data.length, 1);
  assert.notEqual(first.data[0].id, second.data[0].id);
  assert.equal(second.nextCursor, '');
});
test('ordinary shared folders use user corpus without Shared Drive parameters', () => {
  const metadata = { ...folderMeta, root: { ...folderMeta.root, driveId: undefined } };
  const { context, calls } = batchFixture({ first: { files: [] } }, metadata);
  const result = context.scanMisplacedPdfPage({ rootFolderId: 'root' });
  assert.equal(result.scope, 'user-drive');
  const list = calls.find(url => url.pathname.endsWith('/files'));
  assert.equal(list.searchParams.get('corpora'), 'user');
  assert.equal(list.searchParams.has('driveId'), false);
});
