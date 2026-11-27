const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const moduleCache = new Map();
function loadTs(relOrAbsPath, mocks = {}) {
  const abs = path.resolve(relOrAbsPath);
  if (moduleCache.has(abs) && Object.keys(mocks).length === 0) {
    return moduleCache.get(abs);
  }
  const code = fs.readFileSync(abs, 'utf8');
  const js = ts.transpileModule(code, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;

  const mod = { exports: {} };
  if (Object.keys(mocks).length === 0) moduleCache.set(abs, mod.exports);

  const req = (id) => {
    if (mocks[id]) return mocks[id];
    if (id.startsWith('.')) {
      const base = path.resolve(path.dirname(abs), id);
      if (fs.existsSync(base) && fs.statSync(base).isFile()) return loadTs(base, mocks);
      if (fs.existsSync(base + '.ts')) return loadTs(base + '.ts', mocks);
      if (fs.existsSync(base + '.tsx')) return loadTs(base + '.tsx', mocks);
    }
    if (id.startsWith('@/')) {
      const base = path.resolve('src', id.slice(2));
      if (fs.existsSync(base + '.ts')) return loadTs(base + '.ts', mocks);
      if (fs.existsSync(base + '.tsx')) return loadTs(base + '.tsx', mocks);
      if (fs.existsSync(base + '/index.ts')) return loadTs(base + '/index.ts', mocks);
    }
    return require(id);
  };

  vm.runInNewContext(js, {
    module: mod,
    exports: mod.exports,
    require: req,
    console,
    Map,
    Set,
    Math,
    Object,
    Array,
    React,
  });
  return mod.exports;
}

const { SCREENING_CONTENT_ISSUES } = loadTs('src/data/screeningContentIssues.ts');
const { processRawTps } = loadTs('src/utils/parser.ts');
const { computeScreeningAuditSummary } = loadTs('src/utils/screeningSummary.ts');

test('screening content issue catalog defines exact 17 unique items (9+3+2+3)', () => {
  assert.equal(SCREENING_CONTENT_ISSUES.length, 17);
  const ids = new Set(SCREENING_CONTENT_ISSUES.map((x) => x.fileId));
  assert.equal(ids.size, 17);

  const counts = {};
  for (const item of SCREENING_CONTENT_ISSUES) {
    counts[item.subCategory] = (counts[item.subCategory] || 0) + 1;
  }
  assert.deepEqual(counts, {
    HALAMAN_DOUBLE_PAS: 9,
    GABUNG_2_TPS: 3,
    EXTRA_SCAN_RUSAK: 2,
    HALAMAN_GELAP_KOSONG: 3,
  });
});

test('processRawTps flags CONTENT_ISSUE and clears when file is replaced or resolved/deleted', () => {
  const sample = SCREENING_CONTENT_ISSUES[0];
  const rawBase = {
    kecamatan: sample.kecamatan,
    desa: sample.desa,
    tpsFolderName: `TPS ${sample.tps}`,
    tpsFolderId: 'tps-1',
    tpsFolderUrl: 'https://drive.google.com/drive/folders/tps-1',
    files: [
      {
        id: sample.fileId,
        name: `${sample.desa}_TPS ${sample.tps}_DPRD KAB KOTA (Sirekap).pdf`,
        url: `https://drive.google.com/file/d/${sample.fileId}/view`,
        size: sample.baselineSize,
        pageCount: sample.baselinePageCount,
      },
    ],
  };

  const active = processRawTps(rawBase);
  assert.equal(active.hasContentIssue, true);
  assert.ok(active.files[0].anomalies.some((a) => a.type === 'CONTENT_ISSUE'));

  // File replaced in Google Drive (byte size changed) -> issue clears automatically
  const replaced = processRawTps({
    ...rawBase,
    files: [{ ...rawBase.files[0], size: sample.baselineSize + 1024 }],
  });
  assert.equal(replaced.hasContentIssue, false);
  assert.equal(replaced.files[0].anomalies.length, 0);

  // Marked resolved -> issue clears
  const resolved = processRawTps({
    ...rawBase,
    files: [{ ...rawBase.files[0], isResolved: true }],
  });
  assert.equal(resolved.hasContentIssue, false);
});

test('processRawTps keeps INCOMPLETE_PAGES visible when overrideElection exists with isResolved=false', () => {
  const rec = processRawTps({
    kecamatan: 'Belitang',
    desa: 'NANGA ANSAR',
    tpsFolderName: 'TPS 1',
    tpsFolderId: 'tps-na-1',
    tpsFolderUrl: '',
    files: [
      {
        id: '1jMOugYtu_R5uWcsiqKyxXXcIvb_FE9AG',
        name: 'NANGA ANSAR_TPS 1_DPD (Sirekap).pdf',
        url: 'https://drive.google.com/file/d/1jMOugYtu_R5uWcsiqKyxXXcIvb_FE9AG/view',
        pageCount: 2,
        overrideElection: 'DPD',
        isResolved: false,
      },
    ],
  });

  assert.equal(rec.hasIncompletePages, true);
  assert.ok(rec.files[0].anomalies.some((a) => a.type === 'INCOMPLETE_PAGES'));
});

test('computeScreeningAuditSummary accurately totals 17 Bermasalah Isi, 41 Belum Ada Berkas, 89 Kurang Halaman (147 total)', () => {
  const tpsList = [];

  // 17 TPS slots carrying the 17 Bermasalah Isi files (plus clean sibling files)
  SCREENING_CONTENT_ISSUES.forEach((item, idx) => {
    const cleanFiles = [
      { id: `c-ppwp-${idx}`, name: `${item.desa}_TPS ${item.tps}_PPWP.pdf`, url: 'u', pageCount: 3 },
      { id: `c-dpr-${idx}`, name: `${item.desa}_TPS ${item.tps}_DPR RI.pdf`, url: 'u', pageCount: 20 },
      { id: `c-dpd-${idx}`, name: `${item.desa}_TPS ${item.tps}_DPD.pdf`, url: 'u', pageCount: 4 },
      { id: `c-prov-${idx}`, name: `${item.desa}_TPS ${item.tps}_DPRD PROV.pdf`, url: 'u', pageCount: 20 },
      { id: `c-kab-${idx}`, name: `${item.desa}_TPS ${item.tps}_DPRD KAB.pdf`, url: 'u', pageCount: 20 },
    ];
    const slotIdxByElection = { PPWP: 0, DPR_RI: 1, DPD: 2, DPRD_PROV: 3, DPRD_KAB: 4 };
    cleanFiles[slotIdxByElection[item.election]] = {
      id: item.fileId,
      name: cleanFiles[slotIdxByElection[item.election]].name,
      url: 'u',
      size: item.baselineSize,
      pageCount: item.baselinePageCount,
    };
    tpsList.push(
      processRawTps({
        kecamatan: item.kecamatan,
        desa: item.desa,
        tpsFolderName: `TPS ${item.tps}`,
        tpsFolderId: `tps-content-${idx}`,
        tpsFolderUrl: 'https://example.com',
        files: cleanFiles,
      })
    );
  });

  // 40 TPS missing 41 slots total (39 missing 1 slot + 1 missing 2 slots)
  for (let i = 0; i < 40; i++) {
    const files = [
      { id: `m-ppwp-${i}`, name: 'PPWP.pdf', url: 'u', pageCount: 3 },
      { id: `m-dpr-${i}`, name: 'DPR RI.pdf', url: 'u', pageCount: 20 },
      { id: `m-dpd-${i}`, name: 'DPD.pdf', url: 'u', pageCount: 4 },
      { id: `m-prov-${i}`, name: 'DPRD PROV.pdf', url: 'u', pageCount: 20 },
    ];
    if (i === 0) files.pop(); // 2 missing slots on i=0 -> total 41 missing slots
    tpsList.push(
      processRawTps({
        kecamatan: 'Sekadau Hilir',
        desa: 'PENITI',
        tpsFolderName: `TPS ${i + 1}`,
        tpsFolderId: `tps-miss-${i}`,
        tpsFolderUrl: 'https://example.com',
        files,
      })
    );
  }

  // 89 TPS with 1 INCOMPLETE_PAGES file each
  for (let i = 0; i < 89; i++) {
    tpsList.push(
      processRawTps({
        kecamatan: 'Sekadau Hulu',
        desa: 'SUNSONG',
        tpsFolderName: `TPS ${i + 1}`,
        tpsFolderId: `tps-inc-${i}`,
        tpsFolderUrl: 'https://example.com',
        files: [
          { id: `i-ppwp-${i}`, name: 'PPWP.pdf', url: 'u', pageCount: 3 },
          { id: `i-dpr-${i}`, name: 'DPR RI.pdf', url: 'u', pageCount: 19 }, // -1 hal
          { id: `i-dpd-${i}`, name: 'DPD.pdf', url: 'u', pageCount: 4 },
          { id: `i-prov-${i}`, name: 'DPRD PROV.pdf', url: 'u', pageCount: 20 },
          { id: `i-kab-${i}`, name: 'DPRD KAB.pdf', url: 'u', pageCount: 20 },
        ],
      })
    );
  }

  const summary = computeScreeningAuditSummary(tpsList);
  assert.equal(summary.bermasalahIsi.count, 17);
  assert.equal(summary.belumAdaBerkas.count, 41);
  assert.equal(summary.belumAdaBerkas.tpsCount, 40);
  assert.equal(summary.kurangHalaman.count, 89);
  assert.equal(summary.totalIssueCount, 147);

  // SSR render test of ScreeningAuditDeck3D & FilterSection
  const PassThrough = ({ children }) => React.createElement('div', null, children);
  const iconStub = new Proxy({}, {
    get: (_t, prop) => (props) => React.createElement('svg', { 'data-icon': String(prop), className: props?.className }),
  });
  const { ScreeningAuditDeck3D } = loadTs('src/components/ScreeningAuditDeck3D.tsx', {
    'framer-motion': {
      motion: new Proxy({}, { get: () => (props) => React.createElement('div', props, props.children) }),
      AnimatePresence: PassThrough,
    },
    'lucide-react': iconStub,
    '@/components/AnimatedCounter': { AnimatedCounter: ({ value }) => String(value) },
    '@/utils/excelExport': { exportIncompletePagesToExcel() {} },
  });

  const deckMarkup = renderToStaticMarkup(
    React.createElement(ScreeningAuditDeck3D, {
      summary,
      records: tpsList,
      onOpenFileDetail() {},
      onNavigateToMatrix() {},
    })
  );
  assert.match(deckMarkup, /Bermasalah Isi/);
  assert.match(deckMarkup, /Belum Ada Berkas/);
  assert.match(deckMarkup, /Kurang Halaman/);
  assert.match(deckMarkup, /17/);
  assert.match(deckMarkup, /41/);
  assert.match(deckMarkup, /89/);
  assert.match(deckMarkup, /147/);

  const { FilterSection } = loadTs('src/components/FilterSection.tsx', {
    'framer-motion': {
      motion: new Proxy({}, { get: () => (props) => React.createElement('div', props, props.children) }),
    },
    'lucide-react': iconStub,
    '@/components/AnimatedCounter': { AnimatedCounter: ({ value }) => String(value) },
  });
  const filterMarkup = renderToStaticMarkup(
    React.createElement(FilterSection, {
      filter: { kecamatan: 'ALL', desa: 'ALL', status: 'CONTENT_ISSUE', missingElection: 'ALL', searchQuery: '' },
      onFilterChange() {},
      kecamatanList: ['Sekadau Hilir'],
      desaList: [],
      totalFiltered: 15,
      totalAll: 698,
    })
  );
  assert.match(filterMarkup, /value="CONTENT_ISSUE"[^>]*>.*Bermasalah Isi/);
  assert.match(filterMarkup, /value="INCOMPLETE".*Belum Ada Berkas/);
  assert.match(filterMarkup, /value="INCOMPLETE_PAGES".*Kurang Halaman/);

  const { DailyAnomalyTable3D } = loadTs('src/components/DailyAnomalyTable3D.tsx', {
    'framer-motion': {
      motion: new Proxy({}, { get: () => (props) => React.createElement('div', props, props.children) }),
      AnimatePresence: PassThrough,
    },
    'lucide-react': iconStub,
    '@/components/ui/button': { Button: PassThrough },
    '@/components/ui/input': { Input: (props) => React.createElement('input', props) },
    '@/utils/excelExport': { exportIncompletePagesToExcel() {} },
  });
  const anomalyMarkup = renderToStaticMarkup(
    React.createElement(DailyAnomalyTable3D, {
      records: tpsList,
      onOpenFileDetail() {},
    })
  );
  assert.match(anomalyMarkup, /106(?:<!-- -->)?\s+Berkas Perlu Peninjauan/);
  assert.match(anomalyMarkup, /Export Kurang Lembar \(89\)/);
});
