import * as THREE from 'three';
import type { CarCraft, V3 } from './vehicle-craft';

/** Illustrative EV skateboard: fixed uprights/calipers, independently rotating hubs. */
export function buildRunningGear(c: CarCraft, root: THREE.Group, parts: Map<string, THREE.Group>) {
  const { m } = c;
  const chassis = parts.get('chassis')!,
    suspension = parts.get('suspension')!,
    brake = parts.get('brake')!;
  for (const z of [-1.22, 1.22]) {
    c.box(chassis, m.dark, [0, 0.49, z], [6.5, 0.23, 0.18], 0.045);
    c.box(chassis, m.alloy, [0, 0.61, z], [5.95, 0.025, 0.2], 0.008);
  }
  for (const x of [-2.55, -1.55, 0, 1.55, 2.55]) {
    c.box(chassis, m.dark, [x, 0.44, 0], [0.17, 0.19, 2.45], 0.025);
    c.bolts(
      chassis,
      [-1.22, 1.22].map((z) => [x, 0.64, z] as V3),
    );
  }
  for (const x of [-2.55, 2.55]) {
    c.box(chassis, m.alloy, [x, 0.58, 0], [0.62, 0.14, 1.7], 0.045);
    for (const z of [-0.8, 0.8]) {
      c.panel(
        chassis,
        m.dark,
        [
          [-0.25, 0],
          [0.25, 0],
          [0.17, 0.3],
          [-0.17, 0.3],
        ],
        0.08,
        [x, 0.6, z],
      );
      c.bolts(
        chassis,
        [
          [x - 0.16, 0.69, z + 0.09],
          [x + 0.16, 0.69, z + 0.09],
        ],
        'z',
      );
    }
  }
  // Front rack, boots and tie rods stay attached to their uprights.
  c.rod(suspension, m.alloy, [-2.82, 0.69, -0.87], [-2.82, 0.69, 0.87], 0.072);
  for (const s of [-1, 1]) {
    for (let i = 0; i < 7; i++)
      c.lathe(suspension, m.rubber, [-2.82, 0.69, s * (0.65 + i * 0.045)], 0.1, 0, 0.028, 'z');
    c.rod(suspension, m.edge, [-2.82, 0.69, s * 0.9], [-2.65, 0.69, s * 1.43], 0.035);
  }
  const wheels: THREE.Group[] = [],
    discs: THREE.Object3D[] = [];
  for (const x of [-2.55, 2.55])
    for (const sign of [-1, 1]) {
      const z = sign * 1.55;
      const suspensionCorner = new THREE.Group(),
        brakeCorner = new THREE.Group();
      suspensionCorner.userData.corner = brakeCorner.userData.corner = true;
      suspensionCorner.userData.focus = brakeCorner.userData.focus = x < 0 && sign > 0;
      suspensionCorner.userData.side = brakeCorner.userData.side = sign;
      suspension.add(suspensionCorner);
      brake.add(brakeCorner);
      const wheel = new THREE.Group();
      wheel.name = 'wheel';
      wheel.position.set(x, 0.62, z);
      wheel.userData.part = 'transmission';
      root.add(wheel);
      wheels.push(wheel);
      const tireProfile = [
        [0.47, -0.22],
        [0.57, -0.235],
        [0.65, -0.19],
        [0.69, -0.12],
        [0.695, 0.12],
        [0.65, 0.19],
        [0.57, 0.235],
        [0.47, 0.22],
        [0.47, -0.22],
      ].map((p) => new THREE.Vector2(...(p as [number, number])));
      const tire = c.mesh(
        wheel,
        c.geo(new THREE.LatheGeometry(tireProfile, 64)),
        m.rubber,
        [0, 0, 0],
        'tire',
      );
      tire.rotation.x = Math.PI / 2;
      // Three circumferential grooves plus instanced moulded tread, not a solid cylinder.
      for (const d of [-0.11, 0, 0.11]) {
        const ring = c.mesh(wheel, c.geo(new THREE.TorusGeometry(0.695, 0.006, 4, 64)), m.black, [0, 0, d]);
        ring.name = 'tread-groove';
      }
      const treadG = c.geo(new THREE.BoxGeometry(0.022, 0.003, 0.09));
      const tread = new THREE.InstancedMesh(treadG, m.rubber, 80);
      const dummy = new THREE.Object3D();
      for (let i = 0; i < 80; i++) {
        const a = (i / 80) * Math.PI * 2;
        dummy.position.set(Math.cos(a) * 0.695, Math.sin(a) * 0.695, i % 2 ? 0.055 : -0.055);
        dummy.rotation.z = a - Math.PI / 2;
        dummy.rotation.y = 0.12 * (i % 2 ? 1 : -1);
        dummy.updateMatrix();
        tread.setMatrixAt(i, dummy.matrix);
      }
      wheel.add(tread);
      c.lathe(wheel, m.alloy, [0, 0, 0], 0.49, 0.415, 0.36, 'z', 'open-alloy-rim');
      c.lathe(wheel, m.edge, [0, 0, sign * 0.19], 0.488, 0.452, 0.032, 'z');
      c.lathe(wheel, m.dark, [0, 0, sign * 0.18], 0.125, 0.045, 0.08, 'z');
      for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5;
        for (const fork of [-1, 1]) {
          const b = a + fork * 0.16;
          const blade = c.panel(
            wheel,
            m.alloy,
            [
              [0.105, -0.027],
              [0.444, -0.052],
              [0.456, 0.002],
              [0.145, 0.044],
            ],
            0.035,
            [0, 0, sign * 0.17],
          );
          blade.rotation.z = b;
        }
      }
      c.bolts(
        wheel,
        Array.from({ length: 5 }, (_, i) => {
          const a = (i * Math.PI * 2) / 5;
          return [Math.cos(a) * 0.085, Math.sin(a) * 0.085, sign * 0.235] as V3;
        }),
        'z',
        0.022,
      );
      const rotor = new THREE.Group();
      rotor.position.set(x, 0.62, z - sign * 0.08);
      brakeCorner.add(rotor);
      discs.push(rotor);
      const shape = new THREE.Shape();
      shape.absarc(0, 0, 0.405, 0, Math.PI * 2, false);
      const bore = new THREE.Path();
      bore.absarc(0, 0, 0.12, 0, Math.PI * 2, true);
      shape.holes.push(bore);
      for (let j = 0; j < 2; j++)
        for (let i = 0; i < 18; i++) {
          const a = (i * Math.PI * 2) / 18 + j * 0.09,
            r = 0.28 + j * 0.065;
          const hole = new THREE.Path();
          hole.absarc(Math.cos(a) * r, Math.sin(a) * r, 0.012, 0, Math.PI * 2, true);
          shape.holes.push(hole);
        }
      c.mesh(
        rotor,
        c.geo(new THREE.ExtrudeGeometry(shape, { depth: 0.035, bevelEnabled: false, curveSegments: 32 })),
        m.alloy,
        [0, 0, -0.018],
      );
      c.lathe(rotor, m.dark, [0, 0, 0], 0.19, 0.065, 0.065, 'z');
      const caliper = c.box(
        brakeCorner,
        m.red,
        [x + 0.33, 0.66, z - sign * 0.045],
        [0.16, 0.36, 0.16],
        0.045,
        'fixed-brake-caliper',
      );
      caliper.rotation.z = -0.22;
      c.bolts(
        brakeCorner,
        [
          [x + 0.33, 0.58, z + sign * 0.05],
          [x + 0.33, 0.74, z + sign * 0.05],
        ],
        'z',
        0.025,
      );
      for (const level of [0.48, 0.85]) {
        for (const dx of [-0.34, 0.34])
          c.rod(
            suspensionCorner,
            m.alloy,
            [x + dx, level, sign * 0.82],
            [x, level - 0.05, sign * 1.4],
            0.052,
          );
        c.lathe(suspensionCorner, m.rubber, [x, level - 0.05, sign * 1.4], 0.085, 0, 0.12, 'z');
      }
      c.coil(suspensionCorner, [x, 0.56, sign * 1.32], [x - 0.12, 1.23, sign * 1.12], 0.115);
      c.box(suspensionCorner, m.dark, [x - 0.12, 1.25, sign * 1.12], [0.36, 0.065, 0.34], 0.06);
      c.bolts(suspensionCorner, [
        [x - 0.22, 1.29, sign * 1.12 - 0.1],
        [x - 0.02, 1.29, sign * 1.12 + 0.1],
      ]);
      c.rod(suspensionCorner, m.dark, [x, 0.53, sign * 1.4], [x, 0.92, sign * 1.4], 0.08);
      // Rear drive half-shafts, with visible CV joints.
      if (x > 0) {
        c.rod(parts.get('transmission')!, m.edge, [x, 0.68, sign * 0.35], [x, 0.62, sign * 1.4], 0.05);
        for (const end of [0.48, 1.25])
          for (let i = 0; i < 5; i++)
            c.lathe(
              parts.get('transmission')!,
              m.rubber,
              [x, 0.65, sign * (end + i * 0.025)],
              0.09,
              0,
              0.018,
              'z',
            );
      }
      c.tube(
        brakeCorner,
        m.dark,
        [
          [x + 0.31, 0.72, z - sign * 0.1],
          [x + 0.4, 0.86, sign * 1.12],
          [x + 0.15, 0.74, sign * 0.8],
        ],
        0.018,
      );
    }
  return { wheels, discs };
}
