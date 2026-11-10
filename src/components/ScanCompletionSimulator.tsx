import { useId, useState } from 'react';
import { Calculator, CalendarCheck, RotateCcw, Target } from 'lucide-react';
import { useArchiveToday } from '@/hooks/useArchiveToday';
import { calculateScanPlan, type WorkWeek } from '@/utils/scanSimulation';

export function ScanCompletionSimulator({ expectedFiles, validFiles }: { expectedFiles: number; validFiles: number }) {
  const id = useId();
  const today = useArchiveToday();
  const remaining = Math.max(0, expectedFiles - validFiles);
  const [quantityOverride, setQuantityOverride] = useState<string | null>(null);
  const [target, setTarget] = useState('150');
  const [dateOverride, setDateOverride] = useState<string | null>(null);
  const [workWeek, setWorkWeek] = useState<WorkWeek>(5);
  const quantity = quantityOverride ?? String(remaining);
  const startDate = dateOverride ?? today;
  let plan: ReturnType<typeof calculateScanPlan> | null = null;
  let error = '';
  try {
    if (quantity.trim() === '' || target.trim() === '') throw new Error('Isi jumlah berkas dan target harian terlebih dahulu.');
    plan = calculateScanPlan(Number(quantity), Number(target), startDate, workWeek);
  } catch (value) { error = value instanceof Error ? value.message : String(value); }
  const number = (value: number) => value.toLocaleString('id-ID');
  const inputClass = 'mt-1.5 h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kpu-maroon';
  const finishLabel = plan?.finishDate ? new Date(`${plan.finishDate}T12:00:00Z`).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : null;

  return <section aria-label="Simulasi penyelesaian scan" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="flex items-start gap-3 border-b border-slate-100 bg-gradient-to-r from-rose-50/80 to-amber-50/40 p-4 sm:p-5">
      <div className="rounded-xl bg-kpu-maroon p-2.5 text-white shadow-sm"><Calculator className="h-5 w-5" aria-hidden="true" /></div>
      <div><h3 className="text-base font-black tracking-tight text-slate-900">Simulasi Penyelesaian Scan</h3><p className="mt-0.5 text-xs leading-relaxed text-slate-500">Atur target harian untuk memperkirakan kebutuhan hari kerja.</p></div>
    </div>
    <div className="space-y-4 p-4 sm:p-5">
      <div className="grid grid-cols-3 gap-2 text-center">
        {[{label:'Target arsip',value:expectedFiles},{label:'Berkas sah',value:validFiles},{label:'Sisa kebutuhan',value:remaining}].map(item => <div key={item.label} className="rounded-xl bg-slate-50 px-2 py-3"><p className="text-[10px] text-slate-500">{item.label}</p><p className="mt-1 text-lg font-black tabular-nums text-slate-800">{number(item.value)}</p></div>)}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div><label htmlFor={`${id}-quantity`} className="text-xs font-bold text-slate-700">Berkas yang ingin diselesaikan</label><input id={`${id}-quantity`} type="number" inputMode="numeric" min={0} step={1} value={quantity} onChange={event => setQuantityOverride(event.target.value)} className={inputClass} />
          <button type="button" onClick={() => setQuantityOverride(null)} className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-kpu-maroon underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kpu-maroon"><RotateCcw className="h-3 w-3" aria-hidden="true" />Gunakan sisa arsip ({number(remaining)})</button>
        </div>
        <div><label htmlFor={`${id}-target`} className="text-xs font-bold text-slate-700">Target harian (berkas/hari)</label><input id={`${id}-target`} type="number" inputMode="numeric" min={1} step={1} value={target} onChange={event => setTarget(event.target.value)} className={inputClass} /></div>
        <div><label htmlFor={`${id}-date`} className="text-xs font-bold text-slate-700">Tanggal mulai</label><input id={`${id}-date`} type="date" value={startDate} onChange={event => setDateOverride(event.target.value)} className={inputClass} /></div>
        <div><label htmlFor={`${id}-week`} className="text-xs font-bold text-slate-700">Jadwal kerja</label><select id={`${id}-week`} value={workWeek} onChange={event => setWorkWeek(Number(event.target.value) as WorkWeek)} className={inputClass}><option value={5}>Senin–Jumat (5 hari)</option><option value={6}>Senin–Sabtu (6 hari)</option><option value={7}>Setiap hari (7 hari)</option></select></div>
      </div>
      {error ? <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">{error}</p> : plan && <div role="status" aria-live="polite" className="rounded-2xl bg-gradient-to-br from-kpu-darkMaroon to-kpu-maroon p-4 text-white sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-kpu-lightGold"><Target className="h-3.5 w-3.5" aria-hidden="true" />Estimasi waktu</p><p className="mt-1 text-3xl font-black tabular-nums">{number(plan.workingDays)}<span className="ml-2 text-sm font-semibold text-white/80">hari kerja</span></p></div><p className="text-xs leading-relaxed text-white/80">{number(Number(quantity))} berkas<br />dengan target {number(Number(target))} per hari</p></div>
        <div className="mt-3 border-t border-white/15 pt-3"><p className="flex items-center gap-1.5 text-xs font-bold text-kpu-lightGold"><CalendarCheck className="h-4 w-4" aria-hidden="true" />{finishLabel ? `Perkiraan selesai: ${finishLabel}` : 'Tidak ada pekerjaan tersisa pada simulasi ini.'}</p>{plan.workingDays > 0 && <p className="mt-1 text-[11px] text-white/70">Hari terakhir: {number(plan.lastDayFiles)} berkas. Tanggal mulai dihitung sebagai hari pertama jika termasuk jadwal kerja.</p>}</div>
      </div>}
      <p className="text-[10px] leading-relaxed text-slate-500">Sisa kebutuhan mengikuti target arsip dikurangi berkas sah. Angka bisa diubah untuk simulasi. Hari libur nasional belum diperhitungkan; input simulasi tidak disimpan.</p>
    </div>
  </section>;
}
