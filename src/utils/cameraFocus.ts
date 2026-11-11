import type { Point } from './documentScanner';
export interface Viewport { width: number; height: number }

/** Koordinat sensor vs layar object-fit: cover (termasuk bagian video yang terpotong). */
function cover(source: Viewport, view: Viewport) {
  const scale = Math.max(view.width / source.width, view.height / source.height);
  return { width: source.width * scale, height: source.height * scale };
}
export function viewToCamera(point: Point, source: Viewport, view: Viewport): Point {
  const size = cover(source, view);
  return { x: Math.max(0, Math.min(1, (point.x * view.width + (size.width - view.width) / 2) / size.width)),
    y: Math.max(0, Math.min(1, (point.y * view.height + (size.height - view.height) / 2) / size.height)) };
}
export function cameraToView(point: Point, source: Viewport, view: Viewport): Point {
  const size = cover(source, view);
  return { x: (point.x * size.width - (size.width - view.width) / 2) / view.width,
    y: (point.y * size.height - (size.height - view.height) / 2) / view.height };
}

/** Fokus lensa hanya diklaim bila perangkat mengiklankan dukungan titik fokus. */
export async function focusCameraTrack(track: MediaStreamTrack, point: Point): Promise<boolean> {
  try {
    const caps = track.getCapabilities?.() as MediaTrackCapabilities & { pointsOfInterest?: unknown; focusMode?: string[] };
    if (!caps || !caps.pointsOfInterest) return false;
    const settings: MediaTrackConstraintSet & { pointsOfInterest: Point[]; focusMode?: string } = { pointsOfInterest: [point] };
    if (caps.focusMode?.includes('single-shot')) settings.focusMode = 'single-shot';
    else if (caps.focusMode?.includes('continuous')) settings.focusMode = 'continuous';
    await track.applyConstraints({ advanced: [settings] });
    return true;
  } catch { return false; }
}

export async function resetCameraFocus(track: MediaStreamTrack): Promise<void> {
  try {
    const caps = track.getCapabilities?.() as MediaTrackCapabilities & { focusMode?: string[]; pointsOfInterest?: unknown };
    if (!caps?.focusMode?.includes('continuous')) return;
    const settings: MediaTrackConstraintSet & { focusMode: string; pointsOfInterest?: Point[] } = { focusMode: 'continuous' };
    if (caps.pointsOfInterest) settings.pointsOfInterest = [{x:0.5,y:0.5}];
    await track.applyConstraints({ advanced: [settings] });
  } catch { /* Deteksi otomatis tetap dapat digunakan tanpa kontrol fokus lensa. */ }
}
