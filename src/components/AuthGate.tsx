import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, KeyRound, Eye, EyeOff, ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { loginWithPasscode, isFirebaseConfigured, DEFAULT_AUTH_EMAIL } from '@/services/firebase';

interface AuthGateProps {
  onLoginSuccess: () => void;
  onBypassDemo?: () => void;
}

export function AuthGate({ onLoginSuccess, onBypassDemo }: AuthGateProps) {
  const [passcode, setPasscode] = useState('');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasFirebase = isFirebaseConfigured();

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
    <div className="min-h-screen bg-gradient-to-br from-kpu-darkMaroon via-slate-900 to-kpu-darkMaroon flex items-center justify-center p-4 sm:p-6 font-sans">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-kpu-maroon/30 via-transparent to-transparent pointer-events-none" />

      {/* Card Auth Container with Spring Entrance */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 26 }}
        className="relative w-full max-w-md"
      >
        <Card className="w-full bg-white/95 backdrop-blur-md shadow-2xl border border-white/20 rounded-2xl overflow-hidden">
          {/* Header KPU */}
          <div className="bg-gradient-to-r from-kpu-darkMaroon via-kpu-maroon to-kpu-darkMaroon text-white p-6 text-center space-y-2">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-white p-1.5 flex items-center justify-center border border-white/30 shadow-lg mb-3 overflow-hidden">
              <img
                src="/kpu-logo.png"
                alt="Logo KPU"
                className="h-full w-full object-contain"
              />
            </div>

            <h2 className="text-xl font-extrabold tracking-tight">
              C-Hasil Archive Tracker
            </h2>
            <p className="text-xs text-rose-200 font-medium">
              Komisi Pemilihan Umum Kabupaten Sekadau
            </p>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] text-amber-200 mt-2 font-medium">
              <ShieldCheck className="h-3.5 w-3.5 text-kpu-gold" />
              <span>Authenticator</span>
            </div>
          </div>

          {/* Content Form */}
          <CardContent className="p-6 space-y-5">
            {!hasFirebase && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-800">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>Konfigurasi Firebase Belum Diisi</span>
                </div>
                <p className="text-slate-600">
                  Silakan isi data <code>VITE_FIREBASE_API_KEY</code> dan{' '}
                  <code>VITE_FIREBASE_PROJECT_ID</code> di file <code>.env</code> Anda.
                </p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <AnimatePresence mode="wait">
                {isAdminMode ? (
                  <motion.div
                    key="admin-fields"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-3"
                  >
                    <div className="space-y-1 pb-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Email Admin Teknis:
                      </label>
                      <Input
                        type="email"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        placeholder="Masukkan email admin..."
                        disabled={isLoading}
                        autoFocus
                        className="text-xs h-10 rounded-xl border-slate-300 font-medium"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Kata Sandi Admin Teknis:
                      </label>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          value={passcode}
                          onChange={(e) => setPasscode(e.target.value)}
                          placeholder="Ketik kata sandi admin..."
                          disabled={isLoading}
                          className="pl-9 pr-10 text-sm h-11 rounded-xl border-slate-300 focus:ring-kpu-maroon focus:border-kpu-maroon font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          <span className="sr-only">Toggle Password</span>
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500">
                      Akun admin memiliki izin untuk mengoreksi / memperbarui status anomali berkas & scan Drive.
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="kantor-fields"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-2"
                  >
                    <label className="block text-xs font-bold text-slate-700">
                      Masukkan Sandi Akses Kantor:
                    </label>

                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={passcode}
                        onChange={(e) => setPasscode(e.target.value)}
                        placeholder="Ketik sandi akses kantor..."
                        disabled={isLoading}
                        autoFocus
                        className="pl-9 pr-10 text-sm h-11 rounded-xl border-slate-300 focus:ring-kpu-maroon focus:border-kpu-maroon font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        <span className="sr-only">Toggle Password</span>
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-500">
                      Sandi ini melindungi agar tautan arsip Google Drive hanya dapat dilihat oleh staf berwenang.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: -4 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2 overflow-hidden"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <Button
                type="submit"
                disabled={isLoading || !hasFirebase}
                className="w-full h-11 rounded-xl text-sm font-bold bg-kpu-maroon hover:bg-kpu-darkMaroon text-white shadow-md transition cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    <span>Memverifikasi...</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    <span>Buka Akses Dashboard</span>
                  </>
                )}
              </Button>

              {/* Tombol Alih Mode Login (Di Bawah Tombol Submit) */}
              <div className="pt-2 text-center border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdminMode(!isAdminMode);
                    setErrorMessage(null);
                    setPasscode('');
                  }}
                  className="text-xs font-semibold text-kpu-maroon hover:text-kpu-darkMaroon hover:underline transition cursor-pointer"
                >
                  {isAdminMode
                    ? '← Kembali ke Mode Sandi Akses Kantor'
                    : 'Masuk sebagai Admin Teknis →'}
                </button>
              </div>
            </form>

            {/* Option Demo Bypass for Dev */}
            {onBypassDemo && (
              <div className="pt-2 text-center border-t border-slate-100">
                <button
                  type="button"
                  onClick={onBypassDemo}
                  className="text-xs font-medium text-slate-500 hover:text-kpu-maroon hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  <span>Atau masuk dalam Mode Preview</span>
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

