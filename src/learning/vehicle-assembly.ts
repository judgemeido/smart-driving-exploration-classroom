import * as THREE from 'three';
import type { MechanicalView } from './mechanical-contract';
import type { SceneSnapshot } from './types';
import { createCarCraft, type V3 } from './vehicle-craft';
import { buildRunningGear } from './vehicle-running-gear';
import { buildCarBody } from './vehicle-body';

/** Original, qualitative mechanical teaching car. No manufacturer CAD or physics claims. */
export function createMechanicalCar(hybrid: boolean) {
  const c = createCarCraft(),
    { m } = c,
    root = new THREE.Group();
  root.name = 'mechanical-whole-car';
  const parts = new Map<string, THREE.Group>();
  for (const id of [
    'chassis',
    'suspension',
    'brake',
    'battery',
    'motor',
    'transmission',
    'computer',
    'interior',
    'sensor',
    'body',
    ...(hybrid ? ['engine'] : []),
  ]) {
    const group = new THREE.Group();
    group.name = id;
    group.userData.part = id;
    root.add(group);
    parts.set(id, group);
  }
  const { wheels, discs } = buildRunningGear(c, root, parts);
  const battery = parts.get('battery')!;
  battery.position.set(hybrid ? 1.3 : 0, 0.7, 0);
  const packLength = hybrid ? 1.1 : 3.35,
    packWidth = 2.15;
  c.box(battery, m.dark, [0, -0.12, 0], [packLength + 0.12, 0.085, packWidth + 0.12], 0.035);
  for (const z of [-packWidth / 2, packWidth / 2])
    c.box(battery, m.alloy, [0, 0.01, z], [packLength + 0.12, 0.23, 0.055], 0.015);
  for (const x of [-packLength / 2, packLength / 2])
    c.box(battery, m.alloy, [x, 0.01, 0], [0.055, 0.23, packWidth], 0.015);
  const bank = new THREE.Group();
  bank.name = 'battery-module-bank';
  battery.add(bank);
  const rows = hybrid ? 2 : 6;
  for (let i = 0; i < rows; i++)
    for (const sign of [-1, 1]) {
      const x = -packLength / 2 + ((i + 0.5) * packLength) / rows,
        z = sign * 0.53;
      c.box(bank, m.cell, [x, 0.015, z], [packLength / rows - 0.065, 0.18, 0.92], 0.028);
      for (let j = 0; j < 5; j++)
        c.box(
          bank,
          m.alloy,
          [x - (packLength / rows) * 0.36 + ((j * packLength) / rows) * 0.18, 0.114, z],
          [0.009, 0.012, 0.87],
          0.003,
        );
      for (const d of [-0.28, 0.28]) {
        c.lathe(bank, m.black, [x, 0.12, z + d], 0.028, 0, 0.025);
        c.box(bank, m.copper, [x, 0.139, z + d], [(packLength / rows) * 0.86, 0.018, 0.06], 0.009);
      }
    }
  c.tube(
    battery,
    m.copper,
    [
      [-packLength * 0.46, 0.14, -0.8],
      [-packLength * 0.46, 0.14, -0.08],
      [-packLength * 0.28, 0.14, 0.08],
      [-packLength * 0.28, 0.14, 0.8],
    ],
    0.035,
  );
  const packLid = c.box(
    battery,
    m.glass,
    [0, 0.18, 0],
    [packLength - 0.04, 0.025, packWidth - 0.09],
    0.025,
    'battery-cover',
  );
  c.bolts(
    battery,
    Array.from({ length: rows + 1 }, (_, i) => -packLength / 2 + (i * packLength) / rows).flatMap((x) =>
      [-1, 1].map((s) => [x, 0.14, (s * packWidth) / 2] as V3),
    ),
  );
  const motor = parts.get('motor')!;
  motor.position.set(2.55, 0.89, 0.48);
  // Stator outer sleeve is a half-section, with the front winding and rotor exposed.
  const casing = c.mesh(
    motor,
    c.geo(new THREE.CylinderGeometry(0.36, 0.36, 0.65, 48, 1, true, 0, Math.PI * 1.2)),
    m.alloy,
  );
  casing.rotation.x = Math.PI / 2;
  casing.name = 'motor-section-housing';
  for (const z of [-0.36, 0.36]) {
    c.lathe(motor, m.alloy, [0, 0, z], 0.37, 0.235, 0.045, 'z');
    c.lathe(motor, m.dark, [0, 0, z], 0.13, 0.06, 0.055, 'z');
    c.bolts(
      motor,
      Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2;
        return [Math.cos(a) * 0.3, Math.sin(a) * 0.3, z + Math.sign(z) * 0.03] as V3;
      }),
      'z',
      0.023,
    );
  }
  const windings = new THREE.Group();
  windings.name = 'copper-windings';
  motor.add(windings);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const tooth = c.box(
      windings,
      m.dark,
      [Math.cos(a) * 0.259, Math.sin(a) * 0.259, 0],
      [0.1, 0.09, 0.53],
      0.012,
    );
    tooth.rotation.z = a;
    for (const z of [-0.27, 0.27]) {
      const wire = c.mesh(windings, c.geo(new THREE.TorusGeometry(0.052, 0.018, 6, 16)), m.copper, [
        Math.cos(a) * 0.258,
        Math.sin(a) * 0.258,
        z,
      ]);
      wire.scale.y = 1.6;
      wire.rotation.z = a;
    }
    c.rod(
      windings,
      m.copper,
      [Math.cos(a) * 0.28, Math.sin(a) * 0.28, -0.25],
      [Math.cos(a) * 0.28, Math.sin(a) * 0.28, 0.25],
      0.022,
    );
  }
  const rotor = new THREE.Group();
  rotor.name = 'motor-rotor';
  motor.add(rotor);
  c.lathe(rotor, m.dark, [0, 0, 0], 0.19, 0.05, 0.57, 'z');
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const magnet = c.box(
      rotor,
      m.edge,
      [Math.cos(a) * 0.183, Math.sin(a) * 0.183, 0],
      [0.032, 0.08, 0.49],
      0.008,
    );
    magnet.rotation.z = a;
  }
  c.rod(rotor, m.edge, [0, 0, -0.5], [0, 0, 0.5], 0.05);
  c.box(motor, m.dark, [0, -0.34, 0], [0.55, 0.12, 0.5], 0.04);
  for (const x of [-0.21, 0.21])
    c.bolts(motor, [
      [x, -0.27, -0.19],
      [x, -0.27, 0.19],
    ]);
  const transmission = parts.get('transmission')!;
  // Visible tooth profiles and shafts of a two-stage illustrative reduction train.
  const gears: THREE.Object3D[] = [];
  function gear(x: number, y: number, z: number, r: number, teeth: number) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    transmission.add(g);
    gears.push(g);
    c.lathe(g, m.alloy, [0, 0, 0], r - 0.025, 0.055, 0.1, 'z');
    for (let i = 0; i < teeth; i++) {
      const a = (i / teeth) * Math.PI * 2;
      const t = c.box(g, m.edge, [Math.cos(a) * r, Math.sin(a) * r, 0], [0.06, 0.065, 0.11], 0.008);
      t.rotation.z = a;
    }
    c.lathe(g, m.dark, [0, 0, 0], r * 0.4, 0.047, 0.14, 'z');
    c.bolts(
      g,
      Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2;
        return [Math.cos(a) * r * 0.66, Math.sin(a) * r * 0.66, 0.065] as V3;
      }),
      'z',
      0.014,
    );
    return g;
  }
  gear(2.55, 0.89, -0.01, 0.14, 14);
  gear(2.55, 0.55, -0.01, 0.21, 21);
  c.lathe(transmission, m.dark, [2.55, 0.58, -0.29], 0.255, 0.055, 0.36, 'z', 'differential-housing');
  c.lathe(transmission, m.alloy, [2.55, 0.58, -0.5], 0.285, 0.1, 0.035, 'z');
  c.box(transmission, m.dark, [2.55, 0.39, -0.2], [0.65, 0.1, 0.66], 0.035);
  const computer = parts.get('computer')!;
  computer.position.set(2.52, 0.92, -0.76);
  c.box(computer, m.alloy, [0, 0, 0], [0.76, 0.08, 0.6], 0.03, 'inverter-base');
  for (const z of [-0.28, 0.28]) c.box(computer, m.alloy, [0, 0.1, z], [0.74, 0.15, 0.035], 0.012);
  for (const x of [-0.36, 0.36]) c.box(computer, m.alloy, [x, 0.1, 0], [0.035, 0.15, 0.54], 0.012);
  const inverterLid = new THREE.Group();
  inverterLid.name = 'inverter-lid';
  computer.add(inverterLid);
  c.box(inverterLid, m.alloy, [0, 0.22, 0], [0.76, 0.035, 0.6], 0.02);
  for (let i = 0; i < 9; i++)
    c.box(inverterLid, m.edge, [-0.32 + i * 0.08, 0.28, 0], [0.02, 0.1, 0.56], 0.006);
  const board = c.box(computer, m.pcb, [0, 0.09, 0], [0.64, 0.035, 0.48], 0.015, 'inverter-circuit-board');
  // The board is shown on selecting the power electronics, replacing its finned lid.
  for (const x of [-0.21, 0, 0.21]) {
    c.box(board, m.black, [x, 0.045, -0.03], [0.12, 0.055, 0.16], 0.009);
    for (const s of [-1, 1])
      for (let pin = 0; pin < 5; pin++)
        c.box(
          board,
          m.copper,
          [x - 0.045 + pin * 0.022, 0.03, -0.03 + s * 0.09],
          [0.009, 0.012, 0.035],
          0.002,
        );
    c.lathe(board, m.alloy, [x, 0.055, 0.16], 0.035, 0, 0.075);
    c.lathe(board, m.black, [x, 0.095, 0.16], 0.028, 0, 0.007);
    c.rod(board, m.copper, [x, 0.02, -0.2], [x, 0.02, -0.15], 0.004);
    c.rod(board, m.copper, [x - 0.07, 0.02, -0.19], [x - 0.07, 0.02, 0.17], 0.004);
    c.box(board, m.dark, [x, 0.028, -0.185], [0.06, 0.025, 0.032], 0.003);
  }
  for (const x of [-0.26, 0.26]) for (const z of [-0.17, 0.18]) c.bolts(board, [[x, 0.035, z]], 'y', 0.016);
  c.box(computer, m.black, [-0.4, 0.11, 0], [0.11, 0.11, 0.25], 0.015);
  for (const z of [-0.075, -0.025, 0.025, 0.075])
    c.rod(computer, m.edge, [-0.45, 0.12, z], [-0.4, 0.12, z], 0.009);
  c.bake(board);
  c.bolts(
    inverterLid,
    [
      [-0.32, 0.25, -0.24],
      [-0.32, 0.25, 0.24],
      [0.32, 0.25, -0.24],
      [0.32, 0.25, 0.24],
    ],
    'y',
    0.025,
  );
  for (const z of [-0.13, 0.13]) {
    c.tube(
      parts.get('chassis')!,
      m.orange,
      [
        [packLength * 0.48, 0.78, z],
        [1.94, 0.78, z],
        [2.02, 0.94, -0.6 + z],
        [2.34, 0.94, -0.76 + z],
      ],
      0.041,
    );
    c.tube(
      motor,
      m.orange,
      [
        [0.18, 0.26, z],
        [0.22, 0.37, z - 0.2],
        [0.22, 0.37, -0.7 + z],
        [0.1, 0.18, -1 + z],
      ],
      0.035,
    );
  }
  const coolant = c.tube(
    parts.get('chassis')!,
    m.dark,
    [
      [-3.55, 0.69, -0.72],
      [-3.3, 0.69, -1.02],
      [-1.5, 0.66, -1.03],
      [1.55, 0.66, -1.03],
      [2.88, 0.76, -0.6],
      [2.89, 1.06, -0.8],
      [2.32, 1.06, -0.75],
      [1.83, 0.66, 1.04],
      [-2.4, 0.66, 1.04],
      [-3.55, 0.69, 0.72],
    ],
    0.029,
    'coolant-circuit',
  );
  coolant.userData.part = 'chassis';
  c.box(parts.get('chassis')!, m.dark, [-3.46, 0.83, 0], [0.13, 0.56, 1.85], 0.025);
  for (let i = 0; i < 24; i++)
    c.box(parts.get('chassis')!, m.alloy, [-3.55, 0.83, -0.86 + i * 0.075], [0.018, 0.48, 0.017], 0.003);
  if (hybrid) {
    const engine = parts.get('engine')!;
    engine.position.set(-2.65, 0.78, 0);
    c.box(engine, m.dark, [0, 0, 0], [0.9, 0.55, 0.9], 0.075);
    c.box(engine, m.alloy, [0, 0.34, 0], [1.03, 0.15, 1], 0.06);
    for (let i = 0; i < 4; i++) {
      c.lathe(engine, m.black, [-0.34 + i * 0.23, 0.46, 0], 0.065, 0, 0.12);
      c.tube(
        engine,
        m.alloy,
        [
          [-0.34 + i * 0.23, 0.31, 0.44],
          [-0.34 + i * 0.23, 0.45, 0.62],
          [-0.34 + i * 0.23, 0.1, 0.77],
        ],
        0.047,
      );
    }
    c.bolts(engine, [
      [-0.42, 0.43, -0.39],
      [0.42, 0.43, -0.39],
      [-0.42, 0.43, 0.39],
      [0.42, 0.43, 0.39],
    ]);
    c.lathe(engine, m.dark, [0.53, -0.06, 0], 0.18, 0.045, 0.09, 'x');
  }
  const { hood } = buildCarBody(c, parts, hybrid);
  // Assign semantic ownership before batching. A selected part keeps its real materials.
  for (const [id, group] of parts) {
    c.bake(group);
    group.traverse((o) => {
      if (o instanceof THREE.Mesh) o.userData.part = id;
    });
    group.userData.home = group.position.clone();
  }
  wheels.forEach((w) => {
    c.bake(w);
    w.traverse((o) => {
      if (o instanceof THREE.Mesh) o.userData.part = 'transmission';
    });
  });
  const original = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>(),
    ghosts = new Map<THREE.Material, THREE.Material>();
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) original.set(o, o.material);
  });
  function ghostMaterial(material: THREE.Material) {
    if (!ghosts.has(material)) {
      const copy = material.clone() as THREE.MeshPhysicalMaterial;
      copy.color?.set('#a8b4b3');
      copy.transparent = true;
      copy.opacity = 0.075;
      copy.depthWrite = false;
      ghosts.set(material, copy);
    }
    return ghosts.get(material)!;
  }
  const spread: Record<string, V3> = {
    body: [0, 1.7, 0],
    interior: [0, 0.85, 0],
    battery: [0, -0.2, 0.7],
    motor: [0, 0.25, 1.2],
    transmission: [0.45, 0.1, -0.75],
    computer: [0, 1.25, 0.4],
    suspension: [0, 0.08, 0],
    brake: [0, 0.02, 0],
    sensor: [0, 1.75, 0],
    engine: [0, 0.65, 0],
  };
  function update(s: SceneSnapshot, t: number, v: MechanicalView) {
    const section = s.cutaway || v.mode === 'section',
      exploded = v.mode === 'exploded';
    const isolate = v.isolate && v.selected !== 'overview' && v.selected !== 'body';
    for (const [id, g] of parts) {
      g.position.copy(g.userData.home);
      if (exploded && spread[id]) g.position.add(new THREE.Vector3(...spread[id]));
      g.visible = id !== 'body' || !section;
      if (id === 'interior' && section) g.visible = false;
      if (id === 'sensor' && section && !isolate) g.visible = false;
      const ghost = isolate && id !== v.selected;
      g.userData.contextGhost = ghost;
      g.userData.excludeFromFit = ghost;
      if (ghost)
        g.visible =
          id === 'chassis' ||
          id === 'suspension' ||
          (['interior', 'sensor'].includes(v.selected) && id === 'body');
      g.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        const saved = original.get(o)!;
        o.material = ghost ? (Array.isArray(saved) ? saved.map(ghostMaterial) : ghostMaterial(saved)) : saved;
        o.castShadow =
          !ghost && (Array.isArray(saved) ? saved.every((m) => !m.transparent) : !saved.transparent);
      });
      for (const corner of g.children)
        if (corner.userData.corner) {
          corner.visible = !(isolate && id === v.selected) || corner.userData.focus;
          corner.position.z = exploded ? corner.userData.side * (id === 'brake' ? 0.48 : 0.26) : 0;
        }
    }
    packLid.visible = !section && !isolate;
    hood.position.y = exploded ? 0.45 : 0;
    // Finned enclosure opens so the circuit board is actually accessible.
    inverterLid.visible = !(section || (isolate && v.selected === 'computer'));
    inverterLid.position.y = exploded ? 0.25 : 0;
    board.visible = section || exploded || (isolate && v.selected === 'computer');
    for (const wheel of wheels) {
      wheel.visible = !isolate || v.selected === 'transmission';
      wheel.userData.excludeFromFit = isolate;
      wheel.rotation.z = s.running && s.power !== false && s.transmission !== false ? -t * 1.5 : 0;
      wheel.position.z = Math.sign(wheel.position.z) * (exploded ? 2.03 : 1.55);
    }
    discs.forEach((d) => {
      d.rotation.z = s.running && s.power !== false && s.transmission !== false ? -t * 1.5 : 0;
    });
    rotor.rotation.z = s.running && s.power !== false ? t * 4 : 0;
    gears.forEach((g, i) => {
      g.rotation.z = s.running && s.power !== false ? t * (i === 0 ? 4 : (-4 * 14) / 21) : 0;
    });
  }
  return {
    root,
    parts,
    wheels,
    rotor,
    update,
    dispose() {
      ghosts.forEach((m) => m.dispose());
      c.dispose();
      root.clear();
    },
  };
}
