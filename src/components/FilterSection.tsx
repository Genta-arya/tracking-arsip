import { Search, RotateCcw, Filter } from 'lucide-react';
import { motion } from 'framer-motion';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { FilterState, StatusFilterOption, ElectionType } from '@/types';

interface FilterSectionProps {
  filter: FilterState;
  onFilterChange: (newFilter: Partial<FilterState>) => void;
  kecamatanList: string[];
  desaList: string[];
  totalFiltered: number;
  totalAll: number;
}

/**
 * FilterSection 3D Command Deck
 * Menyediakan filter dan pencarian TPS dengan efek kedalaman visual 3D, input berdimensi, dan tombol taktil.
 */
export function FilterSection({
  filter,
  onFilterChange,
  kecamatanList,
  desaList,
  totalFiltered,
  totalAll,
}: FilterSectionProps) {
  const handleReset = () => {
    onFilterChange({
      kecamatan: 'ALL',
      desa: 'ALL',
      status: 'ALL',
      missingElection: 'ALL',
      searchQuery: '',
    });
  };

  const isFiltered =
    filter.kecamatan !== 'ALL' ||
    filter.desa !== 'ALL' ||
    filter.status !== 'ALL' ||
    filter.missingElection !== 'ALL' ||
    filter.searchQuery.trim() !== '';

  return (
    <div className="relative bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-[0_12px_32px_-6px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.03)] space-y-4 overflow-hidden select-none">
      {/* Top 3D Specular Highlight Line */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none z-10" />

      {/* Ambient Top Glow */}
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-red-600/5 rounded-full blur-2xl pointer-events-none" />

      {/* Baris Atas: Label 3D & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* 3D Floating Isometric Filter Gem */}
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 via-kpu-maroon to-red-900 text-white flex items-center justify-center shadow-[0_4px_10px_rgba(102,3,0,0.3),inset_0_1.5px_1px_rgba(255,255,255,0.6),inset_0_-2px_1px_rgba(0,0,0,0.3)] border border-red-400/60 shrink-0">
            <Filter className="h-4.5 w-4.5 drop-shadow-xs" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                Filter & Parameter Matriks
              </h3>
              {/* 3D Counter Badge */}
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-100/90 text-slate-700 font-bold text-[11px] border border-slate-200/90 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                <span>
                  <AnimatedCounter value={totalFiltered} /> / <AnimatedCounter value={totalAll} /> TPS Terpilih
                </span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
              Saring matriks data berdasarkan wilayah, status berkas, atau kategori pemilihan
            </p>
          </div>
        </div>

        {/* 3D Search Bar */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={filter.searchQuery}
            onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
            placeholder="Cari desa atau nomor TPS..."
            className="w-full pl-10 pr-3.5 py-2 text-xs rounded-xl border border-slate-200/90 bg-slate-50/70 focus:bg-white text-slate-800 placeholder:text-slate-400 font-medium shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.05)] focus:shadow-[0_0_0_2px_rgba(102,3,0,0.2)] focus:outline-none transition-all"
          />
        </div>
      </div>

      {/* Baris Filter Dropdown Berdimensi */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2.5 pt-1">
        {/* Dropdown Kecamatan */}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">
            Kecamatan:
          </label>
          <div className="relative">
            <select
              value={filter.kecamatan}
              onChange={(e) =>
                onFilterChange({ kecamatan: e.target.value, desa: 'ALL' })
              }
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/80 font-bold text-slate-800 shadow-[0_2px_4px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.9)] hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-kpu-maroon transition-all cursor-pointer"
            >
              <option value="ALL">Semua Kecamatan ({kecamatanList.length})</option>
              {kecamatanList.map((kec) => (
                <option key={kec} value={kec}>
                  {kec}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dropdown Desa */}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">
            Desa / Kelurahan:
          </label>
          <div className="relative">
            <select
              value={filter.desa}
              onChange={(e) => onFilterChange({ desa: e.target.value })}
              disabled={filter.kecamatan === 'ALL'}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/80 font-bold text-slate-800 shadow-[0_2px_4px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.9)] hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-kpu-maroon disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <option value="ALL">
                {filter.kecamatan === 'ALL'
                  ? 'Pilih Kecamatan Dulu'
                  : `Semua Desa (${desaList.length})`}
              </option>
              {desaList.map((desa) => (
                <option key={desa} value={desa}>
                  {desa}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dropdown Status Kelengkapan */}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">
            Status Kelengkapan:
          </label>
          <div className="relative">
            <select
              value={filter.status}
              onChange={(e) =>
                onFilterChange({
                  status: e.target.value as StatusFilterOption,
                })
              }
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/80 font-bold text-slate-800 shadow-[0_2px_4px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.9)] hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-kpu-maroon transition-all cursor-pointer"
            >
              <option value="ALL">Semua Status</option>
              <option value="COMPLETE">✅ Lengkap (5/5 Berkas)</option>
              <option value="PARTIAL">⏳ Belum Lengkap (1-4 Berkas)</option>
              <option value="EMPTY">❌ Masih Kosong (0 Berkas)</option>
              <option value="ANOMALY">⚠️ Ada Anomali / Typo</option>
              <option value="MISMATCH_DESA">📍 Salah Folder Desa (Mismatch Desa)</option>
            </select>
          </div>
        </div>

        {/* Dropdown Pemilihan yang Kurang */}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">
            Filter Yang Belum Ada:
          </label>
          <div className="relative">
            <select
              value={filter.missingElection}
              onChange={(e) =>
                onFilterChange({
                  missingElection: e.target.value as 'ALL' | ElectionType,
                })
              }
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/80 font-bold text-slate-800 shadow-[0_2px_4px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.9)] hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-kpu-maroon transition-all cursor-pointer"
            >
              <option value="ALL">Semua Jenis Pemilihan</option>
              <option value="PPWP">Belum Ada Presiden (PPWP)</option>
              <option value="DPR_RI">Belum Ada DPR RI</option>
              <option value="DPD">Belum Ada DPD RI</option>
              <option value="DPRD_PROV">Belum Ada DPRD Provinsi</option>
              <option value="DPRD_KAB">Belum Ada DPRD Kab/Ko</option>
            </select>
          </div>
        </div>

        {/* Tombol Tactile 3D Reset Filter */}
        <div className="flex items-end">
          <motion.button
            whileHover={isFiltered ? { scale: 1.02 } : {}}
            whileTap={isFiltered ? { scale: 0.97, y: 1 } : {}}
            type="button"
            onClick={handleReset}
            disabled={!isFiltered}
            className={`w-full text-xs h-[38px] rounded-xl font-bold border transition-all flex items-center justify-center gap-1.5 shadow-[0_2px_0_#cbd5e1,0_3px_6px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.9)] active:translate-y-[2px] active:shadow-none cursor-pointer ${
              isFiltered
                ? 'bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 border-slate-300 text-slate-800 hover:border-kpu-maroon hover:text-kpu-maroon'
                : 'bg-slate-50/60 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed shadow-none'
            }`}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Filter</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
}
