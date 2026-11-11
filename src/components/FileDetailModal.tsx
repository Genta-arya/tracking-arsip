import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ExternalLink,
  AlertTriangle,
  FolderOpen,
  CheckCircle2,
  XCircle,
  FileText,
  Wrench,
  Save,
  Check,
  User,
  Clock,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TPSRecord, ELECTION_LIST, ElectionType, ScannedFile, OverrideElectionType } from '@/types';
import { updateFileAnomalyStatus } from '@/services/firebase';

interface FileDetailModalProps {
  record: TPSRecord | null;
  open: boolean;
  onClose: () => void;
  isDemoMode?: boolean;
  currentUserEmail?: string | null;
  initialFileId?: string | null;
  onUpdateFileStatus?: (params: {
    kecamatan: string;
    tpsFolderId: string;
    fileId: string;
    overrideElection?: OverrideElectionType;
    isResolved: boolean;
    resolutionNote?: string;
  }) => Promise<void>;
}

// Konfigurasi tema warna 3D untuk 5 jenis surat suara resmi
const BALLOT_THEMES: Record<
  ElectionType,
  {
    badgeClass: string;
    spineColor: string;
  }
> = {
  PPWP: {
    badgeClass:
      'bg-gradient-to-b from-rose-600 via-red-700 to-rose-900 text-white shadow-[0_2px_4px_rgba(190,18,60,0.3)] border border-rose-500',
    spineColor: 'border-l-rose-600',
  },
  DPR_RI: {
    badgeClass:
      'bg-gradient-to-b from-amber-400 via-yellow-500 to-amber-700 text-amber-950 font-black shadow-[0_2px_4px_rgba(217,119,6,0.3)] border border-amber-300',
    spineColor: 'border-l-amber-500',
  },
  DPD: {
    badgeClass:
      'bg-gradient-to-b from-red-500 via-rose-600 to-red-800 text-white shadow-[0_2px_4px_rgba(220,38,38,0.3)] border border-red-400',
    spineColor: 'border-l-red-500',
  },
  DPRD_PROV: {
    badgeClass:
      'bg-gradient-to-b from-blue-500 via-blue-600 to-indigo-800 text-white shadow-[0_2px_4px_rgba(37,99,235,0.3)] border border-blue-400',
    spineColor: 'border-l-blue-500',
  },
  DPRD_KAB: {
    badgeClass:
      'bg-gradient-to-b from-emerald-500 via-emerald-600 to-teal-800 text-white shadow-[0_2px_4px_rgba(16,185,129,0.3)] border border-emerald-400',
    spineColor: 'border-l-emerald-500',
  },
};

/**
 * FileDetailModal 3D Tactical Dossier
 * Modal rincian berkas TPS dengan depth 3D fisik, kartu 5 slot pemilihan interaktif,
 * dan tombol kontrol taktil berbobot.
 */
export function FileDetailModal({
  record: propRecord,
  open,
  onClose,
  isDemoMode = false,
  currentUserEmail = null,
  initialFileId = null,
  onUpdateFileStatus,
}: FileDetailModalProps) {
  // Simpan record terakhir untuk mendukung animasi keluar (exit animation) AnimatePresence
  const lastRecordRef = useRef<TPSRecord | null>(null);
  if (propRecord) {
    lastRecordRef.current = propRecord;
  }
  const record = propRecord || lastRecordRef.current;

  const isAdminTeknis = currentUserEmail?.toLowerCase() === 'teknis.kpusekadau@gmail.com';
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [selectedElection, setSelectedElection] = useState<string>('PPWP');
  const [resolutionNote, setResolutionNote] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);

  const handleStartEdit = (file: ScannedFile) => {
    if (editingFileId === file.id) {
      setEditingFileId(null);
      return;
    }
    setEditingFileId(file.id);
    setSelectedElection(
      (file.overrideElection && file.overrideElection !== 'SUDAH_DIBENARKAN'
        ? file.overrideElection
        : file.detectedElection !== 'UNKNOWN' ? file.detectedElection : '')
    );
    setResolutionNote(
      file.resolutionNote ||
      (file.overrideElection === 'SUDAH_DIBENARKAN'
        ? 'Sudah dibenarkan di Google Drive (Menunggu Sync Ulang)'
        : file.overrideElection === 'HAPUS'
        ? 'Berkas dihapus / dipindahkan dari folder ini (anomali sudah difix)'
        : 'Sudah diperbaiki / sesuai')
    );
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);
  };

  // Otomatis buka form edit jika diarahkan langsung dari tabel anomali dengan initialFileId
  useEffect(() => {
    if (open && initialFileId && record) {
      const targetFile = record.files.find((f) => f.id === initialFileId);
      if (targetFile) {
        handleStartEdit(targetFile);
      }
    }
  }, [open, initialFileId, record?.id]);

  if (!record) return null;

  const handleSaveStatus = async (file: ScannedFile) => {
    setIsSaving(true);
    setSaveErrorMsg(null);
    setSaveSuccessMsg(null);

    try {
      if (!['PPWP', 'DPR_RI', 'DPD', 'DPRD_PROV', 'DPRD_KAB', 'HAPUS', 'RESET'].includes(selectedElection)) {
        throw new Error('Pilih jenis pemilihan agar berkas yang dikoreksi tercentang di tabel.');
      }
      const isReset = selectedElection === 'RESET';
      const isHapus = selectedElection === 'HAPUS';

      const targetOverride: OverrideElectionType | undefined = isReset
        ? undefined
        : isHapus
        ? 'HAPUS'
        : (selectedElection as OverrideElectionType);

      // Selalu tandai isResolved = true saat admin mengoreksi (kecuali tombol Reset) agar anomali langsung tuntas
      const targetIsResolved = isReset ? false : true;
      const targetNote = isReset
        ? undefined
        : isHapus
        ? resolutionNote || 'Berkas dihapus / dipindahkan dari folder ini (anomali sudah difix)'
        : resolutionNote || 'Sudah dikoreksi & divalidasi oleh Admin Teknis';

      const params = {
        kecamatan: record.kecamatan,
        tpsFolderId: record.tpsFolderId,
        fileId: file.id,
        overrideElection: targetOverride,
        isResolved: targetIsResolved,
        resolutionNote: targetNote,
      };

      if (onUpdateFileStatus) {
        await onUpdateFileStatus(params);
      } else {
        await updateFileAnomalyStatus(params);
      }

      setSaveSuccessMsg(
        isHapus
          ? 'Berkas ditandai "Hapus / Dipindahkan". Berkas hilang dari folder & anomali selesai!'
          : 'Koreksi berhasil disimpan! Anomali langsung tuntas & bersih.'
      );
      setTimeout(() => {
        setEditingFileId(null);
        setSaveSuccessMsg(null);
      }, 1600);
    } catch (err: any) {
      console.error('Gagal update anomali:', err);
      setSaveErrorMsg(err.message || 'Terjadi kesalahan saat menyimpan.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickDelete = async (file: ScannedFile) => {
    if (
      !confirm(
        `Tandai berkas "${file.name}" sebagai Hapus / Sudah Dipindahkan dari ${record.tpsFolderName}?\n\nBerkas ini akan hilang dari folder TPS ini dan anomali dinyatakan selesai/fix.`
      )
    ) {
      return;
    }
    setIsSaving(true);
    setSaveErrorMsg(null);
    setSaveSuccessMsg(null);

    try {
      const params = {
        kecamatan: record.kecamatan,
        tpsFolderId: record.tpsFolderId,
        fileId: file.id,
        overrideElection: 'HAPUS' as OverrideElectionType,
        isResolved: true,
        resolutionNote: 'Berkas dihapus / dipindahkan dari folder ini (anomali sudah difix)',
      };

      if (onUpdateFileStatus) {
        await onUpdateFileStatus(params);
      } else {
        await updateFileAnomalyStatus(params);
      }

      setSaveSuccessMsg('Berkas berhasil ditandai Hapus / Dipindahkan!');
      setTimeout(() => {
        setEditingFileId(null);
        setSaveSuccessMsg(null);
      }, 1500);
    } catch (err: any) {
      console.error('Gagal menghapus berkas:', err);
      setSaveErrorMsg(err.message || 'Terjadi kesalahan saat menghapus berkas.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestoreFile = async (file: ScannedFile) => {
    setIsSaving(true);
    setSaveErrorMsg(null);
    setSaveSuccessMsg(null);

    try {
      const params = {
        kecamatan: record.kecamatan,
        tpsFolderId: record.tpsFolderId,
        fileId: file.id,
        overrideElection: undefined,
        isResolved: false,
        resolutionNote: undefined,
      };

      if (onUpdateFileStatus) {
        await onUpdateFileStatus(params);
      } else {
        await updateFileAnomalyStatus(params);
      }

      setSaveSuccessMsg('Berkas berhasil dipulihkan kembali ke folder TPS!');
      setTimeout(() => {
        setSaveSuccessMsg(null);
      }, 1500);
    } catch (err: any) {
      console.error('Gagal memulihkan berkas:', err);
      setSaveErrorMsg(err.message || 'Terjadi kesalahan saat memulihkan berkas.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5),0_10px_20px_rgba(0,0,0,0.2)] bg-white select-none">
        {/* Top 3D Specular Highlight Line */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none z-30" />

        {/* Header Modal 3D Command Chassis */}
        <div className="relative bg-gradient-to-b from-[#5c0604] via-[#480503] to-[#360302] text-white p-4 sm:p-5 pr-10 border-b border-black/50 shadow-[0_8px_20px_rgba(0,0,0,0.35)] overflow-hidden">
          {/* Ambient Top Glow */}
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3">
              {/* 3D Floating Acrylic Folder Tile */}
              <div className="h-11 w-11 shrink-0 rounded-2xl bg-gradient-to-b from-white via-slate-50 to-slate-100 p-1.5 flex items-center justify-center border border-white/90 shadow-[0_4px_12px_rgba(0,0,0,0.3),inset_0_1.5px_1px_rgba(255,255,255,1),inset_0_-1.5px_1px_rgba(0,0,0,0.1)]">
                <FolderOpen className="h-5 w-5 text-kpu-maroon" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* 3D Gold Pill Badge TPS */}
                  <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 text-amber-950 font-black text-xs shadow-[0_2px_4px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.7)] border border-amber-200">
                    {record.tpsFolderName}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-rose-100">
                    Desa {record.desa}
                  </span>
                </div>
                <DialogTitle className="text-base sm:text-lg font-black text-white tracking-tight mt-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                  Rincian Berkas C-Hasil TPS
                </DialogTitle>
                <p className="text-[11px] text-rose-200/90 font-medium">
                  Kecamatan {record.kecamatan} • KPU Kabupaten Sekadau
                </p>
              </div>
            </div>

            {/* Kelengkapan 3D Badge */}
            <div className="self-start sm:self-auto sm:text-right shrink-0">
              {record.isComplete && !record.hasAnomaly ? (
                <span className="inline-block px-3 py-1 rounded-xl text-xs font-black bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-[0_3px_8px_rgba(16,185,129,0.35),inset_0_1px_0_rgba(255,255,255,0.5)] border border-emerald-300">
                  ✓ Lengkap 5/5
                </span>
              ) : record.isComplete && record.hasAnomaly ? (
                <span className="inline-block px-3 py-1 rounded-xl text-xs font-black bg-gradient-to-b from-amber-400 to-yellow-500 text-amber-950 shadow-[0_3px_8px_rgba(245,158,11,0.35),inset_0_1px_0_rgba(255,255,255,0.7)] border border-amber-300">
                  ⚠️ 5/5 (Ada Anomali)
                </span>
              ) : record.hasAnomaly ? (
                <span className="inline-block px-3 py-1 rounded-xl text-xs font-black bg-gradient-to-b from-amber-400 to-yellow-500 text-amber-950 shadow-[0_3px_8px_rgba(245,158,11,0.35),inset_0_1px_0_rgba(255,255,255,0.7)] border border-amber-300">
                  ⚠️ Kurang {5 - record.completedCount} Berkas (Anomali)
                </span>
              ) : (
                <span className="inline-block px-3 py-1 rounded-xl text-xs font-black bg-gradient-to-b from-orange-500 to-red-600 text-white shadow-[0_3px_8px_rgba(234,88,12,0.35),inset_0_1px_0_rgba(255,255,255,0.4)] border border-orange-400">
                  Kurang {5 - record.completedCount} Berkas
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Isi Modal 3D: Daftar 5 Pemilihan */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Anomali Global TPS jika ada */}
          {record.hasAnomaly && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 border border-amber-300 text-amber-950 text-xs space-y-1.5 shadow-[0_4px_12px_rgba(245,158,11,0.1),inset_0_1px_0_rgba(255,255,255,0.9)]">
              <div className="flex items-center gap-2 font-black text-amber-900">
                <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0" />
                <span>Peringatan Anomali Pada Folder TPS Ini:</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-slate-800 font-medium">
                {record.anomalies.map((anom, i) => (
                  <li key={i}>
                    <strong className="text-amber-950 font-bold">{anom.fileName}</strong>: {anom.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Checklist 5 Slot Pemilihan 3D */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <span>Status 5 Kategori Pemilihan Pemilu 2024</span>
            </h4>

            {ELECTION_LIST.map((elec) => {
              let file = null;
              if (elec.key === 'PPWP') file = record.slotPPWP;
              if (elec.key === 'DPR_RI') file = record.slotDPR_RI;
              if (elec.key === 'DPD') file = record.slotDPD;
              if (elec.key === 'DPRD_PROV') file = record.slotDPRD_PROV;
              if (elec.key === 'DPRD_KAB') file = record.slotDPRD_KAB;

              const isFound = !!file;
              const hasAnomaly = file && file.anomalies.length > 0;
              const ballotTheme = BALLOT_THEMES[elec.key] || BALLOT_THEMES.PPWP;

              return (
                <motion.div
                  key={elec.key}
                  whileHover={{ y: -2, scale: 1.008 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className={`p-3.5 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_3px_10px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.9)] ${
                    isFound
                      ? hasAnomaly
                        ? 'border-amber-300 border-l-[5px] border-l-amber-500 bg-gradient-to-r from-amber-50/70 via-white to-amber-50/40 ring-1 ring-amber-300'
                        : `border-slate-200/90 border-l-[5px] ${ballotTheme.spineColor} bg-white hover:border-slate-300`
                      : 'border-rose-200/90 border-l-[5px] border-l-rose-500 bg-gradient-to-r from-rose-50/40 via-white to-rose-50/20'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    {/* 3D Indicator Gem */}
                    <div className="mt-0.5 shrink-0">
                      {isFound ? (
                        hasAnomaly ? (
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-b from-amber-400 to-yellow-500 text-amber-950 flex items-center justify-center shadow-[0_3px_8px_rgba(245,158,11,0.4),inset_0_1px_1px_rgba(255,255,255,0.7)] border border-amber-300 animate-pulse">
                            <AlertTriangle className="h-4.5 w-4.5 stroke-[2.5]" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 text-white flex items-center justify-center shadow-[0_3px_8px_rgba(16,185,129,0.35),inset_0_1px_1px_rgba(255,255,255,0.7)] border border-emerald-300">
                            <CheckCircle2 className="h-4.5 w-4.5 stroke-[2.5]" />
                          </div>
                        )
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-b from-rose-50 to-rose-100 text-rose-500 flex items-center justify-center shadow-[inset_0_1.5px_2px_rgba(0,0,0,0.08)] border border-rose-200">
                          <XCircle className="h-4.5 w-4.5 stroke-[2.5]" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs sm:text-sm text-slate-900 tracking-tight">
                          {elec.label}
                        </span>
                        <span
                          className={`text-[9.5px] px-2 py-0.5 rounded-md font-black tracking-wide ${ballotTheme.badgeClass}`}
                        >
                          {elec.code}
                        </span>
                      </div>

                      {isFound ? (
                        <div className="mt-1 space-y-0.5">
                          <p className="text-xs font-semibold text-slate-700 truncate max-w-sm sm:max-w-md">
                            📄 {file?.name}
                          </p>
                          {hasAnomaly && (
                            <p className="text-[11px] text-amber-900 font-bold">
                              ⚠️ {file?.anomalies[0].message}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-rose-600 font-semibold mt-0.5">
                          Berkas scan belum ditemukan di folder Google Drive.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Tombol Aksi Preview Berkas 3D */}
                  {isFound && file?.url && !isDemoMode && (
                    <div className="shrink-0 flex items-center gap-1.5 self-end sm:self-center">
                      <motion.a
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96, y: 1 }}
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-b from-white via-slate-50 to-slate-100 text-slate-800 hover:text-kpu-maroon border border-slate-300 shadow-[0_2px_0_#cbd5e1,0_2px_4px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                        title="Lihat berkas di Google Drive"
                      >
                        <FileText className="h-3.5 w-3.5 text-slate-600" />
                        <span>Preview Berkas</span>
                        <ExternalLink className="h-3 w-3 text-slate-400" />
                      </motion.a>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Seluruh Berkas Terdeteksi (termasuk file extra / unrecognized) */}
          {(() => {
            const activeFiles = record.files.filter((f) => f.overrideElection !== 'HAPUS');
            const deletedFiles = record.files.filter((f) => f.overrideElection === 'HAPUS');

            return (
              <div className="pt-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                  Daftar Seluruh File di Folder ({activeFiles.length} Berkas Aktif):
                </h4>
                <div className="space-y-2">
                  {activeFiles.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                      {deletedFiles.length > 0
                        ? 'Seluruh berkas di folder ini telah ditandai dihapus/dipindahkan.'
                        : 'Folder Google Drive ini masih kosong (0 file).'}
                    </div>
                  ) : (
                    activeFiles.map((file) => {
                      const isSudahDibenarkan = file.overrideElection === 'SUDAH_DIBENARKAN';
                      const isFileAnomaly =
                        file.detectedElection === 'UNKNOWN' ||
                        (file.anomalies && file.anomalies.length > 0 && !file.isResolved);

                  return (
                    <div
                      key={file.id}
                      className={`p-3.5 rounded-2xl border flex flex-col gap-2.5 text-xs transition shadow-[0_2px_6px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.9)] ${
                        file.isResolved
                          ? 'border-emerald-200 bg-emerald-50/50'
                          : isSudahDibenarkan
                          ? 'border-amber-400 border-l-[5px] border-l-amber-500 bg-amber-50/90 shadow-2xs ring-1 ring-amber-400/40'
                          : isFileAnomaly
                          ? 'border-amber-300 border-l-[5px] border-l-amber-500 bg-amber-50/90 shadow-2xs ring-1 ring-amber-400/40'
                          : 'border-slate-200 bg-white hover:bg-slate-50/80'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 w-full">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="mt-0.5 shrink-0">
                            {file.isResolved ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            ) : isSudahDibenarkan ? (
                              <Clock className="h-4 w-4 text-amber-600 animate-pulse" />
                            ) : isFileAnomaly ? (
                              <AlertTriangle className="h-4 w-4 text-amber-600" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p
                                className={`font-bold break-all text-xs ${
                                  isFileAnomaly && !file.isResolved ? 'text-amber-950 font-black' : 'text-slate-800'
                                }`}
                              >
                                {file.name}
                              </p>
                              {file.isResolved ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  ✓ Terverifikasi ({file.detectedElection})
                                </span>
                              ) : isSudahDibenarkan ? (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-200 text-amber-950 border border-amber-400 shadow-2xs">
                                  ⏳ Sudah Dibenarkan (Menunggu Sync Ulang)
                                </span>
                              ) : isFileAnomaly && (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-200 text-amber-950 border border-amber-300">
                                  ⚠️ Perlu Perhatian (Anomali)
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap text-[11px]">
                              <span className="text-slate-500 text-[10px] sm:text-[11px]">
                                Kategori:{' '}
                                <strong
                                  className={
                                    file.detectedElection === 'UNKNOWN'
                                      ? 'text-rose-600 font-bold'
                                      : 'text-slate-800'
                                  }
                                >
                                  {file.detectedElection === 'UNKNOWN'
                                    ? 'UNKNOWN (Format Tidak Dikenali)'
                                    : file.detectedElection}
                                </strong>
                              </span>

                              {/* Info Pengunggah di Google Drive */}
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                                  file.uploader
                                    ? 'bg-amber-50 text-amber-950 border-amber-200'
                                    : 'bg-slate-100 text-slate-500 border-slate-200'
                                }`}
                                title="Akun Google yang mengunggah / memiliki file di Google Drive"
                              >
                                <User className="h-3 w-3 text-slate-400" />
                                <span>
                                  Pengunggah:{' '}
                                  <strong className={file.uploader ? 'text-amber-950 font-bold' : 'text-slate-500 font-normal'}>
                                    {file.uploader || 'Belum tersinkron (Pindai Ulang Drive)'}
                                  </strong>
                                </span>
                              </span>

                              {/* Waktu Upload / Update di Drive */}
                              {(file.createdAt || file.updatedAt) && (
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium text-[10px] border border-slate-200"
                                  title="Waktu file diupload / diperbarui di Google Drive"
                                >
                                  <Clock className="h-3 w-3 text-slate-400" />
                                  <span>
                                    {new Date(file.createdAt || file.updatedAt!).toLocaleDateString('id-ID', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                </span>
                              )}
                            </div>

                            {/* Info perbaikan jika sudah diselesaikan */}
                            {file.isResolved && file.resolutionNote && (
                              <p className="text-[10px] text-emerald-700 font-medium mt-0.5">
                                Catatan: {file.resolutionNote}{' '}
                                {file.resolvedBy && (
                                  <span className="text-slate-500 font-normal">
                                    • oleh {file.resolvedBy}
                                  </span>
                                )}
                              </p>
                            )}

                            {/* Info status jika sudah dibenarkan tapi menunggu sync */}
                            {isSudahDibenarkan && (
                              <div className="mt-1.5 p-2 rounded-xl bg-amber-100/80 border border-amber-300 text-[11px] text-amber-950 shadow-2xs">
                                <p className="font-extrabold flex items-center gap-1 text-amber-950">
                                  <span>⏳</span>
                                  <span>Status: Sudah Dibenarkan di Google Drive</span>
                                </p>
                                <p className="text-[10px] text-amber-900 mt-0.5 leading-snug">
                                  {file.resolutionNote || 'Sudah dibenarkan di Drive (Data ganda / salah kamar).'}{' '}
                                  <span className="font-bold underline">
                                    Tetap tercatat sebagai anomali sampai proses Sinkronkan Google Drive dijalankan.
                                  </span>
                                </p>
                              </div>
                            )}

                            {/* Detail pesan anomali jika belum diselesaikan */}
                            {!file.isResolved &&
                              file.anomalies &&
                              file.anomalies.length > 0 && (
                                <div className="mt-1 space-y-0.5">
                                  {file.anomalies.map((anom, idx) => (
                                    <p
                                      key={idx}
                                      className="text-[11px] text-amber-900 font-bold"
                                    >
                                      ⚠️ {anom.message}
                                    </p>
                                  ))}
                                </div>
                              )}
                          </div>
                        </div>

                        {/* Tombol Aksi Kanan: Buka & Perbarui Status 3D */}
                        <div className="shrink-0 flex items-center gap-1.5 self-end sm:self-center">
                          {!isDemoMode && isAdminTeknis && (
                            <motion.button
                              whileHover={{ scale: 1.04 }}
                              whileTap={{ scale: 0.96, y: 1 }}
                              type="button"
                              onClick={() => handleStartEdit(file)}
                              className={`h-7 px-3 text-[11px] font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-1 shadow-2xs ${
                                editingFileId === file.id
                                  ? 'bg-amber-100 border-amber-400 text-amber-950'
                                  : 'text-slate-700 border-slate-300 bg-white hover:border-kpu-maroon hover:text-kpu-maroon'
                              }`}
                              title="Khusus Admin Teknis: Perbarui atau tetapkan status jenis pemilihan"
                            >
                              <Wrench className="h-3 w-3" />
                              <span>
                                {isSudahDibenarkan
                                  ? 'Edit Koreksi'
                                  : file.isResolved
                                  ? 'Edit Status'
                                  : 'Perbarui Status'}
                              </span>
                            </motion.button>
                          )}

                          {/* Tombol Cepat Hapus / Sudah Dipindahkan */}
                          {!isDemoMode && isAdminTeknis && (
                            <motion.button
                              whileHover={{ scale: 1.04 }}
                              whileTap={{ scale: 0.96, y: 1 }}
                              type="button"
                              onClick={() => handleQuickDelete(file)}
                              className="h-7 px-2.5 text-[11px] font-bold rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                              title="Tandai berkas ini sudah dipindahkan / hapus dari folder TPS ini (anomali fix)"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span>Hapus</span>
                            </motion.button>
                          )}

                          {file.url && !isDemoMode && (
                            <motion.a
                              whileHover={{ scale: 1.04 }}
                              whileTap={{ scale: 0.96, y: 1 }}
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`text-xs font-black shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition cursor-pointer ${
                                isFileAnomaly && !file.isResolved
                                  ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-amber-950 border border-amber-400 shadow-[0_2px_0_#b45309]'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 shadow-2xs'
                              }`}
                            >
                              <span>Buka</span>
                              <ExternalLink className="h-3 w-3" />
                            </motion.a>
                          )}
                        </div>
                      </div>

                      {/* Panel Form Inline Edit Status 3D dengan AnimatePresence */}
                      <AnimatePresence>
                        {editingFileId === file.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0, y: -6 }}
                            animate={{ opacity: 1, height: 'auto', y: 0 }}
                            exit={{ opacity: 0, height: 0, y: -6 }}
                            transition={{ duration: 0.22, ease: 'easeOut' }}
                            className="mt-2 pt-2.5 border-t border-slate-200 space-y-2 bg-gradient-to-b from-slate-50 to-slate-100/80 p-3 rounded-xl border border-slate-200 shadow-inner overflow-hidden"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[11px] text-slate-800">
                                🛠️ Tetapkan Kategori Pemilihan / Perbaiki Status Berkas:
                              </span>
                              {saveSuccessMsg && (
                                <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                                  <Check className="h-3.5 w-3.5" />
                                  {saveSuccessMsg}
                                </span>
                              )}
                              {saveErrorMsg && (
                                <span className="text-[11px] font-bold text-rose-600">
                                  {saveErrorMsg}
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                  Kategori Jenis Pemilihan:
                                </label>
                                <select
                                  value={selectedElection}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setSelectedElection(val);
                                    if (
                                      val === 'SUDAH_DIBENARKAN' &&
                                      (!resolutionNote || resolutionNote === 'Sudah diperbaiki / sesuai')
                                    ) {
                                      setResolutionNote('Sudah dibenarkan di Google Drive (Menunggu Sync Ulang)');
                                    }
                                  }}
                                  className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 shadow-[0_1.5px_3px_rgba(0,0,0,0.04)] focus:ring-2 focus:ring-kpu-maroon focus:outline-none"
                                >
                                  <option value="" disabled>Pilih jenis pemilihan untuk mencentang tabel</option>
                                  <option value="HAPUS">
                                    🗑️ Hapus Berkas / Sudah Dipindahkan (Selesaikan & Sembunyikan)
                                  </option>
                                  <option value="PPWP">1. Presiden & Wakil Presiden (PPWP)</option>
                                  <option value="DPR_RI">2. DPR Republik Indonesia (DPR RI)</option>
                                  <option value="DPD">3. DPD Republik Indonesia (DPD)</option>
                                  <option value="DPRD_PROV">4. DPRD Provinsi Kalimantan Barat</option>
                                  <option value="DPRD_KAB">5. DPRD Kabupaten Sekadau</option>
                                  <option value="RESET">🔄 Kembalikan ke Semula (Reset)</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                  Catatan Perbaikan:
                                </label>
                                <input
                                  type="text"
                                  value={resolutionNote}
                                  onChange={(e) => setResolutionNote(e.target.value)}
                                  placeholder="Misal: Sudah dibenarkan di Drive"
                                  className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white text-slate-800 shadow-[0_1.5px_3px_rgba(0,0,0,0.04)] focus:ring-2 focus:ring-kpu-maroon focus:outline-none"
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingFileId(null)}
                                disabled={isSaving}
                                className="h-7 text-xs cursor-pointer rounded-lg"
                              >
                                Batal
                              </Button>
                              <motion.button
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.96, y: 1 }}
                                type="button"
                                onClick={() => handleSaveStatus(file)}
                                disabled={isSaving}
                                className="h-8 px-3.5 text-xs font-black rounded-xl bg-gradient-to-b from-kpu-maroon via-red-900 to-red-950 text-white border border-red-800 shadow-[0_2px_0_#4a0200,0_3px_6px_rgba(102,3,0,0.25)] active:translate-y-[1px] active:shadow-none flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                              >
                                {isSaving ? (
                                  <>
                                    <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Menyimpan ke Cloud...</span>
                                  </>
                                ) : (
                                  <>
                                    <Save className="h-3.5 w-3.5" />
                                    <span>Simpan Status ke Cloud</span>
                                  </>
                                )}
                              </motion.button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bagian Berkas yang Ditandai Hapus / Dipindahkan */}
            {deletedFiles.length > 0 && (
              <div className="mt-4 pt-3 border-t border-dashed border-slate-300">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                    <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                    Berkas Dihapus / Dipindahkan dari Folder Ini ({deletedFiles.length})
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    ✓ Anomali Selesai/Fix
                  </span>
                </div>
                <div className="space-y-1.5">
                  {deletedFiles.map((delFile) => (
                    <div
                      key={delFile.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600"
                    >
                      <div className="truncate pr-2">
                        <span className="line-through font-semibold text-slate-500">
                          {delFile.name}
                        </span>
                        <span className="block text-[10px] text-slate-400">
                          {delFile.resolutionNote || 'Dihapus dari folder TPS ini'}
                        </span>
                      </div>
                      {isAdminTeknis && !isDemoMode && (
                        <button
                          type="button"
                          onClick={() => handleRestoreFile(delFile)}
                          title="Batalkan penghapusan dan kembalikan berkas ke folder TPS ini"
                          className="shrink-0 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white border border-slate-300 text-slate-700 hover:text-kpu-maroon hover:border-kpu-maroon transition shadow-2xs cursor-pointer flex items-center gap-1"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Pulihkan</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>

        {/* Footer Modal 3D: Tombol Taktil */}
        <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-slate-50/90 rounded-b-2xl sm:rounded-b-3xl flex flex-col sm:flex-row items-center justify-between gap-3 backdrop-blur-xs">
          <div className="text-[11px] sm:text-xs text-slate-500 font-medium text-center sm:text-left">
            Total <strong>{record.files.length}</strong> berkas terdeteksi di folder TPS ini
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {record.tpsFolderUrl && !isDemoMode && (
              <motion.a
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96, y: 2 }}
                href={record.tpsFolderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-initial inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-b from-kpu-maroon via-red-900 to-red-950 text-white border border-red-800 shadow-[0_3px_0_#4a0200,0_4px_10px_rgba(102,3,0,0.3),inset_0_1px_0_rgba(255,255,255,0.3)] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
              >
                <FolderOpen className="h-3.5 w-3.5 mr-1.5 text-amber-300" />
                <span>Buka Drive</span>
                <ExternalLink className="h-3 w-3 ml-1.5 opacity-80" />
              </motion.a>
            )}

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96, y: 1 }}
              type="button"
              onClick={onClose}
              className="text-xs h-8 px-4 rounded-xl font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs flex-1 sm:flex-initial cursor-pointer"
            >
              Tutup
            </motion.button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
