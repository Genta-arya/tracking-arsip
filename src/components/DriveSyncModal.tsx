import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Play, Layers, Maximize2, Minus } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { GasKecamatanItem, fetchKecamatanList, scanKecamatanFolder } from '@/services/driveService';
import { saveKecamatanScanToFirestore, fetchAllFileOverrides } from '@/services/firebase';
import { RawTpsData, AppConfig } from '@/types';
import { Scan3DAnimation } from '@/components/Scan3DAnimation';
import { AnimatedCounter } from '@/components/AnimatedCounter';

interface DriveSyncModalProps {
  open: boolean;
  onClose: () => void;
  config: AppConfig;
  onSyncComplete: (updatedData: RawTpsData[]) => void;
  currentRawData: RawTpsData[];
  onReopenModal?: () => void;
}

export function DriveSyncModal({
  open,
  onClose,
  config,
  onSyncComplete,
  currentRawData,
  onReopenModal,
}: DriveSyncModalProps) {
  const [kecamatanFolders, setKecamatanFolders] = useState<GasKecamatanItem[]>([]);
  const [isFetchingFolders, setIsFetchingFolders] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [currentScanningKec, setCurrentScanningKec] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<'info' | 'error' | 'success'>('info');

  // Ambil daftar folder kecamatan saat modal dibuka
  const handleLoadKecamatanList = async () => {
    if (!config.gasWebAppUrl || !config.rootFolderId) {
      setStatusMessage('Koneksi Google Drive belum diaktifkan. Silakan hubungi admin teknis KPU.');
      setStatusType('error');
      return;
    }

    setIsFetchingFolders(true);
    setStatusMessage(null);
    try {
      const list = await fetchKecamatanList(config.gasWebAppUrl, config.rootFolderId);
      setKecamatanFolders(list);
      setStatusMessage(`Terdeteksi ${list.length} folder Kecamatan di Google Drive.`);
      setStatusType('success');
    } catch (err: any) {
      setStatusMessage(`Gagal membaca folder kecamatan: ${err.message}`);
      setStatusType('error');
    } finally {
      setIsFetchingFolders(false);
    }
  };

  useEffect(() => {
    if (open && config.gasWebAppUrl && config.rootFolderId && kecamatanFolders.length === 0) {
      handleLoadKecamatanList();
    }
  }, [open, config.gasWebAppUrl, config.rootFolderId]);

  // Pindai 1 Kecamatan secara spesifik
  const handleScanSingleKecamatan = async (kec: GasKecamatanItem) => {
    setIsScanning(true);
    setScanProgress(15);
    setCurrentScanningKec(kec.name);
    setStatusMessage(`Sedang memindai folder "${kec.name}" di Google Drive...`);
    setStatusType('info');

    // Animasi simulasi progres bertahap saat menunggu respons Apps Script
    const progressInterval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev < 75) return prev + Math.floor(Math.random() * 8) + 4;
        return prev;
      });
    }, 600);

    let firestoreError: string | null = null;

    try {
      const scannedKecData = await scanKecamatanFolder(config.gasWebAppUrl, kec.id);

      clearInterval(progressInterval);
      setScanProgress(80);

      // Pertahankan status anomali yang sudah diperbaiki/ditetapkan berdasarkan compare file.id
      const overrides = await fetchAllFileOverrides();
      currentRawData.forEach((tps) => {
        tps.files.forEach((f) => {
          if ((f.overrideElection || f.isResolved) && !overrides.has(f.id)) {
            overrides.set(f.id, f);
          }
        });
      });

      scannedKecData.forEach((tps) => {
        tps.files.forEach((f) => {
          const savedOverride = overrides.get(f.id);
          if (savedOverride) {
            f.overrideElection = savedOverride.overrideElection;
            f.isResolved = savedOverride.isResolved;
            f.resolutionNote = savedOverride.resolutionNote;
            f.resolvedAt = savedOverride.resolvedAt;
            f.resolvedBy = savedOverride.resolvedBy;
          }
        });
      });

      setScanProgress(90);

      // Simpan ke Cloud Firestore terpusat agar langsung sinkron ke seluruh user lain
      setStatusMessage(`Menyimpan data "${kec.name}" ke Cloud Firestore untuk seluruh staf...`);
      try {
        await saveKecamatanScanToFirestore(kec.name, scannedKecData);
      } catch (dbErr: any) {
        console.error('Gagal menyimpan ke Firestore:', dbErr);
        firestoreError = dbErr.message || String(dbErr);
      }

      setScanProgress(100);

      // Gabungkan dengan data kecamatan lainnya yang sudah ada di lokal
      const otherKecData = currentRawData.filter(
        (r) => r.kecamatan.toLowerCase() !== kec.name.toLowerCase()
      );
      const updated = [...otherKecData, ...scannedKecData];

      onSyncComplete(updated);

      if (firestoreError) {
        setStatusMessage(
          `Pindai Drive sukses, TETAPI GAGAL disimpan ke Firestore: "${firestoreError}". Periksa Security Rules di Firebase Console.`
        );
        setStatusType('error');
      } else {
        setStatusMessage(`Selesai! Data Kecamatan ${kec.name} berhasil disimpan ke Cloud Firestore dan terbarui di semua perangkat.`);
        setStatusType('success');
      }
    } catch (err: any) {
      clearInterval(progressInterval);
      setStatusMessage(`Gagal memindai ${kec.name}: ${err.message}`);
      setStatusType('error');
    } finally {
      clearInterval(progressInterval);
      setIsScanning(false);
      setCurrentScanningKec(null);
    }
  };

  // Pindai Seluruh Kecamatan secara berurutan (Batch Scan)
  const handleScanAllKecamatan = async () => {
    if (kecamatanFolders.length === 0) return;

    setIsScanning(true);
    setScanProgress(0);
    setStatusType('info');
    let combinedData = [...currentRawData];
    const firestoreErrors: string[] = [];

    // Ambil semua override anomali tersimpan
    const overrides = await fetchAllFileOverrides();
    currentRawData.forEach((tps) => {
      tps.files.forEach((f) => {
        if ((f.overrideElection || f.isResolved) && !overrides.has(f.id)) {
          overrides.set(f.id, f);
        }
      });
    });

    for (let i = 0; i < kecamatanFolders.length; i++) {
      const kec = kecamatanFolders[i];
      setCurrentScanningKec(kec.name);
      setStatusMessage(`(${i + 1}/${kecamatanFolders.length}) Memindai & menyimpan Kecamatan ${kec.name}...`);
      setScanProgress(Math.round(((i) / kecamatanFolders.length) * 100));

      try {
        const scannedKecData = await scanKecamatanFolder(config.gasWebAppUrl, kec.id);

        // Pertahankan status anomali berdasarkan compare file.id
        scannedKecData.forEach((tps) => {
          tps.files.forEach((f) => {
            const savedOverride = overrides.get(f.id);
            if (savedOverride) {
              f.overrideElection = savedOverride.overrideElection;
              f.isResolved = savedOverride.isResolved;
              f.resolutionNote = savedOverride.resolutionNote;
              f.resolvedAt = savedOverride.resolvedAt;
              f.resolvedBy = savedOverride.resolvedBy;
            }
          });
        });

        // Simpan per kecamatan ke Cloud Firestore
        try {
          await saveKecamatanScanToFirestore(kec.name, scannedKecData);
        } catch (dbErr: any) {
          console.error(`Gagal menyimpan ${kec.name} ke Firestore:`, dbErr);
          if (!firestoreErrors.includes(dbErr.message || String(dbErr))) {
            firestoreErrors.push(dbErr.message || String(dbErr));
          }
        }

        // Hapus data lama kecamatan ini dan ganti dengan data baru
        combinedData = combinedData.filter(
          (r) => r.kecamatan.toLowerCase() !== kec.name.toLowerCase()
        );
        combinedData.push(...scannedKecData);
      } catch (err: any) {
        console.error(`Gagal memindai ${kec.name}:`, err);
      }
    }

    setScanProgress(100);
    onSyncComplete(combinedData);
    setIsScanning(false);
    setCurrentScanningKec(null);

    if (firestoreErrors.length > 0) {
      setStatusMessage(
        `Pemindaian Drive selesai, TETAPI Firestore menolak penyimpanan: "${firestoreErrors.join(', ')}". Pastikan Rules di Firebase Console sudah di-publish.`
      );
      setStatusType('error');
    } else {
      setStatusMessage('Selesai memindai seluruh Kecamatan! Seluruh data berhasil tersimpan di Cloud Firestore & langsung terbarui di semua user.');
      setStatusType('success');
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent onClose={onClose} className="max-w-2xl w-full max-h-[92vh] sm:max-h-[85vh] flex flex-col p-0 rounded-xl sm:rounded-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-kpu-darkMaroon to-kpu-maroon text-white p-4 sm:p-5 rounded-t-xl sm:rounded-t-2xl pr-16 relative">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/10 shrink-0">
                <Layers className="h-5 w-5 text-kpu-gold" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-white leading-tight">
                  Sinkronisasi Pemindaian Google Drive
                </DialogTitle>
                <DialogDescription className="text-[11px] sm:text-xs text-rose-200 mt-0.5">
                  Pindai per kecamatan atau seluruh kecamatan untuk memperbarui data
                </DialogDescription>
              </div>
            </div>

            {/* Tombol Minimize di Header saat proses scan sedang aktif */}
            {isScanning && (
              <button
                type="button"
                onClick={onClose}
                className="absolute right-12 top-4 z-20 rounded-full p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition cursor-pointer"
                title="Minimalkan ke latar belakang"
              >
                <Minus className="h-4 w-4" />
                <span className="sr-only">Minimalkan</span>
              </button>
            )}
          </div>

        {/* Content */}
        <div className="p-3.5 sm:p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          
          {/* Status Alert dengan AnimatePresence */}
          <AnimatePresence mode="wait">
            {statusMessage && (
              <motion.div
                key={statusMessage}
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                transition={{ duration: 0.2 }}
                className={`p-3 rounded-xl border font-medium overflow-hidden ${
                  statusType === 'error'
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : statusType === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-slate-100 border-slate-200 text-slate-800'
                }`}
              >
                {statusMessage}
              </motion.div>
            )}
          </AnimatePresence>

          {/* 3D Laser Optical Scanner Animation dengan AnimatePresence */}
          <AnimatePresence>
            {isScanning && (
              <motion.div
                key="scanning-progress-3d"
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="overflow-hidden mb-2"
              >
                <Scan3DAnimation
                  progress={scanProgress}
                  currentKecamatan={currentScanningKec}
                  statusMessage={statusMessage}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tombol Ambil Daftar Folder Kecamatan */}
          {kecamatanFolders.length === 0 ? (
            <div className="text-center py-6 space-y-3">
              <p className="text-slate-600">
                Klik tombol di bawah untuk mendeteksi folder Kecamatan di Google Drive Anda:
              </p>
              <Button
                variant="maroon"
                onClick={handleLoadKecamatanList}
                disabled={isFetchingFolders}
                className="bg-kpu-maroon text-white"
              >
                <Play className={`h-4 w-4 mr-1.5 ${isFetchingFolders ? 'animate-spin' : ''}`} />
                <span>{isFetchingFolders ? 'Membaca Folder Drive...' : 'Muat Daftar Kecamatan'}</span>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="font-bold text-slate-800 text-xs">
                  Daftar {kecamatanFolders.length} Folder Kecamatan Terdeteksi:
                </span>
                <Button
                  variant="gold"
                  size="sm"
                  onClick={handleScanAllKecamatan}
                  disabled={isScanning}
                  className="bg-kpu-gold text-kpu-darkMaroon font-bold text-xs h-8 w-full sm:w-auto justify-center"
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${isScanning ? 'animate-spin' : ''}`} />
                  <span>Pindai Semua Sekaligus</span>
                </Button>
              </div>

              {/* List Folder Kecamatan */}
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                {kecamatanFolders.map((kec) => (
                  <div
                    key={kec.id}
                    className="p-3 flex items-center justify-between gap-2 hover:bg-slate-50 transition"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 truncate text-xs sm:text-sm">{kec.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono truncate">ID: {kec.id}</p>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleScanSingleKecamatan(kec)}
                      disabled={isScanning}
                      className="text-xs h-7 px-2.5 shrink-0 border-slate-300 hover:border-kpu-maroon hover:text-kpu-maroon"
                    >
                      <RefreshCw
                        className={`h-3 w-3 mr-1 ${
                          currentScanningKec === kec.name ? 'animate-spin' : ''
                        }`}
                      />
                      <span>Pindai Ini Saja</span>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-slate-50 rounded-b-xl sm:rounded-b-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="text-[11px] text-slate-500 font-medium truncate">
            {isScanning ? (
              <span className="flex items-center gap-1.5 text-amber-800 font-bold truncate">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0"></span>
                Pemindaian sedang berjalan... Anda dapat menutup modal ini kapan saja.
              </span>
            ) : (
              <span>Pilih kecamatan atau pindai seluruh kecamatan sekaligus</span>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className={`text-xs h-8 px-4 shrink-0 cursor-pointer ${
              isScanning
                ? 'bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-300 font-bold shadow-xs'
                : ''
            }`}
          >
            {isScanning ? 'Minimalkan (Tetap Berjalan)' : 'Tutup'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Minimized Floating Scanning Widget (Aktif saat scan sedang berjalan dan modal ditutup) */}
    <AnimatePresence>
      {isScanning && !open && (
        <motion.div
          key="minimized-scan-widget"
          initial={{ opacity: 0, y: 40, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 380, damping: 26 }}
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-[9995] sm:w-[410px] rounded-2xl bg-gradient-to-b from-[#220302] via-[#160201] to-[#0c0101] border-2 border-kpu-gold/70 text-white p-3.5 shadow-2xl shadow-black/90 backdrop-blur-xl"
        >
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-kpu-gold/20">
            <div className="flex items-center gap-2 min-w-0">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-kpu-gold opacity-80"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-kpu-gold shadow-[0_0_8px_#ffbf00]"></span>
              </span>
              <div className="min-w-0">
                <span className="text-[9.5px] uppercase font-mono text-kpu-lightGold font-bold block leading-none">
                  MEMINDAI DI LATAR BELAKANG
                </span>
                <p className="text-xs font-bold text-white truncate leading-tight mt-0.5">
                  {currentScanningKec ? `Kecamatan ${currentScanningKec}` : 'Seluruh Kecamatan Sekadau'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="text-right">
                <div className="text-base font-black font-mono text-kpu-lightGold leading-none flex items-center justify-end">
                  <AnimatedCounter value={scanProgress} duration={0.5} />
                  <span className="text-kpu-gold text-xs">%</span>
                </div>
              </div>

              {onReopenModal && (
                <button
                  type="button"
                  onClick={onReopenModal}
                  className="p-1.5 rounded-lg bg-kpu-maroon hover:bg-kpu-darkMaroon border border-kpu-gold/60 text-kpu-lightGold hover:text-white transition cursor-pointer shadow-xs"
                  title="Buka Tampilan Penuh"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Mini Progress Bar */}
          <div className="mt-2.5">
            <div className="relative w-full h-2 rounded-full bg-[#120101] border border-kpu-gold/40 overflow-hidden shadow-inner p-0.5">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-kpu-maroon via-kpu-orange to-kpu-gold relative overflow-hidden shadow-[0_0_12px_rgba(233,80,7,0.7)]"
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(scanProgress, 4)}%` }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              >
                <motion.div
                  animate={{ x: ['-100%', '300%'] }}
                  transition={{ repeat: Infinity, duration: 1.4, ease: 'linear' }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent w-1/2 -skew-x-20"
                />
              </motion.div>
            </div>
          </div>

          {/* Status message */}
          <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono text-amber-200/80">
            <span className="truncate max-w-[270px]">
              {statusMessage || 'Sedang memproses berkas...'}
            </span>
            {onReopenModal && (
              <button
                type="button"
                onClick={onReopenModal}
                className="text-kpu-lightGold hover:underline font-bold text-[10px] shrink-0 ml-2 cursor-pointer"
              >
                Buka Penuh →
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </>
  );
}
