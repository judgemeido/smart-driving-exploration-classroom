import type { SceneSnapshot } from './types';
import { normalizeSensorDraft, traceSensor } from './activities/sensor-state';
export function drivePose(s: SceneSnapshot, seconds: number) {
  const time = Math.max(0, Math.min(3, Number.isFinite(seconds) ? seconds : 0));
  const motor = !!s.running && s.power !== false;
  return {
    motorAngle: motor ? time * 12 : 0,
    wheelAngle: motor && s.transmission !== false ? time * 4 : 0,
    explode: s.exploded ? 1 : 0,
  };
}
export function sensorRay(s: SceneSnapshot) {
  const draft = normalizeSensorDraft(s),
    trace = traceSensor(draft),
    a = (draft.angle * Math.PI) / 180;
  const distance =
    trace.status === 'unknown' ? 3 : (trace.distance ?? Math.min(draft.distance, 24) / Math.cos(a));
  return {
    distance: trace.distance,
    timeNs: trace.timeNs,
    status: trace.status,
    hasReturn: trace.distance !== null,
    end: [distance * Math.cos(a), 1.5, distance * Math.sin(a)] as [number, number, number],
  };
}
export function chainFlow(s: SceneSnapshot) {
  const visible = s.kind === 'vehicle' && typeof s.chainStep === 'number';
  const step = s.chainStep ?? 0;
  const input = visible && step >= 1 && s.fault !== 'input';
  const command = visible && step >= 2 && (s.chainCommand ?? (input && s.fault !== 'compute'));
  return {
    visible,
    input,
    command,
    action: command && step >= 3 && (s.chainExecuted ?? s.fault !== 'actuator'),
  };
}
