import { ArrowDownRight, ArrowUpRight, Minus, History } from 'lucide-react';
import { compareArchiveCounts } from '@/utils/progressAnalytics';

interface Props {
  title: string;
  current: number | null;
  previous: number | null;
  currentLabel: string;
  previousLabel: string;
  note?: string;
}

export function ArchiveComparisonCard({ title, current, previous, currentLabel, previousLabel, note }: Props) {
  const comparison = compareArchiveCounts(current ?? 0, current === null ? null : previous);
  const up = comparison.direction === 'up';
  const down = comparison.direction === 'down';
  const Icon = up ? ArrowUpRight : down ? ArrowDownRight : comparison.direction === 'unavailable' ? History : Minus;
  const color = up ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : down ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-slate-600 bg-slate-50 border-slate-200';
  const count = (value: number | null) => value === null ? '—' : value.toLocaleString('id-ID');
  const percent = comparison.percent === null ? (comparison.delta === null ? 'Belum ada pembanding' : 'Baru dari 0') :
    `${comparison.percent > 0 ? '+' : ''}${comparison.percent.toLocaleString('id-ID', { maximumFractionDigits: 1 })}%`;

  return <section aria-label={title} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-2"><h4 className="text-xs font-extrabold text-slate-800">{title}</h4><span className={`flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-xs font-bold ${color}`}><Icon className="h-4 w-4" aria-hidden="true" />{percent}</span></div>
    <div className="mt-4 grid grid-cols-2 gap-3">
      <div><p className="text-[10px] leading-relaxed text-slate-500">{previousLabel}</p><p className="mt-1 text-xl font-black tabular-nums text-slate-500">{count(previous)}<span className="ml-1 text-[10px] font-medium">berkas</span></p></div>
      <div><p className="text-[10px] leading-relaxed text-slate-500">{currentLabel}</p><p className="mt-1 text-xl font-black tabular-nums text-slate-900">{count(current)}<span className="ml-1 text-[10px] font-medium">berkas</span></p></div>
    </div>
    <p className={`mt-3 rounded-lg border px-3 py-2 text-xs font-bold ${color}`}>{comparison.delta === null ? 'Menunggu dua hasil yang dapat dibandingkan.' : comparison.delta > 0 ? `Naik ${count(comparison.delta)} berkas` : comparison.delta < 0 ? `Turun ${count(Math.abs(comparison.delta))} berkas` : 'Tetap · tidak ada perubahan jumlah'}</p>
    {note && <p className="mt-2 text-[10px] leading-relaxed text-slate-500">{note}</p>}
  </section>;
}
