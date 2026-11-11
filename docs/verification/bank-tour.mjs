import {chromium} from '@playwright/test';
import fs from 'node:fs';
const width=Number(process.argv[2]||390);
const baseURL=process.env.BASE_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--ignore-certificate-errors','--enable-unsafe-swiftshader']});
try {
 const page=await browser.newPage({viewport:{width,height:width===390?844:768},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(baseURL);
 async function press(label){const button=page.getByRole('button',{name:new RegExp('^'+label+'$','i')});await button.focus({timeout:15000});await page.keyboard.press('Enter');}
 await press('ENTER');
 await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.bambooReady==='4994',null,{timeout:25000});
 await press('GUIDED TOUR');
 const positions=['0.00,4.00,15.00','8.00,1.50,8.00','-16.00,2.50,-16.00'];
 for(let step=0;step<3;step++){
  await page.waitForFunction(({step,position})=>{const c=document.querySelector('canvas');return c?.dataset.tourStep===String(step)&&c.dataset.cameraPosition===position}, {step,position:positions[step]},{timeout:20000});
  await page.locator('.filter-none .tour-card').waitFor({state:'visible',timeout:15000});
  if(step<2)await press('NEXT STEP');
 }
 await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.bambooReady==='4794',null,{timeout:25000});
 const data=await page.locator('canvas').evaluate(c=>({...c.dataset}));
 if(errors.length||Number(data.bambooBranchesReady)<=0||Number(data.bambooLeavesReady)<=0)throw new Error('Incomplete worker scene');
 console.log({width,errors,data});
 fs.writeFileSync(`/tmp/bamboo-worker-ready-tour-${width}.json`,JSON.stringify({width,errors,data},null,2));
 await page.screenshot({path:`/downloads/bamboo-worker-ready-tour-${width}.png`,timeout:20000});
} finally {await browser.close()}
