import * as THREE from 'three';
import { createScene } from './scene';
import { scenarios } from './data';
import { createTrafficState, reduceTraffic, type TrafficEvent } from './rules';
import { createWorldState, stepWorld } from './simulation';
import { createScenarioPresentation } from './scenario-scene';
import { renderTrafficUI } from './presentation';
import { setText, setTextAll } from '../../shared/dom';
import { createScope, createPausableTimer, createAnimationLoop } from '../../shared/lifecycle';
import { loadGltf } from '../../shared/gltf';
import { resizeRenderer, watchRendererQuality } from '../../shared/renderer-quality';
import { disposeObject } from '../../shared/three-resources';
import type { ChapterController } from '../../app/types';
import { watchWebglContext, reportChapterError } from '../../shared/webgl';
import { trafficReviewAnnotations, trafficPracticeScenarios } from './learning-data';
import { renderTrafficReview, renderTrafficPractice } from './learning-view';
import {
  createTrafficPracticeState,
  reduceTrafficPractice,
  type TrafficPracticeEvent,
} from './practice-state';
import { createTrafficPracticeScene } from './practice-scene';

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
  const canvas = host.querySelector<HTMLCanvasElement>('[data-traffic-canvas]');
  const overlay = host.querySelector<HTMLElement>('[data-traffic-overlay]');
  const optionHost = host.querySelector<HTMLElement>('[data-traffic-options]');
  const startButton = host.querySelector<HTMLButtonElement>('[data-traffic-start]');
  const resetButton = host.querySelector<HTMLButtonElement>('[data-traffic-reset]');
  const nextButton = host.querySelector<HTMLButtonElement>('[data-traffic-next]');
  const learningHost = host.querySelector<HTMLElement>('[data-traffic-learning]');
  const learningEntry = host.querySelector<HTMLElement>('[data-traffic-learning-entry]');
  const practiceButton = host.querySelector<HTMLButtonElement>('[data-traffic-practice-open]');
  const reviewButton = host.querySelector<HTMLButtonElement>('[data-traffic-review-open]');
  if (!canvas || !overlay || !optionHost) throw new Error('道路安全展厅缺少视图');

  const environment = createScene(canvas, scope);
  const { scene, camera, renderer, car, fallbackCar } = environment;
  watchWebglContext(canvas, scope, host);
  let disposed = false;
  void loadGltf('/assets/yaojing-s9.glb', { signal: scope.signal })
    .then((gltf) => {
      if (disposed) {
        disposeObject(gltf.scene);
        return;
      }
      const model = gltf.scene;
      model.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(model);
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      const scale = 4.25 / Math.max(size.x, 0.001);
      model.scale.setScalar(scale);
      model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
      model.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.castShadow = true;
          object.receiveShadow = true;
        }
      });
      car.remove(fallbackCar);
      disposeObject(fallbackCar);
      car.add(model);
    })
    .catch(() => {
      if (disposed) return;
      setText(host, '[data-traffic-state]', '车辆模型加载失败，正在使用示意车继续');
    });

  const scenePresentation = createScenarioPresentation(environment);
  let active = false;
  let state = createTrafficState();
  let world = createWorldState();
  let practiceState = createTrafficPracticeState();
  let learningMode: 'original' | 'practice' | 'review' = 'original';
  const practiceParent = new THREE.Group();
  scene.add(practiceParent);
  const practiceScene = createTrafficPracticeScene(practiceParent, scope);
  scope.add(() => practiceParent.removeFromParent());
  let snapshot: {
    visible: { object: THREE.Object3D; value: boolean }[];
    position: THREE.Vector3;
    quaternion: THREE.Quaternion;
    zoom: number;
    fov: number;
  } | null = null;
  let lastPracticeSceneId: string | null = null;
  const feedbackTimer = createPausableTimer();
  scope.add(() => feedbackTimer.dispose());
  const cameraTarget = new THREE.Vector3();
  const cameraDesired = new THREE.Vector3();

  function renderLearningEntry() {
    if (learningEntry) learningEntry.hidden = learningMode !== 'original';
    if (practiceButton)
      practiceButton.hidden = learningMode !== 'original' || !['ready', 'complete'].includes(state.phase);
    if (reviewButton) reviewButton.hidden = learningMode !== 'original' || state.phase !== 'complete';
  }

  function renderOriginal() {
    const scenario = scenarios[state.scenarioIndex];
    const choice = scenario.options.find((option) => option.choiceId === state.answeredChoiceId);
    renderTrafficUI(
      host,
      state,
      scenario,
      choice ? { choiceId: choice.choiceId, correct: choice.correct } : null,
    );
    renderLearningEntry();
  }

  function renderPractice(restartScene = false) {
    if (!learningHost) return;
    const scenario = trafficPracticeScenarios[practiceState.scenarioIndex];
    if (scenario && (restartScene || lastPracticeSceneId !== scenario.id)) {
      practiceScene.show(scenario);
      lastPracticeSceneId = scenario.id;
    }
    if (practiceState.verdict && ['feedback', 'summarize', 'complete'].includes(practiceState.phase))
      practiceScene.showDecision(practiceState.verdict);
    renderTrafficPractice(learningHost, practiceState, trafficPracticeScenarios);
    setText(
      host,
      '[data-traffic-state]',
      practiceState.phase === 'complete'
        ? '进阶五题完成 · 原道路分数保留'
        : '安全决策 · 先读条件，再选择行动',
    );
  }

  function enterLearning(mode: 'practice' | 'review') {
    if (!learningHost || learningMode !== 'original') return;
    if (mode === 'practice' && !['ready', 'complete'].includes(state.phase)) return;
    if (mode === 'review' && state.phase !== 'complete') return;
    learningMode = mode;
    overlay!.hidden = true;
    overlay!.setAttribute('aria-hidden', 'true');
    learningHost.hidden = false;
    if (mode === 'practice') {
      snapshot = {
        visible: [environment.city, car].map((object) => ({ object, value: object.visible })),
        position: camera.position.clone(),
        quaternion: camera.quaternion.clone(),
        zoom: camera.zoom,
        fov: camera.fov,
      };
      snapshot.visible.forEach(({ object }) => {
        object.visible = false;
      });
      camera.position.set(10.5, 9.2, 15.8);
      camera.lookAt(0.6, 0.7, -2.5);
      camera.zoom = 1;
      camera.updateProjectionMatrix();
      canvas!.dataset.sceneMode = 'practice';
      renderPractice(true);
    } else renderTrafficReview(learningHost, scenarios, trafficReviewAnnotations);
    renderLearningEntry();
    learningHost
      .querySelector<HTMLElement>('[data-traffic-learning-heading]')
      ?.focus({ preventScroll: true });
  }

  function exitLearning(focusEntry = true) {
    if (learningMode === 'original') return;
    const previousMode = learningMode;
    practiceScene.hide();
    lastPracticeSceneId = null;
    if (snapshot) {
      snapshot.visible.forEach(({ object, value }) => {
        object.visible = value;
      });
      camera.position.copy(snapshot.position);
      camera.quaternion.copy(snapshot.quaternion);
      camera.zoom = snapshot.zoom;
      camera.fov = snapshot.fov;
      camera.updateProjectionMatrix();
      snapshot = null;
    }
    learningMode = 'original';
    canvas!.dataset.sceneMode = 'original';
    if (learningHost) learningHost.hidden = true;
    renderOriginal();
    if (focusEntry)
      (previousMode === 'practice' ? practiceButton : reviewButton)?.focus({ preventScroll: true });
  }

  function dispatchPractice(event: TrafficPracticeEvent) {
    if (learningMode !== 'practice') return;
    const next = reduceTrafficPractice(practiceState, event, trafficPracticeScenarios);
    if (next === practiceState) return;
    practiceState = next;
    renderPractice(event.type === 'retry' || event.type === 'reset');
    learningHost
      ?.querySelector<HTMLElement>('[data-traffic-learning-heading]')
      ?.focus({ preventScroll: true });
  }

  function applyScenario() {
    const scenario = scenarios[state.scenarioIndex];
    world = {
      ...world,
      courtesyState: scenario.id === 'pedestrians' ? 'waiting' : 'idle',
      courtesyProgress: 0,
      greenLightState: scenario.id === 'green-pedestrians' ? 'waiting' : 'idle',
      greenLightProgress: 0,
    };
    scenePresentation.apply(scenario.id);
    scenePresentation.update(world);
  }

  function dispatch(event: TrafficEvent) {
    if (learningMode !== 'original') return;
    const transition = reduceTraffic(state, event, scenarios);
    if (transition.state === state) return;
    state = transition.state;
    // driving is a per-step motion input derived exclusively from the rule phase.
    world = { ...world, driving: state.phase === 'driving' };
    if (event.type === 'start' || event.type === 'reset') {
      feedbackTimer.cancel();
      world = { ...world, carZ: -1.5, ambulanceZ: -176 };
      car.position.set(1.55, 0.02, world.carZ);
      if (event.type === 'start') car.rotation.y = Math.PI / 2;
      applyScenario();
    } else if (event.type === 'continue') {
      feedbackTimer.cancel();
      if (state.phase === 'driving') applyScenario();
    } else if (event.type === 'arrive') applyScenario();

    for (const effect of transition.effects) {
      if (effect.type === 'schedule-continue') {
        feedbackTimer.schedule(() => dispatch({ type: 'continue' }), effect.delayMs);
      } else if (effect.type === 'start-crossing') {
        world =
          effect.scenarioId === 'pedestrians'
            ? { ...world, courtesyState: 'crossing', courtesyProgress: 0 }
            : { ...world, greenLightState: 'crossing', greenLightProgress: 0 };
      }
      // show-result is represented by complete and rendered with the same state below.
    }
    renderOriginal();
  }

  scope.listen(startButton, 'click', () => dispatch({ type: 'start' }));
  scope.listen(resetButton, 'click', () => dispatch({ type: 'reset' }));
  scope.listen(nextButton, 'click', () => dispatch({ type: 'continue' }));
  scope.listen(optionHost, 'click', (event: MouseEvent) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('[data-choice-id]');
    if (!button || !optionHost.contains(button) || button.disabled) return;
    dispatch({ type: 'answer', choiceId: button.dataset.choiceId ?? '' });
  });
  scope.listen(practiceButton, 'click', () => enterLearning('practice'));
  scope.listen(reviewButton, 'click', () => enterLearning('review'));
  scope.listen(learningHost, 'click', (event: MouseEvent) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button');
    if (!button || !learningHost?.contains(button) || button.disabled) return;
    if (button.hasAttribute('data-traffic-learning-close')) {
      button.disabled = true;
      exitLearning();
      return;
    }
    if (learningMode !== 'practice') return;
    let practiceEvent: TrafficPracticeEvent | null = null;
    if (button.hasAttribute('data-traffic-practice-start')) practiceEvent = { type: 'start' };
    else if (button.hasAttribute('data-traffic-practice-observed')) practiceEvent = { type: 'observed' };
    else if (button.hasAttribute('data-traffic-practice-choice'))
      practiceEvent = { type: 'answer', choiceId: button.dataset.trafficPracticeChoice ?? '' };
    else if (button.hasAttribute('data-traffic-practice-retry')) practiceEvent = { type: 'retry' };
    else if (button.hasAttribute('data-traffic-practice-reset')) practiceEvent = { type: 'reset' };
    else if (button.hasAttribute('data-traffic-practice-continue')) {
      const fromPhase = button.dataset.fromPhase;
      if (fromPhase === 'feedback' || fromPhase === 'summarize')
        practiceEvent = { type: 'continue', fromPhase, scenarioId: button.dataset.scenarioId ?? '' };
    }
    if (practiceEvent) {
      button.disabled = true;
      dispatchPractice(practiceEvent);
      if (button.isConnected) button.disabled = false;
    }
  });
  // A page exit clears only the new learning memory, including BFCache exits.
  // Normal chapter suspension uses setActive and keeps practice progress.
  scope.listen(window, 'pagehide', () => {
    exitLearning(false);
    practiceState = createTrafficPracticeState();
    learningHost?.replaceChildren();
    if (learningHost) {
      delete learningHost.dataset.phase;
      delete learningHost.dataset.scenarioId;
      delete learningHost.dataset.mode;
    }
  });

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  resizeObserver.observe(canvas);
  resize();
  scope.add(watchRendererQuality(renderer, resize, true));
  const loop = createAnimationLoop(renderer, animate, (error) => reportChapterError(host, error));
  scope.add(() => loop.dispose());
  scope.add(() => resizeObserver.disconnect());
  setText(host, '[data-traffic-state]', '准备出发 · 观察道路，遇到情境时点选答案');
  setTextAll(host, '[data-traffic-progress]', `0 / ${scenarios.length}`);
  setText(host, '[data-traffic-score]', '0 分');
  overlay.hidden = false;
  overlay.classList.add('is-visible', 'is-ready');
  overlay.setAttribute('aria-hidden', 'false');
  canvas.dataset.sceneMode = 'original';
  renderLearningEntry();

  function resize() {
    const width = canvas?.clientWidth || host.clientWidth || 1;
    const height = canvas?.clientHeight || host.clientHeight || 1;
    camera.aspect = width / Math.max(height, 1);
    camera.fov = width < 620 ? 48 : 43;
    camera.updateProjectionMatrix();
    resizeRenderer(renderer, width, height);
  }

  function animate(delta: number) {
    if (disposed || !active) return;
    if (learningMode === 'practice') {
      practiceScene.update(delta);
      renderer.render(scene, camera);
      return;
    }
    if (learningMode === 'review') {
      renderer.render(scene, camera);
      return;
    }
    world = stepWorld(
      { ...world, driving: state.phase === 'driving' },
      delta,
      scenarios[state.scenarioIndex],
    );
    car.position.z = world.carZ;
    if (state.phase === 'driving' && !world.driving) dispatch({ type: 'arrive' });
    scenePresentation.update(world);
    if (
      state.phase === 'crossing' &&
      (world.courtesyState === 'cleared' || world.greenLightState === 'cleared')
    ) {
      dispatch({ type: 'crossing-complete' });
    }
    // Long, steady tracking preserves the existing road view and camera rhythm.
    cameraDesired.set(car.position.x + 2.0, car.position.y + 6.6, car.position.z + 13.3);
    camera.position.lerp(cameraDesired, 1 - Math.exp(-2.8 * delta));
    cameraTarget.set(car.position.x + 0.1, 1.15, car.position.z - 11.5);
    camera.lookAt(cameraTarget);
    renderer.render(scene, camera);
  }

  return {
    setActive(value) {
      active = value;
      feedbackTimer.setActive(value);
      if (value) resize();
      loop.setActive(value);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      scope.dispose();
    },
  };
}
