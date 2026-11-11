const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(source,globals={}){const ctx=vm.createContext({exports:{},Date,JSON,Error,...globals});vm.runInContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,ctx);return ctx.exports;}
const audit=load(fs.readFileSync('src/utils/correctionAudit.ts','utf8'));
const firebaseSource=fs.readFileSync('src/services/firebase.ts','utf8');
const service=firebaseSource.slice(firebaseSource.indexOf('export async function updateFileAnomalyStatus'),firebaseSource.indexOf('/** Riwayat append-only'));
const original={tpsList:[{kecamatan:'Sekadau Hilir',desa:'PENITI',tpsFolderName:'TPS 5',tpsFolderId:'tps',tpsFolderUrl:'',files:[{id:'file',name:'scan.pdf',url:'https://drive.google.com/file/d/file/view'}]}]};
function fixture({rejectAudit=false,email='teknis.kpusekadau@gmail.com'}={}){
 let stored=JSON.parse(JSON.stringify(original)),committed=[];
 const doc=(_db,col,id)=>typeof col==='string'?`${col}/${id}`:`${_db.path}/event`;
 const globals={auth:{currentUser:{uid:'admin',email,displayName:'Genta'}},ADMIN_AUTH_EMAIL:'teknis.kpusekadau@gmail.com',db:{},doc,collection:(_db,path)=>({path}),serverTimestamp:()=> 'SERVER_TIME',...audit,
 runTransaction:async(_db,handler)=>{const writes=[];await handler({get:async()=>({exists:()=>true,data:()=>JSON.parse(JSON.stringify(stored))}),set:(path,data)=>writes.push({op:'set',path,data}),update:(path,data)=>writes.push({op:'update',path,data}),delete:path=>writes.push({op:'delete',path})});if(rejectAudit&&writes.some(w=>w.path.startsWith('correction_history/')))throw Error('permission-denied');committed.push(...writes);const update=writes.find(w=>w.op==='update');if(update)stored=update.data;}};
 return {update:load(service,globals).updateFileAnomalyStatus,get committed(){return committed;},get stored(){return stored;}};
}
const params={kecamatan:'Sekadau Hilir',tpsFolderId:'tps',fileId:'file',overrideElection:'DPRD_PROV',isResolved:true,resolutionNote:'Kategori diperbaiki'};
test('correction, permanent override and immutable audit are committed together with before/after and actor',async()=>{
 const f=fixture();await f.update(params);
 const event=f.committed.find(w=>w.path.startsWith('correction_history/')).data;
 assert.equal(f.committed.length,3);assert.equal(event.actorEmail,'teknis.kpusekadau@gmail.com');assert.equal(event.actorName,'Genta');assert.equal(event.createdAt,'SERVER_TIME');assert.equal(event.before.overrideElection,null);assert.equal(event.after.overrideElection,'DPRD_PROV');assert.equal(event.fileName,'scan.pdf');assert.equal(event.desa,'PENITI');
 await f.update(params);assert.equal(f.committed.length,3,'identical saves do not add misleading history');
});
test('audit permission failure leaves original correction data unchanged and does not commit partial writes',async()=>{
 const f=fixture({rejectAudit:true});await assert.rejects(f.update(params),/permission-denied/);assert.equal(f.committed.length,0);assert.equal(f.stored.tpsList[0].files[0].overrideElection,undefined);
});
test('reset and restore are recorded, and missing files or non-admin callers cannot create history',async()=>{
 const f=fixture();await f.update({...params,overrideElection:'HAPUS'});await f.update({...params,overrideElection:undefined,isResolved:false,resolutionNote:undefined});
 const events=f.committed.filter(w=>w.path.startsWith('correction_history/'));assert.equal(events[1].data.action,'RESTORE');assert.equal(events[1].data.before.overrideElection,'HAPUS');assert.equal(events[1].data.after.isResolved,false);assert.ok(f.committed.some(w=>w.op==='delete'));
 await assert.rejects(f.update({...params,fileId:'missing'}),/tidak ditemukan/);
 await assert.rejects(fixture({email:'staff@example.com'}).update(params),/Admin Teknis/);
});
