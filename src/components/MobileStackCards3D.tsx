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
  ShieldCheck,
} from 'lucide-react';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { GlobalStats } from '@/types';

interface MobileStackCards3DProps {
  stats: GlobalStats;
}

interface LastMovedInfo {
  id: string;
  dir: 'left' | 'right';
  key: number;
  startX: number;
}

/**
 * Komponen 3D Stack Card Khusus Tampilan Mobile (< sm)
 * Susunan dibuat berantakan/tersebar alami (fanned-out card stack) layaknya
 * kartu fisik yang ditumpuk di atas meja, lengkap dengan animasi count-up
 * yang berputar ulang setiap kali kartu berganti.
 */
export function MobileStackCards3D({ stats }: MobileStackCards3DProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lastMoved, setLastMoved] = useState<LastMovedInfo | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  // Motion value untuk gesture drag real-time pada kartu depan
  const dragX = useMotionValue(0);
  const rotate = useTransform(dragX, [-180, 180], [-16, 16]);
  const opacity = useTransform(dragX, [-220, -100, 0, 100, 220], [0.6, 0.95, 1, 0.95, 0.6]);

  const cards = [
    {
      id: 'wilayah',
      title: 'TOTAL WILAYAH & TPS',
      value: stats.totalTPS,
      unit: 'TPS',
      subtitle: `${stats.totalKecamatan} Kecamatan • 87 Desa/Kel.`,
      icon: FolderOpen,
      borderColor: 'border-l-kpu-maroon',
      glowColor: 'rgba(102, 3, 0, 0.25)',
      iconBg: 'bg-red-50 text-kpu-maroon border-red-100',
      accentColor: '#800000',
      badgeLabel: 'Wilayah',
      footerLabel: '7 Kecamatan Terdata',
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
      badgeLabel: 'Lengkap',
      footerLabel: 'Format 5 Surat Suara',
    },
    {
      id: 'berkas',
      title: 'TOTAL BERKAS C-HASIL',
      value: stats.totalFilesCollected,
      unit: `/ ${stats.expectedFilesTotal.toLocaleString('id-ID')}`,
      subtitle: `${stats.validFilesCount ?? stats.totalFilesCollected} Berkas Sah • ${stats.anomalyFilesCount ?? 0} Anomali${(stats.resolvedFilesCount ?? 0) > 0 ? ` • ${stats.resolvedFilesCount} Dikoreksi` : ''}`,
      icon: FileCheck,
      borderColor: 'border-l-kpu-gold',
      glowColor: 'rgba(255, 191, 0, 0.28)',
      iconBg: 'bg-amber-50 text-amber-600 border-amber-100',
      accentColor: '#d97706',
      badgeLabel: 'Berkas',
      footerLabel: 'Validasi Otomatis Google Drive',
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
      badgeLabel: 'Progres',
      footerLabel: 'Laju Kelengkapan Sekadau',
    },
  ];

  // Fungsi transisi kartu depan meluncur ke samping dan masuk ke belakang
  const triggerTransition = (dir: 'left' | 'right', nextIdx: number) => {
    if (isBusy) return;
    setIsBusy(true);

    const currentCard = cards[currentIndex];
    const curX = dragX.get();

    setLastMoved({
      id: currentCard.id,
      dir,
      key: Date.now(),
      startX: curX,
    });

    // Reset dragX untuk kartu berikutnya
    dragX.set(0);
    setCurrentIndex(nextIdx);

    // Kunci tombol sejenak selama transisi fisik berlangsung
    setTimeout(() => {
      setIsBusy(false);
    }, 550);
  };

  const handleNext = () => {
    const nextIdx = (currentIndex + 1) % cards.length;
    triggerTransition('left', nextIdx);
  };

  const handlePrev = () => {
    const prevIdx = (currentIndex - 1 + cards.length) % cards.length;
    triggerTransition('right', prevIdx);
  };

  const handleJump = (targetIdx: number) => {
    if (targetIdx === currentIndex || isBusy) return;
    const dir = targetIdx > currentIndex ? 'left' : 'right';
    triggerTransition(dir, targetIdx);
  };

  const handleDragEnd = (_: any, info: any) => {
    const threshold = 40;
    const velocityThreshold = 250;

    if (info.offset.x < -threshold || info.velocity.x < -velocityThreshold) {
      handleNext();
    } else if (info.offset.x > threshold || info.velocity.x > velocityThreshold) {
      handlePrev();
    }
  };

  return (
    <div className="w-full [perspective:1200px] select-none pt-2 pb-3 px-2">
      {/* Area Tumpukan Kartu 3D Fanned-Out (3D Card Stack Container) */}
      <div className="relative h-[208px] w-full flex items-center justify-center">
        {cards.map((card, index) => {
          // Hitung jarak posisi dari kartu yang aktif (0 = paling depan, 1 = di belakangnya, dst.)
          const diff = (index - currentIndex + cards.length) % cards.length;
          const isTop = diff === 0;
          const isRecentlyMoved = lastMoved?.id === card.id;

          const IconComponent = card.icon;

          // Animasi kartu yang baru saja dipindah dari depan ke belakang
          if (isRecentlyMoved && diff === cards.length - 1) {
            const sign = lastMoved.dir === 'left' ? -1 : 1;
            const startX = lastMoved.startX !== 0 ? lastMoved.startX : 0;
            const exitX = sign * 290;

            return (
              <motion.div
                key={`${card.id}-${lastMoved.key}`}
                initial={{
                  x: startX,
                  y: 0,
                  scale: 1,
                  rotate: sign * 6,
                  zIndex: 35,
                  opacity: 1,
                }}
                animate={{
                  x: [startX, exitX, exitX, 8],
                  y: [0, -6, 42, 42],
                  scale: [1, 1.02, 0.94, 0.94],
                  rotate: [sign * 6, sign * 14, sign * 4, 3],
                  zIndex: [35, 35, 5, 5],
                  opacity: [1, 1, 0.7, 0.6],
                }}
                transition={{
                  duration: 0.62,
                  times: [0, 0.38, 0.48, 1],
                  ease: [0.22, 1, 0.36, 1],
                }}
                className={`absolute top-0 inset-x-0 h-[152px] rounded-2xl bg-white border border-slate-200/90 border-l-[5px] ${card.borderColor} shadow-[0_12px_28px_-6px_rgba(0,0,0,0.14),0_6px_10px_-4px_rgba(0,0,0,0.08)] p-4 flex flex-col justify-between overflow-hidden pointer-events-none`}
              >
                {/* Glow Corner */}
                <div
                  className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-xl pointer-events-none"
                  style={{ backgroundColor: card.glowColor }}
                />

                {/* Garis Kilau Bevel Atas */}
                <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />

                {/* Isi Kartu */}
                <div className="flex items-start justify-between relative z-10">
                  <div className="space-y-1 pr-2">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      {card.title}
                    </p>
                    <div className="flex items-baseline gap-2">
                      <AnimatedCounter
                        key={`${card.id}-${currentIndex}`}
                        value={card.value}
                        decimals={card.isPercentage ? 1 : 0}
                        suffix={card.isPercentage ? '%' : ''}
                        className="text-2xl font-black text-slate-900 tracking-tight"
                      />
                      {!card.isPercentage && (
                        <span className="text-xs text-slate-500 font-semibold">{card.unit}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 font-medium line-clamp-1">{card.subtitle}</p>
                  </div>

                  <div className={`p-2 rounded-xl shrink-0 shadow-sm border ${card.iconBg}`}>
                    <IconComponent className="h-5 w-5" />
                  </div>
                </div>

                {/* Footer Kartu */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                  <span className="font-semibold text-slate-500 flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    <span>{card.footerLabel}</span>
                  </span>
                  <span className="font-semibold text-slate-500">KPU Sekadau</span>
                </div>
              </motion.div>
            );
          }

          // Transformasi Fanned-Out: Sudut rotasi dan pergeseran X/Y dibuat jelas terbuka & berantakan alami
          let targetX = 0;
          let targetY = 0;
          let targetScale = 1;
          let targetZIndex = 30;
          let targetOpacity = 1;
          let targetRotate = 0;

          if (diff === 0) {
            // Kartu Paling Depan
            targetX = 0;
            targetY = 0;
            targetScale = 1;
            targetZIndex = 30;
            targetOpacity = 1;
            targetRotate = 0;
          } else if (diff === 1) {
            // Kartu ke-2: Miring ke KANAN + geser ke kanan agar sudut & aksen warna jelas terlihat menyembul
            targetX = 14;
            targetY = 16;
            targetScale = 0.98;
            targetZIndex = 20;
            targetOpacity = 0.94;
            targetRotate = 5.5;
          } else if (diff === 2) {
            // Kartu ke-3: Miring ke KIRI + geser ke kiri agar sudut kiri menyembul berlawanan
            targetX = -14;
            targetY = 30;
            targetScale = 0.96;
            targetZIndex = 10;
            targetOpacity = 0.82;
            targetRotate = -5;
          } else {
            // Kartu ke-4 (Paling Bawah): Berada di bawah agak ke kanan dengan sudut sedikit miring
            targetX = 8;
            targetY = 42;
            targetScale = 0.94;
            targetZIndex = 5;
            targetOpacity = 0.65;
            targetRotate = 3;
          }

          return (
            <motion.div
              key={card.id}
              style={{
                zIndex: targetZIndex,
                x: isTop ? dragX : undefined,
                rotate: isTop ? rotate : undefined,
                opacity: isTop ? opacity : targetOpacity,
              }}
              animate={{
                x: isTop ? 0 : targetX,
                y: targetY,
                scale: targetScale,
                rotate: isTop ? 0 : targetRotate,
                transition: { type: 'spring', stiffness: 340, damping: 26 },
              }}
              drag={isTop && !isBusy ? 'x' : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.8}
              onDragEnd={isTop ? handleDragEnd : undefined}
              whileTap={isTop && !isBusy ? { cursor: 'grabbing' } : undefined}
              className={`absolute top-0 inset-x-0 h-[152px] rounded-2xl bg-white border border-slate-200/90 border-l-[5px] ${card.borderColor} shadow-[0_12px_28px_-6px_rgba(0,0,0,0.14),0_6px_10px_-4px_rgba(0,0,0,0.08)] p-4 flex flex-col justify-between overflow-hidden ${
                isTop ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'
              }`}
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
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    {card.title}
                  </p>

                  <div className="flex items-baseline gap-2">
                    <AnimatedCounter
                      key={`${card.id}-${currentIndex}`}
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

                <div className={`p-2 rounded-xl shrink-0 shadow-sm border ${card.iconBg}`}>
                  <IconComponent className="h-5 w-5" />
                </div>
              </div>

              {/* Progress Bar Khusus Kartu Progres Global */}
              {card.id === 'progres' ? (
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden relative border border-slate-200/60 p-0.5 mt-1">
                  <motion.div
                    key={`progress-fill-${currentIndex}`}
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
                /* Footer Kartu Bersih */
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                  <span className="font-semibold text-slate-500 flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    <span>{card.footerLabel}</span>
                  </span>
                  <span className="font-semibold text-slate-500">KPU Sekadau</span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Kontrol Navigasi Terpadu: Tombol Panah & Titik Pagination */}
      <div className="flex items-center justify-center gap-3 mt-2">
        <button
          type="button"
          onClick={handlePrev}
          disabled={isBusy}
          aria-label="Kartu Sebelumnya"
          className="p-2 rounded-full bg-white border border-slate-200/90 shadow-2xs text-slate-700 hover:text-slate-900 active:scale-90 transition-all hover:bg-slate-50 disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Kapsul Titik Pagination */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100/90 rounded-full border border-slate-200/80 shadow-inner">
          {cards.map((card, index) => {
            const isActive = index === currentIndex;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => handleJump(index)}
                disabled={isBusy}
                className="relative flex items-center justify-center transition-all"
                aria-label={`Pilih Kartu ${card.title}`}
              >
                {isActive ? (
                  <motion.div
                    layoutId="activeStackDotPill"
                    className="h-3 px-2.5 rounded-full flex items-center justify-center text-[10px] font-extrabold text-white shadow-xs"
                    style={{ backgroundColor: card.accentColor }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  >
                    {card.badgeLabel}
                  </motion.div>
                ) : (
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-300 hover:bg-slate-400 transition-colors" />
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleNext}
          disabled={isBusy}
          aria-label="Kartu Berikutnya"
          className="p-2 rounded-full bg-white border border-slate-200/90 shadow-2xs text-slate-700 hover:text-slate-900 active:scale-90 transition-all hover:bg-slate-50 disabled:opacity-50"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
