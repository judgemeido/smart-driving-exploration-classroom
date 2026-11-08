import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type V3 = [number, number, number];

/** Original procedural tooling; cassette-source informed the chamfers, lathed
 * interfaces and material separation. Dimensions below are teaching model units. */
export function createCarCraft() {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const cache = new Map<string, THREE.BufferGeometry>();
  const textures = new Set<THREE.Texture>();
  function geo<T extends THREE.BufferGeometry>(geometry: T): T {
    geometries.add(geometry);
    return geometry;
  }
  function cached(key: string, build: () => THREE.BufferGeometry) {
    if (!cache.has(key)) cache.set(key, geo(build()));
    return cache.get(key)!;
  }
  const roughData = new Uint8Array(64 * 64 * 4);
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++) {
      const value = 210 + Math.round(18 * Math.sin(y * 12.7) + 8 * Math.sin(x * 1.8 + y * 4.3));
      const offset = (y * 64 + x) * 4;
      roughData.set([value, value, value, 255], offset);
    }
  const brush = new THREE.DataTexture(roughData, 64, 64);
  brush.wrapS = brush.wrapT = THREE.RepeatWrapping;
  brush.repeat.set(2, 2);
  brush.needsUpdate = true;
  textures.add(brush);
  function mat(name: string, color: string, metalness = 0.65, roughness = 0.38) {
    const material = new THREE.MeshPhysicalMaterial({
      name,
      color,
      metalness,
      roughness,
      roughnessMap: metalness > 0.4 ? brush : null,
      clearcoat: metalness > 0.4 ? 0.18 : 0,
      clearcoatRoughness: 0.35,
    });
    materials.add(material);
    return material;
  }
  const m = {
    alloy: mat('satin-machined-aluminium', '#aeb8bb', 0.88, 0.3),
    edge: mat('polished-edge', '#c6cbca', 0.9, 0.24),
    dark: mat('cast-graphite', '#303a3c', 0.65, 0.48),
    black: mat('black-oxide-fasteners', '#1d2527', 0.72, 0.35),
    rubber: mat('moulded-rubber', '#151b1e', 0.02, 0.88),
    copper: mat('copper-windings', '#bd7546', 0.82, 0.29),
    orange: mat('insulated-high-voltage', '#bc582e', 0.05, 0.5),
    cell: mat('anodised-cells', '#536d6b', 0.65, 0.39),
    pcb: mat('green-circuit-board', '#27463b', 0.12, 0.65),
    paint: mat('pearl-body-panels', '#b1bcba', 0.55, 0.32),
    trim: mat('seat-fabric', '#384346', 0.02, 0.82),
    spring: mat('spring-steel', '#b9ab84', 0.8, 0.3),
    red: mat('caliper-red', '#944933', 0.35, 0.42),
    lamp: mat('lamp-lens', '#e9e5cf', 0.15, 0.25),
    glass: mat('smoked-glass', '#456069', 0.08, 0.12),
  };
  m.glass.transparent = true;
  m.glass.opacity = 0.38;
  m.glass.depthWrite = false;
  m.glass.side = THREE.DoubleSide;
  function mesh(
    parent: THREE.Object3D,
    g: THREE.BufferGeometry,
    material: THREE.Material,
    pos: V3 = [0, 0, 0],
    name = '',
  ) {
    const object = new THREE.Mesh(g, material);
    object.position.set(...pos);
    object.name = name;
    object.castShadow = material !== m.glass;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  function box(parent: THREE.Object3D, material: THREE.Material, pos: V3, size: V3, r = 0.025, name = '') {
    const key = `b:${size.join()}:${r}`;
    return mesh(
      parent,
      cached(key, () => new RoundedBoxGeometry(...size, 2, Math.min(r, ...size.map((v) => v / 3)))),
      material,
      pos,
      name,
    );
  }
  function lathe(
    parent: THREE.Object3D,
    material: THREE.Material,
    pos: V3,
    radius: number,
    bore: number,
    height: number,
    axis: 'x' | 'y' | 'z' = 'y',
    name = '',
  ) {
    const c = Math.min(0.025, height * 0.22, (radius - bore) * 0.2);
    const key = `l:${radius},${bore},${height}`;
    const object = mesh(
      parent,
      cached(key, () => {
        const profile = [
          [bore, -height / 2 + c],
          [bore + c, -height / 2],
          [radius - c, -height / 2],
          [radius, -height / 2 + c],
          [radius, height / 2 - c],
          [radius - c, height / 2],
          [bore + c, height / 2],
          [bore, height / 2 - c],
          [bore, -height / 2 + c],
        ].map(([a, b]) => new THREE.Vector2(a, b));
        return toCreasedNormals(new THREE.LatheGeometry(profile, 48), 0.32);
      }),
      material,
      pos,
      name,
    );
    if (axis === 'z') object.rotation.x = Math.PI / 2;
    if (axis === 'x') object.rotation.z = -Math.PI / 2;
    return object;
  }
  function rod(parent: THREE.Object3D, material: THREE.Material, a: V3, b: V3, r = 0.035) {
    const start = new THREE.Vector3(...a),
      end = new THREE.Vector3(...b),
      d = end.clone().sub(start);
    const object = lathe(
      parent,
      material,
      start.add(end).multiplyScalar(0.5).toArray() as V3,
      r,
      0,
      d.length(),
    );
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    return object;
  }
  function tube(parent: THREE.Object3D, material: THREE.Material, points: V3[], r = 0.03, name = '') {
    const curve = new THREE.CatmullRomCurve3(points.map((v) => new THREE.Vector3(...v)));
    return mesh(
      parent,
      geo(new THREE.TubeGeometry(curve, Math.max(20, points.length * 8), r, 8, false)),
      material,
      [0, 0, 0],
      name,
    );
  }
  function bolts(parent: THREE.Object3D, points: V3[], axis: 'x' | 'y' | 'z' = 'y', radius = 0.035) {
    const geometry = cached(`bolt:${radius}`, () => new THREE.CylinderGeometry(radius, radius, 0.03, 6));
    const object = new THREE.InstancedMesh(geometry, m.black, points.length);
    const dummy = new THREE.Object3D();
    points.forEach((p, i) => {
      dummy.position.set(...p);
      dummy.rotation.set(axis === 'z' ? Math.PI / 2 : 0, 0, axis === 'x' ? Math.PI / 2 : 0);
      dummy.updateMatrix();
      object.setMatrixAt(i, dummy.matrix);
    });
    object.castShadow = true;
    parent.add(object);
    return object;
  }
  function coil(parent: THREE.Object3D, a: V3, b: V3, r = 0.13) {
    const av = new THREE.Vector3(...a),
      bv = new THREE.Vector3(...b),
      axis = bv.clone().sub(av),
      length = axis.length();
    const points: V3[] = Array.from({ length: 145 }, (_, i) => {
      const t = i / 144,
        theta = t * 2 * Math.PI * 7;
      return [r * Math.cos(theta), t * length, r * Math.sin(theta)];
    });
    const group = new THREE.Group();
    group.position.copy(av);
    group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.normalize());
    parent.add(group);
    tube(group, m.spring, points, 0.026);
    rod(group, m.edge, [0, 0, 0], [0, length, 0], 0.035);
    lathe(group, m.dark, [0, length * 0.28, 0], 0.07, 0, length * 0.55);
    return group;
  }
  function panel(
    parent: THREE.Object3D,
    material: THREE.Material,
    points: [number, number][],
    depth: number,
    pos: V3 = [0, 0, 0],
    name = '',
  ) {
    const shape = new THREE.Shape();
    points.forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)));
    shape.closePath();
    const geometry = geo(
      toCreasedNormals(
        new THREE.ExtrudeGeometry(shape, {
          depth,
          bevelEnabled: true,
          bevelSize: 0.018,
          bevelThickness: 0.018,
          bevelSegments: 3,
          curveSegments: 24,
        }),
        0.3,
      ),
    );
    return mesh(parent, geometry, material, pos, name);
  }
  function surface(
    parent: THREE.Object3D,
    material: THREE.Material,
    fn: (u: number, v: number) => V3,
    nu = 32,
    nv = 14,
    name = '',
  ) {
    const positions: number[] = [],
      indices: number[] = [];
    for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) positions.push(...fn(i / nu, j / nv));
    for (let i = 0; i < nu; i++)
      for (let j = 0; j < nv; j++) {
        const k = i * (nv + 1) + j;
        indices.push(k, k + nv + 1, k + 1, k + 1, k + nv + 1, k + nv + 2);
      }
    const geometry = geo(new THREE.BufferGeometry());
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const object = mesh(parent, geometry, material, [0, 0, 0], name);
    return object;
  }
  /** Batch static siblings per material. Articulated groups and inspection names stay. */
  function bake(parent: THREE.Object3D) {
    for (const child of [...parent.children]) if (!(child instanceof THREE.Mesh)) bake(child);
    const buckets = new Map<THREE.Material, THREE.Mesh[]>();
    for (const child of parent.children) {
      if (
        !(child instanceof THREE.Mesh) ||
        child instanceof THREE.InstancedMesh ||
        Array.isArray(child.material) ||
        child.name ||
        child.userData.articulated
      )
        continue;
      if (!buckets.has(child.material)) buckets.set(child.material, []);
      buckets.get(child.material)!.push(child);
    }
    for (const [material, objects] of buckets) {
      if (objects.length < 2) continue;
      const copies = objects.map((object) => {
        object.updateMatrix();
        const g = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
        g.applyMatrix4(object.matrix);
        g.deleteAttribute('uv');
        return g;
      });
      const merged = mergeGeometries(copies);
      copies.forEach((g) => g.dispose());
      if (merged) {
        mesh(parent, geo(merged), material);
        objects.forEach((o) => parent.remove(o));
      }
    }
  }
  return {
    m,
    geo,
    mesh,
    box,
    lathe,
    rod,
    tube,
    bolts,
    coil,
    panel,
    surface,
    bake,
    dispose() {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}
export type CarCraft = ReturnType<typeof createCarCraft>;
