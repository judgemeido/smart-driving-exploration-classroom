import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { SceneSnapshot } from './types';
import type { MechanicalMode, MechanicalView, MechanicalRig } from './mechanical-contract';
import { createVehicleRig } from './mechanical-vehicle';
import { createSensorRig } from './mechanical-sensor';
import { createBatteryRig } from './mechanical-battery';
import { createEvolutionRig } from './mechanical-evolution';
import { batteryTypes, batteryDirection } from './activities/battery-state';
import { evolutionEras } from './activities/evolution-state';
import { driveMechanism, sensorRay, chainFlow } from './stage-model';
import './mechanical-stage.css';

const vehicleParts = [
  ['battery', '电池'],
  ['motor', '电机'],
  ['transmission', '齿轮与半轴'],
  ['computer', '电控'],
  ['sensor', '感知'],
  ['brake', '制动'],
];
const descriptions: Record<string, [string, string]> = {
  overview: ['电驱机械教学台', '沿电池、电控、电机、齿轮到车轮，逐件打开观察。'],
  battery: ['动力电池 · 模组与冷却板', '打开上盖，观察模组端子、铜母排与下方冷却板。'],
  motor: ['驱动电机 · 定子与转子', '铜绕组固定在外圈；内部磁极、转子和轴一起转动。'],
  transmission: ['减速机构 · 外啮合齿轮', '小齿轮带动大齿轮反向转动；输出轴转得更慢。'],
  computer: ['电控 · 功率模块与电路', '电路决定怎样工作，功率模块调节送往电机的电能。'],
  sensor: ['环境感知 · 输入端', '感知提供道路证据；有输入、有命令和有执行是三件事。'],
  brake: ['制动 · 盘与卡钳', '卡钳中的摩擦片夹紧制动盘；收到命令仍需执行反馈。'],
  housing: ['外壳与支承', '保护内部器件，给光学与电路提供稳定的安装位置。'],
  emitter: ['发射端 · 激光源', '激光源发出光脉冲，经前方光学器件射向目标。'],
  receiver: ['接收端 · 探测器', '接收光学器件收集回波，探测器把光信号转换成电信号。'],
  optics: ['光学器件 · 透镜', '透镜控制光路；发射与接收各有自己的光学通道。'],
  drive: ['旋转驱动 · 轴与支承', '平台、发射、接收与镜组共轴旋转；本台固定方位看结构，不模拟扫描点云。'],
  board: ['处理电路 · 电路板', '电路处理输入信号；结构图不代表真实产品的布线或性能。'],
};

/** Teardown-style inspection; scientific state stays with the classroom experiment. */
export function createStage(
  host: HTMLElement,
  onInspect?: (part: string) => void,
  onPresentation?: (view: { exploded: boolean; cutaway: boolean }) => void,
) {
  let snapshot: SceneSnapshot = { kind: 'vehicle' };
  let initialized = false,
    disposed = false,
    active = true,
    lost = false;
  let playing = false,
    frame = 0,
    last = 0,
    elapsed = 0,
    userCamera = false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const abort = new AbortController();
  const view: MechanicalView = {
    mode: 'section',
    selected: 'overview',
    isolate: false,
    sensorScene: 'mechanism',
  };
  const wrapper = document.createElement('div');
  wrapper.className = 'mechanical-stage';
  wrapper.innerHTML = `<div class="mechanical-controls"><div class="mechanical-modes" role="group" aria-label="机械展示方式">${(['assembly', 'section', 'exploded'] as MechanicalMode[]).map((mode, i) => `<button type="button" data-view-mode="${mode}" aria-pressed="${mode === view.mode}">${['装配', '剖视', '分解'][i]}</button>`).join('')}</div><div class="mechanical-scenes" role="group" aria-label="传感器观察场景" hidden><button type="button" data-sensor-scene="mechanism" aria-pressed="true">结构观察</button><button type="button" data-sensor-scene="measurement" aria-pressed="false">测距现场</button></div><button type="button" data-isolate aria-pressed="false">局部观察</button></div><div class="mechanical-viewport"><div class="mechanical-caption"></div><div class="lab-stage-fallback" role="status" hidden></div></div><div class="mechanical-parts" role="group" aria-label="选择观察部件"></div><div class="mechanical-inspector"><strong class="mechanical-part-title"></strong><p class="mechanical-part-description"></p><div class="mechanical-readouts"><dl></dl></div></div>`;
  host.append(wrapper);
  const viewport = wrapper.querySelector<HTMLElement>('.mechanical-viewport')!;
  const fallback = wrapper.querySelector<HTMLElement>('.lab-stage-fallback')!;
  const caption = wrapper.querySelector<HTMLElement>('.mechanical-caption')!;
  const title = wrapper.querySelector<HTMLElement>('.mechanical-part-title')!;
  const description = wrapper.querySelector<HTMLElement>('.mechanical-part-description')!;
  const readouts = wrapper.querySelector<HTMLElement>('.mechanical-readouts dl')!;
  const partsBar = wrapper.querySelector<HTMLElement>('.mechanical-parts')!;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#e9e8e0');
  const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 260);
  const rigs = new Map<SceneSnapshot['kind'], MechanicalRig>();
  function getRig() {
    let rig = rigs.get(snapshot.kind);
    if (!rig) {
      rig = {
        vehicle: createVehicleRig,
        sensor: createSensorRig,
        battery: createBatteryRig,
        evolution: createEvolutionRig,
      }[snapshot.kind]();
      rigs.set(snapshot.kind, rig);
      scene.add(rig.root);
    }
    return rig;
  }
  scene.add(new THREE.HemisphereLight(0xffffff, 0x7d8580, 2.2));
  const key = new THREE.DirectionalLight(0xfff4df, 3.2);
  key.position.set(-3, 10, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -7;
  key.shadow.camera.right = 7;
  key.shadow.camera.top = 7;
  key.shadow.camera.bottom = -7;
  key.shadow.normalBias = 0.035;
  key.shadow.bias = -0.0001;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xe1efff, 1.7);
  fill.position.set(4, 5, -7);
  scene.add(fill);
  const groundGeometry = new THREE.PlaneGeometry(240, 120);
  const groundMaterial = new THREE.MeshStandardMaterial({ color: '#d8dad3', roughness: 0.95 });
  const carGroundMaterial = new THREE.ShadowMaterial({ color: '#38463e', opacity: .18 });
  const ground = new THREE.Mesh<THREE.PlaneGeometry, THREE.Material>(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.12;
  ground.receiveShadow = true;
  scene.add(ground);
  let renderer: THREE.WebGLRenderer | undefined;
  let controls: OrbitControls | undefined;
  let environment: THREE.WebGLRenderTarget | undefined;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    const pmrem = new THREE.PMREMGenerator(renderer),
      room = new RoomEnvironment();
    environment = pmrem.fromScene(room, 0.06);
    scene.environment = environment.texture;
    scene.environmentIntensity = 0.55;
    room.dispose();
    pmrem.dispose();
    const canvas = renderer.domElement;
    canvas.className = 'lab-stage-canvas';
    canvas.setAttribute('aria-label', '机械拆解观察台：可拖动旋转，部件也可通过下方按钮选择');
    canvas.style.touchAction = 'none';
    viewport.prepend(canvas);
    controls = new OrbitControls(camera, canvas);
    controls.minDistance = 1;
    controls.maxDistance = 190;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.addEventListener('start', () => {
      userCamera = true;
    });
    controls.addEventListener('change', draw);
    let pointer: { x: number; y: number } | undefined;
    canvas.addEventListener(
      'pointerdown',
      (e) => {
        pointer = { x: e.clientX, y: e.clientY };
      },
      { signal: abort.signal },
    );
    canvas.addEventListener(
      'pointerup',
      (e) => {
        if (!pointer || Math.hypot(e.clientX - pointer.x, e.clientY - pointer.y) > 5) return;
        pointer = undefined;
        const rect = canvas.getBoundingClientRect(),
          raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(
          new THREE.Vector2(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            (-(e.clientY - rect.top) / rect.height) * 2 + 1,
          ),
          camera,
        );
        const rig = getRig();
        rig.root.updateMatrixWorld(true);
        for (const hit of raycaster.intersectObject(rig.root, true)) {
          let part: string | undefined;
          let obj: THREE.Object3D | null = hit.object,
            visible = true;
          while (obj) {
            if (!obj.visible) visible = false;
            part ??= obj.userData.part as string | undefined;
            obj = obj.parent;
          }
          if (!visible) continue;
          if (part && partsBar.querySelector(`[data-inspect-part="${part}"]`)) {
            inspect(part);
            break;
          }
        }
      },
      { signal: abort.signal },
    );
    canvas.addEventListener(
      'webglcontextlost',
      (event) => {
        event.preventDefault();
        lost = true;
        stop();
        canvas.hidden = true;
        updatePanel();
      },
      { signal: abort.signal },
    );
    canvas.addEventListener(
      'webglcontextrestored',
      () => {
        lost = false;
        canvas.hidden = false;
        updatePanel();
        draw();
      },
      { signal: abort.signal },
    );
  } catch {
    renderer?.dispose();
    renderer = undefined;
    lost = true;
  }
  function partList() {
    const entries =
      snapshot.kind === 'battery'
        ? [['cell', '电池外壳'], ['electrodes', '电极'], ['separator', '隔膜'], ['terminals', '端子'], ['pack', '成组连接']]
        : snapshot.kind === 'evolution'
        ? [
            ['body', '整车外形'],
            ...(['hybrid', 'modern-ev'].includes(snapshot.vehicleEra ?? '') ? [['chassis', '底盘'], ['suspension', '悬架'], ['brake', '制动']] : []),
            ...(snapshot.energy !== 'fuel' ? [['battery', '电池'], ['motor', '电机']] : []),
            ...(snapshot.energy !== 'electric' ? [['engine', '发动机']] : []),
            ['transmission', '传动与车轮'],
            ...(['hybrid', 'modern-ev'].includes(snapshot.vehicleEra ?? '') ? [['computer', '电控'], ['interior', '座舱']] : []),
            ...(snapshot.vehicleEra === 'modern-ev' ? [['sensor', '道路感知']] : []),
          ]
        : snapshot.kind === 'vehicle'
        ? vehicleParts
        : snapshot.sensor === 'camera'
          ? [
              ['optics', '镜组'],
              ['receiver', '成像芯片'],
              ['board', '电路'],
              ['housing', '外壳'],
            ]
          : snapshot.sensor === 'radar'
            ? [
                ['emitter', '天线阵列'],
                ['receiver', '射频电路'],
                ['board', '电路板'],
                ['drive', '屏蔽罩'],
                ['housing', '罩壳'],
              ]
            : [
                ['emitter', '发射'],
                ['receiver', '接收'],
                ['optics', '透镜'],
                ['drive', '驱动'],
                ['board', '电路'],
                ['housing', '外壳'],
              ];
    partsBar.innerHTML = [['overview', '整体'], ...entries]
      .map(
        ([id, name]) =>
          `<button type="button" data-inspect-part="${id}" aria-pressed="${view.selected === id}">${name}</button>`,
      )
      .join('');
  }
  function updatePanel() {
    const isSensor = snapshot.kind === 'sensor';
    wrapper.querySelector<HTMLElement>('.mechanical-scenes')!.hidden = !isSensor;
    wrapper.querySelectorAll<HTMLButtonElement>('[data-view-mode]').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.viewMode === view.mode));
      b.disabled = isSensor && view.sensorScene === 'measurement';
    });
    wrapper
      .querySelectorAll<HTMLButtonElement>('[data-sensor-scene]')
      .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sensorScene === view.sensorScene)));
    wrapper
      .querySelectorAll<HTMLButtonElement>('[data-inspect-part]')
      .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.inspectPart === view.selected)));
    const isolate = wrapper.querySelector<HTMLButtonElement>('[data-isolate]')!;
    isolate.setAttribute('aria-pressed', String(view.isolate));
    isolate.disabled = view.selected === 'overview' || (snapshot.kind === 'evolution' && view.selected === 'body') || (isSensor && view.sensorScene === 'measurement');
    let copy = descriptions[view.selected] ?? descriptions.overview;
    let metrics: [string, string][];
    if (snapshot.kind === 'battery') {
      const info = batteryTypes[snapshot.batteryType ?? 'lead-acid'];
      const parts: Record<string, [string, string]> = {
        overview: [info.name, `${info.form}。${info.use}。`],
        cell: ['电池外壳', '外壳容纳并保护内部材料；不同化学体系也可以采用相似外形。'],
        electrodes: ['两种电极 · 储能材料', info.chemistry + '。'],
        separator: ['隔膜 · 隔开两极', '隔开正负极，避免直接接触；电解质中的离子仍能通过。'],
        terminals: ['端子 · 连接外部电路', `${batteryDirection(snapshot.batteryFlow ?? 'rest')}。箭头表示能量传递方向。`],
        pack: ['成组连接 · 从单体到电池组', '多个单体按用途组合；电池组还需要匹配的连接、保护与管理。'],
      };
      copy = parts[view.selected] ?? parts.overview;
      metrics = [['状态', {rest: '断开电路', charge: '充电补能', discharge: '向外供电'}[snapshot.batteryFlow ?? 'rest']], ['结构', '教学样例']];
      caption.textContent = '结构与能量方向示意 · 外形不唯一，不计算续航';
    } else if (snapshot.kind === 'evolution') {
      const era = evolutionEras.find(e => e.id === snapshot.vehicleEra) ?? evolutionEras[0];
      const overview = {
        pioneer: '三轮车架与燃油发动机结合，自身动力驱动车轮。',
        'early-electric': '电池与电机驱动车厢，重量与补能仍需权衡。',
        hybrid: '发动机与电机协作，动力分配依具体系统而定。',
        'modern-ev': '电池供能，感知仍需计算与执行协作。',
      }[era.id];
      const parts: Record<string, [string, string]> = {
        overview: [era.label, overview],
        body: ['整车外形 · 承载与乘坐', '从开放车架到封闭车厢，观察车轮、车身、座舱与转向位置。'],
        chassis: ['承载底盘 · 纵梁与横梁', '两侧纵梁和多根横梁连接车轮与车身；橙色线束输送电能，深色管路帮助冷却。'],
        suspension: ['悬架 · 连杆与弹簧减振器', '观察车轮怎样通过连杆连接到底盘；弹簧承受载荷，减振器帮助减小反复振动。'],
        brake: ['制动 · 制动盘与固定卡钳', '轮毂和制动盘一起转，卡钳固定在支架上；摩擦片夹紧盘面时产生制动力。'],
        computer: ['电控 · 电路与功率模块', '散热盖下是控制电路与功率模块，调节送往驱动电机的电能。'],
        interior: ['座舱 · 座椅与转向', '座椅安装在底盘上的导轨上；方向盘通过转向机构帮助改变车轮方向。'],
        battery: ['车载电池 · 储存能量', '电池向电机供能；不同车辆的电池尺寸、材料和安装方式不同。'],
        engine: ['燃油发动机 · 产生动力', '燃烧燃料，将化学能转为机械运动，再经过传动驱动车轮。'],
        motor: ['电机 · 将电能转为运动', '电机接受电能产生转动，仍需要传动将运动送到车轮。'],
        transmission: ['传动与车轮', snapshot.transmission === false ? '传动断开，电机可转而车轮失去驱动。教学模型忽略惯性与滑行。' : '动力通过传动到达车轮；此页比较功能关系，不计算真实车速。'],
        sensor: ['道路感知 · 新的信息来源', '传感器提供道路信息，仍需计算、决策与执行协作。'],
      };
      copy = parts[view.selected] ?? parts.overview;
      const p = driveMechanism(snapshot, elapsed);
      metrics = snapshot.energy === 'electric' ? [['供能', snapshot.power === false ? '断开' : '接通'], ['车轮', p.outputActive ? '演示转动' : '静止']] : [['动力', snapshot.energy === 'hybrid' ? '燃油＋电力' : '燃油'], ['展示', '定性路径']];
      caption.textContent = '时代特征教学模型 · 非原厂车型与性能仿真';
    } else if (isSensor) {
      const mode = snapshot.sensor ?? 'lidar',
        r = sensorRay(snapshot);
      if (view.selected === 'overview')
        copy = [
          {
            lidar: '激光雷达 · 单光束原理机',
            camera: '摄像头 · 镜组与成像',
            radar: '毫米波雷达 · 天线与电路',
          }[mode],
          {
            lidar: '观察发射、接收、光学与驱动；再到测距现场验证回波。',
            camera: '镜片引导可见光到成像芯片，获得图像、颜色与纹理。',
            radar: '天线发射和接收电磁波；这里演示结构，不模拟测速。',
          }[mode],
        ];
      if (mode === 'camera' && view.selected === 'receiver')
        copy = ['成像芯片 · 接收光线', '镜组把光线引向芯片，芯片将光转换成图像信号。'];
      if (mode === 'radar') {
        if (view.selected === 'emitter')
          copy = ['天线阵列 · 收发电磁波', '铜色贴片构成教学阵列；不是光学透镜，也不读取灯色。'];
        if (view.selected === 'receiver')
          copy = ['射频处理 · 收发电路', '处理天线的电磁信号；本页不模拟测速或探测精度。'];
        if (view.selected === 'drive')
          copy = ['金属屏蔽罩', '毫米波雷达没有本模型激光雷达的旋转驱动，金属罩用于屏蔽。'];
      }
      if (view.sensorScene === 'measurement')
        copy = [
          '首个表面回波',
          {
            available: '光束遇到目标前表面，回波距离沿光束路径计算。',
            occluded: '先收到 8 米处遮挡物回波，无法据此看到后方。',
            miss: '本束没有命中目标；没有读数不等于道路清空。',
            unknown: '浓雾样例中信号不足，前方状态未知。',
          }[r.status],
        ];
      metrics =
        view.sensorScene === 'mechanism'
          ? mode === 'camera'
            ? [
                ['信息', '图像 / 颜色'],
                ['镜组', '5 片示意'],
              ]
            : mode === 'radar'
              ? [
                  ['信息', '距离 / 相对运动'],
                  ['测速', '此页未模拟'],
                ]
              : [
                  ['光路', '发射 → 接收'],
                  ['结构', '放大示意'],
                ]
          : mode === 'camera'
            ? [
                ['信息', '图像 / 颜色'],
                ['测距', '此页未模拟'],
              ]
            : [
                ['首表面距离', r.distance === null ? '未知' : `${r.distance.toFixed(2)} m`],
                ['往返时间', r.timeNs === null ? '未知' : `${r.timeNs.toFixed(1)} ns`],
              ];
      caption.textContent =
        view.sensorScene === 'mechanism'
          ? '放大结构示意 · 非真实型号与尺寸'
          : '米制测距现场 · 光传播慢放示意';
    } else {
      const p = driveMechanism(snapshot, elapsed),
        flow = chainFlow(snapshot);
      if (view.selected === 'transmission' && snapshot.transmission === false) {
        copy = ['减速机构 · 传动已断开', '输入齿轮轴向移开，仍随电机转动；输出齿轮和车轮停止。'];
      }
      metrics =
        view.selected === 'transmission'
          ? [
              ['齿数', '18 / 54'],
              ['减速比', '3 : 1'],
              ['输出', p.outputActive ? '反向转动' : '停止'],
            ]
          : flow.visible
            ? [
                ['输入', flow.input ? '有证据' : '无证据'],
                ['命令', flow.command ? '已发出' : '未发出'],
                ['执行', flow.action ? '有反馈' : '无反馈'],
              ]
            : [
                ['电机', p.motorActive ? '转动' : '停止'],
                ['输出轴', p.outputActive ? '转动' : '停止'],
              ];
      caption.textContent =
        snapshot.energy && snapshot.energy !== 'electric'
          ? '电驱结构示意 · 当前能源仅作路径比较'
          : '教学电驱机构 · 尺寸示意，运动慢放';
      if (snapshot.energy && snapshot.energy !== 'electric') {
        metrics = [
          ['能源方案', snapshot.energy === 'fuel' ? '燃油' : '混合动力'],
          ['机械运行', '此台未模拟'],
        ];
      }
    }
    title.textContent = copy[0];
    description.textContent = copy[1];
    readouts.replaceChildren(
      ...metrics.map(([name, value]) => {
        const row = document.createElement('div'),
          dt = document.createElement('dt'),
          dd = document.createElement('dd');
        dt.textContent = name;
        dd.textContent = value;
        row.append(dt, dd);
        return row;
      }),
    );
    fallback.hidden = !lost;
    if (lost)
      fallback.textContent = `二维备用视图：${copy[0]}。${copy[1]} ${metrics.map(([k, v]) => `${k}：${v}`).join('；')}。所有学习操作和证据记录仍可使用。`;
  }
  function draw() {
    if (!initialized || disposed || !active || !renderer || lost) return;
    const rig = getRig();
    for (const candidate of rigs.values()) candidate.root.visible = candidate === rig;
    rig.update(presentationSnapshot(), elapsed, view);
    ground.material = snapshot.kind === 'evolution' ? carGroundMaterial : groundMaterial;
    ground.position.y = snapshot.kind === 'evolution' ? (['hybrid', 'modern-ev'].includes(snapshot.vehicleEra ?? '') ? -.08 : -.1) : -.12;
    scene.fog =
      snapshot.kind === 'sensor' && view.sensorScene === 'measurement' && snapshot.weather === 'fog'
        ? new THREE.Fog('#e9e8e0', 5, 28)
        : null;
    renderer.render(scene, camera);
  }
  function resetCamera() {
    if (!initialized) return;
    userCamera = false;
    const rig = getRig();
    rig.update(presentationSnapshot(), elapsed, view);
    const pose = rig.camera(view, snapshot);
    camera.position.set(...pose.position);
    camera.zoom =
      snapshot.kind === 'vehicle'
        ? view.isolate
          ? 1.05
          : 1.25
        : view.sensorScene === 'measurement'
          ? 0.85
          : 1.15;
    camera.updateProjectionMatrix();
    const target = new THREE.Vector3(...pose.target);
    {
      rig.root.updateMatrixWorld(true);
      const bounds = new THREE.Box3();
      const componentBounds: THREE.Box3[] = [];
      if (snapshot.kind === 'sensor' && view.sensorScene === 'measurement') {
        bounds.set(new THREE.Vector3(-0.5, 0, -2), new THREE.Vector3((snapshot.distance ?? 16) + 0.5, 3, 2));
        componentBounds.push(bounds.clone());
      } else {
        rig.root.traverseVisible((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          for (let parent: THREE.Object3D | null = object; parent; parent = parent.parent)
            if (parent.userData.excludeFromFit) return;
          let local: THREE.Box3 | null;
          if (object instanceof THREE.InstancedMesh) {
            object.computeBoundingBox();
            local = object.boundingBox;
          } else {
            object.geometry.computeBoundingBox();
            local = object.geometry.boundingBox;
          }
          if (local) {
            const world = local.clone().applyMatrix4(object.matrixWorld);
            bounds.union(world);
            componentBounds.push(world);
          }
        });
      }
      if (!bounds.isEmpty()) {
        const direction = camera.position.clone().sub(target).normalize();
        target.copy(bounds.getCenter(new THREE.Vector3()));
        const right = new THREE.Vector3().crossVectors(camera.up, direction).normalize();
        const up = new THREE.Vector3().crossVectors(direction, right).normalize();
        const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / camera.zoom;
        const tanH = tanV * camera.aspect;
        const fitFill = snapshot.kind === 'evolution' && !view.isolate ? 0.92 : 0.84;
        let distance = 0;
        for (const component of componentBounds)
          for (const x of [component.min.x, component.max.x])
            for (const y of [component.min.y, component.max.y])
              for (const z of [component.min.z, component.max.z]) {
                const point = new THREE.Vector3(x, y, z).sub(target);
                distance = Math.max(
                  distance,
                  point.dot(direction) +
                    Math.max(Math.abs(point.dot(right)) / tanH, Math.abs(point.dot(up)) / tanV) / fitFill,
                );
              }
        camera.position.copy(target).addScaledVector(direction, distance);
      }
    }
    if (controls) {
      controls.target.copy(target);
      controls.update();
    } else camera.lookAt(target);
    draw();
  }
  function resize() {
    if (disposed || !renderer) return;
    const rect = viewport.getBoundingClientRect(),
      width = Math.max(1, rect.width),
      height = Math.max(1, rect.height);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (!userCamera) resetCamera();
    else draw();
  }
  function stop() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
    playing = false;
  }
  function tick(now: number) {
    frame = 0;
    if (!playing || disposed || !active || lost) return;
    elapsed += last ? Math.min((now - last) / 1000, 0.05) : 0;
    last = now;
    if (elapsed >= 3) {
      elapsed = 3;
      playing = false;
    }
    draw();
    if (playing) frame = requestAnimationFrame(tick);
  }
  function replay() {
    stop();
    elapsed = reduced.matches ? 3 : 0;
    updatePanel();
    draw();
    if (active && !lost && !reduced.matches) {
      playing = true;
      frame = requestAnimationFrame(tick);
    }
  }
  function presentationSnapshot(): SceneSnapshot {
    return { ...snapshot, exploded: view.mode === 'exploded', cutaway: view.mode === 'section' };
  }
  function presentationChanged() {
    onPresentation?.({ exploded: view.mode === 'exploded', cutaway: view.mode === 'section' });
  }
  function inspect(part: string) {
    view.selected = part;
    view.isolate = part !== 'overview';
    if ((snapshot.kind === 'evolution' && part === 'body') || (snapshot.kind === 'battery' && part === 'cell')) {
      view.mode = 'assembly';
      if (part === 'body') view.isolate = false;
    } else if (part !== 'overview' && view.mode === 'assembly') view.mode = 'section';
    if (snapshot.kind === 'sensor' && part !== 'overview') view.sensorScene = 'mechanism';
    if (snapshot.kind !== 'sensor') onInspect?.(part === 'computer' ? 'compute' : part);
    presentationChanged();
    updatePanel();
    resetCamera();
  }
  wrapper.addEventListener(
    'click',
    (event) => {
      const b = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button') : null;
      if (!b || b.disabled) return;
      if (b.dataset.inspectPart) {
        inspect(b.dataset.inspectPart);
        return;
      }
      if (b.dataset.viewMode) view.mode = b.dataset.viewMode as MechanicalMode;
      if (b.dataset.sensorScene) {
        view.sensorScene = b.dataset.sensorScene as MechanicalView['sensorScene'];
        view.isolate = false;
      }
      if (b.hasAttribute('data-isolate')) view.isolate = !view.isolate;
      presentationChanged();
      updatePanel();
      resetCamera();
    },
    { signal: abort.signal },
  );
  const observer = new ResizeObserver(resize);
  observer.observe(viewport);
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden) stop();
    },
    { signal: abort.signal },
  );
  partList();
  updatePanel();
  resetCamera();
  resize();
  return {
    getPresentation() {
      return { exploded: view.mode === 'exploded', cutaway: view.mode === 'section' };
    },
    setSnapshot(s: SceneSnapshot) {
      const kindChanged = snapshot.kind !== s.kind,
        deviceChanged = snapshot.sensor !== s.sensor;
      const subjectChanged = snapshot.batteryType !== s.batteryType || snapshot.vehicleEra !== s.vehicleEra;
      const started = s.running && !snapshot.running;
      const selectedChanged = snapshot.selected !== s.selected;
      const flagsChanged = snapshot.cutaway !== s.cutaway || snapshot.exploded !== s.exploded;
      const distanceChanged = snapshot.distance !== s.distance,
        first = !initialized;
      stop();
      elapsed = 0;
      if (first || kindChanged || subjectChanged) {
        view.selected = 'overview';
        view.isolate = false;
        view.sensorScene =
          s.kind === 'sensor' && s.sensorView === 'measurement' ? 'measurement' : 'mechanism';
      }
      if (first || kindChanged) view.mode = s.exploded ? 'exploded' : s.cutaway ? 'section' : s.kind === 'evolution' ? 'assembly' : 'section';
      else if (flagsChanged) view.mode = s.exploded ? 'exploded' : s.cutaway ? 'section' : 'assembly';
      if (!first && !kindChanged && selectedChanged && s.selected && s.kind === 'vehicle') {
        view.selected = s.selected === 'compute' ? 'computer' : s.selected;
        view.isolate = true;
      }
      if (deviceChanged && !first) {
        view.selected = 'overview';
        view.isolate = false;
      }
      snapshot = { ...s };
      initialized = true;
      if (first || kindChanged || deviceChanged || subjectChanged) partList();
      wrapper.dataset.subject = snapshot.kind;
      updatePanel();
      if (
        first ||
        kindChanged ||
        deviceChanged ||
        subjectChanged ||
        selectedChanged ||
        flagsChanged ||
        (distanceChanged && !userCamera)
      )
        resetCamera();
      else draw();
      if (started || (s.kind === 'evolution' && s.running)) replay();
    },
    replay,
    resetCamera,
    setActive(value: boolean) {
      active = value;
      if (!value) stop();
      else draw();
    },
    setQuality(value: boolean) {
      if (!renderer) return;
      renderer.setPixelRatio(Math.min(devicePixelRatio, value ? 1 : 1.5));
      renderer.shadowMap.enabled = !value;
      resize();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      stop();
      abort.abort();
      observer.disconnect();
      controls?.dispose();
      for (const rig of rigs.values()) rig.dispose();
      rigs.clear();
      environment?.dispose();
      groundGeometry.dispose();
      groundMaterial.dispose();
      carGroundMaterial.dispose();
      renderer?.dispose();
      wrapper.remove();
    },
  };
}
