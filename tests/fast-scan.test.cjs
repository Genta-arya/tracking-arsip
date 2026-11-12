const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('apps-script/Kode.gs', 'utf8');
const FOLDER = 'application/vnd.google-apps.folder';
function fixture({ pageSize = 1000, desaCount = 1, driveId = 'shared', failParent, incomplete = false } = {}) {
  const cache = new Map(), calls = [];
  const entries = [
    { id: 'root', name: 'Arsip', mimeType: FOLDER, driveId },
    { id: 'kec', name: 'Sekadau Hilir', mimeType: FOLDER, parents: ['root'] },
    { id: 'rootpdf', name: 'root.pdf', mimeType: 'application/pdf', parents: ['root'] },
    { id: 'kecpdf', name: 'kec.pdf', mimeType: 'application/pdf', parents: ['kec'] },
    { id: 'externalpdf', name: 'external.pdf', mimeType: 'application/pdf', parents: ['outside'] },
    { id: 'note', name: 'note.txt', mimeType: 'text/plain', parents: ['root'] },
    { id: 'shortcut', name: 'shortcut', mimeType: 'application/vnd.google-apps.shortcut', parents: ['root'] }
  ];
  for (let i = 0; i < desaCount; i++) {
    entries.push({ id: `desa${i}`, name: `DESA ${i}`, mimeType: FOLDER, parents: ['kec'] });
    entries.push({ id: `desapdf${i}`, name: `desa${i}.pdf`, mimeType: 'application/pdf', parents: [`desa${i}`] });
    entries.push({ id: `tps${i}`, name: 'TPS 1', mimeType: FOLDER, parents: [`desa${i}`] });
    entries.push({ id: `validpdf${i}`, name: 'normal.pdf', mimeType: 'application/pdf', parents: [`tps${i}`] });
  }
  const context = vm.createContext({ Error, Number, JSON, LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    CacheService: { getScriptCache: () => ({ get: key => cache.get(key) ?? null, put: (key, value) => cache.set(key, value) }) },
    Utilities: { getUuid: () => 'session-1' },
    ScriptApp: { getOAuthToken: () => 'mock' },
    UrlFetchApp: { fetch: value => {
      const url = new URL(value); calls.push(url);
      if (url.pathname.endsWith('/root')) return response(entries[0]);
      assert.ok(url.pathname.endsWith('/files'));
      const q = url.searchParams.get('q');
      const parents = [...q.matchAll(/'([^']+)' in parents/g)].map(match => match[1]);
      assert.ok(parents.length > 0 && parents.length <= 20);
      if (parents.includes(failParent)) return response({}, 403);
      const type = q.match(/mimeType = '([^']+)'/)[1];
      const filtered = entries.filter(file => file.mimeType === type && (file.parents || []).some(id => parents.includes(id)));
      const offset = Number(url.searchParams.get('pageToken') || 0);
      return response({ files: filtered.slice(offset, offset + pageSize),
        nextPageToken: offset + pageSize < filtered.length ? String(offset + pageSize) : undefined,
        incompleteSearch: incomplete });
    } }
  });
  function response(obj, code = 200) { return { getResponseCode: () => code, getContentText: () => JSON.stringify(obj) }; }
  vm.runInContext(source, context);
  return { context, calls, cache };
}
function run(context) {
  let cursor = ''; const pages = [];
  do {
    assert.ok(pages.length < 200, 'must terminate');
    const page = context.scanMisplacedFastPage({ rootFolderId: 'root', cursor });
    pages.push(page); cursor = page.nextCursor;
  } while (cursor);
  return pages;
}
test('fast scan only reports PDFs in root/kecamatan/desa and never searches TPS contents', () => {
  const { context, calls } = fixture();
  const pages = run(context);
  const found = pages.flatMap(page => page.data);
  assert.deepEqual(found.map(file => file.id).sort(), ['desapdf0','kecpdf','rootpdf']);
  assert.equal(found.find(file => file.id === 'desapdf0').path, 'Arsip / Sekadau Hilir / DESA 0');
  assert.equal(pages.at(-1).progress.percent, 100);
  assert.equal(pages.at(-1).progress.totalFolders, 3);
  assert.equal(pages.at(-1).progress.processedFolders, 3);
  assert.ok(calls.every(url => !url.searchParams.get('q')?.includes("'tps")));
  assert.ok(calls.filter(url => url.searchParams.has('q')).every(url => url.searchParams.get('q').includes('in parents')));
});
test('groups many villages into requests and reports exact nondecreasing scan-phase percentages', () => {
  const { context, calls } = fixture({ desaCount: 45 });
  const pages = run(context);
  const progress = pages.filter(page => page.progress.phase !== 'inventory').map(page => page.progress);
  assert.equal(progress[0].percent, 0);
  for (let i=0; i<progress.length; i++) {
    assert.equal(progress[i].percent, Math.floor(progress[i].processedFolders * 100 / 47));
    if (i) assert.ok(progress[i].percent >= progress[i-1].percent);
  }
  assert.equal(progress.at(-1).percent,100);
  const pdfQueries=calls.filter(url => url.searchParams.get('q')?.includes("mimeType = 'application/pdf'"));
  assert.equal(pdfQueries.length,3);
  assert.equal(pages.flatMap(page => page.data).length,47);
});
test('all discovery and PDF pages are processed before locations count as complete', () => {
  const { context } = fixture({ pageSize: 1, desaCount: 2 });
  const pages=run(context);
  assert.equal(new Set(pages.flatMap(page=>page.data).map(file=>file.id)).size,4);
  assert.equal(pages.at(-1).progress.totalFolders,4);
  assert.ok(pages.some(page=>page.data.length && page.progress.percent===0));
});
test('expired cache and cross-root cursors fail explicitly', () => {
  const {context,cache}=fixture();
  const first=context.scanMisplacedFastPage({rootFolderId:'root'});
  assert.throws(()=>context.scanMisplacedFastPage({rootFolderId:'other',cursor:first.nextCursor}),/root/);
  cache.clear();
  assert.throws(()=>context.scanMisplacedFastPage({rootFolderId:'root',cursor:first.nextCursor}),/kedaluwarsa/);
});
test('permission denied and incomplete Drive search cannot report a clean 100%', () => {
  const denied=fixture({failParent:'kec'});
  const first=denied.context.scanMisplacedFastPage({rootFolderId:'root'});
  assert.throws(()=>denied.context.scanMisplacedFastPage({rootFolderId:'root',cursor:first.nextCursor}),/403/);
  const incomplete=fixture({incomplete:true});
  assert.throws(()=>run(incomplete.context),/belum lengkap/);
});
test('works for ordinary shared folders and routes new endpoint with existing router', () => {
  const {context,calls}=fixture({driveId:undefined});
  // Remove configured driveId explicitly (fixture defaults otherwise).
  const realGet=context.misplacedDriveGet;
  context.misplacedDriveGet=(resource,params)=>{const value=realGet(resource,params); if(resource==='files/root') delete value.driveId; return value;};
  context.responseJSON=value=>value;
  const result=context.doGet({parameter:{action:'scanMisplacedFast',rootFolderId:'root'}});
  assert.equal(result.status,'success');
  assert.equal(result.mode,'location-fast-v1');
  assert.equal(calls.find(url=>url.searchParams.has('q')).searchParams.get('corpora'),'user');
});
test('legacy scanKecamatan route remains available alongside incremental scan routes', () => {
  const { context } = fixture();
  context.responseJSON = value => value;
  context.DriveApp = { getFolderById: id => ({ getName: () => 'Sekadau Hilir', getId: () => id }) };
  context.readKecamatanData = folder => [{ kecamatan: folder.getName(), tpsFolderId: 'tps' }];
  const result = context.doGet({ parameter: { action: 'scanKecamatan', folderId: 'kec' } });
  assert.equal(result.status, 'success');
  assert.equal(result.kecamatan, 'Sekadau Hilir');
  assert.equal(result.data[0].tpsFolderId, 'tps');
});
