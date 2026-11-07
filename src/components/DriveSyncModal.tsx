import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Play, Layers } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { GasKecamatanItem, fetchKecamatanList, scanKecamatanFolder } from '@/services/driveService';
import { saveKecamatanScanToFirestore, fetchAllFileOverrides } from '@/services/firebase';
import { RawTpsData, AppConfig } from '@/types';

interface DriveSyncModalProps {
  open: boolean;
  onClose: () => void;
  config: AppConfig;
  onSyncComplete: (updatedData: RawTpsData[]) => void;
  currentRawData: RawTpsData[];
}

export function DriveSyncModal({
  open,
  onClose,
  config,
  onSyncComplete,
  currentRawData,
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
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent onClose={onClose} className="max-w-2xl w-full max-h-[92vh] sm:max-h-[85vh] flex flex-col p-0 rounded-xl sm:rounded-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-kpu-darkMaroon to-kpu-maroon text-white p-4 sm:p-5 rounded-t-xl sm:rounded-t-2xl pr-10">
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

          {/* Progress Bar jika sedang scan dengan AnimatePresence */}
          <AnimatePresence>
            {isScanning && (
              <motion.div
                key="scanning-progress"
                initial={{ opacity: 0, scale: 0.96, height: 0 }}
                animate={{ opacity: 1, scale: 1, height: 'auto' }}
                exit={{ opacity: 0, scale: 0.96, height: 0 }}
                transition={{ duration: 0.25 }}
                className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2 overflow-hidden"
              >
                <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Sedang Memindai: {currentScanningKec}
                  </span>
                  <span>{scanProgress}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-amber-100 overflow-hidden relative shadow-inner">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${scanProgress}%` }}
                    transition={{ duration: 0.4 }}
                    className="h-full rounded-full bg-gradient-to-r from-kpu-orange to-kpu-gold relative overflow-hidden"
                  >
                    <motion.div
                      animate={{ x: ['-100%', '250%'] }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent w-2/3 -skew-x-12"
                    />
                  </motion.div>
                </div>
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
        <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-slate-50 rounded-b-xl sm:rounded-b-2xl flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isScanning} className="w-full sm:w-auto text-xs">
            Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
