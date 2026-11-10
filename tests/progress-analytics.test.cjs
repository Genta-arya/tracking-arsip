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
    ['2026-11-08',2,2],['2026-11-10',2,4]
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

test('snapshot metric excludes HAPUS/IGNORE but includes files without dates', () => {
  assert.equal(analytics.countActiveArchiveFiles([{files:[{id:'1'},{id:'2',overrideElection:'HAPUS'},{id:'3',overrideElection:'IGNORE'},{id:'4',isResolved:true}]}]),2);
});

test('snapshots rotate even for unchanged scans, and reset baseline for another root', () => {
  const current={total:50,at:'2026-11-10T03:00:00Z',source:'Scan',rootFolderId:'root',metric:'active-files-v1'};
  const first=analytics.nextArchiveComparison(null,current);
  assert.equal(first.previous,null);
  const next={...current,total:55,at:'2026-11-10T04:00:00Z'};
  const second=analytics.nextArchiveComparison(first,next);
  assert.equal(second.previous.total,50);
  const third=analytics.nextArchiveComparison(second,{...next,at:'2026-11-10T05:00:00Z'});
  assert.equal(third.previous.total,55);
  assert.equal(analytics.nextArchiveComparison(third,{...next,rootFolderId:'other'}).previous,null);
  assert.equal(analytics.nextArchiveComparison({current:{total:'bad'}},next).previous,null);
});
