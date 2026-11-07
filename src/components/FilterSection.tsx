import { Search, RotateCcw, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FilterState, StatusFilterOption, ElectionType } from '@/types';

interface FilterSectionProps {
  filter: FilterState;
  onFilterChange: (newFilter: Partial<FilterState>) => void;
  kecamatanList: string[];
  desaList: string[];
  totalFiltered: number;
  totalAll: number;
}

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
    <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs space-y-3">
      {/* Baris Atas: Label & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-red-50 text-kpu-maroon">
            <Filter className="h-4 w-4" />
          </span>
          <h3 className="text-sm font-bold text-slate-800">
            Filter & Pencarian TPS
          </h3>
          <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full font-medium">
            Menampilkan {totalFiltered} dari {totalAll} TPS
          </span>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={filter.searchQuery}
            onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
            placeholder="Cari desa atau nomor TPS..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-kpu-maroon focus:border-transparent placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Baris Filter Dropdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2.5 pt-1">
        
        {/* Dropdown Kecamatan */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Kecamatan:
          </label>
          <select
            value={filter.kecamatan}
            onChange={(e) =>
              onFilterChange({ kecamatan: e.target.value, desa: 'ALL' })
            }
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50/50 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-kpu-maroon"
          >
            <option value="ALL">Semua Kecamatan ({kecamatanList.length})</option>
            {kecamatanList.map((kec) => (
              <option key={kec} value={kec}>
                {kec}
              </option>
            ))}
          </select>
        </div>

        {/* Dropdown Desa */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Desa / Kelurahan:
          </label>
          <select
            value={filter.desa}
            onChange={(e) => onFilterChange({ desa: e.target.value })}
            disabled={filter.kecamatan === 'ALL'}
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50/50 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-kpu-maroon disabled:opacity-50 disabled:cursor-not-allowed"
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

        {/* Dropdown Status Kelengkapan */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Status Kelengkapan:
          </label>
          <select
            value={filter.status}
            onChange={(e) =>
              onFilterChange({
                status: e.target.value as StatusFilterOption,
              })
            }
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50/50 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-kpu-maroon"
          >
            <option value="ALL">Semua Status</option>
            <option value="COMPLETE">✅ Lengkap (5/5 Berkas)</option>
            <option value="PARTIAL">⏳ Belum Lengkap (1-4 Berkas)</option>
            <option value="EMPTY">❌ Masih Kosong (0 Berkas)</option>
            <option value="ANOMALY">⚠️ Ada Anomali / Typo</option>
          </select>
        </div>

        {/* Dropdown Pemilihan yang Kurang */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Filter Yang Belum Ada:
          </label>
          <select
            value={filter.missingElection}
            onChange={(e) =>
              onFilterChange({
                missingElection: e.target.value as 'ALL' | ElectionType,
              })
            }
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50/50 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-kpu-maroon"
          >
            <option value="ALL">Semua Jenis Pemilihan</option>
            <option value="PPWP">Belum Ada Presiden (PPWP)</option>
            <option value="DPR_RI">Belum Ada DPR RI</option>
            <option value="DPD">Belum Ada DPD RI</option>
            <option value="DPRD_PROV">Belum Ada DPRD Provinsi</option>
            <option value="DPRD_KAB">Belum Ada DPRD Kab/Ko</option>
          </select>
        </div>

        {/* Tombol Reset Filter */}
        <div className="flex items-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={!isFiltered}
            className="w-full text-xs h-[34px] border-slate-200 text-slate-600 hover:text-slate-900"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            <span>Reset Filter</span>
          </Button>
        </div>

      </div>
    </div>
  );
}

