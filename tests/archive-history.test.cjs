const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source=fs.readFileSync('apps-script/Kode.gs','utf8');
const snapshot=(total)=>({total,at:'2026-11-10T01:00:00Z',source:'Scan',rootFolderId:'root',metric:'active-files-v1'});
function fixture({metadata={lastSyncedAt:'unchanged',archiveComparison:{current:snapshot(50),previous:null}},conflict=false,deny=false}={}) {
 let data=metadata,version=1,conflicted=false;const patches=[];
 const ctx=vm.createContext({Date,Number,JSON,Logger:{log(){}},UrlFetchApp:{fetch(url,options){
   if(options.method==='get') return response(data?{fields:ctx.jsonToFirestoreFields(data),updateTime:String(version)}:null,data?200:404);
   const query=new URL(url).searchParams;
   patches.push({query,options});
   if(deny)return response({},403);
   if(conflict&&!conflicted&&query.has('currentDocument.updateTime')) {
    conflicted=true;data.archiveComparison={current:snapshot(52),previous:null};version++;return response({},409);
   }
   if(query.has('currentDocument.updateTime')&&query.get('currentDocument.updateTime')!==String(version)) return response({},409);
   const payload=ctx.firestoreDocToJson(JSON.parse(options.payload));
   data={...data,...payload};version++;return response({},200);
 }}});
 function response(value,code){return{getResponseCode:()=>code,getContentText:()=>JSON.stringify(value)}}
 vm.runInContext(source,ctx);
 ctx.getConfig=()=> 'root';ctx.firestoreDocumentUrl=()=> 'https://firestore.googleapis.com/doc';
 return{ctx,patches,getData:()=>data};
}
test('GAS rotates 50 ->55 and unchanged snapshots without changing last-sync metadata',()=>{
 const {ctx,getData,patches}=fixture();
 const result=ctx.recordArchiveScanComparison('mock',55,'Audit');
 assert.equal(result.previous.total,50);assert.equal(result.current.total,55);
 assert.equal(getData().lastSyncedAt,'unchanged');
 assert.equal(patches[0].query.get('updateMask.fieldPaths'),'archiveComparison');
 const next=ctx.recordArchiveScanComparison('mock',55,'Audit');
 assert.equal(next.previous.total,55);
});
test('GAS conflict retry uses the newest comparison as baseline',()=>{
 const {ctx,patches}=fixture({conflict:true});
 const result=ctx.recordArchiveScanComparison('mock',55,'Audit');
 assert.equal(result.previous.total,52);assert.equal(patches.length,2);
});
test('first scan has no invented history, wrong-root baseline resets, denial is not success',()=>{
 const fresh=fixture({metadata:null});
 assert.equal(fresh.ctx.recordArchiveScanComparison('mock',0,'Audit').previous,null);
 assert.equal(fresh.patches[0].query.get('currentDocument.exists'),'false');
 const other=fixture({metadata:{archiveComparison:{current:{...snapshot(50),rootFolderId:'other'}}}});
 assert.equal(other.ctx.recordArchiveScanComparison('mock',55,'Audit').previous,null);
 const denied=fixture({deny:true});
 assert.throws(()=>denied.ctx.recordArchiveScanComparison('mock',55,'Audit'),/403/);
});
test('metadata updates merge only named fields, preserving stored comparison',()=>{
 const {ctx,getData,patches}=fixture();
 ctx.mergeFirestoreMetadata({lastSyncedAt:'new',lastSyncedBy:'Audit'},'mock');
 assert.equal(getData().archiveComparison.current.total,50);
 assert.deepEqual(patches[0].query.getAll('updateMask.fieldPaths'),['lastSyncedAt','lastSyncedBy']);
});
test('full background audit captures one active total even without changes; partial failure captures none',()=>{
 const {ctx}=fixture();let released=0;const captured=[];
 ctx.LockService={getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>released++})};
 ctx.listKecamatanFolders=()=>[{id:'1',name:'A'},{id:'2',name:'B'}];
 ctx.getFirebaseAuthToken=()=> 'mock';ctx.DriveApp={getFolderById:id=>({id})};
 ctx.auditSingleKecamatan=folder=>({changed:false,newCount:30,activeCount:folder.id==='1'?25:30});
 ctx.recordArchiveScanComparison=(token,total,source)=>captured.push({total,source});
 ctx.autoPushRecentFilesToFirestore();assert.equal(captured.length,1);assert.equal(captured[0].total,55);
 captured.length=0;
 ctx.auditSingleKecamatan=folder=>{if(folder.id==='2')throw Error('No access');return{changed:false,newCount:30,activeCount:25}};
 assert.throws(()=>ctx.autoPushRecentFilesToFirestore(),/belum lengkap/);
 assert.equal(captured.length,0);assert.equal(released,2);
});
