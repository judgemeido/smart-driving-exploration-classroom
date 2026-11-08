import type { SceneSnapshot } from './types';
import { normalizeSensorDraft, traceSensor } from './activities/sensor-state';
/** Teaching reduction mechanism, in illustrative model units; not vehicle CAD dimensions. */
export const DRIVE_GEOMETRY = {
  teeth: { input: 18, output: 54 },
  module: 0.038,
  centerDistance: 1.368,
  outputPhase: Math.PI / 54,
} as const;

export function driveMechanism(s: SceneSnapshot, seconds: number) {
  const pose = drivePose(s, seconds);
  const ratio = DRIVE_GEOMETRY.teeth.output / DRIVE_GEOMETRY.teeth.input;
  return {
    motorAngle: pose.motorAngle,
    inputGearAngle: pose.motorAngle,
    outputGearAngle: DRIVE_GEOMETRY.outputPhase - pose.wheelAngle,
    wheelAngle: -pose.wheelAngle || 0,
    motorActive: !!s.running && s.power !== false,
    outputActive: !!s.running && s.power !== false && s.transmission !== false,
    ratio,
    teeth: DRIVE_GEOMETRY.teeth,
    module: DRIVE_GEOMETRY.module,
    pitchRadii: {
      input: (DRIVE_GEOMETRY.teeth.input * DRIVE_GEOMETRY.module) / 2,
      output: (DRIVE_GEOMETRY.teeth.output * DRIVE_GEOMETRY.module) / 2,
    },
  };
}
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
