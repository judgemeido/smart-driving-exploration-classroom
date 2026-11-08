import * as THREE from 'three';
import type { CarCraft, V3 } from './vehicle-craft';

/** Layered skins and cabin, rather than a filled extrusion of a side silhouette. */
export function buildCarBody(c: CarCraft, parts: Map<string, THREE.Group>, hybrid: boolean) {
  const { m } = c,
    body = parts.get('body')!,
    interior = parts.get('interior')!,
    sensor = parts.get('sensor')!;
  m.paint.color.set(hybrid ? '#8b9b9e' : '#9daead');
  m.paint.side = THREE.DoubleSide;
  const lids: THREE.Object3D[] = [];
  // Hood and rear deck have a crowned skin, rolled edges and panel seams.
  const hood = new THREE.Group();
  body.add(hood);
  hood.name = 'bonnet-panel';
  lids.push(hood);
  const hoodPoint = (u: number, v: number): V3 => {
    const z = (v - 0.5) * 2.91;
    return [
      -4 + u * 2.17 + 0.14 * (z / 1.46) ** 2 * (1 - u),
      1.11 + u * 0.27 + (hybrid ? 0.16 : 0.075) * Math.sin(v * Math.PI) - 0.035 * Math.sin(u * Math.PI),
      z,
    ];
  };
  c.surface(hood, m.paint, hoodPoint, 32, 24, 'bonnet-skin');
  c.surface(
    hood,
    m.dark,
    (u, v) => {
      const p = hoodPoint(u, v);
      p[1] -= 0.025;
      return p;
    },
    32,
    24,
  );
  for (const sign of [-1, 1])
    c.tube(
      hood,
      m.edge,
      [
        [-3.85, 1.1, sign * 1.32],
        [-2.8, 1.25, sign * 1.43],
        [-1.9, 1.35, sign * 1.4],
      ],
      0.012,
    );
  c.surface(
    body,
    m.paint,
    (u, v) => {
      const x = 1.85 + u * 2.1,
        z = (v - 0.5) * 2.95;
      return [x, 1.37 - 0.22 * u + 0.045 * Math.sin(v * Math.PI), z];
    },
    28,
    20,
  );
  for (const s of [-1, 1]) {
    // A shallow side panel, not a monolithic car block; actual arched fenders.
    c.box(body, m.dark, [0, 0.66, s * 1.49], [3.52, 0.18, 0.105], 0.025);
    c.box(body, m.paint, [0, 0.83, s * 1.5], [3.36, 0.18, 0.08], 0.025);
    for (const x of [-2.55, 2.55]) {
      c.surface(
        body,
        m.paint,
        (u, v) => {
          const a = 0.03 + u * (Math.PI - 0.06),
            r = 0.78 + v * 0.16;
          return [x + Math.cos(a) * r, 0.62 + Math.sin(a) * r, s * (1.57 - 0.22 * v)];
        },
        40,
        6,
      );
      c.tube(
        body,
        m.dark,
        Array.from({ length: 33 }, (_, i) => {
          const a = (i / 32) * Math.PI;
          return [x + Math.cos(a) * 0.78, 0.62 + Math.sin(a) * 0.78, s * 1.575] as V3;
        }),
        0.025,
      );
    }
    c.surface(
      body,
      m.paint,
      (u, v) => {
        const x = -3.99 + u * 7.98;
        const d = Math.min(Math.abs(x + 2.55), Math.abs(x - 2.55));
        const lower = d < 0.8 ? 0.62 + Math.sqrt(0.8 ** 2 - d ** 2) : 0.69;
        const belt = 1.4 - 0.25 * (Math.abs(x) / 4) ** 3;
        const upper = Math.max(belt, lower + 0.065);
        return [
          x,
          lower + (upper - lower) * v,
          s * (1.43 + 0.095 * Math.sin(v * Math.PI) + 0.015 * Math.cos(x * 0.6)),
        ];
      },
      180,
      12,
    );
    for (const [a, b] of [
      [-1.67, 0.1],
      [0.14, 1.69],
    ]) {
      c.tube(
        body,
        m.dark,
        [
          [a, 0.79, s * 1.46],
          [a, 1.37, s * 1.46],
          [b, 1.37, s * 1.46],
          [b, 0.79, s * 1.46],
        ],
        0.009,
      );
      c.box(body, m.edge, [b - 0.28, 1.3, s * 1.525], [0.24, 0.035, 0.025], 0.012);
    }
    c.tube(
      body,
      m.paint,
      [
        [-1.8, 1.34, s * 1.4],
        [-1.1, 2.27, s * 1.13],
        [-0.72, 2.4, s * 1.08],
        [0.95, 2.4, s * 1.08],
        [1.35, 2.2, s * 1.17],
        [2.02, 1.37, s * 1.41],
      ],
      0.047,
    );
    c.rod(body, m.dark, [0.18, 1.38, s * 1.43], [0.15, 2.4, s * 1.09], 0.037);
    c.rod(body, m.edge, [-1.78, 1.38, s * 1.43], [1.99, 1.38, s * 1.43], 0.02);
    // Clear glazing sits in its own frames, with no opaque fake window block.
    const pane = (corners: V3[]) =>
      c.surface(
        body,
        m.glass,
        (u, v) => {
          const lower = new THREE.Vector3(...corners[0]).lerp(new THREE.Vector3(...corners[1]), u);
          const upper = new THREE.Vector3(...corners[3]).lerp(new THREE.Vector3(...corners[2]), u);
          return lower.lerp(upper, v).toArray() as V3;
        },
        16,
        10,
      );
    pane([
      [-1.68, 1.43, s * 1.4],
      [0.08, 1.43, s * 1.42],
      [0.08, 2.33, s * 1.09],
      [-1.03, 2.25, s * 1.13],
    ]);
    pane([
      [0.23, 1.43, s * 1.42],
      [1.88, 1.43, s * 1.4],
      [1.06, 2.28, s * 1.11],
      [0.23, 2.33, s * 1.09],
    ]);
    c.rod(body, m.dark, [-1.59, 1.42, s * 1.43], [-1.63, 1.52, s * 1.69], 0.027);
    c.box(body, m.paint, [-1.62, 1.56, s * 1.71], [0.27, 0.13, 0.16], 0.06);
  }
  // Thin roof plate with crown and real transverse supports.
  c.surface(
    body,
    m.paint,
    (u, v) => [-0.96 + u * 2.17, 2.4 + 0.055 * Math.sin(v * Math.PI), (v - 0.5) * 2.17],
    24,
    16,
  );
  for (const x of [-0.83, 0.18, 1.06]) c.rod(body, m.dark, [x, 2.36, -1.08], [x, 2.36, 1.08], 0.028);
  c.surface(
    body,
    m.glass,
    (u, v) => [-1.79 + u * 0.81, 1.41 + u * 0.94, (v - 0.5) * (2.79 - u * 0.62)],
    20,
    20,
  );
  c.surface(
    body,
    m.glass,
    (u, v) => [1.11 + u * 0.89, 2.35 - u * 0.96, (v - 0.5) * (2.18 + u * 0.62)],
    20,
    20,
  );
  for (const sign of [-1, 1]) {
    c.surface(
      body,
      m.paint,
      (u, v) => {
        const z = (u - 0.5) * 2.95;
        return [sign * (4 - 0.16 * (z / 1.48) ** 2 - 0.05 * Math.sin(v * Math.PI)), 0.66 + v * 0.46, z];
      },
      36,
      12,
    );
    c.box(body, m.dark, [sign * 4.01, 0.68, 0], [0.07, 0.07, 2.72], 0.025);
  }
  for (const s of [-1, 1]) {
    c.tube(
      body,
      m.dark,
      [
        [-3.978, 1.08, s * 0.55],
        [-3.953, 1.08, s * 0.85],
        [-3.89, 1.075, s * 1.23],
        [-3.83, 1.11, s * 1.39],
      ],
      0.047,
    );
    c.tube(
      body,
      m.lamp,
      [
        [-4.005, 1.08, s * 0.57],
        [-3.984, 1.08, s * 0.85],
        [-3.921, 1.075, s * 1.22],
        [-3.862, 1.11, s * 1.38],
      ],
      0.018,
    );
    c.box(body, m.red, [3.975, 1.08, s * 0.92], [0.065, 0.1, 0.82], 0.025);
  }
  c.box(body, m.black, [-4.035, 0.76, 0], [0.035, 0.14, 1.33], 0.025);
  for (let i = 0; i < 9; i++)
    c.box(body, m.dark, [-4.06, 0.76, -0.54 + i * 0.135], [0.025, 0.095, 0.024], 0.005);
  // Seats are mounted on rails; cabin is a distinct assembly, opened with body panels.
  for (const x of [-0.64, 0.94])
    for (const z of [-0.67, 0.67]) {
      for (const dz of [-0.22, 0.22]) c.box(interior, m.alloy, [x, 0.83, z + dz], [0.75, 0.065, 0.04], 0.01);
      c.box(interior, m.trim, [x, 1.04, z], [0.8, 0.22, 0.62], 0.09);
      const back = c.box(interior, m.trim, [x + 0.33, 1.48, z], [0.16, 0.87, 0.65], 0.065);
      back.rotation.z = -0.12;
      c.box(interior, m.trim, [x + 0.39, 1.99, z], [0.16, 0.23, 0.4], 0.06);
      for (const d of [-0.18, 0, 0.18])
        c.rod(interior, m.dark, [x - 0.24, 1.16, z + d], [x + 0.24, 1.16, z + d], 0.009);
    }
  c.box(interior, m.trim, [-1.59, 1.4, 0], [0.35, 0.22, 2.46], 0.07);
  c.box(interior, m.black, [-1.42, 1.59, 0.1], [0.07, 0.25, 0.46], 0.035);
  c.rod(interior, m.alloy, [-1.52, 1.32, 0.67], [-1.18, 1.52, 0.67], 0.045);
  const steering = c.mesh(
    interior,
    c.geo(new THREE.TorusGeometry(0.25, 0.026, 10, 48)),
    m.rubber,
    [-1.18, 1.54, 0.67],
  );
  steering.rotation.y = Math.PI / 2 - 0.45;
  for (const t of [-1, 1])
    c.rod(interior, m.dark, [-1.18, 1.54, 0.67], [-1.18, 1.54 + t * 0.18, 0.67], 0.022);
  c.box(interior, m.trim, [-0.55, 1.02, 0], [1.42, 0.32, 0.2], 0.055);
  // Camera behind the windscreen and radar in the bumper: solid housings plus lens.
  c.box(sensor, m.dark, [-1.12, 2.19, 0], [0.24, 0.09, 0.32], 0.03);
  c.lathe(sensor, m.black, [-1.25, 2.18, 0], 0.043, 0.024, 0.045, 'x');
  c.lathe(sensor, m.glass, [-1.28, 2.18, 0], 0.025, 0, 0.01, 'x');
  c.box(sensor, m.dark, [-4.045, 0.83, 0], [0.045, 0.16, 0.23], 0.025);
  c.box(sensor, m.pcb, [-4.075, 0.83, 0], [0.014, 0.12, 0.17], 0.009);
  return { hood, lids };
}
