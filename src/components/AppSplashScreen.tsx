import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock } from 'lucide-react';

interface AppSplashScreenProps {
  message?: string;
}

export function AppSplashScreen({
  message = 'Memeriksa Status Keamanan...',
}: AppSplashScreenProps) {
  // Pesan berganti halus agar loading terasa sangat hidup dan interaktif
  const [activeStepText, setActiveStepText] = useState(message);

  useEffect(() => {
    const messages = [
      'Memeriksa status keamanan sistem...',
      'Menghubungkan ke pusat data KPU Sekadau...',
      'Memverifikasi integritas enkripsi akses...',
      'Memuat basis data arsip C-Hasil...',
    ];
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % messages.length;
      setActiveStepText(messages[idx]);
    }, 1800);
    return () => clearInterval(interval);
  }, [message]);

  return (
    <div className="fixed inset-0 z-[99999] bg-gradient-to-b from-[#1c0201] via-[#120101] to-[#080000] flex flex-col items-center justify-center p-6 overflow-hidden select-none">
      {/* Background Cinematic Radial Spotlights */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-kpu-maroon/40 via-kpu-orange/20 to-kpu-gold/15 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-kpu-maroon/30 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-kpu-gold/20 rounded-full blur-[100px] pointer-events-none" />

      {/* Cyber Golden Grid Lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffbf000a_1px,transparent_1px),linear-gradient(to_bottom,#ffbf000a_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Center Cinematic Container */}
      <div className="relative z-10 flex flex-col items-center max-w-md w-full text-center">
        {/* Animated Glowing Orbital Rings */}
        <div className="relative w-44 h-44 sm:w-52 sm:h-52 flex items-center justify-center mb-6">
          {/* Cincin Luar Berputar Searah Jarum Jam dengan Garis Putus-Putus Emas */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 18, ease: 'linear' }}
            className="absolute inset-0 rounded-full border-2 border-dashed border-kpu-gold/40 shadow-[0_0_20px_rgba(255,191,0,0.2)]"
          />

          {/* Cincin Tengah Berputar Berlawanan Arah dengan Titik Pijar */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ repeat: Infinity, duration: 12, ease: 'linear' }}
            className="absolute inset-2 sm:inset-3 rounded-full border border-amber-400/30"
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-kpu-gold shadow-[0_0_12px_#ffbf00]" />
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-kpu-orange shadow-[0_0_10px_#e95007]" />
          </motion.div>

          {/* Gelombang Pendar (Pulse Wave) Membesar */}
          <motion.div
            animate={{ scale: [0.95, 1.25, 0.95], opacity: [0.6, 0, 0.6] }}
            transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }}
            className="absolute inset-6 rounded-full border border-kpu-gold/50 pointer-events-none"
          />

          {/* Kartu Utama Lambang KPU dengan Efek Kaca Mengambang 3D (Glassmorphic Shield) */}
          <motion.div
            animate={{
              y: [-5, 5, -5],
              rotateX: [0, 6, 0],
              rotateY: [0, -6, 0],
            }}
            transition={{
              repeat: Infinity,
              duration: 4.5,
              ease: 'easeInOut',
            }}
            className="relative z-10 w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-b from-white/15 via-white/5 to-white/10 backdrop-blur-xl p-3.5 flex items-center justify-center border-2 border-kpu-gold/70 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_35px_rgba(255,191,0,0.35)]"
          >
            {/* Pantulan Cahaya Shimmer Menyilang */}
            <motion.div
              animate={{ x: ['-120%', '220%'] }}
              transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut', repeatDelay: 1 }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-full -skew-x-25 rounded-3xl pointer-events-none"
            />

            {/* Gambar Logo Asli KPU Berkualitas Tinggi */}
            <img
              src="https://chasil.tracking.kpu-sekadau.my.id/kpu-logo.png"
              alt="Logo KPU"
              className="w-full h-full object-contain filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.7)]"
            />
          </motion.div>
        </div>

        {/* Teks Identitas Aplikasi */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-1.5"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-kpu-maroon/80 border border-kpu-gold/50 shadow-md">
            <Shield className="w-3.5 h-3.5 text-kpu-gold" />
            <span className="text-[10px] font-mono tracking-widest font-black uppercase text-kpu-lightGold">
              KOMISI PEMILIHAN UMUM
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-md">
            C-Hasil Archive Tracker
          </h1>

          <p className="text-xs font-semibold text-amber-200/80 tracking-wide uppercase">
            Kabupaten Sekadau • Kalimantan Barat
          </p>
        </motion.div>

        {/* Bilah Progres Loading Laser KPU */}
        <div className="w-64 sm:w-72 mt-6 space-y-2.5">
          <div className="relative w-full h-2 rounded-full bg-black/60 border border-kpu-gold/40 overflow-hidden shadow-inner p-0.5">
            <motion.div
              animate={{
                x: ['-100%', '200%'],
              }}
              transition={{
                repeat: Infinity,
                duration: 1.8,
                ease: 'easeInOut',
              }}
              className="h-full w-2/3 rounded-full bg-gradient-to-r from-kpu-maroon via-kpu-gold to-amber-200 shadow-[0_0_15px_#ffbf00,0_0_25px_#e95007]"
            />
          </div>

          {/* Pesan Status Dinamis Berganti-ganti */}
          <motion.div
            key={activeStepText}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.3 }}
            className="flex items-center justify-center gap-2 text-xs font-mono text-amber-100 font-medium"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-kpu-gold animate-ping shrink-0" />
            <span className="truncate">{activeStepText}</span>
          </motion.div>
        </div>

        {/* Security Badge Footer */}
        <div className="mt-8 flex items-center gap-2 text-[10.5px] font-mono text-slate-400 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full backdrop-blur-sm">
          <Lock className="w-3 h-3 text-kpu-gold shrink-0" />
          <span>Sesi Enkripsi SSL • Pemilu 2024</span>
        </div>
      </div>
    </div>
  );
}

