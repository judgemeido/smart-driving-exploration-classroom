import { chromium } from 'file:///C:/Users/shangguan/.codex/skills/teardown/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const out=path.dirname(fileURLToPath(import.meta.url));
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[],report={checks:[],consoleErrors:errors};
page.on('pageerror',e=>errors.push(e.message));
function check(name,condition,details){report.checks.push({name,pass:!!condition,details});if(!condition)throw Error(`${name}: ${JSON.stringify(details)}`);}
try{
await page.goto('http://localhost:5176/preview.html');
await page.waitForFunction(()=>window.LD016?.state.ready);await page.waitForTimeout(1200);
let result=await page.evaluate(()=>({parts:document.querySelectorAll('[data-part]').length,rotors:window.LD016.manifest.rotating_nodes.map(n=>[n,window.LD016.nodes.has(n)]),width:document.body.scrollWidth,viewport:innerWidth}));
check('12 functional assemblies and exported rotating nodes',result.parts===12&&result.rotors.every(n=>n[1]),result);
await page.click('#rotate');await page.evaluate(()=>{window.LD016.state.angle=0;});await page.waitForTimeout(500);
await page.screenshot({path:path.join(out,'preview-desktop.png'),fullPage:true});
for(const name of ['assembled','cutaway','exploded']){
 await page.click(`[data-mode=${name}]`);await page.waitForTimeout(2400);
 result=await page.evaluate(()=>({mode:LD016.state.mode,exploded:LD016.state.explode,windowVisible:LD016.nodes.get('ir_window').visible,disabled:document.querySelector('#rotate').disabled}));
 check(`${name} mode and shell visibility`,result.mode===name&&result.windowVisible===(name!=='cutaway')&&(name!=='exploded'||result.exploded===1&&result.disabled),result);
 if(name==='exploded')await page.screenshot({path:path.join(out,'preview-exploded.png'),fullPage:true});
}
await page.click('[data-part=motor_stator]');check('Part cards update functional explanation',(await page.textContent('#info-title'))==='驱动电机');
await page.click('#isolate-part');check('Isolate selection',await page.evaluate(()=>LD016.state.isolated));await page.click('#isolate-part');
await page.click('[data-mode=scan]');await page.waitForTimeout(1700);
result=await page.evaluate(()=>{
 const l=LD016,r=l.channelRay(8,0),path=r.hit.distance+r.returnLength;
 return {name:r.hit.object.userData.target,x:r.hit.point.x,distance:r.hit.distance,expected:(4.925-r.tx.x)/r.direction.x,path,ns:path/299792458*1e9};
});check('First surface intersection agrees with wall plane',result.name==='实验墙面'&&Math.abs(result.distance-result.expected)<.00001,result);
const wallDistance=result.distance;
await page.click('#single-pulse');await page.waitForTimeout(450);
result=await page.evaluate(()=>({text:document.querySelector('#hit-time').textContent,ns:(LD016.state.pulse.ray.hit.distance+LD016.state.pulse.ray.returnLength)/299792458*1e9,angle:LD016.state.angle,running:LD016.state.running}));
check('Pulse readout uses physical optical path',Math.abs(parseFloat(result.text)-result.ns)<.006&&result.angle===0&&!result.running,result);
await page.screenshot({path:path.join(out,'preview-scan.png'),fullPage:true});
await page.click('#toggle-obstacle');result=await page.evaluate(()=>{const r=LD016.channelRay(8,0);return {name:r.hit.object.userData.target,x:r.hit.point.x,distance:r.hit.distance};});check('Opaque occluder replaces wall return',result.name==='近处遮挡板'&&result.distance<wallDistance&&Math.abs(result.x-2.34)<.00001,result);
await page.click('#toggle-obstacle');await page.locator('#wall-distance').fill('8');await page.locator('#wall-distance').dispatchEvent('input');result=await page.evaluate(()=>{const r=LD016.channelRay(8,0);return {x:r.hit.point.x,distance:r.hit.distance};});check('Moving wall changes measured distance',Math.abs(result.x-7.925)<.00001&&result.distance>wallDistance+2.9,result);
await page.locator('#channel').fill('0');await page.locator('#channel').dispatchEvent('input');check('Channel elevation updates',(await page.textContent('#channel-value'))==='-15°');
await page.click('#rotate');await page.waitForTimeout(1300);check('Continuous scan accumulates actual hit points',await page.evaluate(()=>LD016.state.pointCount>30));
await page.click('#clear-cloud');check('Clear point cloud resets buffer',await page.evaluate(()=>LD016.state.pointCount<50));
await page.click('[data-mode=cutaway]');await page.waitForTimeout(1500);await page.evaluate(()=>{LD016.state.running=false;LD016.state.angle=0;});await page.waitForTimeout(150);
// Pick a real projected mesh point, then verify the canvas click updates the info card.
const pick=await page.evaluate(()=>{
 const l=LD016,n=l.nodes.get('tx_optical_array');let m;n.traverse(o=>{if(o.isMesh&&!m)m=o;});const p=m.getWorldPosition(n.position.clone()).project(l.stageCamera),r=document.querySelector('#model-view').getBoundingClientRect();return {x:r.left+(p.x*.5+.5)*r.width,y:r.top+(-p.y*.5+.5)*r.height};
});await page.click('[data-part=io_board]');await page.mouse.click(pick.x,pick.y);result=await page.evaluate(()=>LD016.state.selected);check('Canvas ray picking selects a visible part',result!=='io_board',{picked:result});
for(const width of [390,720,1024]){
 await page.setViewportSize({width,height:844});await page.waitForTimeout(700);result=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.body.scrollWidth,controls:[...document.querySelectorAll('.modes button,.part-grid button,.info-actions button')].map(b=>b.getBoundingClientRect().height)}));check(`Responsive layout ${width}px`,result.scrollWidth<=result.width+1&&result.controls.every(h=>h>=43),result);
 if(width===390){await page.screenshot({path:path.join(out,'preview-mobile.png'),fullPage:true});await page.click('[data-mode=scan]');await page.waitForTimeout(900);await page.screenshot({path:path.join(out,'preview-mobile-scan.png'),fullPage:true});await page.click('[data-mode=cutaway]');}
}
check('No runtime JavaScript exceptions',errors.length===0,errors);
await page.setViewportSize({width:1440,height:1000});await page.click('[data-mode=cutaway]');await page.waitForTimeout(1100);
report.drawCalls=await page.evaluate(()=>LD016.renderer.info.render.calls);report.finished=new Date().toISOString();
}catch(e){report.failure=e.stack;process.exitCode=1;}
finally{await fs.writeFile(path.join(out,'preview-validation.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();}
