import { expect, it } from 'vitest';
import { driveMechanism, DRIVE_GEOMETRY } from '../../../src/learning/stage-model';

it('uses matching pitch circles and an external 18/54 tooth pair from one shaft angle', () => {
  const p = driveMechanism({ kind: 'vehicle', power: true, running: true }, 1);
  expect(DRIVE_GEOMETRY.teeth).toEqual({ input: 18, output: 54 });
  expect(p.ratio).toBe(3);
  expect(p.pitchRadii.input + p.pitchRadii.output).toBeCloseTo(DRIVE_GEOMETRY.centerDistance);
  expect(p.inputGearAngle).toBe(p.motorAngle);
  expect(p.outputGearAngle - DRIVE_GEOMETRY.outputPhase).toBeCloseTo(-p.inputGearAngle / 3);
  expect(p.wheelAngle).toBeCloseTo(-p.motorAngle / 3);
});

it('disconnects only output motion while the powered motor and input gear keep rotating', () => {
  const p = driveMechanism({ kind: 'vehicle', power: true, transmission: false, running: true }, 2);
  expect(p.motorActive).toBe(true);
  expect(p.outputActive).toBe(false);
  expect(p.motorAngle).toBe(24);
  expect(p.outputGearAngle).toBe(DRIVE_GEOMETRY.outputPhase);
  expect(p.wheelAngle).toBe(0);
});

it('display decomposition does not break motion and power loss stops both shafts', () => {
  const s = { kind: 'vehicle' as const, power: true, running: true };
  expect(driveMechanism({ ...s, cutaway: true, exploded: true }, 1)).toEqual(driveMechanism(s, 1));
  const stopped = driveMechanism({ ...s, power: false }, 1);
  expect(stopped.motorActive).toBe(false);
  expect(stopped.outputActive).toBe(false);
  expect(stopped.motorAngle).toBe(0);
  expect(stopped.wheelAngle).toBe(0);
});
