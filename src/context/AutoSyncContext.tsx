import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { RawTpsData, AppConfig } from '@/types';
import { performFullDriveSync } from '@/services/driveSyncEngine';

const STORAGE_KEY_ENABLED = 'kpu_auto_sync_enabled';
const STORAGE_KEY_INTERVAL = 'kpu_auto_sync_interval_mins';

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
  // 1. Baca konfigurasi awal dari localStorage (default aktif 5 menit)
  const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem(STORAGE_KEY_ENABLED);
    return stored !== null ? stored === 'true' : true;
  });

  const [intervalMinutes, setIntervalMinutesState] = useState<number>(() => {
    if (typeof window === 'undefined') return 5;
    const stored = localStorage.getItem(STORAGE_KEY_INTERVAL);
    const parsed = stored ? parseInt(stored, 10) : 5;
    return [2, 5, 10, 15].includes(parsed) ? parsed : 5;
  });

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

  // 4. Ubah interval & simpan ke storage
  const setIntervalMinutes = (mins: number) => {
    setIntervalMinutesState(mins);
    setNextSyncCountdown(mins * 60);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_INTERVAL, mins.toString());
    }
  };

  // 5. Toggle ON/OFF Auto-Sync
  const toggleAutoSync = (enabled?: boolean) => {
    setIsAutoSyncEnabled((prev) => {
      const next = enabled !== undefined ? enabled : !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_ENABLED, next.toString());
      }
      if (next) {
        setNextSyncCountdown(intervalMinutes * 60);
      }
      return next;
    });
  };

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
