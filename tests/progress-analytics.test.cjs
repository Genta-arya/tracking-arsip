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
