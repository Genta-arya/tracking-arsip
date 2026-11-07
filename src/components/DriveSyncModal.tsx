import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Play, Layers, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { GasKecamatanItem, fetchKecamatanList, scanKecamatanFolder } from '@/services/driveService';
import { saveKecamatanScanToFirestore, fetchAllFileOverrides } from '@/services/firebase';
import { RawTpsData, AppConfig } from '@/types';
import { Scan3DAnimation } from '@/components/Scan3DAnimation';

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

  // Demo simulasi animasi 3D optical scanner
  const handleSimulateScanDemo = () => {
    if (isScanning) return;
    setIsScanning(true);
    setCurrentScanningKec('Sekadau Hilir');
    setScanProgress(12);
    setStatusMessage('Memulai pemindaian optik berkas Model C-Hasil...');
    setStatusType('info');

    const demoSteps = [
      { progress: 30, msg: 'Membaca folder Kecamatan Sekadau Hilir di Google Drive...' },
      { progress: 58, msg: 'Memindai 204 TPS & analisis berkas PPWP, DPR, DPD, DPRD...' },
      { progress: 80, msg: 'Validasi kelengkapan 5 jenis pemilihan & deteksi anomali...' },
      { progress: 95, msg: 'Menyinkronkan data pemindaian ke Cloud Firestore realtime...' },
      { progress: 100, msg: 'Selesai! Seluruh data formulir C-Hasil berhasil disinkronkan.' },
    ];

    demoSteps.forEach((step, idx) => {
      setTimeout(() => {
        setScanProgress(step.progress);
        setStatusMessage(step.msg);
        if (idx === demoSteps.length - 1) {
          setTimeout(() => {
            setIsScanning(false);
            setCurrentScanningKec(null);
            setStatusType('success');
          }, 1400);
        }
      }, (idx + 1) * 1200);
    });
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
        <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-slate-50 rounded-b-xl sm:rounded-b-2xl flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSimulateScanDemo}
            disabled={isScanning}
            className="text-[11px] text-cyan-800 hover:text-cyan-950 hover:bg-cyan-50 border border-cyan-200/80 flex items-center gap-1.5 font-bold h-8 px-3"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
            <span>Tes Animasi 3D Scanner</span>
          </Button>

          <Button variant="outline" size="sm" onClick={onClose} disabled={isScanning} className="w-full sm:w-auto text-xs h-8">
            Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
