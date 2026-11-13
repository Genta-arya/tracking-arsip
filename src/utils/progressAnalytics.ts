import type { RawFileItem, TPSRecord, ElectionType } from '@/types';

export const ARCHIVE_TIME_ZONE = 'Asia/Jakarta';
const archiveDayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: ARCHIVE_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
});

export type AnalyticsRange = 'THIS_MONTH' | 'LAST_30' | 'ALL';
export interface DailyActivity { date: string; rawDate: string; harian: number; kumulatif: number }
export function isActiveArchiveFile(file: Pick<RawFileItem, 'overrideElection'>): boolean {
  return file.overrideElection !== 'HAPUS' && file.overrideElection !== 'IGNORE';
}

export function archiveDateKey(value: string | Date): string | null {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = archiveDayFormatter.formatToParts(date);
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)?.value).join('-');
}

export function previousCalendarDay(key: string): string {
  const date = new Date(`${key}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export function formatArchiveDay(key: string): string {
  return new Date(`${key}T12:00:00Z`).toLocaleDateString('id-ID', {
    timeZone: ARCHIVE_TIME_ZONE, day: 'numeric', month: 'short', year: 'numeric',
  });
}

export function fileActivityDay(file: Pick<RawFileItem, 'createdAt' | 'updatedAt'>): string | null {
  return file.createdAt ? archiveDateKey(file.createdAt) : null;
}

export function dailyActivityCounts(files: RawFileItem[], now = new Date()): Map<string, number> {
  const today = archiveDateKey(now)!;
  const counts = new Map<string, number>();
  for (const file of files) {
    if (!isActiveArchiveFile(file)) continue;
    const key = fileActivityDay(file);
    if (key && key <= today) counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

export function buildActivityChart(counts: Map<string, number>, range: AnalyticsRange, now = new Date()): DailyActivity[] {
  const today = archiveDateKey(now)!;
  let start = today.slice(0, 7) + '-01';
  if (range === 'LAST_30') {
    start = today;
    for (let i = 0; i < 29; i++) start = previousCalendarDay(start);
  }
  let total = 0;
  return [...counts.entries()].filter(([key, count]) => count > 0 && key <= today && (range === 'ALL' || key >= start))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => ({ date: formatArchiveDay(key), rawDate: key, harian: count, kumulatif: total += count }));
}

export function compareArchiveCounts(current: number, previous: number | null) {
  if (previous === null) return { delta: null, percent: null, direction: 'unavailable' as const };
  const delta = current - previous;
  return {
    delta,
    percent: previous === 0 ? (current === 0 ? 0 : null) : delta * 100 / previous,
    direction: delta > 0 ? 'up' as const : delta < 0 ? 'down' as const : 'flat' as const,
  };
}

export function cumulativeUploadCount(counts: Map<string, number>, throughDate: string): number {
  let total = 0;
  for (const [date, count] of counts) if (date <= throughDate) total += count;
  return total;
}

export interface DistrictActivity { name: string; count: number }
export type ActivityElection = ElectionType | 'UNKNOWN';
const activityElections: ActivityElection[] = ['PPWP', 'DPR_RI', 'DPD', 'DPRD_PROV', 'DPRD_KAB', 'UNKNOWN'];

export function dailyDistrictActivity(records: Pick<TPSRecord, 'kecamatan' | 'files'>[], date: string) {
  const total = new Map<string, number>();
  const names = new Map<string, string>();
  const elections = Object.fromEntries(activityElections.map(key => [key, new Map<string, number>()])) as Record<ActivityElection, Map<string, number>>;
  for (const record of records) {
    const name = record.kecamatan.trim().replace(/\s+/g, ' ');
    const key = name.toLocaleLowerCase('id');
    if (!names.has(key)) names.set(key, name || 'Belum diketahui');
    for (const file of record.files) {
      if (!isActiveArchiveFile(file) || fileActivityDay(file) !== date) continue;
      const candidate = file.overrideElection && file.overrideElection !== 'SUDAH_DIBENARKAN' ? file.overrideElection : file.detectedElection;
      const election = activityElections.includes(candidate as ActivityElection) ? candidate as ActivityElection : 'UNKNOWN';
      total.set(key, (total.get(key) || 0) + 1);
      elections[election].set(key, (elections[election].get(key) || 0) + 1);
    }
  }
  const rows = (counts: Map<string, number>): DistrictActivity[] => [...counts].map(([key, count]) => ({ name: names.get(key)!, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'id'));
  return {
    total: rows(total),
    byElection: Object.fromEntries(activityElections.map(key => [key, rows(elections[key])])) as Record<ActivityElection, DistrictActivity[]>,
    focus: rows(total).filter(row => row.count > 50 && row.name !== 'Belum diketahui'),
  };
}

/** Hari bertanggal paling dekat sebelum acuan yang benar-benar memiliki upload. */
export function previousActiveDay(counts: Map<string, number>, beforeDate: string): { date: string; count: number } | null {
  let previous: { date: string; count: number } | null = null;
  for (const [date, count] of counts) {
    if (date < beforeDate && count > 0 && (!previous || date > previous.date)) previous = { date, count };
  }
  return previous;
}

export interface DailyProcessingTimelineItem {
  date: string;
  rawDate: string;
  fileCount: number;
  totalDurationSeconds: number;
  avgDurationPerFileSeconds: number;
  sessionCount: number;
  firstUploadTime?: string;
  lastUploadTime?: string;
  totalDurationFormatted: string;
  avgDurationFormatted: string;
}

export function formatDurationHuman(seconds: number): string {
  if (!seconds || seconds <= 0) return '0 dtk';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} jam`);
  if (minutes > 0) parts.push(`${minutes} mnt`);
  if (secs > 0 && hours === 0) parts.push(`${secs} dtk`);

  return parts.length > 0 ? parts.join(' ') : `${secs} dtk`;
}

export function formatDurationShort(seconds: number): string {
  if (!seconds || seconds <= 0) return '0m';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return minutes > 0 ? `${hours}j ${minutes}m` : `${hours}j`;
  }
  const secs = Math.floor(seconds % 60);
  return minutes > 0 ? `${minutes}m ${secs > 0 ? secs + 's' : ''}`.trim() : `${secs}s`;
}

/**
 * Menghitung linimasa pengerjaan harian:
 * - Mengelompokkan timestamp unggah/pengerjaan berkas per hari (WIB)
 * - Menghitung total durasi kerja per hari dengan session-gap threshold (misal 30 menit / 1800 detik)
 * - Menghitung rata-rata waktu pengerjaan per berkas (total durasi / jumlah berkas)
 */
export function calculateDailyProcessingTimeline(
  files: RawFileItem[],
  range: AnalyticsRange = 'ALL',
  now = new Date(),
  sessionGapSeconds: number = 1800
): DailyProcessingTimelineItem[] {
  const today = archiveDateKey(now)!;
  let start = today.slice(0, 7) + '-01';
  if (range === 'LAST_30') {
    start = today;
    for (let i = 0; i < 29; i++) start = previousCalendarDay(start);
  }

  // Kelompokkan timestamp (epoch ms) per rawDate
  const dayTimestamps = new Map<string, number[]>();

  for (const file of files) {
    if (!isActiveArchiveFile(file)) continue;
    const dateKey = fileActivityDay(file);
    if (!dateKey || dateKey > today) continue;
    if (range !== 'ALL' && dateKey < start) continue;

    const time = file.createdAt ? new Date(file.createdAt).getTime() : NaN;
    if (Number.isNaN(time)) continue;

    const list = dayTimestamps.get(dateKey) || [];
    list.push(time);
    dayTimestamps.set(dateKey, list);
  }

  const sortedDates = [...dayTimestamps.keys()].sort();
  const timeFormatter = new Intl.DateTimeFormat('id-ID', {
    timeZone: ARCHIVE_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
  });

  return sortedDates.map((dateKey) => {
    const times = dayTimestamps.get(dateKey)!.sort((a, b) => a - b);
    const count = times.length;
    let totalSeconds = 0;
    let sessionCount = 1;

    for (let i = 0; i < times.length; i++) {
      if (i === 0) {
        // Asumsi waktu dasar minimal per berkas tunggal (1.5 menit = 90 detik)
        totalSeconds += 90;
        continue;
      }
      const gapSec = Math.max(0, (times[i] - times[i - 1]) / 1000);
      if (gapSec > sessionGapSeconds) {
        sessionCount++;
        totalSeconds += 90; // batch/sesi baru dimulai
      } else {
        // Delta pengerjaan riil antar file dalam sesi yang sama (minimal 20 detik jika bersamaan/batch)
        totalSeconds += Math.max(20, gapSec);
      }
    }

    const avgPerFile = count > 0 ? totalSeconds / count : 0;
    const firstTime = times.length > 0 ? timeFormatter.format(new Date(times[0])) : undefined;
    const lastTime = times.length > 0 ? timeFormatter.format(new Date(times[times.length - 1])) : undefined;

    return {
      date: formatArchiveDay(dateKey),
      rawDate: dateKey,
      fileCount: count,
      totalDurationSeconds: Math.round(totalSeconds),
      avgDurationPerFileSeconds: Math.round(avgPerFile),
      sessionCount,
      firstUploadTime: firstTime,
      lastUploadTime: lastTime,
      totalDurationFormatted: formatDurationHuman(totalSeconds),
      avgDurationFormatted: formatDurationHuman(avgPerFile),
    };
  });
}
