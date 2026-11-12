import type { OverrideElectionType, RawFileItem, RawTpsData } from '../types';
export interface CorrectionState {
  overrideElection: OverrideElectionType | null;
  isResolved: boolean;
  resolutionNote: string;
}
export interface CorrectionAudit {
  id: string;
  actorUid: string;
  actorName: string;
  actorEmail: string;
  action: 'CORRECT' | 'REMOVE' | 'RESET' | 'RESTORE';
  kecamatan: string;
  desa: string;
  tpsFolderName: string;
  tpsFolderId: string;
  fileId: string;
  fileName: string;
  fileUrl: string;
  before: CorrectionState;
  after: CorrectionState;
  createdAt: string;
  legacy?: boolean;
}
export function correctionState(file: Pick<RawFileItem, 'overrideElection' | 'isResolved' | 'resolutionNote'>): CorrectionState {
  return { overrideElection:file.overrideElection || null, isResolved:!!file.isResolved, resolutionNote:file.resolutionNote || '' };
}
export function correctionAction(before: CorrectionState, after: CorrectionState): CorrectionAudit['action'] {
  if (!after.overrideElection && !after.isResolved) return before.overrideElection === 'HAPUS' ? 'RESTORE' : 'RESET';
  return after.overrideElection === 'HAPUS' ? 'REMOVE' : 'CORRECT';
}
export function correctionAuditPayload(tps: RawTpsData, file: RawFileItem, after: CorrectionState, actor: {uid:string;email:string;displayName:string|null}) {
  const before=correctionState(file);
  return {
    actorUid:actor.uid, actorName:actor.displayName || actor.email, actorEmail:actor.email,
    action:correctionAction(before,after), kecamatan:tps.kecamatan, desa:tps.desa,
    tpsFolderName:tps.tpsFolderName, tpsFolderId:tps.tpsFolderId,
    fileId:file.id, fileName:file.name, fileUrl:file.url, before, after,
  };
}
export const CORRECTION_LABELS: Record<string,string> = {
  PPWP:'Presiden & Wakil Presiden', DPR_RI:'DPR RI', DPD:'DPD', DPRD_PROV:'DPRD Provinsi', DPRD_KAB:'DPRD Kabupaten/Kota',
  HAPUS:'Dihapus / dipindahkan', IGNORE:'Diabaikan', SUDAH_DIBENARKAN:'Sudah dibenarkan',
};

/** Data lama hanya membuktikan koreksi terakhir, bukan seluruh urutan aktivitas. */
export function legacyCorrections(raw:RawTpsData[],overrides:Record<string,unknown>[],audited:CorrectionAudit[]):CorrectionAudit[]{
 const known=new Set(audited.map(row=>row.fileId)), files=new Map<string,{file:RawFileItem;tps:RawTpsData}>();
 for(const tps of raw)for(const file of tps.files)if(file.isResolved || file.overrideElection || file.resolvedAt)files.set(file.id,{file,tps});
 for(const value of overrides){
  const id=String(value.fileId || '');if(!id)continue;
  const current=files.get(id),tps=raw.find(t=>t.tpsFolderId===value.tpsFolderId);
  const file={...(current?.file || tps?.files.find(file=>file.id===id) || {id,name:`Berkas ${id}`,url:''}),...value,id} as RawFileItem;
  files.set(id,{file,tps:current?.tps || tps || {kecamatan:String(value.kecamatan || 'Tidak tercatat'),desa:String(value.desa || 'Tidak tercatat'),tpsFolderName:String(value.tpsFolderName || 'TPS tidak tercatat'),tpsFolderId:String(value.tpsFolderId || ''),tpsFolderUrl:'',files:[]}});
 }
 return [...files.values()].filter(({file})=>!known.has(file.id)).map(({file,tps})=>{
  const actor=typeof file.resolvedBy==='string'?file.resolvedBy:'';
  const date=file.resolvedAt && Number.isFinite(Date.parse(file.resolvedAt))?new Date(file.resolvedAt).toISOString():'';
  const after=correctionState(file);
  return {...correctionAuditPayload(tps,file,after,{uid:'',email:/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(actor)?actor:'',displayName:actor || 'Admin lama (identitas tidak tercatat)'}),before:correctionState({}),id:`legacy:${file.id}`,createdAt:date,legacy:true};
 });
}
