import type { Point, SensorScenario, SensorSnapshot, Stage } from './types';

export function stageGeometry(stage:Stage,scenario:SensorScenario,width:number) {
  const w=Math.max(260,Math.round(width)),height=300,maxMeters=stage==='pulse'?12:32;
  const weather=stage==='weather';
  const targets=weather?scenario.weatherTargets:stage==='pulse'?scenario.targets.slice(0,1):scenario.targets;
  const anchors=[
    {p:{x:0,y:0},left:56,right:0,top:56,bottom:60},
    {p:{x:maxMeters,y:0},left:0,right:24,top:0,bottom:0},
    ...targets.map(t=>({p:t.reflectivePoint,left:weather?60:36,right:weather?60:36,top:weather?66:49,bottom:weather?55:22})),
  ];
  const plotBottom=height-(stage==='scan'?80:8);
  // Find a single uniform metre scale that satisfies every marker and label box.
  // The SVG never scales its text; instead the metre projection fits the scene.
  let scale=Infinity;
  for(const a of anchors) for(const b of anchors) {
    if(a.p.x>b.p.x) scale=Math.min(scale,(w-8-a.right-8-b.left)/(a.p.x-b.p.x));
    if(a.p.y>b.p.y) scale=Math.min(scale,(plotBottom-a.bottom-8-b.top)/(a.p.y-b.p.y));
  }
  scale*=0.999;
  const left=Math.max(...anchors.map(a=>8+a.left-a.p.x*scale));
  const right=Math.min(...anchors.map(a=>w-8-a.right-a.p.x*scale));
  const top=Math.max(...anchors.map(a=>8+a.top-a.p.y*scale));
  const bottom=Math.min(...anchors.map(a=>plotBottom-a.bottom-a.p.y*scale));
  const origin={x:(left+right)/2,y:(top+bottom)/2};
  return {width:w,height,maxMeters,origin,scale,point:(p:Point)=>({x:origin.x+p.x*scale,y:origin.y+p.y*scale})};
}

/** SVG uses the same metre points as the reducer. Labels keep CSS-pixel sizes at every viewport. */
export function drawSensorStage(snapshot:SensorSnapshot,scenario:SensorScenario,width:number):string {
  const geometry=stageGeometry(snapshot.stage,scenario,width);
  const {width:w,height:h,maxMeters,origin,scale,point}=geometry;
  const pulse=snapshot.stage==='pulse';
  const weather=snapshot.stage==='weather';
  const pol=(distance:number,angle:number)=>point({x:distance*Math.cos(angle*Math.PI/180),y:distance*Math.sin(angle*Math.PI/180)});
  const line=(a:Point,b:Point,extra='')=>`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" ${extra}/>`;
  const marker=(p:Point)=>`<circle cx="${p.x}" cy="${p.y}" r="5" class="sensor-reflect"/><path d="M${p.x-9} ${p.y}h18M${p.x} ${p.y-9}v18" class="sensor-marker"/>`;
  const angle=pulse?snapshot.directionDegrees:snapshot.scanDegrees;
  const upper=pol(maxMeters,angle-scenario.halfAngleDegrees),lower=pol(maxMeters,angle+scenario.halfAngleDegrees),end=pol(maxMeters,angle);
  let drawing=`<defs><marker id="sensor-out-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 1L6 4L0 7" fill="none" stroke="currentColor" stroke-width="1.6"/></marker><marker id="sensor-back-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 1L6 4L0 7" fill="none" stroke="currentColor" stroke-width="1.6"/></marker></defs>`;
  if(!weather) {
    for(let m=4;m<=maxMeters;m+=4) {
      const r=m*scale;
      const a=pol(m,-44),b=pol(m,40);
      drawing+=`<path d="M${a.x} ${a.y}A${r} ${r} 0 0 1 ${b.x} ${b.y}" class="sensor-range-arc"/>`;
    }
    drawing+=`<path d="M${origin.x} ${origin.y}L${upper.x} ${upper.y}L${lower.x} ${lower.y}Z" class="sensor-beam-area"/>`;
    drawing+=line(origin,end,'class="sensor-direction"');
    const targets=pulse?snapshot.measuredTargets.slice(0,1):snapshot.measuredTargets;
    targets.forEach((t,i)=>{
      const p=point(t.reflectivePoint),samples=t.uniqueSampleIds.length,visible=pulse||samples>=2;
      drawing+=`<g data-stage-target="${t.id}" class="sensor-object ${snapshot.selectedTargetId===t.id?'is-selected':''}"><circle cx="${p.x}" cy="${p.y}" r="20" class="sensor-target-zone"/>`;
      if(visible) drawing+=i===1?`<path d="M${p.x-17} ${p.y+15}L${p.x} ${p.y-17}L${p.x+17} ${p.y+15}Z" class="sensor-target-shape"/>`:i===2?`<circle cx="${p.x}" cy="${p.y}" r="17" class="sensor-target-shape"/>`:`<rect x="${p.x-16}" y="${p.y-16}" width="32" height="32" rx="3" class="sensor-target-shape"/>`;
      if(!pulse) t.uniqueSampleIds.forEach((_,n)=>drawing+=`<circle cx="${p.x+Math.cos(n*2.1)*15}" cy="${p.y+Math.sin(n*2.1)*15}" r="4" class="sensor-sample"/>`);
      if(pulse||samples>0) drawing+=marker(p);
      drawing+=`<text x="${p.x}" y="${p.y-31}" text-anchor="middle">${t.label}</text></g>`;
    });
    if(pulse&&snapshot.fired) {
      const to=snapshot.ray?point(snapshot.ray.reflectivePoint):end;
      const outgoing={x:origin.x,y:origin.y-6};
      drawing+=line(outgoing,{x:to.x,y:to.y-6},'class="sensor-outgoing sensor-travel" marker-end="url(#sensor-out-arrow)"');
      if(snapshot.ray) {
        drawing+=line({x:to.x,y:to.y+8},{x:origin.x,y:origin.y+8},'class="sensor-return sensor-travel" marker-end="url(#sensor-back-arrow)"');
        const bad=snapshot.receiverPort==='tx';
        const rx={x:origin.x-31,y:origin.y+44};
        drawing+=`<path d="M${origin.x} ${origin.y+8}L${origin.x-10} ${origin.y+8}L${rx.x} ${rx.y}" class="${bad?'sensor-broken':'sensor-return'}" stroke-dasharray="6 5"/>`;
        if(bad) drawing+=`<path d="M${rx.x-7} ${rx.y-7}l14 14m-14 0l14-14" class="sensor-broken"/><text x="${origin.x+8}" y="${origin.y+55}" class="sensor-error-label">Tx 不是接收口</text>`;
        else if(snapshot.receiverPort==='rx') drawing+=`<circle cx="${rx.x}" cy="${rx.y}" r="7" class="sensor-received"/>`;
      }
    }
    if(!pulse) {
      const meterY=h-32;
      drawing+=`<path d="M${origin.x} ${meterY}H${point({x:32,y:0}).x}" class="sensor-measure-axis"/>`;
      for(let m=0;m<=32;m+=4) {const x=point({x:m,y:0}).x;drawing+=`<path d="M${x} ${meterY-5}v10" class="sensor-measure-axis"/>${w<500&&m%8!==0?'':`<text x="${x}" y="${meterY+23}" text-anchor="middle">${m}</text>`}`;}
      drawing+=`<text x="${w-6}" y="${meterY+23}" text-anchor="end">m</text>`;
      if(snapshot.completed.includes('outline-evidence')) {
        // The ruler is radial distance, never the target's horizontal coordinate.
        const x=point({x:snapshot.rulerMeters,y:0}).x;
        drawing+=`<path d="M${x} ${meterY-26}v29" class="sensor-ruler"/><path d="M${x-7} ${meterY-26}h14l-7 10Z" class="sensor-ruler-head"/><text x="${x}" y="${meterY-33}" text-anchor="middle" class="sensor-ruler-label">${snapshot.rulerMeters}m</text>`;
      }
    }
  } else {
    drawing+=`<rect x="${origin.x-14}" y="${origin.y-48}" width="${w-origin.x-4}" height="96" rx="8" class="sensor-test-road"/>`;
    const stop=point({x:4,y:0});
    drawing+=`<path d="M${stop.x} ${origin.y-62}v124" class="sensor-observation-line"/><text x="${stop.x}" y="${origin.y+91}" text-anchor="middle">4m 观察线</text>`;
    snapshot.weatherEvidence.forEach((target,i)=>{
      const p=point(target.reflectivePoint);
      const confirmed=target.confirmedFields.length>0;
      drawing+=`<g data-stage-target="${target.id}"><rect x="${p.x-16}" y="${p.y-16}" width="32" height="32" rx="${i?16:2}" class="sensor-weather-target ${confirmed?'is-confirmed':''}"/>${marker(p)}<text x="${p.x}" y="${p.y-48}" text-anchor="middle">${i===0?'路障 8m':'远目标 24m'}</text>`;
      target.visibleSampleIds.forEach(id=>{const n=Number(id.at(-1));drawing+=`<circle cx="${p.x+Math.cos(n*Math.PI/3)*21}" cy="${p.y+Math.sin(n*Math.PI/3)*21}" r="3.5" class="sensor-sample"/>`;});
      drawing+=`<text x="${p.x}" y="${p.y+51}" text-anchor="middle" class="${confirmed?'sensor-confirmed-label':''}">${confirmed?'已确认':'未确认'}</text></g>`;
    });
    snapshot.weatherEvidence[0].noiseSampleIds.forEach((id,i)=>{
      const p=point({x:11+i*4,y:(Number(id.at(-1))%2===0?-1:1)*3});
      drawing+=`<path d="M${p.x} ${p.y-5}l5 9h-10Z" class="sensor-noise"/>`;
    });
    const planEnd=point({x:snapshot.action==='stop'?4:snapshot.action==='slow'?6:12,y:0});
    drawing+=line({x:origin.x,y:origin.y+30},{x:planEnd.x,y:origin.y+30},'class="sensor-plan" marker-end="url(#sensor-out-arrow)"');
    if(snapshot.signal) drawing+=`<path d="M${origin.x-22} ${origin.y-38}l-7-10m29 10l7-10m-18 7v-13" class="sensor-signal"/>`;
    drawing+=`<text x="${origin.x}" y="${h-18}">虚线：计划路径</text>`;
  }
  drawing+=`<rect x="${origin.x-48}" y="${origin.y-27}" width="43" height="55" rx="8" class="sensor-device"/><circle cx="${origin.x-25}" cy="${origin.y-8}" r="11" class="sensor-device-lens"/><path d="M${origin.x-35} ${origin.y+13}h20" class="sensor-device-detail"/><circle cx="${origin.x-3}" cy="${origin.y}" r="5" class="sensor-aperture"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true" focusable="false">${drawing}</svg>`;
}

/** Pointer coordinates become SVG units using the browser's inverse screen transform. */
export function clientPointToSvg(svg:SVGSVGElement,clientX:number,clientY:number):Point|null {
  const matrix=svg.getScreenCTM();
  if(!matrix) return null;
  const point=svg.createSVGPoint();point.x=clientX;point.y=clientY;
  const local=point.matrixTransform(matrix.inverse());
  return {x:local.x,y:local.y};
}
