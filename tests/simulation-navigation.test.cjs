const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file) {
 const ctx=vm.createContext({exports:{},Date,Number,Error,URL,URLSearchParams});
 vm.runInContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,ctx);
 return ctx.exports;
}
const simulator=load('src/utils/scanSimulation.ts');
const navigation=load('src/utils/dashboardNavigation.ts');
const plain=value=>JSON.parse(JSON.stringify(value));
test('3490 files at 150 per day take 24 working days, with 40 files on the last day',()=>{
 const result=simulator.calculateScanPlan(3490,150,'2026-11-10',5);
 assert.deepEqual(plain(result),{workingDays:24,finishDate:'2026-12-11',lastDayFiles:40});
});
test('working-day schedule counts the start day and skips the selected weekend',()=>{
 assert.equal(simulator.calculateScanPlan(300,150,'2026-11-06',5).finishDate,'2026-11-09');
 assert.equal(simulator.calculateScanPlan(300,150,'2026-11-06',6).finishDate,'2026-11-07');
 assert.equal(simulator.calculateScanPlan(150,150,'2026-11-08',5).finishDate,'2026-11-09');
 assert.equal(simulator.calculateScanPlan(150,150,'2026-11-08',7).finishDate,'2026-11-08');
 assert.equal(simulator.calculateScanPlan(150,150,'2026-12-31',5).finishDate,'2026-12-31');
 assert.equal(simulator.calculateScanPlan(300,150,'2026-12-31',5).finishDate,'2027-01-01');
});
test('zero remainder, exact division and invalid/extreme inputs do not produce misleading dates or loops',()=>{
 assert.deepEqual(plain(simulator.calculateScanPlan(0,150,'2026-11-10',5)),{workingDays:0,finishDate:null,lastDayFiles:0});
 assert.equal(simulator.calculateScanPlan(300,150,'2026-11-10',5).lastDayFiles,150);
 for(const args of [[100,0,'2026-11-10',5],[100,-1,'2026-11-10',5],[1.5,150,'2026-11-10',5],[100,1.5,'2026-11-10',5],[100,150,'2026-02-30',5],[100,150,'',5],[100,150,'2026-11-10',4],[Number.MAX_SAFE_INTEGER,1,'2026-11-10',5]]) {
  assert.throws(()=>simulator.calculateScanPlan(...args));
 }
});
test('all new public tab URLs and legacy links resolve to the intended main and dashboard tabs',()=>{
 for(const [slug,mainTab,dashboardTab] of [['progress','progress','summary'],['ringkasan','progress','summary'],['harian','progress','daily'],['analisis','progress','analysis'],['rekapitulasi','rekapitulasi','summary'],['ANALISIS','progress','analysis'],['unknown','progress','summary']]) {
  assert.deepEqual(plain(navigation.readDashboardRoute(`?tab=${slug}`)),{mainTab,dashboardTab});
 }
 assert.deepEqual(plain(navigation.readDashboardRoute('')),{mainTab:'progress',dashboardTab:'summary'});
});
test('tab URL updates preserve other query parameters and the hash',()=>{
 const url=new URL(navigation.dashboardTabUrl('https://example.test/?tab=rekapitulasi&filter=Belitang#panel','analysis'));
 assert.equal(url.searchParams.get('tab'),'analisis');
 assert.equal(url.searchParams.get('filter'),'Belitang');
 assert.equal(url.hash,'#panel');
});
