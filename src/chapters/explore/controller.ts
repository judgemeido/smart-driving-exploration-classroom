import { categoryForObject, isVehicleLightObject, isCabinBackgroundObject } from './focus';
import { renderDisassemblyPanel } from './mission';
import { createMissionState, reduceMission } from './mission-state';
import { createVehicleRig } from './vehicle-rig';
import { createPowerflowScene } from './powerflow-scene';
import { createPowerflowState, reducePowerflow, powerflowDurationSeconds } from './powerflow-state';
import * as THREE from 'three';
import { createScene } from './scene';
import {
  focusCopy,
  assemblyInfo,
  partCategoryLabels,
  humanizeNodeName,
  disassemblyTasks,
  powerflowStages,
  type FocusKey,
  type PartCategory,
} from './data';
import { createScope, createPausableTimer, createAnimationLoop } from '../../shared/lifecycle';
import { loadGltf } from '../../shared/gltf';
import { disposeObject } from '../../shared/three-resources';
import type { ChapterController } from '../../app/types';
import { watchWebglContext, reportChapterError } from '../../shared/webgl';
import { evaluateChoice } from '../../shared/learning-assessment';
import { exploreReviewQuestions } from './learning-data';
import { renderExploreReview, renderExploreAssembly } from './learning-view';
import { createAssemblyReturnState, reduceAssemblyReturn, stepAssemblyReturn } from './assembly-state';
import {
  captureCameraObservation,
  restoreCameraObservation,
  type CameraObservation,
} from './camera-observation';
export function mount(host: HTMLElement): ChapterController {
  const scope = createScope();
  try {
    return createController(host, scope);
  } catch (error) {
    scope.dispose();
    throw error;
  }
}
function createController(host: HTMLElement, scope: ReturnType<typeof createScope>): ChapterController {
  let exploreActive = false;
  const rotationTimer = createPausableTimer();
  const canvas = host.querySelector<HTMLCanvasElement>('#model-canvas');
  const viewer = host.querySelector<HTMLElement>('[data-model-viewer]');
  if (!canvas || !viewer) throw new Error('结构展厅缺少模型画布');

  const sceneState = createScene(canvas, scope);
  const { scene, renderer, updateRendererPixelRatio, camera, controls } = sceneState;
  const vehicleRig = createVehicleRig(sceneState, scope);
  const powerflowScene = createPowerflowScene(sceneState, scope);
  watchWebglContext(canvas, scope, host);

  const loading = host.querySelector<HTMLElement>('[data-model-loading]');
  const loadingLabel = host.querySelector<HTMLElement>('[data-model-loading-label]');
  const loadingPercent = host.querySelector<HTMLElement>('[data-model-loading-percent]');
  const loadingBar = host.querySelector<HTMLElement>('[data-model-loading-bar]');
  const modelStatus = host.querySelector<HTMLElement>('[data-model-status]');
  const powerflowStory = host.querySelector<HTMLElement>('[data-powerflow-story]');
  const powerflowReplay = host.querySelector<HTMLButtonElement>('[data-powerflow-replay]');
  const powerflowStep = host.querySelector<HTMLElement>('[data-powerflow-step]');
  const powerflowTime = host.querySelector<HTMLElement>('[data-powerflow-time]');
  const powerflowTitle = host.querySelector<HTMLElement>('[data-powerflow-title]');
  const powerflowCopy = host.querySelector<HTMLElement>('[data-powerflow-copy]');
  const powerflowProgress = host.querySelector<HTMLElement>('[data-powerflow-progress]');
  const adasOverlay = host.querySelector<HTMLElement>('[data-adas-overlay]');
  let modelRoot: THREE.Object3D | null = null;
  let activeFocus: FocusKey = 'all';
  const focusMaterials = new Set<THREE.Material>();
  const { materialCache, visibilityCache } = vehicleRig;
  const homeCameraPosition = new THREE.Vector3();
  const homeCameraTarget = new THREE.Vector3();
  const homeMinDistance = controls.minDistance;
  const homeMaxDistance = controls.maxDistance;
  let cameraMinDistance = homeMinDistance;
  let cameraMaxDistance = homeMaxDistance;
  const roadGroundY = -0.94;
  const cameraGroundClearance = 0.12;
  const minimumOrbitAngle = 0.05;
  const explodedMaximumOrbitAngle = Math.PI - 0.05;
  const updateCameraLimits = (allowUnderbodyOrbit: boolean) => {
    controls.minDistance = cameraMinDistance;
    controls.maxDistance = cameraMaxDistance;
    const safeCameraY = roadGroundY + cameraGroundClearance;
    const requiredDistance = safeCameraY - controls.target.y;
    if (requiredDistance > 0) {
      controls.minDistance = Math.max(controls.minDistance, requiredDistance + cameraGroundClearance);
    }
    controls.maxDistance = Math.max(controls.maxDistance, controls.minDistance);

    if (allowUnderbodyOrbit) {
      controls.maxPolarAngle = explodedMaximumOrbitAngle;
      controls.screenSpacePanning = true;
      controls.update();
      return;
    }

    // Below the horizon, the farthest zoom puts the camera lowest; above it,
    // the nearest zoom does. Bound the orbit against that worst-case radius.
    const limitingDistance = requiredDistance < 0 ? controls.maxDistance : controls.minDistance;
    const cosineLimit = requiredDistance / limitingDistance;
    controls.minPolarAngle = minimumOrbitAngle;
    controls.maxPolarAngle = Math.max(
      minimumOrbitAngle,
      Math.acos(THREE.MathUtils.clamp(cosineLimit, -1, 1)),
    );
    controls.screenSpacePanning = false;
    controls.update();
  };
  let powerflowState = createPowerflowState();
  let activePartCategory: PartCategory = 'all';
  const explosionRaycaster = new THREE.Raycaster();
  const explosionPointer = new THREE.Vector2();
  const pointerDownPosition = new THREE.Vector2();
  const selectionMaterialCache = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  let selectedPartMesh: THREE.Mesh | null = null;

  let missionState = createMissionState();
  let assemblyState = createAssemblyReturnState();
  let assemblyOpen = false;
  let reviewOpen = false;
  const reviewAnswers: Record<string, string> = {};
  let savedObservation: {
    focus: FocusKey;
    category: PartCategory;
    exploded: boolean;
    autoRotate: boolean;
    camera: CameraObservation;
    cameraMinDistance: number;
    cameraMaxDistance: number;
  } | null = null;

  const updateDisassemblyPanel = () => {
    renderDisassemblyPanel(host, missionState);
    const reviewButton = host.querySelector<HTMLButtonElement>('[data-explore-review-open]');
    if (reviewButton) reviewButton.hidden = missionState.index < disassemblyTasks.length;
  };
  const closePowerflowStory = () => {
    powerflowScene.update(powerflowState, activeFocus);
    adasOverlay?.classList.toggle('is-visible', activeFocus === 'adas');
    adasOverlay?.setAttribute('aria-hidden', String(activeFocus !== 'adas'));
    if (modelStatus) modelStatus.textContent = activeFocus === 'adas' ? 'SENSORS / SCANNING' : 'LIVE / READY';
    powerflowStory?.classList.remove('is-active');
    powerflowStory?.setAttribute('aria-hidden', 'true');
    powerflowReplay?.classList.toggle('is-visible', powerflowState.played);
    powerflowReplay?.setAttribute('aria-hidden', String(!powerflowState.played));
    viewer.classList.remove('is-powerflow-playing');
  };

  const finishPowerflow = (action: 'skip' | 'deactivate' = 'skip') => {
    if (!powerflowState.playing) return;
    powerflowState = reducePowerflow(powerflowState, { type: action }, powerflowStages);
    closePowerflowStory();
  };

  const startPowerflow = (replay = false) => {
    if (!modelRoot || !powerflowScene.group) return;
    const next = reducePowerflow(powerflowState, { type: replay ? 'replay' : 'start' }, powerflowStages);
    if (next === powerflowState) return;
    powerflowState = next;
    powerflowScene.update(powerflowState, activeFocus);
    adasOverlay?.classList.remove('is-visible');
    adasOverlay?.setAttribute('aria-hidden', 'true');
    if (modelStatus) modelStatus.textContent = 'POWERTRAIN / ACTIVE';
    powerflowStory?.classList.add('is-active');
    powerflowStory?.setAttribute('aria-hidden', 'false');
    powerflowReplay?.classList.remove('is-visible');
    powerflowReplay?.setAttribute('aria-hidden', 'true');
    viewer.classList.add('is-powerflow-playing');
  };

  const updatePowerflow = (deltaSeconds: number) => {
    if (!powerflowState.playing) return;
    const previousStage = powerflowState.stageIndex;
    powerflowState = reducePowerflow(powerflowState, { type: 'tick', deltaSeconds }, powerflowStages);
    const { stageIndex, elapsedSeconds } = powerflowState;
    if (stageIndex !== previousStage) {
      const stage = powerflowStages[stageIndex];
      if (powerflowStep) powerflowStep.textContent = stage.step;
      if (powerflowTitle) powerflowTitle.textContent = stage.title;
      if (powerflowCopy) powerflowCopy.textContent = stage.copy;
    }
    if (powerflowTime) powerflowTime.textContent = `${elapsedSeconds.toFixed(1).padStart(4, '0')} / 05.0 SEC`;
    if (powerflowProgress)
      powerflowProgress.style.transform = `scaleX(${elapsedSeconds / powerflowDurationSeconds})`;
    powerflowScene.update(powerflowState, activeFocus);
    if (powerflowScene.sensorWaveGroup?.visible && powerflowState.playing) {
      adasOverlay?.classList.add('is-visible');
      adasOverlay?.setAttribute('aria-hidden', 'false');
      if (modelStatus) modelStatus.textContent = 'SENSORS / SCANNING';
    }
    if (!powerflowState.playing) closePowerflowStory();
  };

  const updateLoading = (value: number, label?: string) => {
    const progress = Math.max(0, Math.min(100, Math.round(value)));
    if (loadingPercent) loadingPercent.textContent = `${progress}%`;
    if (loadingBar) loadingBar.style.width = `${progress}%`;
    if (loadingLabel && label) loadingLabel.textContent = label;
  };

  const clearSelectedPart = () => {
    selectionMaterialCache.forEach((material, mesh) => {
      mesh.material = material;
    });
    selectionMaterialCache.clear();
    selectedPartMesh = null;
    const inspector = host.querySelector<HTMLElement>('[data-part-inspector]');
    inspector?.classList.remove('is-visible');
    inspector?.setAttribute('aria-hidden', 'true');
    const popup = host.querySelector<HTMLElement>('[data-part-popup]');
    popup?.classList.remove('is-visible');
    popup?.setAttribute('aria-hidden', 'true');
  };

  const highlightPart = (mesh: THREE.Mesh) => {
    clearSelectedPart();
    const source = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const highlighted = source.map((material) => {
      const copy = material.clone();
      if (copy instanceof THREE.MeshStandardMaterial) {
        copy.emissive.set('#20b8ad');
        copy.emissiveIntensity = 0.7;
      }
      copy.transparent = true;
      return copy;
    });
    selectionMaterialCache.set(mesh, mesh.material);
    mesh.material = Array.isArray(mesh.material) ? highlighted : highlighted[0];
    selectedPartMesh = mesh;
  };

  const showPartInspector = (mesh: THREE.Mesh, assembly: THREE.Object3D) => {
    const info = assemblyInfo[assembly.name] ?? {
      label: humanizeNodeName(assembly.name),
      system: '结构零件',
      description: '该零件属于曜境 S9 的结构概念模型，用于展示系统之间的连接关系。',
    };
    const inspector = host.querySelector<HTMLElement>('[data-part-inspector]');
    const name = host.querySelector<HTMLElement>('[data-part-name]');
    const copy = host.querySelector<HTMLElement>('[data-part-copy]');
    const facts = host.querySelector<HTMLElement>('[data-part-facts]');
    const popup = host.querySelector<HTMLElement>('[data-part-popup]');
    const popupName = host.querySelector<HTMLElement>('[data-popup-part-name]');
    const popupCopy = host.querySelector<HTMLElement>('[data-popup-part-copy]');
    const popupFacts = host.querySelector<HTMLElement>('[data-popup-part-facts]');
    const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    const partName = humanizeNodeName(mesh.name) || info.label;
    const partCopy = `${info.description} 当前选中：${info.label}。`;
    const partFacts = [
      ['系统', info.system],
      ['装配', info.label],
      ['材质', material?.name || '未命名材质'],
    ];
    if (name) name.textContent = partName;
    if (copy) copy.textContent = partCopy;
    if (facts)
      facts.innerHTML = partFacts
        .map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`)
        .join('');
    if (popupName) popupName.textContent = partName;
    if (popupCopy) popupCopy.textContent = partCopy;
    if (popupFacts)
      popupFacts.innerHTML = partFacts.map(([label, value]) => `<span>${label} / ${value}</span>`).join('');
    highlightPart(mesh);
    inspector?.classList.add('is-visible');
    inspector?.setAttribute('aria-hidden', 'false');
    popup?.classList.add('is-visible');
    popup?.setAttribute('aria-hidden', 'false');
  };

  const pickModelPart = (event: PointerEvent) => {
    const assemblyRoot = vehicleRig.assemblyRoot;
    if (!assemblyRoot) return;
    const rect = canvas.getBoundingClientRect();
    explosionPointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    explosionPointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    explosionRaycaster.setFromCamera(explosionPointer, camera);
    const hit = explosionRaycaster
      .intersectObject(assemblyRoot, true)
      .find((item) => item.object instanceof THREE.Mesh);
    if (!hit || !(hit.object instanceof THREE.Mesh)) return;
    if (assemblyOpen) return;
    let assembly: THREE.Object3D = hit.object;
    while (assembly.parent && assembly.parent !== assemblyRoot) assembly = assembly.parent;
    showPartInspector(hit.object, assembly);
    const result = reduceMission(
      missionState,
      { type: 'pick', assemblyName: assembly.name },
      disassemblyTasks,
    );
    missionState = result.state;
    if (result.verdict !== 'none') {
      renderDisassemblyPanel(host, missionState, { verdict: result.verdict, assemblyName: assembly.name });
    }
    const reviewButton = host.querySelector<HTMLButtonElement>('[data-explore-review-open]');
    if (reviewButton) reviewButton.hidden = missionState.index < disassemblyTasks.length;
  };

  const applyPartFilter = () => {
    const visibleCount = vehicleRig.applyPartFilter(activePartCategory);
    if (visibleCount === null) return;
    host
      .querySelector<HTMLElement>('[data-part-filter-count]')
      ?.replaceChildren(
        document.createTextNode(`${partCategoryLabels[activePartCategory]} / ${visibleCount} 组`),
      );
  };

  const retryButton = document.createElement('button');
  retryButton.className = 'asset-retry';
  retryButton.textContent = '重新加载模型';
  scope.listen(retryButton, 'click', () => {
    retryButton.remove();
    updateLoading(0, '正在重新加载模型');
    void loadModel();
  });
  void loadModel();
  async function loadModel() {
    let gltf: Awaited<ReturnType<typeof loadGltf>> | undefined;
    try {
      gltf = await loadGltf('/assets/yaojing-s9-optimized.glb', { signal: scope.signal });
      if (scope.signal.aborted) {
        disposeObject(gltf.scene);
        return;
      }
      modelRoot = gltf.scene;
      const { size, scale } = vehicleRig.prepareModel(modelRoot);
      powerflowScene.prepareModel(modelRoot, size);
      vehicleRig.prepareExplosionRigs();
      applyPartFilter();
      controls.target.set(0, size.y * scale * 0.38, 0);
      controls.update();
      homeCameraPosition.copy(camera.position);
      homeCameraTarget.copy(controls.target);
      updateLoading(100, '结构数据已载入');
      loading?.classList.add('is-complete');
      if (modelStatus) modelStatus.textContent = 'LIVE / READY';
      setFocus(activeFocus);
      if (assemblyOpen) vehicleRig.setTeachingAssemblyProgress(assemblyState);
      if (exploreActive && !powerflowState.played && !assemblyOpen) startPowerflow();
    } catch (error) {
      if (scope.signal.aborted) return;
      updateLoading(100, '模型载入失败，可重新加载');
      if (modelStatus) modelStatus.textContent = 'LOAD ERROR';
      if (gltf) {
        if (!gltf.scene.parent) disposeObject(gltf.scene);
        reportChapterError(host, error);
        return;
      }
      loading?.append(retryButton);
      console.error('Explore asset failed', error);
    }
  }

  const fitFocusCamera = (focus: FocusKey) => {
    if (!modelRoot) return;
    if (focus === 'all') {
      camera.position.copy(homeCameraPosition);
      controls.target.copy(homeCameraTarget);
      cameraMinDistance = homeMinDistance;
      cameraMaxDistance = homeMaxDistance;
      updateCameraLimits(vehicleRig.explosionTarget > 0.5);
      return;
    }
    const rootName = focus === 'battery' ? 'BatteryPack' : focus === 'cabin' ? 'Cabin' : 'ADAS';
    const focusRoot = modelRoot.getObjectByName(rootName);
    if (!focusRoot) return;
    const bounds = new THREE.Box3().setFromObject(focusRoot);
    if (bounds.isEmpty()) return;
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z);
    const direction = camera.position.clone().sub(controls.target).normalize();
    const distance = Math.max(maxDimension * (focus === 'battery' ? 1.9 : 1.65), 3.2);
    camera.position.copy(center).add(direction.multiplyScalar(distance));
    controls.target.copy(center);
    cameraMinDistance = Math.max(1.2, maxDimension * 0.65);
    cameraMaxDistance = Math.max(8, maxDimension * 4.5);
    updateCameraLimits(vehicleRig.explosionTarget > 0.5);
  };

  const restoreMaterials = () => {
    materialCache.forEach((material, mesh) => {
      mesh.material = material;
    });
    visibilityCache.forEach((visible, object) => {
      object.visible = visible;
    });
    focusMaterials.forEach((material) => material.dispose());
    focusMaterials.clear();
  };

  const setFocus = (focus: FocusKey) => {
    if (powerflowState.playing) finishPowerflow();
    activeFocus = focus;
    clearSelectedPart();
    if (modelRoot) {
      restoreMaterials();
    }
    if (modelRoot && focus !== 'all') {
      modelRoot.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        // The wave field owns its materials and animation state. It is toggled
        // separately below and should not be dimmed as part of the car focus.
        if (powerflowScene.sensorWaveGroup?.getObjectById(object.id)) return;
        if (powerflowScene.group?.getObjectById(object.id)) return;
        const selected = categoryForObject(object, focus);
        const isVehicleLight = isVehicleLightObject(object);
        const isCabinBackground = focus === 'cabin' && isCabinBackgroundObject(object);
        const source = Array.isArray(object.material) ? object.material : [object.material];
        const cloned = source.map((material) => {
          const copy = material.clone();
          copy.transparent = true;
          copy.opacity =
            focus === 'adas' && isVehicleLight
              ? 0
              : focus === 'cabin'
                ? isCabinBackground
                  ? 0.012
                  : selected
                    ? 1
                    : 0.03
                : selected
                  ? 1
                  : 0.08;
          if (!selected || isCabinBackground) copy.depthWrite = false;
          if (focus === 'adas' && isVehicleLight && 'emissive' in copy) {
            const emissiveMaterial = copy as THREE.MeshStandardMaterial;
            emissiveMaterial.emissive.set(0x000000);
            emissiveMaterial.emissiveIntensity = 0;
          }
          focusMaterials.add(copy);
          return copy;
        });
        object.visible = !(focus === 'adas' && isVehicleLight);
        object.material = Array.isArray(object.material) ? cloned : cloned[0];
      });
    }
    const data = focusCopy[focus];
    const adasOverlay = host.querySelector<HTMLElement>('[data-adas-overlay]');
    const isAdas = focus === 'adas';
    powerflowScene.sensorWaveGroup?.visible && !isAdas && (powerflowScene.sensorWaveGroup.visible = false);
    if (powerflowScene.sensorWaveGroup && isAdas) {
      powerflowScene.sensorWaveGroup.visible = true;
      powerflowScene.resetRadarWaves();
    }
    adasOverlay?.classList.toggle('is-visible', isAdas);
    adasOverlay?.setAttribute('aria-hidden', String(!isAdas));
    if (modelStatus) modelStatus.textContent = isAdas ? 'SENSORS / SCANNING' : 'LIVE / READY';
    fitFocusCamera(focus);
    host
      .querySelector<HTMLElement>('[data-focus-index]')
      ?.replaceChildren(document.createTextNode(data.index));
    const title = host.querySelector<HTMLElement>('[data-focus-title]');
    const copy = host.querySelector<HTMLElement>('[data-focus-copy]');
    const facts = host.querySelector<HTMLElement>('[data-focus-facts]');
    if (title) title.textContent = data.title;
    if (copy) copy.textContent = data.copy;
    if (facts)
      facts.innerHTML = data.facts
        .map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`)
        .join('');
    applyPartFilter();
  };

  host.querySelectorAll<HTMLButtonElement>('[data-focus]').forEach((button) => {
    scope.listen(button, 'click', () => {
      const focus = (button.dataset.focus ?? 'all') as FocusKey;
      host.querySelectorAll<HTMLButtonElement>('[data-focus]').forEach((item) => {
        const active = item === button;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-selected', String(active));
      });
      setFocus(focus);
    });
  });

  const setPartCategory = (category: PartCategory) => {
    if (powerflowState.playing) finishPowerflow();
    activePartCategory = category;
    host.querySelectorAll<HTMLButtonElement>('[data-part-filter]').forEach((button) => {
      const active = button.dataset.partFilter === category;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
    });
    clearSelectedPart();
    applyPartFilter();
  };

  host.querySelectorAll<HTMLButtonElement>('[data-part-filter]').forEach((button) => {
    scope.listen(button, 'click', () =>
      setPartCategory((button.dataset.partFilter ?? 'all') as PartCategory),
    );
  });

  const updateActionButton = (action: string, isActive: boolean) => {
    const button = host.querySelector<HTMLButtonElement>(`[data-model-action="${action}"]`);
    const label = host.querySelector<HTMLElement>(`[data-action-label="${action}"]`);
    button?.classList.toggle('is-active', isActive);
    button?.setAttribute('aria-pressed', String(isActive));
    if (label) label.textContent = isActive ? '关闭' : '打开';
  };

  host.querySelectorAll<HTMLButtonElement>('[data-model-action]').forEach((button) => {
    scope.listen(button, 'click', () => {
      if (powerflowState.playing) finishPowerflow();
      const action = button.dataset.modelAction;
      if (action === 'doors') {
        updateActionButton(action, vehicleRig.toggleDoors());
      }
      if (action === 'tailgate') {
        updateActionButton(action, vehicleRig.toggleTailgate());
      }
      if (action === 'lights') {
        updateActionButton(action, vehicleRig.toggleLights());
        setFocus(activeFocus);
      }
    });
  });

  const explodeToggle = host.querySelector<HTMLButtonElement>('[data-explode-toggle]');
  const explodeReset = host.querySelector<HTMLButtonElement>('[data-explode-reset]');
  const explodeLabel = host.querySelector<HTMLElement>('[data-explode-label]');
  const explodeHud = host.querySelector<HTMLElement>('[data-explode-hud]');
  const disassemblyStart = host.querySelector<HTMLButtonElement>('[data-disassembly-start]');
  const disassemblyExit = host.querySelector<HTMLButtonElement>('[data-disassembly-exit]');
  const disassemblyPanel = host.querySelector<HTMLElement>('[data-disassembly-panel]');
  const setExploded = (open: boolean) => {
    if (powerflowState.playing) finishPowerflow();
    vehicleRig.setExploded(open);
    // Give the exploded assembly a clean inspection backdrop. The road is a
    // separate scene layer, so hiding it does not affect model picking,
    // part popups, sensor waves, or the authored explosion transforms.
    updateCameraLimits(open);
    explodeToggle?.classList.toggle('is-active', open);
    explodeToggle?.setAttribute('aria-pressed', String(open));
    if (explodeLabel) explodeLabel.textContent = open ? '关闭爆炸图' : '打开爆炸图';
    explodeHud?.classList.toggle('is-visible', open);
    explodeHud?.setAttribute('aria-hidden', String(!open));
    if (!open) clearSelectedPart();
  };
  scope.listen(explodeToggle, 'click', () => {
    const open = vehicleRig.explosionTarget < 0.5;
    if (!open && missionState.active) {
      missionState = reduceMission(missionState, { type: 'close-exploded' }, disassemblyTasks).state;
      disassemblyPanel?.classList.remove('is-visible', 'is-complete');
      disassemblyPanel?.setAttribute('aria-hidden', 'true');
      updateDisassemblyPanel();
    }
    setExploded(open);
  });
  scope.listen(explodeReset, 'click', () => {
    missionState = reduceMission(missionState, { type: 'reset' }, disassemblyTasks).state;
    disassemblyPanel?.classList.remove('is-visible', 'is-complete');
    disassemblyPanel?.setAttribute('aria-hidden', 'true');
    updateDisassemblyPanel();
    setPartCategory('all');
    setExploded(false);
  });
  scope.listen(disassemblyStart, 'click', () => {
    if (powerflowState.playing) finishPowerflow();
    missionState = reduceMission(missionState, { type: 'start' }, disassemblyTasks).state;
    // A mission must always expose every target, even if the visitor had
    // previously narrowed the exploded assembly to one part category.
    setPartCategory('all');
    setExploded(true);
    setFocus('all');
    disassemblyPanel?.classList.add('is-visible');
    disassemblyPanel?.classList.remove('is-complete');
    disassemblyPanel?.setAttribute('aria-hidden', 'false');
    updateDisassemblyPanel();
  });
  scope.listen(disassemblyExit, 'click', () => {
    missionState = reduceMission(missionState, { type: 'exit' }, disassemblyTasks).state;
    disassemblyPanel?.classList.remove('is-visible', 'is-complete');
    disassemblyPanel?.setAttribute('aria-hidden', 'true');
    updateDisassemblyPanel();
    setExploded(false);
  });

  const saveObservation = () => {
    savedObservation = {
      focus: activeFocus,
      category: activePartCategory,
      exploded: vehicleRig.explosionTarget > 0.5,
      autoRotate: controls.autoRotate,
      camera: captureCameraObservation(camera, controls),
      cameraMinDistance,
      cameraMaxDistance,
    };
    if (powerflowState.playing) finishPowerflow();
    controls.autoRotate = false;
    rotationTimer.cancel();
    clearSelectedPart();
    setPartCategory('all');
    setFocus('all');
    host.classList.add('is-explore-teaching');
  };
  const restoreObservation = (assembled = false) => {
    host.classList.remove('is-explore-teaching');
    if (!savedObservation) return;
    setPartCategory(savedObservation.category);
    setFocus(savedObservation.focus);
    setExploded(assembled ? false : savedObservation.exploded);
    cameraMinDistance = savedObservation.cameraMinDistance;
    cameraMaxDistance = savedObservation.cameraMaxDistance;
    restoreCameraObservation(camera, controls, savedObservation.camera);
    if (assembled) updateCameraLimits(false);
    savedObservation = null;
  };
  const closeAssembly = (restoreBefore = false, returnFocus = false) => {
    const complete = assemblyState.status === 'complete';
    assemblyState = reduceAssemblyReturn(assemblyState, 'cancel');
    vehicleRig.clearTeachingAssembly();
    assemblyOpen = false;
    const panel = host.querySelector<HTMLElement>('[data-explore-assembly]');
    if (panel) panel.hidden = true;
    restoreObservation(complete && !restoreBefore);
    if (returnFocus) host.querySelector<HTMLButtonElement>('[data-assembly-open]')?.focus();
  };
  // Run before bootstrap tears down a non-cached page. Cached controllers also
  // lose new drafts on a page exit; ordinary chapter/background pauses retain them.
  scope.listen(
    window,
    'pagehide',
    () => {
      if (assemblyOpen) closeAssembly(true);
      assemblyState = createAssemblyReturnState();
      reviewOpen = false;
      for (const id of Object.keys(reviewAnswers)) delete reviewAnswers[id];
      renderExploreReview(host, reviewAnswers);
      const review = host.querySelector<HTMLElement>('[data-explore-review]');
      if (review) review.hidden = true;
      renderExploreAssembly(host, assemblyState);
      const assembly = host.querySelector<HTMLElement>('[data-explore-assembly]');
      if (assembly) assembly.hidden = true;
    },
    { capture: true },
  );
  // Delegation keeps dynamically replaced question buttons inside this scope.
  scope.listen(host, 'click', (event: MouseEvent) => {
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button') : null;
    if (!button || !host.contains(button) || button.disabled) return;
    if (button.hasAttribute('data-explore-review-open') && missionState.index >= disassemblyTasks.length) {
      reviewOpen = true;
      renderExploreReview(host, reviewAnswers);
      host.querySelector<HTMLElement>('[data-explore-review]')!.hidden = false;
    } else if (reviewOpen && button.hasAttribute('data-review-answer')) {
      const question = exploreReviewQuestions.find((item) => item.id === button.dataset.reviewQuestion);
      if (question && evaluateChoice(question, button.dataset.reviewAnswer!) !== 'invalid') {
        reviewAnswers[question.id] = button.dataset.reviewAnswer!;
        renderExploreReview(host, reviewAnswers);
        const replacement = Array.from(host.querySelectorAll<HTMLButtonElement>('[data-review-answer]')).find(
          (item) => item.dataset.reviewAnswer === button.dataset.reviewAnswer,
        );
        replacement?.focus({ preventScroll: true });
      }
    } else if (button.hasAttribute('data-explore-review-close')) {
      reviewOpen = false;
      host.querySelector<HTMLElement>('[data-explore-review]')!.hidden = true;
    } else if (button.hasAttribute('data-assembly-open') && !assemblyOpen) {
      saveObservation();
      assemblyOpen = true;
      assemblyState = createAssemblyReturnState();
      vehicleRig.setTeachingAssemblyProgress(assemblyState);
      updateCameraLimits(true);
      renderExploreAssembly(host, assemblyState);
      host.querySelector<HTMLElement>('[data-explore-assembly]')!.hidden = false;
    } else if (assemblyOpen && button.hasAttribute('data-assembly-next')) {
      assemblyState = reduceAssemblyReturn(assemblyState, 'next');
      vehicleRig.setTeachingAssemblyProgress(assemblyState);
      renderExploreAssembly(host, assemblyState);
    } else if (assemblyOpen && button.hasAttribute('data-assembly-cancel')) closeAssembly(false, true);
  });
  scope.listen(canvas, 'pointerdown', (event: PointerEvent) => {
    pointerDownPosition.set(event.clientX, event.clientY);
  });
  scope.listen(canvas, 'pointerup', (event: PointerEvent) => {
    const moved = Math.hypot(event.clientX - pointerDownPosition.x, event.clientY - pointerDownPosition.y);
    if (moved < 8) {
      if (powerflowState.playing) finishPowerflow();
      pickModelPart(event);
    }
  });
  scope.listen(host.querySelector<HTMLButtonElement>('[data-part-popup-close]'), 'click', clearSelectedPart);

  const resize = () => {
    const width = viewer.clientWidth || window.innerWidth;
    const height = viewer.clientHeight || window.innerHeight;
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
    updateRendererPixelRatio();
    renderer.setSize(width, height, false);
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(viewer);
  resize();

  controls.addEventListener('start', () => {
    controls.autoRotate = false;
    if (powerflowState.playing) finishPowerflow();
  });
  controls.addEventListener('end', () => {
    rotationTimer.schedule(() => {
      if (!assemblyOpen) controls.autoRotate = true;
    }, 2500);
  });

  scope.listen(host.querySelector<HTMLButtonElement>('[data-powerflow-skip]'), 'click', () =>
    finishPowerflow(),
  );
  scope.listen(powerflowReplay, 'click', () => startPowerflow(true));

  const loop = createAnimationLoop(
    renderer,
    (deltaSeconds) => {
      controls.update();
      if (assemblyOpen && assemblyState.currentGroup) {
        const previousGroup = assemblyState.currentGroup;
        assemblyState = stepAssemblyReturn(assemblyState, deltaSeconds);
        vehicleRig.setTeachingAssemblyProgress(assemblyState);
        const meter = host.querySelector<HTMLProgressElement>('[data-assembly-progress]');
        if (meter) meter.value = assemblyState.progress;
        if (previousGroup !== assemblyState.currentGroup) {
          renderExploreAssembly(host, assemblyState);
          host.querySelector<HTMLElement>('[data-assembly-next]')?.focus({ preventScroll: true });
          if (assemblyState.status === 'complete') {
            setExploded(false);
            vehicleRig.clearTeachingAssembly();
          }
        }
      }
      vehicleRig.update(deltaSeconds);
      powerflowScene.updateRadarWaves(deltaSeconds);
      updatePowerflow(deltaSeconds);
      renderer.render(scene, camera);
    },
    (error) => reportChapterError(host, error),
  );
  setFocus('all');
  scope.add(() => restoreMaterials());
  scope.add(() => clearSelectedPart());
  scope.add(() => resizeObserver.disconnect());
  scope.add(() => loop.dispose());
  scope.add(() => rotationTimer.dispose());
  return {
    setActive(active) {
      exploreActive = active;
      rotationTimer.setActive(active);
      if (!active && powerflowState.playing) finishPowerflow('deactivate');
      if (active) {
        resize();
        if (modelRoot && !powerflowState.played && !assemblyOpen) startPowerflow();
      }
      loop.setActive(active);
    },
    dispose: () => scope.dispose(),
  };
}
