import { describe, it, expect } from 'vitest';
import {
  restoreEvolutionDraft,
  evolutionEras,
  evolutionEvidence,
} from '../../../src/learning/activities/evolution-state';
describe('whole-car comparison', () => {
  it('preserves old reasoning and order during migration', () => {
    const old = { order: ['a', 'b'], reasoning: '旧推理' };
    expect(restoreEvolutionDraft(old)).toMatchObject(old);
    expect(restoreEvolutionDraft(old).evolution.era).toBe('modern-ev');
  });
  it('requires two distinct cars and a demonstrated mechanism', () => {
    const d = restoreEvolutionDraft(null);
    expect(evolutionEvidence(d)).toBe(false);
    d.evolution.visited = ['pioneer', 'modern-ev'];
    d.evolution.demonstrated = true;
    expect(evolutionEvidence(d)).toBe(true);
    expect(evolutionEras.map((e) => e.wheels)).toEqual([3, 4, 4, 4]);
  });
});

import { createEvolutionRig } from '../../../src/learning/mechanical-evolution';
import * as THREE from 'three';
it('renders one distinct whole vehicle at a time and stops the wheels when transmission opens', () => {
  const rig = createEvolutionRig();
  const view = {
    mode: 'assembly' as const,
    selected: 'overview',
    isolate: false,
    sensorScene: 'mechanism' as const,
  };
  const s = {
    kind: 'evolution' as const,
    vehicleEra: 'pioneer' as const,
    running: true,
    power: true,
    transmission: true,
  };
  rig.update(s, 2, view);
  const visible = rig.root.children.filter((c) => c.visible);
  expect(visible.map((c) => c.name)).toEqual(['pioneer']);
  expect(visible[0].children.filter((c) => c.name === 'wheel')).toHaveLength(3);
  rig.update({ ...s, vehicleEra: 'modern-ev' }, 2, view);
  const modern = rig.root.children.find((c) => c.visible)!;
  const wheels = modern.children.filter((c) => c.name === 'wheel');
  expect(wheels).toHaveLength(4);
  expect(wheels[0].rotation.z).not.toBe(0);
  rig.update({ ...s, vehicleEra: 'modern-ev', transmission: false }, 2, view);
  expect(wheels[0].rotation.z).toBe(0);
  let bodySurfaces = 0;
  modern.traverse((o) => {
    if (o instanceof THREE.Mesh && o.userData.part === 'body') bodySurfaces++;
  });
  expect(bodySurfaces).toBeGreaterThan(4);
  rig.update({ ...s, vehicleEra: 'modern-ev', cutaway: true }, 2, view);
  let visibleBody = 0;
  modern.traverseVisible((o) => {
    if (o instanceof THREE.Mesh && o.userData.part === 'body') visibleBody++;
  });
  expect(visibleBody).toBe(0);
  rig.dispose();
});
it('keeps era-specific energy hardware and distinct body geometry instead of swapping colors', () => {
  const rig = createEvolutionRig();
  const view = {
    mode: 'assembly' as const,
    selected: 'overview',
    isolate: false,
    sensorScene: 'mechanism' as const,
  };
  const hardware = (era: 'pioneer' | 'early-electric' | 'hybrid' | 'modern-ev') => {
    rig.update({ kind: 'evolution', vehicleEra: era }, 0, view);
    const g = rig.root.children.find((c) => c.visible)!;
    const ids = new Set<string>();
    g.traverse((o) => {
      if (o instanceof THREE.Mesh && o.visible) ids.add(o.userData.part);
    });
    return { g, ids };
  };
  const pioneer = hardware('pioneer');
  expect(pioneer.ids.has('engine')).toBe(true);
  expect(pioneer.ids.has('battery')).toBe(false);
  expect(pioneer.ids.has('motor')).toBe(false);
  const electric = hardware('early-electric');
  expect(electric.ids.has('battery')).toBe(true);
  expect(electric.ids.has('engine')).toBe(false);
  const hybrid = hardware('hybrid');
  expect(hybrid.ids.has('engine')).toBe(true);
  expect(hybrid.ids.has('motor')).toBe(true);
  const modern = hardware('modern-ev');
  expect(modern.ids.has('sensor')).toBe(true);
  expect(modern.ids.has('engine')).toBe(false);
  const skin = (g: THREE.Object3D) => {
    return (g.getObjectByName('bonnet-skin') as THREE.Mesh).geometry.attributes.position.array;
  };
  expect(Array.from(skin(hybrid.g)!)).not.toEqual(Array.from(skin(modern.g)!));
  rig.dispose();
});
