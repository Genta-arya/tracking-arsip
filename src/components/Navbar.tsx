import { FileSpreadsheet, RefreshCw, LogIn, LogOut, UserCheck, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
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
 * Navbar 3D Tactile Elegan KPU Kabupaten Sekadau
 * Menghadirkan kesan kedalaman 3D fisik, tombol taktil interaktif, dan sasis bersih tanpa visual riweh.
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
    <header className="relative bg-gradient-to-b from-[#5c0604] via-[#480503] to-[#360302] text-white border-b border-black/50 shadow-[0_10px_28px_rgba(0,0,0,0.35)] select-none overflow-hidden">
      {/* Top 3D Specular Highlight Line */}
      <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none z-20" />

      {/* Baris Utama Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 md:gap-4 relative z-10">
        
        {/* Brand & 3D Logo Tile */}
        <div className="flex items-center gap-3.5">
          <motion.div
            whileHover={{ y: -2, scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="h-11 w-11 sm:h-12 sm:w-12 shrink-0 rounded-2xl bg-gradient-to-b from-white via-slate-50 to-slate-100 p-1.5 flex items-center justify-center border border-white/90 shadow-[0_4px_14px_rgba(0,0,0,0.25),inset_0_1.5px_1px_rgba(255,255,255,1),inset_0_-1.5px_1px_rgba(0,0,0,0.1)] cursor-pointer"
          >
            <img
              src="/kpu-logo.png"
              alt="Logo KPU"
              className="h-full w-full object-contain"
            />
          </motion.div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-black text-base sm:text-lg tracking-tight leading-none text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] truncate">
                C-Hasil Archive Tracker
              </h1>
              {/* 3D Metallic Gold Pill */}
              <span className="text-[10px] font-black uppercase tracking-wider py-0.5 px-2.5 rounded-full bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 text-amber-950 shadow-[0_2px_4px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.7),inset_0_-1px_0_rgba(180,83,9,0.3)] border border-amber-200/90">
                Pemilu 2024
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-rose-200/90 font-medium mt-1 truncate">
              Komisi Pemilihan Umum Kabupaten Sekadau
            </p>
          </div>
        </div>

        {/* Status Mode & 3D Tactile Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Status Live Sync & Tombol Masuk/Keluar */}
          <div className="flex items-center justify-between sm:justify-start gap-2.5">
            {/* 3D Recessed Live Sync Pod */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/35 backdrop-blur-xs border border-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.4),0_1px_0_rgba(255,255,255,0.1)] text-xs shrink-0">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.9)]" />
              </span>
              <span className="text-slate-200 text-xs">
                {config.isDemoMode ? (
                  <span className="text-amber-300 font-bold">Mode Preview</span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 font-bold">
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

            {/* 3D Keluar / Masuk Button */}
            {onLogout && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96, y: 1 }}
                type="button"
                onClick={onLogout}
                className="h-8 text-xs px-3 rounded-xl border border-white/20 bg-gradient-to-b from-white/15 to-white/5 hover:from-white/25 hover:to-white/10 text-white shadow-[0_2px_4px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.2)] font-bold shrink-0 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                title={config.isDemoMode ? 'Masuk dengan Sandi Kantor' : 'Keluar dari sesi kantor'}
              >
                {config.isDemoMode ? (
                  <>
                    <LogIn className="h-3.5 w-3.5" />
                    <span>Masuk</span>
                  </>
                ) : (
                  <>
                    <LogOut className="h-3.5 w-3.5 text-rose-300" />
                    <span>Keluar</span>
                  </>
                )}
              </motion.button>
            )}
          </div>

          {/* 3D Tactile Action Buttons: Pindai Drive & Export Excel */}
          {!config.isDemoMode && (
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 w-full sm:w-auto">
              {/* Tombol 3D Pindai Drive */}
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96, y: 2 }}
                type="button"
                onClick={onRefreshData}
                disabled={isLoading}
                className="relative h-9 px-4 rounded-xl text-xs font-black text-amber-950 bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 hover:from-amber-200 hover:to-amber-400 shadow-[0_3px_0_#b45309,0_6px_12px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.7)] active:translate-y-[2px] active:shadow-[0_1px_0_#b45309] border border-amber-300/80 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                title="Pindai ulang folder Google Drive"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 shrink-0 ${isLoading ? 'animate-spin' : ''}`}
                />
                <span>Pindai Drive</span>
              </motion.button>

              {/* Tombol 3D Export Excel */}
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96, y: 2 }}
                type="button"
                onClick={onExportExcel}
                className="relative h-9 px-4 rounded-xl text-xs font-black text-white bg-gradient-to-b from-kpu-orange via-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 shadow-[0_3px_0_#9a3412,0_6px_12px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.4)] active:translate-y-[2px] active:shadow-[0_1px_0_#9a3412] border border-orange-400/80 flex items-center justify-center gap-2 transition-all cursor-pointer"
                title="Unduh rekapitulasi format Excel (.xlsx)"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" />
                <span>Export (.xlsx)</span>
              </motion.button>
            </div>
          )}
        </div>
      </div>

      {/* Sub-bar Info Akun yang Sedang Login (3D Recessed Strip) */}
      <div className="bg-black/30 backdrop-blur-xs border-t border-white/10 px-4 sm:px-6 lg:px-8 py-1.5 text-xs text-rose-100/90 shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {currentUserEmail ? (
              <>
                <UserCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span className="text-[11px] sm:text-xs text-slate-300">Akun:</span>
                <strong className="text-white font-bold text-[11px] sm:text-xs truncate max-w-[220px] sm:max-w-none">
                  {currentUserEmail}
                </strong>
                <span
                  className={`px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-black uppercase tracking-wider shrink-0 ${
                    isAdminTeknis
                      ? 'bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 text-amber-950 shadow-[0_1.5px_3px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.7)] border border-amber-200/80'
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

          <div className="text-[10px] sm:text-[11px] text-rose-200/90 font-medium truncate">
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
