import { it, expect } from 'vitest';
import { createEvolutionRig } from '../../../src/learning/mechanical-evolution';
it('shows a supply break separately from a transmission break and stops downstream flow', () => {
  const r = createEvolutionRig(),
    v = {
      mode: 'assembly' as const,
      selected: 'overview',
      isolate: false,
      sensorScene: 'mechanism' as const,
    };
  const s = {
    kind: 'evolution' as const,
    vehicleEra: 'modern-ev' as const,
    energy: 'electric' as const,
    running: true,
    power: true,
    transmission: true,
  };
  const named = (n: string) => {
    let found: any;
    r.root.getObjectByName('modern-ev')!.traverse((o) => {
      if (o.name === n) found = o;
    });
    return found;
  };
  r.update(s, 1, v);
  expect(named('supply-flow').visible).toBe(true);
  expect(named('drive-flow').visible).toBe(true);
  r.update({ ...s, power: false }, 1, v);
  expect(named('supply-break').visible).toBe(true);
  expect(named('supply-flow').visible).toBe(false);
  expect(named('drive-flow').visible).toBe(false);
  r.update({ ...s, transmission: false }, 1, v);
  expect(named('drive-break').visible).toBe(true);
  expect(named('supply-flow').visible).toBe(true);
  expect(named('drive-flow').visible).toBe(false);
  r.dispose();
});
