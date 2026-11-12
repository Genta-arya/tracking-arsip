import { MonitorSmartphone, UserRound, Clock } from 'lucide-react';
import type { SharedDriveScan } from '@/services/driveScanLock';
export function ActiveDriveScanDetails({scan}:{scan:SharedDriveScan}) {
 return <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
  <div className="flex flex-wrap items-center justify-between gap-2 font-bold"><span>Scan Drive sedang berjalan</span><span>{scan.progress}%</span></div>
  <p className="mt-1 text-[11px]">{scan.label} · Tunggu hingga selesai sebelum memulai scan baru.</p>
  <div className="mt-3 grid gap-2 text-[11px] sm:grid-cols-2"><div className="flex items-start gap-2"><UserRound className="h-4 w-4 shrink-0"/><div><strong>{scan.actorName || scan.actorEmail || 'Pengguna login'}</strong>{scan.actorName && scan.actorName!==scan.actorEmail&&<p>{scan.actorEmail}</p>}</div></div><div className="flex items-start gap-2"><MonitorSmartphone className="h-4 w-4 shrink-0"/><div><strong>{scan.deviceName || 'Perangkat belum dilaporkan'}</strong><p>{[scan.deviceType,scan.os,scan.browser].filter(Boolean).join(' · ')}</p></div></div></div>
  {!!scan.startedAt&&<p className="mt-2 flex items-center gap-2 text-[10px]"><Clock className="h-3 w-3"/>Mulai: {new Intl.DateTimeFormat('id-ID',{dateStyle:'medium',timeStyle:'medium',timeZone:'Asia/Jakarta'}).format(new Date(scan.startedAt))} WIB</p>}
  <details className="mt-2 text-[10px]"><summary className="cursor-pointer font-semibold">Detail perangkat & sesi</summary><div className="mt-2 space-y-1 break-all"><p>ID perangkat: {scan.deviceId || 'Tidak tersedia'}</p><p>ID sesi: {scan.token.slice(0,12)}</p><p>User agent: {scan.userAgent || 'Tidak tersedia'}</p><p>Alamat IP: tidak dikumpulkan oleh aplikasi.</p><p>Jenis perangkat dan browser berdasarkan informasi yang dilaporkan perangkat.</p></div></details>
 </div>;
}
