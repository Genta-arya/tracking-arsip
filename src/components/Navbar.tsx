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
 * Navbar 3D Tactile KPU Kabupaten Sekadau
 * Layout ringkas & presisi:
 * - Tombol Keluar sejajar dengan tulisan KPU di kanan full
 * - Live Sync dihilangkan
 * - Sub-bar bersih: email di kiri (tanpa kata "Akun:"), role di kanan full mentok
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-3.5 relative z-10 space-y-2.5 sm:space-y-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
          
          {/* Header Row: Brand & Logo di Kiri, Tombol Keluar Sejajar di Kanan Full */}
          <div className="flex items-center justify-between gap-3 w-full sm:w-auto">
            {/* Brand & 3D Logo Tile */}
            <div className="flex items-center gap-3 min-w-0">
              <motion.div
                whileHover={{ y: -2, scale: 1.05 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="h-10 w-10 sm:h-11 sm:w-11 shrink-0 rounded-2xl bg-gradient-to-b from-white via-slate-50 to-slate-100 p-1.5 flex items-center justify-center border border-white/90 shadow-[0_4px_14px_rgba(0,0,0,0.25),inset_0_1.5px_1px_rgba(255,255,255,1),inset_0_-1.5px_1px_rgba(0,0,0,0.1)] cursor-pointer"
              >
                <img
                  src="/kpu-logo.png"
                  alt="Logo KPU"
                  className="h-full w-full object-contain"
                />
              </motion.div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-black text-sm sm:text-base md:text-lg tracking-tight leading-none text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] truncate">
                    C-Hasil Archive Tracker
                  </h1>
                  {/* 3D Metallic Gold Pill */}
                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider py-0.5 px-2 rounded-full bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 text-amber-950 shadow-[0_2px_4px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.7),inset_0_-1px_0_rgba(180,83,9,0.3)] border border-amber-200/90">
                    Pemilu 2024
                  </span>
                </div>
                <p className="text-[10.5px] sm:text-xs text-rose-200/90 font-medium mt-0.5 truncate">
                  Komisi Pemilihan Umum Kabupaten Sekadau
                </p>
              </div>
            </div>

            {/* Tombol Keluar (Tampil di Kanan Full sejajar tulisan KPU pada Mobile) */}
            {onLogout && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96, y: 1 }}
                type="button"
                onClick={onLogout}
                className="sm:hidden h-8 text-xs px-3 rounded-xl border border-white/20 bg-gradient-to-b from-white/15 to-white/5 hover:from-white/25 hover:to-white/10 text-white shadow-[0_2px_4px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.2)] font-bold shrink-0 transition-all cursor-pointer flex items-center justify-center gap-1.5 ml-auto"
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

          {/* Action Buttons: Pindai Drive & Export Excel (serta Tombol Keluar di Desktop) */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
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

            {/* Tombol Keluar (Tampil di Desktop sejajar di Kanan Full) */}
            {onLogout && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96, y: 1 }}
                type="button"
                onClick={onLogout}
                className="hidden sm:flex h-9 text-xs px-3.5 rounded-xl border border-white/20 bg-gradient-to-b from-white/15 to-white/5 hover:from-white/25 hover:to-white/10 text-white shadow-[0_2px_4px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.2)] font-bold shrink-0 transition-all cursor-pointer items-center justify-center gap-1.5"
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
        </div>
      </div>

      {/* Sub-bar Info Akun yang Sedang Login (Email di Kiri tanpa kata "Akun:", Role di Kanan Full Mentok) */}
      <div className="bg-black/30 backdrop-blur-xs border-t border-white/10 px-4 sm:px-6 lg:px-8 py-1.5 text-xs text-rose-100/90 shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Sisi Kiri: Email Staf (Tanpa tulisan "Akun:") */}
          <div className="flex items-center gap-2 min-w-0">
            {currentUserEmail ? (
              <>
                <UserCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <strong className="text-white font-bold text-[11px] sm:text-xs truncate">
                  {currentUserEmail}
                </strong>
              </>
            ) : (
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                <ShieldAlert className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span className="text-slate-300 font-medium">Tamu / Pengunjung (Preview)</span>
              </div>
            )}
          </div>

          {/* Sisi Kanan Full Mentok: Badge Role */}
          <div className="shrink-0 ml-auto">
            {currentUserEmail ? (
              <span
                className={`px-2.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-black uppercase tracking-wider shrink-0 ${
                  isAdminTeknis
                    ? 'bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 text-amber-950 shadow-[0_1.5px_3px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.7)] border border-amber-200/80'
                    : 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30'
                }`}
              >
                {isAdminTeknis ? '★ ADMIN TEKNIS' : 'PETUGAS'}
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-400/20 border border-amber-400/30">
                PREVIEW
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
