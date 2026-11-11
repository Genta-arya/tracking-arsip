const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const context = vm.createContext({ exports: {}, require: () => ({ MOCK_DESA_MAP: {} }) });
vm.runInContext(ts.transpileModule(fs.readFileSync('src/utils/parser.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText, context);
const { cleanFileName, detectElectionCategory, ELECTION_CATEGORY_ALIASES, processRawTps } = context.exports;
for (const [category, aliases] of Object.entries(ELECTION_CATEGORY_ALIASES)) {
  test(`${category}: ten new aliases work with filename separators and mixed case`, () => {
    assert.equal(aliases.length, 10);
    for (const alias of aliases) {
      for (const separator of [' ', '_', '-', '.', '/']) {
        const name = `C-HASIL_${alias.toUpperCase().replaceAll(' ', separator)}_TPS_05.pdf`;
        assert.equal(detectElectionCategory(cleanFileName(name)).type, category, name);
      }
    }
  });
}
test('kab ko and legacy categories still fill all five checklist slots', () => {
  const names = ['PENITI_5_PPWP.pdf', 'PENITI_5_DPR RI.pdf', 'PENITI_5_DPD.pdf', 'PENITI_5_DPRD PROV.pdf', 'PENITI_5_dprd kab ko.pdf'];
  const record = processRawTps({ kecamatan: 'Sekadau Hilir', desa: 'PENITI', tpsFolderName: 'TPS 5', tpsFolderId: 'tps', tpsFolderUrl: '', files: names.map((name, i) => ({ id: String(i), name, url: '' })) });
  assert.equal(record.completedCount, 5);
  assert.equal(record.slotDPRD_KAB.name, names[4]);
});
test('unqualified DPRD and unrelated text remain unclassified', () => {
  for (const name of ['DPRD TPS 5.pdf', 'scan dokumen.pdf', 'catatan rapat.pdf', 'persidengan.pdf']) {
    const result = detectElectionCategory(cleanFileName(name));
    assert.equal(result.type, 'UNKNOWN', name);
    if (name.startsWith('DPRD')) assert.equal(result.isAmbiguousDprd, true);
  }
});
