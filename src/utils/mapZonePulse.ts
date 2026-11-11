interface RadiusLayer {
  setRadius(radius: number): unknown;
}

type FrameScheduler = Pick<typeof globalThis, 'requestAnimationFrame' | 'cancelAnimationFrame'>;

/** Ubah radius Leaflet langsung agar animasi juga mengubah geometri, bukan hanya CSS. */
export function startMapZonePulse(layers: RadiusLayer[], frames: FrameScheduler = globalThis): () => void {
  let frame = 0;
  let started: number | undefined;
  let stopped = false;
  const tick = (time: number) => {
    if (stopped) return;
    started ??= time;
    const phase = ((time - started) % 4000) / 4000;
    const radius = 350 + 750 * (1 - Math.cos(phase * Math.PI * 2)) / 2;
    layers.forEach(layer => layer.setRadius(radius));
    frame = frames.requestAnimationFrame(tick);
  };
  frame = frames.requestAnimationFrame(tick);
  return () => {
    stopped = true;
    frames.cancelAnimationFrame(frame);
  };
}
