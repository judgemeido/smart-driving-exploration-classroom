import * as THREE from 'three';
import type { MechanicalRig, MechanicalView } from './mechanical-contract';
import { parseBatteryDraft, type BatteryType } from './activities/battery-state';

/** Illustrative cells, not historical replicas or dimensional specifications.
 * Plate stacks / wound electrodes are enlarged; arrows show energy, not ion paths. */
export function createBatteryRig(): MechanicalRig {
  const root = new THREE.Group();
  root.name = '可充电电池结构观察台';
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const geometry = <T extends THREE.BufferGeometry>(g: T) => {
    geometries.add(g);
    return g;
  };
  const material = (color: string, metalness = 0.2) => {
    const m = new THREE.MeshStandardMaterial({ color, metalness, roughness: 0.56, side: THREE.DoubleSide });
    materials.add(m);
    return m;
  };
  const shell = material('#536a63'),
    silver = material('#aab8b8', 0.7),
    dark = material('#34433e'),
    positive = material('#c2784f', 0.5),
    negative = material('#49505a'),
    separator = material('#c3b58b'),
    red = material('#b74a3c'),
    green = material('#3d745d'),
    white = material('#e1e2d7'),
    blue = material('#607e8c');
  const boxGeo = geometry(new THREE.BoxGeometry(1, 1, 1));
  const cylinderGeo = geometry(new THREE.CylinderGeometry(1, 1, 1, 40));
  const ringGeo = geometry(new THREE.TorusGeometry(1, 0.045, 8, 40));
  const coneGeo = geometry(new THREE.ConeGeometry(0.15, 0.3, 20));
  function mesh(
    parent: THREE.Object3D,
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    pos: number[],
    size: number[],
  ) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(pos[0], pos[1], pos[2]);
    m.scale.set(size[0], size[1], size[2]);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  const box = (p: THREE.Object3D, m: THREE.Material, pos: number[], size: number[]) =>
    mesh(p, boxGeo, m, pos, size);
  const cylinder = (p: THREE.Object3D, m: THREE.Material, pos: number[], r: number, h: number) =>
    mesh(p, cylinderGeo, m, pos, [r, h, r]);
  const base = new THREE.Group();
  base.userData.excludeFromFit = true;
  root.add(base);
  box(base, white, [0, 0.13, 0], [6.4, 0.26, 3.5]);
  for (const x of [-2.6, 2.6]) for (const z of [-1.3, 1.3]) cylinder(base, dark, [x, 0.02, z], 0.13, 0.15);
  const models = new Map<
    BatteryType,
    { group: THREE.Group; parts: Map<string, THREE.Group>; lids: THREE.Group[] }
  >();
  for (const type of ['lead-acid', 'nimh', 'lfp', 'nmc'] as const) {
    const group = new THREE.Group();
    root.add(group);
    const parts = new Map<string, THREE.Group>();
    for (const id of ['cell', 'electrodes', 'separator', 'terminals', 'pack']) {
      const p = new THREE.Group();
      p.userData.part = id;
      p.name = id;
      group.add(p);
      parts.set(id, p);
    }
    const cell = parts.get('cell')!,
      electrodes = parts.get('electrodes')!,
      membranes = parts.get('separator')!,
      terminals = parts.get('terminals')!,
      pack = parts.get('pack')!;
    const lid = new THREE.Group();
    lid.userData.part = 'cell';
    cell.add(lid);
    // A secondary module makes the difference between cell and pack visible.
    box(pack, silver, [0, 0.36, -1.05], [3.5, 0.15, 0.5]);
    for (let i = 0; i < 8; i++) {
      if (type === 'nimh' || type === 'nmc')
        cylinder(pack, type === 'nimh' ? green : blue, [-1.35 + i * 0.38, 0.62, -1.05], 0.13, 0.42);
      else box(pack, type === 'lfp' ? silver : shell, [-1.35 + i * 0.38, 0.6, -1.05], [0.29, 0.36, 0.3]);
      box(pack, positive, [-1.35 + i * 0.38, 0.84, -1.05], [0.3, 0.025, 0.08]);
    }
    if (type === 'lead-acid' || type === 'lfp') {
      const width = type === 'lead-acid' ? 2.8 : 3.5,
        height = type === 'lead-acid' ? 1.65 : 1.32,
        depth = type === 'lead-acid' ? 1.45 : 0.78;
      box(cell, type === 'lead-acid' ? shell : silver, [0, 0.42, 0], [width, 0.12, depth]);
      box(
        cell,
        type === 'lead-acid' ? shell : silver,
        [0, 0.42 + height / 2, -depth / 2],
        [width, height, 0.09],
      );
      for (const x of [-width / 2, width / 2])
        box(cell, type === 'lead-acid' ? shell : silver, [x, 0.42 + height / 2, 0], [0.09, height, depth]);
      box(
        lid,
        type === 'lead-acid' ? shell : silver,
        [0, 0.42 + height, 0],
        [width + 0.12, 0.15, depth + 0.1],
      );
      box(
        lid,
        type === 'lead-acid' ? shell : silver,
        [0, 0.42 + height / 2, depth / 2],
        [width, height, 0.09],
      );
      // Lead-acid: six compartments, each with alternating plate pairs and separators.
      // The six vent caps correspond to compartments, not to individual electrodes.
      const n = type === 'lead-acid' ? 18 : 12;
      for (let i = 0; i < n; i++) {
        const compartment = Math.floor(i / 3);
        const x =
          type === 'lead-acid'
            ? -width / 2 + ((compartment + 0.5) * width) / 6
            : -width / 2 + 0.18 + (i * (width - 0.36)) / (n - 1);
        box(
          electrodes,
          i % 2 ? negative : positive,
          [x, 0.42 + height * 0.48, type === 'lead-acid' ? ((i % 3) - 1) * 0.28 : 0],
          type === 'lead-acid' ? [0.36, height * 0.8, 0.08] : [0.09, height * 0.8, depth * 0.65],
        );
        box(
          membranes,
          separator,
          [
            x + (type === 'lead-acid' ? 0 : 0.055),
            0.42 + height * 0.48,
            type === 'lead-acid' ? ((i % 3) - 1) * 0.28 + 0.06 : 0.02,
          ],
          type === 'lead-acid' ? [0.38, height * 0.85, 0.025] : [0.025, height * 0.85, depth * 0.7],
        );
      }
      if (type === 'lead-acid') {
        for (let i = 0; i < 6; i++) {
          const x = -width / 2 + ((i + 0.5) * width) / 6;
          cylinder(lid, dark, [x, 0.42 + height + 0.12, 0], 0.095, 0.09);
          box(electrodes, positive, [x, 0.42 + height * 0.88, -depth * 0.18], [0.29, 0.07, 0.1]);
          box(electrodes, negative, [x, 0.42 + height * 0.88, depth * 0.18], [0.29, 0.07, 0.1]);
          if (i < 5)
            box(
              cell,
              shell,
              [-width / 2 + ((i + 1) * width) / 6, 0.42 + height * 0.47, 0],
              [0.035, height * 0.93, depth * 0.94],
            );
        }
      }
      for (const [i, x] of [-width * 0.34, width * 0.34].entries()) {
        cylinder(
          terminals,
          i ? red : dark,
          [x, 0.42 + height + 0.22, 0],
          type === 'lead-acid' ? 0.15 : 0.09,
          0.28,
        );
        box(terminals, silver, [x, 0.42 + height + 0.37, 0], [0.3, 0.05, 0.18]);
        // Physical raised polarity marks; meaning does not depend on red/black alone.
        box(terminals, i ? red : dark, [x, 0.42 + height + 0.41, 0.15], [0.2, 0.025, 0.04]);
        if (i) box(terminals, red, [x, 0.42 + height + 0.41, 0.15], [0.04, 0.025, 0.2]);
      }
    } else {
      const radius = type === 'nimh' ? 0.63 : 0.82,
        height = type === 'nimh' ? 2.25 : 1.9;
      const outer = geometry(
        new THREE.CylinderGeometry(radius, radius, height, 48, 1, true, Math.PI * 0.45, Math.PI * 1.55),
      );
      mesh(cell, outer, type === 'nimh' ? green : blue, [-0.45, 0.42 + height / 2, 0], [1, 1, 1]);
      cylinder(cell, silver, [-0.45, 0.43, 0], radius, 0.09);
      cylinder(lid, silver, [-0.45, 0.42 + height, 0], radius, 0.09);
      const cap = geometry(
        new THREE.CylinderGeometry(radius, radius, height, 32, 1, true, 0, Math.PI * 0.45),
      );
      mesh(lid, cap, type === 'nimh' ? green : blue, [-0.45, 0.42 + height / 2, 0], [1, 1, 1]);
      for (let i = 0; i < 12; i++) {
        const membrane = i % 2 === 1;
        const layerMaterial = membrane ? separator : i % 4 === 0 ? negative : positive;
        const r = 0.15 + (i * (radius - 0.23)) / 11;
        const winding = geometry(
          new THREE.CylinderGeometry(r, r, height * 0.87, 48, 1, true, Math.PI * 0.45, Math.PI * 1.55),
        );
        mesh(
          membrane ? membranes : electrodes,
          winding,
          layerMaterial,
          [-0.45, 0.42 + height / 2, 0],
          [1, 1, 1],
        );
        const ring = mesh(
          membrane ? membranes : electrodes,
          ringGeo,
          layerMaterial,
          [-0.45, 0.42 + height * 0.94, 0],
          [r, r, 1],
        );
        ring.rotation.x = Math.PI / 2;
      }
      cylinder(terminals, red, [-0.45, 0.42 + height + 0.12, 0], 0.22, 0.16);
      box(terminals, dark, [-0.45, 0.38, 0], [0.45, 0.06, 0.32]);
      // Separate companion cell demonstrates module assembly without disguising the hero section.
      cylinder(pack, type === 'nimh' ? green : blue, [1.1, 0.42 + height / 2, 0], radius * 0.65, height);
      cylinder(pack, silver, [1.1, 0.45 + height, 0], radius * 0.65, 0.07);
      cylinder(pack, red, [1.1, 0.54 + height, 0], 0.14, 0.12);
    }
    models.set(type, { group, parts, lids: [lid] });
  }
  // External circuit: a single reversible energy path; static arrowheads remain legible at rest.
  const circuit = new THREE.Group();
  root.add(circuit);
  box(circuit, dark, [2.45, 0.7, 0.65], [0.95, 0.8, 0.75]);
  box(circuit, white, [2.45, 0.85, 1.04], [0.7, 0.35, 0.025]);
  const plug = new THREE.Group();
  circuit.add(plug);
  box(plug, green, [2.45, 1.25, 0.65], [0.35, 0.35, 0.25]);
  const lamp = new THREE.Group();
  circuit.add(lamp);
  const bulbGeo = geometry(new THREE.SphereGeometry(0.24, 20, 12));
  mesh(lamp, bulbGeo, positive, [2.45, 1.3, 0.65], [1, 1, 1]);
  const arrows = new THREE.Group();
  root.add(arrows);
  box(arrows, positive, [0.65, 0.65, 1.28], [2.35, 0.06, 0.06]);
  for (const x of [-0.2, 0.65, 1.5]) {
    const arrow = mesh(arrows, coneGeo, positive, [x, 0.65, 1.28], [1, 1, 1]);
    arrow.rotation.z = -Math.PI / 2;
  }
  return {
    root,
    update(snapshot, _seconds, view) {
      const state = parseBatteryDraft({ batteryType: snapshot.batteryType, flow: snapshot.batteryFlow });
      for (const [type, model] of models) {
        model.group.visible = type === state.batteryType;
        for (const [id, p] of model.parts) {
          p.visible = !view.isolate || view.selected === 'overview' || view.selected === id;
          p.position.set(0, 0, 0);
          if (view.mode === 'exploded') {
            if (id === 'electrodes') p.position.x = -0.45;
            if (id === 'separator') p.position.x = 0.55;
            if (id === 'terminals') p.position.y = 0.7;
            if (id === 'pack') p.position.z = -0.5;
          }
        }
        for (const lid of model.lids) {
          lid.visible = view.mode !== 'section';
          lid.position.y = view.mode === 'exploded' ? 1.05 : 0;
        }
      }
      base.visible = !view.isolate;
      circuit.visible = !view.isolate && state.flow !== 'rest';
      plug.visible = state.flow === 'charge';
      lamp.visible = state.flow === 'discharge';
      arrows.visible = !view.isolate && state.flow !== 'rest';
      arrows.scale.x = state.flow === 'charge' ? -1 : 1;
      arrows.position.x = state.flow === 'charge' ? 1.3 : 0;
    },
    camera(view: MechanicalView) {
      return view.isolate && view.selected !== 'overview'
        ? { position: [4.5, 3.5, 5.5], target: [0, 1.4, 0] }
        : { position: [5.5, 4.5, 6.6], target: [0.2, 1.35, 0] };
    },
    dispose() {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      root.clear();
    },
  };
}
