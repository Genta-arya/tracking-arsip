import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Check,
  X,
  AlertTriangle,
  ExternalLink,
  FileText,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  TableProperties,
} from 'lucide-react';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { TPSRecord, ScannedFile } from '@/types';

interface TrackerMatrixProps {
  records: TPSRecord[];
  onOpenFileDetail: (record: TPSRecord) => void;
  isDemoMode?: boolean;
}

/**
 * Matriks Kelengkapan Berkas Scan C-Hasil 3D Command Deck
 * Mengubah tabel matriks menjadi tampilan berdimensi 3D dengan sel interaktif taktil,
 * status badge berbobot logam, dan navigasi halaman responsif.
 */
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

  // Helper untuk rendering sel 3D pemilihan (Dipepetkan agar tabel tidak kepanjangan)
  const renderElectionCell = (
    file: ScannedFile | null,
    label: string,
    tps: TPSRecord,
    borderSide?: 'left' | 'right'
  ) => {
    const borderClass =
      borderSide === 'left'
        ? 'border-l border-slate-200/80'
        : borderSide === 'right'
        ? 'border-r border-slate-200/80'
        : '';

    if (!file) {
      return (
        <td className={`px-0.5 py-2 text-center w-10 max-w-[44px] bg-slate-50/30 ${borderClass}`}>
          <motion.div
            whileHover={{ scale: 1.15, y: -1 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center justify-center h-6 w-6 rounded-lg bg-gradient-to-b from-rose-50 to-rose-100 text-rose-500 border border-rose-200/90 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06),0_1px_0_rgba(255,255,255,0.9)] cursor-pointer transition-all mx-auto"
            title={`${label}: BELUM ADA. Klik untuk lihat detail folder.`}
            onClick={() => onOpenFileDetail(tps)}
          >
            <X className="h-3.5 w-3.5 stroke-[2.5]" />
          </motion.div>
        </td>
      );
    }

    const hasFileAnomaly = (file.anomalies?.length ?? 0) > 0 && !file.isResolved;

    return (
      <td className={`px-0.5 py-2 text-center w-10 max-w-[44px] bg-slate-50/30 ${borderClass}`}>
        <motion.div
          whileHover={{ scale: 1.15, y: -1 }}
          whileTap={{ scale: 0.95 }}
          className={`inline-flex items-center justify-center h-6 w-6 rounded-lg cursor-pointer transition-all mx-auto ${
            hasFileAnomaly
              ? 'bg-gradient-to-b from-amber-400 via-amber-500 to-yellow-500 text-amber-950 border border-amber-300 shadow-[0_2px_6px_rgba(245,158,11,0.4),inset_0_1px_1px_rgba(255,255,255,0.7)] ring-1.5 ring-amber-400/40'
              : 'bg-gradient-to-b from-emerald-400 via-emerald-500 to-teal-600 text-white border border-emerald-300/90 shadow-[0_2px_6px_rgba(16,185,129,0.3),inset_0_1px_1px_rgba(255,255,255,0.7),inset_0_-1px_1px_rgba(0,0,0,0.15)]'
          }`}
          title={`${label}: ${file.name} ${
            hasFileAnomaly ? `(⚠️ ${file.anomalies[0].message})` : '(Lengkap & Terverifikasi)'
          }. Klik untuk detail.`}
          onClick={() => onOpenFileDetail(tps)}
        >
          {hasFileAnomaly ? (
            <AlertTriangle className="h-3 w-3 stroke-[2.5]" />
          ) : (
            <Check className="h-3.5 w-3.5 stroke-[2.5]" />
          )}
        </motion.div>
      </td>
    );
  };

  return (
    <div
      id="matriks-kelengkapan-section"
      className="relative bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-[0_16px_40px_-8px_rgba(0,0,0,0.07),0_4px_12px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col scroll-mt-6 select-none transition-all duration-300"
    >
      {/* Top 3D Specular Highlight Line */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none z-10" />

      {/* Header Tabel & Navigasi Halaman Atas 3D */}
      <div className="px-4 sm:px-6 py-3.5 border-b border-slate-200/80 bg-gradient-to-r from-slate-50/95 via-white/85 to-slate-50/95 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* 3D Floating Isometric Table Gem */}
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 text-amber-950 flex items-center justify-center shadow-[0_4px_10px_rgba(245,158,11,0.35),inset_0_1.5px_1px_rgba(255,255,255,0.7),inset_0_-2px_1px_rgba(180,83,9,0.3)] border border-amber-300 shrink-0">
            <TableProperties className="h-4.5 w-4.5 drop-shadow-xs" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-black text-sm sm:text-base text-slate-900 tracking-tight">
                Matriks Kelengkapan Berkas Scan C-Hasil
              </h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px] border border-slate-200 shadow-2xs">
                Total <AnimatedCounter value={records.length} /> TPS
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
              Klik pada sel ikon atau tombol aksi untuk melihat dokumen fisik scan di Google Drive
            </p>
          </div>
        </div>

        {/* Kontrol Navigasi Halaman Atas & Page Size */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end w-full sm:w-auto gap-2.5 sm:gap-3 text-xs text-slate-600">
          {/* Page size selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500 font-semibold hidden sm:inline">Per hal:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2.5 py-1 text-xs rounded-xl border border-slate-200 bg-white font-bold text-slate-800 shadow-[0_1.5px_3px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.9)] focus:outline-none focus:ring-2 focus:ring-kpu-maroon cursor-pointer"
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
            <motion.button
              whileHover={validCurrentPage > 1 ? { scale: 1.05 } : {}}
              whileTap={validCurrentPage > 1 ? { scale: 0.95, y: 1 } : {}}
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={validCurrentPage === 1}
              className="h-7 px-2.5 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center cursor-pointer"
              title="Halaman sebelumnya"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-0.5" />
              <span className="hidden sm:inline">Sebelumnya</span>
            </motion.button>

            <span className="font-extrabold text-slate-800 px-2 text-[11px] sm:text-xs">
              Hal {validCurrentPage} / {totalPages}
            </span>

            <motion.button
              whileHover={validCurrentPage < totalPages ? { scale: 1.05 } : {}}
              whileTap={validCurrentPage < totalPages ? { scale: 0.95, y: 1 } : {}}
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={validCurrentPage >= totalPages}
              className="h-7 px-2.5 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center cursor-pointer"
              title="Halaman berikutnya"
            >
              <span className="hidden sm:inline">Berikutnya</span>
              <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Tabel Utama 3D */}
      <div className="overflow-x-auto min-h-[380px]">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-gradient-to-r from-slate-100/95 via-slate-50 to-slate-100/95 border-b border-slate-200/90 text-slate-700 font-black uppercase tracking-wider text-[11px]">
              <th className="py-2.5 px-2 text-center w-10 text-[10px]">No</th>
              <th className="py-2.5 px-2.5 min-w-[105px] text-[10px]">Kecamatan</th>
              <th className="py-2.5 px-2.5 min-w-[115px] text-[10px]">Desa / Kelurahan</th>
              <th className="py-2.5 px-1.5 text-center w-18 text-[10px]">TPS</th>
              {/* 5 Kolom Tanda C-Hasil (Dipepetkan & Kompak) */}
              <th
                className="py-2 px-0.5 text-center w-10 min-w-[38px] max-w-[42px] border-l border-slate-200/80 bg-slate-100/60"
                title="Presiden dan Wakil Presiden (PPWP)"
              >
                <span className="text-[10px] font-black tracking-tight text-slate-800">PPWP</span>
              </th>
              <th
                className="py-2 px-0.5 text-center w-10 min-w-[38px] max-w-[42px] bg-slate-100/60"
                title="DPR Republik Indonesia (DPR RI)"
              >
                <div className="text-[10px] font-black leading-tight text-slate-800">
                  DPR
                  <span className="block text-[8px] font-bold text-slate-500">RI</span>
                </div>
              </th>
              <th
                className="py-2 px-0.5 text-center w-10 min-w-[38px] max-w-[42px] bg-slate-100/60"
                title="Dewan Perwakilan Daerah (DPD RI)"
              >
                <span className="text-[10px] font-black tracking-tight text-slate-800">DPD</span>
              </th>
              <th
                className="py-2 px-0.5 text-center w-10 min-w-[40px] max-w-[44px] bg-slate-100/60"
                title="DPRD Provinsi Kalimantan Barat"
              >
                <div className="text-[10px] font-black leading-tight text-slate-800">
                  DPRD
                  <span className="block text-[8px] font-bold text-slate-500">PROV</span>
                </div>
              </th>
              <th
                className="py-2 px-0.5 text-center w-10 min-w-[40px] max-w-[44px] border-r border-slate-200/80 bg-slate-100/60"
                title="DPRD Kabupaten Sekadau"
              >
                <div className="text-[10px] font-black leading-tight text-slate-800">
                  DPRD
                  <span className="block text-[8px] font-bold text-slate-500">KAB</span>
                </div>
              </th>
              <th className="py-2.5 px-2 text-center min-w-[85px] text-[10px]">Total File</th>
              <th className="py-2.5 px-2 text-center min-w-[110px] text-[10px]">Status</th>
              <th className="py-2.5 px-2 text-center min-w-[120px] text-[10px]">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/80 text-slate-700">
            {currentRecords.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-16 text-center text-slate-400">
                  <div className="max-w-xs mx-auto space-y-2">
                    <p className="font-extrabold text-sm text-slate-600">
                      Tidak ada data TPS yang cocok
                    </p>
                    <p className="text-xs">
                      Coba sesuaikan filter wilayah atau kata kunci pencarian Anda.
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
                  <motion.tr
                    key={tps.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15, delay: (idx % 25) * 0.015 }}
                    className={`hover:bg-gradient-to-r hover:from-amber-50/40 hover:via-white hover:to-amber-50/20 transition-all duration-150 ${
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
                    <td className="px-2 py-2 text-center font-bold text-slate-400 text-xs">
                      {globalIndex}
                    </td>

                    {/* Kecamatan */}
                    <td className="px-2.5 py-2 font-extrabold text-slate-900 text-xs">
                      {tps.kecamatan}
                    </td>

                    {/* Desa */}
                    <td className="px-2.5 py-2 font-bold text-slate-800 text-xs">
                      {tps.desa}
                    </td>

                    {/* TPS */}
                    <td className="px-1.5 py-2 text-center font-black text-kpu-maroon">
                      <span className="px-2 py-0.5 rounded-lg bg-gradient-to-b from-red-50 to-rose-100 border border-red-200 text-kpu-maroon shadow-2xs inline-block font-mono font-black text-xs">
                        {tps.tpsFolderName}
                      </span>
                    </td>

                    {/* 5 Kolom Pemilihan 3D Dipepetkan */}
                    {renderElectionCell(tps.slotPPWP, 'Presiden (PPWP)', tps, 'left')}
                    {renderElectionCell(tps.slotDPR_RI, 'DPR RI', tps)}
                    {renderElectionCell(tps.slotDPD, 'DPD RI', tps)}
                    {renderElectionCell(tps.slotDPRD_PROV, 'DPRD Provinsi', tps)}
                    {renderElectionCell(tps.slotDPRD_KAB, 'DPRD Kab/Ko', tps, 'right')}

                    {/* Total File di Folder Drive */}
                    <td className="px-2 py-2 text-center">
                      <div
                        className="inline-flex flex-col items-center cursor-pointer hover:opacity-85 transition"
                        onClick={() => onOpenFileDetail(tps)}
                        title="Klik untuk melihat seluruh rincian file"
                      >
                        <span className="font-black text-xs text-slate-900">
                          {tps.files.length} File
                        </span>
                        {tps.files.length > tps.completedCount ? (
                          <span
                            className="mt-0.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9.5px] font-black bg-gradient-to-b from-amber-100 to-amber-200 text-amber-950 border border-amber-300 shadow-2xs whitespace-nowrap"
                            title={`${tps.files.length - tps.completedCount} file di folder belum teridentifikasi (kemungkinan salah penamaan/typo)`}
                          >
                            ⚠️ {tps.files.length - tps.completedCount} salah
                          </span>
                        ) : tps.files.length === 0 ? (
                          <span className="text-[10px] text-slate-400 font-semibold">
                            0 File
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-700 font-bold">
                            ✓ {tps.completedCount} terdata
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status Badge 3D */}
                    <td className="px-2 py-2 text-center">
                      {isComplete && !tps.hasAnomaly && (
                        <span
                          className="inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-gradient-to-b from-emerald-50 via-emerald-100 to-emerald-200 text-emerald-950 border border-emerald-300 shadow-2xs whitespace-nowrap"
                          title="Seluruh 5 berkas lengkap dan valid"
                        >
                          ✓ Lengkap 5/5
                        </span>
                      )}
                      {isComplete && tps.hasAnomaly && (
                        <span
                          className="inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-gradient-to-b from-amber-50 via-amber-100 to-amber-200 text-amber-950 border border-amber-300 shadow-2xs whitespace-nowrap"
                          title={`Lengkap 5 berkas, namun terdapat ${tps.anomalies.length} anomali penamaan/berkas ganda`}
                        >
                          ⚠️ 5/5 (Anomali)
                        </span>
                      )}
                      {!isComplete && !isEmpty && !tps.hasAnomaly && (
                        <span
                          className="inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-gradient-to-b from-orange-50 via-orange-100 to-orange-200 text-orange-950 border border-orange-300 shadow-2xs whitespace-nowrap"
                          title={`Belum lengkap: kurang ${5 - tps.completedCount} berkas`}
                        >
                          Kurang {5 - tps.completedCount} File
                        </span>
                      )}
                      {!isComplete && !isEmpty && tps.hasAnomaly && (
                        <span
                          className="inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-gradient-to-b from-amber-50 via-amber-100 to-amber-200 text-amber-950 border border-amber-300 shadow-2xs whitespace-nowrap"
                          title={`Kurang ${5 - tps.completedCount} berkas sah, dan ada ${tps.anomalies.length} berkas yang salah nama / typo`}
                        >
                          ⚠️ Kurang {5 - tps.completedCount}
                        </span>
                      )}
                      {isEmpty && !tps.hasAnomaly && (
                        <span
                          className="inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-gradient-to-b from-slate-100 to-slate-200 text-slate-600 border border-slate-300 shadow-2xs whitespace-nowrap"
                          title="Belum ada berkas scan yang diunggah"
                        >
                          Kosong 0/5
                        </span>
                      )}
                      {isEmpty && tps.hasAnomaly && (
                        <span
                          className="inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-gradient-to-b from-amber-50 via-amber-100 to-amber-200 text-amber-950 border border-amber-300 shadow-2xs whitespace-nowrap"
                          title="Folder kosong dari berkas sah, tetapi ada berkas dengan format salah"
                        >
                          ⚠️ Kosong (Anomali)
                        </span>
                      )}
                    </td>

                    {/* Aksi 3D */}
                    <td className="px-2 py-2 text-center">
                      <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                        {/* Tombol Lihat Berkas Detail (Tactile 3D) */}
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95, y: 1 }}
                          type="button"
                          onClick={() => onOpenFileDetail(tps)}
                          className="h-6.5 px-2.5 text-[10.5px] font-black rounded-lg border border-slate-300/90 bg-gradient-to-b from-white via-slate-50 to-slate-150 text-slate-800 shadow-[0_1.5px_0_#cbd5e1,0_1.5px_3px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] active:translate-y-[1px] active:shadow-none hover:border-kpu-maroon hover:text-kpu-maroon transition-all flex items-center justify-center gap-1 cursor-pointer"
                          title="Lihat rincian berkas & anomali nama"
                        >
                          <FileText className="h-3 w-3 text-slate-500" />
                          <span>Detail</span>
                        </motion.button>

                        {/* Tombol Buka Folder Drive Langsung */}
                        {!isDemoMode && tps.tpsFolderUrl && (
                          <motion.a
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95, y: 1 }}
                            href={tps.tpsFolderUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center h-6.5 px-2.5 rounded-lg text-[10.5px] font-black bg-gradient-to-b from-kpu-maroon via-red-900 to-red-950 text-white border border-red-800 shadow-[0_1.5px_0_#4a0200,0_1.5px_4px_rgba(102,3,0,0.3),inset_0_1px_0_rgba(255,255,255,0.3)] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                            title="Buka folder TPS di Google Drive"
                          >
                            <FolderOpen className="h-3 w-3 mr-1 text-amber-300" />
                            <span>Drive</span>
                            <ExternalLink className="h-2.5 w-2.5 ml-1 opacity-80" />
                          </motion.a>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Navigasi Halaman (Pagination 3D) */}
      <div className="px-5 py-3.5 border-t border-slate-200/80 bg-gradient-to-r from-slate-50/95 via-white/85 to-slate-50/95 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
        <div className="font-medium text-slate-600">
          Menampilkan baris <strong>{records.length > 0 ? startIndex + 1 : 0}</strong> -{' '}
          <strong>{Math.min(startIndex + pageSize, records.length)}</strong> dari total{' '}
          <strong className="text-slate-900">{records.length}</strong> TPS
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            whileHover={validCurrentPage > 1 ? { scale: 1.05 } : {}}
            whileTap={validCurrentPage > 1 ? { scale: 0.95, y: 1 } : {}}
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={validCurrentPage === 1}
            className="h-8 px-3 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center cursor-pointer"
          >
            <ChevronLeft className="h-3.5 w-3.5 mr-1" />
            Sebelumnya
          </motion.button>

          <span className="font-extrabold text-slate-800 px-2.5 text-xs">
            Halaman {validCurrentPage} dari {totalPages}
          </span>

          <motion.button
            whileHover={validCurrentPage < totalPages ? { scale: 1.05 } : {}}
            whileTap={validCurrentPage < totalPages ? { scale: 0.95, y: 1 } : {}}
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={validCurrentPage >= totalPages}
            className="h-8 px-3 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center cursor-pointer"
          >
            Berikutnya
            <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
