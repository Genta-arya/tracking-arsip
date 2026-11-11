const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(fetch) {
  const context = vm.createContext({ exports: {}, URL, fetch });
  vm.runInContext(ts.transpileModule(fs.readFileSync('src/services/driveService.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText, context);
  return context.exports.scanKecamatanFolder;
}
const response = data => ({ ok: true, json: async () => ({ status: 'success', data }) });
test('reports progress after each village before the whole scan resolves', async () => {
  const progress = [], calls = [];
  let release;
  const scan = load(async url => {
    const params = new URL(url).searchParams;
    calls.push(params.get('action'));
    assert.equal(params.get('folderId'), 'kec');
    if (params.get('action') === 'listScanDesa') return response([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }]);
    if (params.get('desaId') === 'b') await new Promise(resolve => { release = resolve; });
    return response([{ tpsFolderId: params.get('desaId'), files: [] }]);
  });
  const pending = scan('https://example.com/exec', 'kec', percent => progress.push(percent));
  while (!release) await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(progress, [0, 50]);
  release();
  const result = await pending;
  assert.deepEqual(progress, [0, 50, 100]);
  assert.equal(result.length, 2);
  assert.deepEqual(calls, ['listScanDesa', 'scanDesa', 'scanDesa']);
});
test('a failed village rejects the entire scan instead of returning partial replacement data', async () => {
  const progress = [];
  const scan = load(async url => {
    const params = new URL(url).searchParams;
    if (params.get('action') === 'listScanDesa') return response([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }]);
    if (params.get('desaId') === 'b') return { ok: false, status: 503 };
    return response([{ tpsFolderId: 'a' }]);
  });
  await assert.rejects(scan('https://example.com', 'kec', p => progress.push(p)), /503/);
  assert.deepEqual(progress, [0, 50]);
});
test('empty kecamatan completes and outdated GAS gives deployment instructions', async () => {
  const progress = [];
  const result = await load(async () => response([]))('https://example.com', 'kec', p => progress.push(p));
  assert.equal(result.length, 0);
  assert.deepEqual(progress, [0, 100]);
  await assert.rejects(load(async () => ({ ok: true, json: async () => ({ status: 'error', message: 'Aksi tidak dikenali' }) }))('https://example.com', 'kec'), /Kode.gs.*deploy/);
});
test('legacy kecamatan scan and per-desa scan return the same records, excluding trash', () => {
  const iterator = values => { let i = 0; return { hasNext: () => i < values.length, next: () => values[i++] }; };
  const tps = (id, trashed = false) => ({ getId: () => id, getName: () => id, getUrl: () => id, isTrashed: () => trashed, getFiles: () => iterator([]) });
  const desa = (id, trashed = false) => ({ getName: () => id, isTrashed: () => trashed, getFolders: () => iterator([tps(id), tps('trash', true)]) });
  const villages = [desa('A'), desa('B'), desa('trash', true)];
  const ctx = vm.createContext({});
  vm.runInContext(fs.readFileSync('apps-script/Kode.gs', 'utf8'), ctx);
  const all = ctx.readKecamatanData({ getName: () => 'Kec', getFolders: () => iterator(villages) }, {});
  const split = villages.slice(0, 2).flatMap(v => ctx.readDesaData(v, 'Kec', {}));
  assert.equal(JSON.stringify(all), JSON.stringify(split));
  assert.equal(all.length, 2);
});
