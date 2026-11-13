import React, { useRef, useState, useMemo } from 'react';
import { motion, useSpring } from 'framer-motion';
import {
  Clock,
  Timer,
  Zap,
  Activity,
  Calendar,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  formatDurationHuman,
  type DailyProcessingTimelineItem,
} from '@/utils/progressAnalytics';

interface ProcessingTimelineDeck3DProps {
  timelineData: DailyProcessingTimelineItem[];
  chartRange: 'THIS_MONTH' | 'LAST_30' | 'ALL';
  onRangeChange: (range: 'THIS_MONTH' | 'LAST_30' | 'ALL') => void;
}

/**
 * Komponen Section Khusus: Linimasa Pengerjaan & Durasi Berkas Scan 3D
 * Menampilkan kalkulasi rata-rata lama pengerjaan per berkas dan total waktu pengerjaan per hari
 * dengan kartu deck 3D Parallax Tilt independen.
 */
export function ProcessingTimelineDeck3D({
  timelineData,
  chartRange,
  onRangeChange,
}: ProcessingTimelineDeck3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });

  // Fisika Spring 3D
  const springConfig = { stiffness: 300, damping: 28, mass: 0.9 };
  const rotateX = useSpring(0, springConfig);
  const rotateY = useSpring(0, springConfig);
  const scale = useSpring(1, springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rX = ((y - centerY) / centerY) * -4;
    const rY = ((x - centerX) / centerX) * 4;

    rotateX.set(rX);
    rotateY.set(rY);

    setGlare({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 0.25,
    });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    scale.set(1.006);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    rotateX.set(0);
    rotateY.set(0);
    scale.set(1);
    setGlare((prev) => ({ ...prev, opacity: 0 }));
  };

  // Metrik statistik linimasa pengerjaan
  const stats = useMemo(() => {
    if (!timelineData || timelineData.length === 0) {
      return {
        totalDurationSeconds: 0,
        overallAvgPerFileSeconds: 0,
        activeDaysCount: 0,
        totalFiles: 0,
        fastestDay: null as DailyProcessingTimelineItem | null,
        busiestDay: null as DailyProcessingTimelineItem | null,
      };
    }
    const totalDuration = timelineData.reduce((acc, curr) => acc + curr.totalDurationSeconds, 0);
    const totalFiles = timelineData.reduce((acc, curr) => acc + curr.fileCount, 0);
    const overallAvg = totalFiles > 0 ? totalDuration / totalFiles : 0;
    const sortedByAvg = [...timelineData].sort((a, b) => a.avgDurationPerFileSeconds - b.avgDurationPerFileSeconds);
    const sortedByDuration = [...timelineData].sort((a, b) => b.totalDurationSeconds - a.totalDurationSeconds);

    return {
      totalDurationSeconds: totalDuration,
      overallAvgPerFileSeconds: Math.round(overallAvg),
      activeDaysCount: timelineData.length,
      totalFiles,
      fastestDay: sortedByAvg[0] || null,
      busiestDay: sortedByDuration[0] || null,
    };
  }, [timelineData]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="[perspective:1400px] select-none"
    >
      <motion.div
        style={{
          rotateX,
          rotateY,
          scale,
          transformStyle: 'preserve-3d',
        }}
        className={`relative rounded-3xl bg-white border border-slate-200/90 shadow-[0_15px_35px_-5px_rgba(0,0,0,0.07),0_10px_20px_-6px_rgba(0,0,0,0.04)] transition-shadow duration-300 overflow-hidden ${
          isHovered ? 'shadow-[0_28px_60px_-12px_rgba(180,83,9,0.18)]' : ''
        }`}
      >
        {/* Dynamic Ambient Corner Backlight */}
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />

        {/* Specular Glass Glare */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-30 rounded-3xl"
          style={{
            background: `radial-gradient(circle 240px at ${glare.x}% ${glare.y}%, rgba(255, 255, 255, 0.55) 0%, rgba(255, 255, 255, 0) 70%)`,
            opacity: glare.opacity,
          }}
        />

        {/* Top Bevel Highlight */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/60 via-yellow-200/90 to-transparent pointer-events-none z-20" />

        {/* Header Section */}
        <div
          style={{ transform: 'translateZ(20px)', transformStyle: 'preserve-3d' }}
          className="bg-slate-50/80 border-b border-slate-200/80 p-4 sm:p-6 relative z-10"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Judul & Badge Status */}
            <div className="flex items-start gap-3">
              <motion.div
                whileHover={{ rotate: [0, -10, 10, -5, 0], scale: 1.12 }}
                transition={{ duration: 0.5 }}
                className="p-3 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-lg shadow-amber-900/20 shrink-0 border border-amber-400/40"
              >
                <Clock className="h-5 w-5" />
              </motion.div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                    Linimasa Pengerjaan & Durasi Berkas Scan
                  </h3>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200 shadow-2xs">
                    <Sparkles className="w-3 h-3 text-amber-600 animate-pulse" />
                    ANALITIK PRODUKTIVITAS
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Kalkulasi estimasi lama pengerjaan berkas dan total waktu kerja tim per hari
                </p>
              </div>
            </div>

            {/* Filter Rentang Waktu */}
            <div className="inline-flex rounded-xl border border-slate-200 bg-white/90 p-1 shadow-2xs backdrop-blur-xs relative self-start lg:self-auto">
              {(
                [
                  { key: 'THIS_MONTH', label: 'Bulan Ini' },
                  { key: 'LAST_30', label: '30 Hari Terakhir' },
                  { key: 'ALL', label: 'Semua Riwayat' },
                ] as const
              ).map(({ key, label }) => {
                const isActive = chartRange === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onRangeChange(key)}
                    className={`relative px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                      isActive ? 'text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeTimelineRangePill"
                        className="absolute inset-0 bg-slate-900 rounded-lg shadow-sm"
                        transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                      />
                    )}
                    <span className="relative z-10">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-4 sm:p-6 space-y-6 relative z-10">
          {/* 4 Pod Mini-Statistik Durasi 3D Terapung */}
          <div
            style={{ transform: 'translateZ(25px)', transformStyle: 'preserve-3d' }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-3.5"
          >
            {/* Pod 1: Rata-Rata Per Berkas (Rose) */}
            <motion.div
              whileHover={{ y: -4, scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="p-3.5 rounded-2xl bg-white border border-slate-200/90 border-l-[4px] border-l-rose-500 shadow-[0_4px_16px_rgba(0,0,0,0.04)] relative overflow-hidden group"
            >
              <div className="flex items-start justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Rata-rata Waktu / Berkas
                </span>
                <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 shadow-2xs group-hover:scale-110 transition-transform">
                  <Timer className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-black text-rose-600">
                  {formatDurationHuman(stats.overallAvgPerFileSeconds)}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-1">
                Laju pengerjaan per berkas
              </p>
            </motion.div>

            {/* Pod 2: Total Waktu Pengerjaan (Amber) */}
            <motion.div
              whileHover={{ y: -4, scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="p-3.5 rounded-2xl bg-white border border-slate-200/90 border-l-[4px] border-l-amber-500 shadow-[0_4px_16px_rgba(0,0,0,0.04)] relative overflow-hidden group"
            >
              <div className="flex items-start justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Total Waktu Pengerjaan
                </span>
                <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 shadow-2xs group-hover:scale-110 transition-transform">
                  <Clock className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-black text-slate-900">
                  {formatDurationHuman(stats.totalDurationSeconds)}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-1 truncate">
                Akumulasi {stats.activeDaysCount} hari aktif ({stats.totalFiles} berkas)
              </p>
            </motion.div>

            {/* Pod 3: Hari Paling Sibuk (Indigo) */}
            <motion.div
              whileHover={{ y: -4, scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="p-3.5 rounded-2xl bg-white border border-slate-200/90 border-l-[4px] border-l-indigo-600 shadow-[0_4px_16px_rgba(0,0,0,0.04)] relative overflow-hidden group"
            >
              <div className="flex items-start justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Hari Kerja Terlama
                </span>
                <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 shadow-2xs group-hover:scale-110 transition-transform">
                  <Activity className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-lg sm:text-xl font-black text-indigo-700 truncate">
                  {stats.busiestDay ? stats.busiestDay.totalDurationFormatted : '-'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-1 truncate">
                {stats.busiestDay ? `${stats.busiestDay.date} (${stats.busiestDay.fileCount} berkas)` : 'Belum ada data'}
              </p>
            </motion.div>

            {/* Pod 4: Laju Tercepat (Emerald) */}
            <motion.div
              whileHover={{ y: -4, scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="p-3.5 rounded-2xl bg-white border border-slate-200/90 border-l-[4px] border-l-emerald-600 shadow-[0_4px_16px_rgba(0,0,0,0.04)] relative overflow-hidden group"
            >
              <div className="flex items-start justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Rata-Rata Tercepat
                </span>
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 shadow-2xs group-hover:scale-110 transition-transform">
                  <Zap className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-black text-emerald-600">
                  {stats.fastestDay ? stats.fastestDay.avgDurationFormatted : '-'}
                </span>
                <span className="text-xs font-semibold text-slate-500">/berkas</span>
              </div>
              <p className="text-[11px] text-emerald-700 font-semibold mt-1 truncate">
                {stats.fastestDay ? `Pada ${stats.fastestDay.date}` : 'Belum ada data'}
              </p>
            </motion.div>
          </div>

          {/* 3D Chart Stage Canvas */}
          <div
            style={{ transform: 'translateZ(18px)', transformStyle: 'preserve-3d' }}
            className="relative w-full rounded-2xl bg-gradient-to-b from-slate-50/90 via-slate-50/40 to-slate-100/80 p-3 sm:p-5 border border-slate-200/80 shadow-inner overflow-hidden"
          >
            {/* Perspective Grid Background */}
            <div
              className="absolute inset-0 pointer-events-none opacity-40"
              style={{
                backgroundImage: `linear-gradient(to right, rgba(203, 213, 225, 0.45) 1px, transparent 1px), linear-gradient(to bottom, rgba(203, 213, 225, 0.45) 1px, transparent 1px)`,
                backgroundSize: '36px 36px',
              }}
            />

            {/* Container Recharts Dual-Axis */}
            <div className="w-full h-72 sm:h-80 relative z-10 [&_.recharts-wrapper]:outline-none [&_.recharts-surface]:outline-none [&_svg]:outline-none [&_*]:outline-none [&_*]:focus:outline-none focus:outline-none">
              {timelineData.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-slate-500">
                  <Calendar className="h-8 w-8 text-slate-300" aria-hidden="true" />
                  <p className="text-sm font-bold">Belum ada aktivitas pengerjaan pada rentang ini</p>
                  <p className="text-xs">Data dihitung dari riwayat berkas masuk di Google Drive.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={timelineData}
                    margin={{ top: 22, right: 15, left: -5, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="timelineBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.9} />
                        <stop offset="50%" stopColor="#d97706" stopOpacity={0.75} />
                        <stop offset="100%" stopColor="#92400e" stopOpacity={0.6} />
                      </linearGradient>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
                      tickLine={false}
                      axisLine={{ stroke: '#cbd5e1' }}
                    />
                    {/* Sumbu Y Kiri: Total Durasi Harian (menit) */}
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 10, fill: '#d97706', fontWeight: 600 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `${Math.round(val / 60)}m`}
                      allowDecimals={false}
                    />
                    {/* Sumbu Y Kanan: Rata-rata Durasi Per Berkas (detik) */}
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 10, fill: '#ef4444', fontWeight: 600 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `${val}s`}
                      allowDecimals={false}
                    />

                    <Tooltip
                      wrapperStyle={{ outline: 'none', zIndex: 50 }}
                      cursor={{ stroke: '#f59e0b', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0]?.payload as DailyProcessingTimelineItem | undefined;
                          if (!item) return null;
                          return (
                            <div
                              style={{ backgroundColor: '#090d16', borderColor: '#334155' }}
                              className="text-white p-3.5 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] text-xs space-y-2 border min-w-[240px] select-none pointer-events-none"
                            >
                              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                <div className="flex items-center gap-1.5 text-amber-400 font-extrabold">
                                  <Clock className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                                  <span>{label}</span>
                                </div>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold">
                                  {item.sessionCount} Sesi Kerja
                                </span>
                              </div>

                              <div className="space-y-1.5 pt-0.5">
                                <div className="flex items-center justify-between gap-4">
                                  <span className="flex items-center gap-1.5 text-slate-300 font-semibold">
                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.9)] shrink-0" />
                                    Total Waktu Pengerjaan:
                                  </span>
                                  <span className="font-black text-amber-300 text-sm">
                                    {item.totalDurationFormatted}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between gap-4">
                                  <span className="flex items-center gap-1.5 text-slate-300 font-semibold">
                                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.9)] shrink-0" />
                                    Rata-rata per Berkas:
                                  </span>
                                  <span className="font-black text-rose-400 text-sm">
                                    {item.avgDurationFormatted} <span className="text-[10px] text-slate-400 font-normal">/berkas</span>
                                  </span>
                                </div>

                                <div className="flex items-center justify-between gap-4 border-t border-slate-800/90 pt-1.5 text-[11px]">
                                  <span className="text-slate-400 font-medium">Volume Berkas Masuk:</span>
                                  <span className="font-bold text-white">
                                    {item.fileCount} berkas
                                  </span>
                                </div>

                                {item.firstUploadTime && item.lastUploadTime && (
                                  <div className="flex items-center justify-between gap-4 text-[10px] text-slate-400 pt-0.5">
                                    <span>Rentang Jam:</span>
                                    <span className="font-mono text-slate-300">
                                      {item.firstUploadTime} - {item.lastUploadTime} WIB
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />

                    {/* Bar Total Durasi Pengerjaan Per Hari */}
                    <Bar
                      yAxisId="left"
                      dataKey="totalDurationSeconds"
                      name="Total Waktu Pengerjaan"
                      fill="url(#timelineBarGrad)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={40}
                    />

                    {/* Line Rata-rata Durasi Per Berkas */}
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="avgDurationPerFileSeconds"
                      name="Rata-rata per Berkas"
                      stroke="#ef4444"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#ef4444', stroke: '#ffffff', strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: '#b91c1c', stroke: '#ffffff', strokeWidth: 2 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Banner Legenda & Ringkasan */}
            <div className="mt-3 flex items-center justify-between flex-wrap gap-2 pt-2.5 border-t border-slate-200/60 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                </span>
                <span className="font-semibold text-slate-700">
                  Rata-rata Keseluruhan:{' '}
                  <strong className="text-amber-800 font-black">
                    {formatDurationHuman(stats.overallAvgPerFileSeconds)}
                  </strong>{' '}
                  per berkas • Total Waktu Kerja: <strong className="text-slate-800 font-bold">{formatDurationHuman(stats.totalDurationSeconds)}</strong>
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-medium text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
                  Total Durasi Harian (Menit)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                  Rata-rata per Berkas (Detik)
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
