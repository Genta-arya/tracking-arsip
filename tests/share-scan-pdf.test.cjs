const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const context=vm.createContext({exports:{},Error});
vm.runInContext(ts.transpileModule(fs.readFileSync('src/utils/shareScanPdf.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
const {shareScanPdf}=context.exports;
const file={name:'Arsip TPS 5.pdf',type:'application/pdf'};
test('shares the actual named PDF file through the native sheet for both destinations',async()=>{
 for(const destination of ['WhatsApp','Drive']){
  let shared;
  const result=await shareScanPdf(file,destination,{canShare:()=>true,share:async data=>{shared=data;}});
  assert.equal(result.status,'shared');assert.equal(shared.files[0],file);assert.equal(shared.title,file.name);
  assert.equal(shared.url,undefined,'a local blob URL is not a remote attachment');
 }
});
test('unsupported browser provides download instructions without pretending to send a file',async()=>{
 let called=false;
 const result=await shareScanPdf(file,'Drive',{canShare:()=>false,share:async()=>{called=true;}});
 assert.equal(result.status,'unsupported');assert.match(result.message,/Unduh PDF/);assert.equal(called,false);
});
test('cancelled sheet, rejected file and capability exceptions are handled',async()=>{
 const abort=new Error('cancel');abort.name='AbortError';
 assert.equal((await shareScanPdf(file,'WhatsApp',{canShare:()=>true,share:async()=>{throw abort;}})).status,'cancelled');
 assert.equal((await shareScanPdf(file,'WhatsApp',{canShare:()=>true,share:async()=>{throw new Error('file rejected');}})).status,'error');
 assert.equal((await shareScanPdf(file,'WhatsApp',{canShare:()=>{throw new Error('blocked');}})).status,'error');
});
