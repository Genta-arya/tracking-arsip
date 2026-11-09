export type ElectionType = 
  | 'PPWP'        // Presiden & Wakil Presiden
  | 'DPR_RI'      // DPR Republik Indonesia
  | 'DPD'         // DPD Republik Indonesia
  | 'DPRD_PROV'   // DPRD Provinsi Kalimantan Barat
  | 'DPRD_KAB';   // DPRD Kabupaten Sekadau

export interface ElectionConfig {
  key: ElectionType;
  label: string;
  shortLabel: string;
  code: string;
  description: string;
}

export const ELECTION_LIST: ElectionConfig[] = [
  { key: 'PPWP', label: 'Presiden & Wakil Presiden', shortLabel: 'PPWP', code: 'PPWP', description: 'Surat Suara Abu-Abu' },
  { key: 'DPR_RI', label: 'DPR Republik Indonesia', shortLabel: 'DPR RI', code: 'DPR-RI', description: 'Surat Suara Kuning' },
  { key: 'DPD', label: 'DPD Republik Indonesia', shortLabel: 'DPD', code: 'DPD', description: 'Surat Suara Merah' },
  { key: 'DPRD_PROV', label: 'DPRD Provinsi', shortLabel: 'DPRD Prov', code: 'DPRD-PROV', description: 'Surat Suara Biru' },
  { key: 'DPRD_KAB', label: 'DPRD Kabupaten/Kota', shortLabel: 'DPRD Kab/Ko', code: 'DPRD-KAB', description: 'Surat Suara Hijau' },
];

export type AnomalyType = 
  | 'MISMATCH_TPS' 
  | 'MISMATCH_DESA' 
  | 'DUPLICATE' 
  | 'UNKNOWN_FORMAT' 
  | 'DPRD_AMBIGUOUS';

export interface AnomalyItem {
  type: AnomalyType;
  message: string;
  fileName: string;
}

export type OverrideElectionType = ElectionType | 'IGNORE' | 'SUDAH_DIBENARKAN';

export interface RawFileItem {
  id: string;
  name: string;
  url: string;
  createdAt?: string; // Tanggal / waktu berkas pertama kali dibuat / diupload ke Drive
  updatedAt?: string; // Tanggal terakhir diedit di Drive
  size?: number;
  uploader?: string; // Nama / email pengunggah berkas di Google Drive
  overrideElection?: OverrideElectionType;
  isResolved?: boolean;
  resolutionNote?: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface ScannedFile extends RawFileItem {
  detectedElection: ElectionType | 'UNKNOWN';
  anomalies: AnomalyItem[];
}

export interface RawTpsData {
  kecamatan: string;
  desa: string;
  tpsFolderName: string;
  tpsFolderId: string;
  tpsFolderUrl: string;
  files: RawFileItem[];
}

export interface TPSRecord {
  id: string;
  kecamatan: string;
  desa: string;
  tpsNumber: number;
  tpsFolderName: string;
  tpsFolderId: string;
  tpsFolderUrl: string;
  files: ScannedFile[];
  slotPPWP: ScannedFile | null;
  slotDPR_RI: ScannedFile | null;
  slotDPD: ScannedFile | null;
  slotDPRD_PROV: ScannedFile | null;
  slotDPRD_KAB: ScannedFile | null;
  completedCount: number; // 0 to 5
  isComplete: boolean;
  hasAnomaly: boolean;
  anomalies: AnomalyItem[];
}

export interface KecamatanSummary {
  name: string;
  totalDesa: number;
  totalTPS: number;
  completedTPS: number;
  partialTPS: number;
  emptyTPS: number;
  anomalyTPS: number;
  totalFiles: number;
  expectedFiles: number; // totalTPS * 5
  percentage: number;
  validFiles?: number;   // Jumlah berkas yang sah mengisi 5 slot
  missingFiles?: number; // Jumlah berkas yang masih kurang (expectedFiles - validFiles)
}

export interface GlobalStats {
  totalKecamatan: number;
  totalDesa: number;
  totalTPS: number;
  completedTPS: number;
  partialTPS: number;
  emptyTPS: number;
  anomalyTPS: number;
  totalFilesCollected: number; // Total semua berkas fisik yang ada di Google Drive
  expectedFilesTotal: number;
  completionPercentage: number;
  validFilesCount: number;     // Jumlah berkas yang sudah sah mengisi 5 slot pemilihan
  anomalyFilesCount: number;   // Jumlah berkas anomali / belum dikenali
}

export type StatusFilterOption = 'ALL' | 'COMPLETE' | 'PARTIAL' | 'EMPTY' | 'ANOMALY';

export interface FilterState {
  kecamatan: string;
  desa: string;
  status: StatusFilterOption;
  missingElection: 'ALL' | ElectionType;
  searchQuery: string;
}

export interface AppConfig {
  gasWebAppUrl: string;
  rootFolderId: string;
  lastSyncedAt: string | null;
  isDemoMode: boolean;
}

