import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {finishHardware,createShowcase} from './exhibit-finish.js';

const $ = s => document.querySelector(s);
const clamp = THREE.MathUtils.clamp;
const v = a => new THREE.Vector3(a[0], a[2], -a[1]); // Blender Z-up -> glTF Y-up.
const PARTS = [
  ['tx_optical_array','发射光学阵列','16个发射通道朝向不同的仰角。短脉冲经过准直镜，向外发出一束束光。','脉冲驱动 → 发光器件 → 准直镜 → 外部物体'],
  ['rx_optical_array','接收光学阵列','与发射通道一一对应的镜头收集回光。滤光片减少其他光的干扰，探测器把回光变成电信号。','表面回光 → 接收镜头 → 滤光片 → 探测器'],
  ['timing_board','测距处理板','负责发射时序、微弱回波信号处理和飞行时间测量。展示中的芯片布局为教学设计。','发射时刻 + 接收时刻 → 往返时间 → 距离'],
  ['motor_stator','驱动电机','固定的铜线绕组形成变化的磁场，带动外侧磁转子。电机定子不随光学头转动。','供电 → 定子磁场 → 磁转子 → 光学头'],
  ['rotor_head','转子与空心轴','磁转子、空心轴和光学支架共同转动。内部线束随总成一起转，不跨越固定与旋转的边界。','磁转子 → 空心轴 → 刚性光学支架'],
  ['shaft_bearings','双轴承','上下两个轴承支撑旋转轴。外圈固定，内圈随轴旋转，保持光学头的位置稳定。','固定支撑 → 外圈 / 滚珠 / 内圈 → 旋转轴'],
  ['angle_encoder','角度编码器','码环随轴转动，固定读头读取反射条纹。它提供方位角参考，让距离点能放到正确的方向。','旋转码环 → 固定读头 → 方位角'],
  ['rotary_coupling','旋转导电组件','固定端触点与转动导电环保持接触，演示如何跨越旋转边界传递电力和信号。','固定电路 → 触点 / 导电环 → 转动电路'],
  ['io_board','供电与接口板','位于固定底座，负责供电调节与外部通信。它与旋转端之间通过旋转连接传递数据。','外部电源 / 网络 ↔ 固定接口 ↔ 旋转端'],
  ['ir_window','红外窗口','窗口保护内部器件，同时让工作波段的红外光通过。外壳和窗口保持固定。','发射光穿出 ↔ 窗口 ↔ 反射光进入'],
  ['top_lid','顶盖与支撑','金属顶盖提供密封与上轴承支撑。支撑辐条位于旋转光学总成上方，预留运动空间。','顶盖 → 支撑辐条 → 上轴承座'],
  ['housing_base','安装底座','底座负责安装与固定，承载接口板、电机和下支撑。密封槽与窗口边缘形成保护结构。','安装面 → 底座 → 内部固定总成'],
];
const state = {mode:'assembled', selected:PARTS[0][0], running:!matchMedia('(prefers-reduced-motion: reduce)').matches, isolated:false, explode:0, angle:0, channel:8, pulse:null, ready:false, hits:0, pointCount:0};
let model, manifest, scanModel, activeLabel=null, cameraGoal=null, targetGoal=null;
const nodes = new Map(), homes = new Map(), materials = new Map();
const stage = new THREE.Scene();
const stageCamera = new THREE.PerspectiveCamera(35,1,.001,8);
stageCamera.position.set(.19,.19,.23);
function makeRenderer(container, scene, camera) {
  const r = new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
  r.setPixelRatio(Math.min(devicePixelRatio,1.5)); r.setClearColor(0,0); r.outputColorSpace=THREE.SRGBColorSpace;
  r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.18;
  r.shadowMap.enabled=true;r.shadowMap.type=THREE.PCFSoftShadowMap;
  container.append(r.domElement);
  const resize=()=>{const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();r.setSize(w,h,false);};
  new ResizeObserver(resize).observe(container);resize();
  return r;
}
const renderer=makeRenderer($('#model-view'),stage,stageCamera);
const pmrem=new THREE.PMREMGenerator(renderer);
const environment=pmrem.fromScene(new RoomEnvironment(),.04);stage.environment=environment.texture;pmrem.dispose();
function light(scene,pos,color,intensity){const l=new THREE.DirectionalLight(color,intensity);l.position.set(...pos);scene.add(l);return l;}
stage.environmentIntensity=.6;
stage.add(new THREE.HemisphereLight(0xc9eeff,0x182b42,.4));const key=light(stage,[.2,.4,.3],0xe5f2ff,1.7);light(stage,[-.2,.1,-.3],0x7fcde4,1.1);light(stage,[.3,.2,-.2],0x9faeff,.65);
key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-.25,right:.3,top:.4,bottom:-.15,near:.01,far:1.4});key.shadow.bias=-.00002;key.shadow.normalBias=.00012;
const floor=new THREE.Mesh(new THREE.PlaneGeometry(.7,.7),new THREE.ShadowMaterial({color:0x000000,opacity:.24}));floor.rotation.x=-Math.PI/2;floor.position.y=-.012;floor.receiveShadow=true;stage.add(floor);
const controls=new OrbitControls(stageCamera,renderer.domElement);controls.target.set(0,.043,0);controls.enableDamping=true;controls.dampingFactor=.09;controls.minDistance=.025;controls.maxDistance=1.4;controls.maxPolarAngle=Math.PI*.96;controls.update();
controls.addEventListener('start',()=>{cameraGoal=targetGoal=null;});
const grid=new THREE.GridHelper(.7,28,0x335e61,0x254044);grid.position.y=-.001;grid.material.transparent=true;grid.material.opacity=.25;stage.add(grid);
const marker=new THREE.Box3Helper(new THREE.Box3(),0x7ce0cb);marker.visible=false;stage.add(marker);
const showcase=createShowcase({scene:stage,camera:stageCamera,renderer,container:$('#model-view')});
const stageRayGeom=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]);
const stageRay=new THREE.Line(stageRayGeom,new THREE.LineBasicMaterial({color:0xffb65f,transparent:true,opacity:.8}));stageRay.visible=false;stage.add(stageRay);
const scanScene=new THREE.Scene();scanScene.background=new THREE.Color(0x192e35);scanScene.fog=new THREE.Fog(0x192e35,22,50);
const scanCamera=new THREE.PerspectiveCamera(43,1,.02,90);scanCamera.position.set(-7,6,10);
const scanRenderer=makeRenderer($('#scan-view'),scanScene,scanCamera);scanScene.environment=environment.texture;
const scanControls=new OrbitControls(scanCamera,scanRenderer.domElement);scanControls.target.set(1.6,.65,0);scanControls.enableDamping=true;scanControls.minDistance=3;scanControls.maxDistance=24;scanControls.maxPolarAngle=Math.PI*.48;scanControls.update();
scanScene.add(new THREE.HemisphereLight(0xc6e6ed,0x263a3a,2.3));light(scanScene,[3,8,4],0xfff0d2,3);
const targets=[];
function box(name,size,pos,color,parent=scanScene,raycast=true){const m=new THREE.Mesh(new THREE.BoxGeometry(...size),new THREE.MeshStandardMaterial({color,roughness:.55,metalness:.15}));m.position.set(...pos);m.userData.target=name;parent.add(m);if(raycast)targets.push(m);return m;}
box('路面',[22,.12,17],[0,-.08,0],0x2a3d42);
const scanGrid=new THREE.GridHelper(20,20,0x36565a,0x304b50);scanGrid.position.y=-.012;scanScene.add(scanGrid);
const wall=box('实验墙面',[.15,3.2,8],[5,1.6,0],0x536a70);
for(let y=.4;y<3.2;y+=.4)box('墙面接缝',[.004,.01,8],[-.077,y-1.6,0],0x40585e,wall,false);
const car=new THREE.Group();car.position.set(2.8,0,-3.1);scanScene.add(car);
box('车辆车身',[1.65,.65,3.5],[0,.62,0],0x517b82,car);
box('车辆座舱',[1.4,.6,1.8],[0,1.19,-.2],0x293f48,car);
for(const x of [-.82,.82])for(const z of [-1.1,1.1]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.33,.33,.22,24),new THREE.MeshStandardMaterial({color:0x132024,roughness:.9}));wheel.rotation.z=Math.PI/2;wheel.position.set(x,.33,z);wheel.userData.target='车轮';car.add(wheel);targets.push(wheel);}
const person=new THREE.Group();person.position.set(3.7,0,2.25);scanScene.add(person);
box('行人躯干',[.44,.7,.26],[0,1.1,0],0xcd9463,person);
for(const x of [-.13,.13])box('行人腿部',[.17,.72,.2],[x,.36,0],0x506674,person);
const head=new THREE.Mesh(new THREE.SphereGeometry(.15,20,12),new THREE.MeshStandardMaterial({color:0xd7b799}));head.position.y=1.62;head.userData.target='行人头部';person.add(head);targets.push(head);
const obstacle=box('近处遮挡板',[.12,1.8,1.3],[2.4,.9,0],0xa87950);obstacle.visible=false;
const mast=box('传感器支架',[.08,1.5,.08],[0,.75,0],0x657779,scanScene,false);box('支架底盘',[.6,.06,.6],[0,.03,0],0x465e64,scanScene,false);
function textSprite(text,pos){const c=document.createElement('canvas');c.width=512;c.height=80;const ctx=c.getContext('2d');ctx.fillStyle='#15282eef';ctx.fillRect(0,0,512,80);ctx.fillStyle='#b4d7d4';ctx.font='500 31px sans-serif';ctx.textAlign='center';ctx.fillText(text,256,50);const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),depthTest:false}));s.scale.set(2.5,.39,1);s.position.set(...pos);scanScene.add(s);}
textSprite('传感器 · 离地 1.5 m',[0,2.15,0]);
const scanRaycaster=new THREE.Raycaster();scanRaycaster.far=18;
const capacity=16000, cloudPos=new Float32Array(capacity*3),cloudColors=new Float32Array(capacity*3);
const cloudGeom=new THREE.BufferGeometry();cloudGeom.setAttribute('position',new THREE.BufferAttribute(cloudPos,3));cloudGeom.setAttribute('color',new THREE.BufferAttribute(cloudColors,3));cloudGeom.setDrawRange(0,0);
const cloud=new THREE.Points(cloudGeom,new THREE.PointsMaterial({size:.045,vertexColors:true,sizeAttenuation:true,transparent:true,opacity:.95,depthWrite:false}));cloud.frustumCulled=false;scanScene.add(cloud);
const livePositions=new Float32Array(16*6);const liveGeom=new THREE.BufferGeometry();liveGeom.setAttribute('position',new THREE.BufferAttribute(livePositions,3));liveGeom.setDrawRange(0,0);
const liveRays=new THREE.LineSegments(liveGeom,new THREE.LineBasicMaterial({color:0xf8b160,transparent:true,opacity:.31,depthWrite:false}));liveRays.frustumCulled=false;scanScene.add(liveRays);
const returnGeom=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]);const returnRay=new THREE.Line(returnGeom,new THREE.LineBasicMaterial({color:0x7ce0cb,transparent:true,opacity:.8}));returnRay.visible=false;scanScene.add(returnRay);
const pulseBall=new THREE.Mesh(new THREE.SphereGeometry(.065,16,8),new THREE.MeshBasicMaterial({color:0xffbc68}));pulseBall.visible=false;scanScene.add(pulseBall);
let cloudIndex=0,totalPoints=0,scanAccumulator=0;
function clearCloud(){cloudIndex=0;totalPoints=0;cloudGeom.setDrawRange(0,0);state.pointCount=0;}
function setLine(line,a,b){const attr=line.geometry.attributes.position;attr.setXYZ(0,a.x,a.y,a.z);attr.setXYZ(1,b.x,b.y,b.z);attr.needsUpdate=true;line.geometry.computeBoundingSphere();}
function channelRay(i,angle){
  const ch=manifest.channels[i],rotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),angle);
  const tx=v(ch.origin_m).applyQuaternion(rotation).add(new THREE.Vector3(0,1.5,0));
  const rx=v(ch.receive_origin_m).applyQuaternion(rotation).add(new THREE.Vector3(0,1.5,0));
  const direction=v(ch.direction).applyQuaternion(rotation).normalize();
  scanRaycaster.set(tx,direction);scanScene.updateMatrixWorld(true);
  const hit=scanRaycaster.intersectObjects(targets.filter(t=>t.visible),false)[0];
  if(!hit)return {tx,rx,direction,hit:null};
  // A return must also have a clear path to its corresponding receiver.
  const towardRx=rx.clone().sub(hit.point);const returnLength=towardRx.length();
  scanRaycaster.set(hit.point.clone().addScaledVector(towardRx.clone().normalize(),.0001),towardRx.normalize());scanRaycaster.far=returnLength-.0002;
  const blocked=scanRaycaster.intersectObjects(targets.filter(t=>t.visible),false).length>0;scanRaycaster.far=18;
  return {tx,rx,direction,hit:blocked?null:hit,returnLength};
}
function recordHit(ray){if(!ray.hit)return;const p=ray.hit.point;cloudPos.set([p.x,p.y,p.z],cloudIndex*3);const col=new THREE.Color().setHSL(.43+clamp(ray.hit.distance/18,0,1)*.1,.65,.62);cloudColors.set([col.r,col.g,col.b],cloudIndex*3);cloudIndex=(cloudIndex+1)%capacity;totalPoints=Math.min(totalPoints+1,capacity);state.pointCount=totalPoints;state.hits++;cloudGeom.setDrawRange(0,totalPoints);cloudGeom.attributes.position.needsUpdate=true;cloudGeom.attributes.color.needsUpdate=true;}
function showReading(ray){$('#hit-name').textContent=ray.hit?.object.userData.target??'当前方向无回波';$('#hit-distance').textContent=ray.hit?`${((ray.hit.distance+ray.returnLength)/2).toFixed(3)} m`:'—';$('#hit-time').textContent=ray.hit?`${((ray.hit.distance+ray.returnLength)/299792458*1e9).toFixed(2)} ns`:'—';}
function scanAt(angle,record=true){let count=0,selected;for(let i=0;i<16;i++){const ray=channelRay(i,angle);if(i===state.channel)selected=ray;if(!ray.hit)continue;if(record)recordHit(ray);livePositions.set([...ray.tx,...ray.hit.point],count*6);count++;}liveGeom.setDrawRange(0,count*2);liveGeom.attributes.position.needsUpdate=true;showReading(selected);return selected;}
function partMeshes(part){const result=[];nodes.get(part)?.traverse(o=>{if(o.isMesh)result.push(o);});return result;}
function selectedBox(){const b=new THREE.Box3();for(const m of partMeshes(state.selected)){if(m.visible)b.expandByObject(m);}return b;}
function restoreMaterials(){for(const [m,props] of materials){m.emissive.copy(props.emissive);m.emissiveIntensity=props.intensity;}}
function selectPart(name){if(!nodes.has(name))return;state.selected=name;state.isolated=false;restoreMaterials();const i=PARTS.findIndex(p=>p[0]===name);const p=PARTS[i];$('#info-num').textContent=`${String(i+1).padStart(2,'0')} / 12`;$('#info-title').textContent=p[1];$('#info-text').textContent=p[2];$('#info-flow').textContent=p[3];document.querySelectorAll('[data-part]').forEach(b=>b.classList.toggle('active',b.dataset.part===name));for(const m of partMeshes(name)){m.material.emissive.setHex(0x2e8f7a);m.material.emissiveIntensity=.035;}$('#isolate-part').textContent='单独看零件';applyVisibility();activeLabel=name;}
function applyVisibility(){if(!model)return;model.traverse(o=>{o.visible=true;});for(const n of ['ir_window','top_lid'])nodes.get(n).visible=state.mode==='assembled'||state.mode==='exploded';if(state.isolated){const chosen=new Set(partMeshes(state.selected));model.traverse(o=>{if(o.isMesh)o.visible=chosen.has(o);});for(const n of ['ir_window','top_lid'])nodes.get(n).visible=true;}}
function frameBox(b){if(b.isEmpty())return;const center=b.getCenter(new THREE.Vector3()),size=b.getSize(new THREE.Vector3());const fit=Math.max(size.y,size.x/stageCamera.aspect,size.z)*.65/Math.tan(THREE.MathUtils.degToRad(stageCamera.fov/2));const direction=stageCamera.position.clone().sub(controls.target).normalize();cameraGoal=center.clone().addScaledVector(direction,Math.max(.035,fit*1.15));targetGoal=center;}
function resetCamera(){const b=new THREE.Box3();model?.traverse(o=>{if(o.isMesh&&o.visible)b.expandByObject(o);});if(state.mode!=='exploded'&&!state.isolated)b.expandByObject(showcase.podium);frameBox(b);}
function syncTransforms(){for(const [name,o] of nodes){const home=homes.get(name);o.position.copy(home.position);if(o.userData.explode_m)o.position.addScaledVector(v(o.userData.explode_m),state.explode);o.quaternion.copy(home.quaternion);}for(const n of manifest.rotating_nodes){const o=nodes.get(n);if(o)o.rotateY(state.angle*(1-state.explode));}if(scanModel){for(const n of manifest.rotating_nodes){const o=scanModel.getObjectByName(n);if(o){o.quaternion.copy(homes.get(n).quaternion);o.rotateY(state.angle);}}}stage.updateMatrixWorld(true);}
function setMode(mode){if(!state.ready)return;state.mode=mode;const modelWrap=document.querySelector('.view-wrap'),scanWrap=document.querySelector('.scan-wrap');if(mode==='scan'){scanWrap.append(modelWrap);}else{document.querySelector('.exhibit').insertBefore(modelWrap,scanWrap);}state.isolated=false;state.pulse=null;pulseBall.visible=returnRay.visible=stageRay.visible=false;document.body.classList.toggle('scanning',mode==='scan');$('.scan-wrap').hidden=mode!=='scan';$('#scan-controls').hidden=mode!=='scan';document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));$('#view-label').textContent=({assembled:'ASSEMBLED / 完整外观',cutaway:'INTERNAL / 内部结构',exploded:'EXPLODED / 总成拆解',scan:'OPTICAL HEAD / 光学头近景'})[mode];$('#state-label').textContent=({assembled:'完整装配 · 保护内部光学组件',cutaway:'外壳已打开 · 转动速度已放慢',exploded:'拆解观察 · 工作转动已停止',scan:'首表面回波 · 传播过程为慢放示意'})[mode];grid.visible=false;floor.visible=mode!=='exploded';$('#rotate').disabled=mode==='exploded';applyVisibility();setTimeout(resetCamera,800);if(mode==='scan'){state.angle=0;clearCloud();}}
for(let i=0;i<PARTS.length;i++){const p=PARTS[i],b=document.createElement('button');b.dataset.part=p[0];b.innerHTML=`<span>${String(i+1).padStart(2,'0')}</span>${p[1]}`;b.onclick=()=>selectPart(p[0]);$('#part-grid').append(b);}
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
function updateRunningButton(){$('#rotate').textContent=state.running?'暂停转动':'继续转动';}
$('#rotate').onclick=()=>{state.running=!state.running;state.pulse=null;pulseBall.visible=returnRay.visible=stageRay.visible=false;updateRunningButton();};updateRunningButton();
$('#reset-camera').onclick=()=>{state.isolated=false;$('#isolate-part').textContent='单独看零件';applyVisibility();resetCamera();};
$('#focus-part').onclick=()=>{state.running=false;updateRunningButton();frameBox(selectedBox());};
$('#isolate-part').onclick=()=>{state.isolated=!state.isolated;$('#isolate-part').textContent=state.isolated?'显示全部零件':'单独看零件';state.running=false;updateRunningButton();applyVisibility();resetCamera();};
$('#wall-distance').oninput=e=>{wall.position.x=Number(e.target.value);$('#wall-value').textContent=`${wall.position.x.toFixed(1)} m`;clearCloud();state.pulse=null;pulseBall.visible=returnRay.visible=false;scanAt(state.angle,false);};
$('#channel').oninput=e=>{state.channel=Number(e.target.value);const a=manifest.channels[state.channel].elevation_deg;$('#channel-value').textContent=`${a>0?'+':''}${a}°`;scanAt(state.angle,false);};
$('#clear-cloud').onclick=clearCloud;
const obstacleButton=document.createElement('button');obstacleButton.id='toggle-obstacle';obstacleButton.textContent='加入近处遮挡';obstacleButton.style.cssText='width:100%;font-size:11px;margin:0 0 12px';$('.readings').before(obstacleButton);obstacleButton.onclick=()=>{obstacle.visible=!obstacle.visible;obstacleButton.textContent=obstacle.visible?'移除近处遮挡':'加入近处遮挡';clearCloud();state.pulse=null;pulseBall.visible=returnRay.visible=false;scanAt(state.angle,false);};
$('#single-pulse').onclick=()=>{state.running=false;state.angle=0;state.explode=0;updateRunningButton();syncTransforms();const ray=scanAt(0,false);state.pulse={ray,t:0};recordHit(ray);pulseBall.visible=!!ray.hit;returnRay.visible=false;stageRay.visible=!!ray.hit;liveGeom.setDrawRange(0,ray.hit?2:0);if(ray.hit){livePositions.set([...ray.tx,...ray.hit.point],0);liveGeom.attributes.position.needsUpdate=true;}const ch=manifest.channels[state.channel],start=v(ch.origin_m);setLine(stageRay,start,start.clone().addScaledVector(v(ch.direction),.045));};
let down=null;renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];});renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>6)return;const rect=renderer.domElement.getBoundingClientRect(),pointer=new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),r=new THREE.Raycaster();r.setFromCamera(pointer,stageCamera);const hits=r.intersectObject(model,true).filter(h=>{let o=h.object;while(o){if(!o.visible)return false;o=o.parent;}return true;});if(!hits.length)return;let o=hits[0].object;while(o&&!PARTS.some(p=>p[0]===o.name))o=o.parent;if(o){selectPart(o.name);if(innerWidth<721)$('#info-title').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'nearest'});}});
try{manifest=await (await fetch('./model-manifest.json')).json();const gltf=await new GLTFLoader().loadAsync('./LD016-engineering.glb');model=gltf.scene;finishHardware(model);model.traverse(o=>{if(o.userData.explode_m){nodes.set(o.name,o);homes.set(o.name,{position:o.position.clone(),quaternion:o.quaternion.clone()});}if(o.isMesh){o.material=o.material.clone();materials.set(o.material,{emissive:o.material.emissive.clone(),intensity:o.material.emissiveIntensity});o.castShadow=o.receiveShadow=true;}});stage.add(model);scanModel=model.clone(true);scanModel.position.y=1.5;scanScene.add(scanModel);state.ready=true;$('#loading').hidden=true;selectPart(PARTS[0][0]);setMode('assembled');resetCamera();if(new URLSearchParams(location.search).get('view')==='scan')setMode('scan');if(new URLSearchParams(location.search).get('view')==='board'){setMode('cutaway');selectPart('timing_board');setTimeout(()=>document.querySelector('#isolate-part').click(),900);}}
catch(e){$('#loading').textContent='模型载入失败，请刷新重试。';console.error(e);}
let last=performance.now();function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.05);last=now;if(document.hidden||!state.ready)return;
 const target=state.mode==='exploded'?1:0;const old=state.explode;state.explode=THREE.MathUtils.damp(state.explode,target,7,dt);if(Math.abs(state.explode-target)<.0005)state.explode=target;
 if(state.running&&state.mode!=='exploded'&&state.explode===0&&!state.pulse)state.angle=(state.angle+dt*(state.mode==='scan'?.4:.25))%(Math.PI*2);
 syncTransforms();if(old!==state.explode&&cameraGoal===null&&Math.abs(state.explode-target)<.01)resetCamera();
 if(cameraGoal){stageCamera.position.lerp(cameraGoal,1-Math.exp(-dt*6));controls.target.lerp(targetGoal,1-Math.exp(-dt*6));if(stageCamera.position.distanceTo(cameraGoal)<.00005){cameraGoal=targetGoal=null;}}
 controls.update();marker.visible=state.isolated; if(marker.visible)marker.box.copy(selectedBox());
 if(activeLabel){const b=selectedBox();if(!b.isEmpty()){const p=b.getCenter(new THREE.Vector3()).project(stageCamera);const rect=$('#model-view').getBoundingClientRect();$('#part-label').textContent=PARTS.find(x=>x[0]===activeLabel)?.[1]??'';$('#part-label').hidden=p.z>1||state.mode==='assembled';$('#part-label').style.left=`${clamp((p.x*.5+.5)*rect.width+20,10,rect.width-140)}px`;$('#part-label').style.top=`${clamp((-p.y*.5+.5)*rect.height-20,45,rect.height-95)}px`;}}
 if(state.mode==='scan'){
   scanAccumulator+=dt;if(scanAccumulator>.04&&!state.pulse){scanAt(state.angle,state.running);scanAccumulator=0;}
   if(state.pulse){const p=state.pulse;p.t+=dt;const ray=p.ray;if(ray.hit){const a=clamp(p.t/.9,0,2);if(a<1){pulseBall.position.lerpVectors(ray.tx,ray.hit.point,a);pulseBall.material.color.setHex(0xffbc68);}else{pulseBall.position.lerpVectors(ray.hit.point,ray.rx,a-1);pulseBall.material.color.setHex(0x7ce0cb);returnRay.visible=true;setLine(returnRay,ray.hit.point,ray.rx);}pulseBall.visible=a<2;stageRay.material.color.setHex(a<1?0xffbc68:0x7ce0cb);if(a>=2)stageRay.visible=false;}}
   scanControls.update();scanRenderer.render(scanScene,scanCamera);
 }showcase.render(dt,state);
}requestAnimationFrame(frame);
// Small inspection interface used by the independent preview's validation script.
window.LD016={state,manifest,nodes,stage,stageCamera,controls,scanScene,targets,wall,obstacle,setMode,selectPart,scanAt,channelRay,resetCamera,renderer,scanRenderer,clearCloud,showcase};
window.addEventListener('pagehide',()=>{showcase.dispose();renderer.dispose();scanRenderer.dispose();environment.dispose();},{once:true});
