import type { RawFileItem, RawTpsData } from '@/types';

export const ARCHIVE_TIME_ZONE = 'Asia/Jakarta';
const archiveDayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: ARCHIVE_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
});

export type AnalyticsRange = 'THIS_MONTH' | 'LAST_30' | 'ALL';
export interface DailyActivity { date: string; rawDate: string; harian: number; kumulatif: number }
export interface ArchiveSnapshot {
  total: number;
  at: string;
  source: string;
  rootFolderId: string;
  metric: 'active-files-v1';
}
export interface ArchiveComparison { current: ArchiveSnapshot; previous: ArchiveSnapshot | null }

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
  return (file.createdAt ? archiveDateKey(file.createdAt) : null) ||
    (file.updatedAt ? archiveDateKey(file.updatedAt) : null);
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

export function countActiveArchiveFiles(records: Pick<RawTpsData, 'files'>[]): number {
  return records.reduce((total, record) => total + (record.files || []).filter(isActiveArchiveFile).length, 0);
}

export function isArchiveSnapshot(value: unknown): value is ArchiveSnapshot {
  if (!value || typeof value !== 'object') return false;
  const snapshot = value as ArchiveSnapshot;
  return Number.isInteger(snapshot.total) && snapshot.total >= 0 && snapshot.metric === 'active-files-v1' &&
    typeof snapshot.rootFolderId === 'string' && typeof snapshot.source === 'string' &&
    typeof snapshot.at === 'string' && !Number.isNaN(new Date(snapshot.at).getTime());
}

export function nextArchiveComparison(existing: unknown, current: ArchiveSnapshot): ArchiveComparison {
  const candidate = (existing as ArchiveComparison | null)?.current;
  return { current, previous: isArchiveSnapshot(candidate) && candidate.rootFolderId === current.rootFolderId ? candidate : null };
}
