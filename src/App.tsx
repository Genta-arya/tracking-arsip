import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderOpen, RefreshCw, TrendingUp, Table, MapPin, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/Navbar';
import { ProgressDashboard } from '@/components/ProgressDashboard';
import { FilterSection } from '@/components/FilterSection';
import { SekadauInteractiveMap } from '@/components/SekadauInteractiveMap';
import { TrackerMatrix } from '@/components/TrackerMatrix';
import { FileDetailModal } from '@/components/FileDetailModal';
import { DriveSyncModal } from '@/components/DriveSyncModal';
import { SyncStatusFloatingToast } from '@/components/SyncStatusFloatingToast';
import { AuthGate } from '@/components/AuthGate';
import { MOCK_DESA_MAP } from '@/data/mockSekadauData';
import {
  processRawTps,
  naturalSortTpsComparator,
} from '@/utils/parser';
import { exportToExcel } from '@/utils/excelExport';
import {
  loadStoredRawData,
  saveStoredRawData,
  saveAppConfig,
} from '@/services/storageService';
import {
  subscribeAuthState,
  fetchSecureDriveConfig,
  logoutUser,
  isFirebaseConfigured,
  subscribeRealtimeScannedData,
  subscribeSyncMetadata,
  SyncMetadata,
} from '@/services/firebase';
import {
  RawTpsData,
  TPSRecord,
  FilterState,
  AppConfig,
  GlobalStats,
  KecamatanSummary,
  ElectionType,
} from '@/types';

export function App() {
  // Autentikasi Keamanan (Anti-DevTools Leak)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [isBypassedDemo, setIsBypassedDemo] = useState<boolean>(false);

  // App Configuration (diambil aman dari Firestore setelah login)
  const [config, setConfig] = useState<AppConfig>({
    gasWebAppUrl: '',
    rootFolderId: '',
    lastSyncedAt: null,
    isDemoMode: true,
  });

  // Raw TPS Data (dari Drive atau Mock)
  const [rawData, setRawData] = useState<RawTpsData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals state
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [syncMeta, setSyncMeta] = useState<SyncMetadata | null>(null);

  // Tab Utama: 'progress' (Progres & Tren Harian) atau 'rekapitulasi' (Matriks Tabel TPS)
  // Tersinkronisasi secara otomatis dengan query string URL (?tab=progress / ?tab=rekapitulasi)
  const [activeTab, setActiveTabState] = useState<'progress' | 'rekapitulasi'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab')?.toLowerCase();
      if (tabParam === 'rekapitulasi') return 'rekapitulasi';
      if (tabParam === 'progress') return 'progress';
    }
    return 'progress';
  });

  const setActiveTab = (newTab: 'progress' | 'rekapitulasi') => {
    setActiveTabState(newTab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', newTab);
      window.history.pushState({}, '', url.toString());
    }
  };

  // Inisialisasi URL param ?tab= saat pertama dimuat & dengarkan event Back / Forward browser
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    if (!params.get('tab')) {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', activeTab);
      window.history.replaceState({}, '', url.toString());
    }

    const handlePopState = () => {
      const currentParams = new URLSearchParams(window.location.search);
      const tabParam = currentParams.get('tab')?.toLowerCase();
      if (tabParam === 'rekapitulasi') {
        setActiveTabState('rekapitulasi');
      } else if (tabParam === 'progress') {
        setActiveTabState('progress');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Filter State
  const [filter, setFilter] = useState<FilterState>({
    kecamatan: 'ALL',
    desa: 'ALL',
    status: 'ALL',
    missingElection: 'ALL',
    searchQuery: '',
  });

  // 1. Pantau Status Autentikasi Firebase (Sandi Akses Kantor)
  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setIsAuthChecking(false);
      return;
    }

    const unsubscribe = subscribeAuthState(async (user) => {
      if (user) {
        setIsAuthenticated(true);
        setCurrentUserEmail(user.email || 'Petugas KPU');
        try {
          // Ambil konfigurasi Google Drive secara aman dari Firestore
          const secureConfig = await fetchSecureDriveConfig();
          setConfig({
            gasWebAppUrl: secureConfig.gasWebAppUrl,
            rootFolderId: secureConfig.rootFolderId,
            lastSyncedAt: new Date().toISOString(),
            isDemoMode: !(secureConfig.gasWebAppUrl && secureConfig.rootFolderId),
          });
        } catch (err) {
          console.error('Gagal mengambil data dari Firestore:', err);
        }
      } else {
        setIsAuthenticated(false);
        setCurrentUserEmail(null);
        // Hapus konfigurasi sensitif dari memori
        setConfig({
          gasWebAppUrl: '',
          rootFolderId: '',
          lastSyncedAt: null,
          isDemoMode: true,
        });
      }
      setIsAuthChecking(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Inisialisasi Data TPS dari IndexedDB (cache lokal perangkat)
  useEffect(() => {
    async function initData() {
      setIsLoading(true);
      const storedData = await loadStoredRawData();
      if (storedData && storedData.length > 0) {
        // Otomatis bersihkan jika tersimpan data dummy/mockup lama
        const isOldMock = storedData.some((r) => r.tpsFolderId.startsWith('folder_'));
        if (isOldMock) {
          await saveStoredRawData([]);
          setRawData([]);
        } else {
          setRawData(storedData);
        }
      } else {
        setRawData([]);
      }
      setIsLoading(false);
    }
    initData();
  }, []);

  // 3. Real-Time Multi-User Listener: Sinkronisasi data seketika antar seluruh pengguna kantor
  useEffect(() => {
    // Dengarkan dokumen hasil pemindaian Google Drive terpusat di Firestore (bisa dibaca publik/incognito)
    const unsubscribeData = subscribeRealtimeScannedData(
      async (cloudData) => {
        setRawData(cloudData);
        await saveStoredRawData(cloudData);
        setIsLoading(false);
      },
      (err) => {
        console.warn('Firestore realtime listener:', err);
        setIsLoading(false);
      }
    );

    // Dengarkan metadata waktu terakhir disinkronkan oleh admin
    const unsubscribeMeta = subscribeSyncMetadata((meta) => {
      if (meta) {
        setSyncMeta(meta);
        if (meta.lastSyncedAt) {
          setConfig((prev) => ({
            ...prev,
            lastSyncedAt: meta.lastSyncedAt,
          }));
        }
      }
    });

    return () => {
      unsubscribeData();
      unsubscribeMeta();
    };
  }, []);

  // 3. Pemrosesan Data Mentah menjadi TPSRecord terstruktur & terurut secara Natural Sort
  const processedRecords = useMemo<TPSRecord[]>(() => {
    return rawData.map(processRawTps).sort(naturalSortTpsComparator);
  }, [rawData]);

  // Record aktif yang sedang dibuka di modal detail (selalu sinkron live dengan data terbaru)
  const activeRecord = useMemo<TPSRecord | null>(() => {
    if (!selectedRecordId) return null;
    return processedRecords.find((r) => r.id === selectedRecordId) || null;
  }, [processedRecords, selectedRecordId]);

  // 4. Ekstrak Daftar Kecamatan & Desa untuk Filter Dropdown
  const kecamatanList = useMemo(() => {
    const set = new Set(processedRecords.map((r) => r.kecamatan));
    return Array.from(set).sort();
  }, [processedRecords]);

  const desaList = useMemo(() => {
    if (filter.kecamatan === 'ALL') return [];
    
    // Utamakan membaca langsung dari data TPS yang tersimpan/dipindai riil dari Google Drive
    const set = new Set(
      processedRecords
        .filter((r) => r.kecamatan.toLowerCase() === filter.kecamatan.toLowerCase())
        .map((r) => r.desa)
    );
    if (set.size > 0) {
      return Array.from(set).sort((a, b) => a.localeCompare(b, 'id', { sensitivity: 'base' }));
    }

    // Fallback ke daftar mock jika belum ada data TPS sama sekali
    const mockList = Object.entries(MOCK_DESA_MAP).find(
      ([k]) => k.toLowerCase() === filter.kecamatan.toLowerCase()
    )?.[1];
    return mockList || [];
  }, [processedRecords, filter.kecamatan]);

  // 5. Ringkasan Statistik Per Kecamatan
  const kecamatanSummaries = useMemo<KecamatanSummary[]>(() => {
    const map = new Map<string, KecamatanSummary>();

    processedRecords.forEach((r) => {
      let item = map.get(r.kecamatan);
      if (!item) {
        item = {
          name: r.kecamatan,
          totalDesa: 0,
          totalTPS: 0,
          completedTPS: 0,
          partialTPS: 0,
          emptyTPS: 0,
          anomalyTPS: 0,
          totalFiles: 0,
          expectedFiles: 0,
          percentage: 0,
          validFiles: 0,
        };
        map.set(r.kecamatan, item);
      }

      item.totalTPS++;
      item.totalFiles += r.files.length; // Total seluruh berkas scan di folder Drive
      item.validFiles = (item.validFiles || 0) + r.completedCount;
      item.expectedFiles += 5;

      if (r.completedCount === 5) item.completedTPS++;
      else if (r.completedCount === 0) item.emptyTPS++;
      else item.partialTPS++;

      if (r.hasAnomaly) item.anomalyTPS++;
    });

    const summaries: KecamatanSummary[] = [];
    map.forEach((item, kecName) => {
      const desaSet = new Set(
        processedRecords
          .filter((r) => r.kecamatan.toLowerCase() === kecName.toLowerCase())
          .map((r) => r.desa.toLowerCase())
      );
      item.totalDesa = desaSet.size;
      item.percentage =
        item.expectedFiles > 0
          ? ((item.validFiles || item.totalFiles) / item.expectedFiles) * 100
          : 0;
      summaries.push(item);
    });

    return summaries.sort((a, b) => a.name.localeCompare(b.name));
  }, [processedRecords]);

  // 6. Statistik Global Kabupaten Sekadau
  const globalStats = useMemo<GlobalStats>(() => {
    let completed = 0;
    let partial = 0;
    let empty = 0;
    let anomaly = 0;
    let validSlotFiles = 0;
    let totalPhysicalFiles = 0;

    processedRecords.forEach((r) => {
      validSlotFiles += r.completedCount;
      totalPhysicalFiles += r.files.length;
      if (r.completedCount === 5) completed++;
      else if (r.completedCount === 0) empty++;
      else partial++;

      if (r.hasAnomaly) anomaly++;
    });

    const totalTPS = processedRecords.length;
    const expectedTotal = totalTPS * 5;
    const completionPercentage =
      expectedTotal > 0 ? (validSlotFiles / expectedTotal) * 100 : 0;
    const anomalyFilesCount = Math.max(0, totalPhysicalFiles - validSlotFiles);

    return {
      totalKecamatan: kecamatanList.length,
      totalDesa: new Set(processedRecords.map((r) => `${r.kecamatan}-${r.desa}`)).size,
      totalTPS,
      completedTPS: completed,
      partialTPS: partial,
      emptyTPS: empty,
      anomalyTPS: anomaly,
      totalFilesCollected: totalPhysicalFiles, // Sinkron 100% dengan total 497 file di Google Drive & Chart
      expectedFilesTotal: expectedTotal,
      completionPercentage,
      validFilesCount: validSlotFiles,         // 466 berkas sah yang sudah cocok ke 5 surat suara
      anomalyFilesCount,                       // 31 berkas anomali penamaan
    };
  }, [processedRecords, kecamatanList]);

  // 7. Penyaringan Data (Filtering)
  const filteredRecords = useMemo(() => {
    return processedRecords.filter((r) => {
      // Filter Kecamatan
      if (
        filter.kecamatan !== 'ALL' &&
        r.kecamatan.toLowerCase() !== filter.kecamatan.toLowerCase()
      ) {
        return false;
      }
      // Filter Desa
      if (
        filter.desa !== 'ALL' &&
        r.desa.toLowerCase() !== filter.desa.toLowerCase()
      ) {
        return false;
      }
      // Filter Status
      if (filter.status === 'COMPLETE' && !r.isComplete) return false;
      if (
        filter.status === 'PARTIAL' &&
        (r.completedCount === 0 || r.completedCount === 5)
      ) {
        return false;
      }
      if (filter.status === 'EMPTY' && r.completedCount > 0) return false;
      if (filter.status === 'ANOMALY' && !r.hasAnomaly) return false;

      // Filter Missing Election
      if (filter.missingElection !== 'ALL') {
        const key = filter.missingElection as ElectionType;
        if (key === 'PPWP' && r.slotPPWP) return false;
        if (key === 'DPR_RI' && r.slotDPR_RI) return false;
        if (key === 'DPD' && r.slotDPD) return false;
        if (key === 'DPRD_PROV' && r.slotDPRD_PROV) return false;
        if (key === 'DPRD_KAB' && r.slotDPRD_KAB) return false;
      }

      // Filter Pencarian Teks
      if (filter.searchQuery.trim() !== '') {
        const q = filter.searchQuery.toLowerCase();
        const matchDesa = r.desa.toLowerCase().includes(q);
        const matchKec = r.kecamatan.toLowerCase().includes(q);
        const matchTps = r.tpsFolderName.toLowerCase().includes(q);
        if (!matchDesa && !matchKec && !matchTps) return false;
      }

      return true;
    });
  }, [processedRecords, filter]);

  // Handler Selesai Sync dari Google Drive
  const handleSyncComplete = async (updatedData: RawTpsData[]) => {
    setRawData(updatedData);
    await saveStoredRawData(updatedData);
    const updatedConfig = {
      ...config,
      lastSyncedAt: new Date().toISOString(),
      isDemoMode: false,
    };
    setConfig(updatedConfig);
    saveAppConfig(updatedConfig);
  };

  // Handler Export Excel
  const handleExportExcel = () => {
    exportToExcel(processedRecords, kecamatanSummaries);
  };

  // Handler Logout / Kunci Akses
  const handleLogout = async () => {
    await logoutUser();
    setIsAuthenticated(false);
    setCurrentUserEmail(null);
    setIsBypassedDemo(false);
  };

  // Tampilan Loading Memeriksa Sandi
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-kpu-darkMaroon flex flex-col items-center justify-center p-4">
        <div className="h-16 w-16 rounded-2xl bg-white p-2 flex items-center justify-center mb-4 shadow-xl border border-white/20 animate-pulse overflow-hidden">
          <img
            src="/kpu-logo.png"
            alt="Logo KPU"
            className="h-full w-full object-contain"
          />
        </div>
        <p className="text-sm font-semibold text-rose-100 tracking-wide">
          Memeriksa Status Keamanan...
        </p>
      </div>
    );
  }

  // Tampilan Layar Kunci / Sandi (AuthGate)
  if (!isAuthenticated && !isBypassedDemo) {
    return (
      <AuthGate
        onLoginSuccess={() => setIsAuthenticated(true)}
        onBypassDemo={() => setIsBypassedDemo(true)}
      />
    );
  }

  // Tampilan Dashboard Penuh (Hanya Tampil Jika Sudah Login)
  return (
    <div className="min-h-screen flex flex-col bg-slate-100/70 text-slate-900 font-sans">
      {/* 1. Header / Navbar */}
      <Navbar
        config={config}
        onExportExcel={handleExportExcel}
        onRefreshData={() => setIsSyncModalOpen(true)}
        isLoading={isLoading}
        onLogout={handleLogout}
        currentUserEmail={currentUserEmail}
      />

      {/* 2. Main Dashboard Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-6">
        
        {/* Navigasi 2 Tab Utama (Model Garis Bawah / Underline) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200">
          {/* Tab Bar dengan Indikator Garis Bawah */}
          <div className="w-full sm:w-auto grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-8 -mb-px">
            {/* TAB 1: PROGRES */}
            <button
              type="button"
              onClick={() => setActiveTab('progress')}
              className={`relative flex items-center justify-center gap-2 pb-3 pt-2 text-xs sm:text-sm transition-colors duration-150 ${
                activeTab === 'progress'
                  ? 'text-kpu-maroon font-bold'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <TrendingUp className={`h-4 w-4 shrink-0 ${activeTab === 'progress' ? 'text-kpu-maroon' : 'text-slate-400'}`} />
              <span className="whitespace-nowrap">Progres</span>
              <span
                className={`ml-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold shrink-0 transition ${
                  activeTab === 'progress'
                    ? 'bg-red-100 text-kpu-maroon'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {globalStats.completionPercentage.toFixed(1)}%
              </span>
              {activeTab === 'progress' && (
                <motion.div
                  layoutId="activeTabUnderline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-kpu-maroon rounded-full"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
            </button>

            {/* TAB 2: REKAPITULASI */}
            <button
              type="button"
              onClick={() => setActiveTab('rekapitulasi')}
              className={`relative flex items-center justify-center gap-2 pb-3 pt-2 text-xs sm:text-sm transition-colors duration-150 ${
                activeTab === 'rekapitulasi'
                  ? 'text-kpu-maroon font-bold'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <Table className={`h-4 w-4 shrink-0 ${activeTab === 'rekapitulasi' ? 'text-kpu-maroon' : 'text-slate-400'}`} />
              <span className="whitespace-nowrap">Rekapitulasi</span>
              <span
                className={`ml-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold shrink-0 transition ${
                  activeTab === 'rekapitulasi'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {processedRecords.length} TPS
              </span>
              {activeTab === 'rekapitulasi' && (
                <motion.div
                  layoutId="activeTabUnderline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-kpu-maroon rounded-full"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-500 font-medium pb-2 sm:pb-3 px-1 sm:px-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse"></span>
            <span>Sistem Monitoring C-Hasil • 7 Kecamatan</span>
          </div>
        </div>

        {/* Banner Info jika data Firestore belum ada yang dipindai */}
        {!isLoading && rawData.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-8 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-3 shadow-xs"
          >
            <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700 shadow-inner">
              <FolderOpen className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-amber-900">
                Database Cloud Masih Kosong
              </h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Belum ada berkas scan C-Hasil yang disinkronkan dari Google Drive ke Cloud Firestore. Silakan klik tombol di bawah untuk memindai folder Google Drive kantor.
              </p>
            </div>
            {!config.isDemoMode ? (
              <Button
                variant="gold"
                onClick={() => setIsSyncModalOpen(true)}
                className="bg-kpu-gold hover:bg-amber-400 text-kpu-darkMaroon font-bold text-xs shadow-xs"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                <span>Mulai Pindai Folder Google Drive Sekarang</span>
              </Button>
            ) : (
              <Button
                variant="maroon"
                onClick={handleLogout}
                className="bg-kpu-maroon hover:bg-kpu-darkMaroon text-white font-bold text-xs shadow-xs"
              >
                <span>Masuk dengan Sandi Kantor untuk Sinkronisasi</span>
              </Button>
            )}
          </motion.div>
        )}

        {/* Konten Tab Aktif dengan Animasi Transisi Halus */}
        <AnimatePresence mode="wait">
          {activeTab === 'progress' ? (
            <motion.div
              key="progress"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <ProgressDashboard
                records={processedRecords}
                stats={globalStats}
                kecamatanSummaries={kecamatanSummaries}
                onNavigateToRekap={(filterUpdate) => {
                  if (filterUpdate) {
                    setFilter((prev) => ({ ...prev, ...filterUpdate }));
                  }
                  setActiveTab('rekapitulasi');
                }}
                isDemoMode={config.isDemoMode}
              />
            </motion.div>
          ) : (
            <motion.div
              key="rekapitulasi"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="space-y-6"
            >
              {/* Filter Bar */}
              <FilterSection
                filter={filter}
                onFilterChange={(newVals) =>
                  setFilter((prev) => ({ ...prev, ...newVals }))
                }
                kecamatanList={kecamatanList}
                desaList={desaList}
                totalFiltered={filteredRecords.length}
                totalAll={processedRecords.length}
              />

              {/* Peta Interaktif Leaflet Sekadau */}
              <SekadauInteractiveMap
                selectedKecamatan={filter.kecamatan}
                selectedDesa={filter.desa}
                onSelectKecamatan={(kec) =>
                  setFilter((prev) => ({ ...prev, kecamatan: kec, desa: 'ALL' }))
                }
                onSelectDesa={(desa) =>
                  setFilter((prev) => ({ ...prev, desa }))
                }
                records={processedRecords}
              />

              {/* Tracker Matrix Table */}
              <TrackerMatrix
                records={filteredRecords}
                onOpenFileDetail={(rec) => setSelectedRecordId(rec.id)}
                isDemoMode={config.isDemoMode}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* 3. Footer KPU Sekadau */}
      <footer className="bg-kpu-darkMaroon text-slate-300 py-8 sm:py-10 border-t border-red-950/40 text-xs mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Baris Konten: Info Identitas & Google Maps Kantor */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Kolom Kiri: Identitas KPU, Logo, & Subbagian Teknis */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center gap-3.5">
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-white p-1.5 flex items-center justify-center border border-white/20 shadow-md shrink-0">
                  <img
                    src="/kpu-logo.png"
                    alt="Logo KPU"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base sm:text-lg tracking-wide uppercase leading-tight">
                    Komisi Pemilihan Umum Kabupaten Sekadau
                  </h3>
                  <p className="text-amber-400 font-bold text-xs sm:text-sm mt-0.5">
                    Subbagian Teknis Penyelenggaraan Pemilu dan Hukum
                  </p>
                </div>
              </div>

              <p className="text-slate-300/90 text-xs leading-relaxed max-w-xl">
                Sistem Monitoring dan Rekapitulasi Berkas Formulir Model C-Hasil 5 Jenis Pemilihan Umum 2024 di lingkungan Komisi Pemilihan Umum Kabupaten Sekadau.
              </p>

              <div className="pt-2 border-t border-red-900/40 grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-400 text-[11px]">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-kpu-gold shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-slate-200">Alamat Kantor:</strong><br />
                    Jl. Merdeka Barat, Kec. Sekadau Hilir, Kab. Sekadau, Kalimantan Barat
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Building2 className="h-4 w-4 text-kpu-gold shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-slate-200">Cakupan Wilayah:</strong><br />
                    {globalStats.totalKecamatan} Kecamatan, {globalStats.totalDesa} Desa/Kelurahan, {globalStats.totalTPS} TPS se-Kabupaten Sekadau
                  </span>
                </div>
              </div>
            </div>

            {/* Kolom Kanan: Google Maps Kantor KPU Sekadau */}
            <div className="lg:col-span-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-kpu-gold" />
                  Lokasi Kantor KPU Kabupaten Sekadau
                </span>
                <span className="text-[10px] text-amber-300 bg-red-950/80 px-2 py-0.5 rounded-full border border-red-800">
                  Google Maps
                </span>
              </div>

              {/* Responsive Iframe Container */}
              <div className="w-full h-52 sm:h-60 rounded-xl overflow-hidden border border-red-900/60 shadow-lg relative bg-slate-900">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3989.818263621481!2d110.95271337496494!3d0.009661299990247074!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31fdf888be532e11%3A0x7390b1157a24e4d7!2sKantor%20KPU!5e0!3m2!1sen!2sid!4v1794037112603!5m2!1sen!2sid"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                  title="Peta Lokasi Kantor KPU Kabupaten Sekadau"
                  className="w-full h-full"
                />
              </div>
            </div>
          </div>

          {/* Baris Bawah: Hak Cipta */}
          <div className="pt-6 border-t border-red-900/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-400 text-[11px]">
            <p className="text-center sm:text-left">
              &copy; {new Date().getFullYear()} <strong className="text-white">KPU Kabupaten Sekadau</strong> • Subbagian Teknis Penyelenggaraan Pemilu dan Hukum.
            </p>
            <p className="text-center sm:text-right text-slate-400">
              SISTEM MONITORING ARSIP C-HASIL PEMILU 2024
            </p>
          </div>
        </div>
      </footer>

      {/* 4. Modals */}
      <FileDetailModal
        record={activeRecord}
        open={!!activeRecord}
        onClose={() => setSelectedRecordId(null)}
        isDemoMode={config.isDemoMode}
        currentUserEmail={currentUserEmail}
      />

      <DriveSyncModal
        open={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        config={config}
        onSyncComplete={handleSyncComplete}
        currentRawData={rawData}
      />

      {/* 5. Floating Message Jam Terakhir Sinkronisasi Drive (Bisa di-close) */}
      <SyncStatusFloatingToast
        lastSyncedAt={config.lastSyncedAt || syncMeta?.lastSyncedAt || null}
        lastSyncedKecamatan={syncMeta?.lastSyncedKecamatan}
        lastSyncedBy={syncMeta?.lastSyncedBy}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
      />
    </div>
  );
}

export default App;
