import React, { useState, useRef, useMemo } from 'react';
import { motion, useSpring } from 'framer-motion';
import {
  TrendingUp,
  Sparkles,
  Trophy,
  Activity,
  HardDrive,
  BarChart3,
  Waves,
  Calendar,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
} from 'recharts';
import { AnimatedCounter } from '@/components/AnimatedCounter';

export interface DailyUploadItem {
  date: string;
  rawDate: string;
  harian: number;
  kumulatif: number;
}

export interface UploadStatsData {
  todayUploads: number;
  peakUpload: number;
  peakDate: string;
  averagePerDay: number;
}

interface TrendChart3DProps {
  dailyUploadData: DailyUploadItem[];
  uploadStats: UploadStatsData;
  totalFilesCollected: number;
  validFilesCount?: number;
  anomalyFilesCount?: number;
  chartRange: 'THIS_MONTH' | 'LAST_30' | 'ALL';
  onRangeChange: (range: 'THIS_MONTH' | 'LAST_30' | 'ALL') => void;
}

/**
 * Komponen 3D Trend Chart & Command Deck
 * Menyajikan visualisasi tren unggah harian dengan efek 3D Parallax Tilt,
 * 4 Pod Mini-Statistik 3D, Mode Gelombang Hologram 3D, dan Pilar Isometrik 3D.
 */
export function TrendChart3D({
  dailyUploadData,
  uploadStats,
  totalFilesCollected,
  validFilesCount,
  anomalyFilesCount,
  chartRange,
  onRangeChange,
}: TrendChart3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });
  const [viewMode, setViewMode] = useState<'AREA_3D' | 'BAR_3D'>('AREA_3D');

  // Fisika Spring 3D untuk seluruh deck analitik
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

    // Kemiringan halus maksimal +/- 4.5 derajat agar nyaman dibaca dan tetap terasa 3D
    const rX = ((y - centerY) / centerY) * -4.5;
    const rY = ((x - centerX) / centerX) * 4.5;

    rotateX.set(rX);
    rotateY.set(rY);

    setGlare({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 0.28,
    });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    scale.set(1.008);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    rotateX.set(0);
    rotateY.set(0);
    scale.set(1);
    setGlare((prev) => ({ ...prev, opacity: 0 }));
  };

  // Temukan item puncak tertinggi untuk penanda 3D
  const peakItem = useMemo(() => {
    if (!uploadStats.peakUpload || uploadStats.peakUpload <= 0) return null;
    return dailyUploadData.find((d) => d.harian === uploadStats.peakUpload) || null;
  }, [dailyUploadData, uploadStats.peakUpload]);

  // Komponen Custom Shape Pilar Isometrik 3D (Front, Side, dan Top-Cap Bevel)
  const render3DBar = (props: any) => {
    const { x, y, width, height, payload } = props;
    if (!height || height <= 0) return null;

    const barWidth = Math.max(6, Math.min(width * 0.62, 38));
    const offsetX = (width - barWidth) / 2;
    const bx = x + offsetX;
    const depthX = Math.min(7, barWidth * 0.32);
    const depthY = Math.min(5, barWidth * 0.22);

    const isPeak = payload?.harian === uploadStats.peakUpload && uploadStats.peakUpload > 0;

    return (
      <g className="transition-transform duration-200">
        {/* Sisi Depan (Front Facet) */}
        <rect
          x={bx}
          y={y}
          width={barWidth}
          height={height}
          rx={2}
          fill={isPeak ? 'url(#pillarPeakFront)' : 'url(#pillarFrontGrad)'}
          filter="url(#pillarShadow)"
        />
        {/* Sisi Samping Kanan (Side 3D Depth Facet) */}
        <polygon
          points={`${bx + barWidth},${y} ${bx + barWidth + depthX},${y - depthY} ${bx + barWidth + depthX},${y + height - depthY} ${bx + barWidth},${y + height}`}
          fill={isPeak ? 'url(#pillarPeakSide)' : 'url(#pillarSideGrad)'}
        />
        {/* Sisi Atas (Top Cap Bevel Highlight) */}
        <polygon
          points={`${bx},${y} ${bx + depthX},${y - depthY} ${bx + barWidth + depthX},${y - depthY} ${bx + barWidth},${y}`}
          fill={isPeak ? 'url(#pillarPeakTop)' : 'url(#pillarTopGrad)'}
        />
      </g>
    );
  };

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
          isHovered ? 'shadow-[0_28px_60px_-12px_rgba(102,3,0,0.18)]' : ''
        }`}
      >
        {/* Dynamic Ambient Corner Backlight */}
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-red-600/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        {/* Specular Glass Glare yang mengikuti kursor mouse */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-30 rounded-3xl"
          style={{
            background: `radial-gradient(circle 240px at ${glare.x}% ${glare.y}%, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0) 70%)`,
            opacity: glare.opacity,
          }}
        />

        {/* Top Bevel Highlight (Garis kilau kaca 3D) */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/50 via-white/80 to-transparent pointer-events-none z-20" />

        {/* Header Section dengan Efek Kedalaman 3D */}
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
                className="p-3 rounded-2xl bg-gradient-to-br from-red-600 to-kpu-maroon text-white shadow-lg shadow-red-950/20 shrink-0 border border-red-500/30"
              >
                <TrendingUp className="h-5 w-5" />
              </motion.div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                    Tren Pemindaian & Unggah Berkas Scan Harian
                  </h3>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    LIVE PEMANTAUAN
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Grafik 3D pemantauan penambahan arsip berkas C-Hasil yang masuk ke Google Drive setiap harinya
                </p>
              </div>
            </div>

            {/* Kontrol Interaktif: Mode 3D & Filter Waktu */}
            <div className="flex items-center gap-2.5 flex-wrap self-start lg:self-auto">
              {/* Tombol Alih Mode Tampilan 3D */}
              <div className="inline-flex rounded-xl border border-slate-200 bg-white/90 p-1 shadow-2xs backdrop-blur-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('AREA_3D')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    viewMode === 'AREA_3D'
                      ? 'bg-kpu-maroon text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  title="Visualisasi Gelombang Laser Hologram 3D"
                >
                  <Waves className="h-3.5 w-3.5" />
                  <span>Area 3D</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('BAR_3D')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    viewMode === 'BAR_3D'
                      ? 'bg-kpu-maroon text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  title="Visualisasi Pilar Isometrik 3D Kristal"
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  <span>Pilar 3D</span>
                </button>
              </div>

              {/* Filter Rentang Waktu */}
              <div className="inline-flex rounded-xl border border-slate-200 bg-white/90 p-1 shadow-2xs backdrop-blur-xs relative">
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
                          layoutId="activeTrendRangePill"
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
        </div>

        {/* Content Section */}
        <div className="p-4 sm:p-6 space-y-6 relative z-10">
          {/* 4 Pod Mini-Statistik 3D Terapung (3D Floating Pods) */}
          <div
            style={{ transform: 'translateZ(25px)', transformStyle: 'preserve-3d' }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-3.5"
          >
            {/* Pod 1: Upload Hari Ini (Maroon) */}
            <motion.div
              whileHover={{ y: -4, scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="p-3.5 rounded-2xl bg-white border border-slate-200/90 border-l-[4px] border-l-kpu-maroon shadow-[0_4px_16px_rgba(0,0,0,0.04)] relative overflow-hidden group"
            >
              <div className="flex items-start justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Upload Hari Ini
                </span>
                <div className="p-1.5 rounded-lg bg-red-50 text-kpu-maroon shadow-2xs group-hover:scale-110 transition-transform">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <AnimatedCounter
                  value={uploadStats.todayUploads}
                  className="text-xl sm:text-2xl font-black text-slate-900"
                />
                <span className="text-xs font-semibold text-slate-500">berkas</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">Pemindaian aktif</p>
            </motion.div>

            {/* Pod 2: Puncak Tertinggi (Emerald) */}
            <motion.div
              whileHover={{ y: -4, scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="p-3.5 rounded-2xl bg-white border border-slate-200/90 border-l-[4px] border-l-emerald-600 shadow-[0_4px_16px_rgba(0,0,0,0.04)] relative overflow-hidden group"
            >
              <div className="flex items-start justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Puncak Tertinggi
                </span>
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 shadow-2xs group-hover:scale-110 transition-transform">
                  <Trophy className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <AnimatedCounter
                  value={uploadStats.peakUpload}
                  className="text-xl sm:text-2xl font-black text-emerald-600"
                />
                <span className="text-xs font-semibold text-slate-500">berkas</span>
              </div>
              <p className="text-[11px] text-emerald-700 font-semibold mt-0.5 truncate">
                Rekor: {uploadStats.peakDate || '-'}
              </p>
            </motion.div>

            {/* Pod 3: Rata-Rata Upload (Gold/Amber) */}
            <motion.div
              whileHover={{ y: -4, scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="p-3.5 rounded-2xl bg-white border border-slate-200/90 border-l-[4px] border-l-amber-500 shadow-[0_4px_16px_rgba(0,0,0,0.04)] relative overflow-hidden group"
            >
              <div className="flex items-start justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Rata-rata Upload
                </span>
                <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 shadow-2xs group-hover:scale-110 transition-transform">
                  <Activity className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <AnimatedCounter
                  value={uploadStats.averagePerDay}
                  className="text-xl sm:text-2xl font-black text-amber-600"
                />
                <span className="text-xs font-semibold text-slate-500">berkas/hari</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">Laju harian arsip</p>
            </motion.div>

            {/* Pod 4: Total Arsip di Drive (Indigo/Sapphire) */}
            <motion.div
              whileHover={{ y: -4, scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="p-3.5 rounded-2xl bg-white border border-slate-200/90 border-l-[4px] border-l-indigo-600 shadow-[0_4px_16px_rgba(0,0,0,0.04)] relative overflow-hidden group"
            >
              <div className="flex items-start justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Total Arsip di Drive
                </span>
                <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 shadow-2xs group-hover:scale-110 transition-transform">
                  <HardDrive className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <AnimatedCounter
                  value={totalFilesCollected}
                  className="text-xl sm:text-2xl font-black text-slate-900"
                />
                <span className="text-xs font-semibold text-slate-500">file</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                {validFilesCount ?? totalFilesCollected} sah • {anomalyFilesCount ?? 0} anomali
              </p>
            </motion.div>
          </div>

          {/* 3D Chart Stage Canvas */}
          <div
            style={{ transform: 'translateZ(18px)', transformStyle: 'preserve-3d' }}
            className="relative w-full rounded-2xl bg-gradient-to-b from-slate-50/90 via-slate-50/40 to-slate-100/80 p-3 sm:p-5 border border-slate-200/80 shadow-inner overflow-hidden"
          >
            {/* Cybernetic Perspective Grid Background Floor */}
            <div
              className="absolute inset-0 pointer-events-none opacity-40"
              style={{
                backgroundImage: `linear-gradient(to right, rgba(203, 213, 225, 0.45) 1px, transparent 1px), linear-gradient(to bottom, rgba(203, 213, 225, 0.45) 1px, transparent 1px)`,
                backgroundSize: '36px 36px',
              }}
            />

            {/* Animated Laser Scanning Beam yang menyapu garis waktu pemindaian */}
            <motion.div
              animate={{ x: ['-2%', '102%'] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
              className="absolute top-0 bottom-8 w-[2px] bg-gradient-to-b from-transparent via-red-500/70 to-transparent pointer-events-none z-20 shadow-[0_0_12px_rgba(239,68,68,0.8)]"
            />

            {/* Container Recharts dengan Ketinggian Dinamis */}
            <div className="w-full h-72 sm:h-80 relative z-10">
              <ResponsiveContainer width="100%" height="100%">
                {viewMode === 'AREA_3D' ? (
                  <AreaChart data={dailyUploadData} margin={{ top: 22, right: 15, left: -15, bottom: 5 }}>
                    <defs>
                      {/* Gradient Kedalaman Gelombang Harian 3D */}
                      <linearGradient id="colorUpload3D" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#991b1b" stopOpacity={0.65} />
                        <stop offset="35%" stopColor="#800000" stopOpacity={0.4} />
                        <stop offset="70%" stopColor="#450a0a" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#1e0505" stopOpacity={0.0} />
                      </linearGradient>

                      {/* Gradient Gelombang Kumulatif Emas 3D */}
                      <linearGradient id="colorKumulatif3D" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.35} />
                        <stop offset="70%" stopColor="#d97706" stopOpacity={0.1} />
                        <stop offset="100%" stopColor="#b45309" stopOpacity={0.0} />
                      </linearGradient>

                      {/* Filter Bayangan 3D Pada Jalur Gelombang */}
                      <filter id="waveShadow3D" x="-10%" y="-10%" width="120%" height="140%">
                        <feDropShadow dx="0" dy="10" stdDeviation="6" floodColor="#800000" floodOpacity="0.25" />
                      </filter>

                      {/* Filter Laser Glow 3D */}
                      <filter id="laserGlow3D" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3.5" result="glow" />
                        <feMerge>
                          <feMergeNode in="glow" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
                      tickLine={false}
                      axisLine={{ stroke: '#cbd5e1' }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />

                    {/* Tooltip Kaca 3D Holografik */}
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="backdrop-blur-xl bg-slate-950/92 text-white p-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] text-xs space-y-2 border border-slate-700/80 min-w-[210px]">
                              <div className="flex items-center gap-1.5 text-amber-400 font-black border-b border-slate-800 pb-2">
                                <Calendar className="h-3.5 w-3.5 text-amber-400" />
                                <span>{label}</span>
                              </div>
                              <div className="space-y-1.5 pt-0.5">
                                <div className="flex items-center justify-between gap-4">
                                  <span className="flex items-center gap-1.5 text-slate-300">
                                    <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
                                    Upload Hari Ini:
                                  </span>
                                  <span className="font-extrabold text-white text-sm">
                                    {payload[0]?.value} <span className="text-[11px] font-normal text-slate-400">berkas</span>
                                  </span>
                                </div>
                                {payload[1] && (
                                  <div className="flex items-center justify-between gap-4 border-t border-slate-800/80 pt-1.5">
                                    <span className="flex items-center gap-1.5 text-amber-200">
                                      <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
                                      Total Kumulatif:
                                    </span>
                                    <span className="font-extrabold text-amber-300 text-sm">
                                      {payload[1]?.value} <span className="text-[11px] font-normal text-amber-200/70">file</span>
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

                    {/* Area Gelombang Harian dengan Filter Kedalaman 3D */}
                    <Area
                      type="monotone"
                      dataKey="harian"
                      name="Upload Harian"
                      stroke="#800000"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorUpload3D)"
                      filter="url(#waveShadow3D)"
                    />

                    {/* Area Gelombang Kumulatif Emas */}
                    <Area
                      type="monotone"
                      dataKey="kumulatif"
                      name="Total Kumulatif"
                      stroke="#d97706"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      fillOpacity={1}
                      fill="url(#colorKumulatif3D)"
                    />

                    {/* Penanda Titik Puncak Rekor 3D */}
                    {peakItem && (
                      <ReferenceDot
                        x={peakItem.date}
                        y={peakItem.harian}
                        r={6}
                        fill="#10b981"
                        stroke="#ffffff"
                        strokeWidth={2.5}
                      />
                    )}
                  </AreaChart>
                ) : (
                  <BarChart data={dailyUploadData} margin={{ top: 22, right: 15, left: -15, bottom: 5 }}>
                    <defs>
                      {/* Gradient Pilar Isometrik Normal */}
                      <linearGradient id="pillarFrontGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#dc2626" />
                        <stop offset="50%" stopColor="#800000" />
                        <stop offset="100%" stopColor="#450a0a" />
                      </linearGradient>
                      <linearGradient id="pillarSideGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#991b1b" />
                        <stop offset="50%" stopColor="#450a0a" />
                        <stop offset="100%" stopColor="#1e0505" />
                      </linearGradient>
                      <linearGradient id="pillarTopGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#fef08a" />
                        <stop offset="100%" stopColor="#f59e0b" />
                      </linearGradient>

                      {/* Gradient Pilar Isometrik Puncak (Emerald Rekor) */}
                      <linearGradient id="pillarPeakFront" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#047857" />
                      </linearGradient>
                      <linearGradient id="pillarPeakSide" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#059669" />
                        <stop offset="100%" stopColor="#064e3b" />
                      </linearGradient>
                      <linearGradient id="pillarPeakTop" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#a7f3d0" />
                        <stop offset="100%" stopColor="#34d399" />
                      </linearGradient>

                      <filter id="pillarShadow" x="-20%" y="-10%" width="140%" height="130%">
                        <feDropShadow dx="0" dy="6" stdDeviation="4" floodColor="#000000" floodOpacity="0.2" />
                      </filter>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
                      tickLine={false}
                      axisLine={{ stroke: '#cbd5e1' }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />

                    {/* Tooltip Kaca 3D Holografik */}
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="backdrop-blur-xl bg-slate-950/92 text-white p-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] text-xs space-y-2 border border-slate-700/80 min-w-[210px]">
                              <div className="flex items-center gap-1.5 text-amber-400 font-black border-b border-slate-800 pb-2">
                                <Calendar className="h-3.5 w-3.5 text-amber-400" />
                                <span>{label}</span>
                              </div>
                              <div className="space-y-1.5 pt-0.5">
                                <div className="flex items-center justify-between gap-4">
                                  <span className="flex items-center gap-1.5 text-slate-300">
                                    <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
                                    Upload Harian:
                                  </span>
                                  <span className="font-extrabold text-white text-sm">
                                    {payload[0]?.value} <span className="text-[11px] font-normal text-slate-400">berkas</span>
                                  </span>
                                </div>
                                {payload[1] && (
                                  <div className="flex items-center justify-between gap-4 border-t border-slate-800/80 pt-1.5">
                                    <span className="flex items-center gap-1.5 text-amber-200">
                                      <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
                                      Total Kumulatif:
                                    </span>
                                    <span className="font-extrabold text-amber-300 text-sm">
                                      {payload[1]?.value} <span className="text-[11px] font-normal text-amber-200/70">file</span>
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

                    {/* Pilar Isometrik 3D */}
                    <Bar
                      dataKey="harian"
                      name="Upload Harian"
                      shape={render3DBar}
                      isAnimationActive
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Banner Indikator Rekor Puncak di Atas Grafik */}
            {peakItem && (
              <div className="mt-3 flex items-center justify-between flex-wrap gap-2 pt-2.5 border-t border-slate-200/60 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </span>
                  <span className="font-semibold text-slate-700">
                    Rekor Pemindaian Tertinggi:{' '}
                    <strong className="text-emerald-700 font-black">{uploadStats.peakUpload} berkas</strong> pada {peakItem.date}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-medium text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-kpu-maroon inline-block" />
                    Upload Harian
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block border border-dashed border-amber-600" />
                    Total Kumulatif
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
