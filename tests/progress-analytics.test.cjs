const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const context = vm.createContext({ exports: {}, Date, Intl, Map });
vm.runInContext(ts.transpileModule(fs.readFileSync('src/utils/progressAnalytics.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText, context);
const analytics = context.exports;
const plain = value => JSON.parse(JSON.stringify(value));

test('count and percent compare rises, falls, equality and zero baselines', () => {
  assert.deepEqual(plain(analytics.compareArchiveCounts(55,50)),{delta:5,percent:10,direction:'up'});
  const down=analytics.compareArchiveCounts(50,55);
  assert.equal(down.delta,-5);
  assert.ok(Math.abs(down.percent - (-5/55*100))<1e-9);
  assert.deepEqual(plain(analytics.compareArchiveCounts(0,50)),{delta:-50,percent:-100,direction:'down'});
  assert.deepEqual(plain(analytics.compareArchiveCounts(50,50)),{delta:0,percent:0,direction:'flat'});
  assert.deepEqual(plain(analytics.compareArchiveCounts(5,0)),{delta:5,percent:null,direction:'up'});
  assert.equal(analytics.compareArchiveCounts(0,0).percent,0);
  assert.equal(analytics.compareArchiveCounts(55,null).delta,null);
});

test('WIB calendar rolls over at 17:00 UTC and handles month/year/leap boundaries', () => {
  assert.equal(analytics.archiveDateKey('2026-11-09T17:01:00Z'),'2026-11-10');
  assert.equal(analytics.archiveDateKey('2026-11-09T16:59:00Z'),'2026-11-09');
  assert.equal(analytics.previousCalendarDay('2026-01-01'),'2025-12-31');
  assert.equal(analytics.previousCalendarDay('2024-03-01'),'2024-02-29');
});

test('charts only contain real active days, no simulated fallback or missing timestamps', () => {
  const now=new Date('2026-11-10T03:00:00Z');
  const files=[
    {createdAt:'2026-11-08T03:00:00Z'},
    {createdAt:'2026-11-09T17:01:00Z'},
    {createdAt:'2026-11-09T17:02:00Z'},
    {createdAt:'2026-11-09T17:02:00Z',overrideElection:'HAPUS'},
    {createdAt:'2026-11-09T17:02:00Z',overrideElection:'IGNORE'},
    {},{createdAt:'bad'},
    {createdAt:'bad',updatedAt:'2026-11-08T09:00:00Z'},
    {createdAt:'2026-11-11T03:00:00Z'}
  ];
  const counts=analytics.dailyActivityCounts(files,now);
  assert.deepEqual(plain(analytics.buildActivityChart(counts,'THIS_MONTH',now)).map(day=>[day.rawDate,day.harian,day.kumulatif]),[
    ['2026-11-08',1,1],['2026-11-10',2,3]
  ]);
  assert.equal(counts.get('2026-11-09'),undefined);
  assert.equal(analytics.buildActivityChart(analytics.dailyActivityCounts([{},{}],now),'ALL',now).length,0);
});

test('range filters retain only active dates and reset cumulative to the selected range', () => {
  const now=new Date('2026-11-10T03:00:00Z');
  const counts=new Map([['2026-10-11',10],['2026-10-12',5],['2026-11-01',2],['2026-11-10',1]]);
  assert.deepEqual(plain(analytics.buildActivityChart(counts,'LAST_30',now)).map(day=>day.rawDate),['2026-10-12','2026-11-01','2026-11-10']);
  assert.equal(analytics.buildActivityChart(counts,'THIS_MONTH',now).at(-1).kumulatif,3);
});

test('cumulative totals use upload dates only and need no saved scan history', () => {
  const counts = new Map([['2026-11-08', 20], ['2026-11-09', 30], ['2026-11-10', 5]]);
  const before = analytics.cumulativeUploadCount(counts, '2026-11-09');
  const current = analytics.cumulativeUploadCount(counts, '2026-11-10');
  assert.equal(before, 50);
  assert.equal(current, 55);
  assert.deepEqual(plain(analytics.compareArchiveCounts(current, before)), {delta:5,percent:10,direction:'up'});
  assert.equal(analytics.fileActivityDay({updatedAt:'2026-11-10T03:00:00Z'}),null);
  assert.equal(analytics.fileActivityDay({createdAt:'bad',updatedAt:'2026-11-10T03:00:00Z'}),null);
});

test('district focus uses strictly more than 50 files per district, not the combined daily total', () => {
  const files = (count, election='PPWP') => Array.from({length:count},(_,id)=>({id:String(id),createdAt:'2026-11-10T03:00:00Z',detectedElection:election}));
  const records=[
    {kecamatan:' Belitang  Hilir ',files:files(25)},
    {kecamatan:'belitang hilir',files:files(26,'DPR_RI')},
    {kecamatan:'Sekadau Hilir',files:files(50)},
    {kecamatan:'Nanga Taman',files:files(51)},
  ];
  const result=analytics.dailyDistrictActivity(records,'2026-11-10');
  assert.deepEqual(plain(result.focus).map(row=>[row.name,row.count]),[['Belitang Hilir',51],['Nanga Taman',51]]);
  assert.equal(result.total.find(row=>row.name==='Sekadau Hilir').count,50);
  assert.equal(result.byElection.PPWP.find(row=>row.name==='Belitang Hilir').count,25);
  assert.equal(result.byElection.DPR_RI.find(row=>row.name==='Belitang Hilir').count,26);
});

test('district activity follows selected WIB upload day and overrides, ignoring cancelled or undated files', () => {
  const records=[{kecamatan:'Belitang',files:[
    {createdAt:'2026-11-09T17:01:00Z',detectedElection:'PPWP'},
    {createdAt:'2026-11-09T16:59:00Z',detectedElection:'PPWP'},
    {createdAt:'2026-11-10T03:00:00Z',detectedElection:'PPWP',overrideElection:'DPR_RI'},
    {createdAt:'2026-11-10T03:00:00Z',detectedElection:'DPD',overrideElection:'SUDAH_DIBENARKAN'},
    {createdAt:'2026-11-10T03:00:00Z',detectedElection:'UNKNOWN'},
    {createdAt:'2026-11-10T03:00:00Z',detectedElection:'PPWP',overrideElection:'IGNORE'},
    {createdAt:'2026-11-10T03:00:00Z',detectedElection:'PPWP',overrideElection:'HAPUS'},
    {updatedAt:'2026-11-10T03:00:00Z',detectedElection:'PPWP'},
  ]}];
  const result=analytics.dailyDistrictActivity(records,'2026-11-10');
  assert.equal(result.total[0].count,4);
  assert.equal(result.byElection.PPWP[0].count,1);
  assert.equal(result.byElection.DPR_RI[0].count,1);
  assert.equal(result.byElection.DPD[0].count,1);
  assert.equal(result.byElection.UNKNOWN[0].count,1);
  assert.equal(analytics.dailyDistrictActivity(records,'2026-11-09').total[0].count,1);
  assert.equal(analytics.dailyDistrictActivity(records,'2026-11-08').total.length,0);
});

test('comparison uses nearest earlier active day, skipping empty days across month boundaries', () => {
  const counts=new Map([['2026-10-31',50],['2026-11-08',40],['2026-11-09',0],['2026-11-10',55],['2026-11-11',100]]);
  assert.deepEqual(plain(analytics.previousActiveDay(counts,'2026-11-10')),{date:'2026-11-08',count:40});
  assert.deepEqual(plain(analytics.previousActiveDay(counts,'2026-11-08')),{date:'2026-10-31',count:50});
  const previous=analytics.previousActiveDay(counts,'2026-11-10');
  assert.equal(analytics.compareArchiveCounts(55,previous.count).percent,37.5);
  assert.equal(analytics.previousActiveDay(counts,'2026-10-31'),null);
});

test('no prior active day means no invented zero baseline; today without uploads still compares to the last active day', () => {
  assert.equal(analytics.previousActiveDay(new Map([['2026-11-09',0],['2026-11-10',55]]),'2026-11-10'),null);
  const previous=analytics.previousActiveDay(new Map([['2026-11-07',50],['2026-11-08',0],['2026-11-09',0]]),'2026-11-10');
  assert.equal(previous.date,'2026-11-07');
  assert.equal(analytics.compareArchiveCounts(0,previous.count).percent,-100);
});
