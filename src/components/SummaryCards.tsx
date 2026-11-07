import {
  CheckCircle2,
  AlertTriangle,
  FolderOpen,
  FileCheck,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { GlobalStats, KecamatanSummary } from '@/types';

interface SummaryCardsProps {
  stats: GlobalStats;
  kecamatanSummaries: KecamatanSummary[];
  selectedKecamatan: string;
  onSelectKecamatan: (kec: string) => void;
}

export function SummaryCards({
  stats,
  kecamatanSummaries,
  selectedKecamatan,
  onSelectKecamatan,
}: SummaryCardsProps) {
  return (
    <div className="space-y-5">
      {/* 4 Kartu KPI Utama */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Wilayah & TPS */}
        <Card className="border-l-4 border-l-kpu-maroon shadow-xs hover:shadow-md transition">
          <CardContent className="p-5 flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total Wilayah & TPS
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">
                  {stats.totalTPS}
                </span>
                <span className="text-xs text-slate-500 font-medium">TPS</span>
              </div>
              <p className="text-xs text-slate-600 font-medium">
                {stats.totalKecamatan} Kecamatan • {stats.totalDesa} Desa/Kel.
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-red-50 text-kpu-maroon">
              <FolderOpen className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Kelengkapan Berkas (5/5) */}
        <Card className="border-l-4 border-l-emerald-600 shadow-xs hover:shadow-md transition">
          <CardContent className="p-5 flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                TPS Lengkap (5/5 File)
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-600">
                  {stats.completedTPS}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  / {stats.totalTPS} TPS
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium">
                {((stats.completedTPS / (stats.totalTPS || 1)) * 100).toFixed(1)}% TPS Sudah Siap Arsip
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Total Berkas Terkumpul */}
        <Card className="border-l-4 border-l-kpu-gold shadow-xs hover:shadow-md transition">
          <CardContent className="p-5 flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total Berkas Scan C-Hasil
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">
                  {stats.totalFilesCollected.toLocaleString('id-ID')}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  / {stats.expectedFilesTotal.toLocaleString('id-ID')}
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium">
                {stats.validFilesCount ?? stats.totalFilesCollected} Berkas Sah • {stats.anomalyFilesCount ?? 0} Anomali
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <FileCheck className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Progres Global & Anomali */}
        <Card className="border-l-4 border-l-kpu-orange shadow-xs hover:shadow-md transition">
          <CardContent className="p-5 flex items-start justify-between">
            <div className="space-y-1 flex-1 pr-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Progres Global Arsip
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-kpu-orange">
                  {stats.completionPercentage.toFixed(1)}%
                </span>
                {stats.anomalyTPS > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-semibold inline-flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {stats.anomalyTPS} Anomali
                  </span>
                )}
              </div>
              <div className="mt-2 w-full">
                <Progress
                  value={stats.completionPercentage}
                  indicatorColor="bg-gradient-to-r from-kpu-orange to-kpu-gold"
                  className="h-2"
                />
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-orange-50 text-kpu-orange shrink-0">
              <TrendingUp className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar & Matriks Ringkas 7 Kecamatan */}
      <Card className="shadow-xs overflow-hidden border border-slate-200">
        <div className="bg-slate-50/80 px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Progres Pemindaian 7 Kecamatan di Kabupaten Sekadau
            </h3>
            <p className="text-xs text-slate-500">
              Klik nama kecamatan untuk langsung memfilter tabel matriks di bawah
            </p>
          </div>
          {selectedKecamatan !== 'ALL' && (
            <button
              onClick={() => onSelectKecamatan('ALL')}
              className="text-xs font-medium text-kpu-maroon hover:underline"
            >
              ← Tampilkan Semua Kecamatan
            </button>
          )}
        </div>

        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {kecamatanSummaries.map((kec) => {
              const isSelected = selectedKecamatan === kec.name;
              const isPerfect = kec.percentage === 100;

              return (
                <div
                  key={kec.name}
                  onClick={() =>
                    onSelectKecamatan(isSelected ? 'ALL' : kec.name)
                  }
                  className={`p-3.5 rounded-xl border transition cursor-pointer text-left ${
                    isSelected
                      ? 'border-kpu-maroon bg-red-50/50 ring-2 ring-kpu-maroon/20'
                      : 'border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-sm text-slate-900 truncate">
                      {kec.name}
                    </span>
                    <span
                      className={`text-xs font-extrabold px-2 py-0.5 rounded-md ${
                        isPerfect
                          ? 'bg-emerald-100 text-emerald-800'
                          : kec.percentage >= 70
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {kec.percentage.toFixed(0)}%
                    </span>
                  </div>

                  <Progress
                    value={kec.percentage}
                    indicatorColor={
                      isPerfect
                        ? 'bg-emerald-500'
                        : kec.percentage >= 70
                        ? 'bg-kpu-gold'
                        : 'bg-kpu-maroon'
                    }
                    className="h-1.5 mb-2"
                  />

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      {kec.completedTPS} / {kec.totalTPS} TPS Lengkap
                    </span>
                    {kec.anomalyTPS > 0 ? (
                      <span className="text-amber-600 font-semibold">
                        ⚠️ {kec.anomalyTPS} Anomali
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-medium">✓ Valid</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

