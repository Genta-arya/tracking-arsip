import type { ContentIssueSubCategory, ElectionType, RawFileItem } from '../types/index.ts';

export interface ScreeningContentIssueSpec {
  no: number;
  fileId: string;
  subCategory: ContentIssueSubCategory;
  kecamatan: string;
  desa: string;
  tps: number;
  election: ElectionType;
  halAda: number;
  standar: number;
  detail: string;
  baselineSize: number;
  baselinePageCount: number;
}

export interface ContentIssueSubCategoryMeta {
  key: ContentIssueSubCategory;
  label: string;
  shortLabel: string;
  icon: string;
  badgeClass: string;
}

export const CONTENT_ISSUE_SUBCATEGORY_ORDER: readonly ContentIssueSubCategory[] = [
  'HALAMAN_DOUBLE_PAS',
  'GABUNG_2_TPS',
  'EXTRA_SCAN_RUSAK',
  'HALAMAN_GELAP_KOSONG',
];

export const CONTENT_ISSUE_SUBCATEGORY_CONFIG: Record<
  ContentIssueSubCategory,
  ContentIssueSubCategoryMeta
> = {
  HALAMAN_DOUBLE_PAS: {
    key: 'HALAMAN_DOUBLE_PAS',
    label: 'Halaman Double Pas (= Standar)',
    shortLabel: 'Double Pas',
    icon: '📑',
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  },
  GABUNG_2_TPS: {
    key: 'GABUNG_2_TPS',
    label: 'Gabungan 2 TPS dalam 1 PDF',
    shortLabel: 'Gabung 2 TPS',
    icon: '🔀',
    badgeClass: 'bg-violet-50 text-violet-800 border-violet-200',
  },
  EXTRA_SCAN_RUSAK: {
    key: 'EXTRA_SCAN_RUSAK',
    label: 'Extra Scan Gagal / Potongan Kertas',
    shortLabel: 'Extra Scan',
    icon: '✂️',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  HALAMAN_GELAP_KOSONG: {
    key: 'HALAMAN_GELAP_KOSONG',
    label: 'Halaman Gelap / Abu-Abu Kosong',
    shortLabel: 'Hal. Gelap/Kosong',
    icon: '⬛',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
  },
};

/**
 * Daftar resmi 17 berkas PDF Bermasalah Isi dari hasil audit REKAP_SCREENING.xlsx
 * yang tidak dapat terdeteksi hanya dari jumlah halaman nominal (meliputi 9 Double Pas SIREKAP,
 * 3 Gabungan 2 TPS, 2 Extra Scan Gagal/Potongan, dan 3 Halaman Gelap/Kosong).
 */
export const SCREENING_CONTENT_ISSUES: readonly ScreeningContentIssueSpec[] = [
  {
    no: 1,
    fileId: '1zn_ZlNPPX6-_fUVNHoQOgnjs_K47EFhP',
    subCategory: 'HALAMAN_DOUBLE_PAS',
    kecamatan: 'Nanga Mahap',
    desa: 'LEMBAH BERINGIN',
    tps: 8,
    election: 'DPRD_KAB',
    halAda: 20,
    standar: 20,
    detail: 'Halaman double (20/20): Hal 2 identik 100% di Hal 20 sehingga Hal 20 asli hilang.',
    baselineSize: 3153791,
    baselinePageCount: 20,
  },
  {
    no: 2,
    fileId: '1ZJijwzADnn3KGAf_G9r6-8_c2ZeaPp3F',
    subCategory: 'HALAMAN_DOUBLE_PAS',
    kecamatan: 'Belitang Hulu',
    desa: 'IJUK',
    tps: 2,
    election: 'DPD',
    halAda: 4,
    standar: 4,
    detail: 'Halaman double (4/4): Hal 2 identik 100% di Hal 4 sehingga Hal 4 asli hilang.',
    baselineSize: 660406,
    baselinePageCount: 4,
  },
  {
    no: 3,
    fileId: '1e_gyxGs19PIW3QiobLkrATl8qL1MZXR1',
    subCategory: 'HALAMAN_DOUBLE_PAS',
    kecamatan: 'Belitang Hulu',
    desa: 'KUMPANG ILONG',
    tps: 1,
    election: 'DPD',
    halAda: 4,
    standar: 4,
    detail: 'Halaman double (4/4): Hal 2 identik 100% di Hal 4 sehingga Hal 4 asli hilang.',
    baselineSize: 792397,
    baselinePageCount: 4,
  },
  {
    no: 4,
    fileId: '1NIDN43ZuxyYXy6yMtP7ht5oBFmo_R3EL',
    subCategory: 'HALAMAN_DOUBLE_PAS',
    kecamatan: 'Belitang Hulu',
    desa: 'KUMPANG ILONG',
    tps: 1,
    election: 'DPRD_PROV',
    halAda: 20,
    standar: 20,
    detail: 'Halaman double (20/20): Hal 2 identik 100% di Hal 20 sehingga Hal 20 asli hilang.',
    baselineSize: 3665773,
    baselinePageCount: 20,
  },
  {
    no: 5,
    fileId: '1DarJlUB68-8bCxvk12CDyK4twr_lTLUi',
    subCategory: 'HALAMAN_DOUBLE_PAS',
    kecamatan: 'Belitang Hulu',
    desa: 'KUMPANG ILONG',
    tps: 2,
    election: 'PPWP',
    halAda: 3,
    standar: 3,
    detail: 'Halaman double (3/3): Hal 2 identik 100% di Hal 3 sehingga Hal 3 asli hilang.',
    baselineSize: 583155,
    baselinePageCount: 3,
  },
  {
    no: 6,
    fileId: '1WKIv5VntyNQsLyOpzoxXPoY1OBHgQa0c',
    subCategory: 'HALAMAN_DOUBLE_PAS',
    kecamatan: 'Belitang Hulu',
    desa: 'KUMPANG ILONG',
    tps: 4,
    election: 'PPWP',
    halAda: 3,
    standar: 3,
    detail: 'Halaman double (3/3): Hal 2 identik 100% di Hal 3 sehingga Hal 3 asli hilang.',
    baselineSize: 622632,
    baselinePageCount: 3,
  },
  {
    no: 7,
    fileId: '168p_MJyK-hnFw5jVjnA8qUFA7Dckoyu9',
    subCategory: 'HALAMAN_DOUBLE_PAS',
    kecamatan: 'Belitang Hulu',
    desa: 'BATUK MULAU',
    tps: 4,
    election: 'DPRD_PROV',
    halAda: 20,
    standar: 20,
    detail: 'Halaman double (20/20): Hal 2 identik 100% di Hal 20 sehingga Hal 20 asli hilang.',
    baselineSize: 3882866,
    baselinePageCount: 20,
  },
  {
    no: 8,
    fileId: '1yLrAk6Xp9mQf64xN4w7Z4br5Jin88FEF',
    subCategory: 'HALAMAN_DOUBLE_PAS',
    kecamatan: 'Belitang Hulu',
    desa: 'BUKIT RAMBAT',
    tps: 3,
    election: 'DPR_RI',
    halAda: 20,
    standar: 20,
    detail: 'Halaman double (20/20): Hal 2 identik 100% di Hal 20 sehingga Hal 20 asli hilang.',
    baselineSize: 3206533,
    baselinePageCount: 20,
  },
  {
    no: 9,
    fileId: '1TCYfMm7y5z25sNsA9VD9g3CbKq20TQ91',
    subCategory: 'HALAMAN_DOUBLE_PAS',
    kecamatan: 'Belitang Hulu',
    desa: 'BUKIT RAMBAT',
    tps: 3,
    election: 'DPRD_KAB',
    halAda: 20,
    standar: 20,
    detail: 'Halaman double (20/20): Hal 2 identik 100% di Hal 20 sehingga Hal 20 asli hilang.',
    baselineSize: 2963633,
    baselinePageCount: 20,
  },
  {
    no: 10,
    fileId: '1iNEyJ_G8dFaHGoaZelaLiphyR4a7Uzmz',
    subCategory: 'GABUNG_2_TPS',
    kecamatan: 'Sekadau Hilir',
    desa: 'SEBERANG KAPUAS',
    tps: 6,
    election: 'DPD',
    halAda: 8,
    standar: 4,
    detail: 'Gabung 2 TPS (8/4): p1-p4 milik MUNGGUK TPS 7 DPD; p5-p8 milik SEBERANG KAPUAS TPS 6 DPD.',
    baselineSize: 13322983,
    baselinePageCount: 8,
  },
  {
    no: 11,
    fileId: '10_q1G46sHk3YZy4F3CJ17K-aHux33ttt',
    subCategory: 'EXTRA_SCAN_RUSAK',
    kecamatan: 'Sekadau Hilir',
    desa: 'SELALONG',
    tps: 4,
    election: 'DPR_RI',
    halAda: 21,
    standar: 20,
    detail: 'Lebih 1 hal (21/20): p6 foto berbayang/gagal saat membalik halaman sebelum Partai 5 (20 hal lain lengkap).',
    baselineSize: 7394351,
    baselinePageCount: 21,
  },
  {
    no: 12,
    fileId: '1drqVXAvoVb-2lplaS8JMpQILCBfh-lFS',
    subCategory: 'EXTRA_SCAN_RUSAK',
    kecamatan: 'Sekadau Hulu',
    desa: 'SETAWAR',
    tps: 4,
    election: 'DPRD_KAB',
    halAda: 21,
    standar: 20,
    detail: 'Lebih 1 hal (21/20): p12 potongan kertas kecil terselip di antara Partai 10 dan 11 (20 hal lain lengkap).',
    baselineSize: 36954927,
    baselinePageCount: 21,
  },
  {
    no: 13,
    fileId: '1UpIG1FMJkn1Xci3fsOZuSbAglPg8QlPd',
    subCategory: 'GABUNG_2_TPS',
    kecamatan: 'Nanga Mahap',
    desa: 'TELUK KEBAU',
    tps: 2,
    election: 'DPRD_PROV',
    halAda: 39,
    standar: 20,
    detail: 'Gabung 2 TPS + kurang 1 hal (39/20): p1-p20 milik LANDAU KUMPAI TPS 3 (20 hal); p21-p39 milik TELUK KEBAU TPS 2 (19 hal: Partai 9 HILANG).',
    baselineSize: 64033136,
    baselinePageCount: 39,
  },
  {
    no: 14,
    fileId: '1toez2ZcHbLUId_LtWAY-HePVN3Cg5Pd-',
    subCategory: 'GABUNG_2_TPS',
    kecamatan: 'Belitang Hilir',
    desa: 'SEPANTAK',
    tps: 7,
    election: 'DPRD_KAB',
    halAda: 40,
    standar: 20,
    detail: 'Gabung 2 TPS (40/20): p1-p20 milik SEPANTAK TPS 7 (20 hal); p21-p40 milik SUNGAI AYAK SATU TPS 3 (20 hal).',
    baselineSize: 28049504,
    baselinePageCount: 40,
  },
  {
    no: 15,
    fileId: '1AJM6r_53e5yc0_i7nq54O6YnSF1Js8JP',
    subCategory: 'HALAMAN_GELAP_KOSONG',
    kecamatan: 'Belitang Hulu',
    desa: 'BALAI SEPUAK',
    tps: 7,
    election: 'DPR_RI',
    halAda: 20,
    standar: 20,
    detail: 'Halaman rusak/kosong (20/20): Hal 15 (Partai 14 Demokrat) berupa gambar abu-abu kosong polos.',
    baselineSize: 3373531,
    baselinePageCount: 20,
  },
  {
    no: 16,
    fileId: '1L1DidoV4cc11J6u__pGXAjpP-CRqn7kg',
    subCategory: 'HALAMAN_GELAP_KOSONG',
    kecamatan: 'Belitang',
    desa: 'SETUNTUNG',
    tps: 3,
    election: 'DPRD_PROV',
    halAda: 20,
    standar: 20,
    detail: 'Halaman rusak/gelap (20/20): Hal 6 (Partai 5 NasDem) berupa gambar hijau gelap/hitam polos.',
    baselineSize: 4850360,
    baselinePageCount: 20,
  },
  {
    no: 17,
    fileId: '1wRaKLS7PSL1L_MEDv2BE3relHFh42vel',
    subCategory: 'HALAMAN_GELAP_KOSONG',
    kecamatan: 'Belitang',
    desa: 'BELITANG SATU',
    tps: 5,
    election: 'DPRD_KAB',
    halAda: 20,
    standar: 20,
    detail: 'Halaman rusak/kosong (20/20): Hal 5 (Partai 4 Golkar) berupa gambar abu-abu kosong polos.',
    baselineSize: 2874823,
    baselinePageCount: 20,
  },
];

export const SCREENING_CONTENT_ISSUE_BY_ID: ReadonlyMap<string, ScreeningContentIssueSpec> = new Map(
  SCREENING_CONTENT_ISSUES.map((item) => [item.fileId, item])
);

/**
 * Mengembalikan spesifikasi Bermasalah Isi apabila berkas belum dihapus/di-resolve
 * dan ukuran/halaman PDF di Google Drive masih sama dengan kondisi temuan audit.
 */
export function getActiveContentIssue(
  file: Pick<RawFileItem, 'id' | 'size' | 'pageCount' | 'overrideElection' | 'isResolved'>
): ScreeningContentIssueSpec | null {
  const issue = SCREENING_CONTENT_ISSUE_BY_ID.get(file.id);
  if (!issue) return null;

  if (
    file.overrideElection === 'HAPUS' ||
    file.overrideElection === 'IGNORE' ||
    file.overrideElection === 'SUDAH_DIBENARKAN' ||
    file.isResolved
  ) {
    return null;
  }

  // Otomatis bersihkan flag bila PDF fisik di Google Drive sudah diganti dengan versi baru.
  if (typeof file.size === 'number' && file.size > 0 && file.size !== issue.baselineSize) {
    return null;
  }
  if (typeof file.pageCount === 'number' && file.pageCount !== issue.baselinePageCount) {
    return null;
  }

  return issue;
}

export function formatContentIssueMessage(issue: ScreeningContentIssueSpec): string {
  const meta = CONTENT_ISSUE_SUBCATEGORY_CONFIG[issue.subCategory];
  return `${meta.label}: ${issue.detail}`;
}
