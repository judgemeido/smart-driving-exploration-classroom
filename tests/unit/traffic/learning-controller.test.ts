import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '../../../src/chapters/traffic/controller';
import { createScene } from '../../../src/chapters/traffic/scene';
import { renderTrafficPractice } from '../../../src/chapters/traffic/learning-view';
import { createTrafficPracticeScene } from '../../../src/chapters/traffic/practice-scene';
import type { TrafficPracticeState } from '../../../src/chapters/traffic/practice-state';

vi.mock('../../../src/chapters/traffic/scene', () => ({
  createScene: vi.fn(() => {
    const scene = new THREE.Scene();
    const city = new THREE.Group();
    const car = new THREE.Group();
    scene.add(city, car);
    const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 230);
    camera.position.set(9, 8.5, 17);
    const renderer = { setAnimationLoop: vi.fn(), setPixelRatio: vi.fn(), getPixelRatio: () => 1,
      setSize: vi.fn(), render: vi.fn(), domElement: { dataset: {} }, shadowMap: { enabled: true } };
    return { scene, city, car, camera, renderer, fallbackCar: new THREE.Group() };
  }),
}));
vi.mock('../../../src/chapters/traffic/scenario-scene', () => ({
  createScenarioPresentation: () => ({ apply: vi.fn(), update: vi.fn() }),
}));
vi.mock('../../../src/chapters/traffic/learning-view', () => ({
  renderTrafficPractice: vi.fn(),
  renderTrafficReview: vi.fn(),
}));
vi.mock('../../../src/chapters/traffic/practice-scene', () => ({
  createTrafficPracticeScene: vi.fn(() => ({
    show: vi.fn(),
    showDecision: vi.fn(),
    update: vi.fn(),
    hide: vi.fn(),
  })),
}));
vi.mock('../../../src/chapters/traffic/presentation', () => ({ renderTrafficUI: vi.fn() }));
vi.mock('../../../src/shared/gltf', () => ({ loadGltf: () => Promise.reject(new Error('missing model')) }));
vi.mock('../../../src/shared/webgl', () => ({ watchWebglContext: vi.fn(), reportChapterError: vi.fn() }));
vi.mock('../../../src/shared/dom', () => ({ setText: vi.fn(), setTextAll: vi.fn() }));

// Only the DOM boundary is faked; the original and practice reducers and lifecycle loop are real.
class Control extends EventTarget {
  hidden = false;
  disabled = false;
  isConnected = true;
  dataset: Record<string, string> = {};
  children = new Set<Control>();
  attributes = new Set<string>();
  classList = { add: vi.fn(), remove: vi.fn() };
  clientWidth = 1000;
  clientHeight = 700;
  focus = vi.fn();
  setAttribute(name: string, value: string) {
    this.attributes.add(name);
    if (name.startsWith('data-')) this.dataset[this.key(name)] = value;
  }
  hasAttribute(name: string) {
    return this.attributes.has(name);
  }
  key(name: string) {
    return name.slice(5).replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
  }
  closest() {
    return this;
  }
  contains(child: Control) {
    return this.children.has(child);
  }
  replaceChildren() {
    this.children.forEach((child) => {
      child.isConnected = false;
    });
    this.children.clear();
  }
  querySelector() {
    return null;
  }
}
function harness() {
  const windowTarget = new EventTarget() as EventTarget & { devicePixelRatio: number };
  windowTarget.devicePixelRatio = 1;
  vi.stubGlobal('window', windowTarget);
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  const controls = new Map<string, Control>();
  for (const selector of [
    'canvas',
    'overlay',
    'options',
    'start',
    'reset',
    'next',
    'learning',
    'learning-entry',
    'practice-open',
    'review-open',
  ])
    controls.set(`[data-traffic-${selector}]`, new Control());
  const host = { querySelector: (selector: string) => controls.get(selector) ?? null, clientWidth: 1000 };
  const controller = mount(host as unknown as HTMLElement);
  const environment = vi.mocked(createScene).mock.results.at(-1)!.value;
  const scene = vi.mocked(createTrafficPracticeScene).mock.results.at(-1)!.value;
  const click = (selector: string) =>
    controls.get(`[data-traffic-${selector}]`)!.dispatchEvent(new Event('click'));
  const learning = controls.get('[data-traffic-learning]')!;
  function practiceClick(attribute: string, value = '', extra: Record<string, string> = {}) {
    const button = new Control();
    button.setAttribute(`data-traffic-practice-${attribute}`, value);
    Object.assign(button.dataset, extra);
    learning.children.add(button);
    const event = new Event('click');
    Object.defineProperty(event, 'target', { value: button });
    learning.dispatchEvent(event);
    return button;
  }
  const latestState = () => vi.mocked(renderTrafficPractice).mock.calls.at(-1)![1] as TrafficPracticeState;
  return {
    controller,
    environment,
    scene,
    controls,
    click,
    practiceClick,
    latestState,
    windowTarget,
    learning,
  };
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('traffic learning controller boundaries', () => {
  it('opens only at original ready or complete and restores original objects and camera on exit', () => {
    const task = harness();
    const { camera, city, car } = task.environment;
    const initialPosition = camera.position.clone();
    const initialQuaternion = camera.quaternion.clone();
    task.click('practice-open');
    expect(city.visible).toBe(false);
    expect(car.visible).toBe(false);
    expect(task.latestState().phase).toBe('ready');
    const close = new Control();
    close.setAttribute('data-traffic-learning-close', '');
    task.learning.children.add(close);
    const event = new Event('click');
    Object.defineProperty(event, 'target', { value: close });
    task.learning.dispatchEvent(event);
    expect(city.visible).toBe(true);
    expect(car.visible).toBe(true);
    expect(camera.position.equals(initialPosition)).toBe(true);
    expect(camera.quaternion.equals(initialQuaternion)).toBe(true);
    task.click('start');
    expect(task.controls.get('[data-traffic-practice-open]')!.hidden).toBe(true);
    const calls = vi.mocked(renderTrafficPractice).mock.calls.length;
    task.click('practice-open');
    expect(vi.mocked(renderTrafficPractice).mock.calls.length).toBe(calls);
    task.controller.dispose();
  });
  it('preserves practice across setActive and pauses its animation loop', () => {
    const task = harness();
    task.controller.setActive(true);
    task.click('practice-open');
    task.practiceClick('start');
    task.practiceClick('observed');
    task.practiceClick('choice', 'traffic-green-clear-question:choice-1');
    const state = task.latestState();
    task.controller.setActive(false);
    expect(task.environment.renderer.setAnimationLoop).toHaveBeenLastCalledWith(null);
    task.controller.setActive(true);
    expect(task.latestState()).toBe(state);
    expect(state.phase).toBe('feedback');
    task.controller.dispose();
  });
  it('reopens a correct summary with the decision scene still shown', () => {
    const task = harness();
    task.click('practice-open');
    task.practiceClick('start');
    task.practiceClick('observed');
    task.practiceClick('choice', 'traffic-green-clear-question:choice-1');
    task.practiceClick('continue', '', { fromPhase: 'feedback', scenarioId: 'traffic-practice-green-clear' });
    expect(task.latestState().phase).toBe('summarize');
    const close = new Control();
    close.setAttribute('data-traffic-learning-close', '');
    task.learning.children.add(close);
    const event = new Event('click');
    Object.defineProperty(event, 'target', { value: close });
    task.learning.dispatchEvent(event);
    vi.mocked(task.scene.showDecision).mockClear();
    task.click('practice-open');
    expect(task.latestState().phase).toBe('summarize');
    expect(task.scene.showDecision).toHaveBeenLastCalledWith('correct');
    task.controller.dispose();
  });
  it('clears new memory and restores original scene on BFCache pagehide', () => {
    const task = harness();
    task.click('practice-open');
    task.practiceClick('start');
    task.practiceClick('observed');
    task.practiceClick('choice', 'traffic-green-clear-question:choice-1');
    task.practiceClick('continue', '', { fromPhase: 'feedback', scenarioId: 'traffic-practice-green-clear' });
    task.practiceClick('continue', '', {
      fromPhase: 'summarize',
      scenarioId: 'traffic-practice-green-clear',
    });
    expect(task.latestState().masteredScenarioIds).toHaveLength(1);
    const event = new Event('pagehide');
    Object.defineProperty(event, 'persisted', { value: true });
    task.windowTarget.dispatchEvent(event);
    expect(task.environment.city.visible).toBe(true);
    expect(task.learning.hidden).toBe(true);
    task.click('practice-open');
    expect(task.latestState()).toMatchObject({ phase: 'ready', masteredScenarioIds: [] });
    task.controller.dispose();
  });
});
