import * as THREE from 'three';
import type { MechanicalRig } from './mechanical-contract';
import type { VehicleEra } from './activities/evolution-state';
import { createMechanicalCar } from './vehicle-assembly';
import { createCarCraft } from './vehicle-craft';
import { refineHeritage } from './vehicle-heritage';
/** Recognizable period silhouettes, based on Benz Patent-Motorwagen, circa-1900 electric
 * carriages, 1997 Prius and contemporary EV packaging. Illustrative geometry, not CAD.
 * Animated paths are qualitative: no engine-cycle, hybrid split or efficiency simulation. */
export function createEvolutionRig(): MechanicalRig {
  const root = new THREE.Group();
  root.name = '四个时代的整车';
  const resources: { dispose(): void }[] = [];
  const heritageCraft = createCarCraft();
  const material = (color: string, metalness = 0.2) => {
    const m = new THREE.MeshStandardMaterial({ color, metalness, roughness: 0.48 });
    resources.push(m);
    return m;
  };
  const dark = material('#253036'),
    steel = material('#a5afb1', 0.65),
    rubber = material('#22282a', 0),
    wood = material('#8c5736'),
    seat = material('#674a37'),
    glass = material('#304c59', 0.45),
    copper = material('#d77b45'),
    green = material('#457767'),
    lamp = material('#eee5be'),
    red = material('#a94536');
  const groups = new Map<VehicleEra, THREE.Group>();
  const cars = new Map<VehicleEra, ReturnType<typeof createMechanicalCar>>();
  const wheels: THREE.Group[] = [];
  const rotors: THREE.Object3D[] = [];
  const flows: {
    era: VehicleEra;
    kind: 'supply' | 'drive';
    line: THREE.Group;
    marker: THREE.Mesh;
    gap: THREE.Group;
    bridge: THREE.Mesh;
    curve: THREE.CurvePath<THREE.Vector3>;
  }[] = [];
  const flowGreen = material('#477d62'),
    flowCopper = material('#c7773f'),
    blocked = material('#a43e30');
  const pulse = material('#f3cd73');
  pulse.emissive.set('#745720');
  pulse.emissiveIntensity = 0.35;
  lamp.name = 'heritage-lamp';
  function mesh(
    parent: THREE.Object3D,
    g: THREE.BufferGeometry,
    m: THREE.Material,
    id: string,
    pos: number[] = [0, 0, 0],
  ) {
    resources.push(g);
    const o = new THREE.Mesh(g, m);
    o.position.set(pos[0], pos[1], pos[2]);
    o.userData.part = id;
    o.castShadow = true;
    o.receiveShadow = true;
    parent.add(o);
    return o;
  }
  const box = (p: THREE.Object3D, m: THREE.Material, id: string, pos: number[], size: number[]) =>
    mesh(p, new THREE.BoxGeometry(size[0], size[1], size[2]), m, id, pos);
  function rod(p: THREE.Object3D, a: number[], b: number[], radius: number, m = steel, id = 'body') {
    const av = new THREE.Vector3(...a),
      bv = new THREE.Vector3(...b),
      delta = bv.clone().sub(av);
    const o = mesh(
      p,
      new THREE.CylinderGeometry(radius, radius, delta.length(), 12),
      m,
      id,
      av.clone().add(bv).multiplyScalar(0.5).toArray(),
    );
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    return o;
  }
  function wheel(p: THREE.Object3D, x: number, z: number, r: number, spokes: boolean) {
    const g = new THREE.Group();
    g.position.set(x, r - 0.1, z);
    g.userData.part = 'transmission';
    g.name = 'wheel';
    p.add(g);
    wheels.push(g);
    mesh(g, new THREE.TorusGeometry(r - 0.065, 0.065, 10, 48), rubber, 'transmission');
    const hub = mesh(g, new THREE.CylinderGeometry(0.13, 0.13, 0.24, 16), steel, 'transmission');
    hub.rotation.x = Math.PI / 2;
    for (let i = 0; i < (spokes ? 28 : 5); i++) {
      const a = (i * Math.PI * 2) / (spokes ? 28 : 5);
      rod(
        g,
        [0, 0, 0],
        [Math.cos(a) * (r - 0.1), Math.sin(a) * (r - 0.1), 0],
        spokes ? 0.012 : 0.055,
        steel,
        'transmission',
      );
    }
    if (!spokes) {
      const tire = mesh(g, new THREE.CylinderGeometry(r, r, 0.24, 48), rubber, 'transmission');
      tire.rotation.x = Math.PI / 2;
      const disc = mesh(g, new THREE.CylinderGeometry(r * 0.74, r * 0.74, 0.255, 32), steel, 'transmission');
      disc.rotation.x = Math.PI / 2;
      for (let i = 0; i < 5; i++) {
        let a = (i * Math.PI * 2) / 5;
        box(
          g,
          dark,
          'transmission',
          [Math.cos(a) * r * 0.43, Math.sin(a) * r * 0.43, 0.135],
          [0.11, 0.2, 0.02],
        );
      }
    }
    return g;
  }
  function silhouette(p: THREE.Object3D, points: number[][], width: number, m: THREE.Material, id = 'body') {
    const s = new THREE.Shape();
    points.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
    s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, {
      depth: width,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.07,
      bevelThickness: 0.07,
      curveSegments: 24,
    });
    return mesh(p, geo, m, id, [0, 0, -width / 2]);
  }
  for (const era of ['pioneer', 'early-electric', 'hybrid', 'modern-ev'] as VehicleEra[]) {
    const old = era === 'pioneer' || era === 'early-electric';
    const car = old ? undefined : createMechanicalCar(era === 'hybrid');
    if (car) cars.set(era, car);
    const g = car?.root ?? new THREE.Group();
    g.name = era;
    root.add(g);
    groups.set(era, g);
    if (old) {
      const pioneer = era === 'pioneer';
      for (const z of [-0.6, 0.6]) rod(g, [-2, 0.55, z], [1.9, 0.55, z], 0.065, dark);
      rod(g, [1.4, 0.55, -1.05], [1.4, 0.55, 1.05], 0.09);
      if (pioneer) {
        wheel(g, -2, 0, 0.69, true);
        for (const z of [-1.07, 1.07]) wheel(g, 1.4, z, 0.94, true);
        rod(g, [-2, 0.6, 0], [-1.7, 1.7, 0], 0.055, dark);
        rod(g, [-1.7, 1.7, 0], [-1.1, 1.7, 0], 0.04);
        box(g, wood, 'body', [0.35, 0.86, 0], [2.4, 0.13, 1.65]);
        box(g, seat, 'body', [0.7, 1.13, 0], [1.1, 0.24, 1.55]);
        box(g, seat, 'body', [1.27, 1.58, 0], [0.14, 0.85, 1.55]);
        mesh(g, new THREE.TorusGeometry(0.45, 0.065, 8, 40), steel, 'engine', [1.55, 0.87, 0.5]);
      } else {
        for (const x of [-1.65, 1.65]) for (const z of [-1.02, 1.02]) wheel(g, x, z, 0.75, true);
        box(g, wood, 'body', [0, 1.0, 0], [3.5, 0.35, 1.7]);
        box(g, green, 'body', [0.8, 1.5, 0], [1.3, 0.75, 1.7]);
        box(g, seat, 'body', [0.05, 1.4, 0], [1.25, 0.16, 1.4]);
        box(g, seat, 'body', [0.65, 1.8, 0], [0.15, 0.8, 1.4]);
        for (const x of [-1.2, 1.2])
          for (const z of [-0.8, 0.8]) rod(g, [x, 1.15, z], [x, 2.8, z], 0.045, dark);
        silhouette(
          g,
          [
            [-1.5, 2.75],
            [-1.3, 2.93],
            [1.3, 2.93],
            [1.5, 2.75],
          ],
          1.95,
          dark,
        );
        rod(g, [-1.3, 1.25, 0], [-1.1, 2.0, 0], 0.04);
        const steer = mesh(g, new THREE.TorusGeometry(0.24, 0.025, 8, 32), wood, 'body', [-1.1, 2, 0]);
        steer.rotation.x = Math.PI / 2;
        for (const z of [-0.82, 0.82]) {
          box(g, lamp, 'body', [-1.58, 1.52, z], [0.22, 0.33, 0.22]);
        }
      }
    }
    if (old) {
      const battery = box(
        g,
        green,
        'battery',
        [0, old ? 0.48 : 0.43, 0],
        [old ? 1.1 : 2.6, 0.22, old ? 1.1 : 1.45],
      );
      battery.userData.absent = era === 'pioneer';
      for (let x = -0.9; x < 1; x += 0.3)
        if (!old) box(g, steel, 'battery', [x, 0.555, 0], [0.018, 0.015, 1.35]);
      if (era === 'pioneer') {
        box(g, steel, 'engine', [era === 'pioneer' ? 1.6 : -1.98, 0.95, 0], [0.65, 0.68, 0.78]);
        for (let i = 0; i < 5; i++)
          box(g, dark, 'engine', [era === 'pioneer' ? 1.6 : -1.98, 1.1 + i * 0.04, 0], [0.75, 0.02, 0.8]);
      }
      if (era !== 'pioneer') {
        const motor = mesh(g, new THREE.CylinderGeometry(0.28, 0.28, 0.64, 24), copper, 'motor', [
          old ? 1.25 : -1.8,
          0.72,
          0,
        ]);
        motor.rotation.x = Math.PI / 2;
        const shaft = rod(
          g,
          [old ? 1.25 : -1.8, 0.72, -0.65],
          [old ? 1.25 : -1.8, 0.72, 0.65],
          0.08,
          steel,
          'transmission',
        );
        rotors.push(shaft);
      }
      const axleX = old ? 1.4 : -1.84;
      rod(g, [axleX, 0.59, -1], [axleX, 0.59, 1], 0.07, steel, 'transmission');
      rod(g, [0, 0.6, 0], [axleX, 0.6, 0], 0.055, copper, 'transmission');
    }
    const axleX = old ? 1.4 : 2.55;
    if (old) refineHeritage(heritageCraft, g, era === 'pioneer');
    // Schematic routes run alongside the body for legibility. They are deliberately
    // not literal electrical wiring or a claim about hybrid torque distribution.
    const sourceX = era === 'pioneer' ? 1.6 : 0;
    const motorX = old ? 1.25 : 2.55;
    for (const kind of ['supply', 'drive'] as const) {
      const y = kind === 'supply' ? 0.82 : 0.64;
      const side = old ? 1.28 : 1.8;
      const points =
        kind === 'supply'
          ? [
              [sourceX, y, 0],
              [sourceX, y, side],
              [motorX, y, side],
              [motorX, y, 0],
            ]
          : [
              [motorX, 0.72, 0],
              [motorX, 0.72, side],
              [axleX - 0.48, y, side],
              [axleX - 0.48, 0.38, side],
              [axleX, 0.38, side],
            ];
      const curve = new THREE.CurvePath<THREE.Vector3>();
      for (let i = 1; i < points.length; i++)
        curve.add(new THREE.LineCurve3(new THREE.Vector3(...points[i - 1]), new THREE.Vector3(...points[i])));
      const line = new THREE.Group();
      line.name = kind + '-route';
      g.add(line);
      const mid = curve.getPoint(0.53),
        delta = curve.getTangent(0.53).normalize();
      const routeMaterial = kind === 'supply' ? flowGreen : flowCopper;
      // A removable central bridge exposes a real visual gap when a switch opens.
      for (const [a, b] of [
        [0, 0.47],
        [0.59, 1],
      ]) {
        const sub = new THREE.CatmullRomCurve3(
          Array.from({ length: 30 }, (_, i) => curve.getPoint(a + ((b - a) * i) / 29)),
        );
        const tube = mesh(
          line,
          new THREE.TubeGeometry(sub, 40, 0.045, 7, false),
          routeMaterial,
          kind === 'supply' ? (era === 'pioneer' ? 'engine' : 'battery') : 'transmission',
        );
        tube.userData.flow = true;
      }
      const bridge = rod(
        line,
        curve.getPoint(0.47).toArray(),
        curve.getPoint(0.59).toArray(),
        0.045,
        routeMaterial,
        kind === 'supply' ? (era === 'pioneer' ? 'engine' : 'battery') : 'transmission',
      );
      bridge.userData.flow = true;
      const marker = mesh(
        line,
        new THREE.ConeGeometry(0.12, 0.28, 12),
        pulse,
        kind === 'supply' ? (era === 'pioneer' ? 'engine' : 'battery') : 'transmission',
      );
      marker.name = kind + '-flow';
      marker.userData.flow = true;
      const gap = new THREE.Group();
      gap.name = kind + '-break';
      gap.position.copy(mid);
      line.add(gap);
      for (const sign of [-1, 1]) {
        const bar = rod(
          gap,
          [-0.12, -0.12 * sign, 0],
          [0.12, 0.12 * sign, 0],
          0.035,
          blocked,
          kind === 'supply' ? (era === 'pioneer' ? 'engine' : 'battery') : 'transmission',
        );
        bar.userData.flow = true;
      }
      flows.push({ era, kind, line, marker, gap, bridge, curve });
    }
    if (old)
      g.traverse((o) => {
        if (o instanceof THREE.Mesh && o.userData.part === 'body') {
          const m = (o.material as THREE.MeshStandardMaterial).clone();
          resources.push(m);
          o.material = m;
        }
      });
  }
  return {
    root,
    update(s, t, v) {
      const era = s.vehicleEra ?? 'modern-ev';
      groups.forEach((g, id) => {
        g.visible = id === era;
        const car = cars.get(id);
        if (car) {
          car.update(s, t, v);
          return;
        }
        g.traverse((o) => {
          if (!(o instanceof THREE.Mesh)) return;
          if (o.userData.flow) return;
          const part = o.userData.part;
          const body = part === 'body';
          o.visible = !o.userData.absent && !(body && (s.cutaway || v.mode === 'section'));
          o.position.y -= o.userData.lift ?? 0;
          const lift = body && v.mode === 'exploded' ? 1.3 : 0;
          o.position.y += lift;
          o.userData.lift = lift;
          if (body) {
            const m = o.material as THREE.MeshStandardMaterial;
            m.transparent = !!s.running && v.mode === 'assembly';
            m.opacity = m.transparent ? 0.2 : 1;
            m.depthWrite = !m.transparent;
          }
          if (v.isolate && v.selected !== 'overview' && part !== v.selected) o.visible = false;
        });
      });
      for (const flow of flows) {
        const supply = s.power !== false,
          connected = flow.kind === 'supply' ? supply : s.transmission !== false;
        flow.line.visible =
          flow.era === era &&
          !v.isolate &&
          (!!s.running || v.mode !== 'assembly' || !supply || s.transmission === false);
        flow.bridge.visible = connected;
        flow.gap.visible = !connected;
        flow.marker.visible = !!s.running && supply && connected;
        const u = (t * 0.48 + (flow.kind === 'drive' ? 0.2 : 0)) % 1;
        flow.marker.position.copy(flow.curve.getPoint(u));
        flow.marker.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          flow.curve.getTangent(u).normalize(),
        );
      }
      for (const w of wheels)
        w.rotation.z = s.running && s.power !== false && s.transmission !== false ? -t * 1.5 : 0;
      for (const r of rotors) r.rotation.z = s.running && s.power !== false ? t * 4 : 0;
    },
    camera(v, s) {
      const modern = s.vehicleEra === 'modern-ev' || s.vehicleEra === 'hybrid';
      if (modern && v.isolate && v.selected === 'computer')
        return { position: [4.8, 7, 3.8], target: [2.52, .92, -.76] };
      if (modern && v.isolate && v.selected === 'battery')
        return { position: [-3.2, 6.7, 7.5], target: [0, .7, 0] };
      if (modern && v.isolate && ['motor', 'transmission', 'computer'].includes(v.selected))
        return { position: [4.2, 2.8, 7.5], target: [2.55, 0.9, 0.4] };
      return { position: [-6.8, 4.7, 10.8], target: [0, 1.1, 0] };
    },
    dispose() {
      cars.forEach((car) => car.dispose());
      heritageCraft.dispose();
      resources.forEach((r) => r.dispose());
    },
  };
}
