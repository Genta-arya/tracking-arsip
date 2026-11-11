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

function documentFixture(color, shadow = false) {
  const width=180,height=160,data=new Uint8ClampedArray(width*height*4);
  const corners=[{x:36,y:22},{x:146,y:38},{x:137,y:139},{x:21,y:125}];
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const inside=corners.every((a,i)=>{const b=corners[(i+1)%4];return (b.x-a.x)*(y-a.y)-(b.y-a.y)*(x-a.x)>=0;});
    const factor=shadow?0.55+0.45*x/width:1;
    const rgb=inside?color.map(v=>v*factor):[82,91,98];
    const ink=inside&&x>55&&x<110&&y>55&&y<110&&y%13<2;
    for(let k=0;k<3;k++)data[(y*width+x)*4+k]=ink?22:rgb[k];
    data[(y*width+x)*4+3]=255;
  }
  return {image:{width,height,data},corners};
}
for(const [name,color,shadow] of [['yellow',[235,200,74],false],['blue',[90,165,225],false],['pink',[218,125,150],true],['gray',[150,150,150],true],['dark',[35,42,49],false]]) {
 test(`edge crop detects ${name} paper with perspective${shadow?' and shadow':''}`,()=>{
   const {image,corners}=documentFixture(color,shadow),found=detectPaper(image);
   assert.ok(found, name);
   for(let i=0;i<4;i++)assert.ok(Math.hypot(found[i].x-corners[i].x/(image.width-1),found[i].y-corners[i].y/(image.height-1))<0.04,JSON.stringify({name,found,corners}));
 });
}
test('magic color evens out a shadow while retaining dark writing and red ink',()=>{
 const width=192,height=96,data=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const level=120+115*x/(width-1),i=(y*width+x)*4;
  data[i]=data[i+1]=data[i+2]=level;data[i+3]=255;
  if(y>=40&&y<44) data[i]=data[i+1]=data[i+2]=15;
  if(x>90&&x<100&&y>60&&y<65){data[i]=170;data[i+1]=20;data[i+2]=25;}
 }
 const beforeDifference=data[(20*width+180)*4]-data[(20*width+10)*4];
 context.exports.applyMagicColor({width,height,data});
 const afterDifference=data[(20*width+180)*4]-data[(20*width+10)*4];
 assert.ok(afterDifference < beforeDifference/2,{beforeDifference,afterDifference});
 assert.ok(data[(41*width+80)*4]<40);
 const red=(62*width+95)*4; assert.ok(data[red]>data[red+1]*3);
 assert.equal(data[red+3],255);
});
test('a round object is not mistaken for a four-sided sheet',()=>{
 const width=100,height=100,data=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if((x-50)**2+(y-50)**2<32**2)for(let k=0;k<3;k++)data[(y*width+x)*4+k]=200;
 assert.equal(detectPaper({width,height,data}),null);
});
