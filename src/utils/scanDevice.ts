export interface ScanDeviceInfo { deviceId:string; deviceName:string; deviceType:string; os:string; browser:string; userAgent:string }
const ID_KEY='archive-scan-device-id';
const NAME_KEY='archive-scan-device-name';
let fallbackId='';
export function describeScanDevice(userAgent:string, platform='', maxTouchPoints=0) {
 const ua=userAgent;
 const os=/Android/i.test(ua)?'Android':/iPad/i.test(ua)||platform==='MacIntel'&&maxTouchPoints>1?'iPadOS':/iPhone|iPod/i.test(ua)?'iOS':/Windows/i.test(ua)?'Windows':/Macintosh|Mac OS/i.test(ua)?'macOS':/Linux/i.test(ua)?'Linux':'OS tidak diketahui';
 const browser=/Edg(?:e|A|iOS)?\//i.test(ua)?'Edge':/OPR|Opera|OPiOS/i.test(ua)?'Opera':/Firefox|FxiOS/i.test(ua)?'Firefox':/SamsungBrowser/i.test(ua)?'Samsung Internet':/Chrome|CriOS/i.test(ua)?'Chrome':/Safari/i.test(ua)?'Safari':'Browser lain';
 const deviceType=os==='iPadOS'||/Tablet/i.test(ua)||os==='Android'&&!/Mobile/i.test(ua)?'Tablet':/Mobile|iPhone|iPod/i.test(ua)?'Ponsel':'Komputer';
 return {os,browser,deviceType};
}
export function currentScanDevice():ScanDeviceInfo {
 const nav=typeof navigator==='undefined'?null:navigator;
 const userAgent=(nav?.userAgent || '').slice(0,600);
 const info=describeScanDevice(userAgent,nav?.platform,nav?.maxTouchPoints);
 let deviceId=fallbackId,deviceName='';
 try {deviceId=localStorage.getItem(ID_KEY)||fallbackId;deviceName=localStorage.getItem(NAME_KEY)||'';}catch{/* Penyimpanan privat dapat dibatasi. */}
 if(!deviceId){deviceId=globalThis.crypto?.randomUUID?.() || `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;try{localStorage.setItem(ID_KEY,deviceId);}catch{/* Gunakan identitas sesi lokal. */}}
 fallbackId=deviceId;
 return {...info,userAgent,deviceId,deviceName:deviceName.trim().slice(0,60)||`${info.deviceType} ${info.os}`};
}
export function nameScanDevice(value:string):string {
 const name=value.trim().slice(0,60);
 try{localStorage.setItem(NAME_KEY,name);}catch{throw new Error('Browser tidak mengizinkan penyimpanan nama perangkat.');}
 return currentScanDevice().deviceName;
}
