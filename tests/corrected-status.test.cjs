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
const checklist = load('src/utils/electionChecklist.ts');
const { TrackerMatrix } = load('src/components/TrackerMatrix.tsx', {
  '@/utils/electionChecklist': checklist,
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

const Container = ({ children }) => React.createElement('div', null, children);
const { FileDetailModal } = load('src/components/FileDetailModal.tsx', {
  '@/utils/electionChecklist': checklist,
  '@/types': load('src/types/index.ts'),
  '@/services/firebase': {},
  '@/components/ui/dialog': { Dialog: Container, DialogContent: Container, DialogTitle: Container },
  '@/components/ui/button': { Button: Container },
  'lucide-react': load(require.resolve('lucide-react')),
});
test('detail checklist follows corrected categories even when old slots still contain the previous category', () => {
  const result = record([file('fixed', 'scan.pdf', { overrideElection: 'DPRD_PROV', isResolved: true })]);
  result.slotDPRD_PROV = null;
  result.slotPPWP = result.files[0];
  const markup = renderToStaticMarkup(React.createElement(FileDetailModal, {
    record: result, open: true, onClose() {},
  }));
  assert.match(markup, /aria-label="DPRD Provinsi: Tercentang"/);
  assert.match(markup, /aria-label="Presiden &amp; Wakil Presiden: Belum ada"/);
  assert.match(markup, /Sudah dikoreksi &amp; diverifikasi/);
  assert.match(html(result), /Sudah dikoreksi/);
});
test('resolved corrections show a check despite old anomaly metadata, but removed files stay missing', () => {
  const result = record([file('fixed', 'scan.pdf', { overrideElection: 'PPWP', isResolved: true })]);
  result.files[0].anomalies = [{ type: 'UNKNOWN_FORMAT', message: 'Old anomaly', fileName: 'scan.pdf' }];
  const render = () => renderToStaticMarkup(React.createElement(FileDetailModal, { record: result, open: true, onClose() {} }));
  assert.match(render(), /aria-label="Presiden &amp; Wakil Presiden: Tercentang"/);
  result.files[0].overrideElection = 'HAPUS';
  assert.match(render(), /aria-label="Presiden &amp; Wakil Presiden: Belum ada"/);
});
