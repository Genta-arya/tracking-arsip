import { motion } from 'framer-motion';
import { FileSpreadsheet, Send, X, ExternalLink, Table, FileWarning } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  onExportFull: () => void;
  onExportProvinsi: () => void;
  onExportIncompletePages: () => void;
  totalTPS: number;
  incompletePagesFileCount?: number;
  incompletePagesTotalMissing?: number;
}

export function ExportModal({
  open,
  onClose,
  onExportFull,
  onExportProvinsi,
  onExportIncompletePages,
  totalTPS,
  incompletePagesFileCount = 0,
  incompletePagesTotalMissing = 0,
}: ExportModalProps) {
  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent
        className="w-[95vw] max-w-lg p-0 overflow-hidden bg-white rounded-3xl border border-slate-200 shadow-2xl"
        onClose={onClose}
      >
        {/* Header Modal */}
        <div className="relative p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white overflow-hidden">
          {/* Top highlight bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-kpu-orange via-amber-400 to-red-500" />
          
          <div className="flex items-start justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg border border-amber-400/40">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black tracking-tight text-white">
                  Pilih Format Unduhan Excel
                </DialogTitle>
                <p className="text-xs text-slate-300 font-medium mt-0.5">
                  Total {totalTPS.toLocaleString('id-ID')} TPS di Kabupaten Sekadau
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Pilihan Opsi Export */}
        <div className="p-6 space-y-4 bg-slate-50/50">
          {/* Opsi 1: Rekapitulasi Lengkap Standar KPU */}
          <motion.div
            whileHover={{ scale: 1.01, y: -2 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => {
              onExportFull();
              onClose();
            }}
            className="p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-orange-400 shadow-xs hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-orange-50 text-kpu-orange border border-orange-200/60 group-hover:bg-kpu-orange group-hover:text-white transition-colors shrink-0">
                <Table className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-slate-900 group-hover:text-kpu-orange transition-colors">
                    1. Rekapitulasi Lengkap KPU (9 Sheet)
                  </h4>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 group-hover:bg-orange-100 group-hover:text-orange-800">
                    Standar
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Format resmi lengkap dengan 9 sheet: Ringkasan Kecamatan, seluruh tab per-Kecamatan, rincian 5 jenis surat suara, dan daftar anomali berkas.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Opsi 2: Format Khusus Laporan Provinsi */}
          <motion.div
            whileHover={{ scale: 1.01, y: -2 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => {
              onExportProvinsi();
              onClose();
            }}
            className="p-4 rounded-2xl bg-white border-2 border-emerald-300/80 hover:border-emerald-500 shadow-xs hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
          >
            {/* Tag Rekomendasi */}
            <div className="absolute top-0 right-0 bg-gradient-to-l from-emerald-600 to-teal-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-bl-xl shadow-2xs">
              Siap Copy-Paste
            </div>

            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
                <Send className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0 pr-12">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-slate-900 group-hover:text-emerald-700 transition-colors">
                    2. Format Laporan Provinsi
                  </h4>
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Kolom ringkas: <span className="font-semibold text-slate-700">Kecamatan, Desa, TPS, dan Link Folder Drive</span>. Siap langsung dicopy dan di-insert ke Google Spreadsheet Provinsi.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Opsi 3: Rekap Berkas Kurang Lembar */}
          <motion.div
            whileHover={{ scale: 1.01, y: -2 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => {
              onExportIncompletePages();
              onClose();
            }}
            className="p-4 rounded-2xl bg-white border border-rose-200/90 hover:border-rose-400 shadow-xs hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-200/60 group-hover:bg-rose-600 group-hover:text-white transition-colors shrink-0">
                <FileWarning className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h4 className="text-sm font-black text-slate-900 group-hover:text-rose-700 transition-colors">
                    3. Rekap Berkas Kurang Lembar
                  </h4>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                    {incompletePagesFileCount.toLocaleString('id-ID')} Berkas • -{incompletePagesTotalMissing.toLocaleString('id-ID')} Hal
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Rincian berkas yang jumlah halamannya kurang dari standar (3/4/20 hal), lengkap dengan <span className="font-semibold text-slate-700">jumlah kekurangan lembar</span>, ringkasan per kecamatan, dan link file Drive.
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Footer Modal */}
        <div className="p-4 bg-white border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1 font-medium">
            <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
            Berkas terunduh dalam format .xlsx
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold transition-all cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
