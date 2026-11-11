import {chromium} from '@playwright/test';import fs from 'node:fs';import {spawn} from 'node:child_process';
const repo=process.cwd();const out=process.env.EVIDENCE_DIR||'/tmp/bamboo-static-exact';fs.mkdirSync(out,{recursive:true});
const child=spawn('npm',['run','dev','--','--host','127.0.0.1','--port','4187'],{cwd:repo,stdio:'ignore',detached:true});let browser;
try{for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:4187')).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'no-preference'});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});await page.goto('http://127.0.0.1:4187/?rockbake=1');await page.getByRole('button',{name:/^Enter$/i}).focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.bambooReady==='4994');

const setup=await page.evaluate(async()=>{const f=await import('/node_modules/.vite/deps/@react-three_fiber.js');const state=f._roots.get(document.querySelector('canvas')).store.getState();const rocks=[];state.scene.traverse(o=>{if(o.isInstancedMesh&&o.material?.userData.bakedNoise)rocks.push(o)});window.__rockMat=rocks[0].material;window.__baked=window.__rockMat.userData.bakedNoise;return {...document.querySelector('canvas').dataset};});
fs.mkdirSync('/tmp/bamboo-static-proof',{recursive:true});
const windows=[];
for(const variant of ['original','baked','baked','original']){
 await page.evaluate(variant=>{const m=window.__rockMat;m.userData.bakedNoise=variant==='baked'?window.__baked:undefined;m.needsUpdate=true},variant);
 await page.waitForTimeout(2000);
 const result=await page.evaluate(()=>new Promise(resolve=>{const times=[];const start=performance.now();function frame(t){times.push(t);if(t-start<10000)requestAnimationFrame(frame);else resolve({fps:1000*(times.length-1)/(times.at(-1)-times[0]),frames:times.length,elapsed:performance.now()-start,data:{...document.querySelector('canvas').dataset}})}requestAnimationFrame(frame)}));
 windows.push({variant,...result});console.log(variant,result);
}
fs.writeFileSync('/tmp/bamboo-static-proof/live-abba.json',JSON.stringify({setup,windows,errors},null,2));
}finally{await browser?.close();try{process.kill(-child.pid,'SIGTERM')}catch{}}
