import { motion } from 'framer-motion';
import { Users, AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { AnimatedCounter } from '@/components/AnimatedCounter';

export interface UploaderItem {
  name: string;
  total: number;
  valid: number;
  anomaly: number;
  accuracy: string;
}

interface UploaderLeaderboard3DProps {
  uploaders: UploaderItem[];
  onViewAnomalies: () => void;
}

export function UploaderLeaderboard3D({
  uploaders,
  onViewAnomalies,
}: UploaderLeaderboard3DProps) {
  return (
    <div className="relative rounded-2xl sm:rounded-3xl bg-white border border-slate-200/90 shadow-[0_16px_40px_-8px_rgba(0,0,0,0.07),0_4px_12px_rgba(0,0,0,0.03)] overflow-hidden transition-all duration-300">
      {/* Top 3D Specular Highlight Rim */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none z-20" />

      {/* Ambient Top-Right Amber Glow */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* 3D Command Deck Header */}
      <div className="relative bg-gradient-to-r from-slate-50/95 via-white/85 to-slate-50/95 backdrop-blur-xs border-b border-slate-200/80 p-4 sm:p-5 z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* 3D Floating Isometric Amber Gem */}
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 text-amber-950 flex items-center justify-center shadow-[0_4px_12px_rgba(245,158,11,0.35),inset_0_1.5px_1px_rgba(255,255,255,0.7),inset_0_-2px_1px_rgba(180,83,9,0.3)] border border-amber-300/80 shrink-0">
              <Users className="h-5 w-5 drop-shadow-xs" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-300 ring-2 ring-white animate-pulse" />
            </div>

            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                Monitoring Aktivitas Tim & Staf Pengunggah di Google Drive
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Memantau siapa saja akun yang mengunggah file scan ke Drive, jumlah berkas, dan tingkat ketepatan penamaan
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
      </div>

      {/* 3D Data Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          {/* 3D Beveled Table Header */}
          <thead className="bg-gradient-to-r from-slate-100/90 via-slate-50 to-slate-100/90 text-slate-600 font-extrabold uppercase tracking-wider text-[10px] border-b border-slate-200/90 select-none">
            <tr>
              <th className="px-4 py-3.5 text-center w-14">No</th>
              <th className="px-4 py-3.5">Nama / Akun Staf Pengunggah</th>
              <th className="px-4 py-3.5 text-center">Total Berkas Diunggah</th>
              <th className="px-4 py-3.5 text-center">Format Sesuai (Normal)</th>
              <th className="px-4 py-3.5 text-center">Ada Anomali Nama</th>
              <th className="px-4 py-3.5 text-center">Tingkat Akurasi</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100/80">
            {uploaders.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-slate-400">
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
                        <span className="w-6 h-6 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shadow-2xs">
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
                        <span className="font-bold text-xs sm:text-sm text-slate-800 group-hover:text-kpu-maroon transition block truncate">
                          {item.name}
                        </span>
                      </div>
                    </td>

                    {/* Total Berkas Diunggah */}
                    <td className="px-4 py-3.5 text-center font-black text-xs sm:text-sm text-slate-900">
                      <div className="inline-flex items-center gap-1">
                        <AnimatedCounter value={item.total} />
                        <span className="text-[11px] font-semibold text-slate-500">file</span>
                      </div>
                    </td>

                    {/* Format Sesuai (Normal) */}
                    <td className="px-4 py-3.5 text-center font-bold text-xs text-emerald-700">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50/70 border border-emerald-200/70">
                        <ShieldCheck className="h-3 w-3 text-emerald-600" />
                        <span>
                          <AnimatedCounter value={item.valid} /> file
                        </span>
                      </div>
                    </td>

                    {/* Ada Anomali Nama */}
                    <td className="px-4 py-3.5 text-center">
                      {item.anomaly > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-b from-amber-50 via-amber-100 to-amber-200 text-amber-950 font-black text-[11px] border border-amber-300/90 shadow-[0_2px_4px_rgba(245,158,11,0.12),inset_0_1px_0_rgba(255,255,255,0.9)]">
                          <AlertTriangle className="h-3 w-3 text-amber-700" />
                          <span>
                            <AnimatedCounter value={item.anomaly} /> file
                          </span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-400 font-semibold text-[11px]">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                          <span>0</span>
                        </span>
                      )}
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

