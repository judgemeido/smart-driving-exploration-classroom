import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {getQualityProfile,watchQuality} from '../../../shared/performance';

// Preview finish only: authored surface colors, not a change to the mechanical rig.
const palette=[
 ['BeadBlasted_Aluminium',0x40556a,.83,.29],
 ['Machined_Aluminium',0x9aaebe,.92,.23],
 ['Anodised_Graphite',0x10212e,.72,.32],
 ['Infrared_Window',0x07313b,.48,.2],
 ['Soldermask_Green',0x07503c,0,.73],
 ['Copper_Winding',0xc47c48,.84,.26],
 ['Gold_Contact',0xe8b567,.83,.23],
 ['IC_Encapsulation',0x101923,.12,.5],
 ['Silicone_Seal',0x070e16,0,.76],
 ['AR_Coated_Optic',0x45b9cc,.4,.13],
 ['FR4_Laminate_Edge',0x77623b,0,.85],
 ['Masked_Copper_Route',0x0e5c42,0,.7],
 ['Solder_Termination',0xaeb7b9,.88,.35],
];
export function finishHardware(model){
 model.traverse(o=>{if(!o.isMesh)return;const m=o.material,p=palette.find(p=>m.name.includes(p[0]));if(p){m.color.setHex(p[1]);m.metalness=p[2];m.roughness=p[3];}if(m.name.includes('AR_Coated_Optic')){m.emissive.setHex(0x106e8a);m.emissiveIntensity=.16;}});
 const lid=model.getObjectByName('top_lid');
 // Small concentric machining lines sit on the cap surface and share its teardown owner.
 const grooveMaterial=new THREE.MeshStandardMaterial({color:0x182b3b,metalness:.8,roughness:.35});
 for(const radius of [.041,.044,.047]){const ring=new THREE.Mesh(new THREE.TorusGeometry(radius,.0001,4,128),grooveMaterial);ring.rotation.x=-Math.PI/2;ring.position.y=.08294;ring.name='cap_machining_line';lid.add(ring);}
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=384;const c=canvas.getContext('2d');c.clearRect(0,0,1024,384);c.fillStyle='#c7dce4';c.font='500 126px sans-serif';c.textAlign='center';c.fillText('LD–016',512,155);c.font='31px monospace';c.fillStyle='#5edbdf';c.fillText('16 CHANNEL  /  360°',512,224);c.fillStyle='#819aab';c.font='22px monospace';c.fillText('OPTICAL SENSOR · STUDY EDITION',512,280);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
 const badge=new THREE.Mesh(new THREE.PlaneGeometry(.058,.02175),new THREE.MeshStandardMaterial({map:texture,transparent:true,depthWrite:false,roughness:.7,metalness:.15,polygonOffset:true,polygonOffsetFactor:-1}));badge.rotation.x=-Math.PI/2;badge.position.set(0,.08304,.006);badge.name='cap_identity_etch';lid.add(badge);
}

export function createShowcase({scene,camera,renderer,container}){
 scene.background=new THREE.Color(0x07111e);
 renderer.toneMappingExposure=.94;
 renderer.info.autoReset=false;
 const podium=new THREE.Group();podium.name='Exhibition_platform_not_sensor';scene.add(podium);
 const base=new THREE.Mesh(new THREE.CylinderGeometry(.067,.072,.012,128),new THREE.MeshStandardMaterial({color:0x101e30,metalness:.65,roughness:.42}));base.position.y=-.006;base.receiveShadow=true;podium.add(base);
 const emissive=new THREE.MeshStandardMaterial({color:0x0e778b,emissive:0x21c4ed,emissiveIntensity:4.5,metalness:.1,roughness:.25});
 const accent=new THREE.Mesh(new THREE.TorusGeometry(.0683,.00032,8,160),emissive);accent.rotation.x=Math.PI/2;accent.position.y=-.002;podium.add(accent);
 const groundRings=new THREE.Group();groundRings.name='Exhibition_projection_not_measurement';scene.add(groundRings);
 for(const [radius,alpha]of [[.085,.38],[.11,.23],[.142,.09]]){const ring=new THREE.Mesh(new THREE.TorusGeometry(radius,.00015,5,160),new THREE.MeshBasicMaterial({color:new THREE.Color(0x2086ae).multiplyScalar(2),transparent:true,opacity:alpha,depthWrite:false}));ring.rotation.x=Math.PI/2;ring.position.y=-.0115;groundRings.add(ring);}
 const tickPositions=[];for(let i=0;i<120;i++){const a=i*Math.PI/60,r=.113,b=i%10===0?.119:.115;tickPositions.push(Math.cos(a)*r,-.0114,Math.sin(a)*r,Math.cos(a)*b,-.0114,Math.sin(a)*b);}
 const ticksGeo=new THREE.BufferGeometry();ticksGeo.setAttribute('position',new THREE.Float32BufferAttribute(tickPositions,3));const ticks=new THREE.LineSegments(ticksGeo,new THREE.LineBasicMaterial({color:0x3896b2,transparent:true,opacity:.42}));groundRings.add(ticks);
 const arc=new THREE.Mesh(new THREE.TorusGeometry(.085,.00026,6,64,Math.PI*.32),new THREE.MeshBasicMaterial({color:new THREE.Color(0x3faad5).multiplyScalar(3),transparent:true,opacity:.75}));arc.rotation.x=Math.PI/2;arc.position.y=-.0113;groundRings.add(arc);
 const glows=[];
 function glow(color,pos,power){const l=new THREE.PointLight(color,power,.24,2);l.position.set(...pos);scene.add(l);glows.push(l);return l;}
 glow(0x2dd5f0,[.075,.035,.07],.0014);glow(0x6a7dff,[-.075,.065,-.04],.0018);
 let composer=null,bloom=null,basePass=null,outputPass=null;
 function releasePost(){bloom?.dispose();outputPass?.dispose();basePass?.dispose();composer?.dispose();composer=bloom=basePass=outputPass=null;}
 function resize(){const w=container.clientWidth,h=container.clientHeight;if(!w||!h||!composer)return;composer.setPixelRatio(Math.min(renderer.getPixelRatio(),innerWidth<721?1:1.3));composer.setSize(w,h);}
 function syncPost(){if(!effects||getQualityProfile().low){releasePost();return;}if(!composer){composer=new EffectComposer(renderer);basePass=new RenderPass(scene,camera);bloom=new UnrealBloomPass(new THREE.Vector2(256,256),.24,.35,2.1);outputPass=new OutputPass();composer.addPass(basePass);composer.addPass(bloom);composer.addPass(outputPass);}resize();}
 const observer=new ResizeObserver(resize);observer.observe(container);
 let effects=true;const button=document.createElement('button');button.id='visual-fx';button.textContent='光效 开';button.setAttribute('aria-pressed','true');button.title='开启或关闭展台投影与柔光';document.querySelector('.canvas-actions').prepend(button);
 button.onclick=()=>{effects=!effects;button.textContent=effects?'光效 开':'光效 关';button.setAttribute('aria-pressed',String(effects));syncPost();};
 const stopQuality=watchQuality(syncPost);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');let timer=0;
 return{
  render(dt,state){if(!reduced.matches&&state.running)timer+=dt;podium.visible=groundRings.visible=state.mode!=='exploded'&&!state.isolated;groundRings.visible=groundRings.visible&&effects;for(const l of glows)l.visible=effects&&!getQualityProfile().low;arc.rotation.z=timer*.23;emissive.emissiveIntensity=effects?4.2+Math.sin(timer*.7)*.25:1;renderer.info.reset();if(composer)composer.render(dt);else renderer.render(scene,camera);},
  setEffects(value){effects=value;syncPost();button.setAttribute('aria-pressed',String(value));button.textContent=value?'光效 开':'光效 关';},
  get effects(){return effects;},
  get bloom(){return bloom;},podium,groundRings,
  dispose(){stopQuality();observer.disconnect();releasePost();}
 };
}
