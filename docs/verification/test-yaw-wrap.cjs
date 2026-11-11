const fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').resolve(__dirname,'../../src/components/Navigation.tsx'),'utf8');
const begin=source.indexOf('    if (rotation.current.theta > Math.PI');
const end=source.indexOf('\n\n    // Apply rotation',begin);
assert(begin>=0&&end>begin);
const wrap=new Function('rotation','targetRotation',source.slice(begin,end));
for(const current of [-100,-7,-3.2,-Math.PI,0,Math.PI,3.2,7,100])for(const pending of [-4,-1,0,1,4]){
 const rotation={current:{theta:current}},targetRotation={current:{theta:current+pending}};
 wrap(rotation,targetRotation);
 assert(rotation.current.theta>=-Math.PI&&rotation.current.theta<=Math.PI);
 assert(Math.abs(targetRotation.current.theta-rotation.current.theta-pending)<1e-12,'wrapping preserves all pending input');
 assert(Math.abs(Math.sin(rotation.current.theta)-Math.sin(current))<1e-12);
}
console.log('Actual Navigation yaw block: both signs, multi-turn inputs, pending angle preserved');
