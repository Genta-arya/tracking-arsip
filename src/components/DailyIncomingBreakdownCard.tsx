import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  MapPin,
  Layers,
  TrendingUp,
  FileText,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BarChart2,
  PieChart as PieChartIcon,
  Users,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  FolderOpen,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { useArchiveToday } from '@/hooks/useArchiveToday';
import { ArchiveComparisonCard } from '@/components/ArchiveComparisonCard';
import { dailyDistrictActivity, fileActivityDay, formatArchiveDay, isActiveArchiveFile, previousActiveDay } from '@/utils/progressAnalytics';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { TPSRecord, ElectionType, ELECTION_LIST, FilterState, ScannedFile } from '@/types';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface DailyBreakdownProps {
  records: TPSRecord[];
  onNavigateToRekap?: (filterUpdate?: Partial<FilterState>) => void;
}

// Konfigurasi visual untuk 5 jenis surat suara resmi KPU
export const ELECTION_THEMES: Record<
  ElectionType,
  {
    name: string;
    shortLabel: string;
    color: string;
    lightBg: string;
    border: string;
    textColor: string;
    badgeBg: string;
    gradient: string;
    hex: string;
    shadow: string;
  }
> = {
  PPWP: {
    name: 'Presiden & Wakil Presiden',
    shortLabel: 'PPWP',
    color: '#e11d48', // Abu-Abu / Merah KPU
    lightBg: 'bg-rose-50',
    border: 'border-rose-200',
    textColor: 'text-rose-700',
    badgeBg: 'bg-rose-100 text-rose-800',
    gradient: 'from-rose-500 to-red-700',
    hex: '#e11d48',
    shadow: 'rgba(225, 29, 72, 0.35)',
  },
  DPR_RI: {
    name: 'DPR Republik Indonesia',
    shortLabel: 'DPR RI',
    color: '#d97706', // Kuning
    lightBg: 'bg-amber-50',
    border: 'border-amber-200',
    textColor: 'text-amber-700',
    badgeBg: 'bg-amber-100 text-amber-900',
    gradient: 'from-amber-400 to-yellow-600',
    hex: '#f59e0b',
    shadow: 'rgba(245, 158, 11, 0.35)',
  },
  DPD: {
    name: 'DPD Republik Indonesia',
    shortLabel: 'DPD',
    color: '#dc2626', // Merah
    lightBg: 'bg-red-50',
    border: 'border-red-200',
    textColor: 'text-red-700',
    badgeBg: 'bg-red-100 text-red-800',
    gradient: 'from-red-500 to-rose-700',
    hex: '#ef4444',
    shadow: 'rgba(239, 68, 68, 0.35)',
  },
  DPRD_PROV: {
    name: 'DPRD Provinsi',
    shortLabel: 'DPRD Prov',
    color: '#2563eb', // Biru
    lightBg: 'bg-blue-50',
    border: 'border-blue-200',
    textColor: 'text-blue-700',
    badgeBg: 'bg-blue-100 text-blue-800',
    gradient: 'from-blue-500 to-indigo-700',
    hex: '#3b82f6',
    shadow: 'rgba(59, 130, 246, 0.35)',
  },
  DPRD_KAB: {
    name: 'DPRD Kabupaten/Kota',
    shortLabel: 'DPRD Kab/Ko',
    color: '#059669', // Hijau
    lightBg: 'bg-emerald-50',
    border: 'border-emerald-200',
    textColor: 'text-emerald-700',
    badgeBg: 'bg-emerald-100 text-emerald-800',
    gradient: 'from-emerald-500 to-teal-700',
    hex: '#10b981',
    shadow: 'rgba(16, 185, 129, 0.35)',
  },
};

interface DayStats {
  rawDate: string; // YYYY-MM-DD
  displayDate: string; // 10 Nov 2026
  dayName: string; // Selasa
  total: number;
  breakdown: Record<ElectionType, number>;
  unknown: number;
}

export interface ElectionFileItem {
  file: ScannedFile;
  kecamatan: string;
  desa: string;
  tpsNumber: number;
  tpsFolderName: string;
  tpsFolderUrl: string;
}

export interface UploaderDailyElectionStat {
  name: string;
  count: number;
  validCount: number;
  anomalyCount: number;
  files: ElectionFileItem[];
}

export function DailyIncomingBreakdownCard({
  records,
  onNavigateToRekap,
}: DailyBreakdownProps) {
  const calendarToday = useArchiveToday();
  const [chartType, setChartType] = useState<'BAR' | 'DONUT'>('BAR');

  // Modal State untuk melihat rincian pengunggah per kategori surat suara
  const [modalElection, setModalElection] = useState<ElectionType | null>(null);

  // 1. Ekstrak seluruh berkas dan kumpulkan statistik per hari beserta rincian pemilihannya
  const { allDays, todayKey } = useMemo(() => {
    const todayKey = calendarToday;

    // Map: rawDate -> breakdown
    const dateMap = new Map<string, {
      total: number;
      breakdown: Record<ElectionType, number>;
      unknown: number;
    }>();

    // Loop semua file di semua TPS
    records.forEach((record) => {
      record.files.forEach((file) => {
        if (!isActiveArchiveFile(file)) return;
        const dateKey = fileActivityDay(file);
        if (!dateKey || dateKey > todayKey) return;

        const current = dateMap.get(dateKey) || {
          total: 0,
          breakdown: {
            PPWP: 0,
            DPR_RI: 0,
            DPD: 0,
            DPRD_PROV: 0,
            DPRD_KAB: 0,
          },
          unknown: 0,
        };

        // Gunakan overrideElection jika sudah ditetapkan admin, selain itu pakai deteksi otomatis
        const elType = file.overrideElection && file.overrideElection !== 'SUDAH_DIBENARKAN'
          ? file.overrideElection
          : file.detectedElection;

        current.total += 1;
        if (elType && elType in current.breakdown) {
          current.breakdown[elType as ElectionType] += 1;
        } else {
          current.unknown += 1;
        }

        dateMap.set(dateKey, current);
      });
    });

    // Urutkan tanggal dari terbaru ke terlama
    const sortedDates = Array.from(dateMap.keys()).sort().reverse();

    const allDays: DayStats[] = sortedDates.map((dKey) => {
      const data = dateMap.get(dKey)!;
      const d = new Date(`${dKey}T12:00:00Z`);
      const displayDate = d.toLocaleDateString('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      const dayName = d.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long' });

      return {
        rawDate: dKey,
        displayDate,
        dayName,
        total: data.total,
        breakdown: data.breakdown,
        unknown: data.unknown,
      };
    });

    return { allDays, todayKey };
  }, [records, calendarToday]);

  // Tanggal yang sedang dipilih pengguna untuk dipantau (default ke hari ini atau hari terbaru)
  const [selectedDate, setSelectedDate] = useState<string>(todayKey);

  // Jika selectedDate tidak ada di allDays, pilih elemen pertama
  const activeDay = useMemo<DayStats>(() => {
    return allDays.find((d) => d.rawDate === selectedDate) || allDays[0] || {
      rawDate: todayKey,
      displayDate: 'Hari Ini',
      dayName: 'Hari Ini',
      total: 0,
      breakdown: { PPWP: 0, DPR_RI: 0, DPD: 0, DPRD_PROV: 0, DPRD_KAB: 0 },
      unknown: 0,
    };
  }, [allDays, selectedDate, todayKey]);

  const districtActivity = useMemo(() => dailyDistrictActivity(records, activeDay.rawDate), [records, activeDay.rawDate]);

  // Hitung rincian staf pengunggah untuk kategori pemilihan yang sedang aktif di modal pada tanggal yang dipilih
  const modalUploaderStats = useMemo(() => {
    if (!modalElection) return [];

    const map = new Map<string, UploaderDailyElectionStat>();

    records.forEach((record) => {
      record.files.forEach((file) => {
        if (!isActiveArchiveFile(file)) return;
        if (fileActivityDay(file) !== activeDay.rawDate) return;

        const elCandidate =
          file.overrideElection && file.overrideElection !== 'SUDAH_DIBENARKAN'
            ? file.overrideElection
            : file.detectedElection;

        if (elCandidate !== modalElection) return;

        const uploaderName = file.uploader?.trim() || 'Staf KPU Sekadau (Arsip Lama)';
        const stat = map.get(uploaderName) || {
          name: uploaderName,
          count: 0,
          validCount: 0,
          anomalyCount: 0,
          files: [],
        };

        stat.count += 1;
        if (file.anomalies.length > 0 && !file.isResolved) {
          stat.anomalyCount += 1;
        } else {
          stat.validCount += 1;
        }

        stat.files.push({
          file,
          kecamatan: record.kecamatan,
          desa: record.desa,
          tpsNumber: record.tpsNumber,
          tpsFolderName: record.tpsFolderName,
          tpsFolderUrl: record.tpsFolderUrl,
        });

        map.set(uploaderName, stat);
      });
    });

    return Array.from(map.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [records, modalElection, activeDay.rawDate]);

  // Data untuk grafik bar / donut per jenis pemilihan pada hari terpilih
  const chartData = useMemo(() => {
    return ELECTION_LIST.map((el) => {
      const count = activeDay.breakdown[el.key] || 0;
      const theme = ELECTION_THEMES[el.key];
      return {
        key: el.key,
        name: el.shortLabel,
        fullName: el.label,
        count,
        locations: districtActivity.byElection[el.key],
        color: theme.hex,
        shadow: theme.shadow,
      };
    }).filter(item => item.count > 0).concat(activeDay.unknown > 0 ? [{
      key: 'UNKNOWN' as ElectionType, name: 'Lainnya', fullName: 'Belum terklasifikasi', count: activeDay.unknown,
      locations: districtActivity.byElection.UNKNOWN, color: '#64748b', shadow: 'rgba(100,116,139,0.3)',
    }] : []);
  }, [activeDay, districtActivity]);

  // Navigasi prev/next hari
  const currentIndex = allDays.findIndex((d) => d.rawDate === activeDay.rawDate);
  const hasNewer = currentIndex > 0;
  const hasOlder = currentIndex < allDays.length - 1;

  const handleNextDay = () => {
    if (hasNewer) {
      setSelectedDate(allDays[currentIndex - 1].rawDate);
    }
  };

  const handlePrevDay = () => {
    if (hasOlder) {
      setSelectedDate(allDays[currentIndex + 1].rawDate);
    }
  };

  const isToday = activeDay.rawDate === todayKey;
  const allCounts = useMemo(() => new Map(allDays.map(day => [day.rawDate, day.total])), [allDays]);
  const previousDay = useMemo(() => previousActiveDay(allCounts, activeDay.rawDate), [allCounts, activeDay.rawDate]);

  const selectedElectionConfig = modalElection ? ELECTION_LIST.find((el) => el.key === modalElection) : null;
  const selectedTheme = modalElection ? ELECTION_THEMES[modalElection] : null;

  return (
    <div className="space-y-6">
      {/* 3D Header Command Deck & Selector Tanggal */}
      <div className="relative rounded-2xl sm:rounded-3xl bg-white border border-slate-200/90 shadow-[0_16px_40px_-8px_rgba(0,0,0,0.07),0_4px_12px_rgba(0,0,0,0.03)] overflow-hidden transition-all duration-300">
        {/* Top 3D Specular Highlight Rim */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none z-20" />

        {/* Ambient Top-Right Maroon Glow */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-kpu-maroon/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative bg-gradient-to-r from-slate-50/95 via-white/85 to-slate-50/95 backdrop-blur-xs border-b border-slate-200/80 p-4 sm:p-5 z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Title Section dengan Ikon Gem 3D */}
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 via-rose-600 to-amber-700 text-white flex items-center justify-center shadow-[0_4px_12px_rgba(225,29,72,0.35),inset_0_1.5px_1px_rgba(255,255,255,0.7),inset_0_-2px_1px_rgba(159,18,57,0.3)] border border-rose-300/80 shrink-0">
                <Calendar className="h-5 w-5 drop-shadow-xs" />
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-300 ring-2 ring-white animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Rincian Berkas Masuk Harian</span>
                  {isToday && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                      Hari Ini
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Distribusi 5 jenis surat suara (C-Hasil) yang diunggah dan terdeteksi per tanggal
                </p>
              </div>
            </div>

            {/* Kontrol Navigasi Tanggal & Toggle Tipe Grafik */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Stepper Tanggal */}
              <div className="flex items-center bg-slate-100/80 rounded-xl p-1 border border-slate-200/80 shadow-2xs">
                <button
                  type="button"
                  onClick={handlePrevDay}
                  disabled={!hasOlder}
                  className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer disabled:cursor-not-allowed"
                  title="Hari Sebelumnya"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <div className="px-3 py-1 text-center min-w-[130px]">
                  <span className="block text-xs font-black text-slate-800 leading-tight">
                    {activeDay.displayDate}
                  </span>
                  <span className="block text-[10px] font-semibold text-slate-400">
                    {activeDay.dayName}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleNextDay}
                  disabled={!hasNewer}
                  className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer disabled:cursor-not-allowed"
                  title="Hari Berikutnya"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Tombol Toggle Grafik Batang / Donut */}
              <div className="flex items-center bg-slate-100/80 rounded-xl p-1 border border-slate-200/80 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setChartType('BAR')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    chartType === 'BAR'
                      ? 'bg-kpu-maroon text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  title="Tampilan Grafik Batang"
                >
                  <BarChart2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Batang</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChartType('DONUT')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    chartType === 'DONUT'
                      ? 'bg-kpu-maroon text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  title="Tampilan Grafik Donut / Lingkaran"
                >
                  <PieChartIcon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Proporsi</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Konten Utama: 5 Kartu Breakdown Mini + Visual Chart */}
        <div className="p-4 sm:p-6 space-y-6">
          {/* Banner Ringkasan Hari Ini */}
          <div role="region" aria-label="Total Penerimaan Berkas" className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-red-50/80 via-amber-50/60 to-slate-50/80 border border-red-100 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-amber-600 text-white flex items-center justify-center font-black text-sm shadow-sm shrink-0">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Total Penerimaan Berkas ({activeDay.dayName}, {activeDay.displayDate})
                </p>
                <div className="flex items-baseline gap-2">
                  <AnimatedCounter
                    value={activeDay.total}
                    className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight"
                  />
                  <span className="text-xs font-bold text-slate-600">berkas scan masuk</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-semibold text-slate-500">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>
                Terdistribusi ke <strong className="text-slate-800 font-bold">{chartData.length} kategori aktif</strong>
              </span>
            </div>
            {districtActivity.focus.length > 0 && <div role="group" aria-label="Fokus pemindaian berdasarkan penerimaan" className="w-full space-y-2 border-t border-red-100 pt-3">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-kpu-maroon"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{isToday ? 'Indikasi fokus tim hari ini' : 'Aktivitas tinggi pada tanggal ini'}</p>
              <div className="flex flex-wrap gap-2">{districtActivity.focus.map(location => <span key={location.name} className="inline-flex max-w-full flex-wrap items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-800"><span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full bg-emerald-500 ${isToday ? 'motion-safe:animate-pulse' : ''}`} />{location.name}<span className="font-medium">· {location.count} berkas</span></span>)}</div>
              <p className="text-[10px] leading-relaxed text-slate-500">Berdasarkan penerimaan lebih dari 50 berkas per kecamatan pada tanggal yang dipilih.</p>
            </div>}
          </div>

          <ArchiveComparisonCard title="Perubahan penerimaan · tanggal terpilih" current={activeDay.total} previous={previousDay?.count ?? null}
            currentLabel={formatArchiveDay(activeDay.rawDate)} previousLabel={previousDay ? formatArchiveDay(previousDay.date) : 'Belum ada hari aktif sebelumnya'}
            />

          {/* 5 Card Mini Breakdown Jenis Pemilihan (Presiden, DPR RI, DPD, DPRD Prov, DPRD Kab) */}
          <div className="grid grid-cols-2 sm:grid-cols-6 lg:grid-cols-5 gap-3 sm:gap-4">
            {ELECTION_LIST.map((el) => {
              const count = activeDay.breakdown[el.key] || 0;
              const locations = districtActivity.byElection[el.key];
              const theme = ELECTION_THEMES[el.key];

              return (
                <motion.div
                  key={el.key}
                  role="group"
                  aria-label={`Berkas ${el.shortLabel}`}
                  whileHover={{ y: -3, scale: 1.01 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className={`relative flex flex-col justify-between last:col-span-2 sm:col-span-2 sm:last:col-span-3 sm:[&:nth-last-child(2)]:col-span-3 lg:col-span-1 lg:last:col-span-1 lg:[&:nth-last-child(2)]:col-span-1 rounded-2xl p-3.5 sm:p-4 bg-white border ${theme.border} shadow-[0_4px_16px_rgba(0,0,0,0.03)] overflow-hidden group`}
                >
                  {/* Aksen Indikator Warna Surat Suara di Sisi Kiri */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1.5"
                    style={{ backgroundColor: theme.hex }}
                  />

                  <div>
                    {/* Header Kartu: Label Singkat & Badge */}
                    <div className="flex items-start justify-between gap-1">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${theme.badgeBg}`}>
                        {el.shortLabel}
                      </span>
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: theme.hex }}
                      />
                    </div>

                    {/* Nama Lengkap Pemilihan */}
                    <p className="text-[11px] font-bold text-slate-700 mt-2 line-clamp-1 group-hover:text-slate-900 transition-colors">
                      {el.label}
                    </p>

                    {/* Angka Total Masuk Hari Ini */}
                    <div className="mt-2 flex items-baseline justify-between gap-1">
                      <div className="flex items-baseline gap-1">
                        <AnimatedCounter
                          value={count}
                          className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight"
                        />
                        <span className="text-[11px] font-semibold text-slate-500">berkas</span>
                      </div>
                    </div>

                    {/* List Kecamatan Penerima */}
                    <div className="mt-3 border-t border-slate-100 pt-2">
                      <p className="mb-1.5 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-slate-400">
                        <MapPin className="h-3 w-3" aria-hidden="true" />
                        Kecamatan penerima
                      </p>
                      {locations.length > 0 ? (
                        <ul className="space-y-1.5">
                          {locations.slice(0, 3).map((location) => (
                            <li key={location.name} className="flex items-start justify-between gap-1 text-[10px] leading-relaxed">
                              <span className="min-w-0 break-words font-semibold text-slate-700 truncate">{location.name}</span>
                              <span className="shrink-0 rounded bg-slate-50 px-1.5 font-bold tabular-nums text-slate-500">{location.count}</span>
                            </li>
                          ))}
                          {locations.length > 3 && (
                            <li className="text-[9px] text-slate-400 font-medium">
                              +{locations.length - 3} kecamatan lainnya
                            </li>
                          )}
                        </ul>
                      ) : (
                        <p className="text-[10px] text-slate-400">Belum ada penerimaan</p>
                      )}
                    </div>
                  </div>

                  {/* Tombol Aksi Detail Pengunggah & Navigasi Rekap */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setModalElection(el.key);
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] sm:text-[11px] font-black bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200/90 text-slate-800 border border-slate-300/80 shadow-2xs hover:from-white hover:to-slate-100 hover:border-slate-400 hover:text-slate-900 active:translate-y-0.5 transition cursor-pointer"
                      title={`Lihat rincian staf pengunggah berkas ${el.shortLabel}`}
                    >
                      <Users className="h-3 w-3 text-slate-600" />
                      <span>Rincian</span>
                    </button>
                    {onNavigateToRekap && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigateToRekap();
                        }}
                        className="px-2 py-1.5 rounded-xl text-[10px] font-bold bg-white text-slate-600 hover:text-kpu-maroon border border-slate-200 hover:border-rose-200 hover:bg-rose-50/50 shadow-2xs transition cursor-pointer"
                        title="Buka Rekapitulasi Berkas"
                      >
                        Rekap
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Bagian Visual Grafik: Batang atau Donut Proporsi */}
          <div className="rounded-2xl bg-gradient-to-b from-slate-50/90 via-white to-slate-50/70 p-4 sm:p-5 border border-slate-200/80 shadow-inner">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs sm:text-sm font-black text-slate-800 tracking-tight flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-kpu-maroon" />
                <span>
                  Visualisasi Perbandingan Masuk Berkas ({activeDay.displayDate})
                </span>
              </h4>
              <span className="text-[11px] text-slate-500 font-semibold">
                Total {activeDay.total} Berkas Masuk
              </span>
            </div>

            <div className={chartType === 'DONUT' && activeDay.total > 0 ? 'w-full min-h-64' : 'w-full h-64 sm:h-72'}>
              {activeDay.total === 0 ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                  <FileText className="h-8 w-8 text-slate-300" />
                  <p className="text-xs font-medium">Belum ada berkas scan yang masuk pada tanggal ini.</p>
                </div>
              ) : chartType === 'BAR' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 20, right: 20, left: -10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                    <XAxis
                      dataKey="name"
                      stroke="#64748b"
                      fontSize={12}
                      fontWeight={700}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      fontWeight={600}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1 border border-slate-700">
                              <p className="font-bold flex items-center gap-1.5">
                                <span
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{ backgroundColor: data.color }}
                                />
                                {data.fullName}
                              </p>
                              <p className="text-slate-300 font-medium">
                                Jumlah Masuk: <span className="font-bold text-white">{data.count} berkas</span>
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="count"
                      radius={[8, 8, 0, 0]}
                      animationDuration={1000}
                    >
                      {chartData.map((entry) => (
                        <Cell
                          key={`cell-${entry.key}`}
                          fill={entry.color}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 h-full">
                  <ResponsiveContainer width="100%" height={260} className="sm:w-1/2">
                    <PieChart>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            const percentage = activeDay.total > 0
                              ? ((data.count / activeDay.total) * 100).toFixed(1)
                              : 0;
                            return (
                              <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1 border border-slate-700">
                                <p className="font-bold flex items-center gap-1.5">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full"
                                    style={{ backgroundColor: data.color }}
                                  />
                                  {data.fullName}
                                </p>
                                <p className="text-slate-300 font-medium">
                                  {data.count} Berkas ({percentage}%)
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Pie
                        data={chartData}
                        dataKey="count"
                        nameKey="fullName"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        animationDuration={1000}
                      >
                        {chartData.map((entry) => (
                          <Cell
                            key={`donut-cell-${entry.key}`}
                            fill={entry.color}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Legend Kustom Donut */}
                  <div className="w-full sm:w-1/2 space-y-2">
                    {chartData.map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between text-xs p-2 rounded-xl bg-white border border-slate-100 shadow-2xs"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-md shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <div className="min-w-0">
                            <span className="font-bold text-slate-800">{item.fullName}</span>
                            <p className="mt-0.5 break-words text-[10px] leading-relaxed text-slate-500">
                              {item.locations.map(location => `${location.name}: ${location.count}`).join(' · ')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-black text-slate-900">{item.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DETAIL PENGUNGGAH PER KATEGORI PEMILU */}
      <Dialog open={Boolean(modalElection)} onOpenChange={(open) => !open && setModalElection(null)}>
        <DialogContent
          onClose={() => setModalElection(null)}
          className="max-w-2xl max-h-[88vh] flex flex-col p-0 overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xl bg-white select-none"
        >
          {/* Header Modal 3D */}
          <div
            className={`relative p-4 sm:p-5 text-white border-b border-white/20 shadow-md ${
              selectedTheme ? `bg-gradient-to-r ${selectedTheme.gradient}` : 'bg-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pr-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-white shadow-inner border border-white/30 shrink-0">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-white/30 text-white border border-white/40">
                      {selectedElectionConfig?.shortLabel}
                    </span>
                    <h3 className="text-sm sm:text-base font-black leading-tight tracking-tight">
                      Rincian Staf Pengunggah {selectedElectionConfig?.shortLabel}
                    </h3>
                  </div>
                  <p className="text-[11px] sm:text-xs text-white/85 mt-0.5 font-medium">
                    {selectedElectionConfig?.label} · {activeDay.displayDate} ({activeDay.dayName})
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Summary Pill Bar */}
            <div className="mt-3.5 pt-3 border-t border-white/25 flex items-center justify-between text-xs font-bold text-white/95">
              <span>
                Total Masuk: <strong>{activeDay.breakdown[modalElection || 'PPWP'] || 0} berkas</strong>
              </span>
              <span>
                Kontributor: <strong>{modalUploaderStats.length} staf pengunggah</strong>
              </span>
            </div>
          </div>

          {/* Body Modal: Daftar Staf Pengunggah */}
          <div className="p-4 sm:p-5 overflow-y-auto max-h-[60vh] space-y-3">
            {modalUploaderStats.length === 0 ? (
              <div className="text-center py-10 text-slate-400 space-y-2">
                <Users className="h-10 w-10 text-slate-300 mx-auto animate-pulse" />
                <p className="text-xs font-semibold">
                  Belum ada berkas {selectedElectionConfig?.shortLabel} yang diunggah pada tanggal {activeDay.displayDate}.
                </p>
              </div>
            ) : (
              modalUploaderStats.map((item, idx) => (
                <div
                  key={item.name}
                  className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50/70 via-white to-slate-50/40 p-3.5 sm:p-4 shadow-2xs hover:shadow-sm transition-all"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center shrink-0 border ${
                          idx === 0
                            ? 'bg-amber-100 text-amber-950 border-amber-300'
                            : idx === 1
                            ? 'bg-slate-200 text-slate-700 border-slate-300'
                            : idx === 2
                            ? 'bg-amber-50 text-amber-900 border-amber-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {idx + 1}
                      </div>

                      <div className="min-w-0">
                        <span className="font-black text-xs sm:text-sm text-slate-900 truncate block">
                          {item.name}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-semibold mt-0.5">
                          <span className="inline-flex items-center gap-1 text-emerald-700">
                            <ShieldCheck className="h-3 w-3" />
                            {item.validCount} valid
                          </span>
                          {item.anomalyCount > 0 && (
                            <span className="inline-flex items-center gap-1 text-amber-700">
                              <AlertTriangle className="h-3 w-3" />
                              {item.anomalyCount} anomali
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="inline-flex items-baseline gap-1 px-3 py-1 rounded-xl bg-white border border-slate-200 shadow-2xs">
                        <span className="text-sm sm:text-base font-black text-slate-900">
                          {item.count}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">berkas</span>
                      </div>
                    </div>
                  </div>

                  {/* List Ringkas Berkas yang Diunggah */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100/90 space-y-1.5">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      Sebaran Lokasi TPS:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {item.files.map((fItem, fIdx) => (
                        <a
                          key={`${fItem.file.id}-${fIdx}`}
                          href={fItem.file.url}
                          target="_blank"
                          rel="noreferrer"
                          className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white border border-slate-200/80 text-slate-700 hover:text-kpu-maroon hover:border-rose-300 hover:bg-rose-50/50 shadow-2xs transition-all"
                          title={`Buka file: ${fItem.file.name}`}
                        >
                          <FolderOpen className="h-3 w-3 text-slate-400 group-hover:text-rose-500" />
                          <span>
                            {fItem.kecamatan} · {fItem.desa} (TPS {fItem.tpsNumber})
                          </span>
                          <ExternalLink className="h-2.5 w-2.5 opacity-60 group-hover:opacity-100" />
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Modal */}
          <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-500">
              * Data diambil dari metadata akun pengunggah di Google Drive
            </span>
            <button
              type="button"
              onClick={() => setModalElection(null)}
              className="px-4 py-1.5 rounded-xl font-bold text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 transition cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
