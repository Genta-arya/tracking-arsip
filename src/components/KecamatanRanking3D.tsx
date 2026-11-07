import { motion } from 'framer-motion';
import { BarChart3, ArrowRight, AlertTriangle } from 'lucide-react';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { KecamatanSummary, FilterState } from '@/types';

interface KecamatanRanking3DProps {
  sortedKecamatans: KecamatanSummary[];
  onNavigateToRekap: (filterUpdate?: Partial<FilterState>) => void;
}

export function KecamatanRanking3D({
  sortedKecamatans,
  onNavigateToRekap,
}: KecamatanRanking3DProps) {
  return (
    <div className="relative rounded-2xl sm:rounded-3xl bg-white border border-slate-200/90 shadow-[0_16px_40px_-8px_rgba(0,0,0,0.07),0_4px_12px_rgba(0,0,0,0.03)] overflow-hidden transition-all duration-300">
      {/* Top 3D Specular Highlight Rim */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none z-10" />

      {/* Ambient Top-Right Radial Glow */}
      <div className="absolute -top-14 -right-14 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* 3D Command Deck Header */}
      <div className="relative bg-gradient-to-r from-slate-50/95 via-white/85 to-slate-50/95 backdrop-blur-xs border-b border-slate-200/80 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* 3D Floating Isometric Emerald Gem */}
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-[0_4px_12px_rgba(16,185,129,0.35),inset_0_1.5px_1px_rgba(255,255,255,0.7),inset_0_-2px_1px_rgba(4,120,87,0.3)] border border-emerald-300/80 shrink-0">
              <BarChart3 className="h-4.5 w-4.5 drop-shadow-xs" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-300 ring-2 ring-white animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                Peringkat Progres 7 Kecamatan
              </h3>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                Monitoring laju penyelesaian berkas C-Hasil tiap wilayah
              </p>
            </div>
          </div>

          {/* 3D Pill Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 border border-slate-200/90 shadow-[0_2px_5px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.9)] text-[11px] font-bold text-slate-600 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Berdasarkan % TPS Lengkap</span>
          </div>
        </div>
      </div>

      {/* 3D Micro-Cards List */}
      <div className="p-4 sm:p-5 space-y-3">
        {sortedKecamatans.map((kec, index) => {
          // Rank Styling: Gold (1), Silver (2), Bronze (3), Metallic Slate (4-7)
          const isGold = index === 0;
          const isSilver = index === 1;
          const isBronze = index === 2;

          const medalStyle = isGold
            ? 'bg-gradient-to-b from-amber-300 via-amber-400 to-yellow-600 text-amber-950 shadow-[0_4px_10px_rgba(245,158,11,0.5),inset_0_1.5px_1px_rgba(255,255,255,0.9),inset_0_-2px_1px_rgba(180,83,9,0.3)] border border-amber-200 ring-2 ring-amber-400/25'
            : isSilver
            ? 'bg-gradient-to-b from-slate-100 via-slate-200 to-slate-400 text-slate-800 shadow-[0_4px_10px_rgba(148,163,184,0.4),inset_0_1.5px_1px_rgba(255,255,255,0.9),inset_0_-2px_1px_rgba(71,85,105,0.3)] border border-slate-200 ring-2 ring-slate-300/25'
            : isBronze
            ? 'bg-gradient-to-b from-amber-600 via-amber-700 to-amber-900 text-amber-100 shadow-[0_4px_10px_rgba(180,83,9,0.4),inset_0_1.5px_1px_rgba(255,255,255,0.5),inset_0_-2px_1px_rgba(69,26,3,0.4)] border border-amber-600 ring-2 ring-amber-700/25'
            : 'bg-gradient-to-b from-slate-100 to-slate-200 text-slate-600 shadow-[0_2px_5px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,0.8)] border border-slate-200';

          const spineColor = isGold
            ? 'bg-gradient-to-b from-amber-400 to-yellow-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]'
            : isSilver
            ? 'bg-gradient-to-b from-slate-300 to-slate-400 shadow-[0_0_6px_rgba(148,163,184,0.4)]'
            : isBronze
            ? 'bg-gradient-to-b from-amber-600 to-amber-800 shadow-[0_0_6px_rgba(180,83,9,0.4)]'
            : 'bg-slate-200';

          return (
            <motion.div
              key={kec.name}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.04 + 0.1, duration: 0.25 }}
              whileHover={{ y: -3, scale: 1.012, transition: { duration: 0.16 } }}
              whileTap={{ scale: 0.99 }}
              onClick={() => onNavigateToRekap({ kecamatan: kec.name, desa: 'ALL' })}
              className="relative p-3.5 rounded-2xl border border-slate-200/80 bg-gradient-to-r from-white via-slate-50/40 to-white hover:bg-white hover:border-kpu-maroon/40 shadow-[0_3px_10px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.9)] hover:shadow-[0_12px_28px_-6px_rgba(102,3,0,0.12),0_4px_10px_rgba(0,0,0,0.05)] transition-all cursor-pointer group overflow-hidden"
              title={`Klik untuk melihat rekapitulasi data TPS Kecamatan ${kec.name}`}
            >
              {/* Left 3D Spine Indicator */}
              <div className={`absolute left-0 inset-y-0 w-1.5 ${spineColor} transition-all duration-300 group-hover:w-2`} />

              {/* Top Specular Edge */}
              <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" />

              <div className="flex items-center justify-between gap-2 mb-2 pl-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* 3D Medal Emblem */}
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${medalStyle} transition-transform duration-200 group-hover:scale-105`}>
                    {index + 1}
                    {isGold && (
                      <span className="absolute -top-1.5 -right-1 text-[9px] drop-shadow-xs">
                        👑
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <span className="font-extrabold text-xs sm:text-sm text-slate-800 group-hover:text-kpu-maroon transition truncate block">
                      {kec.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {kec.totalDesa} Desa • {kec.totalTPS} TPS
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="text-right">
                    <span className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-kpu-maroon transition flex items-center justify-end gap-1">
                      <AnimatedCounter value={kec.totalFiles} /> berkas
                    </span>
                    <span className="text-[11px] font-bold text-slate-500 flex items-center justify-end">
                      (<AnimatedCounter value={kec.percentage} decimals={1} suffix="%" />)
                    </span>
                  </div>

                  {/* 3D Arrow Action Pod */}
                  <div className="w-7 h-7 rounded-xl bg-slate-100/80 group-hover:bg-gradient-to-b group-hover:from-kpu-maroon group-hover:to-red-800 group-hover:text-white border border-slate-200/80 group-hover:border-kpu-maroon text-slate-400 flex items-center justify-center shadow-[0_2px_4px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.8)] group-hover:shadow-[0_4px_10px_rgba(102,3,0,0.3)] transition-all duration-200">
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>

              {/* 3D Cylindrical Progress Tube */}
              <div className="w-full h-3 rounded-full bg-slate-100/90 overflow-hidden relative shadow-[inset_0_2px_4px_rgba(0,0,0,0.12),inset_0_-1px_1px_rgba(255,255,255,0.8)] border border-slate-200/60 ml-2 mr-0.5">
                {/* Top Glass Specular Curve */}
                <div className="absolute top-0 inset-x-0 h-[1.5px] bg-white/60 rounded-full z-10 pointer-events-none" />

                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, Math.max(0, kec.percentage))}%` }}
                  transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: index * 0.05 + 0.15 }}
                  className={`h-full rounded-full relative overflow-hidden ${
                    kec.percentage >= 100
                      ? 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                      : kec.percentage >= 50
                      ? 'bg-gradient-to-r from-amber-600 via-orange-500 to-yellow-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                      : 'bg-gradient-to-r from-kpu-maroon via-red-600 to-kpu-orange shadow-[0_0_10px_rgba(225,29,72,0.4)]'
                  }`}
                >
                  {/* Moving 3D Laser Shimmer */}
                  <motion.div
                    animate={{ x: ['-100%', '250%'] }}
                    transition={{ repeat: Infinity, duration: 2.2, ease: 'linear', delay: index * 0.15 }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent w-2/3 -skew-x-12"
                  />
                </motion.div>
              </div>

              {/* Footer Meta: Completed TPS & Anomaly Badge */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pl-2 flex-wrap gap-1">
                <span className="font-medium text-slate-600">
                  <strong className="text-slate-800 font-bold">
                    <AnimatedCounter value={kec.totalFiles} />
                  </strong> berkas scan •{' '}
                  <span className="font-semibold text-slate-700">
                    {kec.completedTPS} dari {kec.totalTPS} TPS lengkap (5/5)
                  </span>
                </span>

                {kec.anomalyTPS > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-gradient-to-r from-rose-50 to-red-50 text-rose-700 border border-rose-200/90 shadow-[0_2px_4px_rgba(225,29,72,0.08),inset_0_1px_0_rgba(255,255,255,0.9)]">
                    <AlertTriangle className="h-3 w-3 text-rose-600" />
                    <span>{kec.anomalyTPS} TPS Anomali</span>
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
