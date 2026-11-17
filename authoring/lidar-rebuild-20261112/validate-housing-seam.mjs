import {chromium} from 'file:///C:/Users/shangguan/.codex/skills/teardown/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('http://localhost:5176/preview.html?revision=closed-housing');
 await page.waitForFunction(()=>window.LD016?.state.ready);
 await page.waitForTimeout(1800);
 await page.evaluate(()=>{const l=LD016;l.state.running=false;l.state.angle=0;});
 const report=await page.evaluate(async()=>{
  const THREE=await import('/@fs/C:/Users/shangguan/Desktop/smart-driving-exploration-classroom/node_modules/three/build/three.module.js');
  const l=LD016,meshes=[];l.nodes.get('housing_base').traverse(o=>{if(o.isMesh)meshes.push(o);});
  l.stage.updateMatrixWorld(true);
  let rays=0,misses=[];
  for(const y of [.0128,.0135,.0145,.0152])for(let i=0;i<72;i++){
   const angle=i*Math.PI/36,origin=new THREE.Vector3(Math.cos(angle)*.07,y,Math.sin(angle)*.07);
   const direction=new THREE.Vector3(-Math.cos(angle),0,-Math.sin(angle));
   const hit=new THREE.Raycaster(origin,direction,0,.03).intersectObjects(meshes,false)[0];
   rays++;if(!hit)misses.push({y,angle});
  }
  return {rays,misses};
 });
 if(report.misses.length)throw Error(JSON.stringify(report));
 await page.evaluate(()=>{const l=LD016;l.stageCamera.position.set(-.21,.058,.13);l.controls.target.set(0,.038,0);l.controls.update();});
 await page.waitForTimeout(500);
 await page.screenshot({path:new URL('./housing-seam-fixed.png',import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1'),fullPage:true});
 for(const mode of ['cutaway','exploded','assembled']){
  await page.click(`[data-mode=${mode}]`);await page.waitForTimeout(2300);
  const status=await page.evaluate(()=>({mode:LD016.state.mode,explode:LD016.state.explode,windowVisible:LD016.nodes.get('ir_window').visible}));
  if(status.mode!==mode || status.windowVisible===(mode==='cutaway') || (mode==='exploded'&&status.explode!==1))throw Error(JSON.stringify(status));
 }
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(800);
 const mobile=await page.evaluate(()=>({width:innerWidth,content:document.body.scrollWidth}));
 if(mobile.content>mobile.width+1 || errors.length)throw Error(JSON.stringify({mobile,errors}));
 const result={...report,modes:['cutaway','exploded','assembled'],mobile,errors};
 await fs.writeFile(new URL('./housing-browser-validation.json',import.meta.url),JSON.stringify(result,null,2));
 console.log(JSON.stringify(result));
}finally{await browser.close();}
