const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const source=ts.transpileModule(fs.readFileSync('src/services/driveScanLock.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function fixture(){let data,clock=1_000_000,queue=Promise.resolve(),seq=0;
 const firestore={doc:()=> 'lock',serverTimestamp:()=>{const at=clock;return{toMillis:()=>at};},runTransaction:async(_db,body)=>{
  const run=queue.then(async()=>{let next=data;await body({get:async()=>({data:()=>data}),set:(_ref,value)=>{next=value;},update:(_ref,value)=>{next={...data,...value};}});data=next;});queue=run.catch(()=>{});return run;
 }};
 function device(){const exports={};const ctx=vm.createContext({exports,Date:class extends Date{static now(){return clock;}},Math,Error,Promise,crypto:{randomUUID:()=>`session-${++seq}`},setInterval:()=>1,clearInterval(){},require:name=>name.includes('scanDevice')?{currentScanDevice:()=>({deviceId:'device',deviceName:'Admin tablet',deviceType:'Tablet',os:'Android',browser:'Chrome',userAgent:'test'})}:name==='firebase/firestore'?firestore:{auth:{currentUser:{uid:'shared-admin',email:'admin@example.com'}},db:{}}});vm.runInContext(source,ctx);return ctx.exports;}
 return {device,get data(){return data;},advance:ms=>{clock+=ms;}};
}
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};};
test('two devices with the same admin UID cannot scan simultaneously',async()=>{
 const f=fixture(),a=f.device(),b=f.device(),hold=deferred(),started=deferred();let calls=0;
 const first=a.withDriveScan('A',async()=>{calls++;started.resolve();await hold.promise;});await started.promise;
 await assert.rejects(b.withDriveScan('B',async()=>{calls++;}),/Scan sedang dilakukan/);assert.equal(calls,1);
 hold.resolve();await first;assert.equal(f.data.active,false);
 await b.withDriveScan('B',async()=>{calls++;});assert.equal(calls,2);
});
test('expired ownership cannot renew or clear the replacement scan session',async()=>{
 const f=fixture(),a=f.device(),b=f.device(),holdA=deferred(),holdB=deferred(),readyA=deferred(),readyB=deferred();
 const first=a.withDriveScan('A',async()=>{readyA.resolve();await holdA.promise;await assert.rejects(a.ensureDriveScanOwned(),/beralih/);});await readyA.promise;
 f.advance(180001);
 const second=b.withDriveScan('B',async()=>{readyB.resolve();await holdB.promise;});await readyB.promise;const token=f.data.token;
 holdA.resolve();await assert.rejects(first,/berakhir|beralih/);assert.equal(f.data.token,token);assert.equal(f.data.active,true);
 holdB.resolve();await second;assert.equal(f.data.active,false);
});
test('rejected work releases the session for another device',async()=>{
 const f=fixture(),a=f.device();await assert.rejects(a.withDriveScan('error',async()=>{throw Error('GAS failed');}),/GAS failed/);
 assert.equal(f.data.active,false);await f.device().withDriveScan('retry',async()=>{});
});
test('GAS router scans without adding a script lock',()=>{
 let reads=0;
 const ctx=vm.createContext({LockService:{getScriptLock:()=>{throw Error('router must not lock');}},DriveApp:{getFolderById:()=>{reads++;return{getName:()=> 'Kec'};}}});
 vm.runInContext(fs.readFileSync('apps-script/Kode.gs','utf8'),ctx);ctx.responseJSON=value=>value;ctx.readKecamatanData=()=>[];
 const result=ctx.doGet({parameter:{action:'scanKecamatan',folderId:'kec'}});assert.equal(result.status,'success');assert.equal(reads,1);
});
