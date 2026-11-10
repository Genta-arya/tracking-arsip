import { useEffect, useRef, useState } from 'react';
import { AppConfig } from '@/types';
import { MisplacedScanProgress, scanMisplacedFiles } from '@/services/driveService';

function driveLink(value: string): string | undefined {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'drive.google.com' ? url.href : undefined;
  } catch { return undefined; }
}

export function MisplacedFilesScanner({ config, disabled = false }: { config: AppConfig; disabled?: boolean }) {
  const [result, setResult] = useState<MisplacedScanProgress>({ files: [], scannedFolders: 0, failures: [] });
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'stopped' | 'error'>('idle');
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    setResult({ files: [], scannedFolders: 0, failures: [] });
    setStatus('idle');
    return () => { controller.current?.abort(); };
  }, [config.gasWebAppUrl, config.rootFolderId]);

  const start = async () => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setResult({ files: [], scannedFolders: 0, failures: [] });
    setStatus('running');
    try {
      const finalResult = await scanMisplacedFiles(config.gasWebAppUrl, config.rootFolderId, current.signal, setResult);
      if (!current.signal.aborted) { setResult(finalResult); setStatus(finalResult.failures.length ? 'error' : 'done'); }
    } catch (error) {
      if (!current.signal.aborted) {
        setResult(prev => ({ ...prev, failures: [...prev.failures, error instanceof Error ? error.message : String(error)] }));
        setStatus('error');
      }
    }
  };

  return <section className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
    <h3 className="font-bold text-slate-900">Berkas Tersesat</h3>
    <p className="text-xs text-slate-600">Telusuri folder arsip untuk menemukan berkas di luar susunan Kecamatan → Desa → TPS. Hanya membaca; berkas tetap di lokasi semula.</p>
    {(!config.gasWebAppUrl || !config.rootFolderId) && <p className="text-xs text-amber-800">Koneksi Drive belum tersedia. Masuk dengan akun yang memiliki konfigurasi Drive, lalu buka kembali dialog ini.</p>}
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={start} disabled={disabled || status === 'running' || !config.gasWebAppUrl || !config.rootFolderId}
        className="rounded-lg bg-kpu-maroon px-3 py-2 text-sm font-bold text-white disabled:opacity-50">Pindai Berkas Tersesat</button>
      {status === 'running' && <button type="button" className="rounded-lg border px-3 py-2 text-sm" onClick={() => { controller.current?.abort(); setStatus('stopped'); }}>Hentikan</button>}
    </div>
    {status !== 'idle' && <p role="status" className="text-sm">
      {status === 'running' ? 'Memindai…' : status === 'done' ? 'Pemindaian selesai.' : status === 'stopped' ? 'Dihentikan. Hasil belum lengkap.' : 'Hasil belum lengkap; sebagian folder gagal dipindai.'}
      {' '}{result.scannedFolders} folder selesai diperiksa · {result.files.length} berkas perlu ditinjau.
      {status === 'done' && result.files.length === 0 && ' Tidak ditemukan berkas tersesat pada folder yang diperiksa.'}
    </p>}
    {result.failures.length > 0 && <div role="alert" className="text-xs text-rose-800">
      <p>Periksa akses Drive dan deployment Apps Script terbaru, lalu pindai ulang.</p>
      <ul>{result.failures.map((message, index) => <li key={index}>{message}</li>)}</ul>
    </div>}
    {result.files.length > 0 && <div className="max-h-80 overflow-auto rounded-lg border bg-white">
      <table className="w-full text-left text-xs">
        <thead><tr><th className="p-2">Berkas</th><th className="p-2">Lokasi & alasan</th></tr></thead>
        <tbody>{result.files.map(file => <tr key={`${file.id}:${file.folderId}`} className="border-t align-top">
          <td className="p-2 break-words"><a href={driveLink(file.url)} target="_blank" rel="noopener noreferrer" className="font-bold text-kpu-maroon underline">{file.name}</a></td>
          <td className="p-2 break-words"><a href={driveLink(file.folderUrl)} target="_blank" rel="noopener noreferrer" className="underline">{file.path}</a><p className="mt-1 text-amber-800">{file.reason}</p></td>
        </tr>)}</tbody>
      </table>
    </div>}
    <p className="text-xs text-slate-500">Hasil sesi ini tidak masuk hitungan TPS dan tidak disimpan. Menutup dialog menghentikan pemindaian. Shortcut tidak ditelusuri; berkas di luar root arsip tidak dicari.</p>
  </section>;
}
