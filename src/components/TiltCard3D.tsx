import React, { useState, useRef } from 'react';
import { motion, useSpring } from 'framer-motion';

interface TiltCard3DProps {
  children: React.ReactNode;
  className?: string;
  borderColorClass?: string;
  glowColor?: string;
}

/**
 * Komponen Kartu Interaktif 3D (Parallax Mouse Tilt + Depth Layering + Specular Glare)
 * Memberikan efek kedalaman 3D nyata dengan sudut rotasi dinamis dan pencahayaan dinamis.
 */
export function TiltCard3D({
  children,
  className = '',
  borderColorClass = 'border-l-kpu-maroon',
  glowColor = 'rgba(102, 3, 0, 0.15)',
}: TiltCard3DProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });

  // Spring physics untuk pergerakan 3D yang sangat lembut dan berbobot nyata
  const springConfig = { stiffness: 350, damping: 24, mass: 0.8 };
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

    // Hitung derajat kemiringan 3D (Maksimal +/- 14 derajat)
    const rX = ((y - centerY) / centerY) * -13;
    const rY = ((x - centerX) / centerX) * 13;

    rotateX.set(rX);
    rotateY.set(rY);

    setGlare({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 0.35,
    });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    scale.set(1.035);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    rotateX.set(0);
    rotateY.set(0);
    scale.set(1);
    setGlare((prev) => ({ ...prev, opacity: 0 }));
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="h-full [perspective:1000px] select-none"
    >
      <motion.div
        style={{
          rotateX,
          rotateY,
          scale,
          transformStyle: 'preserve-3d',
        }}
        className={`relative h-full rounded-2xl bg-white border border-slate-200/90 border-l-[5px] ${borderColorClass} shadow-[0_10px_25px_-5px_rgba(0,0,0,0.06),0_8px_10px_-6px_rgba(0,0,0,0.04)] transition-shadow duration-300 overflow-hidden ${
          isHovered ? 'shadow-[0_22px_45px_-10px_rgba(0,0,0,0.18)]' : ''
        } ${className}`}
      >
        {/* Dynamic Glowing Ambient Corner */}
        <div
          className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl pointer-events-none transition-opacity duration-300"
          style={{
            backgroundColor: glowColor,
            opacity: isHovered ? 0.9 : 0.25,
          }}
        />

        {/* Dynamic Specular Glass Glare yang mengikuti kursor mouse */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-30 rounded-2xl"
          style={{
            background: `radial-gradient(circle 140px at ${glare.x}% ${glare.y}%, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0) 70%)`,
            opacity: glare.opacity,
          }}
        />

        {/* Top Bevel Highlight (Efek tepi kaca 3D) */}
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none z-20" />

        {/* Card Content with 3D Depth Layering */}
        <div
          style={{
            transform: 'translateZ(26px)',
            transformStyle: 'preserve-3d',
          }}
          className="relative z-10 h-full p-4 sm:p-5 flex flex-col justify-between"
        >
          {children}
        </div>
      </motion.div>
    </div>
  );
}

