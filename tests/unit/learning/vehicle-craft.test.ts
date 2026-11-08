import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createMechanicalCar } from '../../../src/learning/vehicle-assembly';
import type { MechanicalView } from '../../../src/learning/mechanical-contract';

const view: MechanicalView = {
  mode: 'assembly',
  selected: 'overview',
  isolate: false,
  sensorScene: 'mechanism',
};
describe('inspectable mechanical whole car', () => {
  it('builds connected named assemblies and four open hubs with independent brakes and suspension', () => {
    const car = createMechanicalCar(false);
    for (const id of [
      'body',
      'chassis',
      'suspension',
      'brake',
      'battery',
      'motor',
      'transmission',
      'computer',
      'interior',
      'sensor',
    ])
      expect(car.parts.has(id)).toBe(true);
    expect(car.wheels).toHaveLength(4);
    for (const wheel of car.wheels) {
      expect(wheel.getObjectByName('open-alloy-rim')).toBeDefined();
      expect(wheel.getObjectByName('tire')).toBeDefined();
    }
    expect(car.root.getObjectByName('copper-windings')).toBeDefined();
    expect(car.root.getObjectByName('battery-module-bank')).toBeDefined();
    expect(car.root.getObjectByName('coolant-circuit')).toBeDefined();
    car.dispose();
  });
  it('opens and decomposes actual subassemblies reversibly and frames a selected mechanism', () => {
    const car = createMechanicalCar(false);
    const s = {
      kind: 'evolution' as const,
      vehicleEra: 'modern-ev' as const,
      power: true,
      transmission: true,
      running: true,
    };
    car.update(s, 1, view);
    const home = car.parts.get('battery')!.position.clone();
    car.update(s, 1, { ...view, mode: 'exploded' });
    expect(car.parts.get('battery')!.position.distanceTo(home)).toBeGreaterThan(0.1);
    car.update(s, 1, view);
    expect(car.parts.get('battery')!.position.toArray()).toEqual(home.toArray());
    car.update(s, 1, { ...view, selected: 'motor', isolate: true });
    expect(car.parts.get('motor')!.visible).toBe(true);
    expect(car.parts.get('chassis')!.visible).toBe(true);
    expect(car.parts.get('chassis')!.userData.contextGhost).toBe(true);
    car.update({ ...s, transmission: false }, 2, view);
    expect(car.wheels.every((w) => w.rotation.z === 0)).toBe(true);
    expect(car.rotor.rotation.z).not.toBe(0);
    car.update({ ...s, power: false }, 2, view);
    expect(car.rotor.rotation.z).toBe(0);
    car.dispose();
    expect(car.root.children).toHaveLength(0);
  });
  it('keeps hybrid energy hardware different and geometry finite in every view', () => {
    const car = createMechanicalCar(true);
    expect(car.parts.has('engine')).toBe(true);
    for (const mode of ['assembly', 'section', 'exploded'] as const) {
      car.update({ kind: 'evolution', vehicleEra: 'hybrid' }, 0, { ...view, mode });
      car.root.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(car.root);
      expect(bounds.isEmpty()).toBe(false);
      expect(bounds.min.toArray().concat(bounds.max.toArray()).every(Number.isFinite)).toBe(true);
    }
    car.dispose();
  });
});
