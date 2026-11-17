import { afterEach, expect, it, vi } from 'vitest';
import { chooseQuality, renderPixelRatio, setQualityPreference, watchQuality, reportRenderCost, reportFrameInterval, ADAPTIVE_STORAGE_KEY } from '../../src/shared/performance';
import { createAnimationLoop } from '../../src/shared/lifecycle';

afterEach(() => { setQualityPreference('auto'); vi.unstubAllGlobals(); });

it('selects a bounded low-power profile on mobile, low memory, few cores or save-data', () => {
  for (const hints of [{ cores: 4 }, { memory: 4 }, { mobile: true }, { saveData: true }]) {
    const profile = chooseQuality('auto', hints);
    expect(profile.low).toBe(true);
    expect(profile.maxFps).toBe(30);
    expect(profile.shadows).toBe(false);
  }
  expect(chooseQuality('auto', { cores: 16, memory: 16 }).low).toBe(false);
  expect(chooseQuality('high', { memory: 2 }, true).low).toBe(false);
  expect(chooseQuality('low', { cores: 32 }).low).toBe(true);
});

it('caps the actual framebuffer on high-DPI 4K screens without enlarging phone canvases', () => {
  const low = chooseQuality('low', {});
  for (const [w, h] of [[3840, 2160], [1920, 1080], [390, 700]]) {
    const ratio = renderPixelRatio(w, h, 3, low);
    expect(w * h * ratio * ratio).toBeLessThanOrEqual(low.maxPixels + 1);
    expect(ratio).toBeLessThanOrEqual(1);
  }
  expect(renderPixelRatio(390, 700, 3, low)).toBe(1);
});

it('uses the integrated-graphics budget with four logical threads even with ample RAM', () => {
  const profile = chooseQuality('auto', { cores: 4, memory: 16 });
  expect(profile.low).toBe(true);
  expect(profile.maxPixels).toBe(600_000);
  expect(profile.maxFps).toBe(30);
});

it('limits rendered frames to 30 per second while preserving elapsed simulation time and suspension', () => {
  setQualityPreference('low');
  let callback: ((time: number) => void) | null = null;
  const deltas: number[] = [];
  const loop = createAnimationLoop({ setAnimationLoop: value => { callback = value; } }, delta => deltas.push(delta));
  loop.setActive(true);
  for (let i = 0; i <= 120; i++) callback!(i * 1000 / 120);
  expect(deltas.length).toBeGreaterThanOrEqual(30);
  expect(deltas.length).toBeLessThanOrEqual(32);
  expect(deltas.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 1);
  loop.setActive(false);
  expect(callback).toBeNull();
  loop.setActive(true);
  callback!(100_000);
  expect(deltas.at(-1)).toBe(0);
  loop.dispose();
});

it('lowers automatic quality after sustained expensive rendering and keeps explicit high quality', () => {
  vi.stubGlobal('navigator', { hardwareConcurrency: 16, deviceMemory: 16 });
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  const changed = vi.fn();
  const stop = watchQuality(changed);
  setQualityPreference('auto');
  for (let i = 0; i < 65; i++) reportRenderCost(30);
  expect(changed.mock.lastCall?.[0].low).toBe(true);
  setQualityPreference('high');
  for (let i = 0; i < 100; i++) reportRenderCost(45);
  expect(changed.mock.lastCall?.[0].low).toBe(false);
  stop();
});

it('downgrades sustained poor delivery even with cheap CPU submission, but ignores pauses and explicit standard', () => {
  vi.stubGlobal('navigator', { hardwareConcurrency: 16, deviceMemory: 16 });
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  const changed = vi.fn();
  const stop = watchQuality(changed);
  setQualityPreference('auto');
  for (let i = 0; i < 200; i++) reportFrameInterval(16.7);
  expect(changed.mock.lastCall?.[0].low).toBe(false);
  for (let i = 0; i < 30; i++) { reportFrameInterval(70); reportFrameInterval(3000); }
  expect(changed.mock.lastCall?.[0].low).toBe(false);
  const session = { setItem: vi.fn(), removeItem: vi.fn() };
  vi.stubGlobal('sessionStorage', session);
  for (let i = 0; i < 120; i++) reportFrameInterval(50);
  expect(changed.mock.lastCall?.[0].low).toBe(true);
  expect(session.setItem).toHaveBeenCalledWith(ADAPTIVE_STORAGE_KEY, 'true');
  setQualityPreference('high');
  for (let i = 0; i < 180; i++) reportFrameInterval(50);
  expect(changed.mock.lastCall?.[0].low).toBe(false);
  expect(session.removeItem).toHaveBeenCalledWith(ADAPTIVE_STORAGE_KEY);
  stop();
});

it('removes a forced preview query after manual choice without losing the chapter or other parameters', () => {
  vi.stubGlobal('location', { href: 'https://museum.test/legacy.html?quality=low&demo=1#explore' });
  const replaceState = vi.fn();
  vi.stubGlobal('history', { state: { visit: 1 }, replaceState });
  setQualityPreference('high');
  const url = replaceState.mock.lastCall?.[2] as URL;
  expect(url.searchParams.has('quality')).toBe(false);
  expect(url.searchParams.get('demo')).toBe('1');
  expect(url.hash).toBe('#explore');
  expect(replaceState.mock.lastCall?.[0]).toEqual({ visit: 1 });
});
