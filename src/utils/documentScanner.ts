export type Point = { x: number; y: number };
export type Corners = [Point, Point, Point, Point];
export const FULL_PAGE: Corners = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
export const MAX_SCAN_PAGES = 25;

/** Cari komponen kertas terang terbesar; koordinat dinormalisasi untuk editor dan kamera. */
export function detectPaper(image: ImageData): Corners | null {
  const { width: w, height: h, data } = image;
  const visited = new Uint8Array(w * h);
  let best: number[] = [];
  const bright = (i: number) => {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    return (r + g + b) / 3 > 155 && Math.max(r, g, b) - Math.min(r, g, b) < 65;
  };
  for (let i = 0; i < visited.length; i++) {
    if (visited[i] || !bright(i)) continue;
    const queue = [i]; visited[i] = 1;
    for (let j = 0; j < queue.length; j++) {
      const p = queue[j], x = p % w, y = Math.floor(p / w);
      for (const n of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) {
        if (n >= 0 && !visited[n]) { visited[n] = 1; if (bright(n)) queue.push(n); }
      }
    }
    if (queue.length > best.length) best = queue;
  }
  if (best.length < w * h * 0.12 || best.length > w * h * 0.94) return null;
  const pts = best.map(i => ({ x: (i % w) / (w - 1), y: Math.floor(i / w) / (h - 1) }));
  const extreme = (fn: (p: Point) => number) => pts.reduce((a, b) => fn(a) < fn(b) ? a : b);
  const corners: Corners = [extreme(p => p.x + p.y), extreme(p => -p.x + p.y), extreme(p => -p.x - p.y), extreme(p => p.x - p.y)];
  return validCorners(corners) ? corners : null;
}

export function validCorners(c: Corners): boolean {
  return c.every((p, i) => {
    const q = c[(i + 1) % 4], r = c[(i + 2) % 4];
    return Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1 &&
      (q.x - p.x) * (r.y - q.y) - (q.y - p.y) * (r.x - q.x) > 0.002;
  });
}

export function loadScanImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error('Gambar tidak dapat dibaca. Gunakan JPG, PNG, atau WebP.')); image.src = url;
  });
}
export function paperFromImage(image: CanvasImageSource, width: number, height: number): Corners | null {
  const canvas = document.createElement('canvas'); canvas.width = 240; canvas.height = Math.max(1, Math.round(height / width * 240));
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return detectPaper(ctx.getImageData(0, 0, canvas.width, canvas.height));
}

/** Homografi persegi satuan ke empat sudut: meluruskan perspektif dokumen. */
export function projectPoint(c: Corners, u: number, v: number): Point {
  const [a, b, d, e] = c;
  const dx = a.x - b.x + d.x - e.x, dy = a.y - b.y + d.y - e.y;
  const bx = b.x - d.x, ex = e.x - d.x, by = b.y - d.y, ey = e.y - d.y;
  const determinant = bx * ey - ex * by;
  const g = Math.abs(determinant) < 1e-10 ? 0 : (dx * ey - ex * dy) / determinant;
  const h = Math.abs(determinant) < 1e-10 ? 0 : (bx * dy - dx * by) / determinant;
  const z = g * u + h * v + 1;
  return { x: ((b.x - a.x + g * b.x) * u + (e.x - a.x + h * e.x) * v + a.x) / z,
    y: ((b.y - a.y + g * b.y) * u + (e.y - a.y + h * e.y) * v + a.y) / z };
}

export async function renderScanPage(url: string, corners: Corners, rotation: number, brightness: number, contrast: number, grayscale: boolean): Promise<HTMLCanvasElement> {
  if (!validCorners(corners)) throw new Error('Sudut crop harus membentuk bidang tanpa saling silang.');
  const image = await loadScanImage(url);
  const source = document.createElement('canvas');
  const scale = Math.min(1, 1800 / Math.max(image.width, image.height));
  source.width = Math.round(image.width * scale); source.height = Math.round(image.height * scale);
  const ctx = source.getContext('2d', { willReadFrequently: true })!; ctx.drawImage(image, 0, 0, source.width, source.height);
  const distance = (a: Point, b: Point) => Math.hypot((a.x - b.x) * source.width, (a.y - b.y) * source.height);
  const w = Math.max(1, Math.round(Math.max(distance(corners[0], corners[1]), distance(corners[3], corners[2]))));
  const h = Math.max(1, Math.round(Math.max(distance(corners[0], corners[3]), distance(corners[1], corners[2]))));
  const pixels = ctx.getImageData(0, 0, source.width, source.height);
  const out = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = projectPoint(corners, x / Math.max(1, w - 1), y / Math.max(1, h - 1));
    const sx = Math.max(0, Math.min(source.width - 1, p.x * (source.width - 1)));
    const sy = Math.max(0, Math.min(source.height - 1, p.y * (source.height - 1)));
    const x0 = Math.floor(sx), y0 = Math.floor(sy), fx = sx - x0, fy = sy - y0;
    const p00 = (y0 * source.width + x0) * 4;
    const p10 = (y0 * source.width + Math.min(x0 + 1, source.width - 1)) * 4;
    const p01 = (Math.min(y0 + 1, source.height - 1) * source.width + x0) * 4;
    const p11 = (Math.min(y0 + 1, source.height - 1) * source.width + Math.min(x0 + 1, source.width - 1)) * 4;
    const index = (y * w + x) * 4;
    for (let k = 0; k < 3; k++) {
      const value = pixels.data[p00 + k] * (1 - fx) * (1 - fy) + pixels.data[p10 + k] * fx * (1 - fy) + pixels.data[p01 + k] * (1 - fx) * fy + pixels.data[p11 + k] * fx * fy;
      out.data[index + k] = Math.max(0, Math.min(255, ((value - 128) * contrast + 128) * brightness));
    }
    if (grayscale) {
      const gray = out.data[index] * 0.299 + out.data[index + 1] * 0.587 + out.data[index + 2] * 0.114;
      out.data[index] = out.data[index + 1] = out.data[index + 2] = gray;
    }
    out.data[index + 3] = 255;
  }
  const crop = document.createElement('canvas'); crop.width = w; crop.height = h; crop.getContext('2d')!.putImageData(out, 0, 0);
  const result = document.createElement('canvas'); const sideways = rotation % 180 !== 0;
  result.width = sideways ? h : w; result.height = sideways ? w : h;
  const final = result.getContext('2d')!; final.translate(result.width / 2, result.height / 2); final.rotate(rotation * Math.PI / 180); final.drawImage(crop, -w / 2, -h / 2);
  return result;
}

/** PDF lokal dengan gambar JPEG per halaman, ukuran A4 dan orientasi mengikuti gambar. */
export interface PdfScanImage { width: number; height: number; jpeg: Uint8Array }
export async function createScanPdf(images: PdfScanImage[]): Promise<Blob> {
  if (images.length < 1 || images.length > MAX_SCAN_PAGES) throw new Error('PDF harus berisi 1 sampai 25 halaman.');
  const encoder = new TextEncoder(); const chunks: Uint8Array[] = []; let offset = 0;
  const offsets = [0]; const append = (value: string | Uint8Array) => { const bytes = typeof value === 'string' ? encoder.encode(value) : value; chunks.push(bytes); offset += bytes.length; };
  const object = (id: number, text: string) => { offsets[id] = offset; append(`${id} 0 obj\n${text}\nendobj\n`); };
  append('%PDF-1.4\n'); object(1, '<< /Type /Catalog /Pages 2 0 R >>');
  object(2, `<< /Type /Pages /Count ${images.length} /Kids [${images.map((_, i) => `${3 + i * 3} 0 R`).join(' ')}] >>`);
  for (let i = 0; i < images.length; i++) {
    const canvas = images[i], id = 3 + i * 3;
    const landscape = canvas.width > canvas.height, pw = landscape ? 842 : 595, ph = landscape ? 595 : 842;
    const scale = Math.min((pw - 24) / canvas.width, (ph - 24) / canvas.height), w = canvas.width * scale, h = canvas.height * scale;
    object(id, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] /Resources << /XObject << /Im ${id + 1} 0 R >> >> /Contents ${id + 2} 0 R >>`);
    const jpeg = canvas.jpeg;
    offsets[id + 1] = offset;
    append(`${id + 1} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`); append(jpeg); append('\nendstream\nendobj\n');
    const commands = `q ${w} 0 0 ${h} ${(pw - w) / 2} ${(ph - h) / 2} cm /Im Do Q`;
    object(id + 2, `<< /Length ${encoder.encode(commands).length} >>\nstream\n${commands}\nendstream`);
  }
  const xref = offset; append(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`);
  for (let i = 1; i < offsets.length; i++) append(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  append(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(chunks as BlobPart[], { type: 'application/pdf' });
}
