import React, { useState, useRef } from 'react';
import { motion, AnimatePresence, useSpring } from 'framer-motion';
import {
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Building,
  UserCheck,
  Fingerprint,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { loginWithPasscode, isFirebaseConfigured, DEFAULT_AUTH_EMAIL } from '@/services/firebase';

interface AuthGateProps {
  onLoginSuccess: () => void;
  onBypassDemo?: () => void;
}

/**
 * AuthGate - 3D Maximum Tactical Security Vault Portal
 * Halaman autentikasi bergaya 3D Command Deck dengan physical tilt parallax,
 * specular light sheen, recessed tactile input wells, dan tombol push 3D berat.
 */
export function AuthGate({ onLoginSuccess, onBypassDemo }: AuthGateProps) {
  const [passcode, setPasscode] = useState('');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasFirebase = isFirebaseConfigured();

  // 3D Parallax Tilt Physics via Framer Motion Spring
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });

  const springConfig = { stiffness: 300, damping: 25, mass: 0.8 };
  const rotateX = useSpring(0, springConfig);
  const rotateY = useSpring(0, springConfig);
  const scale = useSpring(1, springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Batasi kemiringan 3D maksimal +/- 10 derajat agar tetap nyaman dibaca
    const rX = ((y - centerY) / centerY) * -10;
    const rY = ((x - centerX) / centerX) * 10;

    rotateX.set(rX);
    rotateY.set(rY);

    setGlare({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 0.3,
    });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    scale.set(1.02);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    rotateX.set(0);
    rotateY.set(0);
    scale.set(1);
    setGlare((prev) => ({ ...prev, opacity: 0 }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isAdminMode && !adminEmail.trim()) {
      setErrorMessage('Silakan masukkan email admin terlebih dahulu.');
      return;
    }

    if (!passcode.trim()) {
      setErrorMessage(
        isAdminMode
          ? 'Silakan masukkan kata sandi admin terlebih dahulu.'
          : 'Silakan masukkan sandi akses kantor terlebih dahulu.'
      );
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await loginWithPasscode(passcode.trim(), isAdminMode ? adminEmail.trim() : undefined);
      onLoginSuccess();
    } catch (err: any) {
      console.error('Firebase Login Error:', err);
      const code = err.code || '';
      if (
        code === 'auth/wrong-password' ||
        code === 'auth/invalid-credential' ||
        code === 'auth/invalid-login-credentials'
      ) {
        setErrorMessage('Sandi akses salah. Silakan periksa kembali.');
      } else if (code === 'auth/user-not-found') {
        setErrorMessage(
          `Akun "${isAdminMode ? adminEmail : DEFAULT_AUTH_EMAIL}" belum terdaftar di Firebase Authentication.`
        );
      } else if (code === 'auth/network-request-failed') {
        setErrorMessage('Gagal menghubungi Firebase. Pastikan koneksi internet aktif.');
      } else {
        setErrorMessage(err.message || 'Terjadi kesalahan saat validasi sandi.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] bg-gradient-to-br from-[#120003] via-[#090b11] to-[#04060a] flex items-center justify-center p-4 sm:p-6 font-sans relative overflow-hidden select-none">
      {/* 1. Cinematic 3D Background Atmosphere & Floating Holographic Orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Ambient Maroon Glow Orbs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-red-950/40 blur-[120px] animate-pulse" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-amber-900/30 blur-[130px] animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-rose-950/20 to-amber-950/15 blur-[150px]" />

        {/* Subtle Cyber Grid */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      {/* 2. 3D Tilt Vault Container */}
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="relative w-full max-w-md [perspective:1200px] z-10"
      >
        <motion.div
          style={{
            rotateX,
            rotateY,
            scale,
            transformStyle: 'preserve-3d',
          }}
          className={`relative w-full rounded-3xl bg-slate-900/90 backdrop-blur-2xl border border-white/15 overflow-hidden transition-all duration-300 ${
            isHovered
              ? 'shadow-[0_40px_90px_-15px_rgba(0,0,0,0.9),0_0_65px_rgba(139,0,0,0.5)]'
              : 'shadow-[0_30px_70px_-15px_rgba(0,0,0,0.85),0_0_50px_rgba(139,0,0,0.35)]'
          }`}
        >
          {/* Specular Top Rim Highlight (Emas KPU) */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-amber-400 to-transparent pointer-events-none z-30" />

          {/* Dynamic Specular Mouse Glare Sweep */}
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-20 rounded-3xl"
            style={{
              background: `radial-gradient(circle 200px at ${glare.x}% ${glare.y}%, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0) 70%)`,
              opacity: glare.opacity,
            }}
          />

          {/* 3. Header 3D Command Deck */}
          <div className="relative pt-8 pb-6 px-6 text-center overflow-hidden border-b border-white/10 bg-gradient-to-b from-[#240005]/80 via-[#180004]/60 to-transparent">
            {/* Ambient Radial Spotlight */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-32 bg-amber-500/15 blur-2xl pointer-events-none" />

            {/* Floating 3D KPU Medallion Tile */}
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              className="relative mx-auto w-20 h-20 rounded-2xl p-1 bg-gradient-to-b from-amber-400 via-amber-600 to-amber-800 shadow-[0_12px_24px_rgba(0,0,0,0.5),0_0_20px_rgba(245,158,11,0.35)] ring-2 ring-white/20 mb-4 cursor-pointer"
            >
              <div className="w-full h-full rounded-xl bg-white p-2 flex items-center justify-center shadow-inner overflow-hidden relative">
                <img
                  src="/kpu-logo.png"
                  alt="Logo KPU"
                  className="h-full w-full object-contain filter drop-shadow(0 2px 4px rgba(0,0,0,0.25))"
                />
                {/* Specular glass reflection */}
                <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent pointer-events-none rounded-t-xl" />
              </div>
            </motion.div>

            {/* Portal Title & Subtitle */}
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center justify-center gap-1.5 drop-shadow-md">
              <span>C-Hasil Archive Tracker</span>
            </h2>
            <p className="text-xs text-rose-200/90 font-medium mt-1">
              Komisi Pemilihan Umum Kabupaten Sekadau
            </p>

            {/* Official Badge Pill */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 border border-amber-400/30 text-[11px] text-amber-300 mt-3 font-bold shadow-[0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
              <span>Sistem Monitoring C-Hasil Resmi</span>
            </div>
          </div>

          {/* 4. Content Deck & Tactile Form */}
          <div className="p-6 sm:p-7 space-y-5 relative z-10">
            {/* Warning jika Firebase belum diset */}
            {!hasFirebase && (
              <div className="p-3.5 rounded-2xl bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs space-y-1 shadow-lg">
                <div className="flex items-center gap-1.5 font-bold text-amber-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>Konfigurasi Firebase Belum Lengkap</span>
                </div>
                <p className="text-amber-100/80">
                  Isi data <code>VITE_FIREBASE_API_KEY</code> & <code>VITE_FIREBASE_PROJECT_ID</code> di file <code>.env</code> Anda.
                </p>
              </div>
            )}

            {/* 3D Dual-Segmented Mode Switcher */}
            <div className="relative p-1 rounded-2xl bg-black/50 border border-white/10 shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)] flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setIsAdminMode(false);
                  setErrorMessage(null);
                  setPasscode('');
                }}
                className={`relative flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  !isAdminMode
                    ? 'text-amber-300 shadow-[0_4px_12px_rgba(139,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] bg-gradient-to-b from-[#8B0000] to-[#550000] border border-amber-400/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Building className="h-3.5 w-3.5" />
                <span>Sandi Kantor</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsAdminMode(true);
                  setErrorMessage(null);
                  setPasscode('');
                }}
                className={`relative flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  isAdminMode
                    ? 'text-amber-950 shadow-[0_4px_12px_rgba(217,119,6,0.4),inset_0_1px_0_rgba(255,255,255,0.5)] bg-gradient-to-b from-amber-400 to-amber-600 border border-amber-300'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>Admin Teknis</span>
              </button>
            </div>

            {/* Form Input Fields */}
            <form onSubmit={handleLogin} className="space-y-4">
              <AnimatePresence mode="wait">
                {isAdminMode ? (
                  <motion.div
                    key="admin-fields"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-3"
                  >
                    {/* Input Email Admin */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-amber-200/90">
                        Email Admin Teknis:
                      </label>
                      <div className="relative">
                        <Input
                          type="email"
                          value={adminEmail}
                          onChange={(e) => setAdminEmail(e.target.value)}
                          placeholder="contoh: teknis.kpusekadau@gmail.com"
                          disabled={isLoading}
                          autoFocus
                          className="h-11 rounded-xl bg-slate-950/70 border-white/20 text-white placeholder:text-slate-500 font-medium text-xs shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                        />
                      </div>
                    </div>

                    {/* Input Password Admin */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-amber-200/90">
                        Kata Sandi Admin:
                      </label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                          <KeyRound className="h-4 w-4" />
                        </div>
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          value={passcode}
                          onChange={(e) => setPasscode(e.target.value)}
                          placeholder="Masukkan kata sandi admin..."
                          disabled={isLoading}
                          className="pl-9 pr-10 h-11 rounded-xl bg-slate-950/70 border-white/20 text-white placeholder:text-slate-500 font-medium text-xs shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      ★ Hak Akses Penuh: Koreksi anomali berkas, sinkronisasi Google Drive, &amp; ekspor laporan.
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="kantor-fields"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-2"
                  >
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-rose-200/90">
                      Sandi Akses Staf Kantor:
                    </label>

                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <Fingerprint className="h-4 w-4 text-amber-400/80" />
                      </div>
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={passcode}
                        onChange={(e) => setPasscode(e.target.value)}
                        placeholder="Ketik sandi akses kantor..."
                        disabled={isLoading}
                        autoFocus
                        className="pl-10 pr-10 h-12 rounded-xl bg-slate-950/70 border-white/20 text-white placeholder:text-slate-500 font-bold text-sm shadow-[inset_0_2px_6px_rgba(0,0,0,0.5)] focus:ring-2 focus:ring-amber-400 focus:border-amber-400 tracking-wider"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1.5 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-400">
                      Melindungi tautan arsip berkas C-Hasil agar hanya dapat diakses staf internal KPU.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error Message Alert */}
              <AnimatePresence>
                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: -6 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs font-semibold flex items-start gap-2 shadow-lg overflow-hidden"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                    <span>{errorMessage}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Heavy Tactile 3D Submit Button */}
              <motion.button
                whileHover={{ scale: 1.015 }}
                whileTap={{ y: 3, scale: 0.985 }}
                type="submit"
                disabled={isLoading || !hasFirebase}
                className="w-full h-12 rounded-2xl text-sm font-black text-white bg-gradient-to-b from-[#8B0000] via-[#750000] to-[#500000] border border-rose-400/30 shadow-[0_6px_0_#300000,0_12px_24px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.35)] active:shadow-[0_2px_0_#300000,0_4px_10px_rgba(0,0,0,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Memverifikasi Akses...</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 text-amber-300" />
                    <span>Buka Akses Dashboard</span>
                  </>
                )}
              </motion.button>
            </form>

            {/* Optional Demo Mode Bypass */}
            {onBypassDemo && (
              <div className="pt-3 text-center border-t border-white/10">
                <button
                  type="button"
                  onClick={onBypassDemo}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-gradient-to-b from-amber-200 via-amber-300 to-amber-400 px-4 py-3 text-sm font-extrabold text-kpu-darkMaroon shadow-[0_3px_0_#a16207,0_6px_16px_rgba(0,0,0,0.2)] transition hover:brightness-110 active:translate-y-0.5 active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 cursor-pointer"
                >
                  <span>Lanjutkan tanpa login</span>
                  <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
