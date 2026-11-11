export type Point = { x: number; y: number };
export type Corners = [Point, Point, Point, Point];
export const FULL_PAGE: Corners = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
export const MAX_SCAN_PAGES = 25;

/** Deteksi kontur dari tepi RGB, tanpa asumsi bahwa kertas harus putih. */
export function detectPaper(image: ImageData): Corners | null {
  const { width: w, height: h, data } = image;
  if (w < 12 || h < 12) return null;
  const smooth = new Float32Array(w * h * 3);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) for (let k = 0; k < 3; k++) {
    let sum = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) sum += data[((y + dy) * w + x + dx) * 4 + k];
    smooth[(y * w + x) * 3 + k] = sum / 9;
  }
  const strength = new Float32Array(w * h), histogram = new Uint32Array(256);
  for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) {
    let edge = 0;
    for (let k = 0; k < 3; k++) {
      const at = (dx: number, dy: number) => smooth[((y + dy) * w + x + dx) * 3 + k];
      const gx = -at(-1,-1) - 2 * at(-1,0) - at(-1,1) + at(1,-1) + 2 * at(1,0) + at(1,1);
      const gy = -at(-1,-1) - 2 * at(0,-1) - at(1,-1) + at(-1,1) + 2 * at(0,1) + at(1,1);
      edge = Math.max(edge, Math.hypot(gx, gy) / 4);
    }
    strength[y * w + x] = edge; histogram[Math.min(255, Math.round(edge))]++;
  }
  let percentile = 0, count = 0;
  for (; percentile < 255; percentile++) { count += histogram[percentile]; if (count >= (w - 4) * (h - 4) * 0.85) break; }
  const threshold = Math.max(8, percentile * 0.65), mask = new Uint8Array(w * h);
  // Hubungkan celah kecil pada batas yang terkena bayangan atau tekstur.
  for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) if (strength[y * w + x] >= threshold) {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) mask[(y + dy) * w + x + dx] = 1;
  }
  const cross = (a: Point, b: Point, c: Point) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const area = (p: Point[]) => Math.abs(p.reduce((sum, a, i) => { const b = p[(i + 1) % p.length]; return sum + a.x * b.y - b.x * a.y; }, 0)) / 2;
  let best: Corners | null = null, bestScore = 0;
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue;
    const queue = [i]; mask[i] = 0;
    for (let j = 0; j < queue.length; j++) {
      const p = queue[j], x = p % w, y = Math.floor(p / w);
      for (const n of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) if (n >= 0 && mask[n]) { mask[n] = 0; queue.push(n); }
    }
    if (queue.length < Math.min(w, h)) continue;
    const points = queue.map(p => ({ x: p % w, y: Math.floor(p / w) })).sort((a,b) => a.x - b.x || a.y - b.y);
    const half = (pts: Point[]) => { const result: Point[] = []; for (const p of pts) { while (result.length >= 2 && cross(result[result.length - 2], result[result.length - 1], p) <= 0) result.pop(); result.push(p); } result.pop(); return result; };
    const hull = [...half(points), ...half([...points].reverse())], hullArea = area(hull);
    if (hull.length < 4 || hullArea < w * h * 0.12 || hullArea > w * h * 0.94) continue;
    const quad = [...hull];
    while (quad.length > 4) {
      let min = Infinity, index = 0;
      for (let j = 0; j < quad.length; j++) { const lost = Math.abs(cross(quad[(j + quad.length - 1) % quad.length], quad[j], quad[(j + 1) % quad.length])); if (lost < min) { min = lost; index = j; } }
      quad.splice(index, 1);
    }
    if (area(quad) / hullArea < 0.86 || quad.filter(p => p.x < 3 || p.y < 3 || p.x > w - 4 || p.y > h - 4).length >= 2) continue;
    let support = 0;
    for (let side = 0; side < 4; side++) {
      let hits = 0;
      for (let t = 0; t <= 30; t++) {
        const a = quad[side], b = quad[(side + 1) % 4], x = Math.round(a.x + (b.x - a.x) * t / 30), y = Math.round(a.y + (b.y - a.y) * t / 30);
        let peak = 0;
        for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) if (x + dx >= 0 && x + dx < w && y + dy >= 0 && y + dy < h) peak = Math.max(peak, strength[(y + dy) * w + x + dx]);
        if (peak >= threshold) hits++;
      }
      if (hits < 20) { support = 0; break; } support += hits / 31;
    }
    if (!support) continue;
    // Pasangkan garis pada gradien asli, lalu potong empat garis untuk sudut presisi.
    const lines = quad.map((a, side) => {
      const b = quad[(side + 1) % 4], length = Math.hypot(b.x - a.x, b.y - a.y), nx = -(b.y - a.y) / length, ny = (b.x - a.x) / length;
      const samples: Point[] = [];
      for (let t = 0.15; t <= 0.85; t += 0.035) {
        const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
        const values: {d:number;v:number}[] = [];
        for (let d = -10; d <= 10; d += 0.5) { const px = Math.round(x + nx * d), py = Math.round(y + ny * d); if (px >= 0 && px < w && py >= 0 && py < h) values.push({ d, v: strength[py * w + px] }); }
        const peak = Math.max(...values.map(v => v.v));
        if (peak < threshold) continue;
        const strong = values.filter(v => v.v >= peak * 0.9), delta = strong.reduce((sum,v) => sum + v.d, 0) / strong.length;
        samples.push({ x:x + nx * delta, y:y + ny * delta });
      }
      if (samples.length < 8) return { x:nx, y:ny, c:nx * a.x + ny * a.y };
      const mx = samples.reduce((sum,p) => sum + p.x, 0) / samples.length, my = samples.reduce((sum,p) => sum + p.y, 0) / samples.length;
      let xx=0, yy=0, xy=0;
      for (const p of samples) { xx+=(p.x-mx)**2; yy+=(p.y-my)**2; xy+=(p.x-mx)*(p.y-my); }
      const angle = 0.5 * Math.atan2(2*xy, xx-yy), x = -Math.sin(angle), y = Math.cos(angle);
      return { x, y, c:x * mx + y * my };
    });
    const normalized = lines.map((b,j) => {
      const a = lines[(j + 3) % 4], det = a.x * b.y - b.x * a.y;
      if (Math.abs(det) < 1e-5) return {x:-1,y:-1};
      return {x:(a.c * b.y - b.c * a.y) / det / (w-1), y:(a.x * b.c - b.x * a.c) / det / (h-1)};
    });
    const first = normalized.reduce((min,p,j) => p.x + p.y < normalized[min].x + normalized[min].y ? j : min, 0);
    const corners = [...normalized.slice(first), ...normalized.slice(0, first)] as Corners;
    const score = area(quad) * support;
    if (validCorners(corners) && score > bestScore) { best = corners; bestScore = score; }
  }
  return best;
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
export function paperFromImage(image: CanvasImageSource, width: number, height: number, maxSide = 360): Corners | null {
  const canvas = document.createElement('canvas'); const scale = maxSide / Math.max(width, height); canvas.width = Math.max(1, Math.round(width * scale)); canvas.height = Math.max(1, Math.round(height * scale));
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

/** Pencahayaan lokal + rentang tonal, tetap mempertahankan tinta berwarna. */
export function applyMagicColor(image: ImageData): void {
  const { width:w, height:h, data } = image, tile = 48, cols = Math.ceil(w/tile), rows = Math.ceil(h/tile);
  const backgrounds = new Float32Array(cols*rows);
  for (let gy=0; gy<rows; gy++) for (let gx=0; gx<cols; gx++) {
    const hist = new Uint32Array(256); let count=0;
    for (let y=gy*tile; y<Math.min(h,(gy+1)*tile); y+=2) for (let x=gx*tile; x<Math.min(w,(gx+1)*tile); x+=2) { const i=(y*w+x)*4; hist[Math.max(data[i],data[i+1],data[i+2])]++; count++; }
    let total=0, level=255;
    for (let v=0; v<256; v++) { total+=hist[v]; if (total>=count*0.9) { level=v; break; } }
    backgrounds[gy*cols+gx]=Math.max(70,level);
  }
  // Interpolasi antar area mencegah batas kotak pada hasil koreksi bayangan.
  for (let y=0; y<h; y++) for (let x=0; x<w; x++) {
    const gx=Math.max(0,Math.min(cols-1,x/tile-0.5)), gy=Math.max(0,Math.min(rows-1,y/tile-0.5));
    const x0=Math.floor(gx), y0=Math.floor(gy), fx=gx-x0, fy=gy-y0;
    const a=backgrounds[y0*cols+x0], b=backgrounds[y0*cols+Math.min(cols-1,x0+1)], c=backgrounds[Math.min(rows-1,y0+1)*cols+x0], d=backgrounds[Math.min(rows-1,y0+1)*cols+Math.min(cols-1,x0+1)];
    const background=a*(1-fx)*(1-fy)+b*fx*(1-fy)+c*(1-fx)*fy+d*fx*fy;
    const gain=Math.min(2.5,245/background), i=(y*w+x)*4;
    for (let k=0; k<3; k++) { const normalized=data[i+k]*gain; data[i+k]=Math.max(0,Math.min(255,(normalized-20)*255/225)); }
  }
}

export async function renderScanPage(url: string, corners: Corners, rotation: number, brightness: number, contrast: number, grayscale: boolean, magicColor = false): Promise<HTMLCanvasElement> {
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
      out.data[index + k] = value;
    }
    out.data[index + 3] = 255;
  }
  if (magicColor) applyMagicColor(out);
  for (let i=0; i<out.data.length; i+=4) {
    for (let k=0; k<3; k++) out.data[i+k] = Math.max(0,Math.min(255,((out.data[i+k]-128)*contrast+128)*brightness));
    if (grayscale) { const gray=out.data[i]*0.299+out.data[i+1]*0.587+out.data[i+2]*0.114; out.data[i]=out.data[i+1]=out.data[i+2]=gray; }
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
