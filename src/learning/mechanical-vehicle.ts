import * as THREE from 'three';
import type { MechanicalRig, MechanicalView } from './mechanical-contract';
import type { SceneSnapshot } from './types';
import { driveMechanism, chainFlow, DRIVE_GEOMETRY } from './stage-model';

/** References: https://afdc.energy.gov/vehicles/how-do-all-electric-cars-work
 * https://www.nidec.com/en/technology/motor/basic/00019/ (inner rotor cross section).
 * Educational bench, not a vehicle CAD: AFDC EV component architecture; 24-slot / 8-pole
 * radial-flux motor section; external 20° involute spur pair, m=.038, z=18:54.
 * Packaging, windings and open differential are deliberately enlarged for inspection. */
export function createVehicleRig(): MechanicalRig {
  const root = new THREE.Group();
  root.name = '电驱机械教学台';
  const geos = new Set<THREE.BufferGeometry>(),
    mats = new Set<THREE.Material>();
  const geo = <T extends THREE.BufferGeometry>(g: T): T => {
    geos.add(g);
    return g;
  };
  const mat = (c: string, metalness = 0.65, roughness = 0.48) => {
    const m = new THREE.MeshStandardMaterial({ color: c, metalness, roughness });
    mats.add(m);
    return m;
  };
  const steel = mat('#899296'),
    aluminium = mat('#b8c0c3'),
    graphite = mat('#364044'),
    copper = mat('#ba784a'),
    insulation = mat('#444c4d', 0.1),
    rubber = mat('#262b2d', 0, 0.85),
    accent = mat('#d8794c', 0.35),
    pcb = mat('#3c5852', 0.18),
    pale = mat('#d1d4d1', 0.25),
    black = mat('#222c30', 0.2),
    gold = mat('#b99b5b');
  const box = geo(new THREE.BoxGeometry(1, 1, 1));
  const cylinder = geo(new THREE.CylinderGeometry(1, 1, 1, 40));
  const torus = geo(new THREE.TorusGeometry(1, 0.12, 8, 48));
  const sphere = geo(new THREE.SphereGeometry(1, 10, 8));
  const parts = new Map<string, THREE.Group>();
  const homes = new Map<THREE.Group, THREE.Vector3>();
  const offsets: Record<string, THREE.Vector3> = {
    battery: new THREE.Vector3(-0.55, 0.3, 0.65),
    motor: new THREE.Vector3(-0.65, 0.55, 0.65),
    transmission: new THREE.Vector3(0.35, 0.2, -0.65),
    computer: new THREE.Vector3(0.65, 0.55, 0.45),
    sensor: new THREE.Vector3(0.3, 0.9, -0.1),
    brake: new THREE.Vector3(0.5, 0, 0.5),
  };
  function part(id: string, p: [number, number, number]) {
    const g = new THREE.Group();
    g.name = id;
    g.userData.part = id;
    g.position.set(...p);
    root.add(g);
    parts.set(id, g);
    homes.set(g, g.position.clone());
    return g;
  }
  function mesh(
    parent: THREE.Object3D,
    g: THREE.BufferGeometry,
    m: THREE.Material,
    p = [0, 0, 0],
    s = [1, 1, 1],
  ) {
    const o = new THREE.Mesh(g, m);
    o.position.set(p[0], p[1], p[2]);
    o.scale.set(s[0], s[1], s[2]);
    o.castShadow = true;
    o.receiveShadow = true;
    parent.add(o);
    return o;
  }
  const cube = (p: THREE.Object3D, m: THREE.Material, pos: number[], size: number[]) =>
    mesh(p, box, m, pos, size);
  function cyl(
    p: THREE.Object3D,
    m: THREE.Material,
    pos: number[],
    r: number,
    len: number,
    axis: 'x' | 'y' | 'z' = 'z',
  ) {
    const o = mesh(p, cylinder, m, pos, [r, len, r]);
    if (axis === 'z') o.rotation.x = Math.PI / 2;
    else if (axis === 'x') o.rotation.z = Math.PI / 2;
    return o;
  }
  function ring(p: THREE.Object3D, m: THREE.Material, pos: number[], r: number, t = 0.08) {
    return mesh(p, torus, m, pos, [r, r, t / 0.12]);
  }
  function bolts(p: THREE.Object3D, r: number, z: number, n = 8) {
    for (let i = 0; i < n; i++) {
      const a = (i * 2 * Math.PI) / n;
      cyl(p, graphite, [r * Math.cos(a), r * Math.sin(a), z], 0.036, 0.045);
    }
  }
  // Bedplate and four vibration isolators keep the machine legible as a laboratory bench.
  const bed = new THREE.Group();
  root.add(bed);
  cube(bed, graphite, [0, 0.18, 0], [6.8, 0.22, 4.5]);
  for (const x of [-2.8, 2.8])
    for (const z of [-1.75, 1.75]) {
      cyl(bed, rubber, [x, 0.055, z], 0.16, 0.11, 'y');
      cube(bed, steel, [x, 0.34, z], [0.45, 0.13, 0.35]);
    }
  for (const z of [-1.4, 1.4]) cube(bed, aluminium, [0, 0.33, z], [6.3, 0.09, 0.09]);
  // Motor shaft is parallel to the output axle (z). Open upper sector exposes the winding ends.
  const motor = part('motor', [-1, 1.35, -0.02]);
  cube(motor, steel, [0, -0.9, 0], [1.12, 0.18, 1.2]);
  for (const x of [-0.38, 0.38]) cube(motor, graphite, [x, -0.65, 0], [0.13, 0.5, 0.9]);
  const shell = mesh(
    motor,
    geo(new THREE.CylinderGeometry(0.78, 0.78, 1.1, 48, 1, true, Math.PI * 0.22, Math.PI * 1.55)),
    aluminium,
  );
  shell.rotation.x = Math.PI / 2;
  // Laminated stator as repeated dark rings; teeth and windings are instanced.
  const laminationGeometry = geo(new THREE.TorusGeometry(0.645, 0.07, 5, 48, Math.PI * 1.52));
  for (let z = -0.45; z <= 0.46; z += 0.09) {
    const lam = mesh(motor, laminationGeometry, graphite, [0, 0, z]);
    lam.rotation.z = 0.75;
  }
  const coilPath = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(-0.045, -0.07, -0.48),
      new THREE.Vector3(0.045, -0.07, -0.48),
      new THREE.Vector3(0.06, 0.04, -0.4),
      new THREE.Vector3(0.06, 0.04, 0.4),
      new THREE.Vector3(0.045, -0.07, 0.48),
      new THREE.Vector3(-0.045, -0.07, 0.48),
      new THREE.Vector3(-0.06, 0.04, 0.4),
      new THREE.Vector3(-0.06, 0.04, -0.4),
    ],
    true,
    'centripetal',
  );
  const coilGeo = geo(new THREE.TubeGeometry(coilPath, 40, 0.024, 5, true));
  const coils = new THREE.InstancedMesh(coilGeo, copper, 24),
    teeth = new THREE.InstancedMesh(box, steel, 24);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 24; i++) {
    const a = (i * Math.PI) / 12;
    dummy.position.set(0.565 * Math.cos(a), 0.565 * Math.sin(a), 0);
    dummy.rotation.set(0, 0, a - Math.PI / 2);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    coils.setMatrixAt(i, dummy.matrix);
    dummy.position.set(0.49 * Math.cos(a), 0.49 * Math.sin(a), 0);
    dummy.scale.set(0.07, 0.16, 0.88);
    dummy.updateMatrix();
    teeth.setMatrixAt(i, dummy.matrix);
  }
  motor.add(coils, teeth);
  const rotor = new THREE.Group();
  motor.add(rotor);
  cyl(rotor, steel, [0, 0, 0], 0.385, 0.88);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const pole = cube(
      rotor,
      i % 2 ? graphite : pale,
      [0.36 * Math.cos(a), 0.36 * Math.sin(a), 0],
      [0.09, 0.18, 0.78],
    );
    pole.rotation.z = a;
  }
  cyl(rotor, steel, [0, 0, -0.38], 0.105, 2.35);
  cube(rotor, accent, [0, 0.39, 0.35], [0.05, 0.035, 0.12]);
  const bearingFront = new THREE.Group(),
    bearingBack = new THREE.Group();
  motor.add(bearingFront, bearingBack);
  bearingFront.position.z = 0.62;
  bearingBack.position.z = -0.62;
  for (const bearing of [bearingFront, bearingBack]) {
    ring(bearing, steel, [0, 0, 0], 0.2, 0.075);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      mesh(bearing, sphere, pale, [0.2 * Math.cos(a), 0.2 * Math.sin(a), 0], [0.035, 0.035, 0.035]);
    }
  }
  // Cover and its fasteners are one physical assembly in section and explosion.
  const motorCapAssembly = new THREE.Group();
  motor.add(motorCapAssembly);
  const motorCover = mesh(
    motorCapAssembly,
    geo(new THREE.CylinderGeometry(0.77, 0.77, 0.09, 48, 1, true, 0, Math.PI * 1.6)),
    steel,
    [0, 0, 0.65],
  );
  motorCover.rotation.x = Math.PI / 2;
  bolts(motorCapAssembly, 0.69, 0.71);
  // Exact tooth counts and pitch circles, not decorative torus gears.
  function gearGeometry(n: number): THREE.ExtrudeGeometry {
    const m = DRIVE_GEOMETRY.module,
      rp = (m * n) / 2,
      rb = rp * Math.cos(Math.PI / 9),
      rr = rp - 1.25 * m,
      ra = rp + m;
    const inv = (r: number) => {
      const t = Math.acos(Math.min(1, rb / r));
      return Math.tan(t) - t;
    };
    const half = Math.PI / (2 * n),
      pitchInv = inv(rp),
      shape = new THREE.Shape();
    let first = true;
    const point = (r: number, a: number) => {
      if (first) {
        shape.moveTo(r * Math.cos(a), r * Math.sin(a));
        first = false;
      } else shape.lineTo(r * Math.cos(a), r * Math.sin(a));
    };
    for (let i = 0; i < n; i++) {
      const a = (i * 2 * Math.PI) / n,
        baseHalf = half + pitchInv;
      point(rr, a - baseHalf);
      point(Math.max(rr, rb), a - baseHalf);
      for (let j = 0; j <= 6; j++) {
        const r = Math.max(rr, rb) + ((ra - Math.max(rr, rb)) * j) / 6;
        point(r, a - half - pitchInv + inv(r));
      }
      for (let j = 6; j >= 0; j--) {
        const r = Math.max(rr, rb) + ((ra - Math.max(rr, rb)) * j) / 6;
        point(r, a + half + pitchInv - inv(r));
      }
      point(rr, a + baseHalf);
      for (let j = 1; j <= 3; j++) point(rr, a + baseHalf + (((2 * Math.PI) / n - 2 * baseHalf) * j) / 3);
    }
    shape.closePath();
    const hole = new THREE.Path();
    hole.absarc(0, 0, 0.115, 0, 2 * Math.PI, true);
    shape.holes.push(hole);
    const g = geo(
      new THREE.ExtrudeGeometry(shape, {
        depth: 0.17,
        bevelEnabled: true,
        bevelSize: 0.007,
        bevelThickness: 0.007,
        bevelSegments: 1,
        curveSegments: 20,
      }),
    );
    g.translate(0, 0, -0.085);
    return g;
  }
  const transmission = part('transmission', [0, 0, 0]);
  const input = new THREE.Group(),
    output = new THREE.Group();
  input.position.set(-1, 1.35, -0.98);
  output.position.set(0.368, 1.35, -0.98);
  transmission.add(input, output);
  mesh(input, gearGeometry(DRIVE_GEOMETRY.teeth.input), steel);
  mesh(output, gearGeometry(DRIVE_GEOMETRY.teeth.output), aluminium);
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    cyl(output, graphite, [0.72 * Math.cos(a), 0.72 * Math.sin(a), -0.1], 0.105, 0.015);
    cyl(output, steel, [0.72 * Math.cos(a), 0.72 * Math.sin(a), -0.115], 0.065, 0.02);
  }
  cyl(input, graphite, [0, 0, -0.08], 0.16, 0.3);
  cyl(output, graphite, [0, 0, 0], 0.2, 0.5);
  cube(input, accent, [0.24, 0, -0.105], [0.12, 0.025, 0.025]);
  cube(output, accent, [0.5, 0, -0.105], [0.25, 0.025, 0.025]);
  // Gear supports are behind the exposed tooth plane, leaving the contact visible.
  for (const x of [-1, 0.368]) {
    cube(transmission, graphite, [x, 0.63, -0.68], [0.22, 0.7, 0.22]);
    ring(transmission, steel, [x, 1.35, -0.69], 0.2, 0.07);
  }
  const differential = new THREE.Group();
  differential.position.set(0.368, 1.35, 0.12);
  transmission.add(differential);
  cyl(differential, steel, [0, 0, -0.4], 0.13, 0.65);
  for (const z of [-0.2, 0.2]) ring(differential, steel, [0, 0, z], 0.34, 0.06);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    cube(differential, aluminium, [0.29 * Math.cos(a), 0.29 * Math.sin(a), 0], [0.08, 0.08, 0.4]);
  }
  cyl(differential, steel, [0, 0, 0], 0.055, 0.6, 'x');
  for (const x of [-0.22, 0.22]) cyl(differential, graphite, [x, 0, 0], 0.12, 0.13, 'x');
  for (const z of [-0.12, 0.12]) cyl(differential, steel, [0, 0, z], 0.15, 0.07);
  // Half-shafts and constant-velocity bellows. Straight-line model: both shafts share speed.
  const wheels: THREE.Group[] = [];
  const tireGeometry = geo(new THREE.TorusGeometry(0.64, 0.18, 10, 48));
  for (const side of [-1, 1]) {
    cyl(transmission, steel, [0.368, 1.35, side * 1.15], 0.07, 1.7);
    for (const z0 of [0.55, 1.75])
      for (let j = 0; j < 5; j++)
        ring(transmission, rubber, [0.368, 1.35, side * (z0 + j * 0.025)], 0.115 - j * 0.005, 0.024);
    const w = new THREE.Group();
    w.position.set(0.368, 1.35, side * 2.05);
    transmission.add(w);
    wheels.push(w);
    const tire = mesh(w, tireGeometry, rubber);
    tire.scale.z = 1.45;
    cyl(w, aluminium, [0, 0, 0], 0.48, 0.3);
    cyl(w, graphite, [0, 0, side * 0.17], 0.37, 0.02);
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      const spoke = cube(
        w,
        aluminium,
        [0.23 * Math.cos(a), 0.23 * Math.sin(a), side * 0.2],
        [0.44, 0.075, 0.045],
      );
      spoke.rotation.z = a;
    }
    cyl(w, steel, [0, 0, side * 0.23], 0.12, 0.09);
    bolts(w, 0.16, side * 0.24, 5);
  }
  const brake = part('brake', [0.368, 1.35, -2.38]);
  const disc = new THREE.Group();
  brake.add(disc);
  // Actual perforated extruded rotor: holes penetrate the disc and remain visible in section.
  const ds = new THREE.Shape();
  ds.absarc(0, 0, 0.48, 0, Math.PI * 2, false);
  const centre = new THREE.Path();
  centre.absarc(0, 0, 0.16, 0, Math.PI * 2, true);
  ds.holes.push(centre);
  for (let i = 0; i < 24; i++) {
    const a = (i * Math.PI) / 12;
    const h = new THREE.Path();
    h.absarc(0.37 * Math.cos(a), 0.37 * Math.sin(a), 0.025, 0, Math.PI * 2, true);
    ds.holes.push(h);
  }
  const dg = geo(new THREE.ExtrudeGeometry(ds, { depth: 0.055, bevelEnabled: false, curveSegments: 5 }));
  mesh(disc, dg, steel);
  ring(disc, aluminium, [0, 0, 0.02], 0.22, 0.045);
  const caliper = cube(brake, graphite, [0.4, 0.06, 0.025], [0.24, 0.43, 0.21]);
  const pad = cube(brake, accent, [0.32, 0.06, -0.08], [0.1, 0.28, 0.025]);
  cyl(brake, steel, [0.47, 0.06, 0.16], 0.055, 0.09);
  // Layered battery: cells over cold plate, busbars over cells, lid independently separated.
  const battery = part('battery', [-2.35, 0.68, 0.65]);
  cube(battery, graphite, [0, -0.15, 0], [1.65, 0.22, 2.25]);
  const coldPlate = cube(battery, aluminium, [0, 0, 0], [1.5, 0.075, 2.1]);
  for (let i = 0; i < 7; i++) cube(battery, steel, [-0.63 + i * 0.21, 0.044, 0], [0.027, 0.02, 1.95]);
  const cells = new THREE.Group();
  battery.add(cells);
  for (let row = 0; row < 4; row++)
    for (let col = 0; col < 3; col++) {
      const x = -0.48 + col * 0.48,
        z = -0.73 + row * 0.48;
      cube(cells, aluminium, [x, 0.23, z], [0.42, 0.34, 0.41]);
      cube(cells, graphite, [x, 0.41, z], [0.43, 0.035, 0.42]);
      for (const dx of [-0.13, 0.13]) cyl(cells, copper, [x + dx, 0.46, z], 0.04, 0.04, 'y');
      if (col < 2) cube(cells, copper, [x + 0.24, 0.49, z], [0.26, 0.025, 0.075]);
    }
  const batteryLid = cube(battery, steel, [0, 0.62, 0], [1.65, 0.065, 2.25]);
  const batteryBand = cube(battery, accent, [0, 0.66, 0.78], [0.65, 0.015, 0.14]);
  // Controller has a cold plate, six power modules, DC link capacitors and gate-driver traces.
  const computer = part('computer', [2.12, 0.77, 0.12]);
  cube(computer, aluminium, [0, -0.13, 0], [1.65, 0.22, 1.7]);
  for (let i = 0; i < 9; i++) cube(computer, steel, [-0.7 + i * 0.17, -0.25, 0], [0.045, 0.18, 1.65]);
  cube(computer, pcb, [0, 0.02, 0], [1.5, 0.07, 1.5]);
  for (let i = 0; i < 6; i++) {
    const x = -0.5 + (i % 3) * 0.5,
      z = i < 3 ? -0.4 : 0.2;
    cube(computer, black, [x, 0.13, z], [0.31, 0.16, 0.28]);
    cube(computer, steel, [x, 0.22, z], [0.19, 0.02, 0.17]);
    cube(computer, gold, [x, 0.061, z + 0.2], [0.3, 0.012, 0.025]);
  }
  for (const x of [-0.5, 0, 0.5]) cyl(computer, graphite, [x, 0.24, 0.55], 0.12, 0.3, 'y');
  cube(computer, graphite, [0.45, 0.11, -0.65], [0.24, 0.13, 0.15]);
  const controllerLid = cube(computer, steel, [0, 0.48, 0], [1.65, 0.06, 1.7]);
  cube(computer, accent, [0.45, 0.515, 0], [0.12, 0.01, 0.8]);
  // High-voltage leads are copper inside graphite insulation; phase leads share motor coordinates.
  function cable(points: number[][], material: THREE.Material, r = 0.038, parent: THREE.Object3D = root) {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...(p as [number, number, number]))),
    );
    return mesh(parent, geo(new THREE.TubeGeometry(curve, 24, r, 6, false)), material);
  }
  const cables = new THREE.Group();
  root.add(cables);
  for (const z of [0.3, 0.45])
    cable(
      [
        [-1.55, 0.84, z],
        [-0.9, 0.66, z],
        [0.6, 0.66, z],
        [1.3, 0.88, z],
      ],
      graphite,
      0.045,
      cables,
    );
  for (let i = 0; i < 3; i++)
    cable(
      [
        [1.4, 1.03, -0.35 - i * 0.12],
        [0.6, 1.1, -0.5 - i * 0.12],
        [-0.3, 1.9, -0.05 - i * 0.12],
        [-0.6, 1.65, 0.2 - i * 0.12],
      ],
      copper,
      0.033,
      cables,
    );
  const sensor = part('sensor', [2.15, 1.55, -1.15]);
  cube(sensor, steel, [0, -0.35, 0], [0.11, 0.7, 0.11]);
  cube(sensor, graphite, [0, 0, 0], [0.65, 0.32, 0.37]);
  cyl(sensor, black, [0, 0, 0.22], 0.115, 0.12);
  ring(sensor, aluminium, [0, 0, 0.29], 0.11, 0.022);
  cyl(sensor, accent, [0, 0, 0.295], 0.075, 0.012);
  // Three actual chain-state telltales: input, controller command, measured execution.
  const indicators = [sensor, computer, brake].map((g, i) => {
    const m = mat('#57615e', 0.1);
    const led = mesh(
      g,
      sphere,
      m,
      i === 0 ? [0.25, 0.06, 0.2] : i === 1 ? [-0.65, 0.15, 0.64] : [0.47, 0.27, 0.08],
      [0.045, 0.045, 0.045],
    );
    return { led, m };
  });

  parts.forEach((g, id) =>
    g.traverse((o) => {
      o.userData.part = id;
    }),
  );
  return {
    root,
    update(s: SceneSnapshot, seconds: number, view: MechanicalView) {
      const pose = driveMechanism(s, seconds),
        flow = chainFlow(s);
      rotor.rotation.z = pose.motorAngle;
      input.rotation.z = pose.inputGearAngle;
      // Teaching disconnect: slide the input gear outward along the motor shaft.
      // Its -.98 -> -1.43 centre clears the .17-wide output tooth plane, away
      // from the motor rear bearing/end cover. The motor shaft reaches -1.575,
      // beyond the shifted gear's far face (-1.522), so it never floats free.
      input.position.z = -0.98 - (s.transmission === false ? 0.45 : 0);
      output.rotation.z = pose.outputGearAngle;
      differential.rotation.z = pose.outputGearAngle;
      wheels.forEach((w) => {
        w.rotation.z = pose.wheelAngle;
        // A local gear inspection removes the wheel visuals, never their axle or pose.
        w.visible = !(view.isolate && view.selected === 'transmission');
      });
      disc.rotation.z = pose.wheelAngle;
      const exploded = view.mode === 'exploded',
        section = view.mode === 'section';
      parts.forEach((g, id) => {
        const home = homes.get(g)!;
        g.position.copy(home);
        if (exploded) g.position.add(offsets[id]);
        g.visible = !view.isolate || !view.selected || view.selected === id;
      });
      bed.visible = !view.isolate;
      cables.visible = !view.isolate && !exploded;
      shell.visible = !section;
      motorCapAssembly.visible = !section;
      batteryLid.visible = !section;
      batteryBand.visible = !section;
      controllerLid.visible = !section;
      batteryLid.position.y = exploded ? 1.23 : 0.62;
      batteryBand.position.y = exploded ? 1.27 : 0.66;
      controllerLid.position.y = exploded ? 1.1 : 0.48;
      cells.position.y = exploded ? 0.3 : 0;
      coldPlate.position.y = exploded ? -0.05 : 0;
      motorCapAssembly.position.z = exploded ? 0.5 : 0;
      bearingFront.position.z = exploded ? 0.85 : 0.62;
      bearingBack.position.z = exploded ? -0.85 : -0.62;
      pad.position.z = flow.action ? -0.045 : -0.08;
      caliper.scale.z = flow.action ? 0.85 : 1;
      const values = [flow.input, flow.command, flow.action];
      indicators.forEach(({ m }, i) => {
        m.color.set(values[i] ? '#d8794c' : '#57615e');
        m.emissive.set(values[i] ? '#7d3417' : '#000000');
        m.emissiveIntensity = values[i] ? 0.35 : 0;
      });
    },
    camera(view: MechanicalView, _s: SceneSnapshot) {
      if (view.isolate && view.selected) {
        const g = parts.get(view.selected),
          p = g?.position ?? new THREE.Vector3();
        const offset =
          view.selected === 'battery'
            ? [3.6, 3.4, 4.2]
            : view.selected === 'motor'
              ? [2.7, 2.0, 3.1]
              : view.selected === 'transmission'
                ? [-0.7, 1.65, -6.5]
                : [3.1, 2.5, 3.8];
        const target = view.selected === 'transmission' ? new THREE.Vector3(-0.2, 1.3, -0.55) : p;
        return {
          position: [target.x + offset[0], target.y + offset[1], target.z + offset[2]],
          target: [target.x, target.y, target.z],
        };
      }
      return { position: [7.4, 7, 9.4], target: [-0.1, 1.05, 0] };
    },
    dispose() {
      coils.dispose();
      teeth.dispose();
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
      root.clear();
    },
  };
}
