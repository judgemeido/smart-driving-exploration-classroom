import { getDistanceMeters, getScanSlotsBetween, hitReflectiveMarker, rulerMatches } from './measurement';
import { roundTripNanoseconds } from './source';
import type { DomainFact } from '../../shared/arcade/types';
import type { ObjectiveId, SensorScenario, SensorState, SensorAction, SensorTransition, SensorSnapshot } from './types';

export function createSensorState(_scenario:SensorScenario):SensorState {
  return {stage:'pulse',revision:0,directionDegrees:0,receiverPort:null,fired:false,rayTargetId:null,completed:[],hinted:[],scanDegrees:-40,scanStarted:false,sampleSlots:[],selectedTargetId:null,rulerMeters:16,evidenceSlots:[null,null],action:'continue',signal:false,submitted:[],feedback:'转动发射方向，让光束碰到目标 A 的教学反射点。'};
}
export function getSensorSnapshot(state:SensorState,scenario:SensorScenario):SensorSnapshot {
  const measuredTargets = scenario.targets.map(target=>{
    const distanceMeters=getDistanceMeters(target.reflectivePoint);
    return {...target,distanceMeters,roundTripNanoseconds:roundTripNanoseconds(distanceMeters),uniqueSampleIds:state.sampleSlots.filter(slot=>hitReflectiveMarker({x:0,y:0},slot,target.reflectivePoint,scenario.halfAngleDegrees)).map(slot=>`slot-${slot}`)};
  });
  const target=scenario.targets.find(t=>t.id===state.rayTargetId);
  const sensors=state.evidenceSlots;
  return {...state,measuredTargets,ray:target?{reflectivePoint:target.reflectivePoint,distanceMeters:getDistanceMeters(target.reflectivePoint),roundTripNanoseconds:roundTripNanoseconds(getDistanceMeters(target.reflectivePoint))}:null,
    weatherEvidence:scenario.weatherTargets.map((t,i)=>({...t,confirmedFields:sensors.includes(i===0?'lidar':'radar')?(i===0?['距离']:['距离','相对运动']):[]}))};
}
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
export function reduceSensorLab(state:SensorState,action:SensorAction,scenario:SensorScenario):SensorTransition {
  let next=state;
  const facts:DomainFact[]=[];
  const done=(id:ObjectiveId)=>next.completed.includes(id);
  const edit=(patch:Partial<SensorState>)=>{next={...next,...patch,revision:next.revision+1};};
  const feedback=(text:string)=>{next={...next,feedback:text};};
  const assess=(objectiveId:ObjectiveId,correct:boolean,key:string)=>{
    if(done(objectiveId)) return;
    const signature=`${objectiveId}:${key}`;
    if(next.submitted.includes(signature)) return;
    facts.push({objectiveId,revision:next.revision,verdict:correct?'correct':'incorrect',usedHint:next.hinted.includes(objectiveId)});
    next={...next,submitted:[...next.submitted,signature],completed:correct?[...next.completed,objectiveId]:next.completed};
  };
  switch(action.type) {
    case 'hint': {
      const current=state.stage==='pulse'?(done('pulse-hit')?'echo-received':'pulse-hit'):state.stage==='scan'?(done('outline-evidence')?'nearest-mark':'outline-evidence'):(done('sensor-evidence')?'risk-response':'sensor-evidence');
      if(action.objectiveId!==current||done(current)||next.hinted.includes(current)) break;
      edit({hinted:[...next.hinted,current]});
      const hints:Record<ObjectiveId,string>={
        'pulse-hit':`把方向调到 ${scenario.targets[0].bearingDegrees}°，再发射。`,
        'echo-received':'选中接收线头，再点 Rx 接收口，随后发射一次。',
        'outline-evidence':'先从 −40° 采样，再扫到 +40°，每个目标都能获得至少两槽证据。',
        'nearest-mark':'比较三个回波米数，选择 8m 的目标，并把尺移到 8m。',
        'sensor-evidence':'将激光雷达和毫米波雷达接入两个不同证据位，再核对。',
        'risk-response':'将行动杆设为停下，打开提示灯，再应用观察方案。',
      };
      feedback(`${hints[current]} 此目标仍可获得探索分，首次验证分不再获得。`);
      break;
    }
    case 'direction': {
      if(next.stage!=='pulse'||done('echo-received')||!Number.isFinite(action.degrees)) break;
      const degrees=clamp(Math.round(action.degrees/scenario.angleStep)*scenario.angleStep,-40,40);
      if(degrees!==next.directionDegrees) edit({directionDegrees:degrees,fired:false,rayTargetId:null});
      break;
    }
    case 'connect-receiver':
      if(next.stage==='pulse'&&done('pulse-hit')&&!done('echo-received')&&action.port!==next.receiverPort) edit({receiverPort:action.port,fired:false});
      break;
    case 'fire': {
      if(next.stage!=='pulse'||done('echo-received')) break;
      const unlocked=done('pulse-hit');
      const hit=hitReflectiveMarker({x:0,y:0},next.directionDegrees,scenario.targets[0].reflectivePoint,scenario.halfAngleDegrees);
      next={...next,fired:true,rayTargetId:hit?scenario.targets[0].id:null};
      if(!unlocked) {
        assess('pulse-hit',!!hit,`${next.directionDegrees}`);
        feedback(hit?'光碰到了教学反射点，一部分光返回设备。现在把接收线头接入 Rx。':'光束没有碰到目标。转动方向，让光束覆盖教学反射点后再发射。');
      } else if(next.receiverPort===null) feedback('回波接线还空着：先选接收线头，再点一个插口。');
      else {
        const correct=!!hit&&next.receiverPort==='rx';
        assess('echo-received',correct,`${next.directionDegrees}:${next.receiverPort}`);
        feedback(!hit?'光束没有碰到目标，先修正发射方向。':correct?'已接住回波：接收器记录了光走一个来回的时间。':'回波到了设备，把接收头接到 Rx 接收口再试。');
      }
      break;
    }
    case 'next':
      if(next.stage==='pulse'&&done('echo-received')) {edit({stage:'scan'});feedback('从一个方向开始采样，再扫过不同方向，让三个目标各留下至少两份证据。');}
      else if(next.stage==='scan'&&done('nearest-mark')) {edit({stage:'weather'});feedback(`本轮是${scenario.weather==='rain'?'雨':'雾'}天教学情境。把两个传感器接入证据位，核对近处与远处的信息。`);}
      break;
    case 'scan': {
      if(next.stage!=='scan'||done('outline-evidence')||!Number.isFinite(action.degrees)) break;
      const degrees=clamp(Math.round(action.degrees/4)*4,-40,40);
      const passed=next.scanStarted?getScanSlotsBetween(next.scanDegrees,degrees):[degrees];
      const sampleSlots=[...new Set([...next.sampleSlots,...passed])].sort((a,b)=>a-b);
      if(!next.scanStarted||degrees!==next.scanDegrees||sampleSlots.length!==next.sampleSlots.length) edit({scanDegrees:degrees,scanStarted:true,sampleSlots});
      break;
    }
    case 'confirm-outline': {
      if(next.stage!=='scan'||done('outline-evidence')) break;
      const missing=getSensorSnapshot(next,scenario).measuredTargets.find(t=>t.uniqueSampleIds.length<2);
      if(missing) feedback(`${missing.label} 只有 ${missing.uniqueSampleIds.length} 份方向证据，还需要从不同槽位观察；目前不计错误。`);
      else {assess('outline-evidence',true,next.sampleSlots.join(','));feedback('三个目标都有不同方向的证据，轮廓已确认。比较回波距离，选最近的目标并移动标尺。');}
      break;
    }
    case 'select-target':
      if(next.stage==='scan'&&done('outline-evidence')&&!done('nearest-mark')&&scenario.targets.some(t=>t.id===action.targetId)&&next.selectedTargetId!==action.targetId) edit({selectedTargetId:action.targetId});
      break;
    case 'ruler': {
      if(next.stage!=='scan'||!done('outline-evidence')||done('nearest-mark')||!Number.isFinite(action.meters)) break;
      const meters=clamp(Math.round(action.meters/scenario.rulerStep)*scenario.rulerStep,0,32);
      if(meters!==next.rulerMeters) edit({rulerMeters:meters});
      break;
    }
    case 'confirm-nearest': {
      if(next.stage!=='scan'||!done('outline-evidence')||done('nearest-mark')) break;
      if(!next.selectedTargetId) {feedback('先点选一个已测目标，再把标尺移到它的回波距离。');break;}
      const nearest=[...scenario.targets].sort((a,b)=>getDistanceMeters(a.reflectivePoint)-getDistanceMeters(b.reflectivePoint))[0];
      const meters=getDistanceMeters(nearest.reflectivePoint);
      const correct=next.selectedTargetId===nearest.id&&rulerMatches(next.rulerMeters,meters,scenario.profile);
      assess('nearest-mark',correct,`${next.selectedTargetId}:${next.rulerMeters}`);
      feedback(correct?'最近目标与标尺都已验证。可以去天气实验了。':next.selectedTargetId!==nearest.id?'先比较回波米数，最近目标的距离最小；保留标尺，换一个目标再试。':`你标在 ${next.rulerMeters}m，最近目标回波是 ${meters}m，把标尺${next.rulerMeters>meters?'向设备':'远离设备'}移 ${Math.abs(next.rulerMeters-meters)}m。`);
      break;
    }
    case 'plug-evidence': {
      if(next.stage!=='weather'||done('sensor-evidence')||next.evidenceSlots[action.slot]===action.sensor) break;
      if(action.sensor!==null&&next.evidenceSlots.includes(action.sensor)) {feedback('这根证据线已经接入一个位置，请选另一种传感器。');break;}
      const slots=[...next.evidenceSlots] as [typeof action.sensor,typeof action.sensor];slots[action.slot]=action.sensor;
      edit({evidenceSlots:slots});
      break;
    }
    case 'confirm-evidence': {
      if(next.stage!=='weather'||done('sensor-evidence')) break;
      if(next.evidenceSlots.some(s=>s===null)) {feedback('还差一个不同传感器的接线；空位不计错误。');break;}
      const correct=next.evidenceSlots.includes('lidar')&&next.evidenceSlots.includes('radar');
      assess('sensor-evidence',correct,[...next.evidenceSlots].sort().join(','));
      feedback(correct?'两条证据已确认：近处路障的距离，远处目标的距离与相对运动。现在安排观察方案。':'本情境图像不足以确认两项目标。保留已有距离证据，把摄像头换成能补足信息的传感器。');
      break;
    }
    case 'action':
      if(next.stage==='weather'&&done('sensor-evidence')&&!done('risk-response')&&next.action!==action.action) edit({action:action.action});
      break;
    case 'signal':
      if(next.stage==='weather'&&done('sensor-evidence')&&!done('risk-response')&&next.signal!==action.enabled) edit({signal:action.enabled});
      break;
    case 'apply-plan': {
      if(next.stage!=='weather'||!done('sensor-evidence')||done('risk-response')) break;
      const correct=next.action==='stop'&&next.signal;
      assess('risk-response',correct,`${next.action}:${next.signal}`);
      feedback(correct?'测试车停在 4m 观察线并发出提示。未确认不等于没有目标，多种证据仍需核对。':'前方 8m 路障已确认，先在 4m 观察线停下并打开提示灯。这是游戏观察位置，不是现实制动距离。');
      break;
    }
  }
  return {state:next,facts};
}
