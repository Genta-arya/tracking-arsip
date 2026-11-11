const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const ts = require('typescript');
const context = vm.createContext({ exports: {}, TextEncoder, Blob, Uint8Array });
vm.runInContext(ts.transpileModule(fs.readFileSync('src/utils/documentScanner.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context);
const { detectPaper, validCorners, projectPoint, FULL_PAGE, createScanPdf } = context.exports;
test('detects a sheet against dark background and rejects blank frames', () => {
  const width = 100, height = 100, data = new Uint8ClampedArray(width * height * 4);
  for (let y = 15; y < 85; y++) for (let x = 20; x < 80; x++) for (let k = 0; k < 3; k++) data[(y * width + x) * 4 + k] = 240;
  const corners = detectPaper({ width, height, data });
  assert.ok(corners && validCorners(corners));
  assert.ok(Math.abs(corners[0].x - 0.2) < 0.02);
  assert.equal(detectPaper({ width, height, data: new Uint8ClampedArray(data.length) }), null);
  assert.equal(detectPaper({ width, height, data: new Uint8ClampedArray(data.length).fill(255) }), null);
});
test('perspective mapping matches all four source corners and rejects crossed crop handles', () => {
  const corners = [{x:0.2,y:0.1},{x:0.85,y:0.2},{x:0.9,y:0.95},{x:0.1,y:0.8}];
  for (const [i, uv] of [[0,[0,0]],[1,[1,0]],[2,[1,1]],[3,[0,1]]]) {
    const p = projectPoint(corners, ...uv);
    assert.ok(Math.abs(p.x - corners[i].x) < 1e-9 && Math.abs(p.y - corners[i].y) < 1e-9);
  }
  assert.equal(validCorners([FULL_PAGE[0], FULL_PAGE[2], FULL_PAGE[1], FULL_PAGE[3]]), false);
});
test('PDF preserves page count, JPEG lengths and byte-accurate cross-reference offsets', async () => {
  const pdf = await createScanPdf([{ width: 200, height: 300, jpeg: new Uint8Array([255,216,255,217]) }, { width: 300, height: 200, jpeg: new Uint8Array([255,216,255,217]) }]);
  const bytes = new Uint8Array(await pdf.arrayBuffer()), text = new TextDecoder('latin1').decode(bytes);
  assert.match(text, /\/Count 2/); assert.match(text, /\/MediaBox \[0 0 842 595\]/);
  const start = Number(text.match(/startxref\n(\d+)/)[1]);
  assert.equal(text.slice(start, start + 4), 'xref');
  const lines = text.slice(start).split('\n');
  for (let i = 1; i < 9; i++) { const offset = Number(lines[i + 2].slice(0, 10)); assert.equal(text.slice(offset, offset + String(i).length + 6), `${i} 0 obj`); }
});

test('PDF rejects empty documents and more than 25 pages', async () => {
  await assert.rejects(createScanPdf([]), /1 sampai 25/);
  await assert.rejects(createScanPdf(Array(26).fill({width:1,height:1,jpeg:new Uint8Array()})), /1 sampai 25/);
});
