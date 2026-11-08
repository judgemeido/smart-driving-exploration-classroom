import { describe, expect, it } from 'vitest';
import { createSensorScenario } from '../../../src/activities/sensor-lab/scenario';
import { createSensorState, reduceSensorLab, getSensorSnapshot } from '../../../src/activities/sensor-lab/state';
import type { SensorAction, SensorState } from '../../../src/activities/sensor-lab/types';
const scenario = createSensorScenario({seed:'7K2M4C',profile:'guided'});
function run(actions:SensorAction[],initial=createSensorState(scenario)) {
  let state=initial;
  const facts=[];
  for(const action of actions) {const t=reduceSensorLab(state,action,scenario);state=t.state;facts.push(...t.facts);}
  return {state,facts};
}
function pulseDone():SensorState {return run([{type:'direction',degrees:-20},{type:'fire'},{type:'connect-receiver',port:'rx'},{type:'fire'}]).state;}
function scanDone():SensorState {return run([{type:'next'},{type:'scan',degrees:-40},{type:'scan',degrees:40},{type:'confirm-outline'},{type:'select-target',targetId:'target-1'},{type:'ruler',meters:8},{type:'confirm-nearest'}],pulseDone()).state;}
describe('sensor scientific actions',()=>{
  it('assesses only the outgoing pulse first and leaves empty reception incomplete',()=>{
    const first=run([{type:'direction',degrees:-20},{type:'fire'}]);
    expect(first.facts.map(f=>f.objectiveId)).toEqual(['pulse-hit']);
    expect(run([{type:'fire'}],first.state).facts).toEqual([]);
    expect(getSensorSnapshot(first.state,scenario).ray?.distanceMeters).toBe(8);
  });
  it('keeps a real wrong Tx test repairable and does not award repeated shots',()=>{
    const t=run([{type:'direction',degrees:-20},{type:'fire'},{type:'connect-receiver',port:'tx'},{type:'fire'},{type:'fire'},{type:'connect-receiver',port:'rx'},{type:'fire'},{type:'fire'}]);
    expect(t.facts.map(f=>[f.objectiveId,f.verdict])).toEqual([['pulse-hit','correct'],['echo-received','incorrect'],['echo-received','correct']]);
    expect(t.state.completed).toEqual(['pulse-hit','echo-received']);
    expect(t.state.stage).toBe('pulse');
  });
  it('a missed direction is correctable and an answer hint survives that repair',()=>{
    const t=run([{type:'hint',objectiveId:'pulse-hit'},{type:'fire'},{type:'direction',degrees:-20},{type:'fire'}]);
    expect(t.facts.map(f=>[f.verdict,f.usedHint])).toEqual([['incorrect',true],['correct',true]]);
  });
  it('requires two unique samples on every target and interpolates jumped slots',()=>{
    const base=run([{type:'next'}],pulseDone()).state;
    const one=run([{type:'scan',degrees:-20},{type:'scan',degrees:-20},{type:'confirm-outline'}],base);
    expect(one.facts).toEqual([]);
    expect(one.state.sampleSlots).toEqual([-20]);
    const jumped=run([{type:'scan',degrees:-40},{type:'scan',degrees:40},{type:'confirm-outline'}],base);
    const stepped=run(Array.from({length:21},(_,i)=>({type:'scan',degrees:-40+i*4} as SensorAction)),base);
    expect(jumped.state.sampleSlots).toEqual(stepped.state.sampleSlots);
    expect(getSensorSnapshot(jumped.state,scenario).measuredTargets.every(t=>t.uniqueSampleIds.length>=2)).toBe(true);
    expect(jumped.facts.map(f=>f.objectiveId)).toEqual(['outline-evidence']);
  });
  it('requires both the closest selection and the same metre ruler',()=>{
    const base=run([{type:'next'},{type:'scan',degrees:-40},{type:'scan',degrees:40},{type:'confirm-outline'}],pulseDone()).state;
    const wrong=run([{type:'select-target',targetId:'target-2'},{type:'ruler',meters:8},{type:'confirm-nearest'}],base);
    expect(wrong.facts[0].verdict).toBe('incorrect');
    const repaired=run([{type:'select-target',targetId:'target-1'},{type:'confirm-nearest'}],wrong.state);
    expect(repaired.facts[0].verdict).toBe('correct');
    expect(repaired.state.completed).toContain('nearest-mark');
  });
  it('leaves partial evidence ungraded and allows replacing only the camera lead',()=>{
    const base=run([{type:'next'}],scanDone()).state;
    const partial=run([{type:'plug-evidence',slot:0,sensor:'lidar'},{type:'confirm-evidence'}],base);
    expect(partial.facts).toEqual([]);
    const wrong=run([{type:'plug-evidence',slot:1,sensor:'camera'},{type:'confirm-evidence'}],partial.state);
    expect(wrong.facts[0].verdict).toBe('incorrect');
    expect(getSensorSnapshot(wrong.state,scenario).weatherEvidence[1].confirmedFields).toEqual([]);
    const good=run([{type:'plug-evidence',slot:1,sensor:'radar'},{type:'confirm-evidence'}],wrong.state);
    expect(good.facts[0].verdict).toBe('correct');
    expect(good.state.evidenceSlots).toEqual(['lidar','radar']);
    const unsafe=run([{type:'apply-plan'}],good.state);
    expect(unsafe.facts[0].verdict).toBe('incorrect');
    const safe=run([{type:'action',action:'stop'},{type:'signal',enabled:true},{type:'apply-plan'}],unsafe.state);
    expect(safe.facts.map(f=>[f.objectiveId,f.verdict])).toEqual([['risk-response','correct']]);
    expect(safe.state.completed.length).toBe(6);
  });
});
