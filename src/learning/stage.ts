import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { SceneSnapshot } from './types';
import { drivePose, sensorRay, chainFlow } from './stage-model';
import { SENSOR_GEOMETRY } from './activities/sensor-state';

/** Functional teaching model: vehicle dimensions illustrative; sensor distances in metres. */
export function createStage(host: HTMLElement) {
  let snapshot: SceneSnapshot = { kind: 'vehicle' },
    active = true,
    disposed = false,
    lost = false,
    frame = 0,
    elapsed = 0,
    last = 0,
    playing = false,
    low = false,
    userCamera = false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#e9e6df');
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 220);
  const fallback = document.createElement('div');
  fallback.className = 'lab-stage-fallback';
  fallback.hidden = true;
  fallback.setAttribute('role', 'status');
  const label = document.createElement('div');
  label.className = 'lab-stage-label';
  label.style.cssText =
    'position:absolute;left:18px;bottom:18px;max-width:calc(100% - 36px);padding:10px 14px;border-radius:12px;background:rgba(255,255,255,.92);color:#283b39;font-size:16px;pointer-events:none';
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:relative;width:100%;height:100%;min-height:360px';
  host.append(wrapper);
  wrapper.append(label, fallback);
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
  } catch {
    fallback.hidden = false;
    fallback.textContent =
      '二维备用视图：三维预览不可用。电池供能 → 电控调节 → 电机 → 传动机构 → 车轮；所有实验仍可通过文字证据完成。';
    return {
      setSnapshot(s: SceneSnapshot) {
        snapshot = s;
        fallback.textContent = readable(s);
      },
      replay() {},
      setActive(_a: boolean) {},
      dispose() {
        wrapper.remove();
      },
      resetCamera() {},
      setQuality(_l: boolean) {},
    };
  }
  renderer.domElement.className = 'lab-stage-canvas';
  renderer.domElement.setAttribute('aria-label', '可旋转的功能示意模型');
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none';
  wrapper.prepend(renderer.domElement);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = false;
  controls.minDistance = 5;
  controls.maxDistance = 200;
  controls.maxPolarAngle = Math.PI * 0.48;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xa59d8d, 2.8));
  const sun = new THREE.DirectionalLight(0xffffff, 4);
  sun.position.set(-5, 14, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -14;
  sun.shadow.camera.right = 14;
  sun.shadow.camera.top = 14;
  sun.shadow.camera.bottom = -14;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);
  const mats: THREE.Material[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  const material = (color: string, metalness = 0.2, roughness = 0.5) => {
    const m = new THREE.MeshStandardMaterial({ color, metalness, roughness });
    mats.push(m);
    return m;
  };
  const ivory = material('#eee9dc'),
    teal = material('#287b77', 0.45, 0.3),
    dark = material('#273632'),
    metal = material('#aab7b1', 0.8, 0.28),
    rubber = material('#222827', 0, 0.85),
    orange = material('#d77c3d'),
    blue = material('#658f9f');
  const glass = new THREE.MeshPhysicalMaterial({
    color: '#7faaa9',
    transparent: true,
    opacity: 0.42,
    metalness: 0.1,
    roughness: 0.12,
    depthWrite: false,
  });
  mats.push(glass);
  const vehicle = new THREE.Group(),
    sensorScene = new THREE.Group();
  scene.add(vehicle, sensorScene);
  const geometry = <T extends THREE.BufferGeometry>(g: T) => {
    geometries.push(g);
    return g;
  };
  function mesh(g: THREE.BufferGeometry, m: THREE.Material, parent: THREE.Object3D, x = 0, y = 0, z = 0) {
    const unique = m.clone();
    mats.push(unique);
    const o = new THREE.Mesh(g, unique);
    o.position.set(x, y, z);
    o.castShadow = true;
    o.receiveShadow = true;
    parent.add(o);
    return o;
  }
  function box(
    parent: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    m: THREE.Material,
  ) {
    return mesh(geometry(new THREE.BoxGeometry(w, h, d)), m, parent, x, y, z);
  }
  function cylinder(
    parent: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    r: number,
    length: number,
    m: THREE.Material,
  ) {
    const o = mesh(geometry(new THREE.CylinderGeometry(r, r, length, 32)), m, parent, x, y, z);
    o.rotation.x = Math.PI / 2;
    return o;
  }
  const floor = box(scene, 0, -0.16, 0, 160, 0.2, 100, material('#d9d5c9', 0, 0.95));
  floor.receiveShadow = true;
  box(vehicle, 0, 0.02, 0, 7, 0.12, 4.4, ivory);
  const chassis = new THREE.Group();
  vehicle.add(chassis);
  box(chassis, 0, 0.62, 0, 4.4, 0.18, 1.85, dark);
  const battery = new THREE.Group();
  vehicle.add(battery);
  box(battery, -0.35, 0.85, 0, 2.25, 0.17, 1.5, metal);
  for (let i = 0; i < 12; i++) {
    box(battery, -1.35 + i * 0.18, 1.02, 0, 0.13, 0.26, 1.3, i % 2 ? teal : blue);
  }
  const motor = new THREE.Group();
  vehicle.add(motor);
  cylinder(motor, 1.34, 0.97, 0, 0.33, 0.92, teal);
  const rotor = cylinder(motor, 1.34, 0.97, 0, 0.12, 1.4, orange);
  const transmission = new THREE.Group();
  vehicle.add(transmission);
  cylinder(transmission, 1.48, 0.78, 0, 0.1, 2.1, metal);
  box(transmission, 1.5, 0.8, 0, 0.5, 0.36, 0.5, metal);
  const computer = new THREE.Group();
  vehicle.add(computer);
  box(computer, -1.5, 1.18, 0, 0.65, 0.25, 0.85, dark);
  for (let i = 0; i < 7; i++) box(computer, -1.77 + i * 0.09, 1.32, 0, 0.035, 0.06, 0.8, metal);
  const wheels: THREE.Group[] = [];
  const brakes = new THREE.Group();
  vehicle.add(brakes);
  for (const x of [-1.55, 1.55])
    for (const z of [-1.1, 1.1]) {
      const w = new THREE.Group();
      w.position.set(x, 0.65, z);
      vehicle.add(w);
      wheels.push(w);
      cylinder(w, 0, 0, 0, 0.51, 0.3, rubber);
      cylinder(w, 0, 0, z > 0 ? 0.17 : -0.17, 0.35, 0.035, metal);
      for (let i = 0; i < 5; i++) {
        const spoke = box(w, 0, 0, z > 0 ? 0.2 : -0.2, 0.57, 0.07, 0.045, dark);
        spoke.rotation.z = (i * Math.PI) / 5;
      }
      cylinder(brakes, x, 0.65, z * 0.84, 0.3, 0.05, metal);
      box(brakes, x + 0.2, 0.75, z * 0.84, 0.16, 0.25, 0.14, orange);
    }
  const shell = new THREE.Group();
  vehicle.add(shell);
  const outline = new THREE.Shape();
  outline.moveTo(-2.35, 0.95);
  outline.lineTo(-2.2, 1.42);
  outline.lineTo(-1.1, 1.43);
  outline.lineTo(1.55, 1.43);
  outline.lineTo(2.3, 1.3);
  outline.lineTo(2.4, 0.95);
  outline.closePath();
  const body = mesh(
    geometry(
      new THREE.ExtrudeGeometry(outline, {
        depth: 1.82,
        bevelEnabled: true,
        bevelSegments: 3,
        steps: 1,
        bevelSize: 0.08,
        bevelThickness: 0.08,
      }),
    ),
    ivory,
    shell,
    0,
    0,
    -0.91,
  );
  box(shell, 0.05, 1.79, 0, 1.35, 0.6, 1.76, glass);
  box(shell, 0.08, 2.16, 0, 1.5, 0.07, 1.84, teal);
  for (const z of [-0.9, 0.9]) {
    box(shell, -0.67, 1.83, z, 0.055, 0.69, 0.055, metal);
    box(shell, 0.77, 1.83, z, 0.055, 0.69, 0.055, metal).rotation.z = 0.25;
    box(shell, 0.08, 1.5, z, 1.6, 0.045, 0.045, teal);
  }
  box(shell, 0.85, 1.8, 0, 0.045, 0.61, 1.75, glass).rotation.z = 0.25;
  for (const z of [-0.45, 0.45]) {
    box(shell, -0.1, 1.5, z, 0.4, 0.35, 0.4, dark);
    box(shell, -0.35, 1.75, z, 0.08, 0.5, 0.4, dark).rotation.z = 0.15;
  }
  // Visible bus bars, cooling ribs and paired power leads identify the teaching drivetrain.
  for (let i = 0; i < 6; i++) box(motor, 1.12 + i * 0.085, 1, 0, 0.035, 0.5, 1.03, metal);
  for (const z of [-0.4, 0.4]) box(battery, 0.7, 1.15, z, 0.9, 0.045, 0.06, orange);
  box(computer, -1.15, 1.2, 0.57, 0.8, 0.045, 0.05, orange);
  for (const z of [-0.7, 0.7]) box(shell, 2.39, 1.18, z, 0.06, 0.17, 0.38, blue);
  const sensor = new THREE.Group();
  vehicle.add(sensor);
  cylinder(sensor, 0.1, 2.37, 0, 0.19, 0.24, dark).rotation.x = 0;
  cylinder(sensor, 0.1, 2.5, 0, 0.21, 0.12, teal).rotation.x = 0;
  const parts: Record<string, THREE.Object3D> = {
    battery,
    motor,
    transmission,
    computer,
    compute: computer,
    sensor,
    brake: brakes,
    actuator: brakes,
    body: shell,
    power: battery,
  };
  const chainGroup = new THREE.Group();
  scene.add(chainGroup);
  const chainLabel = document.createElement('div');
  chainLabel.style.cssText =
    'position:absolute;left:16px;top:16px;background:#ffffffed;padding:10px;border-radius:10px;font-size:16px;color:#284c43';
  wrapper.append(chainLabel);
  const inputMat = new THREE.LineDashedMaterial({ color: '#4d9e8a', dashSize: 0.18, gapSize: 0.07 });
  const commandMat = new THREE.LineDashedMaterial({ color: '#4d9e8a', dashSize: 0.18, gapSize: 0.07 });
  mats.push(inputMat, commandMat);
  const inputGeometry = geometry(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
  );
  const commandGeometry = geometry(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
  );
  const inputLine = new THREE.LineSegments(inputGeometry, inputMat),
    commandLine = new THREE.LineSegments(commandGeometry, commandMat);
  chainGroup.add(inputLine, commandLine);
  const ports = [
    mesh(geometry(new THREE.SphereGeometry(0.1, 12, 8)), orange, chainGroup),
    mesh(geometry(new THREE.SphereGeometry(0.1, 12, 8)), orange, chainGroup),
    mesh(geometry(new THREE.SphereGeometry(0.1, 12, 8)), orange, chainGroup),
  ];
  const signal = mesh(geometry(new THREE.SphereGeometry(0.15, 12, 8)), teal, chainGroup);
  const breakMarker = mesh(geometry(new THREE.OctahedronGeometry(0.21)), orange, chainGroup);
  function updateChain() {
    const flow = chainFlow(snapshot);
    chainGroup.visible = flow.visible;
    chainLabel.hidden = !flow.visible;
    if (!flow.visible) return;
    vehicle.updateMatrixWorld(true);
    const source = sensor.localToWorld(new THREE.Vector3(0.1, 2.5, 0));
    const compute = computer.localToWorld(new THREE.Vector3(-1.5, 1.4, 0.5));
    const action = brakes.localToWorld(new THREE.Vector3(1.55, 0.85, 1.02));
    ports[0].position.copy(source);
    ports[1].position.copy(compute);
    ports[2].position.copy(action);
    const fault = snapshot.fault ?? 'none';
    const wire = (
      line: THREE.LineSegments,
      g: THREE.BufferGeometry,
      a: THREE.Vector3,
      b: THREE.Vector3,
      broken: boolean,
      enabled: boolean,
      gap = 0.5,
    ) => {
      const points = broken ? [a, a.clone().lerp(b, gap - 0.07), a.clone().lerp(b, gap + 0.07), b] : [a, b];
      g.setFromPoints(points);
      line.computeLineDistances();
      (line.material as THREE.LineDashedMaterial).color.set(
        broken ? '#d45a3b' : enabled ? '#247c68' : '#a8b5ae',
      );
    };
    wire(inputLine, inputGeometry, source, compute, fault === 'input', flow.input);
    wire(
      commandLine,
      commandGeometry,
      compute,
      action,
      fault === 'compute' || fault === 'actuator',
      flow.command,
      fault === 'actuator' ? 0.92 : 0.5,
    );
    const stopPoint =
      fault === 'input'
        ? source.clone().lerp(compute, 0.4)
        : fault === 'compute'
          ? compute.clone().lerp(action, 0.4)
          : fault === 'actuator'
            ? compute.clone().lerp(action, 0.85)
            : action;
    breakMarker.visible = fault !== 'none';
    breakMarker.position.copy(stopPoint);
    const progress = Math.min(1, elapsed / 3);
    signal.visible = (snapshot.chainStep ?? 0) > 0;
    if (fault === 'input') signal.position.copy(source).lerp(stopPoint, progress);
    else if ((snapshot.chainStep ?? 0) < 2) signal.position.copy(source).lerp(compute, progress);
    else if (progress < 0.5) signal.position.copy(source).lerp(compute, progress * 2);
    else signal.position.copy(compute).lerp(stopPoint, (progress - 0.5) * 2);
    chainLabel.textContent =
      fault === 'none'
        ? `信息路径：感知 → 计算 → 执行 · 第${snapshot.chainStep ?? 0}阶段`
        : `信息路径断点：${({ input: '感知输入中断', compute: '计算无法发出命令', actuator: '执行器未落实制动' } as const)[fault]}。${snapshot.chainStep && snapshot.chainStep >= 2 ? (flow.command ? '计算有命令；' : '计算无命令；') : ''}${snapshot.chainStep === 3 ? (flow.action ? '执行有反馈。' : '执行无反馈。') : ''}`;
  }
  const lineMaterial = new THREE.LineBasicMaterial({ color: '#df7846' });
  mats.push(lineMaterial);
  const rayGeometry = geometry(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 1.5, 0), new THREE.Vector3(16, 1.5, 0)]),
  );
  const ray = new THREE.Line(rayGeometry, lineMaterial);
  sensorScene.add(ray);
  const pulse = mesh(geometry(new THREE.SphereGeometry(0.16, 12, 8)), orange, sensorScene, 0, 1.5, 0);
  box(sensorScene, -1, 0.35, 0, 2, 0.7, 1.6, teal);
  const sensorHousing = new THREE.Group();
  sensorScene.add(sensorHousing);
  const outerHead = cylinder(sensorHousing, 0, 1.5, 0, 0.32, 0.45, teal);
  outerHead.rotation.x = 0;
  const sensorInternals = new THREE.Group();
  sensorScene.add(sensorInternals);
  cylinder(sensorInternals, 0, 1.27, 0, 0.3, 0.06, metal).rotation.x = 0;
  box(sensorInternals, 0.08, 1.49, -0.12, 0.2, 0.12, 0.12, orange);
  box(sensorInternals, 0.08, 1.49, 0.12, 0.2, 0.12, 0.12, blue);
  const mirror = box(sensorInternals, 0, 1.59, 0, 0.05, 0.25, 0.3, metal);
  mirror.rotation.z = 0.45;
  const cameraHead = new THREE.Group();
  sensorScene.add(cameraHead);
  const cameraCase = box(cameraHead, 0, 1.5, 0, 0.45, 0.35, 0.5, dark);
  box(cameraHead, -0.1, 1.5, 0, 0.05, 0.22, 0.3, teal);
  const lens = cylinder(cameraHead, 0.25, 1.5, 0, 0.13, 0.16, blue);
  lens.rotation.y = Math.PI / 2;
  const radarHead = new THREE.Group();
  sensorScene.add(radarHead);
  const radarCase = box(radarHead, 0, 1.5, 0, 0.18, 0.6, 0.65, ivory);
  box(radarHead, -0.05, 1.5, 0, 0.04, 0.48, 0.55, dark);
  for (const y of [1.35, 1.5, 1.65])
    for (const z of [-0.2, 0, 0.2]) box(radarHead, 0.105, y, z, 0.035, 0.065, 0.065, teal);
  const target = new THREE.Group();
  sensorScene.add(target);
  box(target, 0.15, 1.4, 0, 0.3, 2.8, SENSOR_GEOMETRY.targetHalfWidth * 2, ivory);
  const school = new THREE.Group();
  target.add(school);
  box(school, 2.5, 2.1, -5, 4, 4.2, 3, material('#b9b3a4'));
  box(school, 2.5, 2.1, 5, 4, 4.2, 3, ivory);
  box(school, 2.5, 4.4, 0, 0.4, 0.35, 9, teal);
  for (const z of [-5.7, -4.4, 4.4, 5.7])
    for (const y of [1.5, 3]) box(school, 0.45, y, z, 0.05, 0.8, 0.7, blue);
  // Pedestrian silhouette and crossing sign remain discernible alongside the target slab.
  const person = new THREE.Group();
  target.add(person);
  person.position.x = 1.2;
  cylinder(person, -0.45, 1.1, 1.2, 0.22, 0.7, orange).rotation.x = 0;
  mesh(geometry(new THREE.SphereGeometry(0.23, 16, 12)), ivory, person, -0.45, 1.73, 1.2);
  box(person, -0.45, 0.45, 0.98, 0.18, 0.65, 0.16, dark);
  box(person, -0.45, 0.45, 1.42, 0.18, 0.65, 0.16, dark);
  box(target, 0.6, 1.2, -1.4, 0.08, 2.4, 0.08, metal);
  box(target, 0.6, 2.2, -1.4, 0.08, 0.75, 0.65, teal);
  const occluder = new THREE.Group();
  sensorScene.add(occluder);
  box(occluder, 8.15, 1.25, 0, 0.3, 2.5, SENSOR_GEOMETRY.occluderHalfWidth * 2, material('#b18c6c'));
  for (let x = 3; x < 12; x += 1.4) box(sensorScene, x, 0.005, 0, 0.55, 0.018, 4.3, ivory);
  const dataPanel = document.createElement('div');
  dataPanel.style.cssText =
    'position:absolute;right:16px;top:16px;width:192px;padding:12px;border:1px solid #b5c7bf;border-radius:12px;background:#f8faf5ee;color:#23433b;font-size:16px;pointer-events:none';
  wrapper.append(dataPanel);
  const panelTitle = document.createElement('strong');
  const panelNote = document.createElement('div');
  panelNote.style.cssText = 'font-size:16px;margin-top:6px';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 180 110');
  svg.style.cssText =
    'width:100%;height:110px;display:block;background:#e5ede5;border-radius:6px;margin-top:8px';
  dataPanel.append(panelTitle, svg, panelNote);
  const shape = (tag: string, attrs: Record<string, string>) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    svg.append(node);
    return node;
  };
  function updateDataPanel() {
    dataPanel.hidden = snapshot.kind !== 'sensor';
    svg.replaceChildren();
    const mode = snapshot.sensor ?? 'lidar',
      trace = sensorRay(snapshot);
    panelTitle.textContent = {
      camera: '摄像头 · 图像画面',
      radar: '毫米波雷达 · 距离回波',
      lidar: '激光雷达 · 点阵轮廓',
    }[mode];
    if (snapshot.sensorView === 'measurement') {
      panelTitle.textContent = '本次测量证据';
      const text = (y: number, value: string) => {
        const node = shape('text', { x: '10', y: String(y), fill: '#23433b', 'font-size': '16' });
        node.textContent = value;
      };
      text(28, trace.hasReturn ? '首个表面回波可用' : '没有有效距离读数');
      text(56, trace.distance === null ? '距离：未知' : `距离 ${trace.distance.toFixed(2)} m`);
      text(84, trace.timeNs === null ? '往返时间：未知' : `往返 ${trace.timeNs.toFixed(1)} ns`);
      panelNote.textContent = {
        available: '回波来自测距参考平面。',
        occluded: '先收到8米处遮挡物回波。',
        miss: '本束未命中；不表示没有目标。',
        unknown: '浓雾信号不足，不能推断道路为空。',
      }[trace.status];
      return;
    }
    panelTitle.textContent = '信息类型示意 · ' + panelTitle.textContent;
    if (trace.status === 'unknown') {
      panelNote.textContent = '信号不足：前方状态未知';
      for (let i = 0; i < 5; i++)
        shape('path', {
          d: `M 10 ${25 + i * 14} L 170 ${25 + i * 14}`,
          stroke: '#bcc8c0',
          'stroke-dasharray': '3 8',
        });
      return;
    }
    if (mode === 'camera') {
      shape('rect', { x: '0', y: '0', width: '180', height: '60', fill: '#bad2d4' });
      shape('path', { d: 'M0 110 L62 58 L118 58 L180 110Z', fill: '#9ca9a6' });
      shape('rect', { x: '14', y: '25', width: '43', height: '43', fill: '#cfb998' });
      shape('rect', { x: '123', y: '25', width: '43', height: '43', fill: '#cfb998' });
      shape('rect', { x: '53', y: '21', width: '74', height: '8', fill: '#377c72' });
      shape('circle', { cx: '101', cy: '59', r: '6', fill: '#e0b495' });
      shape('path', {
        d: 'M101 65L101 83 M101 70L90 77 M101 70L110 76 M101 82L95 98 M101 82L108 98',
        stroke: '#d57b42',
        'stroke-width': '5',
      });
      if (trace.status === 'occluded')
        shape('rect', { x: '32', y: '35', width: '125', height: '75', fill: '#aa8d70' });
      panelNote.textContent =
        trace.status === 'occluded'
          ? '近处墙体遮住后方目标，不能看穿遮挡。'
          : '可见光图像为原理示意，非实际拍摄；观察颜色与纹理。';
    } else if (mode === 'radar') {
      for (const radius of [24, 46, 68, 90])
        shape('path', {
          d: `M ${90 - radius} 104 A ${radius} ${radius} 0 0 1 ${90 + radius} 104`,
          fill: 'none',
          stroke: '#829d92',
          'stroke-width': '1',
        });
      if (trace.hasReturn)
        shape('circle', {
          cx: String(90 + Math.sin(((snapshot.angle ?? 0) * Math.PI) / 180) * 65),
          cy: '38',
          r: '7',
          fill: '#317c70',
        });
      shape('path', { d: 'M90 104 L90 12', stroke: '#317c70', 'stroke-dasharray': '3 4' });
      panelNote.textContent = trace.hasReturn
        ? '首个表面存在距离回波；不提供交通灯颜色。'
        : '本方向无回波，不能判断道路为空。';
    } else {
      if (trace.hasReturn) {
        for (let y = 0; y < 7; y++)
          for (let z = 0; z < 13; z++) {
            if (y < 2 && z > 3 && z < 9) continue;
            shape('circle', { cx: String(24 + z * 11), cy: String(20 + y * 11), r: '1.8', fill: '#2c8072' });
          }
        for (let y = 0; y < 6; y++)
          shape('circle', { cx: '104', cy: String(39 + y * 10), r: '2.3', fill: '#2c8072' });
      }
      panelNote.textContent = trace.hasReturn
        ? '点阵为原理示意，非本次扫描结果；不表示真实材质颜色。'
        : '当前光束未命中，不能据此认定没有目标。';
    }
  }
  const resize = () => {
    if (disposed) return;
    const rect = wrapper.getBoundingClientRect();
    renderer.setSize(Math.max(1, rect.width), Math.max(360, rect.height), false);
    camera.aspect = Math.max(1, rect.width) / Math.max(360, rect.height);
    camera.updateProjectionMatrix();
    draw();
  };
  function resetCamera() {
    userCamera = false;
    if (snapshot.kind === 'sensor') {
      const distance = snapshot.distance ?? 16;
      const spread = Math.max(20, distance * 0.88);
      camera.position.set(distance * 0.4 - spread * 0.72, spread * 0.6, spread * 0.9);
      controls.target.set(distance * 0.45, 0, 0);
    } else {
      camera.position.set(8, 6.4, 8);
      controls.target.set(0, 1, 0);
    }
    controls.update();
    draw();
  }
  function readable(s: SceneSnapshot) {
    if (s.kind === 'sensor') {
      const r = sensorRay(s);
      return `二维备用视图 / 三维功能示意：传感器 → 测距参考平面（人形与学校为背景）。${{ available: '目标回波可用', occluded: '先遇到遮挡物', miss: '本束射线未命中', unknown: '浓雾，目标状态未知' }[r.status]}。参考平面 ${s.distance ?? 16} 米，偏转 ${s.angle ?? 0}°。`;
    }
    const p = drivePose(s, 1);
    return `二维备用视图 / 三维功能示意：电池 → 电控 → 电机 → 传动 → 车轮。电机${p.motorAngle ? '转动' : '停止'}，车轮${p.wheelAngle ? '转动' : '停止'}。${s.fault && s.fault !== 'none' ? `信息链断点：${({ input: '感知输入', compute: '计算判断', actuator: '执行制动' } as const)[s.fault]}。` : ''}功能示意，非真实尺寸。`;
  }
  function update() {
    const p = drivePose(snapshot, elapsed);
    vehicle.visible = snapshot.kind === 'vehicle';
    sensorScene.visible = !vehicle.visible;
    floor.scale.set(1, 1, 1);
    shell.visible = !snapshot.cutaway;
    shell.position.y = p.explode * 1.6;
    battery.position.y = p.explode * 0.45;
    computer.position.y = p.explode * 1.15;
    sensor.position.y = p.explode * 2;
    motor.position.z = p.explode * 1.5;
    transmission.position.z = -p.explode * 0.8;
    rotor.rotation.z = p.motorAngle;
    wheels.forEach((w) => (w.rotation.z = p.wheelAngle));
    vehicle.traverse((o) => {
      if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshStandardMaterial) {
        o.material.emissive.set('#000000');
        o.material.emissiveIntensity = 0;
      }
    });
    const selectedPart = parts[snapshot.selected ?? ''];
    selectedPart?.traverse((o) => {
      if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshStandardMaterial) {
        o.material.emissive.set('#4d7a60');
        o.material.emissiveIntensity = 0.55;
      }
    });
    updateChain();
    cameraCase.visible = !snapshot.cutaway;
    radarCase.visible = !snapshot.cutaway;
    sensorHousing.visible = (snapshot.sensor ?? 'lidar') === 'lidar' && !snapshot.cutaway;
    sensorInternals.visible = (snapshot.sensor ?? 'lidar') === 'lidar';
    cameraHead.visible = snapshot.sensor === 'camera';
    radarHead.visible = snapshot.sensor === 'radar';
    mirror.rotation.y = elapsed * 4;
    updateDataPanel();
    target.visible = snapshot.weather !== 'fog';
    target.position.x = snapshot.distance ?? 16;
    occluder.visible = !!snapshot.occluded;
    const r = sensorRay(snapshot);
    lineMaterial.color.set(snapshot.weather === 'fog' ? '#9d9b87' : '#df7846');
    ray.visible = snapshot.showRay !== false && snapshot.kind === 'sensor' && snapshot.sensor !== 'camera';
    pulse.visible = ray.visible && playing && r.hasReturn;
    rayGeometry.setFromPoints([new THREE.Vector3(0, 1.5, 0), new THREE.Vector3(...r.end)]);
    pulse.position.set(...r.end).multiplyScalar(Math.sin(Math.min(1, elapsed / 3) * Math.PI));
    pulse.position.y = 1.5;
    scene.fog =
      snapshot.kind === 'sensor' && snapshot.weather === 'fog' ? new THREE.Fog('#e9e6df', 5, 30) : null;
    label.textContent = readable(snapshot).replace('二维备用视图 / 三维功能示意：', '功能示意：');
    if (lost) fallback.textContent = readable(snapshot);
  }
  function draw() {
    if (lost) {
      fallback.textContent = readable(snapshot);
      return;
    }
    if (disposed || !active) return;
    update();
    renderer.render(scene, camera);
  }
  function tick(now: number) {
    frame = 0;
    if (!active || disposed || lost || !playing) return;
    elapsed += last ? Math.min((now - last) / 1000, 0.05) : 0;
    last = now;
    if (elapsed >= 3) {
      elapsed = 3;
      playing = false;
    }
    draw();
    if (playing) frame = requestAnimationFrame(tick);
  }
  function stop() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    playing = false;
    last = 0;
  }
  function replay() {
    stop();
    elapsed = reduced.matches ? 3 : 0;
    if (!active || lost) {
      draw();
      return;
    }
    playing = !reduced.matches;
    draw();
    if (playing) frame = requestAnimationFrame(tick);
  }
  const controlChange = () => draw();
  const cameraStart = () => {
    userCamera = true;
  };
  controls.addEventListener('start', cameraStart);
  controls.addEventListener('change', controlChange);
  const contextLost = (event: Event) => {
    event.preventDefault();
    lost = true;
    stop();
    fallback.hidden = false;
    fallback.textContent = readable(snapshot);
    renderer.domElement.hidden = true;
  };
  const contextRestored = () => {
    lost = false;
    fallback.hidden = true;
    renderer.domElement.hidden = false;
    draw();
  };
  renderer.domElement.addEventListener('webglcontextlost', contextLost);
  renderer.domElement.addEventListener('webglcontextrestored', contextRestored);
  const visibility = () => {
    if (document.hidden) stop();
  };
  document.addEventListener('visibilitychange', visibility);
  const observer = new ResizeObserver(resize);
  observer.observe(wrapper);
  resetCamera();
  resize();
  if (typeof renderer.compileAsync === 'function') void renderer.compileAsync(scene, camera).catch(() => {});
  return {
    setSnapshot(s: SceneSnapshot) {
      const kindChanged = snapshot.kind !== s.kind;
      snapshot = { ...s };
      stop();
      elapsed = 0;
      if (kindChanged || (!userCamera && s.kind === 'sensor')) resetCamera();
      draw();
    },
    replay,
    setActive(value: boolean) {
      active = value;
      if (!value) stop();
      else draw();
    },
    resetCamera,
    setQuality(value: boolean) {
      low = value;
      renderer.setPixelRatio(Math.min(devicePixelRatio, low ? 1 : 1.5));
      renderer.shadowMap.enabled = !low;
      resize();
    },
    dispose() {
      if (disposed) return;
      stop();
      disposed = true;
      observer.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', contextRestored);
      controls.removeEventListener('start', cameraStart);
      controls.removeEventListener('change', controlChange);
      controls.dispose();
      for (const g of geometries) g.dispose();
      for (const m of mats) m.dispose();
      renderer.dispose();
      wrapper.remove();
    },
  };
}
