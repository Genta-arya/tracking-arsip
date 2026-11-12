import { useSharedDriveScan } from '@/context/SharedDriveScanContext';
import { DocumentScanner } from '@/components/DocumentScanner';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, X, ChevronUp, FolderSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SyncStatusFloatingToastProps {
  lastSyncedAt: string | null;
  lastSyncedKecamatan?: string;
  lastSyncedBy?: string;
  onOpenSyncModal?: () => void;
}

export function SyncStatusFloatingToast({
  lastSyncedAt,
  lastSyncedKecamatan,
  lastSyncedBy,
  onOpenSyncModal,
}: SyncStatusFloatingToastProps) {
  const sharedScan = useSharedDriveScan();
  // Kontrol buka/tutup floating message (Default tertutup/minimized agar tidak menutupi layar)
  const [isOpen, setIsOpen] = useState(false);

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
      <DocumentScanner />
      <AnimatePresence mode="wait">
        {!isOpen ? (
          /* Tombol Pill Kecil Mengambang: Info Last Sync Realtime */
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
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-full shadow-[0_8px_20px_rgba(0,0,0,0.3)] backdrop-blur-md text-xs font-semibold transition group cursor-pointer border bg-slate-900/95 text-white hover:bg-slate-900 border-slate-700/80"
              title="Klik untuk membuka status sinkronisasi terakhir"
            >
              {/* Live Status Indicator Dot */}
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>

              <div className="flex items-center gap-1.5 text-[11px]">
                <Clock className="h-3.5 w-3.5 text-amber-300" />
                <span className="text-slate-300 font-medium">Sinkron:</span>
                <span className="font-mono font-bold text-amber-300">
                  {formattedSync ? formattedSync.waktuLengkap : 'Real-time Aktif'}
                </span>
              </div>

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
                      STATUS SINKRONISASI C-HASIL
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
                {/* Status Cloud Auto-Push Aktif */}
                <div className="bg-gradient-to-r from-emerald-50 via-teal-50/50 to-slate-50 border border-emerald-200/90 rounded-xl p-2.5 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">
                      Google Cloud Auto-Push (24 Jam)
                    </span>
                    <p className="text-[11px] text-slate-600 font-medium">
                      Status koneksi server:
                    </p>
                  </div>
                  <div className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-emerald-800 text-emerald-100 shadow-inner border border-emerald-700/60 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Live 24 Jam</span>
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
                        Jam &amp; Detik Terakhir:
                      </span>
                      <span className="font-black text-xs text-kpu-maroon font-mono tracking-wider bg-red-50 px-2 py-0.5 rounded border border-red-200/60">
                        {formattedSync.waktuLengkap}
                      </span>
                    </div>

                    {lastSyncedKecamatan && (
                      <div className="flex items-center justify-between border-t border-slate-200/60 pt-1.5 text-[11px]">
                        <span className="text-slate-400">Wilayah Diperbarui:</span>
                        <strong className="text-slate-800 truncate max-w-[170px]" title={lastSyncedKecamatan}>
                          {lastSyncedKecamatan}
                        </strong>
                      </div>
                    )}
                    {lastSyncedBy && (
                      <div className="flex items-center justify-between text-[11px] truncate border-t border-slate-200/60 pt-1.5">
                        <span className="text-slate-400">Oleh:</span>
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
                    <p className="font-bold">Menunggu Pemindaian Pertama</p>
                    <p className="text-[11px] text-slate-600">
                      Sistem Google Cloud akan menyinkronkan data secara otomatis.
                    </p>
                  </div>
                )}

                {/* Tombol Pindai Lengkap Manual */}
                {onOpenSyncModal && (
                  <div className="pt-1 border-t border-slate-100 flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsOpen(false);
                        onOpenSyncModal();
                      }}
                      className="w-full h-8 text-[11px] font-semibold text-kpu-maroon border-red-200 hover:bg-red-50 hover:text-kpu-darkMaroon cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <FolderSearch className="h-3.5 w-3.5" />
                      <span>{sharedScan.scan ? `Drive sedang dipindai · ${sharedScan.scan.progress}%` : 'Buka Pemindaian Manual Drive'}</span>
                    </Button>

                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="text-[11px] font-medium text-slate-400 hover:text-slate-700 transition cursor-pointer"
                      >
                        Kecilkan Panel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
