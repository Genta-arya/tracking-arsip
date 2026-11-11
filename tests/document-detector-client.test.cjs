const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function fixture() {
 let worker;
 class Worker {
  constructor() { worker=this; this.messages=[]; }
  postMessage(data){this.messages.push(data);}
  terminate(){this.terminated=true;}
 }
 const context=vm.createContext({exports:{},Worker,URL,setTimeout,clearTimeout,document:{createElement:()=>({getContext:()=>({drawImage(){},getImageData:()=>({width:2,height:2,data:new Uint8ClampedArray(16)})})})}});
 const source=fs.readFileSync('src/utils/documentDetectorClient.ts','utf8').replace('import.meta.url',JSON.stringify('https://example.com/app.js'));
 vm.runInContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
 const detector=new context.exports.DocumentDetector();
 return {detector,worker};
}
test('camera and photo requests wait for runtime readiness and receive their own corners',async()=>{
 const {detector,worker}=fixture();
 const first=detector.detect({},2,2);assert.equal(worker.messages.length,0);
 worker.onmessage({data:{ready:true}});await new Promise(r=>setImmediate(r));
 const second=detector.detect({},2,2);await new Promise(r=>setImmediate(r));
 assert.equal(worker.messages.length,2);
 const [a,b]=worker.messages;
 worker.onmessage({data:{id:b.id,corners:null}});
 worker.onmessage({data:{id:a.id,corners:'first-frame'}});
 assert.equal(await first,'first-frame');assert.equal(await second,null);
 detector.dispose();assert.ok(worker.terminated);
});
test('closing scanner cancels initialization and rejects pending detection rather than hanging',async()=>{
 const {detector,worker}=fixture();const pending=detector.detect({},2,2);
 detector.dispose();await assert.rejects(pending,/ditutup/);assert.ok(worker.terminated);
});
test('worker load failure is reported instead of silently claiming no paper was found',async()=>{
 const {detector,worker}=fixture();const pending=detector.detect({},2,2);
 worker.onerror();await assert.rejects(pending,/tidak tersedia/);detector.dispose();
});
