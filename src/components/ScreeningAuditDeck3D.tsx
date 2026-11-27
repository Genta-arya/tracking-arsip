import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertOctagon,
  FileWarning,
  FileX2,
  ClipboardCheck,
  ExternalLink,
  Search,
  ChevronDown,
  ChevronUp,
  Filter,
  FileSpreadsheet,
  Wrench,
  FolderOpen,
} from 'lucide-react';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import {
  ELECTION_LIST,
  TPSRecord,
  FilterState,
  ElectionType,
  ContentIssueSubCategory,
} from '@/types';
import {
  CONTENT_ISSUE_SUBCATEGORY_ORDER,
  CONTENT_ISSUE_SUBCATEGORY_CONFIG,
} from '@/data/screeningContentIssues';
import { ScreeningAuditSummary } from '@/utils/screeningSummary';
import { exportIncompletePagesToExcel } from '@/utils/excelExport';

type ActiveCategory = 'CONTENT' | 'MISSING' | 'INCOMPLETE_PAGES' | null;

interface ScreeningAuditDeck3DProps {
  summary: ScreeningAuditSummary;
  records: TPSRecord[];
  onOpenFileDetail: (record: TPSRecord, initialFileId?: string) => void;
  onNavigateToMatrix: (filterUpdate: Partial<FilterState>) => void;
}

export function ScreeningAuditDeck3D({
  summary,
  records,
  onOpenFileDetail,
  onNavigateToMatrix,
}: ScreeningAuditDeck3DProps) {
  const [activeCategory, setActiveCategory] = useState<ActiveCategory>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [contentSubFilter, setContentSubFilter] = useState<'ALL' | ContentIssueSubCategory>('ALL');
  const [missingElectionFilter, setMissingElectionFilter] = useState<'ALL' | ElectionType>('ALL');

  const toggleCategory = (cat: Exclude<ActiveCategory, null>) => {
    setSearchQuery('');
    setActiveCategory((prev) => (prev === cat ? null : cat));
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredContentItems = useMemo(() => {
    return summary.bermasalahIsi.items.filter(({ spec, file, record }) => {
      if (contentSubFilter !== 'ALL' && spec.subCategory !== contentSubFilter) return false;
      if (!normalizedQuery) return true;
      return (
        record.kecamatan.toLowerCase().includes(normalizedQuery) ||
        record.desa.toLowerCase().includes(normalizedQuery) ||
        record.tpsFolderName.toLowerCase().includes(normalizedQuery) ||
        file.name.toLowerCase().includes(normalizedQuery) ||
        spec.detail.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [summary.bermasalahIsi.items, contentSubFilter, normalizedQuery]);

  const filteredMissingItems = useMemo(() => {
    return summary.belumAdaBerkas.items.filter((item) => {
      if (missingElectionFilter !== 'ALL' && item.election !== missingElectionFilter) return false;
      if (!normalizedQuery) return true;
      return (
        item.kecamatan.toLowerCase().includes(normalizedQuery) ||
        item.desa.toLowerCase().includes(normalizedQuery) ||
        item.tpsFolderName.toLowerCase().includes(normalizedQuery) ||
        item.electionLabel.toLowerCase().includes(normalizedQuery) ||
        item.electionShortLabel.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [summary.belumAdaBerkas.items, missingElectionFilter, normalizedQuery]);

  const filteredIncompleteItems = useMemo(() => {
    return summary.kurangHalaman.items.filter(({ file, record, electionLabel }) => {
      if (!normalizedQuery) return true;
      return (
        record.kecamatan.toLowerCase().includes(normalizedQuery) ||
        record.desa.toLowerCase().includes(normalizedQuery) ||
        record.tpsFolderName.toLowerCase().includes(normalizedQuery) ||
        file.name.toLowerCase().includes(normalizedQuery) ||
        electionLabel.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [summary.kurangHalaman.items, normalizedQuery]);

  return (
    <section
      aria-label="Kategori Temuan Screening Arsip PDF"
      className="relative rounded-2xl sm:rounded-3xl bg-white border border-slate-200/90 shadow-[0_14px_38px_-10px_rgba(15,23,42,0.08),0_4px_12px_rgba(0,0,0,0.03)] overflow-hidden"
    >
      <div className="h-[3px] w-full bg-gradient-to-r from-indigo-500 via-rose-500 to-amber-500" />

      {/* Header */}
      <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-slate-50 via-white to-amber-50/40 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-kpu-maroon via-red-800 to-red-950 text-white flex items-center justify-center shadow-md border border-red-400/50 shrink-0">
            <ClipboardCheck className="h-5 w-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                Kategori Hasil Screening Kelengkapan Arsip PDF
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs">
                Total Belum Tuntas:{' '}
                <AnimatedCounter value={summary.totalIssueCount} className="font-black" />
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Rincian{' '}
              <strong className="text-slate-700">
                {summary.totalIssueCount.toLocaleString('id-ID')}
              </strong>{' '}
              slot/berkas belum tuntas dari{' '}
              <strong className="text-slate-700">
                {summary.totalSlots.toLocaleString('id-ID')}
              </strong>{' '}
              total slot ({summary.totalTPS} TPS × 5 pemilihan) •{' '}
              <span className="text-emerald-700 font-bold">
                {summary.cleanSlots.toLocaleString('id-ID')} tuntas
              </span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => exportIncompletePagesToExcel(records)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 shadow-2xs transition cursor-pointer self-start sm:self-auto"
          title="Unduh Rekap Excel Berkas Kurang Halaman"
        >
          <FileSpreadsheet className="h-3.5 w-3.5 text-rose-700" />
          <span>Export Kurang Halaman ({summary.kurangHalaman.count})</span>
        </button>
      </div>

      {/* 3 Cards Grid */}
      <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-3.5 bg-slate-50/50">
        {/* 1. Bermasalah Isi (17) */}
        <div
          className={`rounded-2xl border p-4 bg-white transition-all flex flex-col justify-between gap-3 ${
            activeCategory === 'CONTENT'
              ? 'border-indigo-400 ring-2 ring-indigo-300/60 shadow-md'
              : 'border-slate-200/90 hover:border-indigo-300 shadow-2xs'
          }`}
        >
          <div className="space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200">
                  🧩 Kategori 1 • Audit Isi PDF
                </span>
                <h3 className="text-sm font-black text-slate-900 mt-1.5">Bermasalah Isi</h3>
              </div>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center shrink-0">
                <AlertOctagon className="h-5 w-5" />
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              <AnimatedCounter
                value={summary.bermasalahIsi.count}
                className="text-3xl font-black text-indigo-700 tracking-tight"
              />
              <span className="text-xs font-bold text-slate-500">
                berkas ({summary.bermasalahIsi.tpsCount} TPS)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              {CONTENT_ISSUE_SUBCATEGORY_ORDER.map((subKey) => {
                const cfg = CONTENT_ISSUE_SUBCATEGORY_CONFIG[subKey];
                return (
                  <div
                    key={subKey}
                    className="flex items-center justify-between px-2 py-1 rounded-lg bg-slate-50 border border-slate-200/80"
                  >
                    <span className="text-slate-600 font-semibold truncate">{cfg.shortLabel}</span>
                    <span className="font-black text-slate-900 ml-1">
                      {summary.bermasalahIsi.subCounts[subKey]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setContentSubFilter('ALL');
                toggleCategory('CONTENT');
              }}
              className={`flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                activeCategory === 'CONTENT'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200'
              }`}
            >
              <span>Daftar ({summary.bermasalahIsi.count})</span>
              {activeCategory === 'CONTENT' ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              type="button"
              onClick={() => onNavigateToMatrix({ status: 'CONTENT_ISSUE' })}
              className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition cursor-pointer"
              title="Saring Matriks TPS untuk kategori Bermasalah Isi"
            >
              <Filter className="h-3.5 w-3.5" />
              <span>Matriks</span>
            </button>
          </div>
        </div>

        {/* 2. Belum Ada Berkas (41) */}
        <div
          className={`rounded-2xl border p-4 bg-white transition-all flex flex-col justify-between gap-3 ${
            activeCategory === 'MISSING'
              ? 'border-orange-400 ring-2 ring-orange-300/60 shadow-md'
              : 'border-slate-200/90 hover:border-orange-300 shadow-2xs'
          }`}
        >
          <div className="space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-orange-50 text-orange-800 border border-orange-200">
                  📭 Kategori 2 • Slot Kosong
                </span>
                <h3 className="text-sm font-black text-slate-900 mt-1.5">Belum Ada Berkas</h3>
              </div>
              <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-700 border border-orange-200 flex items-center justify-center shrink-0">
                <FileX2 className="h-5 w-5" />
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              <AnimatedCounter
                value={summary.belumAdaBerkas.count}
                className="text-3xl font-black text-orange-700 tracking-tight"
              />
              <span className="text-xs font-bold text-slate-500">
                slot kosong ({summary.belumAdaBerkas.tpsCount} TPS)
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-[10px]">
              {ELECTION_LIST.map((el) => (
                <div
                  key={el.key}
                  className="flex items-center justify-between px-2 py-1 rounded-lg bg-slate-50 border border-slate-200/80"
                >
                  <span className="text-slate-600 font-semibold truncate">{el.shortLabel}</span>
                  <span className="font-black text-slate-900 ml-1">
                    {summary.belumAdaBerkas.byElection[el.key]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setMissingElectionFilter('ALL');
                toggleCategory('MISSING');
              }}
              className={`flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                activeCategory === 'MISSING'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-orange-50 hover:bg-orange-100 text-orange-900 border border-orange-200'
              }`}
            >
              <span>Daftar ({summary.belumAdaBerkas.count})</span>
              {activeCategory === 'MISSING' ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              type="button"
              onClick={() => onNavigateToMatrix({ status: 'INCOMPLETE' })}
              className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition cursor-pointer"
              title="Saring Matriks TPS yang belum lengkap 5 berkas"
            >
              <Filter className="h-3.5 w-3.5" />
              <span>Matriks</span>
            </button>
          </div>
        </div>

        {/* 3. Kurang Halaman (89) */}
        <div
          className={`rounded-2xl border p-4 bg-white transition-all flex flex-col justify-between gap-3 ${
            activeCategory === 'INCOMPLETE_PAGES'
              ? 'border-rose-400 ring-2 ring-rose-300/60 shadow-md'
              : 'border-slate-200/90 hover:border-rose-300 shadow-2xs'
          }`}
        >
          <div className="space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200">
                  📑 Kategori 3 • Halaman &lt; Standar
                </span>
                <h3 className="text-sm font-black text-slate-900 mt-1.5">Kurang Halaman</h3>
              </div>
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center shrink-0">
                <FileWarning className="h-5 w-5" />
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              <AnimatedCounter
                value={summary.kurangHalaman.count}
                className="text-3xl font-black text-rose-700 tracking-tight"
              />
              <span className="text-xs font-bold text-slate-500">
                berkas ({summary.kurangHalaman.tpsCount} TPS)
              </span>
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-rose-50/70 border border-rose-200/70">
                <span className="text-rose-900 font-semibold">Total Kekurangan Lembar</span>
                <span className="font-black text-rose-950">
                  -{summary.kurangHalaman.totalMissingPages.toLocaleString('id-ID')} hal
                </span>
              </div>
              <div className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 text-[10px] text-slate-600 font-medium">
                <span>Standar Resmi</span>
                <span className="font-bold text-slate-800">PPWP 3 • DPD 4 • DPR/DPRD 20</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => toggleCategory('INCOMPLETE_PAGES')}
              className={`flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                activeCategory === 'INCOMPLETE_PAGES'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200'
              }`}
            >
              <span>Daftar ({summary.kurangHalaman.count})</span>
              {activeCategory === 'INCOMPLETE_PAGES' ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              type="button"
              onClick={() => onNavigateToMatrix({ status: 'INCOMPLETE_PAGES' })}
              className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition cursor-pointer"
              title="Saring Matriks TPS yang kurang halaman"
            >
              <Filter className="h-3.5 w-3.5" />
              <span>Matriks</span>
            </button>
          </div>
        </div>
      </div>

      {/* Inline Expandable Drawer */}
      <AnimatePresence>
        {activeCategory && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-slate-200 bg-white"
          >
            <div className="p-4 sm:p-5 space-y-3">
              {/* Drawer Filter Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  {activeCategory === 'CONTENT' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setContentSubFilter('ALL')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                          contentSubFilter === 'ALL'
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        Semua ({summary.bermasalahIsi.count})
                      </button>
                      {CONTENT_ISSUE_SUBCATEGORY_ORDER.map((subKey) => {
                        const cfg = CONTENT_ISSUE_SUBCATEGORY_CONFIG[subKey];
                        return (
                          <button
                            key={subKey}
                            type="button"
                            onClick={() => setContentSubFilter(subKey)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                              contentSubFilter === subKey
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            {cfg.shortLabel} ({summary.bermasalahIsi.subCounts[subKey]})
                          </button>
                        );
                      })}
                    </>
                  )}

                  {activeCategory === 'MISSING' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setMissingElectionFilter('ALL')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                          missingElectionFilter === 'ALL'
                            ? 'bg-orange-600 text-white border-orange-600'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        Semua ({summary.belumAdaBerkas.count})
                      </button>
                      {ELECTION_LIST.map((el) => (
                        <button
                          key={el.key}
                          type="button"
                          onClick={() => setMissingElectionFilter(el.key)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                            missingElectionFilter === el.key
                              ? 'bg-orange-600 text-white border-orange-600'
                              : 'bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          {el.shortLabel} ({summary.belumAdaBerkas.byElection[el.key]})
                        </button>
                      ))}
                    </>
                  )}

                  {activeCategory === 'INCOMPLETE_PAGES' && (
                    <span className="text-xs font-black text-rose-900">
                      Menampilkan {filteredIncompleteItems.length} dari {summary.kurangHalaman.count}{' '}
                      berkas kurang halaman
                    </span>
                  )}
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari kecamatan, desa, TPS, file..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              {/* Drawer Table */}
              <div className="max-h-96 overflow-y-auto rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 sticky top-0 z-10 text-[11px] font-black uppercase text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">No</th>
                      <th className="py-2.5 px-3 min-w-[165px]">Wilayah TPS</th>
                      <th className="py-2.5 px-3 min-w-[240px]">
                        {activeCategory === 'MISSING'
                          ? 'Jenis Pemilihan Yang Belum Ada'
                          : 'Berkas & Keterangan Masalah'}
                      </th>
                      <th className="py-2.5 px-3 w-36 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeCategory === 'CONTENT' &&
                      filteredContentItems.map(({ spec, file, record }, idx) => {
                        const subMeta = CONTENT_ISSUE_SUBCATEGORY_CONFIG[spec.subCategory];
                        return (
                          <tr key={file.id} className="hover:bg-indigo-50/30">
                            <td className="py-2.5 px-3 text-center font-bold text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-black text-slate-800">Kec. {record.kecamatan}</div>
                              <div className="text-[11px] font-semibold text-slate-600">
                                {record.desa} • {record.tpsFolderName}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${subMeta.badgeClass}`}
                                >
                                  {subMeta.icon} {subMeta.label}
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                                  {file.pageCount ?? spec.halAda}/{spec.standar} hal
                                </span>
                              </div>
                              <div className="font-mono font-bold text-[11px] text-slate-900 break-all">
                                {file.name}
                              </div>
                              <p className="text-[11px] text-slate-600 leading-snug">{spec.detail}</p>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center justify-center gap-1.5">
                                {file.url && (
                                  <a
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 inline-flex items-center gap-1"
                                  >
                                    <span>Drive</span>
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}
                                <button
                                  type="button"
                                  onClick={() => onOpenFileDetail(record, file.id)}
                                  className="px-2 py-1 rounded-lg text-[11px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-950 inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Wrench className="h-3 w-3" />
                                  <span>Detail</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                    {activeCategory === 'MISSING' &&
                      filteredMissingItems.map((item, idx) => (
                        <tr key={item.key} className="hover:bg-orange-50/30">
                          <td className="py-2.5 px-3 text-center font-bold text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-black text-slate-800">Kec. {item.kecamatan}</div>
                            <div className="text-[11px] font-semibold text-slate-600">
                              {item.desa} • {item.tpsFolderName}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-100 text-orange-950 border border-orange-300">
                                {item.electionShortLabel}
                              </span>
                              <span className="text-[11px] font-bold text-slate-800">
                                {item.electionLabel}
                              </span>
                              <span className="text-[10px] font-bold text-rose-700">
                                (0/{item.expectedPages} hal)
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500">
                              Belum ada berkas sah pada slot {item.electionShortLabel} di folder{' '}
                              {item.tpsFolderName}.
                            </p>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center justify-center gap-1.5">
                              {item.tpsFolderUrl && (
                                <a
                                  href={item.tpsFolderUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 inline-flex items-center gap-1"
                                >
                                  <FolderOpen className="h-3 w-3" />
                                  <span>Folder</span>
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => onOpenFileDetail(item.record)}
                                className="px-2 py-1 rounded-lg text-[11px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-950 inline-flex items-center gap-1 cursor-pointer"
                              >
                                <span>Detail TPS</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}

                    {activeCategory === 'INCOMPLETE_PAGES' &&
                      filteredIncompleteItems.map(({ file, record, pageCount, expectedPages, missingPages, electionLabel }, idx) => (
                        <tr key={file.id} className="hover:bg-rose-50/30">
                          <td className="py-2.5 px-3 text-center font-bold text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-black text-slate-800">Kec. {record.kecamatan}</div>
                            <div className="text-[11px] font-semibold text-slate-600">
                              {record.desa} • {record.tpsFolderName}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-900 border border-rose-300">
                                {electionLabel}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-pink-100 text-pink-900 border border-pink-300">
                                {pageCount}/{expectedPages} hal (Kurang {missingPages} hal)
                              </span>
                            </div>
                            <div className="font-mono font-bold text-[11px] text-slate-900 break-all">
                              {file.name}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center justify-center gap-1.5">
                              {file.url && (
                                <a
                                  href={file.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 inline-flex items-center gap-1"
                                >
                                  <span>Drive</span>
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => onOpenFileDetail(record, file.id)}
                                className="px-2 py-1 rounded-lg text-[11px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-950 inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Wrench className="h-3 w-3" />
                                <span>Detail</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
