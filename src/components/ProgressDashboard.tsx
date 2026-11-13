import { useState, useMemo, useId, useEffect } from 'react';
import { motion, type Variants } from 'framer-motion';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  FolderOpen,
  LayoutDashboard,
  CalendarDays,
  ChartNoAxesCombined,
} from 'lucide-react';
import { ScanCompletionSimulator } from '@/components/ScanCompletionSimulator';
import { readDashboardRoute, dashboardTabUrl, DASHBOARD_NAVIGATION_EVENT, type DashboardTab } from '@/utils/dashboardNavigation';
import { useArchiveToday } from '@/hooks/useArchiveToday';
import { ArchiveComparisonCard } from '@/components/ArchiveComparisonCard';
import { buildActivityChart, dailyActivityCounts, formatArchiveDay, isActiveArchiveFile, cumulativeUploadCount, previousActiveDay } from '@/utils/progressAnalytics';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { TiltCard3D } from '@/components/TiltCard3D';
import { TrendChart3D } from '@/components/TrendChart3D';
import { DailyIncomingBreakdownCard } from '@/components/DailyIncomingBreakdownCard';
import { MobileStackCards3D } from '@/components/MobileStackCards3D';
import { KecamatanRanking3D } from '@/components/KecamatanRanking3D';
import { ElectionBreakdown3D } from '@/components/ElectionBreakdown3D';
import { UploaderLeaderboard3D } from '@/components/UploaderLeaderboard3D';
import { TPSRecord, GlobalStats, KecamatanSummary, ELECTION_LIST, FilterState } from '@/types';

interface ProgressDashboardProps {
  records: TPSRecord[];
  stats: GlobalStats;
  kecamatanSummaries: KecamatanSummary[];
  onNavigateToRekap: (filterUpdate?: Partial<FilterState>) => void;
  isDemoMode?: boolean;
}

export function ProgressDashboard({
  records,
  stats,
  kecamatanSummaries,
  onNavigateToRekap,
}: ProgressDashboardProps) {
  const tabsId = useId();
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>(() => typeof window === 'undefined' ? 'summary' : readDashboardRoute(window.location.search).dashboardTab);
  const [visitedTabs, setVisitedTabs] = useState(() => new Set<DashboardTab>([dashboardTab]));
  const openTab = (tab: DashboardTab) => {
    setDashboardTab(tab);
    setVisitedTabs(previous => new Set([...previous, tab]));
    const nextUrl = dashboardTabUrl(window.location.href, tab);
    if (nextUrl !== window.location.href) window.history.pushState({}, '', nextUrl);
  };
  useEffect(() => {
    const navigate = () => {
      const tab = readDashboardRoute(window.location.search).dashboardTab;
      setDashboardTab(tab);
      setVisitedTabs(previous => new Set([...previous, tab]));
    };
    window.addEventListener('popstate', navigate);
    window.addEventListener(DASHBOARD_NAVIGATION_EVENT, navigate);
    return () => {
      window.removeEventListener('popstate', navigate);
      window.removeEventListener(DASHBOARD_NAVIGATION_EVENT, navigate);
    };
  }, []);
  // Pilihan rentang waktu chart
  const [chartRange, setChartRange] = useState<'THIS_MONTH' | 'LAST_30' | 'ALL'>('THIS_MONTH');

  // 1. Ekstrak seluruh file dari seluruh TPS
  const allFiles = useMemo(() => {
    return records.flatMap((r) => r.files).filter(isActiveArchiveFile);
  }, [records]);

  const todayKey = useArchiveToday();
  const countsByDate = useMemo(() => dailyActivityCounts(allFiles), [allFiles, todayKey]);
  const comparisonDay = useMemo(() => previousActiveDay(countsByDate, todayKey), [countsByDate, todayKey]);
  const dailyUploadData = useMemo(() => buildActivityChart(countsByDate, chartRange), [countsByDate, chartRange, todayKey]);
  const uploadStats = useMemo(() => {
    const peak = dailyUploadData.reduce<(typeof dailyUploadData)[number] | null>((best, day) => !best || day.harian > best.harian ? day : best, null);
    return {
      todayUploads: countsByDate.get(todayKey) || 0,
      previousUploads: comparisonDay?.count ?? null,
      previousDate: comparisonDay?.date ?? null,
      peakUpload: peak?.harian || 0,
      peakDate: peak?.date || '-',
      averagePerDay: dailyUploadData.length ? Math.round(dailyUploadData.reduce((total, day) => total + day.harian, 0) / dailyUploadData.length) : 0,
    };
  }, [dailyUploadData, countsByDate, todayKey, comparisonDay]);
  const cumulativeToday = cumulativeUploadCount(countsByDate, todayKey);
  const cumulativePrevious = comparisonDay ? cumulativeUploadCount(countsByDate, comparisonDay.date) : null;

  // 3. Leaderboard Staf Pengunggah (Uploader Insights)
  const uploaderLeaderboard = useMemo(() => {
    const map = new Map<string, { total: number; valid: number; anomaly: number }>();

    allFiles.forEach((file) => {
      const uploader = file.uploader?.trim() || 'Staf KPU Sekadau (Arsip Lama)';
      const cur = map.get(uploader) || { total: 0, valid: 0, anomaly: 0 };
      cur.total += 1;
      if (file.anomalies.length > 0 && !file.isResolved) {
        cur.anomaly += 1;
      } else {
        cur.valid += 1;
      }
      map.set(uploader, cur);
    });

    return Array.from(map.entries())
      .map(([name, data]) => ({
        name,
        total: data.total,
        valid: data.valid,
        anomaly: data.anomaly,
        accuracy: data.total > 0 ? ((data.valid / data.total) * 100).toFixed(1) : '100',
      }))
      .sort((a, b) => b.total - a.total);
  }, [allFiles]);

  // 4. Kelengkapan Berkas per 5 Jenis Surat Suara
  const electionBreakdown = useMemo(() => {
    const counts = {
      PPWP: 0,
      DPR_RI: 0,
      DPD: 0,
      DPRD_PROV: 0,
      DPRD_KAB: 0,
    };

    records.forEach((r) => {
      if (r.slotPPWP) counts.PPWP++;
      if (r.slotDPR_RI) counts.DPR_RI++;
      if (r.slotDPD) counts.DPD++;
      if (r.slotDPRD_PROV) counts.DPRD_PROV++;
      if (r.slotDPRD_KAB) counts.DPRD_KAB++;
    });

    const totalTPS = stats.totalTPS || 1;

    return ELECTION_LIST.map((el) => {
      const collected = counts[el.key] || 0;
      const pct = (collected / totalTPS) * 100;
      const missing = totalTPS - collected;
      return {
        ...el,
        collected,
        total: totalTPS,
        percentage: pct,
        missing,
      };
    });
  }, [records, stats.totalTPS]);

  // 5. Leaderboard Peringkat 7 Kecamatan
  const sortedKecamatans = useMemo(() => {
    return [...kecamatanSummaries].sort((a, b) => b.percentage - a.percentage);
  }, [kecamatanSummaries]);

  // Framer Motion Variants untuk animasi presentasi slide PowerPoint (3D pop & spring)
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.05,
      },
    },
  };

  const cardItemVariants: Variants = {
    hidden: { opacity: 0, y: 40, scale: 0.9, rotateX: 12 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      rotateX: 0,
      transition: { type: 'spring', stiffness: 280, damping: 20 },
    },
  };

  return (
    <div className="space-y-6">
      {/* 1. Baris 4 Kartu KPI Utama - Mobile 3D Swipe Stack vs Desktop 3D Parallax Grid */}
      <div className="sm:hidden">
        <MobileStackCards3D stats={stats} />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 [perspective:1200px]"
      >
        {/* Total TPS - 3D Card Maroon */}
        <motion.div variants={cardItemVariants} className="h-full">
          <TiltCard3D
            borderColorClass="border-l-kpu-maroon"
            glowColor="rgba(102, 3, 0, 0.25)"
          >
            <div className="flex items-start justify-between relative">
              <div className="space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Total Wilayah & TPS
                </p>
                <div className="flex items-baseline gap-2">
                  <AnimatedCounter
                    value={stats.totalTPS}
                    className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight"
                  />
                  <span className="text-xs text-slate-500 font-semibold">TPS</span>
                </div>
                <p className="text-xs text-slate-600 font-medium">
                  {stats.totalKecamatan} Kecamatan • {stats.totalDesa || 87} Desa/Kel.
                </p>
              </div>
              <motion.div
                style={{ transform: 'translateZ(35px)' }}
                whileHover={{ rotate: [0, -12, 12, -6, 0], scale: 1.15 }}
                transition={{ duration: 0.5 }}
                className="p-2.5 rounded-xl bg-red-50 text-kpu-maroon shrink-0 shadow-md border border-red-100"
              >
                <FolderOpen className="h-6 w-6" />
              </motion.div>
            </div>
          </TiltCard3D>
        </motion.div>

        {/* TPS Lengkap (5/5) - 3D Card Emerald */}
        <motion.div variants={cardItemVariants} className="h-full">
          <TiltCard3D
            borderColorClass="border-l-emerald-600"
            glowColor="rgba(16, 185, 129, 0.25)"
          >
            <div className="flex items-start justify-between relative">
              <div className="space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  TPS Lengkap (5/5 File)
                </p>
                <div className="flex items-baseline gap-2">
                  <AnimatedCounter
                    value={stats.completedTPS}
                    className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight"
                  />
                  <span className="text-xs text-slate-500 font-medium">
                    / {stats.totalTPS} TPS
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium flex items-center gap-1">
                  <AnimatedCounter
                    value={(stats.completedTPS / (stats.totalTPS || 1)) * 100}
                    decimals={1}
                    suffix="%"
                    className="font-bold text-emerald-700"
                  />
                  <span>TPS Sudah Siap Arsip</span>
                </p>
              </div>
              <motion.div
                style={{ transform: 'translateZ(35px)' }}
                whileHover={{ rotate: [0, -12, 12, -6, 0], scale: 1.15 }}
                transition={{ duration: 0.5 }}
                className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0 shadow-md border border-emerald-100"
              >
                <CheckCircle2 className="h-6 w-6" />
              </motion.div>
            </div>
          </TiltCard3D>
        </motion.div>

        {/* Total Berkas - 3D Card Gold */}
        <motion.div variants={cardItemVariants} className="h-full">
          <TiltCard3D
            borderColorClass="border-l-kpu-gold"
            glowColor="rgba(255, 191, 0, 0.28)"
          >
            <div className="flex items-start justify-between relative">
              <div className="space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Total Berkas C-Hasil
                </p>
                <div className="flex items-baseline gap-2">
                  <AnimatedCounter
                    value={stats.totalFilesCollected}
                    className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight"
                  />
                  <span className="text-xs text-slate-500 font-medium">
                    / {stats.expectedFilesTotal.toLocaleString('id-ID')}
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium">
                  {stats.validFilesCount ?? stats.totalFilesCollected} Berkas Sah • {stats.anomalyFilesCount ?? 0} Anomali Nama
                  {(stats.resolvedFilesCount ?? 0) > 0 && (
                    <span className="text-emerald-600 font-semibold"> • {stats.resolvedFilesCount} Dikoreksi</span>
                  )}
                </p>
              </div>
              <motion.div
                style={{ transform: 'translateZ(35px)' }}
                whileHover={{ rotate: [0, -12, 12, -6, 0], scale: 1.15 }}
                transition={{ duration: 0.5 }}
                className="p-2.5 rounded-xl bg-amber-50 text-amber-600 shrink-0 shadow-md border border-amber-100"
              >
                <FileCheck className="h-6 w-6" />
              </motion.div>
            </div>
          </TiltCard3D>
        </motion.div>

        {/* Progres Global - 3D Card Orange */}
        <motion.div variants={cardItemVariants} className="h-full">
          <TiltCard3D
            borderColorClass="border-l-kpu-orange"
            glowColor="rgba(233, 80, 7, 0.28)"
          >
            <div className="flex items-start justify-between relative">
              <div className="space-y-1 flex-1 pr-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Progres Global Arsip
                </p>
                <div className="flex items-baseline gap-2">
                  <AnimatedCounter
                    value={stats.completionPercentage}
                    decimals={1}
                    suffix="%"
                    className="text-2xl sm:text-3xl font-black text-kpu-orange tracking-tight"
                  />
                  {stats.anomalyTPS > 0 && (
                    <motion.span
                      initial={{ scale: 0.8 }}
                      animate={{ scale: [1, 1.08, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="text-[11px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold inline-flex items-center gap-1 shadow-2xs"
                    >
                      <AlertTriangle className="h-3 w-3" />
                      {stats.anomalyTPS} Anomali
                    </motion.span>
                  )}
                </div>

                {/* Progress Bar dengan Efek Laser Shimmer Berkelanjutan */}
                <div className="mt-2.5 w-full h-2.5 rounded-full bg-slate-100 overflow-hidden relative shadow-inner border border-slate-200/60 p-0.5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, Math.max(0, stats.completionPercentage))}%` }}
                    transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                    className="h-full rounded-full bg-gradient-to-r from-red-600 via-amber-500 to-yellow-400 relative overflow-hidden shadow-xs"
                  >
                    {/* Sinar Shimmer Meluncur Terus Menerus */}
                    <motion.div
                      animate={{ x: ['-100%', '250%'] }}
                      transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent w-2/3 -skew-x-20"
                    />
                  </motion.div>
                </div>
              </div>
              <motion.div
                style={{ transform: 'translateZ(35px)' }}
                whileHover={{ rotate: [0, -12, 12, -6, 0], scale: 1.15 }}
                transition={{ duration: 0.5 }}
                className="p-2.5 rounded-xl bg-orange-50 text-kpu-orange shrink-0 shadow-md border border-orange-100"
              >
                <TrendingUp className="h-6 w-6" />
              </motion.div>
            </div>
          </TiltCard3D>
        </motion.div>
      </motion.div>

      <div role="tablist" aria-label="Bagian dashboard progres" className="grid grid-cols-3 gap-1 rounded-2xl border border-slate-200 bg-slate-100/80 p-1.5">
        {([{ key: 'summary', label: 'Ringkasan', icon: LayoutDashboard }, { key: 'daily', label: 'Berkas Harian', icon: CalendarDays }, { key: 'analysis', label: 'Analisis', icon: ChartNoAxesCombined }] as const).map((tab, index, tabs) => (
          <button key={tab.key} type="button" role="tab" id={`${tabsId}-${tab.key}-tab`} aria-controls={`${tabsId}-${tab.key}-panel`} aria-selected={dashboardTab === tab.key} tabIndex={dashboardTab === tab.key ? 0 : -1}
            onClick={() => openTab(tab.key)}
            onKeyDown={event => {
              const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : -1;
              if (next < 0) return;
              event.preventDefault();
              openTab(tabs[next].key);
              document.getElementById(`${tabsId}-${tabs[next].key}-tab`)?.focus();
            }}
            className={`flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kpu-gold sm:flex-row sm:gap-2 sm:text-xs ${dashboardTab === tab.key ? 'border border-rose-100 bg-white text-kpu-maroon shadow-sm' : 'border border-transparent text-slate-500 hover:bg-white/60 hover:text-slate-800'}`}><tab.icon className="h-4 w-4 shrink-0" aria-hidden="true" />{tab.label}</button>
        ))}
      </div>

      <div role="tabpanel" id={`${tabsId}-summary-panel`} aria-labelledby={`${tabsId}-summary-tab`} hidden={dashboardTab !== 'summary'} className="space-y-6">
      {visitedTabs.has('summary') && <>
      <div className="grid gap-4 lg:grid-cols-2">
        <ArchiveComparisonCard title="Berkas masuk · dibandingkan hari aktif sebelumnya" current={countsByDate.get(todayKey) || 0} previous={comparisonDay?.count ?? null}
          currentLabel={`Hari ini · ${formatArchiveDay(todayKey)}`} previousLabel={comparisonDay ? `Hari aktif · ${formatArchiveDay(comparisonDay.date)}` : 'Belum ada hari aktif sebelumnya'}
          />
        <ArchiveComparisonCard title="Kumulatif upload · dibandingkan hari aktif sebelumnya" current={cumulativeToday} previous={cumulativePrevious}
          currentLabel={`Sampai ${formatArchiveDay(todayKey)}`} previousLabel={comparisonDay ? `Sampai ${formatArchiveDay(comparisonDay.date)}` : 'Belum ada hari aktif sebelumnya'}
          />
      </div>

      {/* 2. Section 3D Command Deck: Tren Unggah Harian (Parallax Tilt, 3D Pods, Area/Pilar 3D) */}
      <TrendChart3D
        dailyUploadData={dailyUploadData}
        uploadStats={uploadStats}
        totalFilesCollected={stats.totalFilesCollected}
        validFilesCount={stats.validFilesCount}
        anomalyFilesCount={stats.anomalyFilesCount}
        resolvedFilesCount={stats.resolvedFilesCount}
        chartRange={chartRange}
        onRangeChange={setChartRange}
      />
      </>}
      </div>

      <div role="tabpanel" id={`${tabsId}-daily-panel`} aria-labelledby={`${tabsId}-daily-tab`} hidden={dashboardTab !== 'daily'}>
      {visitedTabs.has('daily') && <DailyIncomingBreakdownCard records={records} onNavigateToRekap={onNavigateToRekap} />}
      </div>

      <div role="tabpanel" id={`${tabsId}-analysis-panel`} aria-labelledby={`${tabsId}-analysis-tab`} hidden={dashboardTab !== 'analysis'} className="space-y-6">
      {visitedTabs.has('analysis') && <>
      <ScanCompletionSimulator expectedFiles={stats.expectedFilesTotal} validFiles={stats.validFilesCount} />
      {/* 3. Dua Kolom: Peringkat 7 Kecamatan & Kelengkapan 5 Jenis Surat Suara (3D Command Decks) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kolom Kiri: Peringkat Progres 7 Kecamatan (3D Micro-Cards) */}
        <KecamatanRanking3D
          sortedKecamatans={sortedKecamatans}
          onNavigateToRekap={onNavigateToRekap}
        />

        {/* Kolom Kanan: Distribusi Kelengkapan 5 Jenis Surat Suara (3D Ballot Cards) */}
        <ElectionBreakdown3D
          items={electionBreakdown}
          totalTPS={stats.totalTPS}
          onNavigateToRekap={onNavigateToRekap}
        />
      </div>

      {/* 4. Leaderboard Pengunggah Berkas (Monitoring Staf Pengunggah di Drive 3D) */}
      <UploaderLeaderboard3D
        uploaders={uploaderLeaderboard}
        onViewAnomalies={() => onNavigateToRekap({ status: 'ANOMALY' })}
      />
      </>}
      </div>
    </div>
  );
}
