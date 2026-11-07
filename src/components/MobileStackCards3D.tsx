import { useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import {
  FolderOpen,
  CheckCircle2,
  FileCheck,
  TrendingUp,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  HandMetal,
} from 'lucide-react';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { GlobalStats } from '@/types';

interface MobileStackCards3DProps {
  stats: GlobalStats;
}

/**
 * Komponen 3D Stack Card Khusus Tampilan Mobile (< sm)
 * Mengubah 4 kartu KPI yang sebelumnya memanjang vertikal menjadi
 * satu tumpukan kartu 3D interaktif yang dapat di-swipe (geser kiri/kanan).
 */
export function MobileStackCards3D({ stats }: MobileStackCards3DProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Motion value untuk gesture drag real-time
  const dragX = useMotionValue(0);
  const rotate = useTransform(dragX, [-180, 180], [-15, 15]);
  const opacity = useTransform(dragX, [-220, -120, 0, 120, 220], [0.4, 0.9, 1, 0.9, 0.4]);

  const cards = [
    {
      id: 'wilayah',
      title: 'TOTAL WILAYAH & TPS',
      value: stats.totalTPS,
      unit: 'TPS',
      subtitle: `${stats.totalKecamatan} Kecamatan • ${stats.totalDesa || 87} Desa/Kel.`,
      icon: FolderOpen,
      borderColor: 'border-l-kpu-maroon',
      glowColor: 'rgba(102, 3, 0, 0.25)',
      iconBg: 'bg-red-50 text-kpu-maroon border-red-100',
      accentColor: '#800000',
      badgeLabel: '1/4 Wilayah',
    },
    {
      id: 'lengkap',
      title: 'TPS LENGKAP (5/5 FILE)',
      value: stats.completedTPS,
      unit: `/ ${stats.totalTPS} TPS`,
      subtitle: `${((stats.completedTPS / (stats.totalTPS || 1)) * 100).toFixed(1)}% TPS Sudah Siap Arsip`,
      icon: CheckCircle2,
      borderColor: 'border-l-emerald-600',
      glowColor: 'rgba(16, 185, 129, 0.25)',
      iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      accentColor: '#059669',
      badgeLabel: '2/4 Lengkap',
    },
    {
      id: 'berkas',
      title: 'TOTAL BERKAS C-HASIL',
      value: stats.totalFilesCollected,
      unit: `/ ${stats.expectedFilesTotal.toLocaleString('id-ID')}`,
      subtitle: `${stats.validFilesCount ?? stats.totalFilesCollected} Berkas Sah • ${stats.anomalyFilesCount ?? 0} Anomali`,
      icon: FileCheck,
      borderColor: 'border-l-kpu-gold',
      glowColor: 'rgba(255, 191, 0, 0.28)',
      iconBg: 'bg-amber-50 text-amber-600 border-amber-100',
      accentColor: '#d97706',
      badgeLabel: '3/4 Berkas',
    },
    {
      id: 'progres',
      title: 'PROGRES GLOBAL ARSIP',
      value: stats.completionPercentage,
      isPercentage: true,
      unit: '%',
      subtitle: stats.anomalyTPS > 0 ? `${stats.anomalyTPS} TPS Terdeteksi Anomali` : 'Seluruh Berkas Terverifikasi',
      icon: TrendingUp,
      borderColor: 'border-l-kpu-orange',
      glowColor: 'rgba(233, 80, 7, 0.28)',
      iconBg: 'bg-orange-50 text-kpu-orange border-orange-100',
      accentColor: '#ea580c',
      badgeLabel: '4/4 Progres',
    },
  ];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  const handleDragEnd = (_: any, info: any) => {
    const threshold = 55;
    const velocityThreshold = 350;

    if (info.offset.x < -threshold || info.velocity.x < -velocityThreshold) {
      handleNext();
    } else if (info.offset.x > threshold || info.velocity.x > velocityThreshold) {
      handlePrev();
    }
  };

  return (
    <div className="w-full [perspective:1000px] select-none py-2">
      {/* Header Bar Kontrol Tumpukan */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
          <span className="p-1 rounded-md bg-red-100 text-kpu-maroon inline-flex items-center justify-center">
            <HandMetal className="h-3.5 w-3.5" />
          </span>
          <span>Kartu KPI Sekadau</span>
          <span className="text-[11px] font-semibold text-slate-400">
            ({currentIndex + 1} dari {cards.length})
          </span>
        </div>

        {/* Tombol Panah Geser Manual */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Kartu Sebelumnya"
            className="p-1.5 rounded-full bg-white border border-slate-200 shadow-2xs text-slate-600 hover:text-slate-900 active:scale-90 transition-transform"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Kartu Berikutnya"
            className="p-1.5 rounded-full bg-white border border-slate-200 shadow-2xs text-slate-600 hover:text-slate-900 active:scale-90 transition-transform"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Area Tumpukan Kartu 3D (3D Card Stack Container) */}
      <div className="relative h-[168px] w-full flex items-center justify-center">
        {cards.map((card, index) => {
          // Hitung jarak posisi dari kartu yang aktif (0 = paling depan, 1 = di belakangnya, dst.)
          const diff = (index - currentIndex + cards.length) % cards.length;
          const isTop = diff === 0;

          // Hitung transformasi 3D berdasarkan kedalaman tumpukan
          let y = 0;
          let scale = 1;
          let zIndex = 40;
          let cardOpacity = 1;
          let rotZ = 0;

          if (diff === 0) {
            y = 0;
            scale = 1;
            zIndex = 40;
            cardOpacity = 1;
            rotZ = 0;
          } else if (diff === 1) {
            y = 12;
            scale = 0.94;
            zIndex = 30;
            cardOpacity = 0.88;
            rotZ = 2;
          } else if (diff === 2) {
            y = 24;
            scale = 0.88;
            zIndex = 20;
            cardOpacity = 0.65;
            rotZ = -2;
          } else {
            y = 34;
            scale = 0.82;
            zIndex = 10;
            cardOpacity = 0.35;
            rotZ = 0;
          }

          const IconComponent = card.icon;

          return (
            <motion.div
              key={card.id}
              style={{
                zIndex,
                x: isTop ? dragX : 0,
                rotate: isTop ? rotate : rotZ,
                opacity: isTop ? opacity : cardOpacity,
              }}
              animate={{
                y,
                scale,
                transition: { type: 'spring', stiffness: 380, damping: 28 },
              }}
              drag={isTop ? 'x' : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.8}
              onDragEnd={isTop ? handleDragEnd : undefined}
              whileTap={isTop ? { cursor: 'grabbing' } : undefined}
              className={`absolute top-0 inset-x-0 h-[155px] rounded-2xl bg-white border border-slate-200/90 border-l-[5px] ${card.borderColor} shadow-[0_12px_28px_-6px_rgba(0,0,0,0.12),0_6px_10px_-4px_rgba(0,0,0,0.06)] p-4 flex flex-col justify-between overflow-hidden cursor-grab active:cursor-grabbing`}
            >
              {/* Dynamic Glow Corner */}
              <div
                className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-xl pointer-events-none"
                style={{ backgroundColor: card.glowColor }}
              />

              {/* Garis Kilau Bevel Atas */}
              <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />

              {/* Isi Kartu */}
              <div className="flex items-start justify-between relative z-10">
                <div className="space-y-1 pr-2">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      {card.title}
                    </p>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600">
                      {card.badgeLabel}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <AnimatedCounter
                      value={card.value}
                      decimals={card.isPercentage ? 1 : 0}
                      suffix={card.isPercentage ? '%' : ''}
                      className="text-2xl font-black text-slate-900 tracking-tight"
                    />
                    {!card.isPercentage && (
                      <span className="text-xs text-slate-500 font-semibold">{card.unit}</span>
                    )}
                    {card.id === 'progres' && stats.anomalyTPS > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold inline-flex items-center gap-0.5">
                        <AlertTriangle className="h-2.5 w-2.5" />
                        {stats.anomalyTPS} Anomali
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 font-medium line-clamp-1">{card.subtitle}</p>
                </div>

                <div
                  className={`p-2 rounded-xl shrink-0 shadow-sm border ${card.iconBg}`}
                >
                  <IconComponent className="h-5 w-5" />
                </div>
              </div>

              {/* Progress Bar Khusus Kartu Progres Global */}
              {card.id === 'progres' ? (
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden relative border border-slate-200/60 p-0.5 mt-1">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, Math.max(0, stats.completionPercentage))}%` }}
                    transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full rounded-full bg-gradient-to-r from-red-600 via-amber-500 to-yellow-400 relative overflow-hidden"
                  >
                    <motion.div
                      animate={{ x: ['-100%', '250%'] }}
                      transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent w-2/3 -skew-x-20"
                    />
                  </motion.div>
                </div>
              ) : (
                /* Petunjuk Swipe di Bawah Kartu */
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                  <span className="flex items-center gap-1">
                    <span>👈 Geser kiri/kanan 👉</span>
                  </span>
                  <span className="font-semibold text-slate-500">KPU Sekadau</span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Indikator Titik Pagination di Bawah Tumpukan */}
      <div className="flex items-center justify-center gap-2 mt-4">
        {cards.map((card, index) => {
          const isActive = index === currentIndex;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => setCurrentIndex(index)}
              className="relative py-1 px-1 flex items-center justify-center transition-all"
              aria-label={`Pilih Kartu ${card.title}`}
            >
              {isActive ? (
                <motion.div
                  layoutId="activeStackDot"
                  className="h-2.5 px-3 rounded-full flex items-center justify-center text-[10px] font-extrabold text-white shadow-xs"
                  style={{ backgroundColor: card.accentColor }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                >
                  {index + 1}
                </motion.div>
              ) : (
                <div className="w-2 h-2 rounded-full bg-slate-300 hover:bg-slate-400 transition-colors" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
