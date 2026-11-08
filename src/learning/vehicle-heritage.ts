import * as THREE from 'three';
import type { CarCraft, V3 } from './vehicle-craft';

/** Craft treatment for the two open heritage vehicles; illustrative period hardware. */
export function refineHeritage(c: CarCraft, root: THREE.Group, pioneer: boolean) {
  const { m } = c;
  // Replace coarse blocks with rounded solids while retaining each part's semantics.
  const blocks: THREE.Mesh[] = [];
  root.traverse((o) => {
    if (o instanceof THREE.Mesh && o.geometry instanceof THREE.BoxGeometry) blocks.push(o);
  });
  for (const old of blocks) {
    if (old.userData.part === 'engine' || (old.material as THREE.Material).name === 'heritage-lamp') {
      old.removeFromParent();
      continue;
    }
    const { width, height, depth } = (old.geometry as THREE.BoxGeometry).parameters;
    const replacement = c.box(
      old.parent!,
      old.material as THREE.Material,
      old.position.toArray() as V3,
      [width, height, depth],
      old.userData.part === 'body' ? 0.06 : 0.018,
    );
    replacement.userData = { ...old.userData };
    replacement.rotation.copy(old.rotation);
    old.removeFromParent();
  }
  function part(id: string, build: (g: THREE.Group) => void) {
    const group = new THREE.Group();
    root.add(group);
    build(group);
    c.bake(group);
    group.traverse((o) => {
      if (o instanceof THREE.Mesh) o.userData.part = id;
    });
  }
  part('body', (g) => {
    const start = pioneer ? -0.8 : -1.6,
      end = pioneer ? 1.5 : 1.6,
      y = pioneer ? 0.94 : 1.18,
      width = pioneer ? 1.62 : 1.67;
    for (let x = start; x < end; x += 0.19) c.box(g, m.paint, [x, y, 0], [0.178, 0.026, width], 0.01);
    for (const s of [-1, 1]) {
      c.tube(
        g,
        m.dark,
        [
          [0.16, 1.16, s * 0.77],
          [0.17, 1.43, s * 0.77],
          [1.22, 1.43, s * 0.77],
          [1.22, 1.2, s * 0.77],
        ],
        0.026,
      );
      if (pioneer) c.rod(g, m.spring, [-0.55, 0.85, s * 0.59], [1.1, 0.85, s * 0.59], 0.025);
    }
    // Tufting, edge piping and fixings break up the broad bench surfaces.
    const bx = pioneer ? 0.7 : 0.05,
      by = pioneer ? 1.13 : 1.4;
    c.box(g, m.trim, [bx, by + 0.04, 0], [1.05, 0.18, 1.4], 0.085);
    for (const z of [-0.52, -0.26, 0, 0.26, 0.52])
      c.rod(g, m.dark, [bx - 0.38, by + 0.135, z], [bx + 0.38, by + 0.135, z], 0.009);
    c.bolts(
      g,
      [
        [start, y + 0.035, -width * 0.42],
        [start, y + 0.035, width * 0.42],
        [end - 0.15, y + 0.035, -width * 0.42],
        [end - 0.15, y + 0.035, width * 0.42],
      ],
      'y',
      0.025,
    );
    if (!pioneer)
      for (const z of [-0.82, 0.82]) {
        c.lathe(g, m.spring, [-1.58, 1.52, z], 0.16, 0.12, 0.19, 'x');
        c.lathe(g, m.lamp, [-1.685, 1.52, z], 0.124, 0, 0.025, 'x');
        c.rod(g, m.dark, [-1.5, 1.3, z], [-1.5, 1.5, z], 0.03);
      }
  });
  if (pioneer) {
    part('engine', (g) => {
      c.lathe(g, m.dark, [1.6, 0.9, 0], 0.23, 0, 0.6, 'x');
      for (let i = 0; i < 8; i++) c.lathe(g, m.alloy, [1.35 + i * 0.055, 0.9, 0], 0.26, 0.215, 0.016, 'x');
      c.lathe(g, m.spring, [1.15, 1.05, -0.46], 0.13, 0, 0.42, 'x');
      c.lathe(g, m.black, [1.15, 1.19, -0.46], 0.055, 0, 0.04);
      c.tube(
        g,
        m.copper,
        [
          [1.15, 0.98, -0.46],
          [1.4, 0.8, -0.46],
          [1.5, 0.8, -0.18],
        ],
        0.018,
      );
      c.tube(
        g,
        m.dark,
        [
          [1.88, 0.94, 0],
          [2.06, 0.94, 0],
          [2.06, 1.26, 0],
          [1.9, 1.3, 0],
        ],
        0.035,
      );
      c.lathe(g, m.spring, [1.55, 0.87, 0.5], 0.12, 0.04, 0.15, 'z');
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        c.rod(g, m.dark, [1.55, 0.87, 0.5], [1.55 + Math.cos(a) * 0.4, 0.87 + Math.sin(a) * 0.4, 0.5], 0.025);
      }
      c.bolts(
        g,
        [
          [1.34, 1.11, -0.16],
          [1.34, 1.11, 0.16],
          [1.72, 1.11, -0.16],
          [1.72, 1.11, 0.16],
        ],
        'y',
        0.024,
      );
    });
    part('transmission', (g) => {
      // Two linked sprockets and a belt path make the rear-wheel connection visible.
      for (const x of [0.75, 1.4]) c.lathe(g, m.spring, [x, 0.61, 0.72], 0.17, 0.065, 0.04, 'z');
      c.tube(
        g,
        m.dark,
        [
          [0.75, 0.77, 0.72],
          [1.4, 0.77, 0.72],
          [1.56, 0.61, 0.72],
          [1.4, 0.45, 0.72],
          [0.75, 0.45, 0.72],
          [0.59, 0.61, 0.72],
          [0.75, 0.77, 0.72],
        ],
        0.022,
      );
    });
  } else {
    part('battery', (g) => {
      for (const x of [-0.48, 0, 0.48])
        for (const z of [-0.29, 0.29]) {
          c.box(g, m.dark, [x, 0.61, z], [0.42, 0.2, 0.48], 0.025);
          for (const dz of [-0.13, 0.13]) {
            c.lathe(g, m.spring, [x, 0.73, z + dz], 0.03, 0, 0.035);
            c.box(g, m.copper, [x, 0.755, z + dz], [0.42, 0.015, 0.04], 0.005);
          }
        }
    });
    part('motor', (g) => {
      for (const z of [-0.35, 0.35]) {
        c.lathe(g, m.alloy, [1.25, 0.72, z], 0.3, 0.075, 0.05, 'z');
        c.bolts(
          g,
          Array.from({ length: 6 }, (_, i) => {
            const a = (i / 6) * Math.PI * 2;
            return [1.25 + Math.cos(a) * 0.235, 0.72 + Math.sin(a) * 0.235, z + Math.sign(z) * 0.03] as V3;
          }),
          'z',
          0.024,
        );
      }
      c.tube(
        g,
        m.orange,
        [
          [0, 0.68, 0.35],
          [0.65, 0.68, 0.35],
          [1.25, 0.95, 0.26],
        ],
        0.023,
      );
    });
  }
}
