import { createScanScene } from './scan-scene';
import { createScene } from './scene';
import { loadDae } from './model';
import { partById, lessonSteps, type LidarMode } from './data';
import { createExperimentState, reduceExperiment, type ExperimentAction } from './experiment-state';
import { roundTripNanoseconds } from './measurement';
import { bindLidarInteraction } from './interaction';
import { createModelRig } from './model-rig';
import { createScanAnimation } from './scan-animation';
import { createScope, createAnimationLoop } from '../../shared/lifecycle';
import { disposeObject } from '../../shared/three-resources';
import type { ChapterController } from '../../app/types';
import { watchWebglContext, reportChapterError } from '../../shared/webgl';
export type LidarExplorerController = (() => void) &
  ChapterController & {
    setMode?: (mode: LidarMode) => void;
    setScan?: (active: boolean) => void;
    selectPart?: (id: string) => void;
  };

export function mount(host: HTMLElement): LidarExplorerController {
  const scope = createScope();
  try {
    return createController(host, scope);
  } catch (error) {
    scope.dispose();
    throw error;
  }
}

function createController(host: HTMLElement, scope: ReturnType<typeof createScope>): LidarExplorerController {
  const stage = host.querySelector<HTMLElement>('.lidar-stage') ?? host;
  const canvas = stage.querySelector<HTMLCanvasElement>('[data-lidar-canvas]');
  if (!canvas) throw new Error('激光雷达展厅缺少画布');
  const scene = createScene(canvas, scope);
  const { camera, renderer, controls } = scene;
  watchWebglContext(canvas, scope, host);
  const rig = createModelRig({ ...scene, getStageWidth: () => stage.clientWidth }, scope);
  const scanObjects = createScanScene(scene.scanGroup);
  const scanAnimation = createScanAnimation({ scanGroup: scene.scanGroup, ...rig.scanParts }, scanObjects);
  let state = createExperimentState();
  let loadVersion = 0;
  let disposed = false;
  let assetStatus: 'loading' | 'ready' | 'degraded' = 'loading';
  const statusElement = host.querySelector<HTMLElement>('[data-lidar-status]');
  const partNameElement = host.querySelector<HTMLElement>('[data-lidar-part-name]');
  const partCopyElement = host.querySelector<HTMLElement>('[data-lidar-part-copy]');
  const partFactElement = host.querySelector<HTMLElement>('[data-lidar-part-fact]');
  const rangeElement = host.querySelector<HTMLElement>('[data-lidar-range]');
  const pointElement = host.querySelector<HTMLElement>('[data-lidar-points]');
  const modeElement = host.querySelector<HTMLElement>('[data-lidar-mode-label]');
  const timeElements = [...host.querySelectorAll<HTMLElement>('[data-lidar-time]')];
  const distanceSlider = host.querySelector<HTMLInputElement>('[data-lidar-distance]');
  const distanceValueElement = host.querySelector<HTMLElement>('[data-lidar-distance-value]');
  const scanLabelElement = host.querySelector<HTMLElement>('[data-lidar-scan-label]');
  const scanHudElement = host.querySelector<HTMLElement>('[data-lidar-scan-hud]');
  const lessonButtons = [...host.querySelectorAll<HTMLElement>('[data-lidar-step]')];
  const scanToggleButtons = [...host.querySelectorAll<HTMLElement>('[data-lidar-scan-toggle]')];
  const scanTabButtons = [
    ...host.querySelectorAll<HTMLElement>('[data-lidar-view="scan"], [data-lidar-view="sensor"]'),
  ];
  const modeButtons = [...host.querySelectorAll<HTMLElement>('[data-lidar-mode]')];
  state = reduceExperiment(state, {
    type: 'distance',
    meters: Number(distanceSlider?.value || state.distanceMeters),
  });

  const setText = (element: HTMLElement | null, value: string) => {
    if (element) element.textContent = value;
  };
  const setStatus = (value: string) => {
    const prefix =
      assetStatus === 'degraded'
        ? '模型载入失败，仍可查看概念扫描演示 · '
        : assetStatus === 'loading'
          ? '模型正在载入 · '
          : '';
    setText(statusElement, `${prefix}${value}`);
  };
  const updateMeasurement = () => {
    setText(rangeElement, `${state.distanceMeters.toFixed(1)} m`);
    setText(pointElement, state.scanActive && state.stepIndex === 3 ? '720 pts / 示意' : '—');
    const roundTripNs = roundTripNanoseconds(state.distanceMeters);
    timeElements.forEach((element) => setText(element, `约 ${roundTripNs.toFixed(1)} ns`));
    setText(distanceValueElement, `${state.distanceMeters.toFixed(0)} m`);
    setText(
      scanHudElement?.querySelector<HTMLElement>('[data-lidar-target-distance]') ?? null,
      `模拟目标 ${state.distanceMeters.toFixed(0)} m`,
    );
  };
  const announcePart = () => {
    const part = state.selectedPartId ? partById.get(state.selectedPartId) : undefined;
    setText(partNameElement, part?.name ?? '选择一个部件');
    setText(partCopyElement, part?.copy ?? '点击模型上的高亮标记，认识激光雷达的组成。');
    setText(partFactElement, part?.fact ?? '交互说明：旋转、缩放并点击标记');
    host.dispatchEvent(new CustomEvent('lidar:part-select', { detail: part ?? null }));
  };
  const syncLessonUI = () => {
    lessonButtons.forEach((button) => {
      const active = Number(button.dataset.lidarStep) === state.stepIndex;
      button.setAttribute('aria-pressed', String(active));
      button.classList.toggle('is-active', active);
    });
    setText(host.querySelector<HTMLElement>('[data-lidar-step-copy]'), lessonSteps[state.stepIndex].copy);
  };
  const showLessonStatus = () =>
    setStatus(`原理 ${String(state.stepIndex + 1).padStart(2, '0')} / ${lessonSteps[state.stepIndex].title}`);
  const showScanStatus = () =>
    setStatus(`扫描演示：${lessonSteps[state.stepIndex].title} · 目标 ${state.distanceMeters.toFixed(0)} 米`);
  const showMode = () => {
    modeButtons.forEach((button) => {
      const active = button.dataset.lidarMode === state.mode;
      button.setAttribute('aria-pressed', String(active));
      button.classList.toggle('is-active', active);
    });
    setText(
      modeElement,
      state.mode === 'assembly' ? '装配视图' : state.mode === 'exploded' ? '内部零件拆解' : '原理透明剖视',
    );
    setStatus(
      state.mode === 'assembly'
        ? '装配模型已就绪'
        : state.mode === 'exploded'
          ? '内部原理零件已展开'
          : '外壳半透明 · 原理结构可见',
    );
    host.dispatchEvent(new CustomEvent('lidar:mode-change', { detail: { mode: state.mode } }));
  };
  const showScan = () => {
    const active = state.scanActive;
    scanToggleButtons.forEach((button) => button.setAttribute('aria-pressed', String(active)));
    scanTabButtons.forEach((button) => {
      const selected = (button.dataset.lidarView === 'scan') === active;
      button.setAttribute('aria-selected', String(selected));
      button.classList.toggle('is-active', selected);
    });
    setText(scanLabelElement, active ? '停止扫描演示' : '开始扫描演示');
    scanHudElement?.setAttribute('aria-hidden', String(!active));
    scanHudElement?.classList.toggle('is-visible', active);
    if (active) showScanStatus();
    else setStatus(state.mode === 'assembly' ? '装配模型已就绪' : '结构视图已就绪');
    host.dispatchEvent(new CustomEvent('lidar:scan-change', { detail: { active } }));
  };
  const dispatch = (action: ExperimentAction) => {
    if (disposed) return;
    const previous = state;
    state = reduceExperiment(state, action);
    switch (action.type) {
      case 'mode':
        rig.apply(state);
        showMode();
        break;
      case 'scan':
        if (state.scanActive && !previous.scanActive) {
          syncLessonUI();
          announcePart();
        }
        showScan();
        break;
      case 'step':
        showScan();
        syncLessonUI();
        announcePart();
        showLessonStatus();
        break;
      case 'select-part':
        if (action.id === null || partById.has(action.id)) announcePart();
        break;
      case 'reset':
        rig.apply(state);
        showMode();
        showScan();
        syncLessonUI();
        showLessonStatus();
        announcePart();
        rig.resetCamera();
        break;
      case 'distance':
        if (state.scanActive) showScanStatus();
        break;
      case 'tick':
        if (state.stepIndex !== previous.stepIndex) {
          syncLessonUI();
          announcePart();
          showLessonStatus();
        }
        if (state.scanActive) updateMeasurement();
        return;
    }
    if (
      action.type === 'scan' ||
      action.type === 'step' ||
      action.type === 'distance' ||
      action.type === 'reset'
    ) {
      updateMeasurement();
      scanAnimation.update(state, 0);
      setText(
        scanHudElement?.querySelector<HTMLElement>('[data-lidar-target-distance]') ?? null,
        `${state.distanceMeters.toFixed(0)} m 模拟目标`,
      );
    }
  };
  bindLidarInteraction(
    host,
    {
      camera,
      getState: () => state,
      pickCandidates: (current) => rig.pickCandidates(current),
      onEcho: () => {
        setStatus('已选中一处模拟回波');
        updateMeasurement();
      },
    },
    dispatch,
    scope,
  );
  const resize = () => {
    const width = stage.clientWidth || 1;
    const height = stage.clientHeight || 1;
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 760 ? 1.35 : 1.8));
    renderer.setSize(width, height, false);
  };
  const resizeObserver = new ResizeObserver(resize);
  scope.add(() => resizeObserver.disconnect());
  resizeObserver.observe(stage);
  resize();

  const load = async () => {
    const thisLoad = ++loadVersion;
    setStatus('正在载入激光雷达模型');
    try {
      const licensedParts = await Promise.allSettled([
        loadDae('/assets/lidar/VLP16_base_1.dae', scope.signal),
        loadDae('/assets/lidar/VLP16_base_2.dae', scope.signal),
        loadDae('/assets/lidar/VLP16_scan.dae', scope.signal),
      ]);
      const successes = licensedParts.filter((part) => part.status === 'fulfilled');
      if (disposed || thisLoad !== loadVersion || successes.length !== licensedParts.length) {
        successes.forEach((part) => disposeObject(part.value));
        if (disposed || thisLoad !== loadVersion) return;
        throw new Error('LiDAR 部分模型资源加载失败');
      }
      rig.installLicensedParts(successes.map((part) => part.value));
      rig.apply(state);
      assetStatus = 'ready';
    } catch {
      if (disposed || thisLoad !== loadVersion) return;
      assetStatus = 'degraded';
    }
    if (disposed || thisLoad !== loadVersion) return;
    host.dataset.assetStatus = assetStatus;
    if (assetStatus === 'degraded') rig.apply(state);
    showMode();
  };
  void load();

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    ++loadVersion;
    scope.dispose();
  };
  const controller = dispose as LidarExplorerController;
  controller.setMode = (mode) => dispatch({ type: 'mode', mode });
  controller.setScan = (active) => dispatch({ type: 'scan', active });
  controller.selectPart = (id) => dispatch({ type: 'select-part', id });
  const loop = createAnimationLoop(
    renderer,
    (delta) => {
      if (disposed) return;
      controls.update();
      dispatch({ type: 'tick', deltaSeconds: delta });
      scanAnimation.update(state, delta);
      rig.update(state, delta);
      renderer.render(scene.scene, camera);
    },
    (error) => reportChapterError(host, error),
  );
  scope.add(() => loop.dispose());

  rig.apply(state);
  scanAnimation.update(state, 0);
  showMode();
  announcePart();
  updateMeasurement();
  controller.dispose = dispose;
  controller.setActive = (active) => {
    if (active) resize();
    loop.setActive(active);
  };
  return controller;
}
