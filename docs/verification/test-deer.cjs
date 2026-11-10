const ts=require('typescript'),fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const code=ts.transpileModule(fs.readFileSync('src/utils/deerMotion.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const sandbox={exports:{}};vm.runInNewContext(code,sandbox);const {sampleDeerFoot,DEER_GROUND,DEER_SPEED}=sandbox.exports;
let min=Infinity,max=-Infinity,planted=0,airborne=0;
for(let tick=0;tick<10000;tick++)for(const phase of[0,.25,.5,.75]){
 const t=tick/1000,p=sampleDeerFoot(t,phase,true),bottom=p.pivotY-.045;min=Math.min(min,bottom);max=Math.max(max,bottom);
 assert.ok(bottom>=DEER_GROUND-1e-10);assert.ok(Number.isFinite(p.step));
 if(p.stance){planted++;assert.ok(Math.abs(bottom-DEER_GROUND)<1e-10);const dt=.000001,q=sampleDeerFoot(t+dt,phase,true);if(q.stance)assert.ok(Math.abs((q.step-p.step)/dt+DEER_SPEED)<1e-7)}else airborne++;
 const rest=sampleDeerFoot(t,phase,false);assert.ok(Math.abs(rest.pivotY-.045-DEER_GROUND)<1e-10);assert.equal(rest.step,0);
}
console.log({samples:40000,minHoofBottom:min,maxHoofBottom:max,ground:DEER_GROUND,planted,airborne,stanceVelocityMatchesRoot:true});
