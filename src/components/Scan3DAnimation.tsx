import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Layers,
  FolderOpen,
  FileText,
  CheckCheck,
  ShieldCheck,
  Scan,
  Award,
} from 'lucide-react';
import { AnimatedCounter } from '@/components/AnimatedCounter';

interface Scan3DAnimationProps {
  progress: number;
  currentKecamatan: string | null;
  statusMessage: string | null;
}

export function Scan3DAnimation({
  progress,
  currentKecamatan,
  statusMessage,
}: Scan3DAnimationProps) {
  // Indikator aktif jenis berkas yang tersorot scanner
  const [activeElectionIndex, setActiveElectionIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveElectionIndex((prev) => (prev + 1) % 5);
    }, 600);
    return () => clearInterval(interval);
  }, []);

  const electionTypes = [
    { code: 'PPWP', name: 'Presiden & Wakil Presiden', badgeColor: 'bg-rose-900/80 text-rose-200' },
    { code: 'DPR RI', name: 'Dewan Perwakilan Rakyat RI', badgeColor: 'bg-amber-900/80 text-amber-200' },
    { code: 'DPD RI', name: 'Dewan Perwakilan Daerah', badgeColor: 'bg-emerald-900/80 text-emerald-200' },
    { code: 'DPRD PROV', name: 'DPRD Prov. Kalimantan Barat', badgeColor: 'bg-blue-900/80 text-blue-200' },
    { code: 'DPRD KAB', name: 'DPRD Kab. Sekadau', badgeColor: 'bg-purple-900/80 text-purple-200' },
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#220302] via-[#160201] to-[#0c0101] p-4 sm:p-5 text-white border-2 border-kpu-gold/40 shadow-[0_0_50px_rgba(102,3,0,0.6),0_0_25px_rgba(255,191,0,0.25)]">
      {/* Background KPU Gold Grid Accent */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffbf0010_1px,transparent_1px),linear-gradient(to_bottom,#ffbf0010_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

      {/* Radial glow background khas KPU Maroon & Gold */}
      <div className="absolute -top-16 -left-16 w-64 h-64 bg-kpu-maroon/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-kpu-orange/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-kpu-gold/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top HUD Telemetry Bar KPU */}
      <div className="relative z-10 flex items-center justify-between pb-3 border-b border-kpu-gold/25 text-[10px] sm:text-xs">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-kpu-gold opacity-80"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-kpu-gold shadow-[0_0_8px_#ffbf00]"></span>
          </span>
          <span className="font-mono font-bold tracking-wider text-kpu-lightGold uppercase flex items-center gap-1.5">
            <Scan className="w-3.5 h-3.5 text-kpu-gold animate-pulse" />
            Pemindaian Berkas Model C-Hasil KPU
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono">
          <span className="hidden sm:inline text-amber-200/60 text-[10px]">PEMILU 2024 • SEKADAU</span>
          <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-kpu-maroon to-kpu-darkMaroon border border-kpu-gold/50 text-kpu-lightGold font-bold text-[9px] shadow-sm">
            ● PEMINDAIAN AKTIF
          </span>
        </div>
      </div>

      {/* 3D Isometric Scanning Chamber KPU */}
      <div className="relative my-4 flex items-center justify-center min-h-[220px] sm:min-h-[250px] overflow-hidden rounded-xl bg-gradient-to-b from-[#1b0302]/90 to-[#0e0202]/95 border border-kpu-maroon/60 [perspective:1000px] shadow-inner">
        {/* Hologram Golden Light Cone Backlight */}
        <div className="absolute inset-0 bg-gradient-to-t from-kpu-gold/15 via-transparent to-transparent pointer-events-none" />

        {/* 3D Tilted Document Model (C-Hasil Paper) */}
        <motion.div
          className="relative w-[230px] sm:w-[270px] h-[215px] sm:h-[235px] rounded-xl bg-gradient-to-br from-amber-50 via-white to-amber-100/90 text-slate-900 p-3 sm:p-3.5 shadow-[0_25px_60px_-10px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,191,0,0.4)] select-none border-2 border-kpu-gold/60"
          style={{
            transformStyle: 'preserve-3d',
            transform: 'rotateX(38deg) rotateZ(-14deg) scale(0.95)',
          }}
          animate={{
            rotateZ: [-14, -12, -14],
            rotateX: [38, 40, 38],
          }}
          transition={{
            repeat: Infinity,
            duration: 6,
            ease: 'easeInOut',
          }}
        >
          {/* Header Berkas C-Hasil Resmi KPU */}
          <div className="flex items-center justify-between pb-1.5 border-b-2 border-kpu-maroon">
            <div className="flex items-center gap-2">
              <img
                src="https://chasil.tracking.kpu-sekadau.my.id/kpu-logo.png"
                alt="Logo KPU"
                className="w-5 h-5 object-contain shrink-0 drop-shadow-xs"
              />
              <div className="flex flex-col leading-tight">
                <span className="text-[8px] font-black tracking-tight text-kpu-darkMaroon uppercase">
                  KOMISI PEMILIHAN UMUM
                </span>
                <span className="text-[6.5px] font-extrabold text-kpu-maroon">
                  FORMULIR MODEL C-HASIL SEKADAU
                </span>
              </div>
            </div>
            <div className="text-[7px] font-mono font-bold px-1.5 py-0.5 rounded bg-kpu-maroon text-kpu-lightGold border border-kpu-gold/60 shadow-xs">
              2024
            </div>
          </div>

          {/* 5 Baris Simulasi Berkas 5 Jenis Pemilu */}
          <div className="mt-2 space-y-1">
            {electionTypes.map((item, idx) => {
              const isCurrent = activeElectionIndex === idx;
              return (
                <div
                  key={item.code}
                  className={`flex items-center justify-between p-1 rounded transition-all text-[7.5px] sm:text-[8px] font-mono ${
                    isCurrent
                      ? 'bg-amber-100/95 border border-kpu-gold text-kpu-darkMaroon font-black shadow-sm ring-1 ring-kpu-orange/50'
                      : 'bg-white/80 border border-amber-200/60 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isCurrent ? 'bg-kpu-orange animate-ping' : 'bg-slate-400'
                      }`}
                    />
                    <span className="font-black text-kpu-darkMaroon">{item.code}</span>
                    <span className="hidden sm:inline text-[7px] text-slate-500 font-sans truncate max-w-[95px]">
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-1.5 w-6 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-kpu-orange to-kpu-gold"
                        style={{ width: isCurrent ? '100%' : '80%' }}
                      />
                    </div>
                    {isCurrent ? (
                      <span className="text-kpu-orange font-black">MEMINDAI...</span>
                    ) : (
                      <span className="text-emerald-700 font-bold">✓ SAH</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Simulasi Barcode & Stempel KPU */}
          <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between pt-1 border-t border-amber-300 text-[6.5px] text-slate-500 font-mono">
            <span className="text-kpu-darkMaroon font-bold">*KPU-SEKADAU-698-TPS*</span>
            <div className="flex gap-0.5 items-center">
              <span className="w-1 h-2 bg-kpu-darkMaroon" />
              <span className="w-0.5 h-2 bg-kpu-darkMaroon" />
              <span className="w-1.5 h-2 bg-kpu-darkMaroon" />
              <span className="w-0.5 h-2 bg-kpu-darkMaroon" />
              <span className="w-1 h-2 bg-kpu-darkMaroon" />
            </div>
            <span className="text-emerald-700 font-bold">TERVERIFIKASI</span>
          </div>

          {/* Sinar Laser Pemindai Emas & Oranye KPU (Golden Laser Beam) */}
          <motion.div
            className="absolute left-0 right-0 pointer-events-none z-30"
            style={{ top: '10%' }}
            animate={{
              top: ['4%', '88%', '4%'],
            }}
            transition={{
              repeat: Infinity,
              duration: 2.2,
              ease: 'easeInOut',
            }}
          >
            {/* Garis Laser Berpijar Kuning Emas & Oranye */}
            <div className="h-[3px] w-full bg-gradient-to-r from-kpu-gold via-yellow-200 to-kpu-gold shadow-[0_0_15px_#ffbf00,0_0_30px_#e95007,0_0_45px_#660300]" />

            {/* Tirai Cahaya Laser Emas Menyorot ke Bawah */}
            <div className="h-12 w-full bg-gradient-to-b from-kpu-gold/45 via-kpu-orange/15 to-transparent -mt-[1px]" />

            {/* Reticle Target Tengah */}
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-kpu-darkMaroon border border-kpu-gold text-kpu-lightGold text-[6.5px] font-mono tracking-widest uppercase shadow-md flex items-center gap-1 whitespace-nowrap">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-kpu-gold animate-ping" />
              PEMERIKSAAN BERKAS
            </div>
          </motion.div>
        </motion.div>

        {/* Lencana Hologram Melayang dengan Nuansa KPU */}
        <motion.div
          animate={{ y: [-4, 4, -4] }}
          transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
          className="absolute top-3 left-3 sm:left-6 z-20 pointer-events-none hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-kpu-darkMaroon/90 border border-kpu-gold/50 backdrop-blur-md shadow-lg text-[9px] text-kpu-lightGold font-mono"
        >
          <Award className="w-3.5 h-3.5 text-kpu-gold" />
          <span>REKAPITULASI RESMI KPU</span>
        </motion.div>

        <motion.div
          animate={{ y: [4, -4, 4] }}
          transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
          className="absolute bottom-3 right-3 sm:right-6 z-20 pointer-events-none hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-kpu-darkMaroon/90 border border-kpu-orange/60 backdrop-blur-md shadow-lg text-[9px] text-amber-200 font-mono"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-kpu-gold" />
          <span>SINKRONISASI DATA DRIVE</span>
        </motion.div>
      </div>

      {/* Progress & Telemetry Section KPU */}
      <div className="space-y-3 pt-1">
        {/* Row Info Kecamatan & Persentase Emas KPU */}
        <div className="flex items-end justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-mono tracking-wider text-amber-300/80 block">
              TARGET WILAYAH PEMINDAIAN:
            </span>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-kpu-maroon to-kpu-darkMaroon border border-kpu-gold/50 text-kpu-lightGold font-bold text-xs sm:text-sm font-sans flex items-center gap-1.5 shadow-md">
                <Layers className="w-3.5 h-3.5 text-kpu-gold" />
                {currentKecamatan ? `Kecamatan ${currentKecamatan}` : 'Seluruh 7 Kecamatan Sekadau'}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-mono text-kpu-gold font-bold block">
              PROGRES SINKRONISASI
            </span>
            <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white flex items-center justify-end gap-0.5 drop-shadow-[0_0_12px_rgba(255,191,0,0.5)]">
              <span className="text-kpu-lightGold">
                <AnimatedCounter value={progress} duration={0.8} />
              </span>
              <span className="text-kpu-gold text-lg">%</span>
            </div>
          </div>
        </div>

        {/* Bilah Progres Laser dengan Gradien KPU (Maroon → Orange → Gold) */}
        <div className="relative w-full h-3 rounded-full bg-[#120101] border border-kpu-gold/50 overflow-hidden shadow-inner p-0.5">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-kpu-maroon via-kpu-orange to-kpu-gold relative overflow-hidden shadow-[0_0_18px_rgba(233,80,7,0.8)]"
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(progress, 4)}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            {/* Pantulan Cahaya Shimmer Putih-Emas */}
            <motion.div
              animate={{ x: ['-100%', '300%'] }}
              transition={{ repeat: Infinity, duration: 1.4, ease: 'linear' }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent w-1/2 -skew-x-20"
            />
          </motion.div>
        </div>

        {/* Pesan Status Terminal & Stepper Ikon KPU */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-[11px] font-mono">
          <div className="flex items-center gap-2 text-amber-100 truncate">
            <span className="text-kpu-gold animate-pulse font-black text-sm">&gt;</span>
            <span className="truncate">{statusMessage || 'Menyiapkan pemindaian berkas scan C-Hasil...'}</span>
          </div>

          {/* Indikator Status Ikon Tanpa Teks Teknis */}
          <div className="flex items-center gap-1.5 shrink-0 bg-kpu-darkMaroon/80 px-2.5 py-1 rounded-full border border-kpu-gold/30">
            <span
              title="Folder Terbaca"
              className={`p-1 rounded-full transition-colors ${
                progress >= 15 ? 'bg-kpu-maroon text-kpu-gold shadow-xs' : 'text-slate-600'
              }`}
            >
              <FolderOpen className="w-3 h-3" />
            </span>
            <span className="text-kpu-gold/40 text-[9px]">›</span>
            <span
              title="Formulir Terverifikasi"
              className={`p-1 rounded-full transition-colors ${
                progress >= 70 ? 'bg-kpu-maroon text-kpu-gold shadow-xs' : 'text-slate-600'
              }`}
            >
              <FileText className="w-3 h-3" />
            </span>
            <span className="text-kpu-gold/40 text-[9px]">›</span>
            <span
              title="Arsip Tersimpan"
              className={`p-1 rounded-full transition-colors ${
                progress >= 95 ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/50 shadow-xs' : 'text-slate-600'
              }`}
            >
              <CheckCheck className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
