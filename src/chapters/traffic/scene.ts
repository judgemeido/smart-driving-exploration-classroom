import * as THREE from 'three';
import { disposeObject, disposeRenderer } from '../../shared/three-resources';
import type { createScope } from '../../shared/lifecycle';
import { rendererOptions, resizeRenderer } from '../../shared/renderer-quality';
import { getQualityProfile } from '../../shared/performance';
import { makeMaterial, makeBox, makeCylinder, makeFallbackCar, createPedestrian } from './primitives';
export function createScene(canvas: HTMLCanvasElement, scope: ReturnType<typeof createScope>) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xcbd9d4);
  scene.fog = new THREE.Fog(0xcbd9d4, 58, 195);
  scene.add(new THREE.HemisphereLight(0xf4fbff, 0x667b69, 2.25));
  const sun = new THREE.DirectionalLight(0xfff3d7, 3.1);
  sun.position.set(-11, 18, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -18;
  sun.shadow.camera.right = 18;
  sun.shadow.camera.top = 24;
  sun.shadow.camera.bottom = -24;
  scene.add(sun);

  const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 230);
  camera.position.set(9, 8.5, 17);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    ...rendererOptions(),
    alpha: false,
  });
  scope.add(() => disposeRenderer(renderer));
  // The scope disposes in reverse: scene GPU resources must go before renderer maps.
  scope.add(() => disposeObject(scene));
  resizeRenderer(renderer, Math.max(1, canvas.clientWidth), Math.max(1, canvas.clientHeight));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.shadowMap.enabled = getQualityProfile().shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const city = new THREE.Group();
  city.name = 'Hangzhou-street-block';
  scene.add(city);
  const asphalt = makeMaterial(0x4b5554, 0.96);
  const concrete = makeMaterial(0xc3c7bd, 0.95);
  const curbMat = makeMaterial(0xe2dfd5, 0.9);
  const laneMat = new THREE.MeshBasicMaterial({ color: 0xf1eedf });
  const yellowMat = new THREE.MeshBasicMaterial({ color: 0xe3ba50 });
  const grassMat = makeMaterial(0x738e66, 0.98);
  const road = makeBox(city, [9.3, 0.22, 210], asphalt, [0, -0.12, -94]);
  road.receiveShadow = true;
  makeBox(city, [2.1, 0.18, 210], grassMat, [-5.72, -0.13, -94]);
  makeBox(city, [2.1, 0.18, 210], grassMat, [5.72, -0.13, -94]);
  for (const x of [-4.78, 4.78]) {
    makeBox(city, [0.22, 0.26, 210], curbMat, [x, 0.01, -94]);
    makeBox(city, [1.85, 0.22, 210], concrete, [x < 0 ? -5.68 : 5.68, 0.025, -94]);
    makeBox(city, [0.86, 0.12, 210], grassMat, [x < 0 ? -7.1 : 7.1, -0.04, -94]);
  }
  // Dashed centre markings and a clear, safely wide right-hand travel lane.
  makeBox(city, [0.09, 0.012, 210], yellowMat, [-0.08, 0.002, -94]);
  makeBox(city, [0.09, 0.012, 210], yellowMat, [0.08, 0.002, -94]);
  for (let z = 7; z > -194; z -= 12) {
    makeBox(city, [0.12, 0.014, 4.6], laneMat, [-3.15, 0.005, z]);
    makeBox(city, [0.12, 0.014, 4.6], laneMat, [3.15, 0.005, z]);
  }

  const buildingMats = [0xd8d5c9, 0xb8c8c6, 0xd5c6ad, 0xaab9bb].map((color) => makeMaterial(color, 0.92));
  const windowMat = new THREE.MeshBasicMaterial({ color: 0x738e93 });
  const windowMatrices: THREE.Matrix4[] = [];
  const windowDummy = new THREE.Object3D();
  for (let i = 0; i < 16; i += 1) {
    const z = -5 - i * 12;
    for (const side of [-1, 1]) {
      const x = side * (9.2 + (i % 3) * 0.8);
      const height = 5.5 + (i % 4) * 1.3;
      const width = 4.3 + (i % 2) * 0.8;
      const building = makeBox(
        city,
        [width, height, 7],
        buildingMats[(i + (side > 0 ? 1 : 0)) % buildingMats.length],
        [x, height / 2, z],
      );
      building.castShadow = true;
      for (let level = 0; level < Math.floor(height / 1.7); level += 1) {
        for (const windowSide of [-1, 1]) {
          windowDummy.position.set(x - side * (width / 2 + 0.035), 1.1 + level * 1.55, z + windowSide * 1.05);
          windowDummy.updateMatrix();
          windowMatrices.push(windowDummy.matrix.clone());
        }
      }
    }
  }
  const windowInstances = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.035, 0.72, 0.65),
    windowMat,
    windowMatrices.length,
  );
  windowMatrices.forEach((matrix, index) => windowInstances.setMatrixAt(index, matrix));
  windowInstances.instanceMatrix.needsUpdate = true;
  windowInstances.computeBoundingSphere();
  city.add(windowInstances);

  const treeMat = makeMaterial(0x56774f, 0.95);
  const trunkMat = makeMaterial(0x6f5944, 0.95);
  const planterMat = makeMaterial(0xa39d88, 0.94);
  const treePositions: THREE.Vector3[] = [];
  for (let i = 0; i < 24; i += 1) {
    const z = 4 - i * 8.4;
    for (const side of [-1, 1]) {
      const x = side * (6.75 + (i % 2) * 0.18);
      treePositions.push(new THREE.Vector3(x, 0.22, z));
    }
  }
  const treeDummy = new THREE.Object3D();
  const planterInstances = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1.45, 0.38, 1.45),
    planterMat,
    treePositions.length,
  );
  const trunkInstances = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.17, 0.23, 2.05, 10),
    trunkMat,
    treePositions.length,
  );
  const crownInstances = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1.18, 1),
    treeMat,
    treePositions.length,
  );
  treePositions.forEach((position, index) => {
    treeDummy.position.copy(position);
    treeDummy.scale.set(1, 1, 1);
    treeDummy.updateMatrix();
    planterInstances.setMatrixAt(index, treeDummy.matrix);
    treeDummy.position.set(position.x, 1.42, position.z);
    treeDummy.updateMatrix();
    trunkInstances.setMatrixAt(index, treeDummy.matrix);
    treeDummy.position.set(position.x, 2.75, position.z);
    treeDummy.scale.set(1 + (index % 3) * 0.11, 1.22 + (index % 3) * 0.13, 1 + (index % 3) * 0.11);
    treeDummy.updateMatrix();
    crownInstances.setMatrixAt(index, treeDummy.matrix);
  });
  planterInstances.computeBoundingSphere();
  trunkInstances.computeBoundingSphere();
  crownInstances.computeBoundingSphere();
  city.add(planterInstances, trunkInstances, crownInstances);

  const pedestrianActors: {
    root: THREE.Group;
    walk: (time: number, moving: boolean) => void;
    startX: number;
    endX: number;
    z: number;
    offset: number;
  }[] = [];
  const addWalker = (
    z: number,
    x: number,
    endX: number,
    colors: { coat: number; pants: number; skin: number },
    offset = 0,
  ) => {
    const actor = createPedestrian(colors, [x, 0.14, z]);
    actor.root.rotation.y = endX > x ? Math.PI / 2 : -Math.PI / 2;
    city.add(actor.root);
    const pedestrian = { ...actor, startX: x, endX, z, offset };
    pedestrianActors.push(pedestrian);
    return pedestrian;
  };
  const courtesyPedestrians = [
    addWalker(-37, -5.55, 5.55, { coat: 0xe9b14e, pants: 0x374d68, skin: 0xd6a37e }, 0.3),
    addWalker(-38.25, -5.55, 5.55, { coat: 0xd76458, pants: 0x32453e, skin: 0xc48b6f }, 1.7),
  ];
  const courtesyMaterials: THREE.Material[] = [];
  courtesyPedestrians.forEach((actor) => {
    actor.root.visible = false;
    actor.root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => {
        material.transparent = true;
        courtesyMaterials.push(material);
      });
    });
  });
  const greenLightPedestrians = [
    addWalker(-103, -5.55, 5.55, { coat: 0xf0c15e, pants: 0x385f7a, skin: 0xe0ad89 }, 0.9),
    addWalker(-104.25, -5.55, 5.55, { coat: 0x6395a7, pants: 0x464b5b, skin: 0xc98f73 }, 2.4),
  ];
  const greenLightPedestrianMaterials: THREE.Material[] = [];
  greenLightPedestrians.forEach((actor) => {
    actor.root.visible = false;
    actor.root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => {
        material.transparent = true;
        greenLightPedestrianMaterials.push(material);
      });
    });
  });
  // A few pedestrians wait safely at the pavement so the street never feels empty.
  addWalker(-58, -5.7, -5.7, { coat: 0x728cbb, pants: 0x414c63, skin: 0xd2a07d });
  addWalker(-78, 5.8, 5.8, { coat: 0x9c6757, pants: 0x4d5555, skin: 0xd1a082 });

  const signalMat = {
    shell: makeMaterial(0x242a29, 0.38, 0.4),
    pole: makeMaterial(0x5a625d, 0.34, 0.72),
    redOff: makeMaterial(0x4a2927, 0.42),
    yellowOff: makeMaterial(0x554729, 0.42),
    greenOff: makeMaterial(0x24453a, 0.42),
    redOn: new THREE.MeshStandardMaterial({
      color: 0xff4037,
      emissive: 0x9b160e,
      emissiveIntensity: 2.2,
      roughness: 0.24,
    }),
    yellowOn: new THREE.MeshStandardMaterial({
      color: 0xffd24a,
      emissive: 0x8b5d00,
      emissiveIntensity: 2.1,
      roughness: 0.24,
    }),
    greenOn: new THREE.MeshStandardMaterial({
      color: 0x39e889,
      emissive: 0x08743b,
      emissiveIntensity: 2.0,
      roughness: 0.24,
    }),
  };
  const signalGroups: THREE.Group[] = [];
  const createSignal = (z: number, state: 'red' | 'yellow' | 'green') => {
    const group = new THREE.Group();
    group.position.set(4.45, 0, z);
    group.name = `signal-${state}-${z}`;
    makeCylinder(group, 0.065, 0.09, 4.4, signalMat.pole, [0, 2.2, 0], 12);
    makeBox(group, [0.72, 1.7, 0.48], signalMat.shell, [0, 4.9, 0]);
    const lamps: THREE.Mesh[] = [];
    const states: ('red' | 'yellow' | 'green')[] = ['red', 'yellow', 'green'];
    states.forEach((color, index) => {
      const material =
        color === 'red' ? signalMat.redOff : color === 'yellow' ? signalMat.yellowOff : signalMat.greenOff;
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.205, 16, 12), material);
      lamp.position.set(0, 5.42 - index * 0.51, 0.255);
      group.add(lamp);
      lamps.push(lamp);
    });
    const activeIndex = state === 'red' ? 0 : state === 'yellow' ? 1 : 2;
    lamps[activeIndex].material =
      state === 'red' ? signalMat.redOn : state === 'yellow' ? signalMat.yellowOn : signalMat.greenOn;
    city.add(group);
    signalGroups.push(group);
    return group;
  };
  const firstSignal = createSignal(-15, 'red');
  const yellowSignal = createSignal(-51, 'yellow');
  const greenSignal = createSignal(-95, 'green');
  yellowSignal.visible = false;
  greenSignal.visible = false;

  const crosswalks: THREE.Group[] = [];
  const addCrosswalk = (z: number) => {
    const group = new THREE.Group();
    group.position.z = z;
    for (let i = 0; i < 9; i += 1) {
      makeBox(group, [0.68, 0.025, 2.8], laneMat, [-3.25 + i * 0.82, 0.008, 0]);
    }
    city.add(group);
    crosswalks.push(group);
    return group;
  };
  addCrosswalk(-38.5);
  addCrosswalk(-105.5);

  const addStopLine = (z: number) => {
    makeBox(city, [8.6, 0.018, 0.22], laneMat, [0, 0.012, z]);
  };
  addStopLine(-13.5);
  addStopLine(-35.5);
  addStopLine(-53.6);
  addStopLine(-72.2);
  addStopLine(-96.4);

  const schoolSign = new THREE.Group();
  schoolSign.position.set(-4.35, 0, -72.4);
  makeCylinder(schoolSign, 0.052, 0.065, 2.5, signalMat.pole, [0, 1.25, 0]);
  const schoolPlate = makeBox(schoolSign, [1.1, 0.82, 0.12], makeMaterial(0xf3d669, 0.55), [0, 2.45, 0]);
  const childIcon = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.44, 3), makeMaterial(0x283c43, 0.6));
  childIcon.position.set(0, 2.47, 0.08);
  schoolSign.add(childIcon);
  city.add(schoolSign);
  const schoolLabel = makeBox(schoolSign, [1.48, 0.28, 0.09], makeMaterial(0x276b62, 0.62), [0, 1.72, 0]);
  schoolSign.visible = false;
  void schoolPlate;
  void schoolLabel;

  // A compact Chinese street-name board anchors the place visually.
  const streetBoard = new THREE.Group();
  streetBoard.position.set(-4.3, 0, -4.2);
  makeCylinder(streetBoard, 0.05, 0.06, 3.0, signalMat.pole, [0, 1.5, 0]);
  makeBox(streetBoard, [1.5, 0.45, 0.11], makeMaterial(0x207469, 0.55), [0.2, 3.05, 0]);
  city.add(streetBoard);

  // Player car follows the real project vehicle asset, with a local fallback while loading.
  const car = new THREE.Group();
  car.name = 'Yaojing-S9-player-car';
  car.position.set(1.55, 0.02, -1.5);
  car.rotation.y = Math.PI / 2;
  const fallbackCar = makeFallbackCar();
  // The procedural fallback has its nose along local -Z; the museum GLB uses +X.
  fallbackCar.rotation.y = -Math.PI / 2;
  car.add(fallbackCar);
  scene.add(car);

  return {
    scene,
    camera,
    renderer,
    city,
    road,
    pedestrianActors,
    courtesyPedestrians,
    courtesyMaterials,
    greenLightPedestrians,
    greenLightPedestrianMaterials,
    signalMat,
    car,
    fallbackCar,
    firstSignal,
    yellowSignal,
    greenSignal,
    schoolSign,
  };
}
