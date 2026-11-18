import { motion } from 'framer-motion';
import {
  Users,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Clock,
  Calendar,
  FileCheck2,
  TrendingUp,
} from 'lucide-react';
import { AnimatedCounter } from '@/components/AnimatedCounter';

export interface UploaderItem {
  name: string;
  total: number;
  valid: number;
  anomaly: number;
  accuracy: string;
  filesPerDay: number;
  activeDays: number;
  avgSecondsPerFile: number;
  avgSecondsPerFileFormatted: string;
  contributionPercent?: string;
}

interface UploaderLeaderboard3DProps {
  uploaders: UploaderItem[];
  totalFiles?: number;
  onViewAnomalies: () => void;
}

export function UploaderLeaderboard3D({
  uploaders,
  totalFiles,
  onViewAnomalies,
}: UploaderLeaderboard3DProps) {
  // Hitung metrik agregat tim / seluruh staf
  const summary = uploaders.reduce(
    (acc, curr) => {
      acc.totalFiles += curr.total;
      acc.validFiles += curr.valid;
      acc.anomalyFiles += curr.anomaly;
      acc.totalActiveDays = Math.max(acc.totalActiveDays, curr.activeDays);
      acc.weightedSpeedSum += curr.avgSecondsPerFile * curr.total;
      return acc;
    },
    {
      totalFiles: 0,
      validFiles: 0,
      anomalyFiles: 0,
      totalActiveDays: 0,
      weightedSpeedSum: 0,
    }
  );

  const teamCount = uploaders.length;
  const overallAvgFilesPerDay =
    summary.totalActiveDays > 0
      ? Math.round(summary.totalFiles / summary.totalActiveDays)
      : 0;
  const overallAvgSpeedSeconds =
    summary.totalFiles > 0
      ? Math.round(summary.weightedSpeedSum / summary.totalFiles)
      : 0;

  const formatShortDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return '0 dtk';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0) return minutes > 0 ? `${hours}j ${minutes}m` : `${hours}j`;
    return minutes > 0 ? `${minutes}m ${secs > 0 ? secs + 's' : ''}`.trim() : `${secs} dtk`;
  };

  const overallAccuracy =
    summary.totalFiles > 0
      ? ((summary.validFiles / summary.totalFiles) * 100).toFixed(1)
      : '100';

  return (
    <div className="relative rounded-2xl sm:rounded-3xl bg-white border border-slate-200/90 shadow-[0_16px_40px_-8px_rgba(0,0,0,0.07),0_4px_12px_rgba(0,0,0,0.03)] overflow-hidden transition-all duration-300">
      {/* Top 3D Specular Highlight Rim */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none z-20" />

      {/* Ambient Top-Right Amber Glow */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* 3D Command Deck Header */}
      <div className="relative bg-gradient-to-r from-slate-50/95 via-white/85 to-slate-50/95 backdrop-blur-xs border-b border-slate-200/80 p-4 sm:p-5 z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            {/* 3D Floating Isometric Amber Gem */}
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 text-amber-950 flex items-center justify-center shadow-[0_4px_12px_rgba(245,158,11,0.35),inset_0_1.5px_1px_rgba(255,255,255,0.7),inset_0_-2px_1px_rgba(180,83,9,0.3)] border border-amber-300/80 shrink-0">
              <Users className="h-5 w-5 drop-shadow-xs" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-300 ring-2 ring-white animate-pulse" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                  Monitoring Aktivitas Tim & Staf Pengunggah di Google Drive
                </h3>
                {teamCount > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100/80 text-amber-900 border border-amber-200/90">
                    {teamCount} Akun Kontributor
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Pemantauan produktivitas harian, kecepatan unggah per berkas, dan ketepatan penamaan arsip tiap staf
              </p>
            </div>
          </div>

          {/* 3D Tactile Push-Button: Lihat Daftar Berkas Anomali */}
          <button
            type="button"
            onClick={onViewAnomalies}
            className="group relative inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-b from-amber-50 via-amber-100 to-amber-200 text-amber-950 border border-amber-300/90 shadow-[0_2px_5px_rgba(245,158,11,0.15),inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-1px_0_rgba(180,83,9,0.2)] hover:from-amber-100 hover:to-amber-300 hover:shadow-[0_4px_12px_rgba(245,158,11,0.25)] active:translate-y-0.5 active:shadow-[0_1px_2px_rgba(245,158,11,0.2)] transition-all cursor-pointer self-start sm:self-auto shrink-0"
            title="Lihat seluruh daftar berkas yang mengalami anomali penamaan"
          >
            <AlertTriangle className="h-3.5 w-3.5 text-amber-700 group-hover:scale-110 transition-transform" />
            <span>Lihat Daftar Berkas Anomali</span>
          </button>
        </div>

        {/* Highlight Cards Redesign: Rangkuman Metrik Tim */}
        {uploaders.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 mt-4 pt-3.5 border-t border-slate-200/70">
            {/* Card 1: Total Berkas Masuk */}
            <div className="relative rounded-xl p-2.5 sm:p-3 bg-gradient-to-br from-slate-50 via-white to-slate-100/50 border border-slate-200/80 shadow-2xs">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200/60">
                  <FileCheck2 className="h-3.5 w-3.5" />
                </div>
                <span className="text-[11px] font-bold text-slate-500">Total Berkas Diunggah</span>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-base sm:text-lg font-black text-slate-900">
                  <AnimatedCounter value={summary.totalFiles} />
                </span>
                <span className="text-[10px] font-semibold text-slate-500">berkas</span>
              </div>
            </div>

            {/* Card 2: Rata-rata Berkas/Hari Tim */}
            <div className="relative rounded-xl p-2.5 sm:p-3 bg-gradient-to-br from-amber-50/50 via-white to-amber-50/30 border border-amber-200/70 shadow-2xs">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-100/80 text-amber-700 border border-amber-300/60">
                  <TrendingUp className="h-3.5 w-3.5" />
                </div>
                <span className="text-[11px] font-bold text-slate-600">Rata-rata Tim/Hari</span>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-base sm:text-lg font-black text-amber-950">
                  <AnimatedCounter value={overallAvgFilesPerDay} />
                </span>
                <span className="text-[10px] font-semibold text-amber-700">berkas / hari</span>
              </div>
            </div>

            {/* Card 3: Rata-rata Waktu Upload Tim per Berkas */}
            <div className="relative rounded-xl p-2.5 sm:p-3 bg-gradient-to-br from-indigo-50/50 via-white to-indigo-50/30 border border-indigo-200/70 shadow-2xs">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-100/80 text-indigo-700 border border-indigo-300/60">
                  <Clock className="h-3.5 w-3.5" />
                </div>
                <span className="text-[11px] font-bold text-slate-600">Rata-rata Waktu Upload</span>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-base sm:text-lg font-black text-indigo-950">
                  {formatShortDuration(overallAvgSpeedSeconds)}
                </span>
                <span className="text-[10px] font-semibold text-indigo-700">/ berkas</span>
              </div>
            </div>

            {/* Card 4: Akurasi Format Tim */}
            <div className="relative rounded-xl p-2.5 sm:p-3 bg-gradient-to-br from-emerald-50/50 via-white to-emerald-50/30 border border-emerald-200/70 shadow-2xs">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-100/80 text-emerald-700 border border-emerald-300/60">
                  <ShieldCheck className="h-3.5 w-3.5" />
                </div>
                <span className="text-[11px] font-bold text-slate-600">Akurasi Penamaan</span>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-base sm:text-lg font-black text-emerald-950">
                  {overallAccuracy}%
                </span>
                <span className="text-[10px] font-semibold text-emerald-700">
                  ({summary.validFiles} valid)
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3D Data Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          {/* 3D Beveled Table Header */}
          <thead className="bg-gradient-to-r from-slate-100/90 via-slate-50 to-slate-100/90 text-slate-600 font-extrabold uppercase tracking-wider text-[10px] border-b border-slate-200/90 select-none">
            <tr>
              <th className="px-4 py-3.5 text-center w-14">No</th>
              <th className="px-4 py-3.5">Nama / Akun Staf Pengunggah</th>
              <th className="px-4 py-3.5 text-center">Total Berkas</th>
              <th className="px-4 py-3.5 text-center">Kontribusi</th>
              <th className="px-4 py-3.5 text-center">Rata-rata / Hari</th>
              <th className="px-4 py-3.5 text-center">Waktu / Berkas</th>
              <th className="px-4 py-3.5 text-center">Tingkat Akurasi</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100/80">
            {uploaders.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Users className="h-8 w-8 text-slate-300 animate-pulse" />
                    <span className="font-medium text-xs">
                      Belum ada data pengunggah. Lakukan pemindaian Google Drive untuk membaca metadata file.
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              uploaders.map((item, idx) => {
                const accNum = parseFloat(item.accuracy);

                // 3D Accuracy Badges
                const accuracyBadge =
                  accNum >= 95
                    ? 'bg-gradient-to-b from-emerald-50 via-emerald-100 to-emerald-200 text-emerald-900 border-emerald-300/90 shadow-[0_2px_5px_rgba(16,185,129,0.15),inset_0_1px_0_rgba(255,255,255,0.9)]'
                    : accNum >= 75
                    ? 'bg-gradient-to-b from-amber-50 via-amber-100 to-amber-200 text-amber-950 border-amber-300/90 shadow-[0_2px_5px_rgba(245,158,11,0.15),inset_0_1px_0_rgba(255,255,255,0.9)]'
                    : 'bg-gradient-to-b from-rose-50 via-rose-100 to-rose-200 text-rose-900 border-rose-300/90 shadow-[0_2px_5px_rgba(225,29,72,0.15),inset_0_1px_0_rgba(255,255,255,0.9)]';

                const computedTotal = totalFiles && totalFiles > 0
                  ? totalFiles
                  : summary.totalFiles > 0
                  ? summary.totalFiles
                  : uploaders.reduce((acc, u) => acc + u.total, 0);
                const percentVal = computedTotal > 0
                  ? ((item.total / computedTotal) * 100).toFixed(1)
                  : '0';

                return (
                  <motion.tr
                    key={item.name}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 + 0.1, duration: 0.2 }}
                    className="hover:bg-gradient-to-r hover:from-amber-50/40 hover:via-white hover:to-amber-50/20 transition-all duration-200 group"
                  >
                    {/* Nomor Urut */}
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center">
                        <span
                          className={`w-6 h-6 rounded-lg font-bold text-xs flex items-center justify-center shadow-2xs border ${
                            idx === 0
                              ? 'bg-gradient-to-b from-amber-100 to-amber-200 text-amber-950 border-amber-300'
                              : idx === 1
                              ? 'bg-slate-200 text-slate-700 border-slate-300'
                              : idx === 2
                              ? 'bg-amber-100/60 text-amber-900 border-amber-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {idx + 1}
                        </span>
                      </div>
                    </td>

                    {/* Uploader Name & Avatar */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 border border-white shadow-2xs flex items-center justify-center font-bold text-xs text-slate-700 shrink-0">
                          {item.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-xs sm:text-sm text-slate-800 group-hover:text-kpu-maroon transition block truncate">
                            {item.name}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {item.activeDays > 0 ? `${item.activeDays} hari aktif unggah` : 'Arsip terekam'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Total Berkas Diunggah + Anomali dipindah ke sini */}
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <div className="inline-flex items-center gap-1 font-black text-xs sm:text-sm text-slate-900">
                          <AnimatedCounter value={item.total} />
                          <span className="text-[11px] font-semibold text-slate-500">file</span>
                        </div>
                        {item.anomaly > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-200 shadow-2xs">
                            <AlertTriangle className="h-2.5 w-2.5 text-amber-700 shrink-0" />
                            <span>{item.anomaly} anomali</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700">
                            <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500 shrink-0" />
                            <span>Semua valid</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Kontribusi Persentase terhadap total yang discan */}
                    <td className="px-4 py-3.5 text-center">
                      <div className="inline-flex flex-col items-center justify-center gap-1 min-w-[70px]">
                        <span className="font-black text-xs sm:text-sm text-slate-800">
                          {item.contributionPercent || percentVal}%
                        </span>
                        <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200/60">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-kpu-maroon rounded-full"
                            style={{ width: `${Math.min(100, parseFloat(item.contributionPercent || percentVal))}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Rata-rata Berkas per Hari */}
                    <td className="px-4 py-3.5 text-center">
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50/70 border border-amber-200/60 text-amber-950 font-bold text-xs">
                        <Calendar className="h-3 w-3 text-amber-600 shrink-0" />
                        <AnimatedCounter value={item.filesPerDay} />
                        <span className="text-[10px] font-medium text-amber-800/80">/hari</span>
                      </div>
                    </td>

                    {/* Kecepatan Upload (Waktu per berkas) */}
                    <td className="px-4 py-3.5 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                            item.avgSecondsPerFile <= 60
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200/90 shadow-[0_1px_3px_rgba(16,185,129,0.12)]'
                              : item.avgSecondsPerFile <= 300
                              ? 'bg-amber-50 text-amber-800 border-amber-200/90 shadow-[0_1px_3px_rgba(217,119,6,0.12)]'
                              : 'bg-rose-50 text-rose-800 border-rose-200/90 shadow-[0_1px_3px_rgba(225,29,72,0.12)]'
                          }`}
                          title={`Rata-rata ${item.avgSecondsPerFileFormatted} per berkas`}
                        >
                          <Clock className="h-3 w-3 opacity-75 shrink-0" />
                          <span>{item.avgSecondsPerFileFormatted}</span>
                          <span className="text-[10px] font-normal opacity-80">/berkas</span>
                        </span>
                      </div>
                    </td>

                    {/* Tingkat Akurasi (3D Pill Badge) */}
                    <td className="px-4 py-3.5 text-center font-black">
                      <span
                        className={`inline-block px-3 py-1 rounded-xl text-[11px] font-black border tracking-tight ${accuracyBadge}`}
                      >
                        {item.accuracy}%
                      </span>
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
