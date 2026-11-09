import { RefreshCw } from 'lucide-react';
import { useAutoSync } from '@/context/AutoSyncContext';

function formatCountdown(seconds: number): string {
  if (seconds < 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * AutoSyncWidget - Indikator status sinkronisasi otomatis Google Drive
 * Dibuat murni otomatis (read-only live badge) tanpa kontrol manual / tombol jeda,
 * berjalan konsisten di latar belakang secara periodik setiap 5 menit.
 */
export function AutoSyncWidget() {
  const {
    isSyncing,
    nextSyncCountdown,
    syncCurrentKecamatan,
  } = useAutoSync();

  return (
    <div
      className={`relative h-9 px-3 rounded-xl text-xs font-semibold flex items-center gap-2 border select-none transition-all shadow-xs ${
        isSyncing
          ? 'bg-amber-500/20 text-amber-200 border-amber-400/50 ring-2 ring-amber-400/20 animate-pulse'
          : 'bg-emerald-950/40 text-emerald-200 border-emerald-500/40'
      }`}
      title={
        isSyncing
          ? `Sedang menyinkronkan data Google Drive ${syncCurrentKecamatan ? `(${syncCurrentKecamatan})` : ''}...`
          : `Sinkronisasi otomatis latar belakang aktif setiap 5 menit (Sinkron berikutnya dalam ${formatCountdown(nextSyncCountdown)})`
      }
    >
      {isSyncing ? (
        <>
          <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin text-amber-400" />
          <span className="font-bold text-[11px] sm:text-xs text-amber-300 truncate max-w-[125px] sm:max-w-none">
            {syncCurrentKecamatan ? `Sync: ${syncCurrentKecamatan}` : 'Sinkron Drive...'}
          </span>
        </>
      ) : (
        <>
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[11px] sm:text-xs font-bold text-emerald-300">
            Auto-Sync
          </span>
          <span className="text-[10px] sm:text-[11px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/30 text-emerald-200">
            {formatCountdown(nextSyncCountdown)}
          </span>
        </>
      )}
    </div>
  );
}
