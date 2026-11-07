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
  Layers,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { TPSRecord } from '@/types';
import {
  SEKADAU_CENTER,
  SEKADAU_DEFAULT_ZOOM,
  SEKADAU_BOUNDS,
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

// Koleksi Provider Tile Layer Peta Interaktif 100% Gratis & Tanpa API Key
export type MapLayerStyle = 'osm' | 'satellite' | 'hot';

interface MapLayerConfig {
  name: string;
  shortName: string;
  icon: string;
  url: string;
  attribution: string;
  subdomains: string;
}

const MAP_LAYERS: Record<MapLayerStyle, MapLayerConfig> = {
  osm: {
    name: 'OpenStreetMap (Gratis)',
    shortName: 'Peta Standar',
    icon: '🗺️',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    subdomains: 'abc',
  },
  satellite: {
    name: 'Citra Satelit Esri (Gratis)',
    shortName: 'Satelit',
    icon: '🛰️',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    subdomains: 'abc',
  },
  hot: {
    name: 'Humanitarian OSM (Kontras)',
    shortName: 'Kontras',
    icon: '🏞️',
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors, HOT',
    subdomains: 'abc',
  },
};

// Controller Leaflet untuk Navigasi Kamera Halus & Fit Bounds
function MapCameraController({
  kecamatan,
  desa,
  isCollapsed,
  isExpandedHeight,
}: {
  kecamatan: string;
  desa: string;
  isCollapsed: boolean;
  isExpandedHeight: boolean;
}) {
  const map = useMap();

  // Invalidate size agar tidak ada tile terpotong saat resize / collapse
  useEffect(() => {
    if (isCollapsed) return;
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 280);
    return () => clearTimeout(timer);
  }, [map, isCollapsed, isExpandedHeight]);

  // Kamera otomatis menyesuaikan filter
  useEffect(() => {
    if (isCollapsed) return;

    if (desa && desa !== 'ALL' && kecamatan && kecamatan !== 'ALL') {
      const coord = getDesaCoordinate(kecamatan, desa);
      if (coord) {
        map.flyTo([coord.lat, coord.lng], 14, {
          duration: 1.1,
          easeLinearity: 0.25,
        });
      }
    } else if (kecamatan && kecamatan !== 'ALL') {
      const kecCoord = getKecamatanCoordinate(kecamatan);
      if (kecCoord) {
        map.flyTo([kecCoord.lat, kecCoord.lng], kecCoord.zoom || 11.5, {
          duration: 1.1,
          easeLinearity: 0.25,
        });
      }
    } else {
      // Tampilkan seluruh batas geografis Sekadau
      map.flyToBounds(SEKADAU_BOUNDS, {
        padding: [35, 35],
        duration: 1.2,
      });
    }
  }, [kecamatan, desa, map, isCollapsed]);

  return null;
}

// Controller Tombol Zoom & Reset di Atas Peta
function CustomMapFloatingControls({
  onFitBounds,
}: {
  onFitBounds: () => void;
}) {
  const map = useMap();

  return (
    <div className="absolute top-3 right-3 z-[400] flex flex-col gap-1.5 pointer-events-auto">
      {/* Zoom In */}
      <button
        type="button"
        onClick={() => map.zoomIn()}
        title="Perbesar Peta"
        className="w-8 h-8 rounded-xl bg-white/95 hover:bg-white text-slate-800 font-black text-base flex items-center justify-center border border-slate-300/80 shadow-[0_3px_8px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.9)] active:translate-y-0.5 cursor-pointer transition-all"
      >
        +
      </button>

      {/* Zoom Out */}
      <button
        type="button"
        onClick={() => map.zoomOut()}
        title="Perkecil Peta"
        className="w-8 h-8 rounded-xl bg-white/95 hover:bg-white text-slate-800 font-black text-base flex items-center justify-center border border-slate-300/80 shadow-[0_3px_8px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.9)] active:translate-y-0.5 cursor-pointer transition-all"
      >
        −
      </button>

      {/* Fit Sekadau Bounds */}
      <button
        type="button"
        onClick={onFitBounds}
        title="Pusatkan Seluruh Wilayah Sekadau"
        className="w-8 h-8 rounded-xl bg-gradient-to-b from-[#8B0000] to-[#5a0000] text-amber-300 flex items-center justify-center border border-rose-900 shadow-[0_3px_8px_rgba(139,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.3)] active:translate-y-0.5 cursor-pointer transition-all"
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// Generator HTML Pin 3D Kecamatan - Dioptimalkan Sangat Ringan untuk Mobile
function createKecamatanPinIcon(
  name: string,
  percentage: number,
  completedTps: number,
  totalTps: number,
  isSelected: boolean,
  hasAnomaly: boolean
) {
  const isHigh = percentage >= 80;
  const isMedium = percentage >= 30;

  const theme = isHigh
    ? {
        topRim: 'from-emerald-400 to-emerald-600',
        orbBg: 'bg-emerald-600',
        badgeBg: 'bg-emerald-600',
      }
    : isMedium
    ? {
        topRim: 'from-amber-400 to-amber-600',
        orbBg: 'bg-amber-500',
        badgeBg: 'bg-amber-600',
      }
    : {
        topRim: 'from-rose-500 to-rose-700',
        orbBg: 'bg-rose-600',
        badgeBg: 'bg-rose-600',
      };

  const html = `
    <div class="map-pin-3d relative flex flex-col items-center cursor-pointer ${
      isSelected ? 'scale-105 z-50' : ''
    }" style="width: 144px;">
      <div class="w-full bg-white rounded-xl border ${
        isSelected
          ? 'border-amber-500 ring-2 ring-amber-400 shadow-lg'
          : 'border-slate-300 shadow-md'
      } overflow-hidden">
        <!-- Top Rim Bar -->
        <div class="h-1 bg-gradient-to-r ${theme.topRim}"></div>
        
        <div class="px-2 py-1.5 flex items-center justify-between gap-1.5 bg-white">
          <!-- Status Indicator Dot -->
          <span class="w-2.5 h-2.5 rounded-full ${theme.orbBg} shrink-0 border border-white shadow-2xs"></span>

          <!-- Kecamatan & TPS Details -->
          <div class="flex-1 min-w-0 text-left">
            <div class="text-[11px] font-black text-slate-800 truncate leading-tight">${name}</div>
            <div class="text-[9px] font-bold text-slate-500 flex items-center gap-1">
              <span>${completedTps}/${totalTps} TPS</span>
              ${hasAnomaly ? '<span class="text-amber-600 font-extrabold" title="Ada Berkas Anomali">⚠️</span>' : ''}
            </div>
          </div>

          <!-- Progress Badge -->
          <div class="px-1.5 py-0.5 rounded-md ${theme.badgeBg} text-white font-black text-[10px] shadow-xs flex items-center shrink-0">
            ${percentage.toFixed(0)}%
          </div>
        </div>
      </div>

      <!-- Beveled Pointer Arrow -->
      <div class="w-2.5 h-2.5 bg-white border-r border-b ${
        isSelected ? 'border-amber-500' : 'border-slate-300'
      } rotate-45 -mt-1.5 shadow-2xs"></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-leaflet-kec-pin',
    iconSize: [144, 48],
    iconAnchor: [72, 48],
    popupAnchor: [0, -48],
  });
}

// Generator HTML Pin 3D Desa - Dioptimalkan Ringan & Bebas Lag
function createDesaPinIcon(
  name: string,
  percentage: number,
  totalTps: number,
  isSelected: boolean,
  hasAnomaly: boolean
) {
  const isComplete = percentage >= 100;
  const isStarted = percentage > 0;

  const orbBg = isComplete
    ? 'bg-emerald-500'
    : isStarted
    ? 'bg-amber-500'
    : 'bg-rose-500';

  const textClass = isComplete
    ? 'text-emerald-700'
    : isStarted
    ? 'text-amber-700'
    : 'text-rose-700';

  const html = `
    <div class="map-pin-3d relative flex flex-col items-center cursor-pointer ${
      isSelected ? 'scale-110 z-50' : ''
    }" style="width: 96px;">
      <div class="w-full px-1.5 py-1 bg-white rounded-lg border ${
        isSelected
          ? 'border-amber-500 ring-2 ring-amber-400 shadow-md'
          : 'border-slate-300 shadow-xs'
      } flex items-center gap-1.5">
        <span class="w-2 h-2 rounded-full ${orbBg} shrink-0"></span>
        <div class="flex-1 min-w-0 text-left leading-tight">
          <div class="text-[9px] font-black text-slate-800 truncate">${name}</div>
          <div class="text-[8px] font-bold ${textClass}">${percentage.toFixed(0)}% • ${totalTps} TPS ${hasAnomaly ? '⚠️' : ''}</div>
        </div>
      </div>
      <div class="w-2 h-2 bg-white border-r border-b border-slate-300 rotate-45 -mt-1 shadow-2xs"></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-leaflet-desa-pin',
    iconSize: [96, 34],
    iconAnchor: [48, 34],
    popupAnchor: [0, -34],
  });
}

/**
 * SekadauInteractiveMap 3D Tactical Geospatial Deck
 * Visualisasi spasial wilayah C-Hasil Kabupaten Sekadau dengan kontrol multi-layer,
 * floating 3D tactical HUD, dan navigasi kamera fit-bounds cerdas.
 */
export function SekadauInteractiveMap({
  selectedKecamatan,
  selectedDesa,
  onSelectKecamatan,
  onSelectDesa,
  records,
}: SekadauInteractiveMapProps) {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isExpandedHeight, setIsExpandedHeight] = useState<boolean>(false);
  const [activeLayer, setActiveLayer] = useState<MapLayerStyle>('osm');

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

    // Inisialisasi 7 Kecamatan resmi Sekadau
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

    // Ambil koordinat desa terdaftar
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

    // Isikan data riil dari records TPS
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

  // Statistik area aktif yang sedang difokuskan
  const currentFocusStats = useMemo(() => {
    if (selectedDesa !== 'ALL' && selectedKecamatan !== 'ALL') {
      const matched = desaData.find(
        (d) => d.name.toLowerCase() === selectedDesa.toLowerCase()
      );
      return {
        label: `Desa ${selectedDesa}`,
        subLabel: `Kecamatan ${selectedKecamatan}`,
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

  // Global % untuk pill seluruh Sekadau
  const globalProgress = useMemo(() => {
    const totalTps = kecamatanData.reduce((acc, k) => acc + k.totalTps, 0);
    const validFiles = kecamatanData.reduce((acc, k) => acc + k.validFiles, 0);
    const expected = totalTps * 5;
    return expected > 0 ? (validFiles / expected) * 100 : 0;
  }, [kecamatanData]);

  const activeLayerConfig = MAP_LAYERS[activeLayer];

  return (
    <div className="bg-white/98 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-[0_16px_40px_-10px_rgba(15,23,42,0.1),0_4px_12px_rgba(15,23,42,0.04)] overflow-hidden transition-all duration-300 isolate relative z-0">
      {/* Specular Top Rim Highlight */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/60 to-transparent pointer-events-none" />

      {/* 1. Header Toolbar Peta */}
      <div className="px-4 py-3 bg-gradient-to-r from-slate-50/95 via-white to-amber-50/40 border-b border-slate-200/90 flex flex-wrap items-center justify-between gap-3 relative">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-b from-[#8B0000] to-[#5a0000] text-amber-300 flex items-center justify-center shadow-[0_3px_8px_rgba(139,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.25)] ring-1 ring-white/20 shrink-0">
            <Compass className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-800 tracking-tight">
                Peta Pantauan Wilayah C-Hasil Sekadau
              </h3>
              <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300/60 shadow-2xs">
                7 Kecamatan • 698 TPS
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
              Pantau progres real-time per wilayah. Klik pin di peta atau pilih tombol navigasi di bawah.
            </p>
          </div>
        </div>

        {/* Toolbar Tombol Aksi & Layer Selector */}
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          {/* Segmented Layer Style Selector */}
          <div className="flex items-center bg-slate-100/90 p-0.5 rounded-xl border border-slate-200/80 shadow-inner">
            {(Object.keys(MAP_LAYERS) as MapLayerStyle[]).map((layerKey) => {
              const cfg = MAP_LAYERS[layerKey];
              const isActive = activeLayer === layerKey;
              return (
                <button
                  key={layerKey}
                  type="button"
                  onClick={() => setActiveLayer(layerKey)}
                  title={`Ganti layer: ${cfg.name}`}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-[0_2px_4px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.9)]'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span className="text-xs">{cfg.icon}</span>
                  <span className="hidden lg:inline text-[11px]">{cfg.shortName}</span>
                </button>
              );
            })}
          </div>

          {/* Toggle Expand Height */}
          {!isCollapsed && (
            <button
              type="button"
              onClick={() => setIsExpandedHeight((prev) => !prev)}
              title={isExpandedHeight ? 'Kecilkan Tinggi Peta' : 'Perbesar Tinggi Peta'}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-gradient-to-b from-white to-slate-100 hover:from-slate-50 hover:to-slate-200 border border-slate-300/80 rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] active:translate-y-0.5 cursor-pointer transition-all"
            >
              {isExpandedHeight ? (
                <>
                  <Minimize2 className="h-3.5 w-3.5 text-slate-500" />
                  <span className="hidden md:inline">Standar</span>
                </>
              ) : (
                <>
                  <Maximize2 className="h-3.5 w-3.5 text-slate-500" />
                  <span className="hidden md:inline">Perbesar</span>
                </>
              )}
            </button>
          )}

          {/* Reset Zoom Button */}
          <button
            type="button"
            onClick={() => {
              onSelectKecamatan('ALL');
              onSelectDesa('ALL');
            }}
            title="Tampilkan seluruh Kabupaten Sekadau"
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-700 bg-gradient-to-b from-white to-slate-100 hover:from-slate-50 hover:to-slate-200 border border-slate-300/80 rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] active:translate-y-0.5 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] transition-all cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
            <span className="hidden sm:inline">Reset Wilayah</span>
          </button>

          {/* Toggle Sembunyikan / Buka Peta */}
          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-kpu-maroon bg-gradient-to-b from-rose-50 to-red-100/80 hover:from-red-100 hover:to-red-200/80 border border-red-200 rounded-xl shadow-[0_2px_5px_rgba(139,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.8)] active:translate-y-0.5 active:shadow-[inset_0_2px_4px_rgba(139,0,0,0.2)] transition-all cursor-pointer"
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

      {/* 2. Quick-Filter Bar 7 Kecamatan */}
      {!isCollapsed && (
        <div className="px-4 py-2 bg-gradient-to-r from-slate-100/90 via-slate-50 to-amber-50/30 border-b border-slate-200/90 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <Layers className="h-3 w-3 text-kpu-maroon" /> Navigasi Cepat:
          </span>

          {/* Seluruh Sekadau Pill */}
          <button
            type="button"
            onClick={() => {
              onSelectKecamatan('ALL');
              onSelectDesa('ALL');
            }}
            className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              selectedKecamatan === 'ALL'
                ? 'bg-gradient-to-b from-[#8B0000] to-[#5a0000] text-amber-300 shadow-[0_3px_8px_rgba(139,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.25)] ring-1 ring-amber-400/40 translate-y-[-1px]'
                : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 shadow-2xs'
            }`}
          >
            <span>Seluruh Sekadau</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px] font-bold">
              {globalProgress.toFixed(1)}%
            </span>
          </button>

          {/* 7 Kecamatan Pills */}
          {kecamatanData.map((k) => {
            const isSelected = selectedKecamatan.toLowerCase() === k.name.toLowerCase();
            const dotColor =
              k.percentage >= 80
                ? 'bg-emerald-500'
                : k.percentage >= 30
                ? 'bg-amber-500'
                : 'bg-rose-500';

            return (
              <button
                key={k.name}
                type="button"
                onClick={() => {
                  onSelectKecamatan(k.name);
                  onSelectDesa('ALL');
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-b from-amber-500 to-amber-600 text-amber-950 font-black shadow-[0_3px_8px_rgba(217,119,6,0.35),inset_0_1px_0_rgba(255,255,255,0.4)] ring-1 ring-amber-300 translate-y-[-1px]'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 shadow-2xs'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${dotColor}`}></span>
                <span>{k.name}</span>
                <span className="text-[10px] opacity-75">({k.percentage.toFixed(0)}%)</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 3. Isi Peta Interaktif (Collapsible) */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
            className="relative overflow-hidden"
          >
            {/* Floating HUD Statistik Lokasi (Kiri Atas) - Dioptimalkan Sangat Ringan untuk Mobile */}
            <div className="absolute top-2.5 left-2.5 z-[400] pointer-events-none max-w-xs sm:max-w-sm">
              {/* Tampilan Mobile: Chip Ringkas agar Peta Lega & Tidak Berat */}
              <div className="sm:hidden pointer-events-auto bg-white/95 px-3 py-1.5 rounded-xl border border-slate-200/90 shadow-md flex items-center gap-2 text-xs font-black text-slate-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                <span className="truncate max-w-[130px]">{currentFocusStats.label}</span>
                <span className="text-kpu-maroon font-black ml-auto shrink-0">
                  {currentFocusStats.percentage.toFixed(1)}%
                </span>
                {selectedKecamatan !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => {
                      onSelectKecamatan('ALL');
                      onSelectDesa('ALL');
                    }}
                    className="text-[10px] text-slate-500 font-bold ml-1 hover:text-rose-600 cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Tampilan Desktop: Full 3D HUD Card */}
              <div className="hidden sm:block pointer-events-auto bg-white/95 p-3 rounded-2xl border border-slate-200/90 shadow-lg text-xs space-y-2 transition-all">
                {/* Header HUD */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="w-6 h-6 rounded-lg bg-red-50 text-kpu-maroon border border-red-200/70 flex items-center justify-center shrink-0">
                      <MapPin className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-black text-slate-800 leading-tight truncate">
                        {currentFocusStats.label}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-medium truncate">
                        {currentFocusStats.subLabel}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-black text-kpu-maroon">
                      <AnimatedCounter value={currentFocusStats.percentage} decimals={1} suffix="%" />
                    </span>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Progres</p>
                  </div>
                </div>

                {/* Mini Cylindrical Progress Tube */}
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner border border-slate-200/60">
                  <div
                    className="h-full bg-gradient-to-r from-kpu-maroon via-amber-500 to-emerald-500 transition-all duration-500 rounded-full"
                    style={{ width: `${Math.min(100, Math.max(0, currentFocusStats.percentage))}%` }}
                  />
                </div>

                {/* 3 Metric Capsules */}
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <div className="bg-slate-50/90 rounded-xl p-1.5 border border-slate-200/80 shadow-2xs">
                    <span className="text-[9px] font-bold text-slate-500 block">Total TPS</span>
                    <span className="font-extrabold text-slate-800 text-xs">
                      <AnimatedCounter value={currentFocusStats.totalTps} />
                    </span>
                  </div>
                  <div className="bg-emerald-50/90 rounded-xl p-1.5 border border-emerald-200/80 shadow-2xs">
                    <span className="text-[9px] font-bold text-emerald-700 block">Lengkap 5/5</span>
                    <span className="font-extrabold text-emerald-800 text-xs">
                      <AnimatedCounter value={currentFocusStats.completedTps} />
                    </span>
                  </div>
                  <div className="bg-amber-50/90 rounded-xl p-1.5 border border-amber-200/80 shadow-2xs">
                    <span className="text-[9px] font-bold text-amber-700 block">Anomali</span>
                    <span className="font-extrabold text-amber-800 text-xs">
                      <AnimatedCounter value={currentFocusStats.anomalyTps} />
                    </span>
                  </div>
                </div>

                {/* Quick Link Kembali jika sedang di dalam Kecamatan */}
                {selectedKecamatan !== 'ALL' && (
                  <div className="pt-1 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectKecamatan('ALL');
                        onSelectDesa('ALL');
                      }}
                      className="text-[11px] font-bold text-kpu-maroon hover:text-kpu-darkMaroon hover:underline cursor-pointer"
                    >
                      ← Seluruh Sekadau
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById('matriks-kelengkapan-section');
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }}
                      className="text-[10px] font-bold text-amber-700 hover:text-amber-900 cursor-pointer"
                    >
                      Lihat di Matriks ↓
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Floating 3D Legend di Kanan Bawah */}
            <div className="absolute bottom-5 right-3 z-[400] pointer-events-none hidden sm:block">
              <div className="pointer-events-auto bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-200/90 shadow-md text-[10px] space-y-1">
                <span className="font-bold text-slate-700 block text-[11px] mb-1">
                  Keterangan Status Pin:
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-2xs"></span>
                  <span className="text-slate-600 font-medium">Lengkap (≥ 80%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-2xs"></span>
                  <span className="text-slate-600 font-medium">Sedang (30% - 79%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shadow-2xs"></span>
                  <span className="text-slate-600 font-medium">Rendah (&lt; 30%)</span>
                </div>
                <div className="flex items-center gap-1.5 pt-0.5 border-t border-slate-100">
                  <span className="text-amber-600 font-bold">⚠️</span>
                  <span className="text-slate-600 font-medium">Ada Berkas Anomali</span>
                </div>
              </div>
            </div>

            {/* Leaflet Map Canvas */}
            <div
              className={`w-full z-0 transition-[height] duration-300 ${
                isExpandedHeight ? 'h-[580px]' : 'h-[440px] sm:h-[480px]'
              }`}
            >
              <MapContainer
                center={[SEKADAU_CENTER.lat, SEKADAU_CENTER.lng]}
                zoom={SEKADAU_DEFAULT_ZOOM}
                scrollWheelZoom={true}
                attributionControl={false}
                style={{ height: '100%', width: '100%' }}
              >
                {/* Tile Layer yang dipilih */}
                <TileLayer
                  key={activeLayer}
                  attribution={activeLayerConfig.attribution}
                  url={activeLayerConfig.url}
                  subdomains={activeLayerConfig.subdomains}
                  maxZoom={19}
                  keepBuffer={3}
                  updateWhenIdle={true}
                  updateWhenZooming={false}
                />

                {/* Controller Navigasi Kamera & Resizing */}
                <MapCameraController
                  kecamatan={selectedKecamatan}
                  desa={selectedDesa}
                  isCollapsed={isCollapsed}
                  isExpandedHeight={isExpandedHeight}
                />

                {/* Floating Tactile Zoom & Fit Controls */}
                <CustomMapFloatingControls
                  onFitBounds={() => {
                    onSelectKecamatan('ALL');
                    onSelectDesa('ALL');
                  }}
                />

                {/* MODE 1: JIKA SELURUH KABUPATEN (ALL) -> Tampilkan 7 Pin Kecamatan 3D */}
                {selectedKecamatan === 'ALL' &&
                  kecamatanData.map((k) => {
                    const coord = getKecamatanCoordinate(k.name);
                    if (!coord) return null;

                    const isSelected =
                      selectedKecamatan.toLowerCase() === k.name.toLowerCase();
                    const icon = createKecamatanPinIcon(
                      k.name,
                      k.percentage,
                      k.completedTps,
                      k.totalTps,
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
                        <Tooltip direction="top" offset={[0, -56]} opacity={0.96}>
                          <div className="text-center font-bold">
                            Kecamatan {k.name}
                            <div className="text-[10px] font-normal text-slate-600">
                              {k.completedTps} dari {k.totalTps} TPS Siap • Klik untuk buka desa
                            </div>
                          </div>
                        </Tooltip>
                        <Popup>
                          <div className="p-1 space-y-2 min-w-[200px]">
                            <div className="border-b border-slate-100 pb-1">
                              <span className="text-[10px] font-bold text-kpu-maroon uppercase tracking-wide">
                                Wilayah Kecamatan
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
                              className="w-full text-xs font-bold py-1 h-7 bg-kpu-maroon hover:bg-kpu-darkMaroon text-white mt-1 shadow-xs"
                            >
                              <Building2 className="h-3 w-3 mr-1" />
                              <span>Pilih &amp; Telusuri di Matriks ↓</span>
                            </Button>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}

                {/* MODE 2: JIKA KECAMATAN DIPILIH -> Tampilkan Pin Desa-Desa */}
                {selectedKecamatan !== 'ALL' &&
                  desaData.map((d) => {
                    const isSelected =
                      selectedDesa.toLowerCase() === d.name.toLowerCase();
                    const icon = createDesaPinIcon(
                      d.name,
                      d.percentage,
                      d.totalTps,
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
                        <Tooltip direction="top" offset={[0, -38]} opacity={0.96}>
                          <div className="text-center font-bold">
                            Desa {d.name}
                            <div className="text-[10px] font-normal text-slate-600">
                              {d.totalTps} TPS • {d.percentage.toFixed(0)}% Selesai
                            </div>
                          </div>
                        </Tooltip>
                        <Popup>
                          <div className="p-1 space-y-2 min-w-[200px]">
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
