import { useState } from 'react';
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
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TPSRecord, ELECTION_LIST, ElectionType, ScannedFile } from '@/types';
import { updateFileAnomalyStatus } from '@/services/firebase';

interface FileDetailModalProps {
  record: TPSRecord | null;
  open: boolean;
  onClose: () => void;
  isDemoMode?: boolean;
  currentUserEmail?: string | null;
}

export function FileDetailModal({
  record,
  open,
  onClose,
  isDemoMode = false,
  currentUserEmail = null,
}: FileDetailModalProps) {
  const isAdminTeknis = currentUserEmail?.toLowerCase() === 'teknis.kpusekadau@gmail.com';
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [selectedElection, setSelectedElection] = useState<string>('PPWP');
  const [resolutionNote, setResolutionNote] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);

  if (!record) return null;

  const handleStartEdit = (file: ScannedFile) => {
    if (editingFileId === file.id) {
      setEditingFileId(null);
      return;
    }
    setEditingFileId(file.id);
    setSelectedElection(
      file.overrideElection ||
      (file.detectedElection !== 'UNKNOWN' ? file.detectedElection : 'PPWP')
    );
    setResolutionNote(file.resolutionNote || 'Sudah diperbaiki / sesuai');
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);
  };

  const handleSaveStatus = async (file: ScannedFile) => {
    setIsSaving(true);
    setSaveErrorMsg(null);
    setSaveSuccessMsg(null);

    try {
      const isReset = selectedElection === 'RESET';
      await updateFileAnomalyStatus({
        kecamatan: record.kecamatan,
        tpsFolderId: record.tpsFolderId,
        fileId: file.id,
        overrideElection: isReset ? undefined : (selectedElection as ElectionType),
        isResolved: !isReset,
        resolutionNote: resolutionNote.trim(),
      });

      setSaveSuccessMsg('Status berkas berhasil diperbarui & disimpan permanen ke Firestore!');
      setTimeout(() => {
        setEditingFileId(null);
        setSaveSuccessMsg(null);
      }, 1400);
    } catch (err: any) {
      setSaveErrorMsg(err.message || 'Gagal menyimpan status anomali ke Firestore.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent onClose={onClose} className="max-w-2xl w-full max-h-[92vh] sm:max-h-[90vh] flex flex-col p-0 rounded-xl sm:rounded-2xl">
        
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-kpu-darkMaroon to-kpu-maroon text-white p-4 sm:p-5 rounded-t-xl sm:rounded-t-2xl pr-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded bg-kpu-gold text-kpu-darkMaroon font-black text-xs">
                  {record.tpsFolderName}
                </span>
                <span className="text-xs sm:text-sm font-semibold text-rose-100">
                  Desa {record.desa}
                </span>
              </div>
              <DialogTitle className="text-lg sm:text-xl font-extrabold text-white leading-tight">
                Rincian Berkas C-Hasil TPS
              </DialogTitle>
              <p className="text-[11px] sm:text-xs text-rose-200">
                Kecamatan {record.kecamatan} • KPU Kabupaten Sekadau
              </p>
            </div>

            {/* Kelengkapan Badge */}
            <div className="self-start sm:self-auto sm:text-right">
              {record.isComplete && !record.hasAnomaly ? (
                <Badge className="bg-emerald-500 text-white border-0 text-[11px] sm:text-xs py-1 px-2.5 sm:px-3 font-semibold">
                  ✓ Lengkap 5/5
                </Badge>
              ) : record.isComplete && record.hasAnomaly ? (
                <Badge className="bg-amber-500 text-white border-0 text-[11px] sm:text-xs py-1 px-2.5 sm:px-3 font-bold">
                  ⚠️ 5/5 (Ada Anomali)
                </Badge>
              ) : record.hasAnomaly ? (
                <Badge className="bg-amber-500 text-white border-0 text-[11px] sm:text-xs py-1 px-2.5 sm:px-3 font-bold">
                  ⚠️ Kurang {5 - record.completedCount} Berkas (Anomali)
                </Badge>
              ) : (
                <Badge className="bg-orange-500 text-white border-0 text-[11px] sm:text-xs py-1 px-2.5 sm:px-3 font-semibold">
                  Kurang {5 - record.completedCount} Berkas
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Isi Modal: Daftar 5 Pemilihan */}
        <div className="p-3.5 sm:p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* Anomali Global TPS jika ada */}
          {record.hasAnomaly && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-amber-800">
                <AlertTriangle className="h-4 w-4" />
                <span>Peringatan Anomali Pada Folder TPS Ini:</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-slate-700">
                {record.anomalies.map((anom, i) => (
                  <li key={i}>
                    <strong className="text-amber-900">{anom.fileName}</strong>: {anom.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Checklist 5 Slot Pemilihan */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Status 5 Kategori Pemilihan Pemilu 2024:
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

              return (
                <div
                  key={elec.key}
                  className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                    isFound
                      ? hasAnomaly
                        ? 'border-amber-300 border-l-4 border-l-amber-500 bg-amber-50/70 shadow-xs ring-1 ring-amber-300'
                        : 'border-slate-200 bg-white'
                      : 'border-rose-200 bg-rose-50/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {isFound ? (
                        hasAnomaly ? (
                          <AlertTriangle className="h-5 w-5 text-amber-600" />
                        ) : (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        )
                      ) : (
                        <XCircle className="h-5 w-5 text-rose-500" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-800">
                          {elec.label}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 font-semibold text-slate-600">
                          {elec.code}
                        </span>
                      </div>

                      {isFound ? (
                        <div className="mt-1 space-y-0.5">
                          <p className="text-xs font-medium text-slate-600 truncate max-w-sm sm:max-w-md">
                            📄 {file?.name}
                          </p>
                          {hasAnomaly && (
                            <p className="text-[11px] text-amber-700 font-medium">
                              ⚠️ {file?.anomalies[0].message}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-rose-600 font-medium mt-1">
                          Berkas scan belum ditemukan di folder Google Drive.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Tombol Aksi Preview Berkas (Hanya aktif jika bukan mode preview) */}
                  {isFound && file?.url && !isDemoMode && (
                    <div className="shrink-0 flex items-center gap-1.5 self-end sm:self-center">
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800 hover:bg-slate-200 hover:text-slate-900 transition"
                        title="Lihat berkas di Google Drive"
                      >
                        <FileText className="h-3.5 w-3.5 text-slate-600" />
                        <span>Preview Berkas</span>
                        <ExternalLink className="h-3 w-3 text-slate-400" />
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Seluruh Berkas Terdeteksi (termasuk file extra / unrecognized) */}
          <div className="pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Daftar Seluruh File di Folder ({record.files.length} Berkas):
            </h4>
            <div className="space-y-2">
              {record.files.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                  Folder Google Drive ini masih kosong (0 file).
                </div>
              ) : (
                record.files.map((file) => {
                  const isFileAnomaly =
                    file.detectedElection === 'UNKNOWN' ||
                    (file.anomalies && file.anomalies.length > 0 && !file.isResolved);

                  return (
                    <div
                      key={file.id}
                      className={`p-3 px-3.5 rounded-xl border flex flex-col gap-2.5 text-xs transition ${
                        file.isResolved
                          ? 'border-emerald-200 bg-emerald-50/40'
                          : isFileAnomaly
                          ? 'border-amber-300 border-l-4 border-l-amber-500 bg-amber-50 shadow-xs ring-1 ring-amber-400/40'
                          : 'border-slate-200 bg-white hover:bg-slate-50/80'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 w-full">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="mt-0.5 shrink-0">
                            {file.isResolved ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
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
                                  isFileAnomaly && !file.isResolved ? 'text-amber-950 font-bold' : 'text-slate-800'
                                }`}
                              >
                                {file.name}
                              </p>
                              {file.isResolved ? (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  ✓ Terverifikasi / Diperbaiki ({file.detectedElection})
                                </span>
                              ) : isFileAnomaly && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 border border-amber-300">
                                  ⚠️ Perlu Perhatian (Anomali)
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap text-[11px]">
                              <span className="text-slate-500 text-[10px] sm:text-[11px]">
                                Kategori Terdeteksi:{' '}
                                <strong
                                  className={
                                    file.detectedElection === 'UNKNOWN'
                                      ? 'text-rose-600 font-bold'
                                      : 'text-slate-700'
                                  }
                                >
                                  {file.detectedElection === 'UNKNOWN'
                                    ? 'UNKNOWN (Format Tidak Dikenali)'
                                    : file.detectedElection}
                                </strong>
                              </span>

                              {/* Info Pengunggah di Google Drive */}
                              <span
                                className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-medium border ${
                                  file.uploader
                                    ? 'bg-amber-50 text-amber-900 border-amber-200'
                                    : 'bg-slate-100 text-slate-500 border-slate-200'
                                }`}
                                title="Akun Google yang mengunggah / memiliki file di Google Drive"
                              >
                                <User className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-slate-400" />
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
                                  className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium text-[10px] sm:text-[11px] border border-slate-200"
                                  title="Waktu file diupload / diperbarui di Google Drive"
                                >
                                  <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-slate-400" />
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

                            {/* Detail pesan anomali jika belum diselesaikan */}
                            {!file.isResolved &&
                              file.anomalies &&
                              file.anomalies.length > 0 && (
                                <div className="mt-1 space-y-0.5">
                                  {file.anomalies.map((anom, idx) => (
                                    <p
                                      key={idx}
                                      className="text-[11px] text-amber-900 font-medium"
                                    >
                                      ⚠️ {anom.message}
                                    </p>
                                  ))}
                                </div>
                              )}
                          </div>
                        </div>

                        {/* Tombol Aksi Kanan: Buka & Perbarui Status */}
                        <div className="shrink-0 flex items-center gap-1.5 self-end sm:self-center">
                          {!isDemoMode && isAdminTeknis && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStartEdit(file)}
                              className={`h-7 px-2 text-[11px] font-semibold ${
                                editingFileId === file.id
                                  ? 'bg-amber-100 border-amber-400 text-amber-900'
                                  : 'text-slate-700 border-slate-300 hover:border-kpu-maroon hover:text-kpu-maroon'
                              }`}
                              title="Khusus Admin Teknis: Perbarui atau tetapkan status jenis pemilihan"
                            >
                              <Wrench className="h-3 w-3 mr-1 text-slate-500" />
                              <span>{file.isResolved ? 'Edit Status' : 'Perbarui Status'}</span>
                            </Button>
                          )}

                          {file.url && !isDemoMode && (
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`text-xs font-bold shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                                isFileAnomaly && !file.isResolved
                                  ? 'bg-amber-200 hover:bg-amber-300 text-amber-950 border border-amber-300'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                              }`}
                            >
                              <span>Buka</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Panel Form Inline Edit Status (Hanya Tampil Jika Tombol Perbarui Status Diklik) */}
                      {editingFileId === file.id && (
                        <div className="mt-2 pt-2.5 border-t border-slate-200 space-y-2 bg-slate-50/90 p-3 rounded-lg">
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
                              <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                                Kategori Jenis Pemilihan:
                              </label>
                              <select
                                value={selectedElection}
                                onChange={(e) => setSelectedElection(e.target.value)}
                                className="w-full text-xs p-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:ring-1 focus:ring-kpu-maroon"
                              >
                                <option value="PPWP">1. Presiden & Wakil Presiden (PPWP)</option>
                                <option value="DPR_RI">2. DPR Republik Indonesia (DPR RI)</option>
                                <option value="DPD">3. DPD Republik Indonesia (DPD)</option>
                                <option value="DPRD_PROV">4. DPRD Provinsi Kalimantan Barat</option>
                                <option value="DPRD_KAB">5. DPRD Kabupaten Sekadau</option>
                                <option value="RESET">🔄 Kembalikan ke Semula (Reset)</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                                Catatan Perbaikan:
                              </label>
                              <input
                                type="text"
                                value={resolutionNote}
                                onChange={(e) => setResolutionNote(e.target.value)}
                                placeholder="Misal: Sudah diperbaiki di Drive"
                                className="w-full text-xs p-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:ring-1 focus:ring-kpu-maroon"
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
                              className="h-7 text-xs"
                            >
                              Batal
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleSaveStatus(file)}
                              disabled={isSaving}
                              className="h-7 text-xs bg-kpu-maroon hover:bg-kpu-darkMaroon text-white font-bold shadow-xs"
                            >
                              {isSaving ? (
                                <>
                                  <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1.5" />
                                  <span>Menyimpan ke Cloud...</span>
                                </>
                              ) : (
                                <>
                                  <Save className="h-3 w-3 mr-1.5" />
                                  <span>Simpan Status ke Cloud</span>
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer Modal: Tombol */}
        <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-slate-50 rounded-b-xl sm:rounded-b-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] sm:text-xs text-slate-500 font-medium text-center sm:text-left">
            Total {record.files.length} berkas terdeteksi di folder TPS ini
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {record.tpsFolderUrl && !isDemoMode && (
              <a
                href={record.tpsFolderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-initial inline-flex items-center justify-center px-4 py-2 rounded-lg text-xs font-bold bg-kpu-maroon hover:bg-kpu-darkMaroon text-white transition shadow-xs"
              >
                <FolderOpen className="h-3.5 w-3.5 mr-1.5" />
                <span>Buka Drive</span>
                <ExternalLink className="h-3 w-3 ml-1.5 opacity-80" />
              </a>
            )}

            <Button variant="outline" size="sm" onClick={onClose} className="text-xs px-4 flex-1 sm:flex-initial">
              Tutup
            </Button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
