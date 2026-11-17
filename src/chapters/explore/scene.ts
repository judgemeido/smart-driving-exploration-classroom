import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { disposeObject, disposeRenderer } from '../../shared/three-resources';
import type { createScope } from '../../shared/lifecycle';
import { rendererOptions, resizeRenderer } from '../../shared/renderer-quality';

export function createScene(canvas: HTMLCanvasElement, scope: ReturnType<typeof createScope>) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#e0e4e1');
  scene.add(new THREE.HemisphereLight(0xf4f7f4, 0x9da8a3, 2.1));
  const key = new THREE.DirectionalLight(0xffd4a3, 3.4);
  key.position.set(4, 7, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x8ad9d1, 2.2);
  rim.position.set(-5, 3, -4);
  scene.add(rim);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    ...rendererOptions(),
    alpha: false,
  });
  scope.add(() => disposeRenderer(renderer));
  // The scope disposes in reverse: scene GPU resources must go before renderer maps.
  scope.add(() => disposeObject(scene));
  const updateRendererPixelRatio = () => {
    // Keep the GL buffer proportional to the current viewport. This also
    // handles responsive preview resizing and device rotation without leaving
    // a desktop-sized buffer running behind a phone layout.
    resizeRenderer(renderer, Math.max(1, canvas.clientWidth), Math.max(1, canvas.clientHeight));
  };
  updateRendererPixelRatio();
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  const camera = new THREE.PerspectiveCamera(34, 1, 0.01, 100);
  camera.position.set(4.5, 2.5, 5.4);
  const controls = new OrbitControls(camera, canvas);
  scope.add(() => controls.dispose());
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 2.2;
  controls.maxDistance = 10;
  controls.minPolarAngle = 0.05;
  controls.maxPolarAngle = Math.PI / 2;
  controls.target.set(0, 0.75, 0);
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.45;

  // A quiet asphalt road keeps the vehicle grounded in a recognizable
  // driving context while remaining an independent scene layer. The model,
  // exploded assembly, picking ray and sensor overlays never depend on this
  // geometry, so changing the surface cannot alter their behavior.
  const roadSurface = new THREE.Group();
  roadSurface.name = 'ROAD_SURFACE';
  const asphalt = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 14),
    new THREE.MeshStandardMaterial({
      color: 0x343c3c,
      roughness: 0.94,
      metalness: 0.02,
      depthTest: false,
      depthWrite: false,
    }),
  );
  asphalt.rotation.x = -Math.PI / 2;
  asphalt.position.y = -0.94;
  asphalt.renderOrder = -10;
  asphalt.receiveShadow = true;
  roadSurface.add(asphalt);

  // Add a restrained green verge just beyond each shoulder. The roadside is
  // kept inside the same environment group as the road, so the full ground
  // layer still disappears together when visitors open the exploded view.
  const vergeMaterial = new THREE.MeshStandardMaterial({
    color: 0x718675,
    roughness: 1,
    metalness: 0,
    depthWrite: false,
  });
  [-1, 1].forEach((side) => {
    const verge = new THREE.Mesh(new THREE.PlaneGeometry(18, 2.1), vergeMaterial);
    verge.rotation.x = -Math.PI / 2;
    verge.position.set(0, -0.936, side * 7.45);
    verge.renderOrder = -7;
    verge.receiveShadow = true;
    roadSurface.add(verge);
  });

  // A single instanced mesh keeps the grass detail light enough for phones.
  const grassBladeGeometry = new THREE.ConeGeometry(0.035, 0.16, 3);
  grassBladeGeometry.translate(0, 0.08, 0);
  const grassBladeMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1,
    side: THREE.DoubleSide,
  });
  const grassBlades = new THREE.InstancedMesh(grassBladeGeometry, grassBladeMaterial, 144);
  grassBlades.name = 'ROADSIDE_GRASS';
  grassBlades.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  const grassTransform = new THREE.Object3D();
  const grassTint = new THREE.Color();
  const grassPalette = [0x587653, 0x65815b, 0x748b61, 0x4f704f];
  for (let index = 0; index < 144; index += 1) {
    const side = index < 72 ? -1 : 1;
    const localIndex = index % 72;
    const row = Math.floor(localIndex / 36);
    const x = -8.35 + (localIndex % 36) * 0.47;
    const z = side * (7.06 + row * 0.66 + (localIndex % 4) * 0.055);
    const height = 0.72 + ((localIndex * 7) % 6) * 0.09;
    grassTransform.position.set(x, -0.92, z);
    grassTransform.rotation.set(0, (index * 1.17) % (Math.PI * 2), 0);
    grassTransform.scale.set(0.82 + (localIndex % 3) * 0.12, height, 0.82 + (localIndex % 2) * 0.16);
    grassTransform.updateMatrix();
    grassBlades.setMatrixAt(index, grassTransform.matrix);
    grassBlades.setColorAt(
      index,
      grassTint.setHex(grassPalette[(index * 5 + localIndex) % grassPalette.length]),
    );
  }
  grassBlades.instanceMatrix.needsUpdate = true;
  if (grassBlades.instanceColor) grassBlades.instanceColor.needsUpdate = true;
  grassBlades.renderOrder = -6;
  grassBlades.frustumCulled = false;
  grassBlades.castShadow = false;
  grassBlades.receiveShadow = false;
  roadSurface.add(grassBlades);

  // Low, rounded shrubs add a little depth without rising into the car view.
  const shrubGeometry = new THREE.SphereGeometry(0.23, 10, 7);
  const shrubMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
  const shrubs = new THREE.InstancedMesh(shrubGeometry, shrubMaterial, 14);
  shrubs.name = 'ROADSIDE_SHRUBS';
  const shrubTransform = new THREE.Object3D();
  const shrubTint = new THREE.Color();
  const shrubPalette = [0x6e8868, 0x7b916f, 0x627e60];
  for (let index = 0; index < 14; index += 1) {
    const side = index < 7 ? -1 : 1;
    const localIndex = index % 7;
    shrubTransform.position.set(-7.65 + localIndex * 2.55, -0.81, side * (7.62 + (localIndex % 2) * 0.42));
    shrubTransform.rotation.y = localIndex * 0.73;
    shrubTransform.scale.set(1.1 + (localIndex % 3) * 0.12, 0.55, 0.88 + (localIndex % 2) * 0.16);
    shrubTransform.updateMatrix();
    shrubs.setMatrixAt(index, shrubTransform.matrix);
    shrubs.setColorAt(index, shrubTint.setHex(shrubPalette[(index * 2 + localIndex) % shrubPalette.length]));
  }
  shrubs.instanceMatrix.needsUpdate = true;
  if (shrubs.instanceColor) shrubs.instanceColor.needsUpdate = true;
  shrubs.renderOrder = -5;
  shrubs.frustumCulled = false;
  shrubs.castShadow = false;
  shrubs.receiveShadow = false;
  roadSurface.add(shrubs);

  const shoulder = new THREE.MeshStandardMaterial({
    color: 0x87928d,
    roughness: 0.82,
    metalness: 0.04,
    depthTest: false,
    depthWrite: false,
  });
  [-1, 1].forEach((side) => {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(18, 0.68), shoulder);
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(0, -0.932, side * 6.05);
    strip.renderOrder = -9;
    strip.receiveShadow = true;
    roadSurface.add(strip);
  });

  const edgeLine = new THREE.MeshStandardMaterial({
    color: 0xe7ece8,
    roughness: 0.62,
    metalness: 0.02,
    emissive: 0x374746,
    emissiveIntensity: 0.08,
    depthTest: false,
    depthWrite: false,
  });
  [-1, 1].forEach((side) => {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(18, 0.08), edgeLine);
    line.rotation.x = -Math.PI / 2;
    line.position.set(0, -0.928, side * 5.48);
    line.renderOrder = -8;
    roadSurface.add(line);
  });

  const laneLine = new THREE.MeshStandardMaterial({
    color: 0xf2f3ec,
    roughness: 0.58,
    metalness: 0.01,
    emissive: 0x5d635a,
    emissiveIntensity: 0.06,
    depthTest: false,
    depthWrite: false,
  });
  for (let index = 0; index < 9; index += 1) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.11), laneLine);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(-5.9 + index * 1.48, -0.927, 0);
    dash.renderOrder = -8;
    roadSurface.add(dash);
  }
  scene.add(roadSurface);

  return { scene, key, renderer, updateRendererPixelRatio, camera, controls, roadSurface, asphalt };
}
