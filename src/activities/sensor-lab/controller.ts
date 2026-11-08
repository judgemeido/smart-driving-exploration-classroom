import type { ArcadeRunConfig, ArcadeSession } from '../../shared/arcade/types';
import { SENSOR_NAMES } from './content';
import { commitSensorAction } from './commit';
import { clientPointToSvg, drawSensorStage, stageGeometry } from './graphics';
import { createSensorScenario } from './scenario';
import { createSensorState, getSensorSnapshot } from './state';
import type { ObjectiveId, SensorAction, SensorId, Stage } from './types';
import { gameView } from './view';

export interface SensorGameContext {host:HTMLElement;session:ArcadeSession;config:ArcadeRunConfig;seed:number;setGoal(text:string):void;setFeedback(text:string):void}
export function createSensorGame(context:SensorGameContext) {
  const {host,session,config}=context;
  // Read the seed token from the validated public code when available; reference fixtures stay reproducible.
  const codeSeed=config.challengeCode.split('-').find(token=>token==='7K2M4C');
  const scenario=createSensorScenario({seed:codeSeed??context.seed,profile:config.profile,contentVersion:config.contentVersion});
  let state=createSensorState(scenario);
  let active=true;
  let selectedLead:'receiver'|SensorId|null=null;
  let renderedStage:Stage|null=null;
  let lastFeedback='';
  let suppressClick=false;
  let clickSuppressionTimer:ReturnType<typeof setTimeout>|null=null;
  host.innerHTML=gameView;
  const get=<T extends HTMLElement>(selector:string)=>host.querySelector<T>(selector)!;
  const field=get<HTMLDivElement>('[data-sensor-field]');
  const readings=get<HTMLElement>('[data-sensor-readings]');
  const primary=get<HTMLButtonElement>('[data-command="primary"]');
  const direction=get<HTMLInputElement>('#sensor-direction');
  const scan=get<HTMLInputElement>('#sensor-scan');
  const ruler=get<HTMLInputElement>('#sensor-ruler');
  const mobile=window.matchMedia('(max-width:767px)');
  const aimingTool=direction.closest<HTMLElement>('.sensor-tool')!;
  const aimingHome=document.createComment('direction control home');aimingTool.before(aimingHome);
  const primaryHome=document.createComment('primary action home');primary.before(primaryHome);
  const fieldWrap=field.parentElement!;
  const mobileAiming=document.createElement('div');mobileAiming.className='sensor-mobile-aiming';field.after(mobileAiming);
  let initialScrollFrame:number|null=null;
  function placeAimingControls() {
    const compact=mobile.matches&&state.stage==='pulse';
    if(compact) {if(aimingTool.parentElement!==mobileAiming)mobileAiming.append(aimingTool,primary);}
    else {if(aimingTool.parentElement===mobileAiming){aimingHome.after(aimingTool);primaryHome.after(primary);}}
    mobileAiming.hidden=!compact;
    get('.sensor-lab').classList.toggle('is-mobile-pulse',compact);
  }
  const scrollAimingIntoView=()=>{
    if(mobile.matches&&state.stage==='pulse') fieldWrap.scrollIntoView({block:'start',behavior:'instant'});
  };
  const onAimingFocus=(event:FocusEvent)=>{if(aimingTool.contains(event.target as Node))scrollAimingIntoView();};
  const wire=document.createElement('div');wire.className='sensor-drag-wire';wire.hidden=true;wire.setAttribute('aria-hidden','true');host.append(wire);
  let drag:{id:number;source:HTMLButtonElement;lead:'receiver'|SensorId;startX:number;startY:number;started:boolean}|null=null;
  const completed=(id:ObjectiveId)=>state.completed.includes(id);
  const currentObjective=():ObjectiveId=>state.stage==='pulse'?(completed('pulse-hit')?'echo-received':'pulse-hit'):state.stage==='scan'?(completed('outline-evidence')?'nearest-mark':'outline-evidence'):(completed('sensor-evidence')?'risk-response':'sensor-evidence');
  const stageComplete=()=>state.stage==='pulse'?completed('echo-received'):state.stage==='scan'?completed('nearest-mark'):completed('risk-response');
  function cancelSelection() {selectedLead=null;cancelDrag();render();}
  function clearClickSuppression() {
    suppressClick=false;
    if(clickSuppressionTimer!==null) {clearTimeout(clickSuppressionTimer);clickSuppressionTimer=null;}
  }
  function cancelDrag() {
    const previous=drag;drag=null;wire.hidden=true;
    host.querySelectorAll('.is-drop-target').forEach(el=>el.classList.remove('is-drop-target'));
    if(previous?.source.hasPointerCapture(previous.id)) previous.source.releasePointerCapture(previous.id);
  }
  function dispatch(action:SensorAction) {
    if(!active) return;
    const candidate=commitSensorAction(state,action,scenario,facts=>session.record(facts));
    if(candidate===state) return;
    state=candidate;render();
  }
  function render() {
    placeAimingControls();
    const snap=getSensorSnapshot(state,scenario);
    const changedStage=renderedStage!==state.stage;
    if(changedStage) {
      renderedStage=state.stage;
      readings.innerHTML=state.stage==='pulse'?`<p class="sensor-evidence-empty" data-empty-pulse>发射后，这里会留下真实命中的光程记录。</p><dl class="sensor-measurements" data-pulse-measurements hidden><div><dt>单程距离 d</dt><dd data-one-way></dd></div><div><dt>往返路程 2d</dt><dd data-round-trip></dd></div><div><dt>往返时间</dt><dd data-nanoseconds></dd></div></dl><p class="sensor-caption">时间来自光速 299792458m/s；距离计算用往返路程的一半。</p>`:state.stage==='scan'?`<p data-scan-count></p><div class="sensor-target-list">${snap.measuredTargets.map(t=>`<button type="button" data-target="${t.id}" aria-pressed="false"><strong>${t.label}</strong><span data-target-reading="${t.id}"></span></button>`).join('')}</div><p class="sensor-caption">每个目标至少两份不同方向证据。轮廓为教学示意。</p>`:`<p class="sensor-weather-name">${scenario.weather==='rain'?'雨天':'雾天'} · 本轮固定条件</p><dl class="sensor-weather-records">${snap.weatherEvidence.map(t=>`<div><dt>${t.label}</dt><dd data-weather-reading="${t.id}"></dd></div>`).join('')}</dl><p class="sensor-noise-key">三角形样点：干扰</p><p class="sensor-caption">未确认不等于不存在。样点只是教学示意，不能当作设备准确率。</p>`;
    }
    host.querySelectorAll<HTMLElement>('[data-sensor-stage]').forEach(el=>el.hidden=el.dataset.sensorStage!==state.stage);
    host.querySelectorAll<HTMLElement>('[data-step]').forEach(el=>{if(el.dataset.step===state.stage) el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});
    field.innerHTML=drawSensorStage(snap,scenario,field.clientWidth||760);
    field.dataset.pulseBearing=String(scenario.targets[0].bearingDegrees);
    direction.step=String(scenario.angleStep);direction.value=String(state.directionDegrees);
    ruler.step=String(scenario.rulerStep);ruler.value=String(state.rulerMeters);
    scan.value=String(state.scanDegrees);
    get('[data-angle-output]').textContent=`${state.directionDegrees}°`;
    get('[data-scan-output]').textContent=`${state.scanDegrees}°`;
    get('[data-ruler-output]').textContent=`${state.rulerMeters}m`;
    const receive=get<HTMLFieldSetElement>('[data-receiver-tools]');
    receive.disabled=!active||!completed('pulse-hit')||completed('echo-received');
    get('[data-port-status]').textContent=completed('echo-received')?'已接入 Rx，回波已验证。':!completed('pulse-hit')?'命中目标后解锁接收接线。':state.receiverPort?`接收头已接到 ${state.receiverPort==='rx'?'Rx 接收口':'Tx 发射口'}。可选线头更换插口。`:'先选接收线头，再点插口。';
    host.querySelectorAll<HTMLButtonElement>('[data-port]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.port===state.receiverPort)));
    get('[data-command="receiver-lead"]').setAttribute('aria-pressed',String(selectedLead==='receiver'));
    host.querySelectorAll<HTMLButtonElement>('[data-sensor]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.sensor===selectedLead)));
    host.querySelectorAll<HTMLButtonElement>('[data-evidence-slot]').forEach(b=>{const slot=Number(b.dataset.evidenceSlot);const sensor=state.evidenceSlots[slot];b.textContent=`证据位 ${slot+1} · ${sensor?SENSOR_NAMES[sensor]:'空'}`;b.classList.toggle('is-connected',!!sensor);});
    host.querySelectorAll<HTMLButtonElement>('[data-plan]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.plan===state.action)));
    get<HTMLInputElement>('[data-signal]').checked=state.signal;
    get('[data-command="cancel"]').hidden=selectedLead===null;
    get<HTMLButtonElement>('[data-command="hint"]').disabled=!active||stageComplete()||state.hinted.includes(currentObjective());
    if(state.stage==='pulse') {
      get('.sensor-evidence').classList.toggle('is-empty',!snap.ray);
      get('[data-empty-pulse]').hidden=!!snap.ray;
      get('[data-pulse-measurements]').hidden=!snap.ray;
      if(snap.ray) {get('[data-one-way]').textContent=`${snap.ray.distanceMeters}m`;get('[data-round-trip]').textContent=`${snap.ray.distanceMeters*2}m`;get('[data-nanoseconds]').textContent=`${snap.ray.roundTripNanoseconds.toFixed(1)}ns`;}
      direction.disabled=!active||completed('echo-received');
      primary.textContent=stageComplete()?'去扫描与测量':'发射一次';
      context.setGoal(completed('pulse-hit')?'把回波接入 Rx 接收口':'转方向，让光碰到教学反射点');
    } else if(state.stage==='scan') {
      const outlines=completed('outline-evidence');
      get('[data-scan-tools]').hidden=outlines;get('[data-ruler-tools]').hidden=!outlines;
      get('[data-scan-count]').textContent=`已采样 ${state.sampleSlots.length} / 21 个方向槽`;
      snap.measuredTargets.forEach(t=>{
        get(`[data-target-reading="${t.id}"]`).textContent=t.uniqueSampleIds.length?`${t.distanceMeters}m · ${t.uniqueSampleIds.length} 份方向证据`:'等待回波';
        const b=get<HTMLButtonElement>(`[data-target="${t.id}"]`);b.disabled=!active||!outlines||completed('nearest-mark');b.setAttribute('aria-pressed',String(state.selectedTargetId===t.id));b.setAttribute('aria-label',`选择${t.label}，${t.uniqueSampleIds.length?t.distanceMeters+'米':'尚未测量'}`);
      });
      ruler.disabled=!active||completed('nearest-mark');scan.disabled=!active||outlines;
      primary.textContent=stageComplete()?'去天气实验':outlines?'确认最近目标':'确认轮廓';
      context.setGoal(outlines?'选最近目标，把标尺移到回波距离':'扫描不同方向，补全三个目标的证据');
    } else {
      get<HTMLFieldSetElement>('[data-evidence-tools]').disabled=!active||completed('sensor-evidence');
      get('[data-action-tools]').hidden=!completed('sensor-evidence');
      get<HTMLFieldSetElement>('[data-action-tools]').disabled=!active||completed('risk-response');
      snap.weatherEvidence.forEach(t=>{get(`[data-weather-reading="${t.id}"]`).textContent=t.confirmedFields.length?`已确认 · ${t.reflectivePoint.x}m${t.confirmedFields.includes('相对运动')?' · 相对运动':''}`:'未确认 · 缺少可用证据';});
      primary.textContent=completed('sensor-evidence')?'应用观察方案':'核对证据';
      context.setGoal(completed('sensor-evidence')?'在观察线停下，并发出提示':'连接两种传感器，确认近处与远处证据');
    }
    get('[data-stage-caption]').textContent=state.stage==='weather'?'封闭测试道 · 天气样点为教学示意':'俯视原理图 · 光程动画已放慢';
    get('[data-sensor-feedback]').textContent=state.feedback;
    get('[data-sensor-feedback]').classList.toggle('is-success',stageComplete());
    primary.disabled=!active||completed('risk-response');
    if(lastFeedback!==state.feedback) {lastFeedback=state.feedback;context.setFeedback(state.feedback);}
    if(changedStage) {selectedLead=null;if(state.stage==='scan') scan.focus({preventScroll:true});else if(state.stage==='weather') get<HTMLButtonElement>('[data-sensor="lidar"]').focus({preventScroll:true});}
  }
  const onClick=(event:MouseEvent)=>{
    if(suppressClick) {suppressClick=false;return;}
    const target=(event.target as Element).closest<HTMLButtonElement>('button');
    if(!target||!host.contains(target)||target.disabled||!active) return;
    const command=target.dataset.command;
    if(command==='receiver-lead') {selectedLead=selectedLead==='receiver'?null:'receiver';render();}
    else if(command==='cancel') cancelSelection();
    else if(command==='hint') dispatch({type:'hint',objectiveId:currentObjective()});
    else if(command==='primary') {
      if(stageComplete()) dispatch({type:'next'});
      else dispatch({type:state.stage==='pulse'?'fire':state.stage==='scan'?(completed('outline-evidence')?'confirm-nearest':'confirm-outline'):completed('sensor-evidence')?'apply-plan':'confirm-evidence'});
    } else if(command==='sample') dispatch({type:'scan',degrees:state.scanDegrees});
    else if(command?.startsWith('angle-')) dispatch({type:'direction',degrees:state.directionDegrees+(command.endsWith('minus')?-1:1)*scenario.angleStep});
    else if(command?.startsWith('scan-')) dispatch({type:'scan',degrees:state.scanDegrees+(command.endsWith('minus')?-4:4)});
    else if(command?.startsWith('ruler-')) dispatch({type:'ruler',meters:state.rulerMeters+(command.endsWith('minus')?-1:1)*scenario.rulerStep});
    else if(target.dataset.port&&selectedLead==='receiver') {selectedLead=null;dispatch({type:'connect-receiver',port:target.dataset.port as 'tx'|'rx'});}
    else if(target.dataset.sensor) {selectedLead=selectedLead===target.dataset.sensor?null:target.dataset.sensor as SensorId;render();}
    else if(target.dataset.evidenceSlot&&selectedLead&&selectedLead!=='receiver') {const sensor=selectedLead;selectedLead=null;dispatch({type:'plug-evidence',slot:Number(target.dataset.evidenceSlot) as 0|1,sensor});}
    else if(target.dataset.target) dispatch({type:'select-target',targetId:target.dataset.target});
    else if(target.dataset.plan) dispatch({type:'action',action:target.dataset.plan as 'continue'|'slow'|'stop'});
  };
  const onInput=(event:Event)=>{
    const target=event.target;
    if(target===direction) dispatch({type:'direction',degrees:Number(direction.value)});
    else if(target===scan) dispatch({type:'scan',degrees:Number(scan.value)});
    else if(target===ruler) dispatch({type:'ruler',meters:Number(ruler.value)});
    else if(target instanceof HTMLInputElement&&target.hasAttribute('data-signal')) dispatch({type:'signal',enabled:target.checked});
  };
  const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape') cancelSelection();};
  const onPointerCancel=(event:PointerEvent)=>{
    // Touch controls receive implicit capture even when they are not drag handles.
    // Its normal release must not cancel the lead selected by the preceding tap.
    if(!drag||drag.id!==event.pointerId) return;
    selectedLead=null;clearClickSuppression();cancelDrag();render();
  };
  const dropAt=(x:number,y:number)=>document.elementFromPoint(x,y)?.closest<HTMLButtonElement>('[data-port],[data-evidence-slot]')??null;
  const onDown=(event:PointerEvent)=>{
    clearClickSuppression();
    const b=(event.target as Element).closest<HTMLButtonElement>('[data-sensor],[data-command="receiver-lead"]');
    if(!b||!active||b.disabled||b.closest('fieldset')?.disabled||event.button!==0) return;
    drag={id:event.pointerId,source:b,lead:(b.dataset.sensor as SensorId|undefined)??'receiver',startX:event.clientX,startY:event.clientY,started:false};
    b.setPointerCapture(event.pointerId);
  };
  const onMove=(event:PointerEvent)=>{
    if(!drag||drag.id!==event.pointerId) return;
    const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY;
    if(!drag.started&&Math.hypot(dx,dy)<(event.pointerType==='touch'?10:6)) return;
    drag.started=true;
    wire.hidden=false;wire.style.left=`${drag.startX}px`;wire.style.top=`${drag.startY}px`;wire.style.width=`${Math.hypot(dx,dy)}px`;wire.style.transform=`rotate(${Math.atan2(dy,dx)}rad)`;
    host.querySelectorAll('.is-drop-target').forEach(el=>el.classList.remove('is-drop-target'));
    const drop=dropAt(event.clientX,event.clientY);if(drop&&host.contains(drop)) drop.classList.add('is-drop-target');
  };
  const onUp=(event:PointerEvent)=>{
    if(!drag||drag.id!==event.pointerId) return;
    const previous=drag;const drop=dropAt(event.clientX,event.clientY);cancelDrag();
    if(!previous.started) return;
    suppressClick=true;selectedLead=null;
    clickSuppressionTimer=setTimeout(()=>{suppressClick=false;clickSuppressionTimer=null;},0);
    if(drop&&host.contains(drop)) {
      if(previous.lead==='receiver'&&drop.dataset.port) dispatch({type:'connect-receiver',port:drop.dataset.port as 'tx'|'rx'});
      else if(previous.lead!=='receiver'&&drop.dataset.evidenceSlot) dispatch({type:'plug-evidence',slot:Number(drop.dataset.evidenceSlot) as 0|1,sensor:previous.lead});
    }
    render();
  };
  const onFieldClick=(event:MouseEvent)=>{
    if(state.stage!=='scan'||!completed('outline-evidence')||completed('nearest-mark')) return;
    const svg=field.querySelector('svg');if(!svg) return;
    const p=clientPointToSvg(svg,event.clientX,event.clientY);if(!p) return;
    const geometry=stageGeometry(state.stage,scenario,svg.viewBox.baseVal.width);
    const target=scenario.targets.find(t=>{const at=geometry.point(t.reflectivePoint);return Math.hypot(p.x-at.x,p.y-at.y)<=24;});
    if(target) dispatch({type:'select-target',targetId:target.id});
  };
  host.addEventListener('click',onClick);host.addEventListener('input',onInput);host.addEventListener('keydown',onKey);host.addEventListener('pointerdown',onDown);host.addEventListener('pointermove',onMove);host.addEventListener('pointerup',onUp);host.addEventListener('pointercancel',onPointerCancel);host.addEventListener('lostpointercapture',onPointerCancel);window.addEventListener('blur',cancelSelection);field.addEventListener('click',onFieldClick);
  host.addEventListener('focusin',onAimingFocus);mobile.addEventListener('change',render);
  const resize=new ResizeObserver(()=>render());resize.observe(field);
  render();
  initialScrollFrame=requestAnimationFrame(()=>{initialScrollFrame=null;scrollAimingIntoView();});
  return {setActive(value:boolean){active=value;if(!active) {selectedLead=null;clearClickSuppression();cancelDrag();}render();},dispose(){active=false;if(initialScrollFrame!==null)cancelAnimationFrame(initialScrollFrame);clearClickSuppression();cancelDrag();resize.disconnect();host.removeEventListener('focusin',onAimingFocus);mobile.removeEventListener('change',render);host.removeEventListener('click',onClick);host.removeEventListener('input',onInput);host.removeEventListener('keydown',onKey);host.removeEventListener('pointerdown',onDown);host.removeEventListener('pointermove',onMove);host.removeEventListener('pointerup',onUp);host.removeEventListener('pointercancel',onPointerCancel);host.removeEventListener('lostpointercapture',onPointerCancel);window.removeEventListener('blur',cancelSelection);field.removeEventListener('click',onFieldClick);host.replaceChildren();}};
}
