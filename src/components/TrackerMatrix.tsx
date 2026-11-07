import { useState, useEffect } from 'react';
import {
  Check,
  X,
  AlertTriangle,
  ExternalLink,
  FileText,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { TPSRecord, ScannedFile } from '@/types';

interface TrackerMatrixProps {
  records: TPSRecord[];
  onOpenFileDetail: (record: TPSRecord) => void;
  isDemoMode?: boolean;
}

export function TrackerMatrix({
  records,
  onOpenFileDetail,
  isDemoMode = false,
}: TrackerMatrixProps) {
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Reset ke halaman 1 setiap kali daftar records (hasil filter/pencarian) berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [records.length]);

  const totalPages = Math.ceil(records.length / pageSize) || 1;

  // Pastikan currentPage tidak melebihi totalPages yang ada
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const currentRecords = records.slice(startIndex, startIndex + pageSize);

  // Helper untuk rendering sel pemilihan
  const renderElectionCell = (
    file: ScannedFile | null,
    label: string,
    tps: TPSRecord
  ) => {
    if (!file) {
      return (
        <td className="px-3 py-3 text-center">
          <div
            className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-rose-50 text-rose-500 border border-rose-200/60 shadow-xs cursor-pointer hover:bg-rose-100 hover:scale-110 active:scale-95 transition-all"
            title={`${label}: BELUM ADA. Klik untuk lihat detail folder.`}
            onClick={() => onOpenFileDetail(tps)}
          >
            <X className="h-4 w-4 stroke-[2.5]" />
          </div>
        </td>
      );
    }

    const hasFileAnomaly = file.anomalies.length > 0;

    return (
      <td className="px-3 py-3 text-center">
        <div
          className={`inline-flex items-center justify-center h-7 w-7 rounded-lg shadow-xs cursor-pointer hover:scale-110 active:scale-95 transition-all ${
            hasFileAnomaly
              ? 'bg-amber-100 text-amber-800 border border-amber-300 ring-2 ring-amber-300/40 hover:bg-amber-200'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
          }`}
          title={`${label}: ${file.name} ${
            hasFileAnomaly ? `(⚠️ ${file.anomalies[0].message})` : '(Lengkap)'
          }. Klik untuk detail.`}
          onClick={() => onOpenFileDetail(tps)}
        >
          {hasFileAnomaly ? (
            <AlertTriangle className="h-3.5 w-3.5 stroke-[2.5]" />
          ) : (
            <Check className="h-4 w-4 stroke-[2.5]" />
          )}
        </div>
      </td>
    );
  };

  return (
    <div
      id="matriks-kelengkapan-section"
      className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col scroll-mt-6"
    >
      {/* Header Tabel & Navigasi Halaman Atas */}
      <div className="px-4 sm:px-5 py-3 border-b border-slate-200/80 bg-slate-50/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-sm text-slate-800">
            Matriks Kelengkapan Berkas Scan C-Hasil
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            (Total <AnimatedCounter value={records.length} /> TPS terdata)
          </span>
        </div>

        {/* Kontrol Navigasi Halaman Atas & Page Size */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end w-full sm:w-auto gap-2.5 sm:gap-3 text-xs text-slate-600">
          {/* Page size selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500 hidden sm:inline">Per hal:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white font-medium focus:ring-1 focus:ring-kpu-maroon"
            >
              <option value={25}>25 TPS</option>
              <option value={50}>50 TPS</option>
              <option value={100}>100 TPS</option>
              <option value={250}>250 TPS</option>
            </select>
          </div>

          <div className="h-4 w-px bg-slate-300 hidden sm:block"></div>

          {/* Tombol Paginasi Atas */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={validCurrentPage === 1}
              className="h-7 px-2 text-xs"
              title="Halaman sebelumnya"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-0.5" />
              <span className="hidden sm:inline">Sebelumnya</span>
            </Button>

            <span className="font-semibold text-slate-800 px-1 text-[11px] sm:text-xs">
              Hal {validCurrentPage} / {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={validCurrentPage >= totalPages}
              className="h-7 px-2 text-xs"
              title="Halaman berikutnya"
            >
              <span className="hidden sm:inline">Berikutnya</span>
              <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tabel Utama */}
      <div className="overflow-x-auto min-h-[380px]">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-3 text-center w-12">No</th>
              <th className="py-3 px-3 min-w-[130px]">Kecamatan</th>
              <th className="py-3 px-3 min-w-[150px]">Desa / Kelurahan</th>
              <th className="py-3 px-3 text-center w-24">TPS</th>
              <th className="py-3 px-2 text-center min-w-[85px]">PPWP</th>
              <th className="py-3 px-2 text-center min-w-[85px]">DPR RI</th>
              <th className="py-3 px-2 text-center min-w-[85px]">DPD</th>
              <th className="py-3 px-2 text-center min-w-[95px]">DPRD Prov</th>
              <th className="py-3 px-2 text-center min-w-[95px]">DPRD Kab</th>
              <th className="py-3 px-3 text-center min-w-[105px]">Total File</th>
              <th className="py-3 px-3 text-center min-w-[120px]">Status</th>
              <th className="py-3 px-4 text-center min-w-[150px]">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {currentRecords.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-16 text-center text-slate-400">
                  <div className="max-w-xs mx-auto space-y-2">
                    <p className="font-semibold text-sm text-slate-600">
                      Tidak ada data TPS yang cocok
                    </p>
                    <p className="text-xs">
                      Coba sesuaikan filter atau kata kunci pencarian Anda.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              currentRecords.map((tps, idx) => {
                const globalIndex = startIndex + idx + 1;
                const isComplete = tps.isComplete;
                const isEmpty = tps.completedCount === 0;

                return (
                  <tr
                    key={tps.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      tps.hasAnomaly
                        ? 'bg-amber-50/30'
                        : isComplete
                        ? 'bg-white'
                        : isEmpty
                        ? 'bg-rose-50/20'
                        : 'bg-white'
                    }`}
                  >
                    {/* No */}
                    <td className="px-3 py-3 text-center font-medium text-slate-400">
                      {globalIndex}
                    </td>

                    {/* Kecamatan */}
                    <td className="px-3 py-3 font-semibold text-slate-900">
                      {tps.kecamatan}
                    </td>

                    {/* Desa */}
                    <td className="px-3 py-3 font-medium text-slate-800">
                      {tps.desa}
                    </td>

                    {/* TPS */}
                    <td className="px-3 py-3 text-center font-bold text-kpu-maroon">
                      <span className="px-2 py-0.5 rounded-md bg-red-50 border border-red-100 inline-block font-mono">
                        {tps.tpsFolderName}
                      </span>
                    </td>

                    {/* 5 Kolom Pemilihan */}
                    {renderElectionCell(tps.slotPPWP, 'Presiden (PPWP)', tps)}
                    {renderElectionCell(tps.slotDPR_RI, 'DPR RI', tps)}
                    {renderElectionCell(tps.slotDPD, 'DPD RI', tps)}
                    {renderElectionCell(tps.slotDPRD_PROV, 'DPRD Provinsi', tps)}
                    {renderElectionCell(tps.slotDPRD_KAB, 'DPRD Kab/Ko', tps)}

                    {/* Total File di Folder Drive */}
                    <td className="px-3 py-3 text-center">
                      <div
                        className="inline-flex flex-col items-center cursor-pointer hover:opacity-80 transition"
                        onClick={() => onOpenFileDetail(tps)}
                        title="Klik untuk melihat seluruh rincian file"
                      >
                        <span className="font-extrabold text-xs text-slate-800">
                          {tps.files.length} File
                        </span>
                        {tps.files.length > tps.completedCount ? (
                          <span
                            className="mt-0.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300"
                            title={`${tps.files.length - tps.completedCount} file di folder belum teridentifikasi (kemungkinan salah penamaan/typo)`}
                          >
                            ⚠️ {tps.files.length - tps.completedCount} salah nama
                          </span>
                        ) : tps.files.length === 0 ? (
                          <span className="text-[10px] text-slate-400 font-medium">
                            0 File
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-600 font-semibold">
                            ✓ {tps.completedCount} terdata
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-3 py-3 text-center">
                      {isComplete && !tps.hasAnomaly && (
                        <Badge
                          variant="gold"
                          className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold"
                          title="Seluruh 5 berkas lengkap dan valid"
                        >
                          ✓ Lengkap 5/5
                        </Badge>
                      )}
                      {isComplete && tps.hasAnomaly && (
                        <Badge
                          variant="orange"
                          className="bg-amber-100 text-amber-900 border-amber-400 font-bold"
                          title={`Lengkap 5 berkas, namun terdapat ${tps.anomalies.length} anomali penamaan/berkas ganda`}
                        >
                          ⚠️ 5/5 (Anomali)
                        </Badge>
                      )}
                      {!isComplete && !isEmpty && !tps.hasAnomaly && (
                        <Badge
                          variant="orange"
                          className="bg-orange-50 text-kpu-darkOrange border-orange-200 font-medium"
                          title={`Belum lengkap: kurang ${5 - tps.completedCount} berkas`}
                        >
                          Kurang {5 - tps.completedCount} File
                        </Badge>
                      )}
                      {!isComplete && !isEmpty && tps.hasAnomaly && (
                        <Badge
                          variant="orange"
                          className="bg-amber-100 text-amber-900 border-amber-400 font-bold"
                          title={`Kurang ${5 - tps.completedCount} berkas sah, dan ada ${tps.anomalies.length} berkas yang salah nama / typo`}
                        >
                          ⚠️ Kurang {5 - tps.completedCount} File (Anomali)
                        </Badge>
                      )}
                      {isEmpty && !tps.hasAnomaly && (
                        <Badge
                          variant="destructive"
                          className="bg-slate-100 text-slate-600 border-slate-200 font-medium"
                          title="Belum ada berkas scan yang diunggah"
                        >
                          Kosong 0/5
                        </Badge>
                      )}
                      {isEmpty && tps.hasAnomaly && (
                        <Badge
                          variant="destructive"
                          className="bg-amber-100 text-amber-900 border-amber-400 font-bold"
                          title="Folder kosong dari berkas sah, tetapi ada berkas dengan format salah"
                        >
                          ⚠️ Kosong (Anomali)
                        </Badge>
                      )}
                    </td>

                    {/* Aksi */}
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Tombol Lihat Berkas Detail */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onOpenFileDetail(tps)}
                          className="h-7 px-2.5 text-[11px] font-semibold border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                          title="Lihat rincian berkas & anomali nama"
                        >
                          <FileText className="h-3 w-3 mr-1 text-slate-500" />
                          <span>Detail</span>
                        </Button>

                        {/* Tombol Buka Folder Drive Langsung (Hanya tampil jika bukan mode preview) */}
                        {!isDemoMode && tps.tpsFolderUrl && (
                          <a
                            href={tps.tpsFolderUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center h-7 px-2.5 rounded-lg text-[11px] font-semibold bg-red-50 text-kpu-maroon border border-red-200/70 hover:bg-red-100 transition shadow-xs"
                            title="Buka folder TPS di Google Drive"
                          >
                            <FolderOpen className="h-3 w-3 mr-1 text-kpu-maroon" />
                            <span>Drive</span>
                            <ExternalLink className="h-2.5 w-2.5 ml-1 opacity-70" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Navigasi Halaman (Pagination) */}
      <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
        <div>
          Menampilkan baris <strong>{records.length > 0 ? startIndex + 1 : 0}</strong> -{' '}
          <strong>{Math.min(startIndex + pageSize, records.length)}</strong> dari total{' '}
          <strong>{records.length}</strong> TPS
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={validCurrentPage === 1}
            className="h-7 px-2 text-xs"
          >
            <ChevronLeft className="h-3.5 w-3.5 mr-1" />
            Sebelumnya
          </Button>

          <span className="font-semibold text-slate-800 px-2">
            Halaman {validCurrentPage} dari {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={validCurrentPage >= totalPages}
            className="h-7 px-2 text-xs"
          >
            Berikutnya
            <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
