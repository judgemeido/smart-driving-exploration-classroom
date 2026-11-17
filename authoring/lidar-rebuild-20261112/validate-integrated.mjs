import {chromium} from 'file:///C:/Users/shangguan/.codex/skills/teardown/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const out=path.dirname(fileURLToPath(import.meta.url));
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const checks=[],errors=[],failedAssets=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.status()>=400&&!r.url().includes('fonts.googleapis'))failedAssets.push({url:r.url(),status:r.status()});});
function check(name,pass,details){checks.push({name,pass:!!pass,details});if(!pass)throw Error(name+': '+JSON.stringify(details));}
try{
 await page.goto('http://localhost:5177/legacy.html#lidar');
 const frame=await (await page.waitForSelector('.lidar-exhibit-frame')).contentFrame();
 await frame.waitForFunction(()=>window.LD016?.state.ready);await frame.waitForTimeout(1700);
 check('New model loads in the museum chapter',await frame.evaluate(()=>LD016.nodes.size>=12&&LD016.state.mode==='assembled'));
 await frame.click('[data-mode=exploded]');await frame.waitForTimeout(2000);
 check('Exploded assembly',await frame.evaluate(()=>LD016.state.explode===1));
 await frame.click('[data-part=timing_board]');await frame.click('#isolate-part');
 check('PCB selection and isolation',await frame.evaluate(()=>LD016.state.isolated&&LD016.state.selected==='timing_board'));
 await frame.click('[data-mode=scan]');await frame.waitForTimeout(1600);
 check('Scan inset layout is integrated',await frame.evaluate(()=>document.querySelector('.view-wrap').parentElement.matches('.scan-wrap')));
 await frame.click('#single-pulse');await frame.waitForTimeout(350);
 check('Measured pulse readout',await frame.evaluate(()=>!!LD016.state.pulse.ray.hit&&document.querySelector('#hit-time').textContent.includes('ns')));
 await page.screenshot({path:path.join(out,'museum-integrated-desktop.png'),fullPage:true});
 for(const width of [390,720,1024,1440]){
  await page.setViewportSize({width,height:width<=720?844:1000});await frame.waitForTimeout(600);
  const outer=await page.evaluate(()=>{const nav=document.querySelector('.chapter-menu').getBoundingClientRect(),f=document.querySelector('iframe').getBoundingClientRect();return {width:innerWidth,scroll:document.body.scrollWidth,navBottom:nav.bottom,frameTop:f.top,frameWidth:f.width};});
  const inner=await frame.evaluate(()=>({width:innerWidth,scroll:document.body.scrollWidth}));
  check(`Navigation and mobile layout ${width}`,outer.scroll<=outer.width&&outer.frameTop>=outer.navBottom-1&&inner.scroll<=inner.width,{outer,inner});
  if(width===390)await page.screenshot({path:path.join(out,'museum-integrated-mobile.png'),fullPage:true});
 }
 await frame.click('#rotate');await frame.waitForTimeout(150);
 const saved=await frame.evaluate(()=>({angle:LD016.state.angle,mode:LD016.state.mode}));
 await page.click('[data-go=history]');await page.waitForTimeout(500);
 const paused=await frame.evaluate(()=>LD016.state.angle);await page.waitForTimeout(500);
 check('Hidden chapter stops animating',await frame.evaluate(a=>LD016.state.angle===a,paused));
 check('History chapter still opens',await page.locator('#history').getAttribute('aria-hidden')==='false');
 await page.click('[data-go=lidar]');await frame.waitForTimeout(450);
 check('Returning retains scan state and resumes',await frame.evaluate(s=>LD016.state.mode===s.mode&&LD016.state.angle!==s.angle,saved));
 await page.click('[data-go=traffic]');await page.waitForTimeout(1200);
 check('Road safety chapter still opens',await page.locator('#traffic').getAttribute('aria-hidden')==='false');
 await page.goto('http://localhost:5177/index.html#battery/B1');await page.waitForTimeout(1200);
 check('Classroom remains available',await page.locator('.lesson--B1').count()===1);
 check('Production assets load',failedAssets.length===0,failedAssets);
 check('No browser exceptions',errors.length===0,errors);
}catch(e){console.error(e);process.exitCode=1;}finally{
 await fs.writeFile(path.join(out,'museum-integration-validation.json'),JSON.stringify({checks,errors,failedAssets},null,2));console.log(JSON.stringify({checks:checks.length,passed:checks.filter(x=>x.pass).length,errors,failedAssets}));await browser.close();
}
