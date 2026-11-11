import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, ScanLine, X, Download, Plus, RotateCw, Trash2, ArrowLeft, ArrowRight, RefreshCw } from 'lucide-react';
import { Corners, PdfScanImage, FULL_PAGE, MAX_SCAN_PAGES, loadScanImage, paperFromImage, renderScanPage, validCorners, createScanPdf } from '@/utils/documentScanner';

interface ScanPage { id: string; url: string; corners: Corners; rotation: number; brightness: number; contrast: number; grayscale: boolean; width: number; height: number }
const actionClass = 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 disabled:opacity-40';
export function DocumentScanner() {
  const [open, setOpen] = useState(false), [pages, setPages] = useState<ScanPage[]>([]), [selected, setSelected] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null), [detected, setDetected] = useState<Corners | null>(null);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [crop, setCrop] = useState(false);
  const [preview, setPreview] = useState(''), [cameraSize, setCameraSize] = useState({ width: 4, height: 3 });
  const video = useRef<HTMLVideoElement>(null), input = useRef<HTMLInputElement>(null), drag = useRef<number | null>(null);
  const replacement = useRef<string | null>(null), urls = useRef(new Set<string>()), media = useRef<MediaStream | null>(null), cameraRequest = useRef(0);
  const dialog = useRef<HTMLDivElement>(null);
  const active = pages[selected];
  const stopCamera = () => { cameraRequest.current++; media.current?.getTracks().forEach(t => t.stop()); media.current = null; setStream(null); setDetected(null); };
  useEffect(() => () => { cameraRequest.current++; media.current?.getTracks().forEach(t => t.stop()); urls.current.forEach(url => URL.revokeObjectURL(url)); }, []);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow, focused = document.activeElement as HTMLElement | null; document.body.style.overflow = 'hidden';
    dialog.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        const nodes = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled):not([type="file"])');
        if (nodes?.length) {
          const first = nodes[0], last = nodes[nodes.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
      }
      if (event.key === 'Escape') { stopCamera(); setOpen(false); } };
    document.addEventListener('keydown', close);
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', close); focused?.focus(); };
  }, [open]);
  useEffect(() => {
    if (!stream || !video.current) return;
    video.current.srcObject = stream;
    video.current.play().catch(() => setError('Kamera belum dapat diputar. Tutup lalu buka kamera kembali.'));
    const timer = window.setInterval(() => {
      const v = video.current; if (!v || v.readyState < 2 || !v.videoWidth) return;
      setCameraSize({ width: v.videoWidth, height: v.videoHeight });
      setDetected(paperFromImage(v, v.videoWidth, v.videoHeight));
    }, 500);
    return () => window.clearInterval(timer);
  }, [stream]);
  useEffect(() => {
    if (!open || !active || crop || stream) return;
    let stale = false; setPreview('');
    const timer = window.setTimeout(() => {
      renderScanPage(active.url, active.corners, active.rotation, active.brightness, active.contrast, active.grayscale)
        .then(canvas => { if (!stale) setPreview(canvas.toDataURL('image/jpeg', 0.85)); })
        .catch(e => { if (!stale) setError(e.message); });
    }, 150);
    return () => { stale = true; window.clearTimeout(timer); };
  }, [active, open, crop, stream]);
  const change = (patch: Partial<ScanPage>) => setPages(list => list.map(p => p.id === active?.id ? { ...p, ...patch } : p));
  const startCamera = async (retake = false) => {
    if (!retake && pages.length >= MAX_SCAN_PAGES) { setError('Maksimal 25 halaman. Hapus satu halaman sebelum menambahkan foto.'); return; }
    replacement.current = retake ? active?.id ?? null : null;
    setError(''); setCrop(false); stopCamera();
    const request = cameraRequest.current;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera membutuhkan HTTPS dan browser yang mendukung. Gunakan tombol Tambah gambar.');
      const result = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false });
      if (request !== cameraRequest.current) { result.getTracks().forEach(t => t.stop()); return; }
      media.current = result; setStream(result);
    } catch (e) { setError(e instanceof Error ? `Camera: ${e.message}. Anda tetap bisa menambahkan foto dari galeri.` : 'Camera tidak dapat dibuka.'); }
  };
  const addBlob = async (blob: Blob, target: string | null) => {
    const sourceUrl = URL.createObjectURL(blob); let image: HTMLImageElement;
    try { image = await loadScanImage(sourceUrl); } catch (e) { URL.revokeObjectURL(sourceUrl); throw e; }
    // Simpan salinan terkompresi agar 25 foto kamera tidak memenuhi memori.
    const normalized = document.createElement('canvas'), scale = Math.min(1, 1800 / Math.max(image.width, image.height));
    normalized.width = Math.max(1, Math.round(image.width * scale)); normalized.height = Math.max(1, Math.round(image.height * scale));
    normalized.getContext('2d')!.drawImage(image, 0, 0, normalized.width, normalized.height); URL.revokeObjectURL(sourceUrl);
    const compressed = await new Promise<Blob>((resolve, reject) => normalized.toBlob(b => b ? resolve(b) : reject(new Error('Gagal menyimpan gambar.')), 'image/jpeg', 0.92));
    const url = URL.createObjectURL(compressed); urls.current.add(url);
    const corners = paperFromImage(normalized, normalized.width, normalized.height);
    const page: ScanPage = { id: target || (globalThis.crypto?.randomUUID?.() ?? `scan-${Date.now()}-${Math.random().toString(36).slice(2)}`), url, corners: corners || FULL_PAGE, rotation: 0, brightness: 1, contrast: 1, grayscale: false, width: normalized.width, height: normalized.height };
    setPages(list => {
      const index = target ? list.findIndex(p => p.id === target) : -1;
      if (index >= 0) { const old = list[index]; URL.revokeObjectURL(old.url); urls.current.delete(old.url); return list.map(p => p.id === target ? page : p); }
      if (list.length >= MAX_SCAN_PAGES) { URL.revokeObjectURL(url); urls.current.delete(url); return list; }
      return [...list, page];
    });
    setMessage(corners ? 'Kertas terdeteksi dan crop otomatis diterapkan. Periksa hasilnya.' : 'Batas kertas belum jelas. Gunakan Edit crop untuk menyesuaikan sudut.');
  };
  const capture = async () => {
    if (busy) return;
    if (!video.current?.videoWidth) { setError('Kamera belum siap. Tunggu pratinjau muncul sebelum mengambil foto.'); return; }
    setBusy(true); setError('');
    try {
      const v = video.current, canvas = document.createElement('canvas'); canvas.width = v.videoWidth; canvas.height = v.videoHeight; canvas.getContext('2d')!.drawImage(v, 0, 0);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('Gagal mengambil gambar.')), 'image/jpeg', 0.92));
      await addBlob(blob, replacement.current);
      if (!replacement.current) setSelected(pages.length);
      replacement.current = null; stopCamera();
    } catch (e) { setError(e instanceof Error ? e.message : 'Gagal mengambil foto.'); } finally { setBusy(false); }
  };
  const upload = async (files: FileList | null) => {
    if (!files) return;
    setBusy(true); setError(''); const target = replacement.current; replacement.current = null;
    const capacity = target ? 1 : MAX_SCAN_PAGES - pages.length;
    const images = [...files].slice(0, capacity);
    try {
      for (const file of images) { if (!file.type.startsWith('image/')) throw new Error('Hanya gambar yang dapat ditambahkan.'); await addBlob(file, target); }
      if (images.length && !target) setSelected(pages.length);
      if (files.length > capacity) setError(`Maksimal ${MAX_SCAN_PAGES} halaman; ${files.length - capacity} gambar tidak ditambahkan.`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Gagal membaca gambar.'); } finally { setBusy(false); if (input.current) input.current.value = ''; }
  };
  const download = async () => {
    if (!pages.length || busy) return;
    setBusy(true); setError('');
    try {
      const canvases: PdfScanImage[] = [];
      for (let i = 0; i < pages.length; i++) {
        setMessage(`Menyiapkan PDF ${i + 1}/${pages.length}…`); await new Promise(resolve => setTimeout(resolve, 0));
        const p = pages[i];
        const canvas = await renderScanPage(p.url, p.corners, p.rotation, p.brightness, p.contrast, p.grayscale);
        canvases.push({ width: canvas.width, height: canvas.height, jpeg: Uint8Array.from(atob(canvas.toDataURL('image/jpeg', 0.88).split(',')[1]), c => c.charCodeAt(0)) });
        canvas.width = 0; canvas.height = 0;
      }
      const blob = await createScanPdf(canvases), url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = `Scan-Arsip-${new Date().toISOString().slice(0, 10)}.pdf`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 60000); setMessage('PDF siap diunduh.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Gagal membuat PDF.'); } finally { setBusy(false); }
  };
  const move = (delta: number) => { const next = selected + delta; if (next < 0 || next >= pages.length) return; setPages(list => { const copy = [...list]; [copy[selected], copy[next]] = [copy[next], copy[selected]]; return copy; }); setSelected(next); };
  return <>
    <button onClick={() => setOpen(true)} className="pointer-events-auto mb-3 flex items-center gap-2 rounded-full border border-amber-300 bg-gradient-to-r from-kpu-maroon to-rose-800 px-5 py-3 text-sm font-bold text-white shadow-xl"><ScanLine className="h-5 w-5" /> Scan Berkas</button>
    {open && createPortal(<div ref={dialog} className="fixed inset-0 z-[10020] flex flex-col bg-slate-100 text-slate-900" role="dialog" aria-modal="true" aria-label="Scan dokumen arsip">
      <header className="flex items-center justify-between gap-2 border-b bg-white px-4 py-3"><div><h2 className="flex items-center gap-2 font-black"><ScanLine className="h-5 w-5 text-kpu-maroon" /> Scan Berkas Arsip</h2><p className="text-xs text-slate-500">{pages.length}/25 halaman · Diproses di perangkat · Unduh PDF</p></div><button aria-label="Tutup scanner" disabled={busy} onClick={() => { stopCamera(); setOpen(false); }} className={actionClass}><X className="h-5 w-5" /></button></header>
      <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={e => void upload(e.target.files)} />
      <div className="flex flex-wrap gap-2 border-b bg-white p-3">
        <button className={actionClass} disabled={busy || (!stream && pages.length >= 25)} onClick={() => void startCamera()}><Camera className="h-4 w-4" /> Kamera</button>
        <button className={actionClass} disabled={busy || pages.length >= 25} onClick={() => { replacement.current = null; input.current?.click(); }}><Plus className="h-4 w-4" /> Tambah gambar</button>
        <button className={`${actionClass} ml-auto !bg-kpu-maroon !text-white`} disabled={busy || !pages.length} onClick={() => void download()}><Download className="h-4 w-4" /> Unduh PDF ({pages.length})</button>
      </div>
      {error && <p role="alert" className="bg-rose-100 px-4 py-2 text-sm text-rose-800">{error}</p>}
      {message && <p role="status" className="bg-amber-50 px-4 py-2 text-xs text-amber-900">{message}</p>}
      <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
        {stream ? <div className="mx-auto max-w-3xl">
          <div className="relative mx-auto overflow-hidden rounded-2xl bg-black" style={{ aspectRatio: `${cameraSize.width}/${cameraSize.height}`, width: `min(100%, ${55 * cameraSize.width / cameraSize.height}dvh)` }}>
            <video ref={video} autoPlay muted playsInline className="h-full w-full object-contain" />
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full"><polygon points={(detected || FULL_PAGE).map(p => `${p.x * 100},${p.y * 100}`).join(' ')} fill={detected ? '#10b98120' : 'transparent'} stroke={detected ? '#34d399' : '#ffffff80'} strokeWidth="0.6" strokeDasharray={detected ? undefined : '2 2'} /></svg>
            <p className="pointer-events-none absolute left-3 right-3 top-3 rounded-xl bg-black/60 px-3 py-2 text-center text-xs font-semibold text-white backdrop-blur-sm">{detected ? 'Kertas terdeteksi · siap difoto' : 'Arahkan ke kertas dengan cahaya merata'}</p>
            <div role="group" aria-label="Kontrol kamera" className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-3 bg-gradient-to-t from-black/90 to-transparent px-3 pb-4 pt-10">
              <button className="flex min-h-12 items-center gap-2 rounded-full border border-white/40 bg-black/60 px-4 py-3 text-xs font-bold text-white backdrop-blur-sm disabled:opacity-40" disabled={busy} onClick={stopCamera}><ArrowLeft className="h-4 w-4" /> Kembali</button>
              <button className="flex min-h-14 items-center gap-2 rounded-full border-4 border-white/70 bg-white px-5 py-3 text-sm font-black text-kpu-maroon shadow-xl active:scale-95 disabled:opacity-40" disabled={busy} onClick={() => void capture()}><Camera className="h-6 w-6" /> {busy ? 'Memproses…' : replacement.current ? 'Ganti halaman ini' : 'Ambil foto'}</button>
            </div>
          </div>
        </div>
        : active ? <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-[1fr_260px]">
          <div className="flex min-h-64 items-center justify-center rounded-2xl bg-slate-800 p-3">
            {crop ? <div className="relative w-full max-w-xl select-none" style={{ aspectRatio: `${active.width}/${active.height}` }}><img draggable={false} src={active.url} alt="Atur empat sudut kertas" className="h-full w-full" /><svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full touch-none" onPointerMove={e => {
              if (drag.current === null) return; const rect = e.currentTarget.getBoundingClientRect();
              const corners = active.corners.map(p => ({ ...p })) as Corners;
              corners[drag.current] = { x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)) };
              change({ corners });
            }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}><polygon points={active.corners.map(p => `${p.x * 100},${p.y * 100}`).join(' ')} fill="#10b98125" stroke="#34d399" strokeWidth="0.6" />{active.corners.map((p, i) => <circle key={i} cx={p.x * 100} cy={p.y * 100} r="3" fill="white" stroke="#059669" strokeWidth="0.6" className="cursor-move" onPointerDown={e => { drag.current = i; e.currentTarget.parentElement?.setPointerCapture(e.pointerId); }} />)}</svg></div> : preview ? <img src={preview} alt={`Hasil scan halaman ${selected + 1}`} className="max-h-[60vh] max-w-full object-contain shadow-xl" /> : <p className="text-white">Menyiapkan pratinjau…</p>}
          </div>
          <aside className="space-y-3 rounded-2xl bg-white p-4 shadow-sm"><h3 className="font-bold">Halaman {selected + 1} dari {pages.length}</h3><button className={`${actionClass} w-full`} disabled={busy} onClick={() => { if (crop && !validCorners(active.corners)) { setError('Sudut crop saling silang atau terlalu sempit. Geser kembali sudut kertas.'); return; } setCrop(!crop); setError(''); }}>{crop ? 'Terapkan crop & luruskan' : 'Edit crop · geser 4 sudut'}</button>
            <button className={`${actionClass} w-full`} disabled={busy} onClick={async () => { try { const image = await loadScanImage(active.url); const corners = paperFromImage(image, image.width, image.height); change({ corners: corners || FULL_PAGE }); setMessage(corners ? 'Crop otomatis diterapkan.' : 'Kertas belum terdeteksi. Geser sudut secara manual.'); setCrop(true); } catch { setError('Gagal mendeteksi kertas.'); } }}>Auto crop</button>
            <button className={`${actionClass} w-full`} disabled={busy} onClick={() => { change({ corners: FULL_PAGE }); setCrop(true); }}>Gunakan gambar penuh</button>
            <button className={`${actionClass} w-full`} disabled={busy || crop} onClick={() => change({ rotation: (active.rotation + 90) % 360 })}><RotateCw className="h-4 w-4" /> Putar 90°</button>
            {(['brightness', 'contrast'] as const).map(key => <label key={key} className="block text-xs font-semibold">{key === 'brightness' ? 'Kecerahan' : 'Kontras'} · {Math.round(active[key] * 100)}%<input className="mt-2 w-full" type="range" min="0.5" max="1.8" step="0.05" value={active[key]} disabled={busy} onChange={e => change({ [key]: Number(e.target.value) })} /></label>)}
            <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={active.grayscale} disabled={busy} onChange={e => change({ grayscale: e.target.checked })} /> Hitam putih</label>
            <div className="flex gap-2"><button aria-label="Pindah halaman ke kiri" className={actionClass} disabled={busy || selected === 0} onClick={() => move(-1)}><ArrowLeft className="h-4 w-4" /></button><span className="self-center text-xs">Urut halaman</span><button aria-label="Pindah halaman ke kanan" className={actionClass} disabled={busy || selected === pages.length - 1} onClick={() => move(1)}><ArrowRight className="h-4 w-4" /></button></div>
            <button className={`${actionClass} w-full`} disabled={busy} onClick={() => void startCamera(true)}><RefreshCw className="h-4 w-4" /> Ambil ulang halaman</button>
            <button className={`${actionClass} w-full`} disabled={busy} onClick={() => { replacement.current = active.id; input.current?.click(); }}>Ganti dari galeri</button>
            <button className={`${actionClass} w-full !text-rose-700`} disabled={busy} onClick={() => { URL.revokeObjectURL(active.url); urls.current.delete(active.url); setPages(list => list.filter(p => p.id !== active.id)); setSelected(Math.max(0, selected - 1)); setCrop(false); }}><Trash2 className="h-4 w-4" /> Hapus halaman</button>
          </aside>
        </div> : <div className="mx-auto mt-12 max-w-md rounded-3xl bg-white p-8 text-center shadow-sm"><ScanLine className="mx-auto mb-4 h-14 w-14 text-kpu-maroon" /><h3 className="text-xl font-black">Scan dokumen, halaman demi halaman</h3><p className="mt-3 text-sm text-slate-600">Buka kamera atau pilih maksimal 25 gambar. Sesuaikan crop, putar, atur warna dan susun halaman sebelum mengunduh PDF.</p><p className="mt-3 text-xs text-slate-500">Hasil tetap tersedia selama sesi ini. Unduh sebelum memuat ulang halaman.</p></div>}
      </div>
      {!!pages.length && <nav aria-label="Daftar halaman scan" className="flex shrink-0 gap-2 overflow-x-auto border-t bg-white p-3">{pages.map((p, i) => <button key={p.id} disabled={busy} aria-label={`Pilih halaman ${i + 1}`} aria-current={i === selected ? 'page' : undefined} onClick={() => { stopCamera(); setSelected(i); setCrop(false); }} className={`relative h-20 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${i === selected ? 'border-kpu-maroon ring-2 ring-rose-100' : 'border-slate-200'}`}><img src={p.url} alt="" className="h-full w-full object-cover" /><span className="absolute bottom-0 left-0 right-0 bg-black/70 text-xs font-bold text-white">{i + 1}</span></button>)}</nav>}
    </div>, document.body)}
  </>;
}
