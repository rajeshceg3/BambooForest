import {chromium} from '@playwright/test';
import fs from 'node:fs';import {spawn} from 'node:child_process';
const repo=process.cwd();
const s=fs.readFileSync(repo+'/src/components/Stream.tsx','utf8');
const generator=s.slice(s.indexOf('      const rand = mulberry32(12345);'),s.indexOf('      return array;')+'      return array;'.length);
const prng=s.slice(s.indexOf('function mulberry32'),s.indexOf('export function Stream')).replace('a: number','a');
const child=spawn('npm',['run','dev','--','--host','127.0.0.1','--port','4187'],{cwd:repo,stdio:'ignore',detached:true});
let browser;
try{
for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:4187')).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--enable-unsafe-swiftshader']});
const page=await browser.newPage();await page.goto('http://127.0.0.1:4187');
const proof=await page.evaluate(async({generator,prng})=>{
 const THREE=await import('/node_modules/.vite/deps/three.js');
 const {bakeRockNoise}=await import('/src/utils/rockNoiseBake.ts');const {rockNoiseGLSL}=await import('/src/utils/rockNoise.ts');const {createShoreStones}=await import('/src/utils/streamBanks.ts');
 const matrices=new Function('THREE',prng+generator)(THREE);
 const sets=[{geometry:new THREE.IcosahedronGeometry(1,3),transforms:matrices},{geometry:new THREE.IcosahedronGeometry(1,1),transforms:createShoreStones()}];
 const renderer=new THREE.WebGLRenderer();const baked=bakeRockNoise(renderer,sets);if(!baked)throw Error('bake unavailable');
 const pixels=new Float32Array(baked.width*baked.height*4);renderer.readRenderTargetPixels(baked.target,0,0,baked.width,baked.height,pixels);
 const inputs=[];for(const set of sets){const p=set.geometry.getAttribute('position');for(let i=0;i<set.transforms.length;i+=16)for(let j=0;j<p.count;j++) inputs.push(p.getX(j),p.getY(j),p.getZ(j),set.transforms[i+12],set.transforms[i+14]);}
 const gl=renderer.getContext();const compile=(type,src)=>{const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));return sh;};
 const vs=compile(gl.VERTEX_SHADER,`#version 300 es\nprecision highp float;in vec3 p;in vec2 translation;out float result;${rockNoiseGLSL}
 void main(){float seed=translation.x*0.1+translation.y*0.1;float nx=p.x*1.5;float ny=p.y*1.5;float nz=p.z*1.5;
 float nVal=snoise(vec3(nx+seed*10.0,ny+seed*10.0,nz+seed*10.0));nVal+=0.5*snoise(vec3(nx*2.0+10.0+seed,ny*2.0+10.0+seed,nz*2.0+10.0+seed));result=nVal;gl_Position=vec4(0.0);}`);
 const fs=compile(gl.FRAGMENT_SHADER,'#version 300 es\nprecision highp float;out vec4 c;void main(){c=vec4(1.0);}');
 const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.transformFeedbackVaryings(program,['result'],gl.INTERLEAVED_ATTRIBS);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
 gl.bindVertexArray(gl.createVertexArray());const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(inputs),gl.STATIC_DRAW);
 for(const [name,size,offset] of [['p',3,0],['translation',2,12]]){const loc=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,20,offset);}
 const n=inputs.length/5;const out=gl.createBuffer();gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER,out);gl.bufferData(gl.TRANSFORM_FEEDBACK_BUFFER,n*4,gl.STREAM_READ);gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,out);gl.enable(gl.RASTERIZER_DISCARD);gl.beginTransformFeedback(gl.POINTS);gl.drawArrays(gl.POINTS,0,n);gl.endTransformFeedback();gl.disable(gl.RASTERIZER_DISCARD);const values=new Float32Array(n);gl.getBufferSubData(gl.TRANSFORM_FEEDBACK_BUFFER,0,values);
 let mismatches=0,max=0,nonfinite=0;for(let i=0;i<n;i++){if(!Number.isFinite(values[i])||!Number.isFinite(pixels[i*4]))nonfinite++;const d=Math.abs(values[i]-pixels[i*4]);if(d!==0)mismatches++;max=Math.max(max,d);}
 return {samples:n,mismatches,maxAbsoluteDifference:max,nonfinite,first:Array.from(values.slice(0,6)),firstBaked:Array.from(pixels.filter((_,i)=>i%4===0).slice(0,6)),glError:gl.getError(),width:baked.width,height:baked.height};
},{generator,prng});console.log(JSON.stringify(proof,null,2));fs.mkdirSync('/tmp/bamboo-static-proof',{recursive:true});fs.writeFileSync('/tmp/bamboo-static-proof/numerical.json',JSON.stringify(proof,null,2));
}finally{await browser?.close();try{process.kill(-child.pid,'SIGTERM')}catch{}}
