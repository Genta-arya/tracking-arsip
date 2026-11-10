import { useState, useEffect, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Play, Layers, Maximize2, Minus, CheckCircle2, Clock, FolderOpen, ShieldCheck, FileSearch } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { GasKecamatanItem, fetchKecamatanList, scanKecamatanFolder } from '@/services/driveService';
import { saveKecamatanScanToFirestore, fetchAllFileOverrides, deleteFileOverride } from '@/services/firebase';
import { RawTpsData, AppConfig } from '@/types';
import { MisplacedFilesScanner } from '@/components/MisplacedFilesScanner';
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
  const tabsId = useId();
  const [activeTab, setActiveTab] = useState<'regular' | 'misplaced'>('regular');
  const [isMisplacedScanning, setIsMisplacedScanning] = useState(false);
  const [hasScanStarted, setHasScanStarted] = useState(false);
  const [kecamatanFolders, setKecamatanFolders] = useState<GasKecamatanItem[]>([]);
  const [isFetchingFolders, setIsFetchingFolders] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [currentScanningKec, setCurrentScanningKec] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<'info' | 'error' | 'success'>('info');
  const [completedKecamatans, setCompletedKecamatans] = useState<string[]>([]);

  // Hitung berkas yang sudah tersimpan di Firestore lokal untuk tiap kecamatan
  const getKecamatanSyncedFileCount = (kecName: string) => {
    const records = currentRawData.filter(
      (r) => r.kecamatan.toLowerCase() === kecName.toLowerCase()
    );
    return records.reduce((acc, r) => acc + (r.files?.length || 0), 0);
  };

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
    if (open && activeTab === 'regular' && config.gasWebAppUrl && config.rootFolderId && kecamatanFolders.length === 0) {
      handleLoadKecamatanList();
    }
  }, [open, activeTab, config.gasWebAppUrl, config.rootFolderId]);

  // Pindai 1 Kecamatan secara spesifik
  const handleScanSingleKecamatan = async (kec: GasKecamatanItem) => {
    setHasScanStarted(true);
    setIsScanning(true);
    setScanProgress(0);
    setCurrentScanningKec(kec.name);
    setStatusMessage(`Sedang memindai folder "${kec.name}" di Google Drive...`);
    setStatusType('info');

    let firestoreError: string | null = null;

    try {
      const scannedKecData = await scanKecamatanFolder(config.gasWebAppUrl, kec.id);

      setScanProgress(40);

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
            // Kasus data ganda / salah kamar dengan status "SUDAH_DIBENARKAN":
            // Saat sinkronisasi ulang Drive dilakukan, status sementara ini dilepas,
            // sehingga berkas dievaluasi murni dari kondisi fisik Google Drive terkini.
            // Jika di Drive berkas sudah dihapus atau dipindah ke TPS yang tepat, berkas otomatis hilang dari TPS ini.
            if (savedOverride.overrideElection === 'SUDAH_DIBENARKAN') {
              deleteFileOverride(f.id);
              return;
            }
            f.overrideElection = savedOverride.overrideElection;
            f.isResolved = savedOverride.isResolved;
            f.resolutionNote = savedOverride.resolutionNote;
            f.resolvedAt = savedOverride.resolvedAt;
            f.resolvedBy = savedOverride.resolvedBy;
          }
        });
      });

      // Bersihkan juga file_overrides berstatus SUDAH_DIBENARKAN yang mungkin sudah dihapus dari Drive
      for (const [fId, ov] of overrides.entries()) {
        if (ov.overrideElection === 'SUDAH_DIBENARKAN' && ov.kecamatan?.toLowerCase() === kec.name.toLowerCase()) {
          deleteFileOverride(fId);
        }
      }

      setScanProgress(70);

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
      setCompletedKecamatans((prev) => Array.from(new Set([...prev, kec.name])));

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
      setStatusMessage(`Gagal memindai ${kec.name}: ${err.message}`);
      setStatusType('error');
    } finally {
      setIsScanning(false);
      setCurrentScanningKec(null);
    }
  };

  // Pindai Seluruh Kecamatan secara berurutan (Batch Scan)
  const handleScanAllKecamatan = async () => {
    if (kecamatanFolders.length === 0) return;

    setHasScanStarted(true);
    setIsScanning(true);
    setScanProgress(0);
    setStatusType('info');
    setCompletedKecamatans([]);
    let combinedData = [...currentRawData];
    const firestoreErrors: string[] = [];
    const scanErrors: string[] = [];

    // Ambil semua override anomali tersimpan
    let overrides: Awaited<ReturnType<typeof fetchAllFileOverrides>>;
    try {
      overrides = await fetchAllFileOverrides();
    } catch (error) {
      setStatusMessage(`Gagal memuat koreksi berkas: ${error instanceof Error ? error.message : String(error)}`);
      setStatusType('error');
      setIsScanning(false);
      return;
    }
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
              // Jika SUDAH_DIBENARKAN, lepas status sementara ini agar dievaluasi murni dari Drive terkini
              if (savedOverride.overrideElection === 'SUDAH_DIBENARKAN') {
                deleteFileOverride(f.id);
                return;
              }
              f.overrideElection = savedOverride.overrideElection;
              f.isResolved = savedOverride.isResolved;
              f.resolutionNote = savedOverride.resolutionNote;
              f.resolvedAt = savedOverride.resolvedAt;
              f.resolvedBy = savedOverride.resolvedBy;
            }
          });
        });

        // Bersihkan file_overrides berstatus SUDAH_DIBENARKAN di kecamatan ini
        for (const [fId, ov] of overrides.entries()) {
          if (ov.overrideElection === 'SUDAH_DIBENARKAN' && ov.kecamatan?.toLowerCase() === kec.name.toLowerCase()) {
            deleteFileOverride(fId);
          }
        }

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
        setCompletedKecamatans((prev) => Array.from(new Set([...prev, kec.name])));
      } catch (err: any) {
        console.error(`Gagal memindai ${kec.name}:`, err);
        scanErrors.push(kec.name);
      }
      setScanProgress(Math.round(((i + 1) / kecamatanFolders.length) * 100));
    }

    setScanProgress(100);
    onSyncComplete(combinedData);
    setIsScanning(false);
    setCurrentScanningKec(null);

    if (scanErrors.length > 0) {
      setStatusMessage(`Pemindaian belum lengkap. Kecamatan gagal: ${scanErrors.join(', ')}.${firestoreErrors.length ? ' Sebagian penyimpanan Firestore juga gagal.' : ''} Silakan pindai ulang.`);
      setStatusType('error');
    } else if (firestoreErrors.length > 0) {
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
        <DialogContent onClose={onClose} className="max-w-2xl w-full max-h-[92vh] sm:max-h-[85vh] flex flex-col p-0 rounded-2xl sm:rounded-3xl border border-white/40 shadow-2xl overflow-hidden [perspective:1400px]">
          {/* Header 3D Holographic Bar */}
          <div className="bg-gradient-to-r from-kpu-darkMaroon via-kpu-maroon to-kpu-darkMaroon text-white p-4 sm:p-5 pr-16 relative shadow-md">
            {/* Top 3D Specular Highlight Line */}
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-400/60 via-white/80 to-transparent pointer-events-none z-30" />

            <div className="flex items-center gap-3 relative z-20">
              <motion.div
                whileHover={{ scale: 1.1, rotateZ: 8 }}
                className="p-2.5 rounded-2xl bg-gradient-to-b from-white/20 to-white/5 border border-white/30 shadow-[0_4px_12px_rgba(0,0,0,0.3)] shrink-0"
              >
                <Layers className="h-5 w-5 text-kpu-gold drop-shadow-xs" />
              </motion.div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-black text-white leading-tight tracking-tight drop-shadow-xs">
                  Sinkronisasi Pemindaian Google Drive
                </DialogTitle>
                <DialogDescription className="text-[11px] sm:text-xs text-rose-200 mt-0.5 font-medium">
                  Perbarui data TPS atau telusuri PDF yang salah lokasi
                </DialogDescription>
              </div>
            </div>

            {/* Tombol Minimize di Header saat proses scan sedang aktif */}
            {isScanning && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={onClose}
                className="absolute right-12 top-4 z-20 rounded-full p-2 bg-white/10 hover:bg-white/25 border border-white/20 text-white transition-colors cursor-pointer shadow-sm"
                title="Minimalkan ke latar belakang"
              >
                <Minus className="h-4 w-4" />
                <span className="sr-only">Minimalkan</span>
              </motion.button>
            )}
          </div>

        <div role="tablist" aria-label="Jenis pemindaian" className="grid shrink-0 grid-cols-2 gap-1.5 border-b border-slate-200 bg-slate-50 p-2.5 sm:px-5">
          {([{ key: 'regular', label: 'Pemindaian Biasa', icon: FolderOpen }, { key: 'misplaced', label: 'Berkas Tersesat', icon: FileSearch }] as const).map(tab => (
            <button key={tab.key} id={`${tabsId}-${tab.key}-tab`} type="button" role="tab" aria-selected={activeTab === tab.key} aria-controls={`${tabsId}-${tab.key}-panel`} tabIndex={activeTab === tab.key ? 0 : -1}
              onClick={() => setActiveTab(tab.key)}
              onKeyDown={event => {
                if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                event.preventDefault();
                const next = event.key === 'Home' ? 'regular' : event.key === 'End' ? 'misplaced' : activeTab === 'regular' ? 'misplaced' : 'regular';
                setActiveTab(next);
                document.getElementById(`${tabsId}-${next}-tab`)?.focus();
              }}
              className={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-[11px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kpu-gold sm:text-xs ${activeTab === tab.key ? 'border border-rose-100 bg-white text-kpu-maroon shadow-sm' : 'border border-transparent text-slate-500 hover:bg-white/70 hover:text-slate-800'}`}>
              <tab.icon className="h-4 w-4 shrink-0" aria-hidden="true" />{tab.label}
              {(tab.key === 'regular' ? isScanning : isMisplacedScanning) && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-kpu-orange motion-safe:animate-pulse" aria-label="Sedang memindai" />}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-3.5 sm:p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          
          <div role="tabpanel" id={`${tabsId}-regular-panel`} aria-labelledby={`${tabsId}-regular-tab`} hidden={activeTab !== 'regular'} className="space-y-4">
          {hasScanStarted && <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3" role="status" aria-live="polite">
            <div className="mb-2 flex items-center justify-between gap-3"><span className="text-xs font-bold text-slate-800">{isScanning ? 'Progres pemindaian biasa' : statusType === 'error' ? 'Proses berakhir dengan kendala' : 'Proses pemindaian selesai'}</span><strong className="font-mono text-lg font-black text-kpu-maroon">{scanProgress}%</strong></div>
            <div role="progressbar" aria-label="Progres pemindaian biasa" aria-valuemin={0} aria-valuemax={100} aria-valuenow={scanProgress} className="h-2 overflow-hidden rounded-full bg-amber-100"><div className="h-full rounded-full bg-gradient-to-r from-kpu-maroon to-kpu-orange transition-[width]" style={{ width: `${scanProgress}%` }} /></div>
            <p className="mt-2 text-[10px] leading-relaxed text-slate-500">Progres mengikuti tahapan baca dan simpan, atau jumlah kecamatan yang selesai diproses. Lihat pesan hasil untuk memastikan semua data berhasil disimpan.</p>
          </div>}
          {isMisplacedScanning && <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">Pemindaian PDF sedang berjalan di tab Berkas Tersesat. Hentikan atau tunggu selesai sebelum memindai kecamatan.</p>}
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
                disabled={isFetchingFolders || isMisplacedScanning}
                className="bg-kpu-maroon text-white"
              >
                <Play className={`h-4 w-4 mr-1.5 ${isFetchingFolders ? 'animate-spin' : ''}`} />
                <span>{isFetchingFolders ? 'Membaca Folder Drive...' : 'Muat Daftar Kecamatan'}</span>
              </Button>
            </div>
          ) : (
            <div className="space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <span className="font-extrabold text-slate-800 text-xs sm:text-sm flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                  Daftar {kecamatanFolders.length} Folder Kecamatan Terdeteksi:
                </span>
                
                {/* 3D Push-Button Pindai Semua Sekaligus */}
                <motion.button
                  whileHover={!isScanning ? { scale: 1.03 } : {}}
                  whileTap={!isScanning ? { scale: 0.96, y: 2 } : {}}
                  type="button"
                  onClick={handleScanAllKecamatan}
                  disabled={isScanning || isMisplacedScanning}
                  className="relative h-8 px-4 rounded-xl text-xs font-black text-amber-950 bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 shadow-[0_3px_0_#b45309,0_6px_12px_rgba(245,158,11,0.3)] active:shadow-[0_1px_0_#b45309] border-t border-amber-200/90 flex items-center justify-center gap-1.5 transition-all overflow-hidden cursor-pointer disabled:opacity-50 w-full sm:w-auto"
                >
                  <RefreshCw className={`h-3.5 w-3.5 shrink-0 ${isScanning ? 'animate-spin' : ''}`} />
                  <span>Pindai Semua Sekaligus</span>
                </motion.button>
              </div>

              {/* List 7 Folder Kecamatan 3D Micro-Cards */}
              <div className="space-y-2.5 [perspective:1000px]">
                {kecamatanFolders.map((kec) => {
                  const isCurrentlyScanning = currentScanningKec === kec.name;
                  const isCompleted = completedKecamatans.includes(kec.name);
                  const isQueued = isScanning && !isCompleted && !isCurrentlyScanning;
                  const syncedFileCount = getKecamatanSyncedFileCount(kec.name);
                  const hasDataInCloud = isCompleted || syncedFileCount > 0;

                  return (
                    <motion.div
                      key={kec.id}
                      whileHover={{ y: -2, scale: 1.008 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      className={`p-3 sm:p-3.5 rounded-2xl border transition-all duration-300 relative overflow-hidden flex items-center justify-between gap-3 ${
                        isCurrentlyScanning
                          ? 'bg-amber-50/95 border-amber-400 border-l-[6px] border-l-amber-500 ring-2 ring-amber-400/60 shadow-[0_8px_22px_rgba(245,158,11,0.25)]'
                          : hasDataInCloud
                          ? 'bg-emerald-50/60 border-emerald-300/80 border-l-[6px] border-l-emerald-600 shadow-[0_4px_14px_rgba(16,185,129,0.12)]'
                          : 'bg-white border-slate-200/90 border-l-[5px] border-l-slate-300 hover:border-l-kpu-maroon shadow-[0_3px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)]'
                      }`}
                    >
                      {/* Top Specular Bevel Line */}
                      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />

                      {/* Info Kecamatan & Status */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* 3D Icon Badge */}
                        <div
                          className={`p-2.5 rounded-xl shrink-0 shadow-sm border ${
                            isCurrentlyScanning
                              ? 'bg-amber-200/90 text-amber-950 border-amber-300'
                              : hasDataInCloud
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {isCurrentlyScanning ? (
                            <RefreshCw className="h-4 w-4 animate-spin text-amber-800" />
                          ) : hasDataInCloud ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <FolderOpen className="h-4 w-4 text-slate-500" />
                          )}
                        </div>

                        {/* Text Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-black text-slate-900 text-xs sm:text-sm tracking-tight truncate">
                              {kec.name}
                            </h4>

                            {/* Status Badges saat progress & cloud state */}
                            {isCurrentlyScanning && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-950 border border-amber-300 shadow-2xs animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping" />
                                SEDANG MEMINDAI...
                              </span>
                            )}
                            {isQueued && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                <Clock className="h-2.5 w-2.5 text-slate-400" />
                                Menunggu Antrean
                              </span>
                            )}
                            {hasDataInCloud && !isCurrentlyScanning && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100/90 text-emerald-800 border border-emerald-300 shadow-2xs">
                                <ShieldCheck className="h-2.5 w-2.5 text-emerald-600" />
                                Tersimpan di Cloud
                              </span>
                            )}
                            {!hasDataInCloud && !isScanning && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                                Belum Dipindai
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                            <span>ID: {kec.id}</span>
                            <span>•</span>
                            <span
                              className={
                                syncedFileCount > 0
                                  ? 'text-slate-700 font-sans font-bold'
                                  : 'text-slate-400 font-sans font-medium'
                              }
                            >
                              {syncedFileCount} Berkas Terdata
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 3D Tactile Push-Button Pindai / Pindai Ulang */}
                      <motion.button
                        whileHover={!isScanning ? { scale: 1.05 } : {}}
                        whileTap={!isScanning ? { scale: 0.95, y: 1 } : {}}
                        type="button"
                        onClick={() => handleScanSingleKecamatan(kec)}
                        disabled={isScanning || isMisplacedScanning}
                        className={`text-xs h-7 px-3 rounded-xl shrink-0 font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs border ${
                          isCurrentlyScanning
                            ? 'bg-amber-300 text-amber-950 border-amber-400 shadow-inner opacity-90'
                            : hasDataInCloud
                            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 hover:shadow-xs'
                            : 'bg-slate-100 hover:bg-white text-slate-700 border-slate-300 hover:border-kpu-maroon hover:text-kpu-maroon hover:shadow-[0_2px_6px_rgba(102,3,0,0.15)] active:translate-y-0.5'
                        } disabled:opacity-60 disabled:cursor-not-allowed`}
                      >
                        <RefreshCw
                          className={`h-3 w-3 shrink-0 ${isCurrentlyScanning ? 'animate-spin' : ''}`}
                        />
                        <span>{hasDataInCloud ? 'Pindai Ulang' : 'Pindai Ini Saja'}</span>
                      </motion.button>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
          </div>
          <div role="tabpanel" id={`${tabsId}-misplaced-panel`} aria-labelledby={`${tabsId}-misplaced-tab`} hidden={activeTab !== 'misplaced'}>
            <MisplacedFilesScanner config={config} disabled={isScanning} onBusyChange={setIsMisplacedScanning} />
          </div>
        </div>

        {/* Footer 3D Action Deck */}
        <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-slate-50/90 rounded-b-2xl sm:rounded-b-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 backdrop-blur-xs">
          <div className="text-[11px] text-slate-500 font-medium truncate">
            {isScanning ? (
              <span className="flex items-center gap-1.5 text-amber-900 font-extrabold truncate">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
                </span>
                Pemindaian sedang berjalan... Anda dapat menutup modal ini kapan saja.
              </span>
            ) : (
              <span>{isMisplacedScanning ? 'PDF sedang dipindai. Menutup dialog akan menghentikannya.' : activeTab === 'misplaced' ? 'Temukan PDF yang berada di luar susunan folder TPS' : 'Pilih kecamatan atau pindai seluruh kecamatan sekaligus'}</span>
            )}
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96, y: 1 }}
            type="button"
            onClick={onClose}
            className={`text-xs h-8 px-4 rounded-xl shrink-0 font-black cursor-pointer transition-all border ${
              isScanning
                ? 'bg-gradient-to-b from-amber-200 via-amber-300 to-amber-400 text-amber-950 border-amber-300 shadow-[0_2px_0_#b45309,0_4px_10px_rgba(245,158,11,0.25)]'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-2xs'
            }`}
          >
            {isScanning ? 'Minimalkan (Tetap Berjalan)' : 'Tutup'}
          </motion.button>
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
