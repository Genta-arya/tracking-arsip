import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Minimize2, Maximize2, Server, FileText, CheckCircle2 } from 'lucide-react';
import { subscribeVpsSyncProgress } from '@/services/firebase';

interface VpsSyncProgress {
  isScanning: boolean;
  currentKecamatan: string;
  currentTps: string;
  currentFile: string;
  processedFiles: number;
  detectedPages: number;
  updatedAt: string;
  lastScanResult?: any;
}

export function VpsSyncToast() {
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState<VpsSyncProgress | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showFinishedToast, setShowFinishedToast] = useState(false);
  const [lastFinishedPages, setLastFinishedPages] = useState(0);

  useEffect(() => {
    // Dengarkan progress VPS secara REAL-TIME dari Firestore
    // Tidak akan pernah diblokir oleh browser (bebas dari error Private IP / Mixed-Content HTTP)
    const unsubscribe = subscribeVpsSyncProgress((data) => {
      if (!data) return;

      if (data.isScanning) {
        setIsScanning(true);
        setProgress(data);
        setShowFinishedToast(false);
      } else {
        if (data.lastScanResult?.status === 'success') {
          setLastFinishedPages(data.lastScanResult.totalPagesDetected || 0);
          setShowFinishedToast(true);
          setTimeout(() => setShowFinishedToast(false), 8000);
        }
        setIsScanning(false);
        setProgress(null);
      }
    });

    return () => unsubscribe();
  }, []);

  if (!isScanning && !showFinishedToast) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end pointer-events-auto">
      <AnimatePresence>
        {isScanning && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={`rounded-2xl border border-indigo-400/40 bg-slate-900/95 text-white backdrop-blur-md shadow-[0_10px_35px_rgba(0,0,0,0.35),0_0_15px_rgba(99,102,241,0.25)] overflow-hidden transition-all duration-300 ${
              isMinimized ? 'w-72 p-3' : 'w-84 sm:w-96 p-4'
            }`}
          >
            {/* Header Toast */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="relative flex items-center justify-center w-7 h-7 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 shrink-0">
                  <RefreshCw className="h-4 w-4 animate-spin text-indigo-400" />
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-black tracking-tight text-white flex items-center gap-1.5 truncate">
                    <span>Sinkronisasi Halaman Berkas</span>
                  </h4>
                  <p className="text-[10px] text-indigo-300/80 font-medium flex items-center gap-1 truncate">
                    <Server className="h-2.5 w-2.5 shrink-0" />
                    <span>VPS Worker 51.79.152.173</span>
                  </p>
                </div>
              </div>

              {/* Tombol Minimize / Maximize */}
              <button
                type="button"
                onClick={() => setIsMinimized((prev) => !prev)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                title={isMinimized ? 'Perbesar Tampilan' : 'Minimize ke Pojok'}
              >
                {isMinimized ? (
                  <Maximize2 className="h-3.5 w-3.5" />
                ) : (
                  <Minimize2 className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            {/* Isi Detail Progress */}
            {!isMinimized ? (
              <div className="mt-3 space-y-2.5 text-xs">
                {/* Indikator Lokasi Pemindaian */}
                <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400 font-medium">Kecamatan:</span>
                    <strong className="text-amber-300 font-bold truncate max-w-[170px]">
                      {progress?.currentKecamatan || 'Memulai...'}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400 font-medium">TPS Aktif:</span>
                    <strong className="text-emerald-400 font-bold truncate max-w-[170px]">
                      {progress?.currentTps || '-'}
                    </strong>
                  </div>
                  <div className="flex items-center gap-1.5 pt-0.5 text-[10px] text-slate-300 font-mono truncate">
                    <FileText className="h-3 w-3 text-indigo-400 shrink-0" />
                    <span className="truncate" title={progress?.currentFile}>
                      {progress?.currentFile || 'Memindai berkas...'}
                    </span>
                  </div>
                </div>

                {/* Counter Statistik */}
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-indigo-950/40 border border-indigo-500/20">
                    <span className="text-[10px] text-indigo-300 block font-semibold">Berkas Dicek</span>
                    <span className="text-sm font-black text-white">{progress?.processedFiles || 0}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/20">
                    <span className="text-[10px] text-emerald-300 block font-semibold">Halaman Ditemukan</span>
                    <span className="text-sm font-black text-emerald-300">{progress?.detectedPages || 0}</span>
                  </div>
                </div>

                {/* Animasi Bar Berjalan */}
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 rounded-full"
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
                  />
                </div>
              </div>
            ) : (
              /* Tampilan Mode Minimized Ringkas */
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className="text-slate-300 truncate max-w-[150px]">
                  {progress?.currentKecamatan} • {progress?.currentTps}
                </span>
                <span className="text-emerald-400 font-black">
                  {progress?.detectedPages || 0} Halaman
                </span>
              </div>
            )}
          </motion.div>
        )}

        {/* Toast Notifikasi Selesai */}
        {showFinishedToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="rounded-2xl border border-emerald-500/40 bg-slate-900/95 text-white backdrop-blur-md shadow-xl p-3.5 flex items-center gap-3 w-80"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h5 className="text-xs font-black text-white">Sinkronisasi Halaman Selesai</h5>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Berhasil mendeteksi <strong>{lastFinishedPages} lembar fisik</strong> berkas C-Hasil.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
