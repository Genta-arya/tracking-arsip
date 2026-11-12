import { withDriveScan, ensureDriveScanOwned, reportDriveScan } from '@/services/driveScanLock';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, CheckCheck, ChevronRight, CircleAlert, FileSearch, FileText, FolderOpen, MapPin, Radar, Search, ShieldCheck, Square, X } from 'lucide-react';
import { AppConfig } from '@/types';
import { MisplacedScanProgress, scanMisplacedFiles } from '@/services/driveService';

function driveLink(value: string): string | undefined {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'drive.google.com' ? url.href : undefined;
  } catch { return undefined; }
}

export function MisplacedFilesScanner({ config, disabled = false, onBusyChange }: { config: AppConfig; disabled?: boolean; onBusyChange?: (busy: boolean) => void }) {
  const [result, setResult] = useState<MisplacedScanProgress>({ files: [], scannedFolders: 0, examinedFiles: 0, completedBatches: 0, failures: [] });
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'stopped' | 'error'>('idle');
  const [search, setSearch] = useState('');
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    setResult({ files: [], scannedFolders: 0, examinedFiles: 0, completedBatches: 0, failures: [] });
    setStatus('idle');
    setSearch('');
    return () => { controller.current?.abort(); };
  }, [config.gasWebAppUrl, config.rootFolderId]);

  const start = async () => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setResult({ files: [], scannedFolders: 0, examinedFiles: 0, completedBatches: 0, failures: [] });
    setStatus('running');
    setSearch('');
    try {
      const finalResult = await withDriveScan('Memindai berkas tersesat', () => scanMisplacedFiles(config.gasWebAppUrl, config.rootFolderId, current.signal, value => {setResult(value);reportDriveScan(value.progress?.percent || 0,'Memindai berkas tersesat');}, ensureDriveScanOwned));
      if (!current.signal.aborted) { setResult(finalResult); setStatus(finalResult.failures.length ? 'error' : 'done'); }
    } catch (error) {
      if (!current.signal.aborted) {
        setResult(prev => ({ ...prev, failures: [...prev.failures, error instanceof Error ? error.message : String(error)] }));
        setStatus('error');
      }
    }
  };

  const running = status === 'running';
  useEffect(() => {
    onBusyChange?.(running);
    return () => onBusyChange?.(false);
  }, [running, onBusyChange]);
  const hasConnection = Boolean(config.gasWebAppUrl && config.rootFolderId);
  const locations = new Set(result.files.map(file => file.folderId)).size;
  const query = search.trim().toLocaleLowerCase('id');
  const filtered = result.files.filter(file =>
    [file.name, file.path, file.reason].some(value => value.toLocaleLowerCase('id').includes(query))
  );
  const stateLabel = running ? 'Pemindaian berlangsung' : status === 'done' ? 'Pemindaian selesai' : status === 'stopped' ? 'Pemindaian dihentikan' : status === 'error' ? 'Perlu pemeriksaan ulang' : 'Siap menelusuri arsip';
  const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kpu-gold focus-visible:ring-offset-2';

  return (
    <section aria-label="Berkas Tersesat" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_6px_24px_-12px_rgba(52,7,5,0.25)]">
      <div className="relative isolate overflow-hidden bg-gradient-to-br from-[#340705] via-[#660300] to-[#892a17] px-4 pb-5 pt-5 text-white sm:px-5">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border border-white/10" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-5 -top-9 h-40 w-40 rounded-full border border-kpu-gold/15 bg-kpu-gold/5" />
        <div className="relative flex items-start gap-3 sm:gap-4">
          <div aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-kpu-gold/40 bg-black/15 text-kpu-lightGold shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
            <Radar className={`h-7 w-7 ${running ? 'motion-safe:animate-spin' : ''}`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2 text-[9px] font-bold uppercase tracking-[0.18em] text-kpu-lightGold">
              <span>Audit lokasi arsip</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2 py-0.5 tracking-normal text-white/90"><ShieldCheck className="h-3 w-3" aria-hidden="true" />Hanya membaca</span>
            </div>
            <h3 className="text-lg font-black tracking-tight sm:text-xl">Temukan berkas tersesat.</h3>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-rose-100/85">Temukan PDF di root, kecamatan, atau desa. Scan cepat tanpa membuka isi folder TPS.</p>
          </div>
        </div>
        <div className="relative mt-4 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[10px] text-white/70" aria-label="Susunan folder yang benar">
          <FolderOpen className="mr-0.5 h-3.5 w-3.5 text-kpu-lightGold" aria-hidden="true" />
          {['Root arsip', 'Kecamatan', 'Desa', 'TPS'].map((part, index) => <span key={part} className="inline-flex items-center gap-1.5">
            {index > 0 && <ChevronRight className="h-3 w-3 text-white/35" aria-hidden="true" />}
            <span className={index === 3 ? 'rounded bg-kpu-gold/15 px-1.5 py-0.5 font-bold text-kpu-lightGold' : ''}>{part}</span>
          </span>)}
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Perlu ditinjau', value: result.files.length, icon: FileSearch, accent: true },
            { label: 'Lokasi temuan', value: locations, icon: MapPin, accent: false },
            { label: 'PDF tersesat', value: result.examinedFiles, icon: FileText, accent: false },
          ].map(stat => <div key={stat.label} className={`min-w-0 rounded-xl border px-2.5 py-3 sm:px-3 ${stat.accent ? 'border-amber-200 bg-amber-50/80' : 'border-slate-100 bg-slate-50'}`}>
            <stat.icon className={`mb-2 h-4 w-4 ${stat.accent ? 'text-amber-700' : 'text-slate-400'}`} aria-hidden="true" />
            <p className={`text-xl font-black tabular-nums leading-none sm:text-2xl ${stat.accent ? 'text-amber-950' : 'text-slate-900'}`}>{status === 'idle' ? '—' : stat.value.toLocaleString('id-ID')}</p>
            <p className="mt-1.5 text-[10px] font-medium leading-tight text-slate-500">{stat.label}</p>
          </div>)}
        </div>

        {!hasConnection && <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-900"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />Koneksi Drive belum tersedia. Masuk dengan akun yang memiliki konfigurasi Drive, lalu buka kembali dialog ini.</p>}
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={start} disabled={disabled || running || !hasConnection}
            className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-kpu-darkMaroon bg-gradient-to-b from-[#801b14] to-kpu-maroon px-3 py-2.5 text-xs font-bold text-white shadow-[0_3px_0_#340705] transition hover:brightness-110 active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}>
            <FileSearch className="h-4 w-4 shrink-0" aria-hidden="true" />
            {running ? 'Menelusuri folder…' : status === 'idle' ? 'Pindai Berkas Tersesat' : 'Pindai Ulang Berkas Tersesat'}
            {!running && <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />}
          </button>
          {running && <button type="button" className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 ${focusRing}`} onClick={() => { controller.current?.abort(); setStatus('stopped'); }}><Square className="h-3 w-3" aria-hidden="true" />Hentikan</button>}
        </div>
        {disabled && !running && <p className="text-xs text-slate-500">Tunggu pemindaian kecamatan selesai untuk memulai audit lokasi.</p>}

        <div role="status" aria-live="polite" className="space-y-2">
          <p className={`flex items-center gap-2 text-[11px] font-semibold ${status === 'error' || status === 'stopped' ? 'text-amber-800' : status === 'done' ? 'text-emerald-700' : 'text-slate-500'}`}>
            <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${running ? 'bg-kpu-orange motion-safe:animate-pulse' : status === 'done' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            {stateLabel}{(status === 'stopped' || status === 'error') && ' · Hasil belum lengkap'}
          </p>
          {status !== 'idle' && <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 flex items-center justify-between gap-2"><span className="text-xs font-bold text-slate-700">{result.progress?.phase === 'inventory' || !result.progress ? 'Tahap 1 · Pendataan lokasi' : 'Tahap 2 · Pemeriksaan PDF'}</span><strong className="font-mono text-lg font-black text-kpu-maroon">{result.progress?.percent !== null && result.progress?.percent !== undefined ? `${result.progress.percent}%` : '—%'}</strong></div>
            <div role="progressbar" aria-label="Progres scan cepat" aria-valuemin={0} aria-valuemax={100} aria-valuenow={result.progress?.percent ?? undefined} aria-valuetext={result.progress ? `${result.progress.phase === 'inventory' ? 'Pendataan lokasi' : 'Pemeriksaan PDF'}: ${result.progress.processedFolders} dari ${result.progress.totalFolders ?? 'total belum diketahui'} lokasi selesai` : 'Mendata lokasi; total belum diketahui'} className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div className={`h-full rounded-full bg-gradient-to-r from-kpu-maroon via-kpu-orange to-kpu-gold transition-[width] ${running && result.progress?.percent == null ? 'motion-safe:animate-pulse' : ''}`} style={{ width: result.progress?.percent == null ? (running ? '100%' : '0%') : `${result.progress.percent}%` }} />
            </div>
            <p className="mt-2 text-[11px] font-semibold text-slate-600">{result.progress?.processedFolders ?? 0} / {result.progress?.totalFolders ?? '…'} lokasi · {result.examinedFiles.toLocaleString('id-ID')} PDF tersesat diperiksa</p>
            <p className="mt-1 text-[10px] leading-relaxed text-slate-500">{result.progress?.phase === 'inventory' || !result.progress ? 'Mendata folder root, kecamatan, dan desa. Persentase tahap ini tersedia setelah daftar folder root selesai dibaca.' : 'Persentase berdasarkan lokasi yang selesai diperiksa, bukan jumlah PDF. Isi folder TPS tidak dibaca.'}</p>
          </div>}
        </div>

        {result.failures.length > 0 && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
          <p className="flex items-center gap-2 font-bold"><CircleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />{result.failures.length} kendala pemindaian</p>
          <p className="mt-1 leading-relaxed">Periksa akses Drive dan deployment Apps Script, lalu pindai ulang.</p>
          <details className="mt-2"><summary className={`cursor-pointer font-semibold ${focusRing}`}>Lihat rincian kendala</summary><ul className="mt-2 space-y-1 break-words">{result.failures.map((message, index) => <li key={index}>{message}</li>)}</ul></details>
        </div>}

        {result.files.length > 0 && <div className="space-y-3 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between gap-2"><h4 className="text-xs font-extrabold text-slate-900">Berkas perlu ditinjau</h4><span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold tabular-nums text-amber-900">{filtered.length} temuan</span></div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            <input aria-label="Cari berkas atau lokasi" value={search} onChange={event => setSearch(event.target.value)} placeholder="Cari nama berkas atau lokasi…" className={`h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-9 text-xs text-slate-800 placeholder:text-slate-400 ${focusRing}`} />
            {search && <button type="button" aria-label="Hapus pencarian" onClick={() => setSearch('')} className={`absolute right-1 top-1 rounded-lg p-2 text-slate-500 hover:bg-slate-200 ${focusRing}`}><X className="h-4 w-4" aria-hidden="true" /></button>}
          </div>
          <div className="max-h-96 space-y-2.5 overflow-y-auto pr-1" aria-label="Daftar berkas tersesat">
            {filtered.map(file => <article key={`${file.id}:${file.folderId}`} className="group min-w-0 rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:border-amber-300 hover:bg-amber-50/20">
              <div className="flex items-start gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-100 bg-amber-50 text-amber-700"><FileText className="h-4 w-4" aria-hidden="true" /></div>
                <div className="min-w-0 flex-1">
                  <a href={driveLink(file.url)} target="_blank" rel="noopener noreferrer" className={`block break-words text-xs font-bold leading-relaxed text-slate-900 hover:text-kpu-maroon hover:underline ${focusRing}`}>{file.name}</a>
                  <p className="mt-1 flex items-start gap-1 text-[10px] leading-relaxed text-amber-800"><CircleAlert className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />{file.reason}</p>
                </div>
              </div>
              <div className="mt-3 rounded-lg bg-slate-50 px-2.5 py-2">
                <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">Ditemukan di</p>
                <p className="break-words text-[11px] leading-relaxed text-slate-600">{file.path}</p>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <a href={driveLink(file.folderUrl)} target="_blank" rel="noopener noreferrer" className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-[10px] font-bold text-slate-700 transition hover:border-kpu-maroon hover:text-kpu-maroon ${focusRing}`}><FolderOpen className="h-3 w-3" aria-hidden="true" />Buka lokasi<span className="sr-only"> {file.path}</span><ArrowUpRight className="h-3 w-3" aria-hidden="true" /></a>
                <a href={driveLink(file.url)} target="_blank" rel="noopener noreferrer" className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 text-[10px] font-bold text-kpu-maroon hover:bg-rose-50 ${focusRing}`}>Lihat berkas<span className="sr-only"> {file.name}</span><ArrowUpRight className="h-3 w-3" aria-hidden="true" /></a>
              </div>
            </article>)}
            {filtered.length === 0 && <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-xs text-slate-500">Tidak ada temuan yang cocok. Coba nama berkas atau lokasi lain.</p>}
          </div>
        </div>}

        {result.files.length === 0 && (status === 'idle' || status === 'done') && <div className={`rounded-xl border border-dashed px-4 py-5 text-center ${status === 'done' ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-slate-50/50'}`}>
          <div className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full ${status === 'done' ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-slate-400 shadow-sm'}`}>
            {status === 'done' ? <CheckCheck className="h-5 w-5" aria-hidden="true" /> : <MapPin className="h-5 w-5" aria-hidden="true" />}
          </div>
          <p className="text-xs font-bold text-slate-700">{status === 'done' ? 'Tidak ada berkas tersesat ditemukan' : 'Setiap berkas punya tempatnya.'}</p>
          <p className="mx-auto mt-1 max-w-xs text-[11px] leading-relaxed text-slate-500">{status === 'done' ? 'Tidak ada temuan pada folder yang selesai diperiksa.' : 'Mulai pemindaian untuk melihat berkas yang berada di luar susunan folder arsip.'}</p>
        </div>}

        <details className="border-t border-slate-100 pt-3 text-[10px] text-slate-500">
          <summary className={`flex cursor-pointer list-none items-center gap-1.5 font-medium ${focusRing}`}><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />Berkas tetap aman di lokasi semula<ChevronRight className="ml-auto h-3 w-3" aria-hidden="true" /></summary>
          <p className="mt-2 leading-relaxed">Hasil sesi ini tidak masuk hitungan TPS dan tidak disimpan. Menutup dialog menghentikan pemindaian. Hanya PDF langsung di root, kecamatan, dan desa yang diperiksa. Isi folder TPS, subfolder di dalam TPS, dan shortcut tidak ditelusuri. Scan ini tidak mendeteksi berkas yang masuk ke TPS lain.</p>
        </details>
      </div>
    </section>
  );
}
