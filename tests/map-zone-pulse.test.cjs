const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const context = vm.createContext({ exports: {} });
vm.runInContext(ts.transpileModule(fs.readFileSync('src/utils/mapZonePulse.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText, context);
test('both Leaflet layers expand, contract, repeat and stop when the selection unmounts', () => {
  let callback, canceled;
  const radii = [[], []];
  const frames = { requestAnimationFrame: cb => { callback = cb; return 42; }, cancelAnimationFrame: id => { canceled = id; } };
  const stop = context.exports.startMapZonePulse(radii.map(values => ({ setRadius: r => values.push(r) })), frames);
  for (const time of [0, 1000, 2000, 3000, 4000]) callback(time);
  for (const values of radii) {
    assert.equal(values[0], 350);
    assert.equal(values[2], 1100);
    assert.equal(values[4], 350);
    assert.ok(values[1] > values[0] && values[3] < values[2]);
  }
  stop();
  assert.equal(canceled, 42);
  callback(5000);
  assert.equal(radii[0].length, 5);
});
