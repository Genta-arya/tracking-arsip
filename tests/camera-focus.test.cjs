const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const context=vm.createContext({exports:{}});
vm.runInContext(ts.transpileModule(fs.readFileSync('src/utils/cameraFocus.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
const {viewToCamera,cameraToView,focusCameraTrack}=context.exports;
test('cover projection maps taps and document overlays consistently in portrait and landscape',()=>{
 for(const source of [{width:1920,height:1080},{width:720,height:1280}])for(const view of [{width:390,height:844},{width:844,height:390}])for(const point of [{x:0.2,y:0.8},{x:0.5,y:0.5},{x:1,y:0}]){
  const sensor=viewToCamera(point,source,view),back=cameraToView(sensor,source,view);
  assert.ok(sensor.x>=0&&sensor.x<=1&&sensor.y>=0&&sensor.y<=1);
  assert.ok(Math.abs(point.x-back.x)<1e-9&&Math.abs(point.y-back.y)<1e-9);
 }
 const sensor=viewToCamera({x:0,y:0.5},{width:1920,height:1080},{width:390,height:844});
 assert.ok(sensor.x>0.3,'left edge of a portrait screen is not the left edge of the cropped sensor frame');
});
test('hardware focus is requested at the normalized point only when advertised by the camera',async()=>{
 let settings;
 const supported={getCapabilities:()=>({pointsOfInterest:true,focusMode:['single-shot','continuous']}),applyConstraints:async value=>{settings=value;}};
 assert.equal(await focusCameraTrack(supported,{x:0.3,y:0.6}),true);
 assert.deepEqual(JSON.parse(JSON.stringify(settings)),{advanced:[{pointsOfInterest:[{x:0.3,y:0.6}],focusMode:'single-shot'}]});
 let called=false;
 assert.equal(await focusCameraTrack({getCapabilities:()=>({}),applyConstraints:async()=>{called=true;}},{x:0.5,y:0.5}),false);
 assert.equal(called,false);
 assert.equal(await focusCameraTrack({...supported,applyConstraints:async()=>{throw new Error('unsupported');}},{x:0.5,y:0.5}),false);
});
test('reset restores continuous camera autofocus when supported',async()=>{
 let settings;
 await context.exports.resetCameraFocus({getCapabilities:()=>({focusMode:['continuous'],pointsOfInterest:true}),applyConstraints:async value=>{settings=value;}});
 assert.deepEqual(JSON.parse(JSON.stringify(settings)),{advanced:[{focusMode:'continuous',pointsOfInterest:[{x:0.5,y:0.5}]}]});
});
