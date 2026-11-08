import { expect, it } from 'vitest';
import { createSensorScenario } from '../../../src/activities/sensor-lab/scenario';
import { createSensorState } from '../../../src/activities/sensor-lab/state';
import { commitSensorAction } from '../../../src/activities/sensor-lab/commit';
it('leaves the domain unchanged when the shared session rejects scored or empty-fact actions',()=>{
  const scenario=createSensorScenario({seed:'7K2M4C',profile:'guided'});
  const initial=createSensorState(scenario);
  expect(commitSensorAction(initial,{type:'direction',degrees:-20},scenario,()=>false)).toBe(initial);
  expect(commitSensorAction(initial,{type:'fire'},scenario,()=>false)).toBe(initial);
  const aimed=commitSensorAction(initial,{type:'direction',degrees:-20},scenario,()=>true);
  expect(aimed.directionDegrees).toBe(-20);
  const hit=commitSensorAction(aimed,{type:'fire'},scenario,facts=>facts.length===1&&facts[0].verdict==='correct');
  expect(hit.completed).toContain('pulse-hit');
});
