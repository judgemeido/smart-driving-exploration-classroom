import type { DomainFact } from '../../shared/arcade/types';
import type { SensorState, SensorAction, SensorScenario } from './types';
import { reduceSensorLab } from './state';
export function commitSensorAction(state:SensorState,action:SensorAction,scenario:SensorScenario,record:(facts:readonly DomainFact[])=>boolean):SensorState {
  const candidate=reduceSensorLab(state,action,scenario);
  return record(candidate.facts)?candidate.state:state;
}
