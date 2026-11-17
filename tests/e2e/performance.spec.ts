import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 2 });
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 2 });
  });
});

test('history uses responsive photos and does not preload any 3D models or Three renderer', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => requests.push(request.url()));
  await page.goto('/legacy.html#history');
  await expect(page.locator('html')).toHaveAttribute('data-performance-quality', 'low');
  await expect(page.locator('[data-archive-article]')).toHaveCount(23);
  const photo = page.locator('.archive-article picture img').first();
  await photo.scrollIntoViewIfNeeded();
  await expect.poll(() => photo.evaluate(img => (img as HTMLImageElement).currentSrc)).toContain('.webp');
  expect(requests.some(url => /\.glb|three-renderer|three-core/.test(url))).toBe(false);
  await expect(page.locator('[data-quality-select]')).toBeVisible();
});

test('car keeps opening, lights, focus and exploded filters with a bounded low-power buffer', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => requests.push(request.url()));
  await page.goto('/legacy.html#explore');
  await expect(page.locator('[data-model-loading]')).toHaveClass(/is-complete/, { timeout: 30000 });
  const canvas = page.locator('#model-canvas');
  await expect(canvas).toHaveAttribute('data-render-quality', 'low');
  const pixels = await canvas.evaluate(c => (c as HTMLCanvasElement).width * (c as HTMLCanvasElement).height);
  expect(pixels).toBeLessThanOrEqual(600_000);
  expect(requests.some(url => url.endsWith('/yaojing-s9-optimized-compressed.glb'))).toBe(true);
  expect(requests.some(url => url.endsWith('/yaojing-s9-optimized.glb'))).toBe(false);
  if (await page.locator('[data-powerflow-story]').getAttribute('aria-hidden') === 'false')
    await page.locator('[data-powerflow-skip]').click();
  for (const action of ['doors', 'tailgate', 'lights']) {
    const button = page.locator(`[data-model-action="${action}"]`);
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
  }
  await page.locator('[data-focus="battery"]').click();
  await expect(page.locator('[data-focus="battery"]')).toHaveAttribute('aria-selected', 'true');
  await page.locator('[data-explode-toggle]').click();
  await expect(page.locator('[data-explode-toggle]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-part-filter="drive"]').click();
  await expect(page.locator('[data-part-filter-count]')).toContainText('电驱');
  await page.locator('[data-quality-select]').selectOption('high');
  await expect(canvas).toHaveAttribute('data-render-quality', 'high');
});

test('lidar keeps its twelve subsystems and scanning while stopping hidden rendering', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/legacy.html#lidar');
  const frame = page.frameLocator('.lidar-exhibit-frame');
  await expect(frame.locator('#loading')).toBeAttached();
  await expect(frame.locator('#loading')).toBeHidden({ timeout: 30000 });
  await expect(frame.locator('#part-grid button')).toHaveCount(12);
  await expect(frame.locator('#model-view canvas')).toHaveAttribute('data-render-quality', 'low');
  const context = page.frames().find(frame => frame.url().includes('/lidar/index.html'))!;
  await context.waitForFunction(() => (window as any).LD016?.state.ready);
  expect(await context.evaluate(() => !(window as any).LD016.showcase.bloom && !(window as any).LD016.renderer.shadowMap.enabled)).toBe(true);
  await frame.locator('[data-mode="exploded"]').click();
  await expect.poll(() => context.evaluate(() => (window as any).LD016.state.explode)).toBe(1);
  await frame.locator('[data-part="timing_board"]').click();
  await expect(frame.locator('#info-title')).toHaveText('测距处理板');
  await frame.locator('[data-mode="scan"]').click();
  await expect(frame.locator('#scan-view canvas')).toBeVisible();
  await frame.locator('#single-pulse').click();
  await expect(frame.locator('#hit-distance')).not.toHaveText('—');
  await page.locator('[data-go="history"]').click();
  const before = await context.evaluate(() => (window as any).LD016.renderer.info.render.frame);
  await page.waitForTimeout(300);
  expect(await context.evaluate(() => (window as any).LD016.renderer.info.render.frame)).toBe(before);
  await page.locator('[data-go="lidar"]').click();
  await expect.poll(() => context.evaluate(() => (window as any).LD016.renderer.info.render.frame)).toBeGreaterThan(before);
  await page.locator('[data-quality-select]').selectOption('high');
  await expect.poll(() => context.evaluate(() => !!(window as any).LD016.showcase.bloom)).toBe(true);
  expect(errors).toEqual([]);
});

test('an unavailable compressed car falls back to the intact original model', async ({ page }) => {
  await page.route('**/assets/yaojing-s9-optimized-compressed.glb', route => route.fulfill({ status: 404 }));
  const original = page.waitForResponse(response => response.url().endsWith('/yaojing-s9-optimized.glb') && response.ok());
  await page.goto('/legacy.html#explore');
  await original;
  await expect(page.locator('[data-model-loading]')).toHaveClass(/is-complete/, { timeout: 30000 });
  await expect(page.locator('#model-canvas')).toBeVisible();
});

test('paused lidar stops drawing, then wakes for picking, orbit, measurement and point updates', async ({ page }) => {
  await page.goto('/lidar/index.html?quality=low');
  await page.waitForFunction(() => (window as any).LD016?.state.ready);
  if (await page.evaluate(() => (window as any).LD016.state.running)) await page.locator('#rotate').click();
  const frames = () => page.evaluate(() => (window as any).LD016.renderer.info.render.frame);
  await expect.poll(async () => { const before = await frames(); await page.waitForTimeout(250); return (await frames()) - before; }, { timeout: 10000 }).toBe(0);
  const before = await frames();
  await page.locator('[data-mode="cutaway"]').click();
  await page.locator('[data-part="timing_board"]').click();
  await expect(page.locator('#info-title')).toHaveText('测距处理板');
  await expect.poll(frames).toBeGreaterThan(before);
  const canvas = page.locator('#model-view canvas');
  const box = (await canvas.boundingBox())!;
  const position = await page.evaluate(() => (window as any).LD016.stageCamera.position.toArray());
  await page.mouse.move(box.x + box.width * .6, box.y + box.height * .5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * .7, box.y + box.height * .55, { steps: 8 });
  await page.mouse.up();
  expect(await page.evaluate(() => (window as any).LD016.stageCamera.position.toArray())).not.toEqual(position);
  await page.locator('[data-mode="scan"]').click();
  await page.locator('#scan-view canvas').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);
  const measurement = await page.evaluate(() => {
    const lidar = (window as any).LD016, scene = lidar.scanScene;
    const update = scene.updateMatrixWorld;
    let updates = 0;
    scene.updateMatrixWorld = function (...args: any[]) { updates++; return update.apply(this, args); };
    let ray;
    try { ray = lidar.scanAt(0, false); } finally { scene.updateMatrixWorld = update; }
    const far = (ray.hit.distance + ray.returnLength) / 2;
    lidar.obstacle.visible = true;
    const blocked = lidar.channelRay(lidar.state.channel, 0);
    lidar.obstacle.visible = false;
    return { updates, far, near: (blocked.hit.distance + blocked.returnLength) / 2, target: blocked.hit.object.userData.target };
  });
  expect(measurement.updates).toBe(1);
  expect(measurement.near).toBeLessThan(measurement.far);
  expect(measurement.target).toBe('近处遮挡板');
  await page.locator('#wall-distance').fill('7');
  await expect(page.locator('#wall-value')).toHaveText('7.0 m');
  await page.locator('#single-pulse').click();
  await expect(page.locator('#hit-distance')).not.toHaveText('—');
  await expect.poll(() => page.evaluate(() => (window as any).LD016.state.pulse.t)).toBe(1.8);
  const scanFrames = () => page.evaluate(() => (window as any).LD016.scanRenderer.info.render.frame);
  await expect.poll(async () => { const before = await scanFrames(); await page.waitForTimeout(250); return (await scanFrames()) - before; }, { timeout: 10000 }).toBe(0);
  await page.evaluate(() => {
    const lidar = (window as any).LD016, gl = lidar.scanRenderer.getContext();
    const original = gl.bufferSubData;
    (window as any).pointUploads = [];
    gl.bufferSubData = function (...args: any[]) {
      const array = args[2], count = args[4];
      (window as any).pointUploads.push(count === undefined ? array.byteLength : count * array.BYTES_PER_ELEMENT);
      return original.apply(this, args);
    };
    lidar.clearCloud();
    lidar.scanAt(0, true);
  });
  await expect.poll(() => page.evaluate(() => (window as any).pointUploads.length)).toBeGreaterThan(0);
  expect(await page.evaluate(() => Math.max(...(window as any).pointUploads))).toBeLessThan(2000);
});

test('mobile keeps navigation usable and fits all chapters at high device pixel ratio', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/legacy.html#history');
  await expect(page.locator('[data-quality-select]')).toBeVisible();
  for (const id of ['history', 'explore', 'lidar', 'traffic']) {
    await page.locator(`[data-go="${id}"]`).click();
    await expect(page.locator(`[data-page="${id}"]`)).toHaveAttribute('data-status', 'ready');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await expect(page.locator('[data-quality-select]')).toBeInViewport();
    expect(await page.locator('[data-quality-select]').evaluate(select => {
      const box = select.getBoundingClientRect();
      return document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2) === select;
    })).toBe(true);
  }
});
