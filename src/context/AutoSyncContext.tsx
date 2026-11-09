import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { RawTpsData, AppConfig } from '@/types';
import { performFullDriveSync, performSmartQuickSync } from '@/services/driveSyncEngine';

interface AutoSyncContextType {
  isAutoSyncEnabled: boolean;
  intervalMinutes: number;
  isSyncing: boolean;
  nextSyncCountdown: number;
  lastSyncAt: Date | null;
  lastSyncStatus: 'idle' | 'syncing' | 'success' | 'error';
  syncCurrentKecamatan: string | null;
  syncError: string | null;
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
  // 1. Sinkronisasi otomatis berjalan permanen setiap 2 menit (tanpa indikator UI)
  const isAutoSyncEnabled = true;
  const intervalMinutes = 2;

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [nextSyncCountdown, setNextSyncCountdown] = useState<number>(() => intervalMinutes * 60);
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

  // 2. Fungsi eksekusi sinkronisasi senyap (Silent Background Sync)
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
      // 1. Prioritaskan Smart Quick-Scan (hanya berkas baru 25 menit terakhir, super kilat 1-2 detik)
      const quickResult = await performSmartQuickSync(
        currentCfg.gasWebAppUrl,
        currentCfg.rootFolderId,
        rawDataRef.current
      );

      if (quickResult && quickResult.length > 0) {
        onSyncCompleteRef.current(quickResult);
        setLastSyncAt(new Date());
        setLastSyncStatus('success');
        setNextSyncCountdown(intervalMinutes * 60);
        return;
      }

      // 2. Jika tidak ada berkas cepat atau belum didukung, jalankan pemindaian normal secara senyap
      const result = await performFullDriveSync(
        currentCfg.gasWebAppUrl,
        currentCfg.rootFolderId,
        rawDataRef.current,
        (_progress, _msg, currentKec) => {
          setSyncCurrentKecamatan(currentKec || null);
        }
      );

      if (result.updatedRawData && result.updatedRawData.length > 0) {
        onSyncCompleteRef.current(result.updatedRawData);
      }

      setLastSyncAt(new Date());
      setLastSyncStatus('success');
      setNextSyncCountdown(intervalMinutes * 60);
    } catch (err: any) {
      console.warn('Background auto-sync warning:', err);
      setSyncError(err.message || 'Sinkronisasi latar belakang tertunda');
      setLastSyncStatus('error');
      // Retry dalam 60 detik jika gagal
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
