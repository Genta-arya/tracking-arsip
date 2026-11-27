const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

test('saveKecamatanScanToFirestore preserves existing Firestore pageCount when incoming scan omits pageCount', async () => {
  const firebaseSource = fs.readFileSync('src/services/firebase.ts', 'utf8');
  const slice = firebaseSource.slice(
    firebaseSource.indexOf('export async function saveKecamatanScanToFirestore'),
    firebaseSource.indexOf('export function subscribeRealtimeScannedData')
  );
  const compiled = ts.transpileModule(slice, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;

  const existingKecDoc = {
    tpsList: [
      {
        kecamatan: 'Sekadau Hulu',
        desa: 'SUNSONG',
        tpsFolderName: 'TPS 1',
        tpsFolderId: 'tps-1',
        tpsFolderUrl: '',
        files: [{ id: 'f1', name: 'scan.pdf', url: 'https://drive.google.com/file/d/f1/view', pageCount: 20 }]
      }
    ]
  };
  const writes = [];
  const ctx = vm.createContext({
    exports: {},
    Date,
    JSON,
    Map,
    Array,
    Error,
    Promise,
    auth: { currentUser: { email: 'teknis.kpusekadau@gmail.com' } },
    db: {},
    DEFAULT_AUTH_EMAIL: 'staff',
    doc: (_db, col, id) => `${col}/${id}`,
    runTransaction: async (_db, handler) =>
      handler({
        get: async (path) => ({
          data: () => (path === 'app_config/drive_scan_lock' ? { active: true, token: 'tok' } : existingKecDoc)
        }),
        set: (ref, data) => writes.push({ ref, data })
      })
  });
  vm.runInContext(compiled, ctx);

  await ctx.exports.saveKecamatanScanToFirestore(
    'Sekadau Hulu',
    [
      {
        kecamatan: 'Sekadau Hulu',
        desa: 'SUNSONG',
        tpsFolderName: 'TPS 1',
        tpsFolderId: 'tps-1',
        tpsFolderUrl: '',
        files: [{ id: 'f1', name: 'scan.pdf', url: 'https://drive.google.com/file/d/f1/view' }]
      }
    ],
    'tok'
  );

  const saved = writes.find((w) => w.ref === 'scanned_data/Sekadau Hulu');
  assert.ok(saved);
  assert.equal(saved.data.tpsList[0].files[0].pageCount, 20);
});

test('Kode.gs preserveFileOverrides preserves pageCount alongside anomaly overrides', () => {
  const ctx = vm.createContext({});
  vm.runInContext(fs.readFileSync('apps-script/Kode.gs', 'utf8'), ctx);
  const target = { id: 'f1', name: 'new.pdf' };
  ctx.preserveFileOverrides({ id: 'f1', pageCount: 20, overrideElection: 'DPD', isResolved: true }, target);
  assert.equal(target.pageCount, 20);
  assert.equal(target.overrideElection, 'DPD');
});

test('mergeScannedKecamatanState preserves pageCount across full Drive rescan', () => {
  const raw = fs.readFileSync('src/services/driveSyncEngine.ts', 'utf8').replace(/\r\n/g, '\n');
  const start = raw.indexOf('export function buildPageCountLookup');
  const end = raw.indexOf('/**\n * Mesin inti');
  const slice = raw.slice(start, end);
  const compiled = ts.transpileModule(slice, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;

  const deleted = [];
  const ctx = vm.createContext({
    exports: {},
    Map,
    deleteFileOverride: async (id) => deleted.push(id),
  });
  vm.runInContext(compiled, ctx);

  const existing = [
    {
      kecamatan: 'Sekadau Hulu',
      desa: 'SUNSONG',
      tpsFolderName: 'TPS 1',
      tpsFolderId: 't1',
      tpsFolderUrl: '',
      files: [{ id: 'f1', name: 'scan.pdf', url: 'u1', pageCount: 20 }]
    }
  ];
  const scanned = [
    {
      kecamatan: 'Sekadau Hulu',
      desa: 'SUNSONG',
      tpsFolderName: 'TPS 1',
      tpsFolderId: 't1',
      tpsFolderUrl: '',
      files: [{ id: 'f1', name: 'scan_renamed.pdf', url: 'u1' }]
    }
  ];
  const pageCounts = ctx.exports.buildPageCountLookup(existing);
  const overrides = new Map([['f1', { overrideElection: 'DPR_RI', isResolved: true, resolutionNote: 'ok' }]]);
  ctx.exports.mergeScannedKecamatanState('Sekadau Hulu', scanned, overrides, pageCounts);

  assert.equal(scanned[0].files[0].pageCount, 20);
  assert.equal(scanned[0].files[0].overrideElection, 'DPR_RI');
  assert.equal(deleted.length, 0);
});
