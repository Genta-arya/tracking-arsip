import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, X, RefreshCw, ChevronUp } from 'lucide-react';
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
  // Kontrol buka/tutup floating message
  const [isOpen, setIsOpen] = useState(true);

  // Jika ada timestamp sinkronisasi baru, buka kembali otomatis untuk memberi tahu user
  useEffect(() => {
    if (lastSyncedAt) {
      setIsOpen(true);
    }
  }, [lastSyncedAt]);

  // Format Hari, Tanggal, Jam, dan Detik (WIB)
  const formattedSync = (() => {
    if (!lastSyncedAt) return null;

    try {
      const d = new Date(lastSyncedAt);
      if (isNaN(d.getTime())) return null;

      // Nama Hari
      const hari = d.toLocaleDateString('id-ID', { weekday: 'long' });

      // Tanggal Lengkap
      const tanggal = d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });

      // Jam, Menit, Detik
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
    <AnimatePresence mode="wait">
      {!isOpen ? (
        /* Tombol Pill Kecil Mengambang Saat Diminimalkan */
        <motion.div
          key="minimized-pill"
          initial={{ opacity: 0, scale: 0.8, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 16 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="fixed bottom-4 right-4 z-[9990]"
        >
          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-900/95 text-white hover:bg-slate-900 shadow-2xl border border-slate-700/80 backdrop-blur-md text-xs font-semibold transition group cursor-pointer"
            title="Klik untuk membuka status sinkronisasi terakhir"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Clock className="h-3.5 w-3.5 text-amber-300" />
            <span className="text-[11px]">
              Sync:{' '}
              <strong className="text-amber-200">
                {formattedSync ? formattedSync.waktuLengkap : 'Belum Ada'}
              </strong>
            </span>
            <ChevronUp className="h-3 w-3 text-slate-400 group-hover:text-white transition" />
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
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9990] max-w-sm w-[calc(100vw-2rem)] sm:w-88"
        >
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden text-slate-800">
            {/* Header Toast */}
            <div className="bg-gradient-to-r from-kpu-darkMaroon to-kpu-maroon text-white px-3.5 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <div className="flex items-center gap-1.5 truncate">
                  <Clock className="h-3.5 w-3.5 text-kpu-gold shrink-0" />
                  <span className="text-xs font-extrabold tracking-wide truncate">
                    STATUS SINKRONISASI DRIVE
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full text-rose-200 hover:text-white hover:bg-white/20 transition shrink-0 ml-1 cursor-pointer"
                title="Tutup pesan ini"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Tutup</span>
              </button>
            </div>

            {/* Konten Waktu Sinkronisasi Lengkap */}
            <div className="p-3.5 space-y-2.5 text-xs">
              {formattedSync ? (
                <>
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-1.5">
                    <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
                      <span>Hari & Tanggal:</span>
                      <span className="font-bold text-slate-800">
                        {formattedSync.hari}, {formattedSync.tanggal}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-200/60 pt-1.5">
                      <span className="text-slate-500 text-[11px] font-medium">
                        Jam & Detik:
                      </span>
                      <span className="font-black text-xs sm:text-sm text-kpu-maroon font-mono tracking-wider bg-red-50 px-2 py-0.5 rounded border border-red-200/60">
                        {formattedSync.waktuLengkap}
                      </span>
                    </div>
                  </div>

                  {/* Rincian Tambahan (Kecamatan & Petugas) */}
                  <div className="space-y-1 text-[11px] text-slate-600 px-0.5">
                    {lastSyncedKecamatan && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Kecamatan Terakhir:</span>
                        <strong className="text-slate-800">{lastSyncedKecamatan}</strong>
                      </div>
                    )}
                    {lastSyncedBy && (
                      <div className="flex items-center justify-between truncate">
                        <span className="text-slate-400">Petugas Sync:</span>
                        <span
                          className="font-medium text-slate-700 truncate max-w-[180px]"
                          title={lastSyncedBy}
                        >
                          {lastSyncedBy}
                        </span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs text-center space-y-1">
                  <p className="font-bold">Belum Ada Riwayat Sinkronisasi</p>
                  <p className="text-[11px] text-slate-600">
                    Data belum pernah dipindai dari Google Drive ke Cloud Firestore.
                  </p>
                </div>
              )}

              {/* Action Footer */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                {onOpenSyncModal && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onOpenSyncModal}
                    className="h-7 text-[11px] px-2.5 font-semibold text-kpu-maroon border-red-200 hover:bg-red-50 hover:text-kpu-darkMaroon"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    <span>Pindai Ulang</span>
                  </Button>
                )}

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-[11px] font-medium text-slate-400 hover:text-slate-700 transition ml-auto cursor-pointer"
                >
                  Tutup Pesan
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
