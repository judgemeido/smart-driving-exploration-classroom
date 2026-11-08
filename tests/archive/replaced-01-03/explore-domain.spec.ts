import { expect, test, type Page } from '@playwright/test';
import type * as THREE from 'three';

type ExploreProbe = { scene?: THREE.Scene; camera?: THREE.Camera };

// Three's existing devtools observation exposes the real renderer for test inspection.
// The application receives real mouse clicks; no mission state or hit results are replaced.
async function observeExplore(page: Page) {
  await page.addInitScript(() => {
    const probe: ExploreProbe = {};
    const devtools = new EventTarget();
    Object.assign(window, { __THREE_DEVTOOLS__: devtools, __exploreProbe: probe });
    devtools.addEventListener('observe', (event) => {
      const renderer = (event as CustomEvent).detail as THREE.WebGLRenderer;
      if (renderer.domElement?.id !== 'model-canvas') return;
      const render = renderer.render;
      renderer.render = function (scene, camera) {
        probe.scene = scene as THREE.Scene;
        probe.camera = camera;
        return render.call(this, scene, camera);
      };
    });
  });
}

async function openExplore(page: Page) {
  await observeExplore(page);
  await page.goto('/#explore');
  await expect(page.locator('[data-model-loading]')).toHaveClass(/is-complete/, { timeout: 30000 });
  if ((await page.locator('[data-powerflow-story]').getAttribute('aria-hidden')) === 'false') {
    await page.locator('[data-powerflow-skip]').click();
  }
  await expect(page.locator('[data-powerflow-replay]')).toHaveAttribute('aria-hidden', 'false');
}

async function navigate(page: Page, chapter: string) {
  if (await page.locator('[data-menu-button]').isVisible()) await page.locator('[data-menu-button]').click();
  await page.locator(`[data-go="${chapter}"]`).click();
  await expect(page.locator(`[data-page="${chapter}"]`)).toHaveClass(/is-active/);
}

async function pickAssembly(page: Page, assemblyName: string) {
  const popup = page.locator('[data-part-popup]');
  if ((await popup.getAttribute('aria-hidden')) === 'false') {
    await page.locator('[data-part-popup-close]').click();
  }
  const focus = { BatteryPack: 'battery', ADAS: 'adas', Cabin: 'cabin' }[assemblyName];
  if (focus) await page.locator(`[data-focus="${focus}"]`).click();
  const point = await page.evaluate(async (name) => {
    const probe = (window as unknown as { __exploreProbe: ExploreProbe }).__exploreProbe;
    const canvas = document.querySelector<HTMLCanvasElement>('#model-canvas')!;
    const rect = canvas.getBoundingClientRect();
    const assemblyRoot = probe.scene?.getObjectByName('EV_SUV');
    const target = assemblyRoot?.getObjectByName(name);
    if (!assemblyRoot || !target || !probe.camera) throw new Error(`Missing real model target ${name}`);
    const coreUrl = performance
      .getEntriesByType('resource')
      .map((entry) => entry.name)
      .find((url) => /\/three-core-[^/]+\.js/.test(url));
    if (!coreUrl) throw new Error('Missing loaded Three core chunk');
    const core = await import(/* @vite-ignore */ coreUrl);
    const Raycaster = Object.values(core).find(
      (value) =>
        typeof value === 'function' && value.prototype?.setFromCamera && value.prototype?.intersectObject,
    ) as typeof THREE.Raycaster;
    if (!Raycaster) throw new Error('Missing real Three raycaster');
    const Vector2 = Object.values(core).find(
      (value) => typeof value === 'function' && value.prototype?.rotateAround,
    ) as typeof THREE.Vector2;
    if (!Vector2) throw new Error('Missing real Three vector');
    const raycaster = new Raycaster();
    const meshes: THREE.Mesh[] = [];
    target.traverse((object) => {
      if ((object as THREE.Mesh).isMesh) meshes.push(object as THREE.Mesh);
    });
    assemblyRoot.updateMatrixWorld(true);
    for (const mesh of meshes) {
      const positions = mesh.geometry.getAttribute('position');
      const indices = mesh.geometry.index;
      const count = indices?.count ?? positions.count;
      const stride = Math.max(3, Math.floor(count / 120 / 3) * 3);
      for (let index = 0; index + 2 < count; index += stride) {
        const center = mesh.position.clone().set(0, 0, 0);
        for (let vertex = 0; vertex < 3; vertex += 1) {
          const positionIndex = indices ? indices.getX(index + vertex) : index + vertex;
          center.add(mesh.position.clone().fromBufferAttribute(positions, positionIndex));
        }
        center.divideScalar(3).applyMatrix4(mesh.matrixWorld).project(probe.camera);
        if (Math.abs(center.x) > 0.96 || Math.abs(center.y) > 0.96 || Math.abs(center.z) > 1) continue;
        raycaster.setFromCamera(new Vector2(center.x, center.y), probe.camera);
        const hit: THREE.Intersection | undefined = raycaster
          .intersectObject(assemblyRoot, true)
          .find((item) => (item.object as THREE.Mesh).isMesh);
        if (!hit) continue;
        let hitAssembly: THREE.Object3D = hit.object;
        while (hitAssembly.parent && hitAssembly.parent !== assemblyRoot) hitAssembly = hitAssembly.parent;
        if (hitAssembly.name !== name) continue;
        const x = rect.left + ((center.x + 1) * rect.width) / 2;
        const y = rect.top + ((1 - center.y) * rect.height) / 2;
        if (document.elementFromPoint(x, y) !== canvas) continue;
        return { x, y };
      }
    }
    throw new Error(`No unobstructed real-model click found for ${name}`);
  }, assemblyName);
  await page.mouse.click(point.x, point.y);
  await expect(popup).toHaveAttribute('aria-hidden', 'false');
}

test('02 completes the real three-target mission with mistakes, repeat picks and restart', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openExplore(page);
  await page.locator('[data-part-filter="energy"]').click();
  await page.locator('[data-disassembly-start]').click();
  await expect(page.locator('[data-part-filter="all"]')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('[data-disassembly-progress]')).toHaveText('0 / 3');
  // Let the real damped exploded transforms settle before projecting mesh triangles.
  await page.waitForTimeout(1500);
  await pickAssembly(page, 'ADAS');
  await expect(page.locator('[data-disassembly-task]')).toContainText('再找找：动力电池包');
  await expect(page.locator('[data-disassembly-progress]')).toHaveText('0 / 3');
  await pickAssembly(page, 'BatteryPack');
  await expect(page.locator('[data-disassembly-progress]')).toHaveText('1 / 3');
  await expect(page.locator('[data-disassembly-target]')).toHaveText('智驾感知系统');
  await pickAssembly(page, 'BatteryPack');
  await expect(page.locator('[data-disassembly-progress]')).toHaveText('1 / 3');
  await pickAssembly(page, 'ADAS');
  await expect(page.locator('[data-disassembly-target]')).toHaveText('座舱系统');
  await pickAssembly(page, 'Cabin');
  await expect(page.locator('[data-disassembly-progress]')).toHaveText('3 / 3');
  await expect(page.locator('[data-disassembly-panel]')).toHaveClass(/is-complete/);
  await expect(page.locator('[data-disassembly-start-label]')).toHaveText('重新开始任务');
  await pickAssembly(page, 'Cabin');
  await expect(page.locator('[data-disassembly-progress]')).toHaveText('3 / 3');
  await page.locator('[data-disassembly-start]').click();
  await expect(page.locator('[data-disassembly-progress]')).toHaveText('0 / 3');
  expect(errors).toEqual([]);
});

test('02 retains opening, lights, focus, filtering, exit and exploded reset', async ({ page }) => {
  await openExplore(page);
  for (const action of ['doors', 'tailgate', 'lights']) {
    const button = page.locator(`[data-model-action="${action}"]`);
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator(`[data-action-label="${action}"]`)).toHaveText('关闭');
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator(`[data-action-label="${action}"]`)).toHaveText('打开');
  }
  for (const [focus, title] of [
    ['battery', '电池系统'],
    ['cabin', '座舱系统'],
    ['adas', '智驾感知'],
  ]) {
    await page.locator(`[data-focus="${focus}"]`).click();
    await expect(page.locator('[data-focus-title]')).toHaveText(title);
  }
  await expect(page.locator('[data-adas-overlay]')).toHaveAttribute('aria-hidden', 'false');
  await page.locator('[data-explode-toggle]').click();
  await page.locator('[data-part-filter="energy"]').click();
  await expect(page.locator('[data-part-filter-count]')).toContainText('能源系统');
  for (const exit of ['[data-disassembly-exit]', '[data-explode-toggle]', '[data-explode-reset]']) {
    await page.locator('[data-disassembly-start]').click();
    await expect(page.locator('[data-disassembly-panel]')).toHaveAttribute('aria-hidden', 'false');
    await page.locator(exit).click();
    await expect(page.locator('[data-disassembly-panel]')).toHaveAttribute('aria-hidden', 'true');
    await expect(page.locator('[data-disassembly-progress]')).toHaveText('0 / 3');
    await expect(page.locator('[data-explode-toggle]')).toHaveAttribute('aria-pressed', 'false');
  }
});

test('02 retains the four powerflow stages, skip, replay and finish-on-leave', async ({ page }) => {
  await openExplore(page);
  await page.locator('[data-powerflow-replay]').click();
  await expect(page.locator('[data-powerflow-story]')).toHaveAttribute('aria-hidden', 'false');
  for (const title of [
    '能量，从电池开始',
    '电机，把电变成转动',
    '动力，传到四个车轮',
    '出发前，先看清周围',
  ]) {
    await expect(page.locator('[data-powerflow-title]')).toHaveText(title);
  }
  await expect(page.locator('[data-powerflow-story]')).toHaveAttribute('aria-hidden', 'true');
  await page.locator('[data-powerflow-replay]').click();
  await page.locator('[data-powerflow-skip]').click();
  await expect(page.locator('[data-powerflow-story]')).toHaveAttribute('aria-hidden', 'true');
  await page.locator('[data-powerflow-replay]').click();
  await expect(page.locator('[data-powerflow-story]')).toHaveAttribute('aria-hidden', 'false');
  await navigate(page, 'history');
  await expect(page.locator('[data-powerflow-story]')).toHaveAttribute('aria-hidden', 'true');
  await navigate(page, 'explore');
  await expect(page.locator('[data-powerflow-story]')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('[data-powerflow-replay]')).toHaveAttribute('aria-hidden', 'false');
});
