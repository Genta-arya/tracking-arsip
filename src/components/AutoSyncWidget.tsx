import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  Pause,
  Zap,
  Sliders,
  ChevronDown,
} from 'lucide-react';
import { useAutoSync } from '@/context/AutoSyncContext';

function formatCountdown(seconds: number): string {
  if (seconds < 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatTime(date: Date | null): string {
  if (!date) return 'Belum pernah';
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function AutoSyncWidget() {
  const {
    isAutoSyncEnabled,
    intervalMinutes,
    isSyncing,
    nextSyncCountdown,
    lastSyncAt,
    syncCurrentKecamatan,
    syncError,
    toggleAutoSync,
    setIntervalMinutes,
    triggerManualAutoSync,
  } = useAutoSync();

  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Tutup popover jika pengguna mengklik di luar area
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const intervalOptions = [2, 5, 10, 15];

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* Tombol Status Pill / Trigger Popover */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`group relative h-9 px-3 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer shadow-xs ${
          isSyncing
            ? 'bg-amber-500/20 text-amber-200 border-amber-400/50 hover:bg-amber-500/30 ring-2 ring-amber-400/20'
            : isAutoSyncEnabled
            ? 'bg-emerald-950/40 text-emerald-200 border-emerald-500/40 hover:bg-emerald-900/40'
            : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
        }`}
        title="Pengaturan Sinkronisasi Otomatis Google Drive"
        aria-expanded={isOpen}
      >
        {isSyncing ? (
          <>
            <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin text-amber-400" />
            <span className="font-bold text-[11px] sm:text-xs text-amber-300 truncate max-w-[120px] sm:max-w-none">
              {syncCurrentKecamatan ? `Sync: ${syncCurrentKecamatan}` : 'Sinkron Drive...'}
            </span>
          </>
        ) : isAutoSyncEnabled ? (
          <>
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] sm:text-xs font-bold text-emerald-300">
              Auto-Sync
            </span>
            <span className="text-[10px] sm:text-[11px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/30 text-emerald-200">
              {formatCountdown(nextSyncCountdown)}
            </span>
          </>
        ) : (
          <>
            <span className="h-2 w-2 rounded-full bg-slate-400 shrink-0" />
            <span className="text-[11px] sm:text-xs text-slate-300">
              Auto-Sync OFF
            </span>
          </>
        )}

        <ChevronDown
          className={`h-3 w-3 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-white' : ''
          }`}
        />
      </button>

      {/* Popover Dropdown Pengaturan Auto-Sync */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 top-full mt-2 w-80 sm:w-88 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-white/15 shadow-2xl p-4 text-white z-50 overflow-hidden"
          >
            {/* Header Popover */}
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black tracking-wide text-white uppercase">
                    Auto-Sync Google Drive
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Pembaruan otomatis data tanpa klik manual
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <span
                className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${
                  isSyncing
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse'
                    : isAutoSyncEnabled
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                }`}
              >
                {isSyncing ? 'Sinkronisasi' : isAutoSyncEnabled ? 'Aktif' : 'Nonaktif'}
              </span>
            </div>

            {/* Status Panel Detail */}
            <div className="my-3 p-3 rounded-xl bg-white/5 border border-white/10 space-y-2 text-xs">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Clock className="h-3 w-3" /> Hitung Mundur:
                </span>
                <span className="font-mono font-bold text-amber-300 text-xs">
                  {isSyncing
                    ? 'Sedang Memindai...'
                    : isAutoSyncEnabled
                    ? formatCountdown(nextSyncCountdown)
                    : 'Nonaktif'}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Terakhir Sinkron:
                </span>
                <span className="text-slate-200 font-medium">
                  {formatTime(lastSyncAt)}
                </span>
              </div>

              {syncCurrentKecamatan && isSyncing && (
                <div className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg">
                  📍 Memindai: <strong>{syncCurrentKecamatan}</strong>
                </div>
              )}

              {syncError && (
                <div className="text-[10px] text-rose-300 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded-lg flex items-start gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-rose-400 shrink-0 mt-0.5" />
                  <span className="leading-tight">{syncError}</span>
                </div>
              )}
            </div>

            {/* Pilihan Interval */}
            <div className="space-y-1.5 mb-3">
              <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <Sliders className="h-3 w-3 text-amber-400" /> Interval Pemindaian:
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {intervalOptions.map((mins) => {
                  const isSelected = intervalMinutes === mins;
                  return (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setIntervalMinutes(mins)}
                      disabled={!isAutoSyncEnabled || isSyncing}
                      className={`h-8 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-amber-400 text-amber-950 border-amber-300 shadow-sm'
                          : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed'
                      }`}
                    >
                      {mins} Menit
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tombol Aksi: Toggle & Sync Sekarang */}
            <div className="pt-2 border-t border-white/10 flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleAutoSync()}
                disabled={isSyncing}
                className={`flex-1 h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                  isAutoSyncEnabled
                    ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border-rose-500/30'
                    : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border-emerald-500/30'
                }`}
              >
                {isAutoSyncEnabled ? (
                  <>
                    <Pause className="h-3.5 w-3.5" />
                    <span>Jeda Auto-Sync</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" />
                    <span>Aktifkan Auto-Sync</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={async () => {
                  await triggerManualAutoSync();
                }}
                disabled={isSyncing}
                className="h-9 px-3.5 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-amber-950 border border-amber-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                title="Picu sinkronisasi latar belakang saat ini juga"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Sync Sekarang</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
