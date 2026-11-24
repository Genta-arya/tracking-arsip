import type { ElectionType, ScannedFile, TPSRecord } from '../types';
import { ELECTION_PAGE_COUNTS } from '../types';

/** Gunakan kategori hasil koreksi untuk checklist tabel dan dialog yang sama. */
export function getElectionFile(record: TPSRecord, election: ElectionType): ScannedFile | null {
  const candidates = record.files.filter(file => {
    if (file.overrideElection === 'HAPUS' || file.overrideElection === 'IGNORE') return false;
    const category = file.overrideElection && file.overrideElection !== 'SUDAH_DIBENARKAN'
      ? file.overrideElection : file.detectedElection;
    return category === election;
  });
  return candidates.find(file => file.isResolved) ?? candidates[0] ?? null;
}

/** Dapatkan jumlah halaman/lembar fisik standar untuk suatu kategori pemilihan atau berkas */
export function getFilePageCount(category: ElectionType | 'UNKNOWN' | string | undefined | null): number | null {
  if (!category || category === 'UNKNOWN') return null;
  return (ELECTION_PAGE_COUNTS as Record<string, number>)[category] ?? null;
}

