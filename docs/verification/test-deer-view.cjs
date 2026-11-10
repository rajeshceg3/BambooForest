const ts=require('typescript'),fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const code=ts.transpileModule(fs.readFileSync('src/utils/deerView.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const sandbox={exports:{}};vm.runInNewContext(code,sandbox);const {chooseDeerView}=sandbox.exports;
const blocked=[{x:-2,z:-1.5,radius:.3},{x:0,z:3,radius:.3}];
for(let h=0;h<6.3;h+=.1){const v=chooseDeerView(0,0,h,blocked);assert.ok(v.clearance>0);assert.ok(Math.abs(Math.hypot(v.x,v.z)-5.5)<1e-10)}
const sealed=Array.from({length:48},(_,i)=>({x:Math.sin(i*Math.PI/24)*2,z:Math.cos(i*Math.PI/24)*2,radius:.8}));assert.ok(chooseDeerView(0,0,0,sealed).clearance<0);
console.log('Deer view: 63 headings preserve5.5m radius, clear blocked rays; sealed view reported negative');
