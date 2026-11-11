import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, ScanLine, X, Download, Plus, RotateCw, Trash2, ArrowLeft, ArrowRight, RefreshCw, Crop, SlidersHorizontal, Layers, ImagePlus, Check, ShieldCheck, ChevronRight } from 'lucide-react';
import './DocumentScanner.css';
import { Corners, PdfScanImage, FULL_PAGE, MAX_SCAN_PAGES, loadScanImage, paperFromImage, renderScanPage, validCorners, createScanPdf } from '@/utils/documentScanner';

interface ScanPage { id: string; url: string; corners: Corners; rotation: number; brightness: number; contrast: number; grayscale: boolean; width: number; height: number }
const actionClass = 'scan-button';
export function DocumentScanner() {
  const [open, setOpen] = useState(false), [pages, setPages] = useState<ScanPage[]>([]), [selected, setSelected] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null), [detected, setDetected] = useState<Corners | null>(null);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [crop, setCrop] = useState(false);
  const [preview, setPreview] = useState(''), [cameraSize, setCameraSize] = useState({ width: 4, height: 3 });
  const video = useRef<HTMLVideoElement>(null), input = useRef<HTMLInputElement>(null), drag = useRef<number | null>(null);
  const replacement = useRef<string | null>(null), urls = useRef(new Set<string>()), media = useRef<MediaStream | null>(null), cameraRequest = useRef(0);
  const dialog = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<'crop' | 'adjust' | 'pages'>('crop');
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
  const applyCrop = () => {
    if (crop && active && !validCorners(active.corners)) { setError('Sudut crop saling silang atau terlalu sempit. Geser kembali sudut kertas.'); return; }
    setCrop(!crop); setError('');
  };
  const autoCrop = async () => {
    if (!active) return;
    try {
      const image = await loadScanImage(active.url), corners = paperFromImage(image, image.width, image.height);
      change({ corners: corners || FULL_PAGE }); setMessage(corners ? 'Crop otomatis diterapkan.' : 'Kertas belum terdeteksi. Geser sudut secara manual.'); setCrop(true);
    } catch { setError('Gagal mendeteksi kertas.'); }
  };
  const removePage = () => {
    if (!active) return;
    URL.revokeObjectURL(active.url); urls.current.delete(active.url);
    setPages(list => list.filter(p => p.id !== active.id)); setSelected(Math.max(0, selected - 1)); setCrop(false);
  };
  const pickImages = () => { replacement.current = null; input.current?.click(); };
  return <>
    <button onClick={() => setOpen(true)} className="pointer-events-auto mb-3 flex items-center gap-2 rounded-full border border-amber-300 bg-gradient-to-r from-kpu-maroon to-rose-800 px-5 py-3 text-sm font-bold text-white shadow-xl"><ScanLine className="h-5 w-5" /> Scan Berkas</button>
    {open && createPortal(<div ref={dialog} className={`archive-scanner ${stream ? 'is-camera' : ''}`} role="dialog" aria-modal="true" aria-label="Scan dokumen arsip">
      <header className="scan-header">
        <div className="scan-brand"><span className="scan-brand-icon"><ScanLine size={23} /></span><div><h2>Arsip<span>Scan</span></h2><p>Dokumen rapi. Arsip siap.</p></div></div>
        <div className="scan-steps" aria-label="Langkah scan"><span className={!pages.length || stream ? 'current' : ''}>01 <b>Ambil</b></span><ChevronRight size={14} /><span className={pages.length && !stream ? 'current' : ''}>02 <b>Rapikan</b></span><ChevronRight size={14} /><span>03 <b>Simpan</b></span></div>
        <div className="scan-header-actions">{!!pages.length && !stream && <button className="scan-primary scan-export" disabled={busy || crop} onClick={() => void download()}><Download size={17} /><span>Unduh PDF ({pages.length})</span></button>}<button aria-label="Tutup scanner" disabled={busy} onClick={() => { stopCamera(); setOpen(false); }} className="scan-icon-button"><X size={21} /></button></div>
      </header>
      <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={e => void upload(e.target.files)} />
      {(error || message || busy) && <div className={`scan-notice ${error ? 'has-error' : ''}`} role={error ? 'alert' : 'status'}>{busy && <span className="scan-spinner" />}{error || (busy ? message || 'Memproses gambar…' : message)}{!busy && <button aria-label="Tutup pemberitahuan" onClick={() => { setError(''); setMessage(''); }}><X size={14} /></button>}</div>}
      <main className="scan-main">
        {stream ? <section className="scan-camera-section">
          <div className="scan-camera-intro"><span className="scan-eyebrow">KAMERA DOKUMEN</span><h3>Posisikan kertas di dalam bingkai</h3><p>Gunakan latar gelap dan cahaya yang merata.</p></div>
          <div className="scan-camera-view" style={{ aspectRatio: `${cameraSize.width}/${cameraSize.height}`, width: `min(100%, ${60 * cameraSize.width / cameraSize.height}dvh)` }}>
            <video ref={video} autoPlay muted playsInline className="h-full w-full object-contain" />
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full"><polygon points={(detected || FULL_PAGE).map(p => `${p.x * 100},${p.y * 100}`).join(' ')} fill={detected ? '#10b98115' : 'transparent'} stroke={detected ? '#6ee7b7' : '#ffffff80'} strokeWidth="0.5" strokeDasharray={detected ? undefined : '2 2'} /></svg>
            <div className={`scan-detection ${detected ? 'found' : ''}`}>{detected ? <Check size={14} /> : <ScanLine size={14} />}{detected ? 'Kertas terdeteksi · siap difoto' : 'Mencari batas kertas…'}</div>
            <div role="group" aria-label="Kontrol kamera" className="scan-camera-controls">
              <button className="scan-camera-back" disabled={busy} onClick={stopCamera}><ArrowLeft size={20} /><span>Kembali</span></button>
              <button className="scan-shutter" aria-label={replacement.current ? 'Ganti halaman ini' : 'Ambil foto'} disabled={busy} onClick={() => void capture()}><span>{busy ? <RefreshCw className="animate-spin" size={25} /> : <Camera size={28} />}</span><b>{busy ? 'Memproses…' : replacement.current ? 'Ganti halaman ini' : 'Ambil foto'}</b></button>
              <span className="scan-camera-count"><Layers size={19} /><b>{pages.length}/25</b></span>
            </div>
          </div>
        </section> : active ? <section className="scan-editor">
          <div className="scan-preview-section">
            <div className="scan-preview-heading"><div><span className="scan-eyebrow">PRATINJAU DOKUMEN</span><h3>Halaman {selected + 1}<span> / {pages.length}</span></h3></div><button className="scan-icon-button" title="Putar halaman" aria-label="Putar 90°" disabled={busy || crop} onClick={() => change({ rotation: (active.rotation + 90) % 360 })}><RotateCw size={19} /></button></div>
            <div className={`scan-preview ${crop ? 'is-cropping' : ''}`}>
              {crop ? <div className="relative w-full max-w-xl select-none" style={{ aspectRatio: `${active.width}/${active.height}` }}><img draggable={false} src={active.url} alt="Atur empat sudut kertas" className="h-full w-full" /><svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full touch-none" onPointerMove={e => {
              if (drag.current === null) return; const rect = e.currentTarget.getBoundingClientRect();
              const corners = active.corners.map(p => ({ ...p })) as Corners;
              corners[drag.current] = { x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)) };
              change({ corners });
            }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}><polygon points={active.corners.map(p => `${p.x * 100},${p.y * 100}`).join(' ')} fill="#10b98125" stroke="#34d399" strokeWidth="0.6" />{active.corners.map((p, i) => <circle key={i} cx={p.x * 100} cy={p.y * 100} r="3" fill="white" stroke="#059669" strokeWidth="0.6" className="cursor-move" onPointerDown={e => { drag.current = i; e.currentTarget.parentElement?.setPointerCapture(e.pointerId); }} />)}</svg></div> : preview ? <img src={preview} alt={`Hasil scan halaman ${selected + 1}`} className="scan-result-image" /> : <div className="scan-loading"><span className="scan-spinner" /> Menyiapkan pratinjau…</div>}
            </div>
            <p className="scan-preview-caption">{crop ? 'Geser empat sudut mengikuti tepi kertas, lalu terapkan.' : 'Periksa hasilnya sebelum menyimpan sebagai PDF.'}</p>
          </div>
          <aside className="scan-tools">
            <div className="scan-tools-title"><h3>Rapikan halaman</h3><span>Langkah 02</span></div>
            <div className="scan-tabs" role="tablist" aria-label="Alat edit halaman">{([{key:'crop',label:'Crop',icon:Crop},{key:'adjust',label:'Warna',icon:SlidersHorizontal},{key:'pages',label:'Halaman',icon:Layers}] as const).map(t => <button key={t.key} id={`scan-tab-${t.key}`} role="tab" aria-selected={tool === t.key} aria-controls="scan-tool-panel" disabled={busy || (crop && t.key !== 'crop')} onClick={() => setTool(t.key)}><t.icon size={18}/>{t.label}</button>)}</div>
            <div className="scan-tool-panel" id="scan-tool-panel" role="tabpanel" aria-labelledby={`scan-tab-${tool}`}>
              {tool === 'crop' && <><h4>Bingkai yang pas.</h4><p>Buang area di luar kertas dan luruskan perspektifnya.</p><button className="scan-primary scan-wide" disabled={busy} onClick={applyCrop}>{crop ? <Check size={17}/> : <Crop size={17}/>} {crop ? 'Terapkan crop & luruskan' : 'Edit crop · geser 4 sudut'}</button><div className="scan-button-row"><button className={actionClass} disabled={busy} onClick={() => void autoCrop()}><ScanLine size={16}/>Auto crop</button><button className={actionClass} disabled={busy} onClick={() => { change({ corners: FULL_PAGE }); setCrop(true); }}>Gambar penuh</button></div><div className="scan-tip"><ScanLine size={20}/><span>Tarik setiap sudut agar tepat mengikuti tepi dokumen.</span></div></>}
              {tool === 'adjust' && <><h4>Lebih jelas dibaca.</h4><p>Atur cahaya dan pilih tampilan dokumen.</p><div className="scan-color-options"><button className={!active.grayscale ? 'selected' : ''} aria-pressed={!active.grayscale} disabled={busy} onClick={() => change({ grayscale: false })}><span className="color-swatch"/>Warna asli</button><button className={active.grayscale ? 'selected' : ''} aria-pressed={active.grayscale} disabled={busy} onClick={() => change({ grayscale: true })}><span className="mono-swatch"/>Hitam putih</button></div>{(['brightness','contrast'] as const).map(key => <label className="scan-range" key={key}><span>{key === 'brightness' ? 'Kecerahan' : 'Kontras'}<b>{Math.round(active[key] * 100)}%</b></span><input type="range" min="0.5" max="1.8" step="0.05" value={active[key]} disabled={busy} onChange={e => change({ [key]: Number(e.target.value) })}/></label>)}<button className="scan-text-button" disabled={busy} onClick={() => change({ brightness: 1, contrast: 1, grayscale: false })}>Kembalikan warna asli</button></>}
              {tool === 'pages' && <><h4>Urutan yang tepat.</h4><p>Pindahkan posisi halaman atau ganti foto yang kurang jelas.</p><div className="scan-reorder"><button aria-label="Pindah halaman ke kiri" className="scan-icon-button" disabled={busy || selected === 0} onClick={() => move(-1)}><ArrowLeft size={19}/></button><span>Urutan <b>{selected + 1} dari {pages.length}</b></span><button aria-label="Pindah halaman ke kanan" className="scan-icon-button" disabled={busy || selected === pages.length - 1} onClick={() => move(1)}><ArrowRight size={19}/></button></div><button className={`${actionClass} scan-wide`} disabled={busy} onClick={() => void startCamera(true)}><RefreshCw size={17}/>Ambil ulang halaman</button><button className={`${actionClass} scan-wide`} disabled={busy} onClick={() => { replacement.current = active.id; input.current?.click(); }}><ImagePlus size={17}/>Ganti dari galeri</button><button className="scan-delete" disabled={busy} onClick={removePage}><Trash2 size={16}/>Hapus halaman</button></>}
            </div>
            <div className="scan-local-note"><ShieldCheck size={16}/><span>Foto diproses di perangkat Anda.</span></div>
          </aside>
        </section> : <section className="scan-welcome">
          <div className="scan-welcome-copy"><span className="scan-eyebrow">SCANNER ARSIP DIGITAL</span><h1>Dari lembar kertas,<br/><em>jadi arsip yang rapi.</em></h1><p>Foto, rapikan, lalu simpan. Semua halaman dokumen Anda dalam satu PDF.</p><div className="scan-welcome-actions"><button className="scan-primary" disabled={busy} onClick={() => void startCamera()}><Camera size={21}/>Kamera<ArrowRight size={17}/></button><button className={actionClass} disabled={busy} onClick={pickImages}><ImagePlus size={20}/>Tambah gambar</button></div><div className="scan-welcome-details"><span><Check size={15}/>Hingga 25 halaman</span><span><Check size={15}/>Crop otomatis</span><span><Check size={15}/>PDF siap unduh</span></div></div>
          <div className="scan-document-art" aria-hidden="true"><div className="scan-art-back"/><div className="scan-art-paper"><div className="scan-art-label"><ScanLine size={22}/><span>ARSIP DIGITAL</span></div><div className="scan-art-rule"/><div className="scan-art-line long"/><div className="scan-art-line"/><div className="scan-art-line short"/><div className="scan-art-block"/><div className="scan-art-line long"/><div className="scan-art-line"/><div className="scan-art-stamp"><Check size={18}/>Siap disimpan</div></div><div className="scan-art-badge"><ScanLine size={18}/><span>Otomatis lebih rapi</span></div></div>
          <div className="scan-welcome-footer"><ShieldCheck size={17}/><span>Hasil tetap ada selama sesi ini. Unduh PDF sebelum memuat ulang halaman.</span></div>
        </section>}
      </main>
      {!!pages.length && !stream && <footer className="scan-filmstrip"><div className="scan-filmstrip-label"><Layers size={17}/><span>{pages.length}<small>/25 halaman</small></span></div><nav aria-label="Daftar halaman scan">{pages.map((p, i) => <button key={p.id} disabled={busy || crop} aria-label={`Pilih halaman ${i + 1}`} aria-current={i === selected ? 'page' : undefined} onClick={() => { setSelected(i); setCrop(false); }} className={i === selected ? 'selected' : ''}><img src={p.url} alt=""/><span>{i + 1}</span>{i === selected && <Check size={11}/>}</button>)}</nav><div className="scan-add-pages"><button title="Tambah dari kamera" aria-label="Kamera" className="scan-icon-button" disabled={busy || crop || pages.length >= 25} onClick={() => void startCamera()}><Camera size={19}/></button><button title="Tambah dari galeri" aria-label="Tambah gambar" className="scan-icon-button" disabled={busy || crop || pages.length >= 25} onClick={pickImages}><Plus size={20}/></button></div></footer>}
    </div>, document.body)}
  </>;
}
