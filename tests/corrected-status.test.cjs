const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(path, mocks = {}) {
  const context = vm.createContext({ exports: {}, require: name => mocks[name] ?? require(name) });
  vm.runInContext('(function(){' + ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX }
  }).outputText + '\n})();', context);
  return context.exports;
}
const { processRawTps } = load('src/utils/parser.ts', { '../data/mockSekadauData.ts': { MOCK_DESA_MAP: {} } });
const { TrackerMatrix } = load('src/components/TrackerMatrix.tsx', {
  'lucide-react': load(require.resolve('lucide-react')),
  '@/components/AnimatedCounter': { AnimatedCounter: ({ value }) => value },
});
const file = (id, name, extra = {}) => ({ id, name, url: 'https://example.com/' + id, ...extra });
const record = files => processRawTps({ kecamatan: 'Sekadau Hilir', desa: 'PENITI', tpsFolderName: 'TPS 1', tpsFolderId: 'tps', tpsFolderUrl: '', files });
const html = data => renderToStaticMarkup(React.createElement(TrackerMatrix, { records: [data], onOpenFileDetail() {} }));
test('correcting an unknown filename fills the selected slot and displays a checked correction status', () => {
  const result = record([file('a', 'scan.pdf', { overrideElection: 'DPRD_PROV', isResolved: true })]);
  assert.equal(result.slotDPRD_PROV.id, 'a');
  assert.equal(result.slotDPRD_PROV.anomalies.length, 0);
  assert.equal(result.completedCount, 1);
  const markup = html(result);
  assert.match(markup, /Sudah dikoreksi \(1\)/);
  assert.match(markup, /lucide-check/);
  assert.match(markup, /Kurang 4 File/);
});
test('a validated file takes priority over an earlier anomalous file in the same slot', () => {
  const result = record([file('bad', 'PPWP TPS 2.pdf'), file('fixed', 'scan.pdf', { overrideElection: 'PPWP', isResolved: true })]);
  assert.equal(result.slotPPWP.id, 'fixed');
  assert.equal(result.slotPPWP.isResolved, true);
  assert.equal(result.completedCount, 1);
});
test('reset removes the correction check; removed files and unclassified corrections do not fill slots', () => {
  for (const extra of [{}, { overrideElection: 'HAPUS', isResolved: true }, { overrideElection: 'SUDAH_DIBENARKAN', isResolved: true }]) {
    const result = record([file('a', 'scan.pdf', extra)]);
    assert.equal(result.completedCount, 0);
    assert.doesNotMatch(html(result), /Sudah dikoreksi/);
  }
});
