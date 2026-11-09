import type {
  ElectionType,
  AnomalyItem,
  ScannedFile,
  RawTpsData,
  TPSRecord,
} from '../types/index.ts';
import { MOCK_DESA_MAP } from '../data/mockSekadauData.ts';

/**
 * Membersihkan ekstensi file dan karakter non-esensial untuk parsing
 */
export function cleanFileName(fileName: string): string {
  return fileName
    .replace(/\.[a-zA-Z0-9]+$/, '') // hapus ekstensi (.pdf, .jpg, dll)
    .replace(/[_\-]+/g, ' ')         // ganti underscore/strip dengan spasi
    .replace(/([a-zA-Z])(\d+)/g, '$1 $2') // pisahkan huruf dan angka (misal pres01 -> pres 01)
    .replace(/(\d+)([a-zA-Z])/g, '$1 $2') // pisahkan angka dan huruf (misal 01pres -> 01 pres)
    .replace(/\s+/g, ' ')           // hapus spasi berlebih
    .trim();
}

/**
 * Ekstrak angka TPS dari nama folder TPS (misal: "TPS 01" -> 1, "TPS 12" -> 12, "05" -> 5)
 */
export function extractTpsNumber(name: string): number {
  const match = name.match(/tps\s*(\d+)/i);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  const numOnly = name.match(/^0*(\d{1,3})$/);
  if (numOnly && numOnly[1]) {
    return parseInt(numOnly[1], 10);
  }
  return 0;
}

/**
 * Ekstrak angka TPS dari nama berkas (hanya jika eksplisit memuat kata kunci TPS)
 * Menghindari false positive dari angka tahun (2024), halaman (hal 1), dll.
 */
export function extractFileTpsNumber(cleanName: string): number {
  // Pola 1: "TPS 01", "TPS 1", "TPS_05", "TPS-3", "TPS.2"
  const tpsMatch = cleanName.match(/\btps[\s\-_.]*0*(\d{1,3})\b/i);
  if (tpsMatch && tpsMatch[1]) {
    return parseInt(tpsMatch[1], 10);
  }

  // Pola 2: "No TPS 01", "Nomor TPS 2"
  const noMatch = cleanName.match(/\bno(?:mor|\.)?[\s\-_.]*tps[\s\-_.]*0*(\d{1,3})\b/i);
  if (noMatch && noMatch[1]) {
    return parseInt(noMatch[1], 10);
  }

  return 0;
}

/**
 * Smart Regex Parser untuk mengklasifikasikan nama file ke dalam 5 Jenis Pemilihan
 */
export function detectElectionCategory(cleanName: string): {
  type: ElectionType | 'UNKNOWN';
  isAmbiguousDprd?: boolean;
} {
  const lower = cleanName.toLowerCase();

  // 1. Presiden & Wakil Presiden (PPWP)
  if (/\b(presiden|ppwp|pilpres|capres|wapres|pres|press|presss|presi|preside|presidesi|presidesn|presidenn|presidesien|presidesienn)\b/i.test(lower)) {
    return { type: 'PPWP' };
  }

  // 2. DPR RI (Prioritas sebelum DPD agar tidak bentrok)
  if (/dpr[\s\-_]*ri|dprri|\bdpr\b(?!\s*d)/i.test(lower)) {
    return { type: 'DPR_RI' };
  }

  // 3. DPD RI
  if (/\bdpd\b|dpd[\s\-_]*ri/i.test(lower)) {
    return { type: 'DPD' };
  }

  // 4. DPRD Provinsi vs DPRD Kabupaten/Kota
  const hasDprd = /\bdprd\b/i.test(lower);
  const hasProv = /prov|provinsi|kalbar|kalimantan\s*barat|tk[\s\-_]*1|tk[\s\-_]*i\b|dprd[\s\-_]*1|dprd[\s\-_]*i\b/i.test(lower);
  const hasKab = /kab|kabko|kab\/ko|kabupaten|sekadau|tk[\s\-_]*2|tk[\s\-_]*ii\b|dprd[\s\-_]*2|dprd[\s\-_]*ii\b/i.test(lower);

  if (hasDprd) {
    if (hasProv && !hasKab) {
      return { type: 'DPRD_PROV' };
    }
    if (hasKab && !hasProv) {
      return { type: 'DPRD_KAB' };
    }
    if (hasProv && hasKab) {
      // Jika tertulis keduanya, prioritaskan kata yang paling dekat dengan kata 'dprd'
      const provIdx = lower.indexOf('prov');
      const kabIdx = lower.indexOf('kab');
      return provIdx < kabIdx ? { type: 'DPRD_PROV' } : { type: 'DPRD_KAB' };
    }
    // Operator hanya mengetik "DPRD" tanpa keterangan Prov atau Kab
    return { type: 'UNKNOWN', isAmbiguousDprd: true };
  }

  // Cek jika operator lupa mengetik kata "DPRD" tapi menulis "Provinsi" atau "Kabupaten/Sekadau"
  if (hasProv && !hasKab) {
    return { type: 'DPRD_PROV' };
  }
  if (hasKab && !hasProv) {
    return { type: 'DPRD_KAB' };
  }

  return { type: 'UNKNOWN' };
}

// Kumpulan seluruh 87 nama resmi desa di Kabupaten Sekadau, diurutkan dari nama terpanjang
const ALL_SEKADAU_DESA_NAMES: string[] = Array.from(
  new Set(Object.values(MOCK_DESA_MAP).flat())
).sort((a, b) => b.length - a.length);

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Normalisasi nama desa: hilangkan kata 'desa/kelurahan/ds', samakan format angka (1 -> satu)
 */
export function normalizeDesaName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\b(desa|kelurahan|kel|ds)\b\.?/gi, ' ')
    .replace(/[_\-]+/g, ' ')
    .replace(/\b1\b/g, 'satu')
    .replace(/\b2\b/g, 'dua')
    .replace(/\b3\b/g, 'tiga')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Deteksi jika berkas berada di folder desa yang salah (Salah Kamar Desa / Mismatch Desa)
 */
export function detectMismatchDesa(
  cleanName: string,
  expectedDesaName: string
): { isMismatch: boolean; detectedDesaName?: string; message?: string } {
  if (!expectedDesaName || expectedDesaName.trim() === '') {
    return { isMismatch: false };
  }

  const expectedNorm = normalizeDesaName(expectedDesaName);
  const cleanNorm = normalizeDesaName(cleanName);

  // Jika nama file sudah memuat nama desa yang diharapkan, berkas sah dan tidak salah kamar
  if (expectedNorm.length > 1 && cleanNorm.includes(expectedNorm)) {
    return { isMismatch: false };
  }

  // Pola 1: Eksplisit kata kunci "Desa <Nama>" atau "Ds. <Nama>" atau "Kelurahan <Nama>"
  const desaKeywordMatch = cleanName.match(
    /\b(?:desa|kelurahan|kel|ds)\b\.?\s*([a-zA-Z0-9]+(?:\s+[a-zA-Z0-9]+)?)/i
  );
  if (desaKeywordMatch && desaKeywordMatch[1]) {
    const rawExtracted = desaKeywordMatch[1].trim();
    // Abaikan jika kata berikutnya adalah kata kunci pemilihan / tps (misal: "desa tps 01" atau "desa ppwp")
    if (!/^(tps|ppwp|dpr|dpd|dprd|hasil|salinan|c1|c[\s\-_.]*hasil)/i.test(rawExtracted)) {
      const extractedNorm = normalizeDesaName(rawExtracted);
      if (extractedNorm && extractedNorm !== expectedNorm) {
        return {
          isMismatch: true,
          detectedDesaName: rawExtracted,
          message: `Terdeteksi nama "Desa ${rawExtracted}", padahal berada di folder Desa "${expectedDesaName}"`,
        };
      }
    }
  }

  // Pola 2: Cocokkan dengan daftar seluruh nama resmi desa di Kabupaten Sekadau
  for (const knownDesa of ALL_SEKADAU_DESA_NAMES) {
    const knownNorm = normalizeDesaName(knownDesa);
    // Lewati jika desa yang cocok adalah desa yang memang diharapkan
    if (knownNorm === expectedNorm) continue;

    // Cek keberadaan nama desa dengan batas kata (word boundary)
    const regex = new RegExp(`\\b${escapeRegExp(knownNorm)}\\b`, 'i');
    if (regex.test(cleanNorm)) {
      return {
        isMismatch: true,
        detectedDesaName: knownDesa,
        message: `Terdeteksi nama Desa "${knownDesa}", padahal berada di folder Desa "${expectedDesaName}"`,
      };
    }
  }

  return { isMismatch: false };
}

/**
 * Deteksi Anomali pada file scan
 */
export function analyzeFileAnomalies(
  rawFileName: string,
  expectedTpsNumber: number,
  expectedDesaName: string
): { detectedType: ElectionType | 'UNKNOWN'; anomalies: AnomalyItem[] } {
  const anomalies: AnomalyItem[] = [];
  const cleaned = cleanFileName(rawFileName);
  const { type, isAmbiguousDprd } = detectElectionCategory(cleaned);

  // Anomali 1: DPRD Ambigu (tanpa Prov/Kab)
  if (isAmbiguousDprd) {
    anomalies.push({
      type: 'DPRD_AMBIGUOUS',
      message: 'Hanya tertulis "DPRD", belum jelas Provinsi atau Kabupaten',
      fileName: rawFileName,
    });
  }

  // Anomali 2: Nama File Tidak Dikenali / Format Acak
  if (type === 'UNKNOWN' && !isAmbiguousDprd) {
    anomalies.push({
      type: 'UNKNOWN_FORMAT',
      message: 'Nama berkas tidak memuat kata kunci 5 jenis pemilihan (Presiden/DPR/DPD/DPRD)',
      fileName: rawFileName,
    });
  }

  // Anomali 3: Salah Kamar Nomor TPS (Mismatch TPS)
  // Hanya dipicu jika nama file secara eksplisit menyatakan nomor TPS yang berbeda
  const fileTpsNumber = extractFileTpsNumber(cleaned);
  if (fileTpsNumber > 0 && expectedTpsNumber > 0 && fileTpsNumber !== expectedTpsNumber) {
    anomalies.push({
      type: 'MISMATCH_TPS',
      message: `Terdeteksi angka TPS ${fileTpsNumber}, padahal berada di folder TPS ${expectedTpsNumber}`,
      fileName: rawFileName,
    });
  }

  // Anomali 4: Salah Kamar / Folder Desa (Mismatch Desa)
  const desaCheck = detectMismatchDesa(cleaned, expectedDesaName);
  if (desaCheck.isMismatch && desaCheck.message) {
    anomalies.push({
      type: 'MISMATCH_DESA',
      message: desaCheck.message,
      fileName: rawFileName,
    });
  }

  return {
    detectedType: type,
    anomalies,
  };
}

/**
 * Memproses data mentah TPS dari Drive / Mock menjadi TPSRecord terstruktur
 */
export function processRawTps(raw: RawTpsData): TPSRecord {
  const tpsNumber = extractTpsNumber(raw.tpsFolderName);
  const scannedFiles: ScannedFile[] = [];
  const tpsAnomalies: AnomalyItem[] = [];

  // Slot 5 Pemilihan
  let slotPPWP: ScannedFile | null = null;
  let slotDPR_RI: ScannedFile | null = null;
  let slotDPD: ScannedFile | null = null;
  let slotDPRD_PROV: ScannedFile | null = null;
  let slotDPRD_KAB: ScannedFile | null = null;

  // Analisis setiap berkas di dalam folder
  raw.files.forEach((file) => {
    const { detectedType, anomalies } = analyzeFileAnomalies(
      file.name,
      tpsNumber,
      raw.desa
    );

    let finalElection = detectedType;
    let finalAnomalies = [...anomalies];

    const isHapus = file.overrideElection === 'HAPUS';

    if (isHapus) {
      // Kasus berkas dihapus / dipindahkan dari folder TPS ini (misal salah kamar / berkas ganda yang sudah dipindahkan)
      // Ditandai sebagai teratasi, tidak memiliki anomali aktif, tidak dimasukkan ke 5 slot,
      // dan tidak memicu duplikasi bagi berkas sah lainnya di TPS ini.
      const deletedScannedFile: ScannedFile = {
        id: file.id,
        name: file.name,
        url: file.url,
        size: file.size,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
        uploader: file.uploader,
        detectedElection: 'UNKNOWN',
        anomalies: [],
        overrideElection: 'HAPUS',
        isResolved: true,
        resolutionNote: file.resolutionNote || 'Berkas dihapus / dipindahkan dari folder ini (anomali sudah difix)',
        resolvedAt: file.resolvedAt,
        resolvedBy: file.resolvedBy,
      };

      scannedFiles.push(deletedScannedFile);
      return;
    }

    // Jika file sudah diperbaiki / ditetapkan oleh admin teknis (termasuk SUDAH_DIBENARKAN):
    if (file.isResolved || (file.overrideElection && file.overrideElection !== 'IGNORE')) {
      if (file.overrideElection && file.overrideElection !== 'IGNORE' && file.overrideElection !== 'SUDAH_DIBENARKAN') {
        finalElection = file.overrideElection as ElectionType;
      }
      // Hapus seluruh anomali format/penamaan/duplikat karena sudah divalidasi dan diperbaiki oleh admin
      finalAnomalies = [];
    }

    const scannedFile: ScannedFile = {
      id: file.id,
      name: file.name,
      url: file.url,
      size: file.size,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
      uploader: file.uploader,
      detectedElection: finalElection,
      anomalies: finalAnomalies,
      overrideElection: file.overrideElection,
      isResolved: true,
      resolutionNote: file.resolutionNote,
      resolvedAt: file.resolvedAt,
      resolvedBy: file.resolvedBy,
    };

    scannedFiles.push(scannedFile);
    if (finalAnomalies.length > 0) {
      tpsAnomalies.push(...finalAnomalies);
    }

    // Mapping ke slot pemilihan & deteksi berkas ganda (Duplicate)
    switch (finalElection) {
      case 'PPWP':
        if (slotPPWP) {
          const dupAnomaly: AnomalyItem = {
            type: 'DUPLICATE',
            message: `Berkas ganda untuk Presiden (PPWP): "${file.name}" dan "${slotPPWP.name}"`,
            fileName: file.name,
          };
          scannedFile.anomalies.push(dupAnomaly);
          tpsAnomalies.push(dupAnomaly);
        } else {
          slotPPWP = scannedFile;
        }
        break;

      case 'DPR_RI':
        if (slotDPR_RI) {
          const dupAnomaly: AnomalyItem = {
            type: 'DUPLICATE',
            message: `Berkas ganda untuk DPR RI: "${file.name}" dan "${slotDPR_RI.name}"`,
            fileName: file.name,
          };
          scannedFile.anomalies.push(dupAnomaly);
          tpsAnomalies.push(dupAnomaly);
        } else {
          slotDPR_RI = scannedFile;
        }
        break;

      case 'DPD':
        if (slotDPD) {
          const dupAnomaly: AnomalyItem = {
            type: 'DUPLICATE',
            message: `Berkas ganda untuk DPD RI: "${file.name}" dan "${slotDPD.name}"`,
            fileName: file.name,
          };
          scannedFile.anomalies.push(dupAnomaly);
          tpsAnomalies.push(dupAnomaly);
        } else {
          slotDPD = scannedFile;
        }
        break;

      case 'DPRD_PROV':
        if (slotDPRD_PROV) {
          const dupAnomaly: AnomalyItem = {
            type: 'DUPLICATE',
            message: `Berkas ganda untuk DPRD Provinsi: "${file.name}" dan "${slotDPRD_PROV.name}"`,
            fileName: file.name,
          };
          scannedFile.anomalies.push(dupAnomaly);
          tpsAnomalies.push(dupAnomaly);
        } else {
          slotDPRD_PROV = scannedFile;
        }
        break;

      case 'DPRD_KAB':
        if (slotDPRD_KAB) {
          const dupAnomaly: AnomalyItem = {
            type: 'DUPLICATE',
            message: `Berkas ganda untuk DPRD Kab/Ko: "${file.name}" dan "${slotDPRD_KAB.name}"`,
            fileName: file.name,
          };
          scannedFile.anomalies.push(dupAnomaly);
          tpsAnomalies.push(dupAnomaly);
        } else {
          slotDPRD_KAB = scannedFile;
        }
        break;
    }
  });

  // Hitung jumlah slot terisi
  let completedCount = 0;
  if (slotPPWP) completedCount++;
  if (slotDPR_RI) completedCount++;
  if (slotDPD) completedCount++;
  if (slotDPRD_PROV) completedCount++;
  if (slotDPRD_KAB) completedCount++;

  return {
    id: `${raw.kecamatan}-${raw.desa}-${raw.tpsFolderName}`,
    kecamatan: raw.kecamatan,
    desa: raw.desa,
    tpsNumber,
    tpsFolderName: raw.tpsFolderName,
    tpsFolderId: raw.tpsFolderId,
    tpsFolderUrl: raw.tpsFolderUrl,
    files: scannedFiles,
    slotPPWP,
    slotDPR_RI,
    slotDPD,
    slotDPRD_PROV,
    slotDPRD_KAB,
    completedCount,
    isComplete: completedCount === 5,
    hasAnomaly: tpsAnomalies.length > 0,
    anomalies: tpsAnomalies,
  };
}

/**
 * Natural Sort Comparator untuk TPS: mengurutkan TPS 1, TPS 2, ..., TPS 10 secara numerik akurat
 */
export function naturalSortTpsComparator(a: TPSRecord, b: TPSRecord): number {
  if (a.kecamatan !== b.kecamatan) {
    return a.kecamatan.localeCompare(b.kecamatan, 'id', { sensitivity: 'base' });
  }
  if (a.desa !== b.desa) {
    return a.desa.localeCompare(b.desa, 'id', { sensitivity: 'base' });
  }
  if (a.tpsNumber !== b.tpsNumber) {
    return a.tpsNumber - b.tpsNumber;
  }
  return a.tpsFolderName.localeCompare(b.tpsFolderName, 'id', { numeric: true });
}
