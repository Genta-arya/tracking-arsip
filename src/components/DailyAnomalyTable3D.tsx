import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  ExternalLink,
  Wrench,
  Search,
  Calendar,
  User,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TPSRecord, ScannedFile, AnomalyItem, AnomalyType, OverrideElectionType } from '@/types';

interface DailyAnomalyTable3DProps {
  records: TPSRecord[];
  onOpenFileDetail: (record: TPSRecord, initialFileId?: string) => void;
  onUpdateFileStatus?: (params: {
    kecamatan: string;
    tpsFolderId: string;
    fileId: string;
    overrideElection?: OverrideElectionType;
    isResolved: boolean;
    resolutionNote?: string;
  }) => Promise<void>;
  currentUserEmail?: string | null;
}

export interface AnomalyFileRow {
  fileId: string;
  fileName: string;
  fileUrl: string;
  createdAt?: string;
  uploader?: string;
  kecamatan: string;
  desa: string;
  tpsNumber: number;
  tpsFolderName: string;
  tpsFolderId: string;
  tpsFolderUrl: string;
  recordId: string;
  record: TPSRecord;
  file: ScannedFile;
  anomalies: AnomalyItem[];
  primaryAnomaly: AnomalyItem;
  dateLabel: string;
  timeLabel: string;
  rawDate: string;
}

// Konfigurasi visual untuk setiap jenis anomali berkas
const ANOMALY_BADGE_CONFIG: Record<
  AnomalyType,
  {
    label: string;
    icon: string;
    badgeClass: string;
    description: string;
  }
> = {
  UNKNOWN_FORMAT: {
    label: 'Format Acak / Tak Dikenali',
    icon: '❓',
    badgeClass:
      'bg-rose-50 text-rose-800 border-rose-300/80 shadow-[0_1px_3px_rgba(225,29,72,0.15)]',
    description: 'Nama berkas tidak memuat kata kunci 5 jenis pemilihan (Presiden/DPR/DPD/DPRD)',
  },
  DPRD_AMBIGUOUS: {
    label: 'DPRD Ambigu (Tanpa Prov/Kab)',
    icon: '⚖️',
    badgeClass:
      'bg-amber-50 text-amber-800 border-amber-300/80 shadow-[0_1px_3px_rgba(217,119,6,0.15)]',
    description: 'Hanya tertulis "DPRD" tanpa keterangan Provinsi atau Kabupaten',
  },
  MISMATCH_TPS: {
    label: 'Salah Kamar TPS',
    icon: '🔀',
    badgeClass:
      'bg-purple-50 text-purple-800 border-purple-300/80 shadow-[0_1px_3px_rgba(147,51,234,0.15)]',
    description: 'Nomor TPS pada nama file berbeda dengan nomor folder tempat berkas disimpan',
  },
  DUPLICATE: {
    label: 'Berkas Ganda (Duplikat)',
    icon: '📄',
    badgeClass:
      'bg-orange-50 text-orange-800 border-orange-300/80 shadow-[0_1px_3px_rgba(234,88,12,0.15)]',
    description: 'Terdapat lebih dari satu berkas untuk satu jenis pemilihan dalam folder TPS yang sama',
  },
  MISMATCH_DESA: {
    label: 'Salah Nama Desa',
    icon: '📍',
    badgeClass:
      'bg-red-50 text-red-800 border-red-300/80 shadow-[0_1px_3px_rgba(220,38,38,0.15)]',
    description: 'Nama desa pada berkas tidak sesuai dengan lokasi TPS',
  },
};

/**
 * Format tanggal ramah pengguna untuk pengelompokan harian
 */
function parseAnomalyDate(dateStr?: string): {
  dateLabel: string;
  timeLabel: string;
  rawDate: string;
} {
  if (!dateStr) {
    return { dateLabel: 'Hari Ini', timeLabel: '-', rawDate: 'today' };
  }
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      return { dateLabel: 'Hari Ini', timeLabel: '-', rawDate: 'today' };
    }
    const dateLabel = d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const timeLabel = d.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const rawDate = d.toISOString().split('T')[0];
    return { dateLabel, timeLabel, rawDate };
  } catch {
    return { dateLabel: 'Hari Ini', timeLabel: '-', rawDate: 'today' };
  }
}

/**
 * DailyAnomalyTable3D - Header 1 Rekapitulasi Berkas Anomali Harian
 * Menampilkan daftar seluruh berkas anomali dengan nama berkas utuh (bypassed),
 * pengelompokan per hari, detail letak TPS, dan aksi cepat tinjau / buka Google Drive.
 */
export function DailyAnomalyTable3D({
  records,
  onOpenFileDetail,
  onUpdateFileStatus,
  currentUserEmail,
}: DailyAnomalyTable3DProps) {
  const isAdminTeknis = currentUserEmail?.toLowerCase() === 'teknis.kpusekadau@gmail.com';
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);

  const handleQuickDelete = async (item: AnomalyFileRow) => {
    if (
      !confirm(
        `Tandai berkas "${item.fileName}" sebagai Hapus / Sudah Dipindahkan dari ${item.tpsFolderName}?\n\nBerkas ini akan hilang dari folder TPS ini dan anomali dinyatakan selesai/fix.`
      )
    ) {
      return;
    }
    setDeletingFileId(item.fileId);
    try {
      if (onUpdateFileStatus) {
        await onUpdateFileStatus({
          kecamatan: item.kecamatan,
          tpsFolderId: item.tpsFolderId,
          fileId: item.fileId,
          overrideElection: 'HAPUS',
          isResolved: true,
          resolutionNote: 'Berkas dihapus / dipindahkan dari folder ini (anomali sudah difix)',
        });
      }
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus status berkas.');
    } finally {
      setDeletingFileId(null);
    }
  };
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // Ekstraksi seluruh berkas yang memiliki anomali aktif (belum di-resolve)
  const allAnomalies = useMemo<AnomalyFileRow[]>(() => {
    const list: AnomalyFileRow[] = [];

    records.forEach((rec) => {
      rec.files.forEach((file) => {
        if (file.anomalies && file.anomalies.length > 0 && !file.isResolved) {
          const { dateLabel, timeLabel, rawDate } = parseAnomalyDate(
            file.createdAt || file.updatedAt
          );

          list.push({
            fileId: file.id,
            fileName: file.name,
            fileUrl: file.url,
            createdAt: file.createdAt || file.updatedAt,
            uploader: file.uploader || 'Staf Pengunggah',
            kecamatan: rec.kecamatan,
            desa: rec.desa,
            tpsNumber: rec.tpsNumber,
            tpsFolderName: rec.tpsFolderName,
            tpsFolderId: rec.tpsFolderId,
            tpsFolderUrl: rec.tpsFolderUrl,
            recordId: rec.id,
            record: rec,
            file: file,
            anomalies: file.anomalies,
            primaryAnomaly: file.anomalies[0],
            dateLabel,
            timeLabel,
            rawDate,
          });
        }
      });
    });

    // Urutkan berdasarkan tanggal terbaru (atau kecamatan jika tanggal sama)
    return list.sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return a.kecamatan.localeCompare(b.kecamatan);
    });
  }, [records]);

  // Daftar unik hari/tanggal untuk filter per hari
  const availableDays = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();
    allAnomalies.forEach((a) => {
      const key = a.rawDate;
      const existing = map.get(key);
      if (existing) {
        existing.count++;
      } else {
        map.set(key, { label: a.dateLabel, count: 1 });
      }
    });
    return Array.from(map.entries()).map(([rawDate, val]) => ({
      rawDate,
      label: val.label,
      count: val.count,
    }));
  }, [allAnomalies]);

  // Statistik breakdown per jenis anomali
  const stats = useMemo(() => {
    let unknownCount = 0;
    let ambiguousCount = 0;
    let mismatchCount = 0;
    let duplicateCount = 0;
    let sudahDibenarkanCount = 0;

    allAnomalies.forEach((a) => {
      if (a.file.overrideElection === 'SUDAH_DIBENARKAN') {
        sudahDibenarkanCount++;
      }
      a.anomalies.forEach((anom) => {
        if (anom.type === 'UNKNOWN_FORMAT') unknownCount++;
        else if (anom.type === 'DPRD_AMBIGUOUS') ambiguousCount++;
        else if (anom.type === 'MISMATCH_TPS') mismatchCount++;
        else if (anom.type === 'DUPLICATE') duplicateCount++;
      });
    });

    return {
      total: allAnomalies.length,
      unknownCount,
      ambiguousCount,
      mismatchCount,
      duplicateCount,
      sudahDibenarkanCount,
    };
  }, [allAnomalies]);

  // Filter anomali berdasarkan pencarian, hari, dan jenis
  const filteredAnomalies = useMemo(() => {
    return allAnomalies.filter((item) => {
      // 1. Filter Hari
      if (selectedDay !== 'ALL' && item.rawDate !== selectedDay) {
        return false;
      }

      // 2. Filter Jenis Anomali
      if (selectedType !== 'ALL') {
        const hasType = item.anomalies.some((anom) => anom.type === selectedType);
        if (!hasType) return false;
      }

      // 3. Filter Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inFileName = item.fileName.toLowerCase().includes(q);
        const inKecamatan = item.kecamatan.toLowerCase().includes(q);
        const inDesa = item.desa.toLowerCase().includes(q);
        const inTps = `tps ${item.tpsNumber}`.includes(q);
        const inUploader = item.uploader?.toLowerCase().includes(q) || false;
        const inResolutionNote = item.file.resolutionNote?.toLowerCase().includes(q) || false;
        const inSudahDibenarkan =
          item.file.overrideElection === 'SUDAH_DIBENARKAN' &&
          ('sudah dibenarkan'.includes(q) || 'sync'.includes(q));
        const inMessage = item.anomalies.some((anom) =>
          anom.message.toLowerCase().includes(q)
        );

        if (
          !inFileName &&
          !inKecamatan &&
          !inDesa &&
          !inTps &&
          !inUploader &&
          !inMessage &&
          !inResolutionNote &&
          !inSudahDibenarkan
        ) {
          return false;
        }
      }

      return true;
    });
  }, [allAnomalies, selectedDay, selectedType, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredAnomalies.length / itemsPerPage) || 1;
  const paginatedAnomalies = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAnomalies.slice(start, start + itemsPerPage);
  }, [filteredAnomalies, currentPage]);

  return (
    <div className="w-full bg-white/98 backdrop-blur-md rounded-2xl border border-amber-300/80 shadow-[0_16px_40px_-10px_rgba(217,119,6,0.12),0_4px_12px_rgba(0,0,0,0.04)] overflow-hidden transition-all duration-300 relative isolate">
      {/* Specular Top Rim Highlight (Kuning Emas KPU) */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 pointer-events-none" />

      {/* 1. Header Command Deck */}
      <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-amber-50/90 via-white to-red-50/40 border-b border-amber-200/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-b from-amber-500 to-amber-700 text-amber-950 flex items-center justify-center shadow-[0_4px_10px_rgba(217,119,6,0.35),inset_0_1px_0_rgba(255,255,255,0.4)] ring-1 ring-amber-300/80 shrink-0">
            <AlertTriangle className="h-5 w-5 text-amber-950" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-slate-800 tracking-tight">
                Rekap Data Anomali Berkas Harian
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-gradient-to-b from-amber-400 to-amber-500 text-amber-950 border border-amber-300 shadow-2xs">
                {allAnomalies.length} Berkas Perlu Peninjauan
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5 hidden sm:block">
              Nama asli berkas ditampilkan utuh (bypassed) agar staf dapat langsung mengidentifikasi kesalahan penamaan atau format berkas.
            </p>
          </div>
        </div>

        {/* Action Toggle Collapse / Expand */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-amber-950 bg-gradient-to-b from-amber-100 to-amber-200/90 hover:from-amber-200 hover:to-amber-300/90 border border-amber-300/80 rounded-xl shadow-[0_2px_5px_rgba(217,119,6,0.15),inset_0_1px_0_rgba(255,255,255,0.8)] active:translate-y-0.5 transition-all cursor-pointer"
          >
            {isCollapsed ? (
              <>
                <ChevronDown className="h-4 w-4 text-amber-900" />
                <span>Buka Tabel Anomali</span>
              </>
            ) : (
              <>
                <ChevronUp className="h-4 w-4 text-amber-900" />
                <span>Sembunyikan Tabel</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Isi Komponen (Collapsible) */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            {/* Summary Metric Strip & Filter Bar */}
            <div className="p-4 sm:p-5 bg-gradient-to-b from-amber-50/30 to-white border-b border-slate-200/80 space-y-4">
              {/* Metric Breakdown Capsules */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedType('UNKNOWN_FORMAT')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedType === 'UNKNOWN_FORMAT'
                      ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-400/40 shadow-xs'
                      : 'bg-white hover:bg-rose-50/50 border-slate-200/90 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-rose-800 flex items-center gap-1">
                      <span>❓</span> Format Acak
                    </span>
                    <span className="font-black text-rose-900 px-1.5 py-0.2 rounded bg-rose-100 text-[11px]">
                      {stats.unknownCount}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Nama berkas tidak dikenali</p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedType('DPRD_AMBIGUOUS')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedType === 'DPRD_AMBIGUOUS'
                      ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/40 shadow-xs'
                      : 'bg-white hover:bg-amber-50/50 border-slate-200/90 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-800 flex items-center gap-1">
                      <span>⚖️</span> DPRD Ambigu
                    </span>
                    <span className="font-black text-amber-950 px-1.5 py-0.2 rounded bg-amber-100 text-[11px]">
                      {stats.ambiguousCount}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Hanya tertulis "DPRD"</p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedType('MISMATCH_TPS')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedType === 'MISMATCH_TPS'
                      ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-400/40 shadow-xs'
                      : 'bg-white hover:bg-purple-50/50 border-slate-200/90 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-purple-800 flex items-center gap-1">
                      <span>🔀</span> Salah Kamar TPS
                    </span>
                    <span className="font-black text-purple-900 px-1.5 py-0.2 rounded bg-purple-100 text-[11px]">
                      {stats.mismatchCount}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Angka file beda dengan folder</p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedType('DUPLICATE')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedType === 'DUPLICATE'
                      ? 'bg-orange-50 border-orange-400 ring-2 ring-orange-400/40 shadow-xs'
                      : 'bg-white hover:bg-orange-50/50 border-slate-200/90 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-orange-800 flex items-center gap-1">
                      <span>📄</span> Berkas Ganda
                    </span>
                    <span className="font-black text-orange-950 px-1.5 py-0.2 rounded bg-orange-100 text-[11px]">
                      {stats.duplicateCount}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Duplikat pada slot pemilihan</p>
                </button>
              </div>

              {/* Filter Row: Pencarian + Filter Hari Unggah */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                {/* Search Bar Anomali */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Cari nama berkas, kecamatan, desa, atau staf pengunggah..."
                    className="pl-10 h-10 text-xs rounded-xl bg-white border-slate-300 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Filter Hari / Tanggal Unggah Strip */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap flex items-center gap-1 mr-1">
                    <Calendar className="h-3.5 w-3.5 text-amber-600" /> Filter Hari:
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDay('ALL');
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
                      selectedDay === 'ALL'
                        ? 'bg-amber-500 text-amber-950 shadow-xs border border-amber-400'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                    }`}
                  >
                    Semua ({allAnomalies.length})
                  </button>

                  {availableDays.map((d) => (
                    <button
                      key={d.rawDate}
                      type="button"
                      onClick={() => {
                        setSelectedDay(d.rawDate);
                        setCurrentPage(1);
                      }}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                        selectedDay === d.rawDate
                          ? 'bg-amber-500 text-amber-950 shadow-xs border border-amber-400 font-black'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {d.label} ({d.count})
                    </button>
                  ))}

                  {/* Reset Filter Button */}
                  {(selectedDay !== 'ALL' || selectedType !== 'ALL' || searchQuery) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDay('ALL');
                        setSelectedType('ALL');
                        setSearchQuery('');
                        setCurrentPage(1);
                      }}
                      title="Reset filter anomali"
                      className="p-1.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors ml-1 cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 3. Tabel Data Anomali (Bypass Nama Berkas) */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-100 via-slate-50 to-amber-50/40 text-slate-700 font-black border-b border-slate-200 text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-3 text-center w-12">No.</th>
                    <th className="py-3 px-3 w-32">Waktu Unggah</th>
                    <th className="py-3 px-4 min-w-[280px]">Nama Berkas Asli (Bypass) &amp; Status</th>
                    <th className="py-3 px-3 min-w-[180px]">Wilayah TPS</th>
                    <th className="py-3 px-3 min-w-[150px]">Staf Pengunggah</th>
                    <th className="py-3 px-3 min-w-[220px]">Diagnosa Masalah</th>
                    <th className="py-3 px-4 text-center w-36">Aksi Cepat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedAnomalies.length > 0 ? (
                    paginatedAnomalies.map((item, index) => {
                      const rowNumber = (currentPage - 1) * itemsPerPage + index + 1;
                      const badgeCfg =
                        ANOMALY_BADGE_CONFIG[item.primaryAnomaly.type] ||
                        ANOMALY_BADGE_CONFIG.UNKNOWN_FORMAT;

                      return (
                        <tr
                          key={item.fileId}
                          className="hover:bg-amber-50/40 transition-colors duration-150 group"
                        >
                          {/* 1. Nomor */}
                          <td className="py-3 px-3 text-center font-bold text-slate-400">
                            {rowNumber}
                          </td>

                          {/* 2. Waktu Unggah */}
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-800 whitespace-nowrap">
                              {item.dateLabel}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                              <Clock className="h-3 w-3" />
                              <span>{item.timeLabel}</span>
                            </div>
                          </td>

                          {/* 3. Nama Berkas Utuh (Bypassed) */}
                          <td className="py-3 px-4">
                            <div className="space-y-1">
                              {/* Nama Berkas Bypassed dalam font-mono tebal */}
                              <div className="font-mono font-bold text-slate-900 bg-slate-50 group-hover:bg-amber-100/60 px-2 py-1 rounded-lg border border-slate-200/90 text-xs break-all shadow-2xs">
                                📄 {item.fileName}
                              </div>

                              {/* Lencana Anomali */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${badgeCfg.badgeClass}`}
                                >
                                  <span>{badgeCfg.icon}</span>
                                  <span>{badgeCfg.label}</span>
                                </span>

                                {item.file.overrideElection === 'SUDAH_DIBENARKAN' && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs">
                                    <span>⏳</span>
                                    <span>Sudah Dibenarkan (Tunggu Sync)</span>
                                  </span>
                                )}

                                {/* Jika ada anomali sekunder pada file yang sama */}
                                {item.anomalies.length > 1 && (
                                  <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200">
                                    +{item.anomalies.length - 1} isu lain
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 4. Wilayah TPS */}
                          <td className="py-3 px-3">
                            <div className="font-black text-slate-800">
                              Kec. {item.kecamatan}
                            </div>
                            <div className="text-[11px] font-bold text-slate-600">
                              Desa {item.desa}
                            </div>
                            <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
                              {item.tpsFolderName}
                            </span>
                          </td>

                          {/* 5. Staf Pengunggah */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5 font-bold text-slate-700">
                              <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-black shrink-0">
                                <User className="h-3 w-3" />
                              </div>
                              <span className="truncate max-w-[140px]" title={item.uploader}>
                                {item.uploader}
                              </span>
                            </div>
                          </td>

                          {/* 6. Diagnosa Masalah */}
                          <td className="py-3 px-3">
                            <p className="text-xs font-semibold text-slate-700 leading-relaxed">
                              {item.primaryAnomaly.message}
                            </p>
                            {item.file.overrideElection === 'SUDAH_DIBENARKAN' && (
                              <div className="mt-1 p-1.5 rounded-lg bg-amber-50 border border-amber-200/80 text-[11px] text-amber-950 font-bold">
                                <span>💬 Catatan: {item.file.resolutionNote || 'Sudah dibenarkan di Drive'}</span>
                                <span className="block text-[10px] text-amber-800 font-medium mt-0.5">
                                  (Tetap tercatat anomali sampai proses Sinkronkan Google Drive dijalankan)
                                </span>
                              </div>
                            )}
                          </td>

                          {/* 7. Aksi Cepat (Buka Drive / Koreksi Modal) */}
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Tombol Lihat Berkas di Google Drive */}
                              {item.fileUrl && (
                                <a
                                  href={item.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Buka berkas langsung di Google Drive"
                                  className="p-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 shadow-2xs active:translate-y-0.5 transition-all cursor-pointer"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              )}

                              {/* Tombol Koreksi / Tetapkan di Modal */}
                              <button
                                type="button"
                                onClick={() => onOpenFileDetail(item.record, item.fileId)}
                                title="Buka modal detail untuk koreksi anomali berkas ini"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-black text-amber-950 bg-gradient-to-b from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 border border-amber-300 shadow-[0_2px_4px_rgba(217,119,6,0.25),inset_0_1px_0_rgba(255,255,255,0.4)] active:translate-y-0.5 transition-all cursor-pointer"
                              >
                                <Wrench className="h-3.5 w-3.5" />
                                <span>{item.file.overrideElection === 'SUDAH_DIBENARKAN' ? 'Edit Koreksi' : 'Koreksi'}</span>
                              </button>

                              {/* Tombol Cepat Hapus / Sudah Dipindahkan */}
                              {isAdminTeknis && onUpdateFileStatus && (
                                <button
                                  type="button"
                                  disabled={deletingFileId === item.fileId}
                                  onClick={() => handleQuickDelete(item)}
                                  title="Tandai berkas sudah dipindahkan / hapus dari folder ini (anomali selesai/fix)"
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 shadow-2xs active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span>{deletingFileId === item.fileId ? '...' : 'Hapus'}</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-10 text-center">
                        <div className="max-w-md mx-auto space-y-2">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                            <CheckCircle2 className="h-6 w-6" />
                          </div>
                          <h4 className="text-sm font-black text-slate-800">
                            {allAnomalies.length === 0
                              ? 'Tidak Ada Berkas Anomali!'
                              : 'Tidak Ditemukan Berkas yang Cocok'}
                          </h4>
                          <p className="text-xs text-slate-500">
                            {allAnomalies.length === 0
                              ? 'Seluruh berkas scan C-Hasil terdata dengan nama dan kategori yang sesuai standard KPU.'
                              : 'Coba ubah kata kunci pencarian atau reset filter tanggal di atas.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* 4. Pagination Footer */}
            {filteredAnomalies.length > itemsPerPage && (
              <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-amber-50/30 border-t border-slate-200 flex items-center justify-between gap-3 text-xs">
                <span className="font-bold text-slate-500">
                  Menampilkan {(currentPage - 1) * itemsPerPage + 1} -{' '}
                  {Math.min(currentPage * itemsPerPage, filteredAnomalies.length)} dari{' '}
                  {filteredAnomalies.length} berkas anomali
                </span>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="h-8 px-3 text-xs font-bold rounded-xl shadow-2xs"
                  >
                    Sebelumnya
                  </Button>
                  <span className="px-2 font-black text-slate-700">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="h-8 px-3 text-xs font-bold rounded-xl shadow-2xs"
                  >
                    Berikutnya
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
