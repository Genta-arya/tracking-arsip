import {
  ELECTION_LIST,
  ELECTION_PAGE_COUNTS,
  type ContentIssueSubCategory,
  type ElectionType,
  type GlobalStats,
  type ScannedFile,
  type TPSRecord,
} from '../types/index.ts';
import {
  CONTENT_ISSUE_SUBCATEGORY_ORDER,
  SCREENING_CONTENT_ISSUE_BY_ID,
  type ScreeningContentIssueSpec,
} from '../data/screeningContentIssues.ts';

export interface MissingElectionSlotItem {
  key: string;
  kecamatan: string;
  desa: string;
  tpsNumber: number;
  tpsFolderName: string;
  tpsFolderId: string;
  tpsFolderUrl: string;
  election: ElectionType;
  electionLabel: string;
  electionShortLabel: string;
  expectedPages: number;
  record: TPSRecord;
}

export interface ScreeningContentIssueEntry {
  file: ScannedFile;
  record: TPSRecord;
  spec: ScreeningContentIssueSpec;
}

export interface ScreeningIncompletePageEntry {
  file: ScannedFile;
  record: TPSRecord;
  pageCount: number;
  expectedPages: number;
  missingPages: number;
  electionLabel: string;
}

export interface ScreeningAuditSummary {
  totalTPS: number;
  totalSlots: number;
  cleanSlots: number;
  totalIssueCount: number;
  bermasalahIsi: {
    count: number;
    tpsCount: number;
    items: ScreeningContentIssueEntry[];
    subCounts: Record<ContentIssueSubCategory, number>;
  };
  belumAdaBerkas: {
    count: number;
    tpsCount: number;
    items: MissingElectionSlotItem[];
    byElection: Record<ElectionType, number>;
  };
  kurangHalaman: {
    count: number;
    tpsCount: number;
    totalMissingPages: number;
    items: ScreeningIncompletePageEntry[];
  };
}

function getSlotForElection(record: TPSRecord, key: ElectionType): ScannedFile | null {
  switch (key) {
    case 'PPWP':
      return record.slotPPWP;
    case 'DPR_RI':
      return record.slotDPR_RI;
    case 'DPD':
      return record.slotDPD;
    case 'DPRD_PROV':
      return record.slotDPRD_PROV;
    case 'DPRD_KAB':
      return record.slotDPRD_KAB;
  }
}

/**
 * Menghitung ringkasan 3 kategori temuan screening kelengkapan arsip:
 * 1. Bermasalah Isi (Double pas, Gabung 2 TPS, Extra Scan, Gelap/Kosong)
 * 2. Belum Ada Berkas (Slot pemilihan kosong di folder TPS)
 * 3. Kurang Halaman (Berkas terunggah dengan jumlah lembar < standar)
 */
export function computeScreeningAuditSummary(records: readonly TPSRecord[]): ScreeningAuditSummary {
  const subCounts: Record<ContentIssueSubCategory, number> = {
    HALAMAN_DOUBLE_PAS: 0,
    GABUNG_2_TPS: 0,
    EXTRA_SCAN_RUSAK: 0,
    HALAMAN_GELAP_KOSONG: 0,
  };
  const byElection: Record<ElectionType, number> = {
    PPWP: 0,
    DPR_RI: 0,
    DPD: 0,
    DPRD_PROV: 0,
    DPRD_KAB: 0,
  };

  const contentItems: ScreeningContentIssueEntry[] = [];
  const missingItems: MissingElectionSlotItem[] = [];
  const incompleteItems: ScreeningIncompletePageEntry[] = [];

  const contentTpsSet = new Set<string>();
  const missingTpsSet = new Set<string>();
  const incompleteTpsSet = new Set<string>();
  const electionMetaMap = new Map(ELECTION_LIST.map((e) => [e.key, e]));

  let totalMissingPages = 0;

  for (const record of records) {
    // 1. Slot kosong ("Belum Ada Berkas") per TPS per jenis pemilihan
    for (const cfg of ELECTION_LIST) {
      if (!getSlotForElection(record, cfg.key)) {
        missingTpsSet.add(record.id);
        byElection[cfg.key]++;
        missingItems.push({
          key: `${record.tpsFolderId}-${cfg.key}`,
          kecamatan: record.kecamatan,
          desa: record.desa,
          tpsNumber: record.tpsNumber,
          tpsFolderName: record.tpsFolderName,
          tpsFolderId: record.tpsFolderId,
          tpsFolderUrl: record.tpsFolderUrl,
          election: cfg.key,
          electionLabel: cfg.label,
          electionShortLabel: cfg.shortLabel,
          expectedPages: cfg.pages,
          record,
        });
      }
    }

    // 2. Berkas aktif dengan Bermasalah Isi & Kurang Halaman
    for (const file of record.files) {
      if (file.overrideElection === 'HAPUS' || file.overrideElection === 'IGNORE' || file.isResolved) {
        continue;
      }

      if (file.isContentIssue && file.contentIssueSubCategory) {
        const spec = SCREENING_CONTENT_ISSUE_BY_ID.get(file.id);
        if (spec) {
          contentTpsSet.add(record.id);
          subCounts[file.contentIssueSubCategory]++;
          contentItems.push({ file, record, spec });
        }
      }

      const hasIncomplete = file.anomalies?.some((a) => a.type === 'INCOMPLETE_PAGES');
      if (hasIncomplete && file.pageCount !== undefined && file.expectedPages !== undefined) {
        const missingPages = Math.max(0, file.expectedPages - file.pageCount);
        if (missingPages > 0) {
          incompleteTpsSet.add(record.id);
          totalMissingPages += missingPages;
          const electionKey =
            file.detectedElection !== 'UNKNOWN' ? file.detectedElection : undefined;
          const meta = electionKey ? electionMetaMap.get(electionKey) : undefined;
          incompleteItems.push({
            file,
            record,
            pageCount: file.pageCount,
            expectedPages: file.expectedPages,
            missingPages,
            electionLabel: meta?.shortLabel || file.detectedElection,
          });
        }
      }
    }
  }

  // Pastikan urutan subCounts deterministik saat diiterasi
  for (const key of CONTENT_ISSUE_SUBCATEGORY_ORDER) {
    subCounts[key] = subCounts[key] || 0;
  }

  contentItems.sort((a, b) => a.spec.no - b.spec.no);

  const totalSlots = records.length * ELECTION_LIST.length;
  const totalIssueCount = contentItems.length + missingItems.length + incompleteItems.length;

  return {
    totalTPS: records.length,
    totalSlots,
    cleanSlots: Math.max(0, totalSlots - totalIssueCount),
    totalIssueCount,
    bermasalahIsi: {
      count: contentItems.length,
      tpsCount: contentTpsSet.size,
      items: contentItems,
      subCounts,
    },
    belumAdaBerkas: {
      count: missingItems.length,
      tpsCount: missingTpsSet.size,
      items: missingItems,
      byElection,
    },
    kurangHalaman: {
      count: incompleteItems.length,
      tpsCount: incompleteTpsSet.size,
      totalMissingPages,
      items: incompleteItems,
    },
  };
}

export interface FileBreakdownSegment {
  key: 'CONTENT_ISSUE' | 'INCOMPLETE_PAGES' | 'OTHER_ANOMALY' | 'MISSING_SLOTS';
  label: string;
  count: number;
  textClass: string;
}

/**
 * Mengembalikan rincian kategori bermasalah (Isi, Kurang Halaman, Lainnya, Belum Ada)
 * agar kartu KPI langsung memperjelas asal total anomali dan selisih slot.
 */
export function getFileStatusBreakdownSegments(
  stats: Pick<
    GlobalStats,
    | 'contentIssueFilesCount'
    | 'incompletePageFilesCount'
    | 'otherAnomalyFilesCount'
    | 'missingSlotsCount'
  >
): FileBreakdownSegment[] {
  const segments: FileBreakdownSegment[] = [];
  if ((stats.contentIssueFilesCount ?? 0) > 0) {
    segments.push({
      key: 'CONTENT_ISSUE',
      label: `${stats.contentIssueFilesCount} Bermasalah Isi`,
      count: stats.contentIssueFilesCount!,
      textClass: 'text-indigo-700',
    });
  }
  if ((stats.incompletePageFilesCount ?? 0) > 0) {
    segments.push({
      key: 'INCOMPLETE_PAGES',
      label: `${stats.incompletePageFilesCount} Kurang Hal.`,
      count: stats.incompletePageFilesCount!,
      textClass: 'text-rose-700',
    });
  }
  if ((stats.otherAnomalyFilesCount ?? 0) > 0) {
    segments.push({
      key: 'OTHER_ANOMALY',
      label: `${stats.otherAnomalyFilesCount} Nama/Lainnya`,
      count: stats.otherAnomalyFilesCount!,
      textClass: 'text-amber-700',
    });
  }
  if ((stats.missingSlotsCount ?? 0) > 0) {
    segments.push({
      key: 'MISSING_SLOTS',
      label: `${stats.missingSlotsCount} Belum Ada`,
      count: stats.missingSlotsCount!,
      textClass: 'text-orange-700',
    });
  }
  return segments;
}

export function formatFileCardSubtitle(
  stats: Pick<
    GlobalStats,
    | 'validFilesCount'
    | 'totalFilesCollected'
    | 'anomalyFilesCount'
    | 'contentIssueFilesCount'
    | 'incompletePageFilesCount'
    | 'otherAnomalyFilesCount'
    | 'missingSlotsCount'
  >
): string {
  const valid = (stats.validFilesCount ?? stats.totalFilesCollected).toLocaleString('id-ID');
  const anomaly = (stats.anomalyFilesCount ?? 0).toLocaleString('id-ID');
  const segs = getFileStatusBreakdownSegments(stats);
  if (segs.length === 0) {
    return `${valid} Berkas Sah • ${anomaly} Anomali`;
  }
  const anomParts = segs.filter((s) => s.key !== 'MISSING_SLOTS').map((s) => s.label);
  const missingPart = segs.find((s) => s.key === 'MISSING_SLOTS')?.label;
  const anomDetail = anomParts.length > 0 ? ` (${anomParts.join(' + ')})` : '';
  return `${valid} Sah • ${anomaly} Anomali${anomDetail}${missingPart ? ` • ${missingPart}` : ''}`;
}

export { ELECTION_PAGE_COUNTS };
