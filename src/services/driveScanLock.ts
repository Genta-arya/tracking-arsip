import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
export const DRIVE_SCAN_LEASE_MS = 180000;
export interface SharedDriveScan { active:boolean; token:string; actorUid:string; actorEmail:string; label:string; progress:number; updatedAt:number }
export function scanIsActive(scan:SharedDriveScan|null, now=Date.now()):boolean {return !!scan?.active && now-scan.updatedAt<DRIVE_SCAN_LEASE_MS;}
let pending=false;
let current: { token:string; label:string; progress:number; ensure:()=>Promise<void>; lost:boolean } | null=null;
const ref=()=>doc(db,'app_config','drive_scan_lock');
export async function ensureDriveScanOwned():Promise<void>{if(!current)throw new Error('Sesi scan tidak aktif. Mulai ulang scan.');await current.ensure();}
export function reportDriveScan(progress:number,label?:string):void {if(current){current.progress=Math.max(0,Math.min(100,Math.round(progress)));if(label)current.label=label;}}
export async function withDriveScan<T>(label:string,work:()=>Promise<T>):Promise<T>{
 if(pending||current)throw new Error('Scan lain sedang berjalan pada perangkat ini.');
 const user=auth.currentUser;if(!user)throw new Error('Login terlebih dahulu sebelum memindai Drive.');
 pending=true;
 const token=globalThis.crypto?.randomUUID?.() || `scan-${Date.now()}-${Math.random().toString(36).slice(2)}`;
 try {
  await runTransaction(db,async tx=>{
   const snap=await tx.get(ref()),value=snap.data();
   if(value?.active && Date.now()-(value.updatedAt?.toMillis?.() || 0)<DRIVE_SCAN_LEASE_MS)throw new Error(`Scan sedang dilakukan oleh ${value.actorEmail || 'perangkat lain'}. Tunggu hingga selesai.`);
   tx.set(ref(),{active:true,token,actorUid:user.uid,actorEmail:user.email || '',label,progress:0,updatedAt:serverTimestamp()});
  });
 } catch(error){pending=false;throw error;}
 pending=false;
 const lease={token,label,progress:0,lost:false,ensure:async()=>{}};
 let confirmedAt=Date.now();
 lease.ensure=async()=>{
  if(lease.lost)throw new Error('Kepemilikan scan berakhir. Hentikan dan mulai ulang setelah perangkat lain selesai.');
  if(Date.now()-confirmedAt<3000)return;
  try{await runTransaction(db,async tx=>{const snap=await tx.get(ref()),value=snap.data();if(!value?.active||value.token!==token)throw new Error('Scan telah beralih ke perangkat lain.');tx.update(ref(),{label:lease.label,progress:lease.progress,updatedAt:serverTimestamp()});});confirmedAt=Date.now();}
  catch(error){lease.lost=true;throw error;}
 };
 current=lease;
 const timer=setInterval(()=>{void lease.ensure().catch(()=>undefined);},25000);
 try{const result=await work();await lease.ensure();return result;}
 finally{
  clearInterval(timer);current=null;
  try{await runTransaction(db,async tx=>{const snap=await tx.get(ref());if(snap.data()?.token===token)tx.update(ref(),{active:false,updatedAt:serverTimestamp()});});}catch{/* Lease kedaluwarsa jika jaringan terputus. */}
 }
}
export function driveScanToken():string {if(!current || current.lost)throw new Error('Sesi scan sudah berakhir.');return current.token;}
