import {chromium} from 'file:///C:/Users/shangguan/.codex/skills/teardown/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const out=path.dirname(fileURLToPath(import.meta.url));
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
const check=(name,pass,details)=>{checks.push({name,pass:!!pass,details});if(!pass)throw Error(name+': '+JSON.stringify(details));};
try{
 await page.goto('http://localhost:5176/preview.html?view=scan');
 await page.waitForFunction(()=>window.LD016?.state.ready);await page.waitForTimeout(2200);
 const originalCanvas=await page.locator('#model-view canvas').elementHandle();
 for(const width of [1440,1024,720,390]){
  await page.setViewportSize({width,height:width<=720?844:1000});await page.waitForTimeout(800);
  const r=await page.evaluate(()=>{
   const main=document.querySelector('.scan-wrap').getBoundingClientRect(),inset=document.querySelector('.view-wrap').getBoundingClientRect(),scan=document.querySelector('#scan-view').getBoundingClientRect();
   return {width:innerWidth,scrollWidth:document.body.scrollWidth,nested:document.querySelector('.view-wrap').parentElement.matches('.scan-wrap'),main:{x:main.x,y:main.y,w:main.width,h:main.height},inset:{x:inset.x,y:inset.y,w:inset.width,h:inset.height},canvasAspect:LD016.stageCamera.aspect,scanAspect:scan.width/scan.height,buttons:[...document.querySelectorAll('.view-wrap button')].map(b=>{const r=b.getBoundingClientRect();return {w:r.width,h:r.height,inside:r.left>=inset.left&&r.right<=inset.right&&r.bottom<=inset.bottom};})};
  });
  check(`Inset contained and primary environment enlarged at ${width}`,r.nested&&r.main.h>=400&&r.inset.x>=r.main.x&&r.inset.y>=r.main.y&&r.inset.x+r.inset.w<=r.main.x+r.main.w&&r.inset.y+r.inset.h<=r.main.y+r.main.h&&r.main.w*r.main.h>r.inset.w*r.inset.h*3,r);
  check(`Canvas resizes and controls fit at ${width}`,Math.abs(r.canvasAspect-r.inset.w/r.inset.h)<.04&&r.scrollWidth<=r.width&&r.buttons.every(b=>b.w>=43&&b.h>=44&&b.inside),r.buttons);
  if(width===1440||width===390)await page.screenshot({path:path.join(out,`scan-inset-${width}.png`),fullPage:true});
 }
 await page.setViewportSize({width:1440,height:1000});await page.waitForTimeout(500);
 const before=await page.evaluate(()=>LD016.stageCamera.position.toArray());
 const rect=await page.locator('#model-view').boundingBox();
 await page.mouse.move(rect.x+rect.width*.35,rect.y+rect.height*.45);await page.mouse.down();await page.mouse.move(rect.x+rect.width*.65,rect.y+rect.height*.55,{steps:12});await page.mouse.up();await page.waitForTimeout(300);
 const after=await page.evaluate(()=>LD016.stageCamera.position.toArray());
 check('Inset model retains orbit interaction',Math.hypot(...after.map((v,i)=>v-before[i]))>.005,{before,after});
 await page.click('#single-pulse');await page.waitForTimeout(350);
 check('Pulse still measures and updates the sidebar',await page.evaluate(()=>!!LD016.state.pulse?.ray.hit&&document.querySelector('#hit-time').textContent.includes('ns')));
 await page.locator('#wall-distance').fill('8');await page.locator('#wall-distance').dispatchEvent('input');
 check('Wall control still changes the environment',await page.evaluate(()=>LD016.wall.position.x===8));
 await page.click('#toggle-obstacle');check('Occlusion control remains active',await page.evaluate(()=>LD016.obstacle.visible));
 for(const mode of ['cutaway','exploded','assembled','scan','assembled']){
  await page.click(`[data-mode=${mode}]`);await page.waitForTimeout(1100);
  const r=await page.evaluate(()=>({mode:LD016.state.mode,parent:document.querySelector('.view-wrap').parentElement.className,hidden:document.querySelector('.scan-wrap').hidden,models:document.querySelectorAll('#model-view canvas').length}));
  check(`Switch ${mode} restores the correct canvas placement`,r.mode===mode&&r.parent===(mode==='scan'?'scan-wrap':'exhibit')&&r.hidden===(mode!=='scan')&&r.models===1,r);
 }
 check('Same interactive canvas survives mode changes',await originalCanvas.evaluate(el=>el===document.querySelector('#model-view canvas')));
 check('No runtime errors',errors.length===0,errors);
}catch(e){console.error(e);process.exitCode=1;}finally{
 await fs.writeFile(path.join(out,'scan-layout-validation.json'),JSON.stringify({checks,errors},null,2));
 console.log(JSON.stringify({checks:checks.length,passed:checks.filter(c=>c.pass).length,errors}));await browser.close();
}
