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
  Clock,
  Sparkles,
  BarChart2,
  PieChart as PieChartIcon,
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
import { dailyDistrictActivity, fileActivityDay, formatArchiveDay, isActiveArchiveFile, previousCalendarDay } from '@/utils/progressAnalytics';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { TPSRecord, ElectionType, ELECTION_LIST, FilterState } from '@/types';

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

export function DailyIncomingBreakdownCard({
  records,
  onNavigateToRekap,
}: DailyBreakdownProps) {
  const calendarToday = useArchiveToday();
  const [chartType, setChartType] = useState<'BAR' | 'DONUT'>('BAR');

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
  const previousDayKey = previousCalendarDay(activeDay.rawDate);
  const previousDay = allDays.find(day => day.rawDate === previousDayKey);


  return (
    <div role="region" aria-label="Pantauan Berkas Masuk Per Hari" className="relative rounded-3xl bg-white border border-slate-200/90 shadow-[0_16px_40px_-8px_rgba(0,0,0,0.07),0_4px_12px_rgba(0,0,0,0.03)] overflow-hidden transition-all duration-300">
      {/* 3D Top Bevel Highlight Rim */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/50 via-white/80 to-transparent pointer-events-none z-20" />

      {/* Ambient Radial Accent */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Deck: Judul, Selector Tanggal, dan Switch Grafik */}
      <div className="relative bg-gradient-to-r from-slate-50/95 via-white/90 to-slate-50/95 border-b border-slate-200/80 p-4 sm:p-6 z-10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Judul & Badge Pantauan */}
          <div className="flex items-start gap-3.5">
            <motion.div
              whileHover={{ rotate: [0, -10, 10, -5, 0], scale: 1.1 }}
              transition={{ duration: 0.5 }}
              className="p-3 rounded-2xl bg-gradient-to-br from-kpu-maroon to-red-900 text-white shadow-lg shadow-red-950/20 shrink-0 border border-red-500/30"
            >
              <Calendar className="h-5 w-5" />
            </motion.div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Pantauan Berkas Masuk Per Hari
                </h3>
                {isToday ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    HARI INI
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
                    <Clock className="h-3 w-3 text-slate-500" />
                    ARSIP TANGGAL
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Rincian penerimaan berkas scan C-Hasil per jenis pemilihan (PPWP, DPR RI, DPD, DPRD Prov, DPRD Kab)
              </p>
            </div>
          </div>

          {/* Kontrol Selector Tanggal & Tipe Chart */}
          <div className="flex items-center gap-2.5 flex-wrap self-start lg:self-auto">
            {/* Selector Tanggal (Dropdown + Tombol Panah Navigasi) */}
            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
              <button
                type="button"
                onClick={handlePrevDay}
                disabled={!hasOlder}
                title="Hari Sebelumnya"
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <select
                aria-label="Tanggal pantauan berkas"
                value={activeDay.rawDate}
                disabled={allDays.length === 0}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent font-bold text-xs sm:text-sm text-slate-800 px-2 py-1 outline-none cursor-pointer border-none"
              >
                {allDays.length === 0 && <option value={activeDay.rawDate}>Belum ada aktivitas bertanggal</option>}
                {allDays.map((d) => (
                  <option key={d.rawDate} value={d.rawDate}>
                    {d.dayName}, {d.displayDate} ({d.total} berkas)
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleNextDay}
                disabled={!hasNewer}
                title="Hari Berikutnya"
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Toggle Tipe Chart (Bar vs Donut) */}
            <div className="inline-flex rounded-xl border border-slate-200 bg-white/90 p-1 shadow-2xs">
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

        <ArchiveComparisonCard title="Perubahan penerimaan · tanggal terpilih" current={activeDay.total} previous={previousDay?.total ?? 0}
          currentLabel={formatArchiveDay(activeDay.rawDate)} previousLabel={formatArchiveDay(previousDayKey)}
          note="Dibandingkan sehari sebelumnya menurut kalender WIB, bukan hari aktif sebelumnya. Persentase = (sekarang − sebelumnya) / sebelumnya × 100%. Kenaikan dari 0 ditandai baru, tanpa persentase tak terhingga." />

        {/* 5 Card Mini Breakdown Jenis Pemilihan (Presiden, DPR RI, DPD, DPRD Prov, DPRD Kab) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {ELECTION_LIST.map((el) => {
            const count = activeDay.breakdown[el.key] || 0;
            const locations = districtActivity.byElection[el.key];
            const theme = ELECTION_THEMES[el.key];

            return (
              <motion.div
                key={el.key}
                role="group" aria-label={`Berkas ${el.shortLabel}`}
                whileHover={{ y: -4, scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className={`relative rounded-2xl p-3.5 sm:p-4 bg-white border ${theme.border} shadow-[0_4px_16px_rgba(0,0,0,0.03)] overflow-hidden group cursor-pointer`}
                onClick={() => onNavigateToRekap?.()}
                title={`Klik untuk lihat berkas ${el.label}`}
              >
                {/* Aksen Indikator Warna Surat Suara di Sisi Kiri */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1.5"
                  style={{ backgroundColor: theme.hex }}
                />

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

                <div className="mt-3 border-t border-slate-100 pt-2">
                  <p className="mb-1.5 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-slate-400"><MapPin className="h-3 w-3" aria-hidden="true" />Kecamatan penerima</p>
                  {locations.length > 0 ? <ul className="space-y-1.5">{locations.map(location => <li key={location.name} className="flex items-start justify-between gap-1 text-[10px] leading-relaxed"><span className="min-w-0 break-words font-semibold text-slate-700">{location.name}</span><span className="shrink-0 rounded bg-slate-50 px-1.5 font-bold tabular-nums text-slate-500">{location.count}</span></li>)}</ul> : <p className="text-[10px] text-slate-400">Belum ada penerimaan</p>}
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
                    cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1.5 select-none">
                            <div className="flex items-center gap-2 font-black border-b border-slate-800 pb-1.5">
                              <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: item.color }}
                              />
                              <span>{item.fullName}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4 pt-0.5">
                              <span className="text-slate-300">Jumlah Masuk:</span>
                              <span className="font-black text-amber-300 text-sm">
                                {item.count} berkas
                              </span>
                            </div>
                            <div className="border-t border-slate-700 pt-1.5"><p className="text-slate-300">Kecamatan penerima:</p><ul className="mt-1 space-y-1">{item.locations.map((location: { name: string; count: number }) => <li key={location.name} className="flex justify-between gap-3"><span>{location.name}</span><strong>{location.count} berkas</strong></li>)}</ul></div>
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
              <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-6">
                <div className="w-full sm:w-1/2 h-52 sm:h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const item = payload[0].payload;
                            return (
                              <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1 select-none">
                                <span className="font-bold">{item.fullName}</span>
                                <div className="text-amber-300 font-black">
                                  {item.count} berkas
                                </div>
                                <p className="max-w-xs text-slate-300">{item.locations.map((location: { name: string; count: number }) => `${location.name}: ${location.count}`).join(' · ')}</p>
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
                </div>

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
                        <div className="min-w-0"><span className="font-bold text-slate-800">{item.fullName}</span><p className="mt-0.5 break-words text-[10px] leading-relaxed text-slate-500">{item.locations.map(location => `${location.name}: ${location.count}`).join(' · ')}</p></div>
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
  );
}
