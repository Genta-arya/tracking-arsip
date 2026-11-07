import { useEffect, useRef, useState } from 'react';

interface AnimatedCounterProps {
  value: number;
  duration?: number; // duration in seconds
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  formatNumber?: boolean; // Indonesian locale grouping (e.g. 1.000)
}

/**
 * Komponen Angka Bertambah Halus (Animated Count-Up)
 * Menggunakan easing exponential out seperti presentasi keynote Apple / Stripe
 */
export function AnimatedCounter({
  value,
  duration = 1.3,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
  formatNumber = true,
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState<number>(0);
  const startTimeRef = useRef<number | null>(null);
  const startValueRef = useRef<number>(0);
  const endValueRef = useRef<number>(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    startValueRef.current = displayValue;
    endValueRef.current = value;
    startTimeRef.current = null;

    // Easing curve: exponential decay untuk transisi cepat lalu mendarat sangat halus
    const easeOutExpo = (t: number): number => {
      return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    };

    const step = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = (timestamp - startTimeRef.current) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutExpo(progress);

      const current = startValueRef.current + (endValueRef.current - startValueRef.current) * eased;
      setDisplayValue(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setDisplayValue(endValueRef.current);
      }
    };

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  const formatted =
    decimals > 0
      ? displayValue.toFixed(decimals)
      : formatNumber
      ? Math.round(displayValue).toLocaleString('id-ID')
      : Math.round(displayValue).toString();

  return (
    <span className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

export default AnimatedCounter;

