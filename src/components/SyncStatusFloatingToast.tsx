import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, X, RefreshCw, ChevronUp, Zap, FolderSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAutoSync } from '@/context/AutoSyncContext';

interface SyncStatusFloatingToastProps {
  lastSyncedAt: string | null;
  lastSyncedKecamatan?: string;
  lastSyncedBy?: string;
  onOpenSyncModal?: () => void;
}

function formatCountdown(seconds: number): string {
  if (seconds < 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function SyncStatusFloatingToast({
  lastSyncedAt,
  lastSyncedKecamatan,
  lastSyncedBy,
  onOpenSyncModal,
}: SyncStatusFloatingToastProps) {
  // Kontrol buka/tutup floating message (Default tertutup/minimized agar tidak menutupi layar)
  const [isOpen, setIsOpen] = useState(false);

  // Hook Auto-Sync Context untuk hitungan mundur 2 menit & status silent fetch
  const {
    nextSyncCountdown,
    isSyncing,
    triggerManualAutoSync,
    newFilesNotice,
    dismissNewFilesNotice,
  } = useAutoSync();

  // Format Hari, Tanggal, Jam, dan Detik (WIB)
  const formattedSync = (() => {
    if (!lastSyncedAt) return null;

    try {
      const d = new Date(lastSyncedAt);
      if (isNaN(d.getTime())) return null;

      const hari = d.toLocaleDateString('id-ID', { weekday: 'long' });
      const tanggal = d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });

      const pad = (n: number) => String(n).padStart(2, '0');
      const jam = pad(d.getHours());
      const menit = pad(d.getMinutes());
      const detik = pad(d.getSeconds());
      const waktuLengkap = `${jam}:${menit}:${detik} WIB`;

      return {
        hari,
        tanggal,
        waktuLengkap,
        detik,
      };
    } catch {
      return null;
    }
  })();

  return (
    <div className="fixed bottom-4 right-4 z-[9990] flex flex-col items-end pointer-events-none select-none">
      {/* Banner Pop-up Taktil Saat Ditemukan Berkas C-Hasil Baru */}
      <AnimatePresence>
        {newFilesNotice !== null && newFilesNotice > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.92 }}
            className="mb-2 pointer-events-auto bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800 text-white px-3.5 py-2.5 rounded-2xl shadow-[0_8px_24px_rgba(5,150,105,0.35)] border border-emerald-400/60 flex items-center gap-2.5 text-xs font-bold max-w-sm"
          >
            <span className="text-base shrink-0 animate-bounce">✨</span>
            <div className="min-w-0">
              <p className="leading-tight text-white font-extrabold">
                {newFilesNotice} Berkas C-Hasil Baru Masuk!
              </p>
              <p className="text-[10px] text-emerald-100 font-normal">
                Data dashboard telah diperbarui otomatis.
              </p>
            </div>
            <button
              type="button"
              onClick={dismissNewFilesNotice}
              className="ml-auto p-1 text-emerald-200 hover:text-white hover:bg-white/20 rounded-lg transition cursor-pointer"
              title="Tutup notifikasi"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {!isOpen ? (
          /* Tombol Pill Kecil Mengambang: (🟢 Auto-Sync: 02:00) */
          <motion.div
            key="minimized-pill"
            initial={{ opacity: 0, scale: 0.8, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 16 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="pointer-events-auto"
          >
            <motion.button
              type="button"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setIsOpen(true)}
              className={`flex items-center gap-2.5 px-3.5 py-2 rounded-full shadow-[0_8px_20px_rgba(0,0,0,0.3)] backdrop-blur-md text-xs font-semibold transition group cursor-pointer border ${
                isSyncing
                  ? 'bg-amber-950/95 text-amber-200 border-amber-500/70 ring-2 ring-amber-400/40 animate-pulse'
                  : 'bg-slate-900/95 text-white hover:bg-slate-900 border-slate-700/80'
              }`}
              title="Klik untuk membuka status sinkronisasi berkas otomatis"
            >
              {/* Live Status Orb Dot */}
              <span className="relative flex h-2 w-2 shrink-0">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isSyncing ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                ></span>
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isSyncing ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                ></span>
              </span>

              {isSyncing ? (
                <div className="flex items-center gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-amber-300" />
                  <span className="text-[11px] font-black text-amber-200">
                    Fetch Berkas Baru...
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    Auto-Sync:
                  </span>
                  <span className="font-mono font-black text-amber-300 bg-black/50 px-1.5 py-0.5 rounded-md border border-white/10 shadow-inner">
                    {formatCountdown(nextSyncCountdown)}
                  </span>
                </div>
              )}

              <ChevronUp className="h-3 w-3 text-slate-400 group-hover:text-white transition shrink-0 ml-0.5" />
            </motion.button>
          </motion.div>
        ) : (
          /* Kartu Status Sinkronisasi Lengkap */
          <motion.div
            key="expanded-toast"
            initial={{ opacity: 0, scale: 0.9, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 24 }}
            transition={{ type: 'spring', stiffness: 350, damping: 26 }}
            className="pointer-events-auto max-w-sm w-[calc(100vw-2rem)] sm:w-88"
          >
            <div className="bg-white/98 backdrop-blur-md rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.35)] border border-slate-200/90 overflow-hidden text-slate-800">
              {/* Header Toast */}
              <div className="bg-gradient-to-r from-kpu-darkMaroon to-kpu-maroon text-white px-3.5 py-2.5 flex items-center justify-between border-b border-black/20">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <div className="flex items-center gap-1.5 truncate">
                    <Clock className="h-3.5 w-3.5 text-amber-300 shrink-0" />
                    <span className="text-xs font-black tracking-wide truncate uppercase">
                      SINKRONISASI C-HASIL DRIVE
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-full text-rose-200 hover:text-white hover:bg-white/20 transition shrink-0 ml-1 cursor-pointer"
                  title="Tutup panel ini"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Tutup</span>
                </button>
              </div>

              {/* Konten Status Sinkronisasi */}
              <div className="p-3.5 space-y-3 text-xs">
                {/* Status Countdown Box 2 Menit */}
                <div className="bg-gradient-to-r from-emerald-50 via-teal-50/50 to-slate-50 border border-emerald-200/90 rounded-xl p-2.5 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">
                      Auto-Sync 2 Menit (Quick-Fetch)
                    </span>
                    <p className="text-[11px] text-slate-600 font-medium">
                      Pindai berkas baru berikutnya:
                    </p>
                  </div>
                  <div className="font-mono text-base font-black px-2.5 py-1 rounded-lg bg-emerald-800 text-amber-300 shadow-inner border border-emerald-700/60 flex items-center gap-1">
                    {isSyncing ? (
                      <RefreshCw className="h-4 w-4 animate-spin text-amber-300" />
                    ) : (
                      formatCountdown(nextSyncCountdown)
                    )}
                  </div>
                </div>

                {/* Detail Waktu Terakhir */}
                {formattedSync ? (
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-1.5">
                    <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
                      <span>Hari &amp; Tanggal:</span>
                      <span className="font-bold text-slate-800">
                        {formattedSync.hari}, {formattedSync.tanggal}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-200/60 pt-1.5">
                      <span className="text-slate-500 text-[11px] font-medium">
                        Jam &amp; Detik:
                      </span>
                      <span className="font-black text-xs text-kpu-maroon font-mono tracking-wider bg-red-50 px-2 py-0.5 rounded border border-red-200/60">
                        {formattedSync.waktuLengkap}
                      </span>
                    </div>

                    {lastSyncedKecamatan && (
                      <div className="flex items-center justify-between border-t border-slate-200/60 pt-1.5 text-[11px]">
                        <span className="text-slate-400">Wilayah Terakhir:</span>
                        <strong className="text-slate-800">{lastSyncedKecamatan}</strong>
                      </div>
                    )}
                    {lastSyncedBy && (
                      <div className="flex items-center justify-between text-[11px] truncate">
                        <span className="text-slate-400">Petugas Terakhir:</span>
                        <span
                          className="font-medium text-slate-700 truncate max-w-[170px]"
                          title={lastSyncedBy}
                        >
                          {lastSyncedBy}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs text-center space-y-1">
                    <p className="font-bold">Belum Ada Riwayat Pemindaian</p>
                    <p className="text-[11px] text-slate-600">
                      Sistem akan memindai berkas baru secara otomatis sesuai countdown.
                    </p>
                  </div>
                )}

                {/* Action Buttons: Quick-Fetch Sekarang & Pemindaian Lengkap */}
                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="gold"
                      size="sm"
                      onClick={() => triggerManualAutoSync()}
                      disabled={isSyncing}
                      className="h-8 text-[11px] font-bold bg-amber-400 hover:bg-amber-500 text-amber-950 border border-amber-500/40 shadow-xs cursor-pointer"
                    >
                      <Zap className="h-3 w-3 mr-1 text-amber-900" />
                      <span>{isSyncing ? 'Fetching...' : 'Fetch Sekarang'}</span>
                    </Button>

                    {onOpenSyncModal && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsOpen(false);
                          onOpenSyncModal();
                        }}
                        className="h-8 text-[11px] font-semibold text-kpu-maroon border-red-200 hover:bg-red-50 hover:text-kpu-darkMaroon cursor-pointer"
                      >
                        <FolderSearch className="h-3 w-3 mr-1" />
                        <span>Pindai Lengkap</span>
                      </Button>
                    )}
                  </div>

                  <div className="text-center pt-0.5">
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="text-[11px] font-medium text-slate-400 hover:text-slate-700 transition cursor-pointer"
                    >
                      Kecilkan Panel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
