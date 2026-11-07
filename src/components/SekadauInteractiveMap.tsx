import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  RotateCcw,
  Compass,
  ChevronDown,
  ChevronUp,
  FileText,
  Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { TPSRecord } from '@/types';
import {
  SEKADAU_CENTER,
  SEKADAU_DEFAULT_ZOOM,
  SEKADAU_COORDINATES,
  getDesaCoordinate,
  getKecamatanCoordinate,
} from '@/data/sekadauCoordinates';

interface SekadauInteractiveMapProps {
  selectedKecamatan: string;
  selectedDesa: string;
  onSelectKecamatan: (kecamatan: string) => void;
  onSelectDesa: (desa: string) => void;
  records: TPSRecord[];
}

// Controller untuk menggerakkan peta secara halus saat filter berubah
function MapFlyController({
  kecamatan,
  desa,
  isCollapsed,
}: {
  kecamatan: string;
  desa: string;
  isCollapsed: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (isCollapsed) return;

    // Invalidate size agar render tile tidak terpotong saat container dimuat/diubah ukuran
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => clearTimeout(timer);
  }, [map, isCollapsed]);

  useEffect(() => {
    if (isCollapsed) return;

    if (desa && desa !== 'ALL' && kecamatan && kecamatan !== 'ALL') {
      const coord = getDesaCoordinate(kecamatan, desa);
      if (coord) {
        map.flyTo([coord.lat, coord.lng], 14, {
          duration: 1.2,
          easeLinearity: 0.25,
        });
      }
    } else if (kecamatan && kecamatan !== 'ALL') {
      const kecCoord = getKecamatanCoordinate(kecamatan);
      if (kecCoord) {
        map.flyTo([kecCoord.lat, kecCoord.lng], kecCoord.zoom || 12, {
          duration: 1.2,
          easeLinearity: 0.25,
        });
      }
    } else {
      map.flyTo([SEKADAU_CENTER.lat, SEKADAU_CENTER.lng], SEKADAU_DEFAULT_ZOOM, {
        duration: 1.2,
        easeLinearity: 0.25,
      });
    }
  }, [kecamatan, desa, map, isCollapsed]);

  return null;
}

// Generator Custom HTML Pin Marker
function createKecamatanPinIcon(
  name: string,
  percentage: number,
  isSelected: boolean,
  hasAnomaly: boolean
) {
  const badgeColor =
    percentage >= 80
      ? 'bg-emerald-600'
      : percentage >= 30
      ? 'bg-amber-500'
      : 'bg-rose-600';

  const ringStyle = isSelected
    ? 'ring-4 ring-amber-400 ring-offset-2 scale-110 shadow-xl'
    : 'shadow-md hover:scale-105';

  const html = `
    <div class="relative flex flex-col items-center group cursor-pointer transition-transform duration-200 ${ringStyle} rounded-2xl">
      <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white border-2 border-kpu-maroon text-slate-800 shadow-lg">
        <span class="w-2.5 h-2.5 rounded-full ${badgeColor} inline-block animate-pulse"></span>
        <div class="flex flex-col text-left leading-tight">
          <span class="text-[11px] font-black text-kpu-darkMaroon whitespace-nowrap">${name}</span>
          <div class="flex items-center gap-1 text-[9px] font-bold text-slate-500">
            <span class="${percentage >= 80 ? 'text-emerald-700' : percentage >= 30 ? 'text-amber-700' : 'text-rose-700'}">${percentage.toFixed(1)}%</span>
            ${hasAnomaly ? '<span class="text-amber-600 font-extrabold">⚠️</span>' : ''}
          </div>
        </div>
      </div>
      <div class="w-2 h-2 bg-kpu-maroon rotate-45 -mt-1 shadow-xs"></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-leaflet-kec-pin',
    iconSize: [120, 48],
    iconAnchor: [60, 48],
    popupAnchor: [0, -48],
  });
}

function createDesaPinIcon(
  name: string,
  percentage: number,
  isSelected: boolean,
  hasAnomaly: boolean
) {
  const bgColor =
    percentage >= 100
      ? 'bg-emerald-500 border-emerald-700'
      : percentage > 0
      ? 'bg-amber-500 border-amber-700'
      : 'bg-rose-500 border-rose-700';

  const ringStyle = isSelected
    ? 'ring-4 ring-kpu-gold ring-offset-1 scale-125 z-50'
    : 'hover:scale-110';

  const html = `
    <div class="relative flex flex-col items-center cursor-pointer transition-transform duration-200 ${ringStyle}">
      <div class="w-6 h-6 rounded-full ${bgColor} border-2 text-white flex items-center justify-center shadow-md">
        <span class="text-[10px] font-black">${percentage >= 100 ? '✓' : Math.round(percentage) + '%'}</span>
      </div>
      <div class="mt-0.5 px-1.5 py-0.5 bg-slate-900/80 backdrop-blur-xs text-white rounded text-[9px] font-semibold whitespace-nowrap shadow-xs">
        ${name} ${hasAnomaly ? '⚠️' : ''}
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-leaflet-desa-pin',
    iconSize: [60, 36],
    iconAnchor: [30, 20],
    popupAnchor: [0, -20],
  });
}

export function SekadauInteractiveMap({
  selectedKecamatan,
  selectedDesa,
  onSelectKecamatan,
  onSelectDesa,
  records,
}: SekadauInteractiveMapProps) {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  // Kalkulasi agregat data per Kecamatan
  const kecamatanData = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        totalTps: number;
        completedTps: number;
        anomalyTps: number;
        validFiles: number;
        physicalFiles: number;
        percentage: number;
      }
    >();

    // Inisialisasi 7 Kecamatan
    Object.keys(SEKADAU_COORDINATES).forEach((k) => {
      map.set(k.toLowerCase(), {
        name: k,
        totalTps: 0,
        completedTps: 0,
        anomalyTps: 0,
        validFiles: 0,
        physicalFiles: 0,
        percentage: 0,
      });
    });

    records.forEach((r) => {
      const key = r.kecamatan.toLowerCase();
      let item = map.get(key);
      if (!item) {
        item = {
          name: r.kecamatan,
          totalTps: 0,
          completedTps: 0,
          anomalyTps: 0,
          validFiles: 0,
          physicalFiles: 0,
          percentage: 0,
        };
        map.set(key, item);
      }
      item.totalTps++;
      item.validFiles += r.completedCount;
      item.physicalFiles += r.files.length;
      if (r.completedCount === 5) item.completedTps++;
      if (r.hasAnomaly) item.anomalyTps++;
    });

    map.forEach((item) => {
      const expected = item.totalTps * 5;
      item.percentage = expected > 0 ? (item.validFiles / expected) * 100 : 0;
    });

    return Array.from(map.values());
  }, [records]);

  // Kalkulasi agregat data per Desa untuk Kecamatan yang sedang dipilih
  const desaData = useMemo(() => {
    if (selectedKecamatan === 'ALL') return [];

    const kecNorm = selectedKecamatan.toLowerCase();
    const map = new Map<
      string,
      {
        name: string;
        kecamatan: string;
        totalTps: number;
        completedTps: number;
        anomalyTps: number;
        validFiles: number;
        percentage: number;
        coords: { lat: number; lng: number };
      }
    >();

    // Ambil daftar desa yang ada di koordinat
    const kecCoordObj = Object.entries(SEKADAU_COORDINATES).find(
      ([k]) => k.toLowerCase() === kecNorm
    );
    if (kecCoordObj) {
      Object.entries(kecCoordObj[1].desas).forEach(([desaName, coord]) => {
        map.set(desaName.toLowerCase(), {
          name: desaName,
          kecamatan: kecCoordObj[1].name,
          totalTps: 0,
          completedTps: 0,
          anomalyTps: 0,
          validFiles: 0,
          percentage: 0,
          coords: coord,
        });
      });
    }

    // Isikan data riil dari records
    records
      .filter((r) => r.kecamatan.toLowerCase() === kecNorm)
      .forEach((r) => {
        const dKey = r.desa.toLowerCase();
        let item = map.get(dKey);
        if (!item) {
          const fallbackCoord = getDesaCoordinate(r.kecamatan, r.desa) || {
            lat: SEKADAU_CENTER.lat,
            lng: SEKADAU_CENTER.lng,
          };
          item = {
            name: r.desa,
            kecamatan: r.kecamatan,
            totalTps: 0,
            completedTps: 0,
            anomalyTps: 0,
            validFiles: 0,
            percentage: 0,
            coords: fallbackCoord,
          };
          map.set(dKey, item);
        }
        item.totalTps++;
        item.validFiles += r.completedCount;
        if (r.completedCount === 5) item.completedTps++;
        if (r.hasAnomaly) item.anomalyTps++;
      });

    map.forEach((item) => {
      const expected = item.totalTps * 5;
      item.percentage = expected > 0 ? (item.validFiles / expected) * 100 : 0;
    });

    return Array.from(map.values());
  }, [records, selectedKecamatan]);

  // Statistik area yang sedang difokuskan
  const currentFocusStats = useMemo(() => {
    if (selectedDesa !== 'ALL' && selectedKecamatan !== 'ALL') {
      const matched = desaData.find(
        (d) => d.name.toLowerCase() === selectedDesa.toLowerCase()
      );
      return {
        label: `Desa ${selectedDesa}`,
        subLabel: `Kec. ${selectedKecamatan}`,
        totalTps: matched?.totalTps || 0,
        completedTps: matched?.completedTps || 0,
        percentage: matched?.percentage || 0,
        anomalyTps: matched?.anomalyTps || 0,
      };
    }

    if (selectedKecamatan !== 'ALL') {
      const matched = kecamatanData.find(
        (k) => k.name.toLowerCase() === selectedKecamatan.toLowerCase()
      );
      return {
        label: `Kecamatan ${selectedKecamatan}`,
        subLabel: `${desaData.length} Desa Terdaftar`,
        totalTps: matched?.totalTps || 0,
        completedTps: matched?.completedTps || 0,
        percentage: matched?.percentage || 0,
        anomalyTps: matched?.anomalyTps || 0,
      };
    }

    const totalTps = kecamatanData.reduce((acc, k) => acc + k.totalTps, 0);
    const completedTps = kecamatanData.reduce((acc, k) => acc + k.completedTps, 0);
    const validFiles = kecamatanData.reduce((acc, k) => acc + k.validFiles, 0);
    const expected = totalTps * 5;
    const percentage = expected > 0 ? (validFiles / expected) * 100 : 0;
    const anomalyTps = kecamatanData.reduce((acc, k) => acc + k.anomalyTps, 0);

    return {
      label: 'Kabupaten Sekadau',
      subLabel: '7 Kecamatan • Seluruh Wilayah',
      totalTps,
      completedTps,
      percentage,
      anomalyTps,
    };
  }, [selectedKecamatan, selectedDesa, kecamatanData, desaData]);

  const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const tileAttribution =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden transition-all duration-300 isolate relative z-0">
      {/* 1. Header Toolbar Peta */}
      <div className="px-4 py-3 bg-gradient-to-r from-slate-50 via-white to-amber-50/30 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-kpu-maroon text-white shadow-xs">
            <Compass className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 tracking-tight">
              Peta Pantauan Wilayah C-Hasil Sekadau
            </h3>
            <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
              Peta otomatis mengikuti pilihan filter Kecamatan & Desa di atas, atau klik pin langsung pada peta.
            </p>
          </div>
        </div>

        {/* Toolbar Tombol Aksi */}
        <div className="flex items-center gap-1.5 ml-auto">
          {/* Reset Zoom Button */}
          <button
            onClick={() => {
              onSelectKecamatan('ALL');
              onSelectDesa('ALL');
            }}
            title="Tampilkan seluruh Kabupaten Sekadau"
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
            <span className="hidden sm:inline">Reset Wilayah</span>
          </button>

          {/* Toggle Sembunyikan / Buka Peta */}
          <button
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-kpu-maroon bg-red-50 hover:bg-red-100/70 border border-red-200/60 rounded-lg shadow-2xs transition-colors"
          >
            {isCollapsed ? (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                <span>Buka Peta</span>
              </>
            ) : (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                <span>Sembunyikan Peta</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Isi Peta Interaktif (Collapsible dengan AnimatePresence) */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
            className="relative overflow-hidden"
          >
            {/* Floating Glassmorphism Badge Statistik Lokasi yang Aktif */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.25 }}
              className="absolute top-3 left-3 z-10 pointer-events-none max-w-xs sm:max-w-sm"
            >
            <div className="pointer-events-auto bg-white/95 backdrop-blur-md p-3 rounded-xl border border-slate-200/90 shadow-lg text-xs space-y-1.5 transition-all">
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-kpu-maroon shrink-0" />
                  <div>
                    <h4 className="font-black text-slate-800 leading-tight">
                      {currentFocusStats.label}
                    </h4>
                    <p className="text-[10px] text-slate-500 font-medium">
                      {currentFocusStats.subLabel}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-kpu-maroon">
                    <AnimatedCounter value={currentFocusStats.percentage} decimals={1} suffix="%" />
                  </span>
                  <p className="text-[9px] text-slate-400">Progres</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-0.5 text-center">
                <div className="bg-slate-50 rounded-lg p-1 border border-slate-100">
                  <span className="text-[10px] text-slate-500 block">Total TPS</span>
                  <span className="font-extrabold text-slate-800 text-xs">
                    <AnimatedCounter value={currentFocusStats.totalTps} />
                  </span>
                </div>
                <div className="bg-emerald-50 rounded-lg p-1 border border-emerald-100">
                  <span className="text-[10px] text-emerald-700 block">Lengkap</span>
                  <span className="font-extrabold text-emerald-800 text-xs">
                    <AnimatedCounter value={currentFocusStats.completedTps} />
                  </span>
                </div>
                <div className="bg-amber-50 rounded-lg p-1 border border-amber-100">
                  <span className="text-[10px] text-amber-700 block">Anomali</span>
                  <span className="font-extrabold text-amber-800 text-xs">
                    <AnimatedCounter value={currentFocusStats.anomalyTps} />
                  </span>
                </div>
              </div>

              {selectedKecamatan !== 'ALL' && (
                <div className="pt-1 text-[10px] text-slate-500 flex items-center justify-between">
                  <span>Klik desa di peta untuk zoom detail</span>
                  <button
                    onClick={() => {
                      onSelectKecamatan('ALL');
                      onSelectDesa('ALL');
                    }}
                    className="text-kpu-maroon font-bold hover:underline cursor-pointer"
                  >
                    Kembali ke Sekadau
                  </button>
                </div>
              )}
            </div>
          </motion.div>

          {/* Floating Legend di Kanan Bawah */}
          <div className="absolute bottom-6 right-3 z-10 pointer-events-none hidden sm:block">
            <div className="pointer-events-auto bg-white/90 backdrop-blur-xs px-3 py-2 rounded-xl border border-slate-200/80 shadow-md text-[10px] space-y-1">
              <span className="font-bold text-slate-700 block text-[11px] mb-1">
                Keterangan Pin:
              </span>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                <span className="text-slate-600 font-medium">Lengkap (≥ 80%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span className="text-slate-600 font-medium">Sedang (30% - 79%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
                <span className="text-slate-600 font-medium">Rendah (&lt; 30%)</span>
              </div>
              <div className="flex items-center gap-1.5 pt-0.5 border-t border-slate-100">
                <span className="text-amber-600 font-bold">⚠️</span>
                <span className="text-slate-600 font-medium">Ada Berkas Anomali</span>
              </div>
            </div>
          </div>

          {/* Map Leaflet Container */}
          <div className="h-[380px] sm:h-[440px] w-full z-0">
            <MapContainer
              center={[SEKADAU_CENTER.lat, SEKADAU_CENTER.lng]}
              zoom={SEKADAU_DEFAULT_ZOOM}
              scrollWheelZoom={true}
              attributionControl={false}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer attribution={tileAttribution} url={tileUrl} />

              <MapFlyController
                kecamatan={selectedKecamatan}
                desa={selectedDesa}
                isCollapsed={isCollapsed}
              />

              {/* JIKA KECAMATAN BELUM DIPILIH (ALL): Tampilkan 7 Pin Kecamatan */}
              {selectedKecamatan === 'ALL' &&
                kecamatanData.map((k) => {
                  const coord = getKecamatanCoordinate(k.name);
                  if (!coord) return null;

                  const isSelected =
                    selectedKecamatan.toLowerCase() === k.name.toLowerCase();
                  const icon = createKecamatanPinIcon(
                    k.name,
                    k.percentage,
                    isSelected,
                    k.anomalyTps > 0
                  );

                  return (
                    <Marker
                      key={k.name}
                      position={[coord.lat, coord.lng]}
                      icon={icon}
                      eventHandlers={{
                        click: () => {
                          onSelectKecamatan(k.name);
                          onSelectDesa('ALL');
                        },
                      }}
                    >
                      <Tooltip direction="top" offset={[0, -48]} opacity={0.95}>
                        <div className="text-center font-bold">
                          Kecamatan {k.name}
                          <div className="text-[10px] font-normal text-slate-600">
                            Klik untuk membuka desa &amp; matriks
                          </div>
                        </div>
                      </Tooltip>
                      <Popup>
                        <div className="p-1 space-y-2 min-w-[190px]">
                          <div className="border-b border-slate-100 pb-1">
                            <span className="text-[10px] font-bold text-kpu-maroon uppercase tracking-wide">
                              Kecamatan
                            </span>
                            <h4 className="text-sm font-black text-slate-800">
                              {k.name}
                            </h4>
                          </div>

                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Kelengkapan:</span>
                              <span className="font-extrabold text-kpu-maroon">
                                {k.percentage.toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Total TPS:</span>
                              <span className="font-bold text-slate-800">{k.totalTps} TPS</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">TPS Lengkap 5/5:</span>
                              <span className="font-bold text-emerald-700">{k.completedTps} TPS</span>
                            </div>
                            {k.anomalyTps > 0 && (
                              <div className="flex justify-between text-amber-700 font-semibold">
                                <span>Anomali Berkas:</span>
                                <span>{k.anomalyTps} TPS</span>
                              </div>
                            )}
                          </div>

                          <Button
                            variant="maroon"
                            size="sm"
                            onClick={() => {
                              onSelectKecamatan(k.name);
                              onSelectDesa('ALL');
                              setTimeout(() => {
                                const el = document.getElementById('matriks-kelengkapan-section');
                                if (el) {
                                  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }
                              }, 100);
                            }}
                            className="w-full text-xs font-bold py-1 h-7 bg-kpu-maroon hover:bg-kpu-darkMaroon text-white mt-1"
                          >
                            <Building2 className="h-3 w-3 mr-1" />
                            <span>Pilih &amp; Telusuri di Matriks ↓</span>
                          </Button>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}

              {/* JIKA KECAMATAN SUDAH DIPILIH: Tampilkan Pin Desa-Desa di Kecamatan Tersebut */}
              {selectedKecamatan !== 'ALL' &&
                desaData.map((d) => {
                  const isSelected =
                    selectedDesa.toLowerCase() === d.name.toLowerCase();
                  const icon = createDesaPinIcon(
                    d.name,
                    d.percentage,
                    isSelected,
                    d.anomalyTps > 0
                  );

                  return (
                    <Marker
                      key={d.name}
                      position={[d.coords.lat, d.coords.lng]}
                      icon={icon}
                      eventHandlers={{
                        click: () => {
                          onSelectDesa(d.name);
                        },
                      }}
                    >
                      <Tooltip direction="top" offset={[0, -20]} opacity={0.95}>
                        <div className="text-center font-bold">
                          Desa {d.name}
                          <div className="text-[10px] font-normal text-slate-600">
                            {d.totalTps} TPS • {d.percentage.toFixed(0)}% Selesai
                          </div>
                        </div>
                      </Tooltip>
                      <Popup>
                        <div className="p-1 space-y-2 min-w-[190px]">
                          <div className="border-b border-slate-100 pb-1">
                            <span className="text-[10px] font-bold text-kpu-maroon uppercase tracking-wide">
                              Kec. {d.kecamatan}
                            </span>
                            <h4 className="text-sm font-black text-slate-800">
                              Desa {d.name}
                            </h4>
                          </div>

                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Progres Scan:</span>
                              <span className="font-extrabold text-kpu-maroon">
                                {d.percentage.toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Jumlah TPS:</span>
                              <span className="font-bold text-slate-800">{d.totalTps} TPS</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">TPS Lengkap 5/5:</span>
                              <span className="font-bold text-emerald-700">{d.completedTps} TPS</span>
                            </div>
                            {d.anomalyTps > 0 && (
                              <div className="flex justify-between text-amber-700 font-semibold">
                                <span>TPS Ada Anomali:</span>
                                <span>{d.anomalyTps} TPS</span>
                              </div>
                            )}
                          </div>

                          <Button
                            variant="gold"
                            size="sm"
                            onClick={() => {
                              onSelectDesa(d.name);
                              setTimeout(() => {
                                const el = document.getElementById('matriks-kelengkapan-section');
                                if (el) {
                                  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }
                              }, 100);
                            }}
                            className="w-full text-xs font-bold py-1 h-7 bg-kpu-gold hover:bg-amber-400 text-kpu-darkMaroon mt-1 shadow-xs"
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            <span>Tampilkan di Matriks ↓</span>
                          </Button>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
            </MapContainer>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </div>
  );
}
