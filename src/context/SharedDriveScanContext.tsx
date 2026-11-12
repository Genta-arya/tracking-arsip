import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, subscribeAuthState } from '@/services/firebase';
import { DRIVE_SCAN_LEASE_MS, scanIsActive, type SharedDriveScan } from '@/services/driveScanLock';
const Context=createContext<{scan:SharedDriveScan|null;ready:boolean;error:string}>({scan:null,ready:false,error:''});
export function SharedDriveScanProvider({children}:{children:ReactNode}){
 const [scan,setScan]=useState<SharedDriveScan|null>(null),[ready,setReady]=useState(false),[error,setError]=useState('');
 const [now,setNow]=useState(Date.now());
 useEffect(()=>{if(!scan?.active)return;const timer=setTimeout(()=>setNow(Date.now()),Math.max(1,scan.updatedAt+DRIVE_SCAN_LEASE_MS-Date.now()+1));return()=>clearTimeout(timer);},[scan]);
 useEffect(()=>{let stop=()=>{};const authStop=subscribeAuthState(user=>{stop();setScan(null);setError('');setReady(false);if(!user){setReady(true);return;}stop=onSnapshot(doc(db,'app_config','drive_scan_lock'),{includeMetadataChanges:true},snap=>{const data=snap.data();setScan(data?{...data,startedAt:data.startedAt?.toMillis?.()||0,updatedAt:data.updatedAt?.toMillis?.()||Date.now()} as SharedDriveScan:null);setReady(!snap.metadata.fromCache);},()=>{setReady(false);setError('Status scan bersama belum tersedia. Periksa koneksi dan aturan Firestore terbaru.');});});return()=>{stop();authStop();};},[]);
 return <Context.Provider value={{scan:scanIsActive(scan,Math.max(now,Date.now()))?scan:null,ready,error}}>{children}</Context.Provider>;
}
export const useSharedDriveScan=()=>useContext(Context);
