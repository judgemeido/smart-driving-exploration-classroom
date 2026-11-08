import { expect, it } from 'vitest';
import { drivePose, sensorRay, chainFlow } from '../../../src/learning/stage-model';
it('only a powered running motor rotates and transmission separately controls wheels', () => {
  expect(drivePose({ kind: 'vehicle', power: false, running: true }, 1)).toMatchObject({
    motorAngle: 0,
    wheelAngle: 0,
  });
  expect(drivePose({ kind: 'vehicle', power: true, transmission: false, running: true }, 1)).toMatchObject({
    motorAngle: 12,
    wheelAngle: 0,
  });
  expect(drivePose({ kind: 'vehicle', power: true, transmission: true, running: true }, 1)).toMatchObject({
    motorAngle: 12,
    wheelAngle: 4,
  });
  expect(drivePose({ kind: 'vehicle', power: true, running: false, fault: 'actuator' }, 1).wheelAngle).toBe(
    0,
  );
  // A deliberately unsafe rule can still execute with missing sensor input; the visual must show it.
  expect(drivePose({ kind: 'vehicle', power: true, running: true, fault: 'input' }, 1).wheelAngle).toBe(4);
});
it('can show a computed safe-stop command despite unavailable input evidence', () => {
  expect(
    chainFlow({ kind: 'vehicle', chainStep: 3, fault: 'input', chainCommand: true, chainExecuted: true }),
  ).toEqual({ visible: true, input: false, command: true, action: true });
  expect(
    chainFlow({ kind: 'vehicle', chainStep: 3, fault: 'none', chainCommand: true, chainExecuted: false }),
  ).toEqual({ visible: true, input: true, command: true, action: false });
});
it('ray endpoint comes from actual first surface and fog has no fabricated return', () => {
  expect(sensorRay({ kind: 'sensor', distance: 16, angle: 0, occluded: true }).end).toEqual([8, 1.5, 0]);
  const ray = sensorRay({ kind: 'sensor', distance: 16, angle: 5 });
  expect(ray.end[0]).toBeCloseTo(16);
  expect(ray.end[2]).toBeCloseTo(16 * Math.tan((5 * Math.PI) / 180));
  expect(sensorRay({ kind: 'sensor', weather: 'fog' }).status).toBe('unknown');
  expect(sensorRay({ kind: 'sensor', weather: 'fog' }).hasReturn).toBe(false);
});
it('fog probe length is short and independent of hidden target distance', () => {
  expect(sensorRay({ kind: 'sensor', distance: 16, weather: 'fog' }).end).toEqual(
    sensorRay({ kind: 'sensor', distance: 80, weather: 'fog' }).end,
  );
  expect(sensorRay({ kind: 'sensor', distance: 80, weather: 'fog' }).end[0]).toBeLessThanOrEqual(4);
});
it('information chain stops at each fault and advances only to the selected stage', () => {
  expect(chainFlow({ kind: 'vehicle', chainStep: 3, fault: 'input' })).toEqual({
    visible: true,
    input: false,
    command: false,
    action: false,
  });
  expect(chainFlow({ kind: 'vehicle', chainStep: 3, fault: 'compute' })).toEqual({
    visible: true,
    input: true,
    command: false,
    action: false,
  });
  expect(chainFlow({ kind: 'vehicle', chainStep: 3, fault: 'actuator' })).toEqual({
    visible: true,
    input: true,
    command: true,
    action: false,
  });
  expect(chainFlow({ kind: 'vehicle', chainStep: 1 })).toEqual({
    visible: true,
    input: true,
    command: false,
    action: false,
  });
  expect(chainFlow({ kind: 'vehicle' }).visible).toBe(false);
});
