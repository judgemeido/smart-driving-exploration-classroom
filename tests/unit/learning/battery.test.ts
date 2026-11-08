import { expect, it } from 'vitest';
import {
  batteryTypes,
  parseBatteryDraft,
  batteryObservation,
} from '../../../src/learning/activities/battery-state';
import { createBatteryRig } from '../../../src/learning/mechanical-battery';
import * as THREE from 'three';
it('validates stored battery choices and accepts a first structural observation', () => {
  expect(parseBatteryDraft({ batteryType: 'invented', flow: 'explode', selected: '<script>' })).toEqual({
    batteryType: 'lead-acid',
    flow: 'rest',
    selected: 'overview',
  });
  expect(batteryObservation(parseBatteryDraft(null)).valid).toBe(true);
});
it('records the selected chemistry and the actual energy direction with limits', () => {
  for (const batteryType of Object.keys(batteryTypes)) {
    const discharge = batteryObservation(parseBatteryDraft({ batteryType, flow: 'discharge' }));
    expect(discharge.summary).toContain(batteryTypes[batteryType as keyof typeof batteryTypes].name);
    expect(discharge.metrics).toContainEqual({ label: '能量方向', value: '电池 → 用电器' });
    expect(discharge.notes.join('')).toContain('示意');
    expect(batteryObservation(parseBatteryDraft({ batteryType, flow: 'charge' })).metrics).toContainEqual({
      label: '能量方向',
      value: '充电器 → 电池',
    });
  }
});
it('teaches parallel choices rather than a winner or a false replacement timeline', () => {
  expect(batteryTypes.lfp.era).toBe(batteryTypes.nmc.era);
  expect(batteryTypes['lead-acid'].era).toContain('1859');
  expect(new Set(Object.values(batteryTypes).map((type) => type.tradeoff)).size).toBe(4);
  expect(batteryTypes.lfp.chemistry).toContain('锂离子');
  expect(batteryObservation(parseBatteryDraft(null)).notes.join('')).toContain('1991');
});
it('renders exactly one chemistry and preserves inspectable electrodes when opening each shell', () => {
  const rig = createBatteryRig();
  const view = {
    mode: 'section' as const,
    selected: 'overview',
    isolate: false,
    sensorScene: 'mechanism' as const,
  };
  for (const batteryType of Object.keys(batteryTypes) as (keyof typeof batteryTypes)[]) {
    rig.update({ kind: 'battery', batteryType, batteryFlow: 'charge' }, 0, view);
    const chemistries = rig.root.children.filter((child) =>
      child.children.some((part) => part.userData.part === 'electrodes'),
    );
    expect(chemistries.filter((child) => child.visible)).toHaveLength(1);
    const active = chemistries.find((child) => child.visible)!;
    expect(active.children.find((part) => part.userData.part === 'electrodes')?.visible).toBe(true);
    rig.update({ kind: 'battery', batteryType }, 0, { ...view, selected: 'separator', isolate: true });
    expect(active.children.filter((part) => part.visible).map((part) => part.userData.part)).toEqual([
      'separator',
    ]);
  }
  rig.dispose();
  expect(rig.root.children).toHaveLength(0);
});
it('keeps a separator between each adjacent opposite electrode in cylindrical sections', () => {
  const rig = createBatteryRig();
  for (const batteryType of ['nimh', 'nmc'] as const) {
    rig.update({ kind: 'battery', batteryType }, 0, { mode: 'section', selected: 'overview', isolate: false, sensorScene: 'mechanism' });
    const layers: { radius: number; part: string }[] = [];
    rig.root.traverseVisible(object => {
      if (!(object instanceof THREE.Mesh) || !(object.geometry instanceof THREE.CylinderGeometry)) return;
      if (!object.geometry.parameters.openEnded) return;
      let parent: THREE.Object3D | null = object;
      while (parent && !parent.userData.part) parent = parent.parent;
      layers.push({ radius: object.geometry.parameters.radiusTop, part: parent?.userData.part });
    });
    const inside = layers.sort((a, b) => a.radius - b.radius).filter(layer => ['electrodes', 'separator'].includes(layer.part));
    const shell = layers.find(layer => layer.part === 'cell');
    expect(shell).toBeDefined();
    expect(inside.at(-1)!.radius).toBeLessThan(shell!.radius);
    expect(inside.length).toBeGreaterThan(3);
    for (let index = 1; index < inside.length; index++)
      expect([inside[index - 1].part, inside[index].part]).not.toEqual(['electrodes', 'electrodes']);
  }
  rig.dispose();
});
