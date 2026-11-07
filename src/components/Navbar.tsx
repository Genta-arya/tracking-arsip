import { FileSpreadsheet, RefreshCw, LogIn, LogOut, UserCheck, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppConfig } from '@/types';

interface NavbarProps {
  config: AppConfig;
  onExportExcel: () => void;
  onRefreshData: () => void;
  isLoading: boolean;
  onLogout?: () => void;
  currentUserEmail?: string | null;
}

/**
 * Navbar Minimalis & Modern KPU Kabupaten Sekadau
 * Desain bersih, elegan, profesional, dan responsif tanpa elemen 3D berlebihan.
 */
export function Navbar({
  config,
  onExportExcel,
  onRefreshData,
  isLoading,
  onLogout,
  currentUserEmail = null,
}: NavbarProps) {
  const isAdminTeknis = currentUserEmail?.toLowerCase() === 'teknis.kpusekadau@gmail.com';

  return (
    <header className="bg-gradient-to-r from-kpu-darkMaroon via-kpu-maroon to-kpu-darkMaroon text-white border-b border-red-950/40 shadow-xs select-none">
      {/* Baris Utama Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 md:gap-4">
        
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 sm:h-11 sm:w-11 shrink-0 rounded-xl bg-white p-1 flex items-center justify-center border border-white/20 shadow-xs">
            <img
              src="/kpu-logo.png"
              alt="Logo KPU"
              className="h-full w-full object-contain"
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-bold text-base sm:text-lg tracking-tight leading-none text-white truncate">
                C-Hasil Archive Tracker
              </h1>
              <span className="text-[10px] font-semibold uppercase tracking-wider py-0.5 px-2 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                Pemilu 2024
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-rose-200/80 font-normal mt-0.5 truncate">
              Komisi Pemilihan Umum Kabupaten Sekadau
            </p>
          </div>
        </div>

        {/* Status Mode & Action Buttons (Minimalis & Ringkas) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Status Live Sync & Tombol Masuk/Keluar */}
          <div className="flex items-center justify-between sm:justify-start gap-2">
            {/* Live Sync Status */}
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-black/25 border border-white/10 text-xs shrink-0">
              <span
                className={`h-2 w-2 rounded-full shrink-0 ${
                  config.isDemoMode ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'
                }`}
              />
              <span className="text-slate-200 text-xs">
                {config.isDemoMode ? (
                  <span className="text-amber-300 font-medium">Mode Preview</span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <span className="text-emerald-300">Live Sync</span>
                    {config.lastSyncedAt && (
                      <span className="text-[11px] text-slate-300 font-normal">
                        • {new Date(config.lastSyncedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </span>
                )}
              </span>
            </div>

            {/* Tombol Keluar / Masuk */}
            {onLogout && (
              <Button
                variant="outline"
                size="sm"
                onClick={onLogout}
                className="h-8 text-xs border-white/15 bg-white/10 text-white hover:bg-white/20 hover:text-white shrink-0 font-medium px-2.5 rounded-lg"
                title={config.isDemoMode ? 'Masuk dengan Sandi Kantor' : 'Keluar dari sesi kantor'}
              >
                {config.isDemoMode ? (
                  <>
                    <LogIn className="h-3.5 w-3.5 mr-1" />
                    <span>Masuk</span>
                  </>
                ) : (
                  <>
                    <LogOut className="h-3.5 w-3.5 mr-1 text-rose-300" />
                    <span>Keluar</span>
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Action Buttons: Pindai Drive & Export Excel (Minimalis Flat Modern) */}
          {!config.isDemoMode && (
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
              <Button
                variant="gold"
                size="sm"
                onClick={onRefreshData}
                disabled={isLoading}
                className="h-8 px-3 text-xs bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold shadow-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                title="Pindai ulang folder Google Drive"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 shrink-0 ${isLoading ? 'animate-spin' : ''}`}
                />
                <span>Pindai Drive</span>
              </Button>

              <Button
                variant="orange"
                size="sm"
                onClick={onExportExcel}
                className="h-8 px-3 text-xs bg-orange-600 hover:bg-orange-500 text-white font-semibold shadow-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                title="Unduh rekapitulasi format Excel (.xlsx)"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" />
                <span>Export (.xlsx)</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Sub-bar Info Akun yang Sedang Login (Minimalis & Rapi) */}
      <div className="bg-black/20 border-t border-white/10 px-4 sm:px-6 lg:px-8 py-1.5 text-xs text-rose-100/90">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {currentUserEmail ? (
              <>
                <UserCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span className="text-[11px] sm:text-xs text-slate-300">Akun:</span>
                <strong className="text-white font-medium text-[11px] sm:text-xs truncate max-w-[220px] sm:max-w-none">
                  {currentUserEmail}
                </strong>
                <span
                  className={`px-2 py-0.2 rounded-md text-[9px] sm:text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                    isAdminTeknis
                      ? 'bg-amber-400 text-amber-950'
                      : 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30'
                  }`}
                >
                  {isAdminTeknis ? '★ Admin Teknis' : 'Petugas'}
                </span>
              </>
            ) : (
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                <ShieldAlert className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span>Mode:</span>
                <span className="text-slate-300 font-medium">Tamu / Pengunjung (Preview)</span>
              </div>
            )}
          </div>

          <div className="text-[10px] sm:text-[11px] text-rose-200/80 truncate">
            {isAdminTeknis ? (
              <span>Full Access: Pindai Drive, Export Excel, & Update Anomali</span>
            ) : currentUserEmail ? (
              <span>Pindai Drive & Export Excel (Update status khusus Admin)</span>
            ) : (
              <span>Login dengan Sandi Kantor untuk akses sinkronisasi</span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
