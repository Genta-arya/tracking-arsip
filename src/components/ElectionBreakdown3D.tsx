import { motion } from 'framer-motion';
import { FileText, ArrowRight, CheckCircle2, Target } from 'lucide-react';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { ElectionType, FilterState } from '@/types';

export interface ElectionBreakdownItem {
  key: ElectionType;
  label: string;
  code: string;
  collected: number;
  total: number;
  percentage: number;
  missing: number;
}

interface ElectionBreakdown3DProps {
  items: ElectionBreakdownItem[];
  totalTPS: number;
  onNavigateToRekap: (filterUpdate?: Partial<FilterState>) => void;
}

// Konfigurasi visual 3D untuk 5 jenis surat suara resmi Pemilu
const BALLOT_THEMES: Record<
  ElectionType,
  {
    badgeClass: string;
    spineColor: string;
    barGradient: string;
    glowShadow: string;
  }
> = {
  PPWP: {
    badgeClass:
      'bg-gradient-to-b from-rose-600 via-red-700 to-rose-900 text-white shadow-[0_3px_8px_rgba(190,18,60,0.35),inset_0_1px_1px_rgba(255,255,255,0.4)] border border-rose-500/80',
    spineColor: 'bg-gradient-to-b from-rose-600 to-red-800 shadow-[0_0_8px_rgba(225,29,72,0.5)]',
    barGradient: 'bg-gradient-to-r from-rose-700 via-red-600 to-rose-400',
    glowShadow: 'shadow-[0_0_10px_rgba(225,29,72,0.4)]',
  },
  DPR_RI: {
    badgeClass:
      'bg-gradient-to-b from-amber-400 via-yellow-500 to-amber-700 text-amber-950 font-black shadow-[0_3px_8px_rgba(217,119,6,0.35),inset_0_1px_1px_rgba(255,255,255,0.7)] border border-amber-300',
    spineColor: 'bg-gradient-to-b from-amber-400 to-yellow-600 shadow-[0_0_8px_rgba(245,158,11,0.5)]',
    barGradient: 'bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-400',
    glowShadow: 'shadow-[0_0_10px_rgba(245,158,11,0.4)]',
  },
  DPD: {
    badgeClass:
      'bg-gradient-to-b from-red-500 via-rose-600 to-red-800 text-white shadow-[0_3px_8px_rgba(220,38,38,0.35),inset_0_1px_1px_rgba(255,255,255,0.4)] border border-red-400/80',
    spineColor: 'bg-gradient-to-b from-red-500 to-rose-700 shadow-[0_0_8px_rgba(239,68,68,0.5)]',
    barGradient: 'bg-gradient-to-r from-red-600 via-rose-500 to-red-400',
    glowShadow: 'shadow-[0_0_10px_rgba(239,68,68,0.4)]',
  },
  DPRD_PROV: {
    badgeClass:
      'bg-gradient-to-b from-blue-500 via-blue-600 to-indigo-800 text-white shadow-[0_3px_8px_rgba(37,99,235,0.35),inset_0_1px_1px_rgba(255,255,255,0.4)] border border-blue-400/80',
    spineColor: 'bg-gradient-to-b from-blue-500 to-indigo-700 shadow-[0_0_8px_rgba(59,130,246,0.5)]',
    barGradient: 'bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400',
    glowShadow: 'shadow-[0_0_10px_rgba(37,99,235,0.4)]',
  },
  DPRD_KAB: {
    badgeClass:
      'bg-gradient-to-b from-emerald-500 via-emerald-600 to-teal-800 text-white shadow-[0_3px_8px_rgba(16,185,129,0.35),inset_0_1px_1px_rgba(255,255,255,0.4)] border border-emerald-400/80',
    spineColor: 'bg-gradient-to-b from-emerald-500 to-teal-700 shadow-[0_0_8px_rgba(16,185,129,0.5)]',
    barGradient: 'bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-400',
    glowShadow: 'shadow-[0_0_10px_rgba(16,185,129,0.4)]',
  },
};

export function ElectionBreakdown3D({
  items,
  totalTPS,
  onNavigateToRekap,
}: ElectionBreakdown3DProps) {
  return (
    <div className="relative rounded-2xl sm:rounded-3xl bg-white border border-slate-200/90 shadow-[0_16px_40px_-8px_rgba(0,0,0,0.07),0_4px_12px_rgba(0,0,0,0.03)] overflow-hidden transition-all duration-300">
      {/* Top 3D Specular Highlight Rim */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none z-10" />

      {/* Ambient Top-Right Radial Glow */}
      <div className="absolute -top-14 -right-14 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* 3D Command Deck Header */}
      <div className="relative bg-gradient-to-r from-slate-50/95 via-white/85 to-slate-50/95 backdrop-blur-xs border-b border-slate-200/80 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* 3D Floating Isometric Sapphire Gem */}
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-800 text-white flex items-center justify-center shadow-[0_4px_12px_rgba(37,99,235,0.35),inset_0_1.5px_1px_rgba(255,255,255,0.7),inset_0_-2px_1px_rgba(30,58,138,0.3)] border border-blue-300/80 shrink-0">
              <FileText className="h-4.5 w-4.5 drop-shadow-xs" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-blue-300 ring-2 ring-white animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                Kelengkapan 5 Jenis Pemilihan
              </h3>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                Distribusi arsip berkas C-Hasil 5 surat suara Pemilu
              </p>
            </div>
          </div>

          {/* 3D Target Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 border border-slate-200/90 shadow-[0_2px_5px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.9)] text-[11px] font-bold text-slate-700 shrink-0">
            <Target className="h-3 w-3 text-blue-600" />
            <span>Target: {totalTPS} TPS</span>
          </div>
        </div>
      </div>

      {/* 3D Ballot Micro-Cards List */}
      <div className="p-4 sm:p-5 space-y-3.5">
        {items.map((item, idx) => {
          const theme = BALLOT_THEMES[item.key] || BALLOT_THEMES.PPWP;

          return (
            <motion.div
              key={item.key}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 + idx * 0.05, duration: 0.3 }}
              whileHover={{ y: -3, scale: 1.012, transition: { duration: 0.16 } }}
              className="relative p-3.5 rounded-2xl border border-slate-200/80 bg-gradient-to-r from-white via-slate-50/40 to-white hover:bg-white hover:border-slate-300 shadow-[0_3px_10px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.9)] hover:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.08),0_4px_10px_rgba(0,0,0,0.04)] transition-all overflow-hidden group"
            >
              {/* Left 3D Spine Indicator matching ballot color */}
              <div className={`absolute left-0 inset-y-0 w-1.5 ${theme.spineColor} transition-all duration-300 group-hover:w-2`} />

              {/* Top Specular Edge */}
              <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" />

              <div className="flex items-center justify-between text-xs mb-2 pl-2">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xs sm:text-sm text-slate-800 tracking-tight">
                    {item.label}
                  </span>
                  {/* 3D Ballot Code Badge */}
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-md font-black tracking-wide ${theme.badgeClass}`}
                  >
                    {item.code}
                  </span>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-black text-xs sm:text-sm text-slate-900">
                    <AnimatedCounter value={item.percentage} decimals={1} suffix="%" />
                  </span>
                  <span className="text-[11px] text-slate-500 ml-1.5 font-bold">
                    (<AnimatedCounter value={item.collected} />/{item.total})
                  </span>
                </div>
              </div>

              {/* 3D Cylindrical Progress Tube */}
              <div className="w-full h-3 rounded-full bg-slate-100/90 overflow-hidden relative shadow-[inset_0_2px_4px_rgba(0,0,0,0.12),inset_0_-1px_1px_rgba(255,255,255,0.8)] border border-slate-200/60 ml-2 mr-0.5">
                {/* Top Glass Specular Curve */}
                <div className="absolute top-0 inset-x-0 h-[1.5px] bg-white/60 rounded-full z-10 pointer-events-none" />

                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, Math.max(0, item.percentage))}%` }}
                  transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.15 + idx * 0.06 }}
                  className={`h-full rounded-full ${theme.barGradient} ${theme.glowShadow} relative overflow-hidden`}
                >
                  {/* Moving 3D Laser Shimmer */}
                  <motion.div
                    animate={{ x: ['-100%', '250%'] }}
                    transition={{ repeat: Infinity, duration: 2.3, ease: 'linear', delay: idx * 0.18 }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent w-2/3 -skew-x-12"
                  />
                </motion.div>
              </div>

              {/* Footer Meta: Collected count & 3D Tactile Filter Button */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pl-2">
                <span className="font-medium text-slate-600">
                  <strong className="text-slate-800 font-bold">
                    <AnimatedCounter value={item.collected} />
                  </strong> berkas terkumpul
                </span>

                {item.missing > 0 ? (
                  <button
                    type="button"
                    onClick={() =>
                      onNavigateToRekap({
                        missingElection: item.key,
                        status: 'ALL',
                      })
                    }
                    className="group/btn relative inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-bold bg-gradient-to-b from-rose-50 via-rose-100 to-rose-200 text-rose-800 border border-rose-300/80 shadow-[0_2px_5px_rgba(225,29,72,0.12),inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-1px_0_rgba(190,18,60,0.2)] hover:from-rose-100 hover:to-rose-300 hover:shadow-[0_4px_10px_rgba(225,29,72,0.2)] active:translate-y-0.5 active:shadow-[0_1px_2px_rgba(225,29,72,0.15)] transition-all cursor-pointer"
                    title={`Filter seluruh TPS yang belum memiliki berkas ${item.label}`}
                  >
                    <span>Kurang {item.missing} TPS</span>
                    <ArrowRight className="h-3 w-3 group-hover/btn:translate-x-0.5 transition-transform" />
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold bg-gradient-to-b from-emerald-50 to-emerald-100 text-emerald-800 border border-emerald-300 shadow-[0_2px_4px_rgba(16,185,129,0.1),inset_0_1px_0_rgba(255,255,255,0.9)]">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    <span>100% Lengkap</span>
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

