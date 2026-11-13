import type { RawTpsData } from '@/types';
import { useEffect, useState, useMemo } from 'react';
import { History, Search, ExternalLink, ChevronLeft, ChevronRight, Calendar, RotateCcw } from 'lucide-react';
import { subscribeCorrectionHistory, subscribeLegacyOverrides } from '@/services/firebase';
import { legacyCorrections, CORRECTION_LABELS, type CorrectionAudit, type CorrectionState } from '@/utils/correctionAudit';
import { archiveDateKey, formatArchiveDay } from '@/utils/progressAnalytics';
import { useArchiveToday } from '@/hooks/useArchiveToday';

const actions: Record<CorrectionAudit['action'],string> = {CORRECT:'Koreksi kategori',REMOVE:'Tandai hapus / pindah',RESET:'Reset koreksi',RESTORE:'Pulihkan berkas'};
function stateLabel(state: CorrectionState) {
  return `${state.overrideElection ? CORRECTION_LABELS[state.overrideElection] || state.overrideElection : 'Deteksi otomatis'} · ${state.isResolved ? 'Terverifikasi' : 'Belum diverifikasi'}`;
}

function parseAuditDateKey(dateStr?: string): string | null {
  if (!dateStr) return null;
  return archiveDateKey(dateStr);
}

export function CorrectionHistory({isDemoMode=false,rawData=[]}:{isDemoMode?:boolean;rawData?:RawTpsData[]}) {
  const [rows,setRows]=useState<CorrectionAudit[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(!isDemoMode);
  const [oldOverrides,setOldOverrides]=useState<Record<string,unknown>[]>([]);
  useEffect(()=>{if(isDemoMode)return;return subscribeLegacyOverrides(setOldOverrides,()=>setError('Sebagian riwayat lama belum dapat dimuat.'));},[isDemoMode]);
  const combined=useMemo(()=>[...rows,...legacyCorrections(rawData,oldOverrides,rows)].sort((a,b)=>(Date.parse(b.createdAt)||0)-(Date.parse(a.createdAt)||0)).slice(0,100),[rows,rawData,oldOverrides]);

  const todayKey = useArchiveToday();
  const [selectedDate, setSelectedDate] = useState<string>(() => todayKey);
  const [search,setSearch]=useState(''),[page,setPage]=useState(1),[pageSize,setPageSize]=useState(10);
  const [expanded,setExpanded]=useState<string|null>(null);

  useEffect(()=>{
    if(isDemoMode){setLoading(false);return;}
    setLoading(true);setError('');
    return subscribeCorrectionHistory(data=>{setRows(data);setLoading(false);},()=>{setError('Riwayat belum dapat dimuat. Pastikan Anda login dan aturan Firestore correction_history sudah dipublikasikan.');setLoading(false);});
  },[isDemoMode]);

  // Daftar unik tanggal yang ada dalam data riwayat
  const availableDates = useMemo(() => {
    const map = new Map<string, number>();
    combined.forEach(row => {
      const key = parseAuditDateKey(row.createdAt);
      if (key) {
        map.set(key, (map.get(key) || 0) + 1);
      }
    });
    return Array.from(map.entries())
      .map(([rawDate, count]) => ({
        rawDate,
        label: formatArchiveDay(rawDate),
        count,
      }))
      .sort((a, b) => b.rawDate.localeCompare(a.rawDate));
  }, [combined]);

  const term=search.toLowerCase().trim();
  const filtered=combined.filter(row=>{
    if (selectedDate !== 'ALL') {
      const rowDateKey = parseAuditDateKey(row.createdAt);
      if (rowDateKey !== selectedDate) return false;
    }
    if (!term) return true;
    return [row.actorEmail,row.actorName,row.fileName,row.kecamatan,row.desa,row.tpsFolderName,actions[row.action],row.after.resolutionNote].some(value=>String(value || '').toLowerCase().includes(term));
  });

  const totalPages=Math.max(1,Math.ceil(filtered.length/pageSize));
  useEffect(()=>{setPage(value=>Math.min(value,totalPages));},[totalPages]);
  const currentPage=Math.min(page,totalPages);
  const offset=(currentPage-1)*pageSize;
  const displayed=filtered.slice(offset,offset+pageSize);

  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-labelledby="correction-history-title">
    <header className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex items-center gap-3">
        <span className="rounded-xl bg-amber-100 p-2.5 text-kpu-maroon"><History className="h-5 w-5"/></span>
        <div>
          <h3 id="correction-history-title" className="text-sm font-black text-slate-900">Riwayat Perbaikan Anomali</h3>
          <p className="mt-1 text-[11px] text-slate-500">
            {selectedDate === 'ALL'
              ? 'Seluruh riwayat perbaikan · Waktu WIB · Diperbarui otomatis'
              : selectedDate === todayKey
              ? `Koreksi hari ini (${formatArchiveDay(todayKey)}) · Waktu WIB`
              : `Koreksi tanggal ${formatArchiveDay(selectedDate)} · Waktu WIB`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="rounded-md bg-white px-2 py-1 text-[10px] font-semibold text-slate-500 border border-slate-200">
          {filtered.length} catatan {selectedDate !== 'ALL' && `(dari ${combined.length} total)`}
        </span>
      </div>
    </header>

    <div className="p-4 sm:p-5 space-y-3">
      {/* Filter Row: Pencarian + Filter Tanggal Cepat */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <label className="flex flex-1 max-w-lg items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-slate-400 bg-white">
          <Search className="h-4 w-4 shrink-0"/>
          <input
            aria-label="Cari riwayat perbaikan"
            placeholder="Cari admin, email, berkas, desa, atau TPS…"
            value={search}
            onChange={e=>{setSearch(e.target.value);setPage(1);setExpanded(null);}}
            className="w-full bg-transparent text-xs text-slate-800 outline-none"
          />
          {search && (
            <button type="button" onClick={()=>{setSearch('');setPage(1);}} className="text-xs text-slate-400 hover:text-slate-600">✕</button>
          )}
        </label>

        {/* Filter Hari / Tanggal */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap flex items-center gap-1 mr-1">
            <Calendar className="h-3.5 w-3.5 text-amber-600" /> Filter Tanggal:
          </span>

          {/* Tombol Hari Ini (Default) */}
          <button
            type="button"
            onClick={() => { setSelectedDate(todayKey); setPage(1); setExpanded(null); }}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedDate === todayKey
                ? 'bg-amber-500 text-amber-950 shadow-xs border border-amber-400 font-black'
                : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
            }`}
          >
            Hari Ini {availableDates.find(d => d.rawDate === todayKey)?.count ? `(${availableDates.find(d => d.rawDate === todayKey)!.count})` : '(0)'}
          </button>

          {/* Tombol Semua Tanggal */}
          <button
            type="button"
            onClick={() => { setSelectedDate('ALL'); setPage(1); setExpanded(null); }}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedDate === 'ALL'
                ? 'bg-amber-500 text-amber-950 shadow-xs border border-amber-400 font-black'
                : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
            }`}
          >
            Semua ({combined.length})
          </button>

          {/* Tanggal-tanggal lain yang memiliki catatan */}
          {availableDates.filter(d => d.rawDate !== todayKey).map((d) => (
            <button
              key={d.rawDate}
              type="button"
              onClick={() => { setSelectedDate(d.rawDate); setPage(1); setExpanded(null); }}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedDate === d.rawDate
                  ? 'bg-amber-500 text-amber-950 shadow-xs border border-amber-400 font-black'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
              }`}
            >
              {d.label} ({d.count})
            </button>
          ))}

          {/* Reset ke Hari Ini */}
          {(selectedDate !== todayKey || search) && (
            <button
              type="button"
              onClick={() => { setSelectedDate(todayKey); setSearch(''); setPage(1); setExpanded(null); }}
              title="Reset ke hari ini"
              className="p-1.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors ml-1 cursor-pointer shrink-0"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {error && filtered.length>0 && <p role="alert" className="text-xs text-rose-700">{error}</p>}
      {loading && !filtered.length ? (
        <p role="status" className="py-8 text-center text-xs text-slate-500">Memuat riwayat perbaikan…</p>
      ) : error && !filtered.length ? (
        <p role="alert" className="rounded-xl bg-rose-50 p-4 text-xs text-rose-800">{error}</p>
      ) : isDemoMode ? (
        <p className="py-8 text-center text-xs text-slate-500">Mode demo tidak menyimpan riwayat perbaikan ke server.</p>
      ) : !filtered.length ? (
        <div className="py-8 text-center text-xs text-slate-500 space-y-2">
          <p>
            {term
              ? 'Tidak ada aktivitas yang cocok dengan pencarian pada filter tanggal ini.'
              : selectedDate === todayKey
              ? `Belum ada riwayat perbaikan anomali pada hari ini (${formatArchiveDay(todayKey)}).`
              : selectedDate === 'ALL'
              ? 'Belum ada koreksi atau riwayat yang tersimpan.'
              : `Tidak ada perbaikan pada tanggal ${formatArchiveDay(selectedDate)}.`}
          </p>
          {selectedDate !== 'ALL' && combined.length > 0 && (
            <button
              type="button"
              onClick={() => { setSelectedDate('ALL'); setPage(1); }}
              className="text-xs text-kpu-maroon font-bold underline cursor-pointer"
            >
              Lihat seluruh catatan riwayat ({combined.length} catatan)
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200" tabIndex={0} role="region" aria-label="Tabel riwayat perbaikan anomali">
          <table className="w-full min-w-[1050px] text-left text-[11px]">
            <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              <tr>{['No','Waktu (WIB)','Admin','Berkas / lokasi','Tindakan','Sebelum','Sesudah','Catatan','Detail'].map(label=><th key={label} scope="col" className="px-3 py-3">{label}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayed.map((row,index)=><HistoryRow key={row.id} row={row} number={offset+index+1} expanded={expanded===row.id} onToggle={()=>setExpanded(value=>value===row.id?null:row.id)}/>)}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="mt-4 flex flex-col gap-3 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>{`${offset+1}–${Math.min(offset+pageSize,filtered.length)} dari ${filtered.length} catatan`}</p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2">
              Per halaman
              <select
                aria-label="Jumlah riwayat per halaman"
                value={pageSize}
                onChange={e=>{setPageSize(Number(e.target.value));setPage(1);setExpanded(null);}}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-700"
              >
                {[10,25,50].map(size=><option key={size} value={size}>{size}</option>)}
              </select>
            </label>
            <button
              aria-label="Halaman riwayat sebelumnya"
              disabled={currentPage<=1}
              onClick={()=>{setPage(currentPage-1);setExpanded(null);}}
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-slate-700 disabled:opacity-40"
            >
              <ChevronLeft className="h-3 w-3"/>Sebelumnya
            </button>
            <span aria-live="polite">Hal {currentPage} / {totalPages}</span>
            <button
              aria-label="Halaman riwayat berikutnya"
              disabled={currentPage>=totalPages}
              onClick={()=>{setPage(currentPage+1);setExpanded(null);}}
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-slate-700 disabled:opacity-40"
            >
              Berikutnya<ChevronRight className="h-3 w-3"/>
            </button>
          </div>
        </div>
      )}
    </div>
  </section>;
}

function HistoryRow({row,number,expanded,onToggle}:{row:CorrectionAudit;number:number;expanded:boolean;onToggle:()=>void}) {
  return <>
    <tr className="align-top hover:bg-slate-50/70">
      <td className="px-3 py-3 text-slate-400">{number}</td>
      <td className="whitespace-nowrap px-3 py-3 text-slate-600"><time dateTime={row.createdAt||undefined}>{row.createdAt ? new Intl.DateTimeFormat('id-ID',{dateStyle:'medium',timeZone:'Asia/Jakarta'}).format(new Date(row.createdAt)) : row.legacy ? 'Tidak tercatat' : 'Menunggu server…'}{row.createdAt&&<span className="mt-1 block text-[10px] text-slate-400">{new Intl.DateTimeFormat('id-ID',{timeStyle:'medium',timeZone:'Asia/Jakarta'}).format(new Date(row.createdAt))} WIB</span>}</time></td>
      <td className="max-w-[200px] break-words px-3 py-3"><p className="font-semibold text-slate-700">{row.actorName}</p>{row.actorEmail!==row.actorName&&<p className="mt-1 text-[10px] text-slate-400">{row.actorEmail}</p>}</td>
      <td className="min-w-[170px] max-w-[230px] break-words px-3 py-3"><p className="font-semibold text-slate-800">{row.fileName}</p><p className="mt-1 text-[10px] text-slate-500">{row.kecamatan} · {row.desa} · {row.tpsFolderName}</p></td>
      <td className="px-3 py-3"><span className={`inline-block whitespace-nowrap rounded px-2 py-1 text-[10px] ${row.legacy?'bg-slate-100 text-slate-500':'bg-amber-50 text-kpu-maroon'}`}>{row.legacy?'Koreksi lama':actions[row.action]}</span></td>
      <td className="min-w-[140px] px-3 py-3 text-slate-500">{row.legacy?'Tidak tercatat':stateLabel(row.before)}</td>
      <td className="min-w-[140px] px-3 py-3 font-medium text-emerald-700">{stateLabel(row.after)}</td>
      <td className="min-w-[140px] max-w-[230px] break-words px-3 py-3 text-slate-600">{row.after.resolutionNote||'—'}</td>
      <td className="px-3 py-3"><button aria-expanded={expanded} aria-label={`Detail riwayat ${row.fileName}`} onClick={onToggle} className="rounded-md border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-100">{expanded?'Tutup':'Detail'}</button></td>
    </tr>
    {expanded&&<tr><td colSpan={9} className="border-t border-slate-100 bg-slate-50 px-4 py-3"><dl className="grid gap-2 break-all text-[10px] text-slate-500 sm:grid-cols-2"><div><dt className="font-semibold">ID berkas</dt><dd>{row.fileId}</dd></div><div><dt className="font-semibold">ID folder TPS</dt><dd>{row.tpsFolderId}</dd></div><div><dt className="font-semibold">Catatan sebelumnya</dt><dd>{row.legacy?'Status sebelum koreksi tidak tersimpan pada data lama.':row.before.resolutionNote||'—'}</dd></div><div><dt className="font-semibold">ID aktivitas</dt><dd>{row.id}</dd></div></dl>{/^https:\/\/drive\.google\.com\//.test(row.fileUrl)&&<a href={row.fileUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold text-kpu-maroon underline">Buka berkas<ExternalLink className="h-3 w-3"/></a>}</td></tr>}
  </>;
}
