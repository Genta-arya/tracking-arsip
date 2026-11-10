const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const utilities = vm.createContext({ exports:{}, Date, Intl, Map });
vm.runInContext(ts.transpileModule(fs.readFileSync('src/utils/progressAnalytics.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,utilities);
const serviceSource=ts.createSourceFile('firebase.ts',fs.readFileSync('src/services/firebase.ts','utf8'),ts.ScriptTarget.Latest,true);
const fn=serviceSource.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name.text==='recordArchiveScanComparison').getText(serviceSource);
const compiled=ts.transpileModule(fn+'\nexports.recordArchiveScanComparison=recordArchiveScanComparison;',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function fixture({retry=false}={}) {
 const writes=[];let transactions=0;let reads=0;
 const snapshot=total=>({total,at:'2026-11-10T01:00:00Z',source:'Previous scan',rootFolderId:'root',metric:'active-files-v1'});
 const ctx=vm.createContext({exports:{},Date,Error,
  countActiveArchiveFiles:utilities.exports.countActiveArchiveFiles,nextArchiveComparison:utilities.exports.nextArchiveComparison,
  auth:{currentUser:{email:'staff'}},db:{},collection:()=> 'scanned_data',doc:()=> 'metadata',
  getDocs:async()=>({docs:[{ref:'district1'},{ref:'district2'}]}),
  runTransaction:async(db,callback)=>{
   for(let round=0;round<(retry?2:1);round++) {
    transactions++;reads=0;
    await callback({get:async ref=>{
     reads++;
     if(ref==='metadata')return{data:()=>({archiveComparison:{current:snapshot(round?52:50),previous:null}})};
     return{data:()=>({tpsList:[{files:ref==='district1'?Array.from({length:25},(_,id)=>({id})):Array.from({length:30},(_,id)=>({id})).concat([{id:'deleted',overrideElection:'HAPUS'},{id:'ignored',overrideElection:'IGNORE'}])}]})};
    },set:(ref,value,options)=>{assert.equal(reads,3,'all reads precede the write');writes.push({ref,value,options});}});
   }
  }
 });
 vm.runInContext(compiled,ctx);
 return{ctx,writes,getTransactions:()=>transactions};
}
test('browser captures whole-archive active totals after scan and merges only comparison field',async()=>{
 const {ctx,writes}=fixture();
 await ctx.exports.recordArchiveScanComparison('Manual scan','root');
 assert.equal(writes.length,1);
 assert.deepEqual(Object.keys(writes[0].value),['archiveComparison']);
 assert.equal(writes[0].value.archiveComparison.current.total,55);
 assert.equal(writes[0].value.archiveComparison.previous.total,50);
 assert.equal(writes[0].options.merge,true);
});
test('transaction retries rotate from newest baseline; auth/root missing never write a snapshot',async()=>{
 const {ctx,writes,getTransactions}=fixture({retry:true});
 await ctx.exports.recordArchiveScanComparison('Manual scan','root');
 assert.equal(getTransactions(),2);
 assert.equal(writes.at(-1).value.archiveComparison.previous.total,52);
 ctx.auth.currentUser=null;
 await assert.rejects(ctx.exports.recordArchiveScanComparison('Manual scan','root'),/Login/);
 ctx.auth.currentUser={};
 await assert.rejects(ctx.exports.recordArchiveScanComparison('Manual scan',''),/root/);
 assert.equal(writes.length,2);
});
