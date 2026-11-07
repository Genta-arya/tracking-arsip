import { FileSpreadsheet, RefreshCw, LogIn, LogOut, UserCheck, ShieldAlert, Sparkles } from 'lucide-react';
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
 * Navbar 3D Holographic Command Deck KPU Sekadau
 * Dilengkapi 3D tactile push buttons, floating emblem logo, specular highlights,
 * dan status pod dengan kedalaman ruang 3D.
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
    <header className="relative bg-gradient-to-b from-[#4a0200] via-[#330100] to-[#200100] text-white shadow-[0_12px_32px_rgba(0,0,0,0.45)] border-b border-red-950/60 overflow-hidden select-none">
      {/* Top 3D Specular Highlight Line */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-400/60 via-white/80 to-transparent pointer-events-none z-30" />

      {/* Ambient Radial Backlights */}
      <div className="absolute -top-16 left-1/4 w-96 h-36 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 right-1/4 w-96 h-36 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Baris Utama Navbar */}
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3 sm:py-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5 md:gap-4 relative z-20">
        
        {/* Brand & 3D Floating Logo */}
        <div className="flex items-center gap-3.5">
          {/* 3D Acrylic Floating Logo Tile */}
          <motion.div
            whileHover={{ scale: 1.08, rotateY: 12, rotateX: -6 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="h-11 w-11 sm:h-12 sm:w-12 shrink-0 rounded-2xl bg-gradient-to-b from-white via-slate-50 to-slate-200 p-1.5 flex items-center justify-center border border-white/80 shadow-[0_8px_18px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.9)] ring-2 ring-amber-400/40 relative group cursor-pointer"
          >
            {/* Specular sheen over logo */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-transparent via-white/40 to-transparent pointer-events-none" />
            <img
              src="/kpu-logo.png"
              alt="Logo KPU"
              className="h-full w-full object-contain relative z-10 drop-shadow-xs"
            />
          </motion.div>

          {/* Title & Subtitle */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-black text-base sm:text-xl tracking-tight leading-none text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] truncate">
                C-Hasil Archive Tracker
              </h1>
              <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-black uppercase tracking-wider py-0.5 px-2 rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 text-amber-950 shadow-[0_2px_6px_rgba(245,158,11,0.4)] border border-amber-200/60">
                <Sparkles className="h-2.5 w-2.5" />
                PEMILU 2024
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-rose-200/90 font-semibold mt-1 truncate">
              Komisi Pemilihan Umum Kabupaten Sekadau
            </p>
          </div>
        </div>

        {/* Status Mode & 3D Tactile Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Status Pill & Tombol Keluar */}
          <div className="flex items-center justify-between sm:justify-start gap-2.5">
            {/* 3D Live Sync Status Pod */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/70 border border-emerald-500/35 shadow-[0_4px_12px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.15)] text-xs shrink-0 backdrop-blur-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
              </span>
              <span className="text-slate-200 text-xs font-semibold">
                {config.isDemoMode ? (
                  <strong className="text-amber-300">Mode Preview</strong>
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <strong className="text-emerald-300">Live Sync</strong>
                    {config.lastSyncedAt && (
                      <span className="text-[10px] text-emerald-200/80 font-normal">
                        • {new Date(config.lastSyncedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </span>
                )}
              </span>
            </div>

            {/* 3D Frosted Keluar Button */}
            {onLogout && (
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.95, y: 1 }}
                type="button"
                onClick={onLogout}
                className="h-8 text-xs px-3 rounded-xl border border-white/20 bg-white/10 hover:bg-white/18 text-white shadow-[0_3px_0_rgba(255,255,255,0.15),0_6px_12px_rgba(0,0,0,0.25)] flex items-center justify-center font-bold shrink-0 transition-colors backdrop-blur-xs"
                title={config.isDemoMode ? "Masuk dengan Sandi Kantor" : "Keluar dari sesi kantor"}
              >
                {config.isDemoMode ? (
                  <>
                    <LogIn className="h-3.5 w-3.5 mr-1 text-amber-300" />
                    <span>Masuk</span>
                  </>
                ) : (
                  <>
                    <LogOut className="h-3.5 w-3.5 mr-1 text-rose-300" />
                    <span>Keluar</span>
                  </>
                )}
              </motion.button>
            )}
          </div>

          {/* Action Buttons: 3D Push-Button Physics */}
          {!config.isDemoMode && (
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 w-full sm:w-auto">
              {/* Tombol 3D Pindai Drive (Gold Metallic Push-Button) */}
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96, y: 3 }}
                type="button"
                onClick={onRefreshData}
                disabled={isLoading}
                className="relative h-9 px-3.5 sm:px-4 rounded-xl text-xs font-black text-amber-950 bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 shadow-[0_4px_0_#b45309,0_8px_16px_rgba(245,158,11,0.35)] active:shadow-[0_1px_0_#b45309] border-t border-amber-200/80 flex items-center justify-center gap-1.5 transition-transform overflow-hidden cursor-pointer disabled:opacity-50"
                title="Pindai ulang folder Google Drive"
              >
                {/* Top Specular Sheen */}
                <div className="absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/45 to-transparent pointer-events-none rounded-t-xl" />
                <RefreshCw
                  className={`h-3.5 w-3.5 shrink-0 ${isLoading ? 'animate-spin' : ''}`}
                />
                <span className="truncate">Pindai Drive</span>
              </motion.button>

              {/* Tombol 3D Export Excel (Orange Fire Push-Button) */}
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96, y: 3 }}
                type="button"
                onClick={onExportExcel}
                className="relative h-9 px-3.5 sm:px-4 rounded-xl text-xs font-black text-white bg-gradient-to-b from-orange-500 via-kpu-orange to-red-600 shadow-[0_4px_0_#9a3412,0_8px_16px_rgba(234,88,12,0.35)] active:shadow-[0_1px_0_#9a3412] border-t border-orange-300/80 flex items-center justify-center gap-1.5 transition-transform overflow-hidden cursor-pointer"
                title="Unduh rekapitulasi format Excel (.xlsx)"
              >
                {/* Top Specular Sheen */}
                <div className="absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/40 to-transparent pointer-events-none rounded-t-xl" />
                <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Export (.xlsx)</span>
              </motion.button>
            </div>
          )}
        </div>
      </div>

      {/* Sub-bar Info Akun: 3D Frosted Glass Strip */}
      <div className="bg-slate-950/60 border-t border-white/10 px-3.5 sm:px-6 lg:px-8 py-1.5 text-xs relative z-20 backdrop-blur-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
          <div className="flex items-center gap-2 text-slate-300 flex-wrap">
            {currentUserEmail ? (
              <>
                <UserCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span className="text-[11px] sm:text-xs font-medium">Akun:</span>
                <strong className="text-white font-bold text-[11px] sm:text-xs truncate max-w-[210px] sm:max-w-none">
                  {currentUserEmail}
                </strong>
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider shrink-0 shadow-xs border ${
                    isAdminTeknis
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-amber-950 border-amber-200'
                      : 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40'
                  }`}
                >
                  {isAdminTeknis ? '★ ADMIN TEKNIS' : 'PETUGAS'}
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

      {/* Bottom Glowing Border Line */}
      <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent pointer-events-none" />
    </header>
  );
}
