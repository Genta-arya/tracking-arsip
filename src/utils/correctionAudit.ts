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
