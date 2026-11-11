import cvUrl from '@techstark/opencv-js/dist/opencv.js?url';
import type * as OpenCV from '@techstark/opencv-js';
import { detectDocument } from '../utils/documentDetection';

const scope = globalThis as unknown as {
  cv: Promise<typeof OpenCV>;
  onmessage: ((event: MessageEvent) => void) | null;
  postMessage(message: unknown): void;
};
const ready = (async () => {
  // Keep the 14 MB local runtime out of the application bundle and main thread.
  await import(/* @vite-ignore */ cvUrl);
  return await scope.cv;
})();
ready.then(() => scope.postMessage({ ready: true })).catch(() => scope.postMessage({ error: 'Mesin deteksi tidak dapat dimuat. Coba buka ulang scanner.' }));
scope.onmessage = async ({ data }: MessageEvent<{ id: number; width: number; height: number; buffer: ArrayBuffer }>) => {
  try {
    const cv = await ready;
    const image = new ImageData(new Uint8ClampedArray(data.buffer), data.width, data.height);
    const corners = detectDocument(cv, image);
    scope.postMessage({ id: data.id, corners });
  } catch {
    scope.postMessage({ id: data.id, error: 'Deteksi dokumen gagal. Coba ulang atau sesuaikan sudut crop.' });
  }
};
