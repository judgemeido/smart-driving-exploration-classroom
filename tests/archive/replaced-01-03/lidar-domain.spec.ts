import { expect, test, type Page } from '@playwright/test';
import type * as THREE from 'three';

async function openLidar(page: Page) {
  await page.goto('/#lidar');
  await expect(page.locator('[data-page="lidar"]')).toHaveAttribute('data-status', 'ready');
  await expect(page.locator('[data-page="lidar"]')).toHaveAttribute('data-asset-status', 'ready', {
    timeout: 30000,
  });
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

async function setDistance(page: Page, value: string) {
  await page.locator('[data-lidar-distance]').evaluate((slider: HTMLInputElement, distance) => {
    slider.value = distance;
    slider.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}

async function navigate(page: Page, id: string) {
  if (await page.locator('[data-menu-button]').isVisible()) await page.locator('[data-menu-button]').click();
  await page.locator(`[data-go="${id}"]`).click();
  await expect(page.locator(`[data-page="${id}"]`)).toHaveClass(/is-active/);
}

async function selectFromCanvas(page: Page) {
  const canvas = page.locator('[data-lidar-canvas]');
  for (const y of [0.45, 0.5, 0.55, 0.4, 0.6]) {
    for (const x of [0.5, 0.45, 0.55, 0.4, 0.6]) {
      await canvas.evaluate(
        (element, point) => {
          const rect = element.getBoundingClientRect();
          const pointer = {
            pointerId: 1,
            clientX: rect.left + rect.width * point.x,
            clientY: rect.top + rect.height * point.y,
          };
          element.dispatchEvent(new PointerEvent('pointerdown', pointer));
          element.dispatchEvent(new PointerEvent('pointerup', pointer));
        },
        { x, y },
      );
      if ((await page.locator('[data-lidar-part-name]').textContent()) !== '选择一个部件') return;
    }
  }
  throw new Error('The existing model pick targets did not select a part');
}

test('03 keeps modes, model part picking, measurement, manual steps and scan restart', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openLidar(page);
  await selectFromCanvas(page);
  await expect(page.locator('[data-lidar-part-name]')).not.toHaveText('选择一个部件');
  for (const mode of ['exploded', 'cutaway', 'assembly']) {
    await page.locator(`[data-lidar-mode="${mode}"]`).click();
    await expect(page.locator(`[data-lidar-mode="${mode}"]`)).toHaveAttribute('aria-pressed', 'true');
  }
  await setDistance(page, '60');
  await expect(page.locator('[data-lidar-distance-value]')).toHaveText('60 m');
  await expect(page.locator('[data-lidar-time]').first()).toHaveText('约 400.3 ns');
  await page.locator('[data-lidar-step="2"]').click();
  await expect(page.locator('[data-lidar-scan-toggle]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-lidar-part-name]')).toHaveText('回波与测距电路');
  await page.waitForTimeout(1600);
  await expect(page.locator('[data-lidar-step="2"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-lidar-scan-toggle]').click();
  await page.locator('[data-lidar-scan-toggle]').click();
  await expect(page.locator('[data-lidar-step="0"]')).toHaveAttribute('aria-pressed', 'true');
  expect(errors).toEqual([]);
});

test('03 reset preserves 60 m and restores assembly, selection, scan and camera', async ({ page }) => {
  // Observe the camera actually rendered by Three. The shader can optimize out viewMatrix.
  await page.addInitScript(() => {
    const devtools = new EventTarget();
    Object.assign(window, { __THREE_DEVTOOLS__: devtools });
    devtools.addEventListener('observe', (event) => {
      const renderer = (event as CustomEvent).detail as THREE.WebGLRenderer;
      if (!renderer.domElement?.matches('[data-lidar-canvas]')) return;
      const render = renderer.render;
      renderer.render = function (scene, camera) {
        render.call(this, scene, camera);
        (window as unknown as { __lidarViewMatrix: number[] }).__lidarViewMatrix = [
          ...camera.matrixWorldInverse.elements,
        ];
      };
    });
  });
  await openLidar(page);
  const matrix = () =>
    page.evaluate(() => (window as unknown as { __lidarViewMatrix?: number[] }).__lidarViewMatrix ?? []);
  await expect.poll(async () => (await matrix()).length).toBe(16);
  const homeMatrix = await matrix();
  await setDistance(page, '60');
  await page.locator('[data-lidar-mode="exploded"]').click();
  await page.locator('[data-lidar-step="2"]').click();
  const rect = await page.locator('[data-lidar-canvas]').boundingBox();
  expect(rect).not.toBeNull();
  await page.mouse.move(rect!.x + rect!.width * 0.55, rect!.y + rect!.height * 0.62);
  await page.mouse.down();
  await page.mouse.move(rect!.x + rect!.width * 0.7, rect!.y + rect!.height * 0.69, { steps: 8 });
  await page.mouse.up();
  await expect
    .poll(async () => (await matrix()).some((value, index) => Math.abs(value - homeMatrix[index]) > 0.01))
    .toBe(true);
  // The existing controls.reset() retains any unfinished drag damping. Compare a settled view.
  await expect
    .poll(
      async () => {
        const previous = await matrix();
        await page.evaluate(
          () =>
            new Promise<void>((resolve) => {
              requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
            }),
        );
        return (await matrix()).every((value, index) => Math.abs(value - previous[index]) < 0.0000001);
      },
      { timeout: 10000 },
    )
    .toBe(true);
  await page.locator('[data-lidar-reset]').click();
  await expect(page.locator('[data-lidar-distance]')).toHaveValue('60');
  await expect(page.locator('[data-lidar-distance-value]')).toHaveText('60 m');
  await expect(page.locator('[data-lidar-range]')).toHaveText('60.0 m');
  await expect(page.locator('[data-lidar-time]').first()).toHaveText('约 400.3 ns');
  await expect(page.locator('[data-lidar-mode="assembly"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-lidar-scan-toggle]')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('[data-lidar-step="0"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-lidar-part-name]')).toHaveText('选择一个部件');
  await expect
    .poll(async () => (await matrix()).every((value, index) => Math.abs(value - homeMatrix[index]) < 0.0001))
    .toBe(true);
});

test('03 pauses automatic scanning on history without catching up hidden time', async ({ page }) => {
  await openLidar(page);
  await page.locator('[data-lidar-scan-toggle]').click();
  await navigate(page, 'history');
  const activeStep = page.locator('[data-lidar-step][aria-pressed="true"]');
  const pausedStep = await activeStep.getAttribute('data-lidar-step');
  await page.waitForTimeout(1800);
  expect(await activeStep.getAttribute('data-lidar-step')).toBe(pausedStep);
  await navigate(page, 'lidar');
  expect(await activeStep.getAttribute('data-lidar-step')).toBe(pausedStep);
  await expect(page.locator('[data-lidar-scan-toggle]')).toHaveAttribute('aria-pressed', 'true');
});

test('03 keeps its degraded model notice through modes, scanning and reset', async ({ page }) => {
  await page.route('**/VLP16_base_2.dae', (route) => route.fulfill({ status: 404, body: 'missing' }));
  await page.goto('/#lidar');
  await expect(page.locator('[data-page="lidar"]')).toHaveAttribute('data-asset-status', 'degraded');
  for (const mode of ['exploded', 'cutaway']) {
    await page.locator(`[data-lidar-mode="${mode}"]`).click();
    await expect(page.locator('[data-lidar-status]')).toContainText('仍可查看概念扫描演示');
  }
  await page.locator('[data-lidar-step="3"]').click();
  await expect(page.locator('[data-lidar-points]')).toHaveText('720 pts / 示意');
  await expect(page.locator('[data-lidar-status]')).toContainText('仍可查看概念扫描演示');
  await page.locator('[data-lidar-reset]').click();
  await expect(page.locator('[data-lidar-status]')).toContainText('仍可查看概念扫描演示');
});
