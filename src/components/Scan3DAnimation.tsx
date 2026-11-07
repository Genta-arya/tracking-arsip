import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Cpu,
  Layers,
  HardDrive,
  Cloud,
  FileCheck,
  ShieldCheck,
  Scan,
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
    { code: 'PPWP', name: 'Presiden & Wakil Presiden', color: 'text-rose-400' },
    { code: 'DPR RI', name: 'Dewan Perwakilan Rakyat RI', color: 'text-amber-400' },
    { code: 'DPD RI', name: 'Dewan Perwakilan Daerah', color: 'text-emerald-400' },
    { code: 'DPRD PROV', name: 'DPRD Prov. Kalimantan Barat', color: 'text-cyan-400' },
    { code: 'DPRD KAB', name: 'DPRD Kab. Sekadau', color: 'text-purple-400' },
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-950 via-[#0a0f1d] to-slate-950 p-4 sm:p-5 text-white border border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.18)]">
      {/* Background Cyber Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#06b6d412_1px,transparent_1px),linear-gradient(to_bottom,#06b6d412_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

      {/* Radial glow background */}
      <div className="absolute -top-20 -left-20 w-60 h-60 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top HUD Telemetry Bar */}
      <div className="relative z-10 flex items-center justify-between pb-3 border-b border-cyan-500/20 text-[10px] sm:text-xs">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
          </span>
          <span className="font-mono font-bold tracking-wider text-cyan-300 uppercase flex items-center gap-1.5">
            <Scan className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            3D Laser Optical Scanner v2.4
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono text-slate-400">
          <span className="hidden sm:inline text-slate-500">DPI: 300 | 60 FPS</span>
          <span className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 font-bold">
            SCANNING ACTIVE
          </span>
        </div>
      </div>

      {/* 3D Isometric Scanning Chamber */}
      <div className="relative my-4 flex items-center justify-center min-h-[220px] sm:min-h-[250px] overflow-hidden rounded-xl bg-slate-900/60 border border-slate-800/80 [perspective:1000px]">
        {/* Hologram Light Cone Backlight */}
        <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/10 via-transparent to-transparent pointer-events-none" />

        {/* 3D Tilted Document Model */}
        <motion.div
          className="relative w-[220px] sm:w-[260px] h-[210px] sm:h-[230px] rounded-xl bg-gradient-to-br from-slate-100 via-white to-slate-200 text-slate-900 p-3 sm:p-3.5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.2)] select-none border border-slate-300"
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
          {/* Header Berkas C-Hasil */}
          <div className="flex items-center justify-between pb-1.5 border-b border-rose-300">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-kpu-maroon text-white flex items-center justify-center text-[7px] font-black shadow-xs">
                KPU
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-[8px] font-black tracking-tight text-kpu-darkMaroon uppercase">
                  KOMISI PEMILIHAN UMUM
                </span>
                <span className="text-[6.5px] font-bold text-slate-600">
                  MODEL C-HASIL KAB. SEKADAU
                </span>
              </div>
            </div>
            <div className="text-[7px] font-mono font-bold px-1 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
              PEMILU 2024
            </div>
          </div>

          {/* 5 Row Simulasi Formulir C-Hasil */}
          <div className="mt-2 space-y-1">
            {electionTypes.map((item, idx) => {
              const isCurrent = activeElectionIndex === idx;
              return (
                <div
                  key={item.code}
                  className={`flex items-center justify-between p-1 rounded transition-colors text-[7.5px] sm:text-[8px] font-mono ${
                    isCurrent
                      ? 'bg-cyan-100 border border-cyan-400 text-cyan-950 font-bold shadow-xs'
                      : 'bg-slate-50 border border-slate-200 text-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    <span className="font-black">{item.code}</span>
                    <span className="hidden sm:inline text-[7px] text-slate-500 font-sans truncate max-w-[90px]">
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-1.5 w-6 rounded bg-slate-200 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500"
                        style={{ width: isCurrent ? '100%' : '75%' }}
                      />
                    </div>
                    {isCurrent ? (
                      <span className="text-cyan-700 font-black">SCAN...</span>
                    ) : (
                      <span className="text-emerald-700 font-bold">✓ OK</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Simulasi Barcode & Tanda Tangan Digital */}
          <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between pt-1 border-t border-slate-200 text-[6.5px] text-slate-400 font-mono">
            <span>BARCODE: *KPU-SKD-698*</span>
            <div className="flex gap-0.5 items-center">
              <span className="w-1 h-2 bg-slate-800" />
              <span className="w-0.5 h-2 bg-slate-800" />
              <span className="w-1.5 h-2 bg-slate-800" />
              <span className="w-0.5 h-2 bg-slate-800" />
              <span className="w-1 h-2 bg-slate-800" />
            </div>
            <span>AUTHENTICATED</span>
          </div>

          {/* 3D Laser Beam Sweeper */}
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
            {/* Sinar Laser Inti */}
            <div className="h-[2.5px] w-full bg-gradient-to-r from-cyan-400 via-emerald-300 to-cyan-400 shadow-[0_0_15px_#22d3ee,0_0_25px_#06b6d4,0_0_40px_#10b981]" />

            {/* Tirai Cahaya Laser (Light Fan Sheet) */}
            <div className="h-12 w-full bg-gradient-to-b from-cyan-400/35 via-emerald-400/10 to-transparent -mt-[1px]" />

            {/* Target Reticle Laser Crosshair */}
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-cyan-900/90 border border-cyan-400 text-cyan-200 text-[6.5px] font-mono tracking-widest uppercase shadow-md flex items-center gap-1 whitespace-nowrap">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              SCANNING C-HASIL
            </div>
          </motion.div>
        </motion.div>

        {/* Floating Holographic Badges di sekeliling 3D Document */}
        <motion.div
          animate={{ y: [-4, 4, -4] }}
          transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
          className="absolute top-3 left-3 sm:left-6 z-20 pointer-events-none hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-cyan-500/40 backdrop-blur-md shadow-lg text-[9px] text-cyan-300 font-mono"
        >
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <span>OCR RECOGNITION: ACTIVE</span>
        </motion.div>

        <motion.div
          animate={{ y: [4, -4, 4] }}
          transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
          className="absolute bottom-3 right-3 sm:right-6 z-20 pointer-events-none hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-emerald-500/40 backdrop-blur-md shadow-lg text-[9px] text-emerald-300 font-mono"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>FIREBASE REPLICATION: READY</span>
        </motion.div>
      </div>

      {/* Progress & Telemetry Section */}
      <div className="space-y-3 pt-1">
        {/* Row Info Kecamatan & Persentase */}
        <div className="flex items-end justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">
              TARGET WILAYAH PEMINDAIAN:
            </span>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs sm:text-sm font-sans flex items-center gap-1.5 shadow-xs">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                {currentKecamatan ? `Kecamatan ${currentKecamatan}` : 'Seluruh Kecamatan Sekadau'}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-mono text-cyan-400 font-bold block">
              PROGRES PEMINDAIAN
            </span>
            <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white flex items-center justify-end gap-0.5">
              <AnimatedCounter value={progress} duration={0.8} />
              <span className="text-cyan-400 text-lg">%</span>
            </div>
          </div>
        </div>

        {/* Laser Progress Bar dengan Glow Shimmer */}
        <div className="relative w-full h-3 rounded-full bg-slate-950 border border-cyan-500/30 overflow-hidden shadow-inner p-0.5">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-emerald-400 to-kpu-gold relative overflow-hidden shadow-[0_0_15px_rgba(6,182,212,0.6)]"
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(progress, 4)}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            {/* Shimmer Light Flare Effect */}
            <motion.div
              animate={{ x: ['-100%', '300%'] }}
              transition={{ repeat: Infinity, duration: 1.4, ease: 'linear' }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/70 to-transparent w-1/2 -skew-x-20"
            />
          </motion.div>
        </div>

        {/* Live Status Message & Flow Step Badges */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-[11px] font-mono">
          <div className="flex items-center gap-2 text-cyan-200 truncate">
            <span className="text-cyan-400 animate-pulse font-bold">&gt;</span>
            <span className="truncate">{statusMessage || 'Menyiapkan pemindaian berkas scan C-Hasil...'}</span>
          </div>

          {/* Stepper Status Mini */}
          <div className="flex items-center gap-2 shrink-0 text-[10px] text-slate-400">
            <div className={`flex items-center gap-1 ${progress >= 15 ? 'text-cyan-400 font-bold' : ''}`}>
              <HardDrive className="w-3 h-3" />
              <span>Drive</span>
            </div>
            <span>→</span>
            <div className={`flex items-center gap-1 ${progress >= 70 ? 'text-amber-400 font-bold' : ''}`}>
              <FileCheck className="w-3 h-3" />
              <span>OCR</span>
            </div>
            <span>→</span>
            <div className={`flex items-center gap-1 ${progress >= 95 ? 'text-emerald-400 font-bold' : ''}`}>
              <Cloud className="w-3 h-3" />
              <span>Cloud</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
