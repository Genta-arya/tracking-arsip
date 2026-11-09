import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { RawTpsData, AppConfig } from '@/types';
import { performSmartQuickSync } from '@/services/driveSyncEngine';

interface AutoSyncContextType {
  isAutoSyncEnabled: boolean;
  intervalMinutes: number;
  isSyncing: boolean;
  nextSyncCountdown: number;
  lastSyncAt: Date | null;
  lastSyncStatus: 'idle' | 'syncing' | 'success' | 'error';
  syncCurrentKecamatan: string | null;
  syncError: string | null;
  newFilesNotice: number | null;
  dismissNewFilesNotice: () => void;
  toggleAutoSync: (enabled?: boolean) => void;
  setIntervalMinutes: (mins: number) => void;
  triggerManualAutoSync: () => Promise<void>;
}

const AutoSyncContext = createContext<AutoSyncContextType | undefined>(undefined);

interface AutoSyncProviderProps {
  children: React.ReactNode;
  config: AppConfig;
  rawData: RawTpsData[];
  onSyncComplete: (updatedData: RawTpsData[]) => void;
}

export function AutoSyncProvider({
  children,
  config,
  rawData,
  onSyncComplete,
}: AutoSyncProviderProps) {
  // 1. Sinkronisasi otomatis berjalan permanen setiap 2 menit (Silent Quick-Fetch)
  const isAutoSyncEnabled = true;
  const intervalMinutes = 2;

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [nextSyncCountdown, setNextSyncCountdown] = useState<number>(() => intervalMinutes * 60);
  const [newFilesNotice, setNewFilesNotice] = useState<number | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(() => {
    if (config.lastSyncedAt) {
      const parsed = new Date(config.lastSyncedAt);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
  });
  const [lastSyncStatus, setLastSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncCurrentKecamatan, setSyncCurrentKecamatan] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Ref untuk mengakses nilai terbaru di dalam timer interval tanpa re-subscribe
  const rawDataRef = useRef<RawTpsData[]>(rawData);
  rawDataRef.current = rawData;

  const configRef = useRef<AppConfig>(config);
  configRef.current = config;

  const isSyncingRef = useRef<boolean>(isSyncing);
  isSyncingRef.current = isSyncing;

  const onSyncCompleteRef = useRef(onSyncComplete);
  onSyncCompleteRef.current = onSyncComplete;

  // 2. Fungsi eksekusi pemindaian berkas baru (Silent Quick-Fetch 2 Menit Sekali)
  const executeSilentSync = useCallback(async () => {
    if (isSyncingRef.current) return;
    const currentCfg = configRef.current;
    if (!currentCfg.gasWebAppUrl || !currentCfg.rootFolderId) {
      return;
    }

    setIsSyncing(true);
    setLastSyncStatus('syncing');
    setSyncError(null);

    try {
      // Prioritaskan Smart Quick-Scan: Hanya berkas baru 30 menit terakhir (super kilat 1-2 detik)
      const quickResult = await performSmartQuickSync(
        currentCfg.gasWebAppUrl,
        currentCfg.rootFolderId,
        rawDataRef.current
      );

      if (quickResult.success) {
        if (quickResult.hasChanges && quickResult.updatedRawData.length > 0) {
          onSyncCompleteRef.current(quickResult.updatedRawData);
          if (quickResult.newFilesCount > 0) {
            setNewFilesNotice(quickResult.newFilesCount);
          }
        }
        setLastSyncAt(new Date());
        setLastSyncStatus('success');
        setNextSyncCountdown(intervalMinutes * 60);
        return;
      }

      // Jika Quick-Scan mengembalikan info khusus
      if (quickResult.error) {
        console.info('[Silent Quick-Fetch Info]:', quickResult.error);
      }
      setLastSyncStatus('idle');
      setNextSyncCountdown(intervalMinutes * 60);
    } catch (err: any) {
      console.warn('Background auto-sync warning:', err);
      setSyncError(err.message || 'Sinkronisasi berkas baru tertunda');
      setLastSyncStatus('error');
      // Retry dalam 60 detik jika ada gangguan jaringan
      setNextSyncCountdown(60);
    } finally {
      setIsSyncing(false);
      setSyncCurrentKecamatan(null);
    }
  }, [intervalMinutes]);

  // 3. Timer Countdown 1 Detik untuk Menjalankan Auto-Sync
  useEffect(() => {
    if (!isAutoSyncEnabled) return;

    const timer = setInterval(() => {
      setNextSyncCountdown((prev) => {
        if (prev <= 1) {
          // Waktu habis, picu sinkronisasi jika tidak sedang berjalan
          if (!isSyncingRef.current) {
            executeSilentSync();
          }
          return intervalMinutes * 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isAutoSyncEnabled, intervalMinutes, executeSilentSync]);

  // 4. Pengaturan interval & status dikunci (tidak dapat diubah/dimatikan)
  const setIntervalMinutes = () => {};
  const toggleAutoSync = () => {};

  return (
    <AutoSyncContext.Provider
      value={{
        isAutoSyncEnabled,
        intervalMinutes,
        isSyncing,
        nextSyncCountdown,
        lastSyncAt,
        lastSyncStatus,
        syncCurrentKecamatan,
        syncError,
        newFilesNotice,
        dismissNewFilesNotice: () => setNewFilesNotice(null),
        toggleAutoSync,
        setIntervalMinutes,
        triggerManualAutoSync: executeSilentSync,
      }}
    >
      {children}
    </AutoSyncContext.Provider>
  );
}

export function useAutoSync() {
  const context = useContext(AutoSyncContext);
  if (!context) {
    throw new Error('useAutoSync must be used within an AutoSyncProvider');
  }
  return context;
}
