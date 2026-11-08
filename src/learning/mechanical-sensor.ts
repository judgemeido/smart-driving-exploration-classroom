import * as THREE from 'three';
import type { MechanicalRig, MechanicalView } from './mechanical-contract';
import type { SceneSnapshot } from './types';
import { sensorRay } from './stage-model';
import { normalizeSensorDraft, SENSOR_GEOMETRY } from './activities/sensor-state';

/** Teaching architecture references (not a reproduction of a commercial device):
 * https://oceanservice.noaa.gov/facts/lidar.html (pulse and return principle)
 * https://www.ti.com/sensors/mmwave-radar/overview.html
 * Lens count, packaging and rotation-head layout are educational geometry, not a product reproduction.
 * Dimensions below are enlarged illustrative units; only the measurement scene is in metres.
 */
export function createSensorRig(): MechanicalRig {
  const root = new THREE.Group(),
    instruments = new THREE.Group(),
    measurement = new THREE.Group();
  root.add(instruments, measurement);
  const geometries = new Set<THREE.BufferGeometry>(),
    materials = new Set<THREE.Material>();
  function mat(color: number, metalness = 0.5, opacity = 1) {
    const m = new THREE.MeshStandardMaterial({
      color,
      metalness,
      roughness: 0.48,
      transparent: opacity < 1,
      opacity,
      side: THREE.DoubleSide,
    });
    materials.add(m);
    return m;
  }
  const graphite = mat(0x303d46),
    metal = mat(0xa0abb1, 0.8),
    copper = mat(0xbc8050, 0.72),
    pcb = mat(0x275950, 0.2),
    black = mat(0x172126),
    glass = mat(0x79b7c6, 0.2, 0.35),
    amber = mat(0xffa34c, 0.2),
    cyan = mat(0x39bfd1, 0.2);
  const meshes: THREE.Mesh[] = [];
  function mesh(
    parent: THREE.Object3D,
    geo: THREE.BufferGeometry,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
    part = 'housing',
  ) {
    geometries.add(geo);
    const m = new THREE.Mesh(geo, material);
    m.position.set(x, y, z);
    m.userData.part = part;
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    meshes.push(m);
    return m;
  }
  function box(
    p: THREE.Object3D,
    w: number,
    h: number,
    d: number,
    m: THREE.Material,
    x: number,
    y: number,
    z: number,
    part = 'housing',
  ) {
    return mesh(p, new THREE.BoxGeometry(w, h, d), m, x, y, z, part);
  }
  function cyl(
    p: THREE.Object3D,
    r: number,
    h: number,
    m: THREE.Material,
    x: number,
    y: number,
    z: number,
    part = 'housing',
    inner = 0,
  ) {
    return mesh(
      p,
      inner ? new THREE.TorusGeometry(r, inner, 10, 40) : new THREE.CylinderGeometry(r, r, h, 40),
      m,
      x,
      y,
      z,
      part,
    );
  }
  // Annular optical mounts have real bores and open section variants.
  function barrel(
    p: THREE.Group,
    radius: number,
    length: number,
    x: number,
    y: number,
    z: number,
    wall = 0.045,
  ) {
    const profile = [
      new THREE.Vector2(radius - wall, -length / 2),
      new THREE.Vector2(radius, -length / 2),
      new THREE.Vector2(radius, length / 2),
      new THREE.Vector2(radius - wall, length / 2),
      new THREE.Vector2(radius - wall, -length / 2),
    ];
    for (const section of [false, true]) {
      const m = mesh(
        p,
        new THREE.LatheGeometry(profile, 32, section ? Math.PI / 2 : 0, section ? Math.PI : Math.PI * 2),
        graphite,
        x,
        y,
        z,
        'optics',
      );
      m.rotation.z = -Math.PI / 2;
      m.userData.barrelSection = section;
    }
  }
  function fastener(p: THREE.Group, x: number, y: number, z: number, partId = 'housing') {
    return mesh(p, new THREE.CylinderGeometry(0.045, 0.045, 0.055, 6), metal, x, y, z, partId);
  }
  function tube(
    p: THREE.Object3D,
    a: THREE.Vector3,
    b: THREE.Vector3,
    r: number,
    m: THREE.Material,
    part: string,
  ) {
    const o = mesh(p, new THREE.CylinderGeometry(r, r, a.distanceTo(b), 10), m, 0, 0, 0, part);
    o.position.copy(a).add(b).multiplyScalar(0.5);
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    return o;
  }
  const devices: Record<string, THREE.Group> = {},
    partGroups: THREE.Group[] = [];
  function part(parent: THREE.Group, id: string, offset: THREE.Vector3) {
    const g = new THREE.Group();
    g.userData.part = id;
    g.userData.offset = offset;
    parent.add(g);
    partGroups.push(g);
    return g;
  }
  function boardDetails(g: THREE.Group, y: number) {
    box(g, 1.65, 0.09, 1.3, pcb, 0, y, 0, 'board');
    for (let i = 0; i < 5; i++) {
      box(g, 0.19, 0.1, 0.34, black, -0.6 + i * 0.3, y + 0.1, -0.3, 'board');
      box(g, 0.04, 0.025, 0.8, copper, -0.6 + i * 0.3, y + 0.06, 0.1, 'board');
    }
    box(g, 0.46, 0.14, 0.4, graphite, 0.15, y + 0.13, 0.33, 'board');
    for (const x of [-0.72, 0.72])
      for (const z of [-0.5, 0.5]) {
        cyl(g, 0.055, 0.17, metal, x, y - 0.07, z, 'board');
        fastener(g, x, y + 0.075, z, 'board');
      }
    for (let i = 0; i < 8; i++)
      box(g, 0.06, 0.025, 0.07, copper, -0.05 + i * 0.055, y + 0.075, 0.59, 'board');
  }
  const lidar = new THREE.Group();
  devices.lidar = lidar;
  instruments.add(lidar);
  const lh = part(lidar, 'housing', new THREE.Vector3(-1.15, 0, -0.9));
  cyl(lh, 1.12, 0.24, graphite, 0, 0.24, 0);
  cyl(lh, 1.08, 0.12, metal, 0, 0.43, 0);
  // Rear half-shell leaves the actual optical train visible in section mode.
  const shell = mesh(
    lh,
    new THREE.CylinderGeometry(1.05, 1.05, 1.65, 40, 1, true, Math.PI / 2, Math.PI * 1.55),
    glass,
    0,
    1.37,
    0,
  );
  const lid = new THREE.Group();
  lh.add(lid);
  cyl(lid, 1.08, 0.15, metal, 0, 2.28, 0);
  const cover = cyl(lh, 1.065, 1.35, glass, 0, 1.42, 0);
  cover.userData.cover = true;
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    fastener(lid, Math.cos(a) * 0.9, 2.38, Math.sin(a) * 0.9);
  }
  const ld = part(lidar, 'drive', new THREE.Vector3(0, 0.7, 0));
  cyl(ld, 0.36, 0.47, graphite, 0, 0.79, 0, 'drive');
  cyl(ld, 0.43, 0.1, copper, 0, 0.59, 0, 'drive');
  const bearing = cyl(ld, 0.37, 0.07, metal, 0, 1.07, 0, 'drive', 0.065);
  bearing.rotation.x = Math.PI / 2;
  cyl(ld, 0.1, 0.72, metal, 0, 1.17, 0, 'drive');
  // A keyed shaft carries one rigid optical head: platform, laser, detector and lens mounts.
  // The structural bench holds this head at a fixed azimuth so the independent reflector
  // and explanatory optical path stay physically aligned. No disconnected free-running disk.
  const opticalHead = new THREE.Group();
  lidar.add(opticalHead);
  const rotor = new THREE.Group();
  opticalHead.add(rotor);
  cyl(rotor, 0.76, 0.09, metal, 0, 1.3, 0, 'drive');
  // Encoder graduations and an index mark describe the coupling without faking a scan.
  for (let i = 0; i < 24; i++) {
    const a = (i * Math.PI) / 12;
    const tick = box(
      rotor,
      0.065,
      0.012,
      0.025,
      i === 0 ? copper : black,
      Math.cos(a) * 0.68,
      1.352,
      Math.sin(a) * 0.68,
      'drive',
    );
    tick.rotation.y = -a;
  }
  box(rotor, 0.15, 0.12, 0.08, copper, 0.12, 1.23, 0, 'drive');
  box(ld, 0.12, 0.07, 0.12, graphite, 0.78, 1.25, 0, 'drive');
  const le = part(opticalHead, 'emitter', new THREE.Vector3(0.8, 0.45, -0.55));
  box(le, 0.42, 0.28, 0.3, copper, 0.17, 1.54, -0.33, 'emitter');
  box(le, 0.4, 0.08, 0.4, metal, 0.17, 1.36, -0.33, 'emitter');
  fastener(le, 0.1, 1.42, -0.5, 'emitter');
  box(le, 0.12, 0.16, 0.17, amber, 0.43, 1.54, -0.33, 'emitter');
  const lr = part(opticalHead, 'receiver', new THREE.Vector3(0.7, 0.3, 0.65));
  box(lr, 0.26, 0.35, 0.4, black, -0.43, 1.62, 0.32, 'receiver');
  box(lr, 0.35, 0.08, 0.5, metal, -0.43, 1.39, 0.32, 'receiver');
  box(lr, 0.04, 0.2, 0.24, cyan, -0.27, 1.62, 0.32, 'receiver');
  const lo = part(opticalHead, 'optics', new THREE.Vector3(1.15, 0.15, 0));
  for (const z of [-0.33, 0.32]) {
    const opticalY = z < 0 ? 1.54 : 1.62;
    barrel(lo, 0.25, 0.38, 0.62, opticalY, z);
    box(lo, 0.1, 0.22, 0.12, metal, 0.62, 1.29, z, 'optics');
    const lens = cyl(lo, 0.215, 0.055, glass, 0.83, opticalY, z, 'optics');
    lens.rotation.z = Math.PI / 2;
  }
  const lb = part(lidar, 'board', new THREE.Vector3(0, -0.15, 1.5));
  boardDetails(lb, 0.45);
  tube(lb, new THREE.Vector3(0.2, 0.55, -0.33), new THREE.Vector3(0.2, 1.4, -0.33), 0.025, copper, 'board');
  tube(
    lb,
    new THREE.Vector3(-0.43, 0.55, 0.32),
    new THREE.Vector3(-0.43, 1.45, 0.32),
    0.025,
    copper,
    'board',
  );
  const paths = new THREE.Group();
  lidar.add(paths);
  tube(
    paths,
    new THREE.Vector3(0.45, 1.54, -0.33),
    new THREE.Vector3(2.5, 1.54, -0.33),
    0.018,
    amber,
    'emitter',
  );
  tube(
    paths,
    new THREE.Vector3(2.5, 1.54, -0.33),
    new THREE.Vector3(0.83, 1.62, 0.32),
    0.016,
    cyan,
    'receiver',
  );
  tube(
    paths,
    new THREE.Vector3(0.83, 1.62, 0.32),
    new THREE.Vector3(-0.25, 1.62, 0.32),
    0.016,
    cyan,
    'receiver',
  );
  box(paths, 0.08, 0.4, 0.75, metal, 2.55, 1.6, 0, 'target');

  const camera = new THREE.Group();
  devices.camera = camera;
  instruments.add(camera);
  const ch = part(camera, 'housing', new THREE.Vector3(-1, 0, -0.8));
  const cameraHousing = box(ch, 1.2, 1.5, 1.7, graphite, -0.65, 1.1, 0);
  cameraHousing.userData.cover = true;
  for (const z of [-0.72, 0.72]) {
    box(ch, 0.14, 1.4, 0.12, metal, 0, 1.1, z);
    fastener(ch, 0, 1.83, z);
  }
  for (const y of [0.4, 1.8]) box(ch, 0.14, 0.12, 1.55, metal, 0, y, 0);
  const co = part(camera, 'optics', new THREE.Vector3(1.35, 0.2, 0));
  for (let i = 0; i < 5; i++) {
    barrel(co, 0.58 - i * 0.035, 0.1, 0.2 + i * 0.24, 1.1, 0, 0.065);
    const lens = mesh(
      co,
      new THREE.SphereGeometry(0.5 - i * 0.035, 28, 14),
      glass,
      0.2 + i * 0.24,
      1.1,
      0,
      'optics',
    );
    lens.scale.set(0.13, 1, 1);
  }
  const cr = part(camera, 'receiver', new THREE.Vector3(-0.9, 0.3, 0.8));
  box(cr, 0.08, 0.62, 0.83, copper, -0.4, 1.1, 0, 'receiver');
  box(cr, 0.025, 0.42, 0.58, cyan, -0.35, 1.1, 0, 'receiver');
  for (let i = 0; i < 8; i++) {
    box(cr, 0.045, 0.03, 0.055, copper, -0.38, 0.85 + i * 0.072, -0.36, 'receiver');
    box(cr, 0.045, 0.03, 0.055, copper, -0.38, 0.85 + i * 0.072, 0.36, 'receiver');
  }
  const cb = part(camera, 'board', new THREE.Vector3(-1, 0.15, 1.4));
  boardDetails(cb, 0.4);
  tube(cb, new THREE.Vector3(0, 0.5, 0.3), new THREE.Vector3(-0.4, 1.05, 0.3), 0.035, copper, 'board');
  const cameraPath = tube(
    camera,
    new THREE.Vector3(2, 1.1, 0.6),
    new THREE.Vector3(-0.34, 1.1, 0),
    0.018,
    cyan,
    'optics',
  );
  const radar = new THREE.Group();
  devices.radar = radar;
  instruments.add(radar);
  const rh = part(radar, 'housing', new THREE.Vector3(1.4, 0.15, 0));
  const radome = box(rh, 0.22, 1.65, 2.3, graphite, 0.55, 1.1, 0);
  radome.userData.cover = true;
  const rb = part(radar, 'board', new THREE.Vector3(-0.9, 0, 0));
  box(rb, 0.1, 1.5, 2.1, pcb, 0, 1.1, 0, 'board');
  for (const z of [-0.98, 0.98]) box(rb, 0.16, 1.48, 0.07, metal, -0.1, 1.1, z, 'board');
  for (let i = 0; i < 4; i++) box(rb, 0.025, 0.025, 1.7, copper, 0.062, 0.64 + i * 0.3, 0, 'board');
  const ra = part(radar, 'emitter', new THREE.Vector3(0.65, 0.2, 0));
  for (let row = 0; row < 4; row++)
    for (let col = 0; col < 8; col++)
      box(ra, 0.025, 0.12, 0.12, copper, 0.08, 0.58 + row * 0.32, -0.85 + col * 0.24, 'emitter');
  const rr = part(radar, 'receiver', new THREE.Vector3(-1.5, 0.1, 0));
  box(rr, 0.18, 0.48, 0.62, black, -0.17, 1.15, 0, 'receiver');
  for (let i = 0; i < 4; i++) box(rr, 0.2, 0.2, 0.32, metal, -0.18, 0.62 + i * 0.3, 0.7, 'receiver');
  const shield = part(radar, 'drive', new THREE.Vector3(-1.8, 0, 0));
  box(shield, 0.13, 1.6, 2.2, metal, -0.4, 1.1, 0, 'drive');
  for (let i = 0; i < 4; i++) {
    const arc = mesh(
      radar,
      new THREE.TorusGeometry(0.3 + i * 0.2, 0.018, 6, 32, Math.PI),
      cyan,
      0.7 + i * 0.3,
      1.1,
      0,
      'emitter',
    );
    arc.rotation.y = Math.PI / 2;
  }

  const target = box(measurement, 0.25, 3, 4, metal, 16.125, 1.5, 0, 'target');
  const obstruction = box(measurement, 0.22, 3, 4, graphite, 8.11, 1.5, 0, 'occluder');
  const floor = box(measurement, 82, 0.06, 5, mat(0xdce3e5, 0.1), 40, -0.05, 0, 'target');
  floor.castShadow = false;
  const marks = new THREE.Group();
  measurement.add(marks);
  for (let i = 0; i <= 80; i += 4) box(marks, 0.035, 0.025, 4, metal, i, 0, 0, 'target');
  const rayGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)]);
  geometries.add(rayGeo);
  const outgoingMat = new THREE.LineBasicMaterial({ color: 0xe28a29 }),
    returnMat = new THREE.LineBasicMaterial({ color: 0x159eae });
  materials.add(outgoingMat);
  materials.add(returnMat);
  const outgoing = new THREE.Line(rayGeo, outgoingMat),
    returning = new THREE.Line(rayGeo.clone(), returnMat);
  geometries.add(returning.geometry);
  measurement.add(outgoing, returning);
  const pulse = mesh(measurement, new THREE.SphereGeometry(0.09, 12, 8), amber, 0, 1.5, 0, 'emitter');
  const echo = mesh(measurement, new THREE.SphereGeometry(0.1, 12, 8), cyan, 0, 1.5, 0, 'receiver');
  function linePose(line: THREE.Line, from: THREE.Vector3, to: THREE.Vector3) {
    line.position.copy(from);
    line.scale.set(from.distanceTo(to), 1, 1);
    line.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), to.clone().sub(from).normalize());
  }
  return {
    root,
    update(snapshot: SceneSnapshot, seconds: number, view: MechanicalView) {
      const d = normalizeSensorDraft(snapshot),
        isMeasure = view.sensorScene === 'measurement',
        exploded = view.mode === 'exploded' && !isMeasure;
      measurement.visible = isMeasure;
      instruments.scale.setScalar(isMeasure ? 0.16 : 1);
      instruments.position.set(isMeasure ? -0.3 : 0, isMeasure ? 1.28 : 0, 0);
      for (const [id, g] of Object.entries(devices)) g.visible = id === d.sensor;
      for (const g of partGroups) {
        const offset = g.userData.offset as THREE.Vector3;
        g.position.copy(offset).multiplyScalar(exploded ? 1 : 0);
        g.visible =
          !view.isolate || view.selected === 'sensor' || !view.selected || g.userData.part === view.selected;
      }
      for (const m of meshes) {
        if (m.userData.cover) m.visible = view.mode !== 'section' || isMeasure;
        if (typeof m.userData.barrelSection === 'boolean')
          m.visible = m.userData.barrelSection === (view.mode === 'section' && !isMeasure);
      }
      shell.visible = view.mode !== 'section' || isMeasure;
      lid.visible = view.mode !== 'section' || isMeasure;
      lid.position.y = exploded ? 0.65 : 0;
      paths.visible = d.showRay && !isMeasure && !view.isolate && !exploded;
      cameraPath.visible = d.showRay && !isMeasure && !exploded && !view.isolate;
      opticalHead.rotation.y = 0;
      rotor.position.y = exploded ? 0.7 : 0;
      rotor.visible =
        !view.isolate || view.selected === 'drive' || view.selected === 'sensor' || !view.selected;
      target.position.x = d.distance + 0.125;
      obstruction.visible = d.occluded;
      obstruction.position.x = SENSOR_GEOMETRY.occluderDistance + 0.11;
      const r = sensorRay(snapshot),
        start = new THREE.Vector3(0, 1.5, 0),
        end = new THREE.Vector3(...r.end);
      outgoing.visible = d.showRay;
      returning.visible = d.showRay && r.hasReturn;
      linePose(outgoing, start, end);
      linePose(
        returning,
        end.clone().add(new THREE.Vector3(0, 0.04, 0)),
        start.clone().add(new THREE.Vector3(0, 0.04, 0)),
      );
      const phase = (((seconds % 2) + 2) % 2) / 2;
      pulse.visible = d.showRay;
      pulse.position.copy(start).lerp(end, phase);
      echo.visible = d.showRay && r.hasReturn;
      echo.position.copy(end).lerp(start, phase);
    },
    camera(view: MechanicalView, snapshot: SceneSnapshot) {
      if (view.sensorScene === 'measurement') {
        const d = normalizeSensorDraft(snapshot).distance;
        return {
          position: [d * 0.48, Math.max(10.4, d * 0.455), Math.max(14.3, d * 0.91)],
          target: [d * 0.47, 0.9, 0],
        };
      }
      const exploded = view.mode === 'exploded';
      const focus: Record<string, [number, number, number]> = {
        emitter: [0.4, 1.5, -0.3],
        receiver: [-0.3, 1.5, 0.3],
        optics: [0.7, 1.4, 0],
        drive: [0, 0.8, 0],
        board: [0, 0.45, 0],
      };
      const local = view.isolate && focus[view.selected];
      return {
        position: local
          ? [local[0] + 3.2, local[1] + 2, local[2] + 3.2]
          : exploded
            ? [7, 5.1, 7]
            : [5.4, 3.9, 5.2],
        target: local || [0.2, 1.15, 0],
      };
    },
    dispose() {
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
      root.clear();
    },
  };
}
