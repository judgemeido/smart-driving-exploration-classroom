import { expect,it,vi } from 'vitest';
vi.mock('../../../docs/content/2026-11-08-upper-primary/03-lidar.json',()=>{throw new Error('Optional preparation documents are unavailable');});
it('runs scientific measurement and the full lab without optional preparation documents',async()=>{
  const {sensorLearningContent,roundTripNanoseconds}=await import('../../../src/activities/sensor-lab/source');
  const {createSensorScenario}=await import('../../../src/activities/sensor-lab/scenario');
  const {createSensorState,reduceSensorLab}=await import('../../../src/activities/sensor-lab/state');
  const scenario=createSensorScenario({seed:'7K2M4C',profile:'guided'});
  const aim=reduceSensorLab(createSensorState(scenario),{type:'direction',degrees:-20},scenario);
  const hit=reduceSensorLab(aim.state,{type:'fire'},scenario);
  expect(hit.facts[0].verdict).toBe('correct');
  expect(roundTripNanoseconds(20).toFixed(1)).toBe('133.4');
  expect(sensorLearningContent.sensorCards.find(c=>c.id==='sensor-gnss')?.limits).toContain('不能识别行人');
  expect(sensorLearningContent.steps).toHaveLength(4);
});
