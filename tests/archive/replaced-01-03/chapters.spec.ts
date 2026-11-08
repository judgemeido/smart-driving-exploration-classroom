import { expect, test, type Page } from '@playwright/test';

async function navigate(page: Page, id: string, status = 'ready') {
  if (await page.locator('[data-menu-button]').isVisible()) await page.locator('[data-menu-button]').click();
  await page.locator(`[data-go="${id}"]`).click();
  await expect(page.locator(`[data-page="${id}"]`)).toHaveAttribute('data-status', status);
}

test('hidden chapters and background pages stop making WebGL draw calls', async ({ page }) => {
  await page.addInitScript(() => {
    const counts: Record<string, number> = {};
    (window as unknown as { __drawCounts: typeof counts }).__drawCounts = counts;
    const prototype = WebGL2RenderingContext.prototype as unknown as Record<string, Function>;
    for (const name of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
      const original = prototype[name];
      prototype[name] = function (this: WebGL2RenderingContext, ...args: unknown[]) {
        const id = (this.canvas as HTMLCanvasElement).closest<HTMLElement>('[data-page]')?.dataset.page;
        if (id) counts[id] = (counts[id] ?? 0) + 1;
        return Reflect.apply(original, this, args);
      };
    }
  });
  const counts = () =>
    page.evaluate(() => ({
      ...(window as unknown as { __drawCounts: Record<string, number> }).__drawCounts,
    }));
  await page.goto('/#lidar');
  await expect.poll(async () => (await counts()).lidar ?? 0).toBeGreaterThan(0);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
  const paused = await counts();
  await page.waitForTimeout(200);
  expect(await counts()).toEqual(paused);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await expect.poll(async () => (await counts()).lidar).toBeGreaterThan(paused.lidar);
  await navigate(page, 'explore');
  await expect(page.locator('[data-model-status]')).toHaveText('LIVE / READY', { timeout: 30000 });
  await expect.poll(async () => (await counts()).explore ?? 0).toBeGreaterThan(0);
  const hiddenLidar = (await counts()).lidar;
  await page.waitForTimeout(200);
  expect((await counts()).lidar).toBe(hiddenLidar);
  await navigate(page, 'traffic');
  await expect.poll(async () => (await counts()).traffic ?? 0).toBeGreaterThan(0);
  await navigate(page, 'history');
  const allPaused = await counts();
  await page.waitForTimeout(200);
  expect(await counts()).toEqual(allPaused);
});

test('mobile chapter tabs navigate 03 and 01 with a single active chapter', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#history');
  await expect(page.locator('[data-chapter-total]')).toHaveText('04');
  for (const id of ['history', 'explore', 'lidar', 'traffic']) {
    await expect(page.locator(`[data-go="${id}"]`)).toBeVisible();
  }
  await navigate(page, 'lidar');
  await expect(page.locator('[data-chapter-number]')).toHaveText('03');
  await expect(page.locator('[data-page].is-active')).toHaveCount(1);
  await expect(page.locator('[data-page="lidar"]')).toHaveAttribute('aria-hidden', 'false');
  await navigate(page, 'history');
  await expect(page.locator('[data-chapter-number]')).toHaveText('01');
  await expect(page.locator('[data-page="lidar"]')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('[data-page].is-active')).toHaveCount(1);
  await page.locator('[data-go="history"]').click();
  await expect(page.locator('[data-menu-button]')).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('[data-chapter-menu]')).not.toHaveClass(/is-open/);
});

test('page teardown releases scene GPU buffers and shadow render targets', async ({ page }) => {
  await page.addInitScript(() => {
    const counts = {
      Buffer: { created: 0, deleted: 0 },
      Framebuffer: { created: 0, deleted: 0 },
      Renderbuffer: { created: 0, deleted: 0 },
      Texture: { created: 0, deleted: 0 },
    };
    (window as unknown as { __resourceCounts: typeof counts }).__resourceCounts = counts;
    const prototype = WebGL2RenderingContext.prototype as unknown as Record<string, Function>;
    for (const kind of Object.keys(counts) as (keyof typeof counts)[]) {
      for (const operation of ['create', 'delete'] as const) {
        const original = prototype[`${operation}${kind}`];
        prototype[`${operation}${kind}`] = function (this: WebGL2RenderingContext, ...args: unknown[]) {
          const result = Reflect.apply(original, this, args);
          if (operation === 'create' ? result !== null : args[0] !== null) {
            counts[kind][operation === 'create' ? 'created' : 'deleted'] += 1;
          }
          return result;
        };
      }
    }
  });
  await page.goto('/#explore');
  await expect(page.locator('[data-model-status]')).toHaveText('LIVE / READY', { timeout: 30000 });
  await navigate(page, 'lidar');
  await expect(page.locator('[data-lidar-status]')).toHaveText('装配模型已就绪', { timeout: 30000 });
  await navigate(page, 'traffic');
  await page.waitForLoadState('networkidle');
  const releasedContexts = await page.evaluate(() => {
    const contexts = [...document.querySelectorAll<HTMLCanvasElement>('[data-page] canvas')]
      .map((canvas) => canvas.getContext('webgl2'))
      .filter((context): context is WebGL2RenderingContext => context !== null);
    window.dispatchEvent(new PageTransitionEvent('pagehide'));
    return contexts.map((context) => context.isContextLost());
  });
  expect(releasedContexts).toEqual([true, true, true]);
  const counts = await page.evaluate(
    () =>
      (window as unknown as { __resourceCounts: Record<string, { created: number; deleted: number }> })
        .__resourceCounts,
  );
  for (const kind of ['Buffer', 'Renderbuffer']) {
    expect(counts[kind].created, kind).toBeGreaterThan(0);
    expect(counts[kind].deleted, kind).toBe(counts[kind].created);
  }
  // Three's scratch framebuffers/placeholders go with context loss; scene targets release explicitly.
  expect(counts.Framebuffer.deleted).toBeGreaterThan(0);
  expect(counts.Texture.deleted).toBeGreaterThan(0);
});

test('a failed chapter code chunk keeps navigation usable and recovers after reload', async ({ page }) => {
  let attempts = 0;
  await page.route('**/chapter-explore-*.js', (route) => {
    attempts += 1;
    return attempts === 1 ? route.fulfill({ status: 503, body: 'temporary code failure' }) : route.continue();
  });
  await page.goto('/#explore');
  await expect(page.locator('[data-page="explore"]')).toHaveAttribute('data-status', 'error');
  await navigate(page, 'history');
  await navigate(page, 'explore', 'error');
  await page.locator('[data-chapter-retry="explore"]').click();
  await expect(page.locator('[data-model-status]')).toHaveText('LIVE / READY', { timeout: 30000 });
  expect(attempts).toBe(2);
});

test('history loads without 3D code or models; navigation supports back and unknown hashes', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.goto('/');
  await expect(page.locator('[data-archive-article]')).toHaveCount(14);
  expect(requests.some((url) => /three-|\.glb|\.dae/.test(url))).toBe(false);
  await expect(page.locator('[data-chapter-number]')).toHaveText('01');
  await navigate(page, 'lidar');
  await expect(page.locator('[data-chapter-number]')).toHaveText('03');
  await page.goBack();
  await expect(page.locator('[data-page="history"]')).toHaveClass(/is-active/);
  await page.goForward();
  await expect(page.locator('[data-page="lidar"]')).toHaveClass(/is-active/);
  await page.evaluate(() => {
    location.hash = '#unknown';
  });
  await expect(page).toHaveURL(/#history$/);
  await expect(page.locator('[data-page].is-active')).toHaveCount(1);
});

test('02 retains model controls, filters and the three-target game', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/#explore');
  await expect(page.locator('[data-model-status]')).toHaveText('LIVE / READY', { timeout: 30000 });
  await page.locator('[data-powerflow-skip]').click();
  await page.locator('[data-focus="battery"]').click();
  await expect(page.locator('[data-focus-title]')).toHaveText('电池系统');
  await page.locator('[data-explode-toggle]').click();
  await page.locator('[data-part-filter="energy"]').click();
  await expect(page.locator('[data-part-filter-count]')).toContainText('能源系统');
  await page.locator('[data-disassembly-start]').click();
  await expect(page.locator('[data-disassembly-panel]')).toHaveClass(/is-visible/);
  await expect(page.locator('[data-disassembly-progress]')).toHaveText('0 / 3');
  await expect(page.locator('[data-disassembly-target]')).toHaveText('动力电池包');
  await page.locator('[data-disassembly-exit]').click();
  await expect(page.locator('[data-disassembly-panel]')).not.toHaveClass(/is-visible/);
  expect(errors).toEqual([]);
});

test('03 retains assembly modes, scanning and distance measurement', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/#lidar');
  await expect(page.locator('[data-lidar-status]')).toHaveText('装配模型已就绪', { timeout: 30000 });
  await page.locator('[data-lidar-mode="exploded"]').click();
  await expect(page.locator('[data-lidar-mode="exploded"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-lidar-mode="cutaway"]').click();
  await page.locator('[data-lidar-scan-toggle]').click();
  await page.locator('[data-lidar-distance]').evaluate((slider: HTMLInputElement) => {
    slider.value = '60';
  });
  await page.locator('[data-lidar-distance]').dispatchEvent('input');
  await expect(page.locator('[data-lidar-distance-value]')).toContainText('60');
  await expect(page.locator('[data-lidar-time]').first()).toContainText('400');
  expect(errors).toEqual([]);
});

test('03 still offers the concept demo when a licensed asset is missing', async ({ page }) => {
  await page.route('**/VLP16_base_2.dae', (route) => route.fulfill({ status: 404, body: 'missing' }));
  await page.goto('/#lidar');
  await expect(page.locator('[data-lidar-status]')).toContainText('仍可查看概念扫描演示');
  await page.locator('[data-lidar-scan-toggle]').click();
  await expect(page.locator('[data-lidar-scan-hud]')).toHaveClass(/is-visible/);
  await navigate(page, 'history');
  await expect(page.locator('[data-archive-article]')).toHaveCount(14);
});

test('02 recovers a failed model request with an explicit retry', async ({ page }) => {
  let attempts = 0;
  await page.route('**/yaojing-s9-optimized.glb', (route) => {
    attempts += 1;
    return attempts === 1 ? route.fulfill({ status: 503, body: 'temporary' }) : route.continue();
  });
  await page.goto('/#explore');
  await expect(page.locator('.model-loading .asset-retry')).toBeVisible();
  await page.locator('.model-loading .asset-retry').click();
  await expect(page.locator('[data-model-status]')).toHaveText('LIVE / READY', { timeout: 30000 });
  expect(attempts).toBe(2);
});

test('context loss isolates one chapter and retry creates a fresh canvas', async ({ page }) => {
  await page.goto('/#lidar');
  await expect(page.locator('[data-page="lidar"]')).toHaveAttribute('data-status', 'ready');
  await page
    .locator('[data-lidar-canvas]')
    .evaluate((canvas) => canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })));
  await expect(page.locator('[data-page="lidar"]')).toHaveAttribute('data-status', 'error');
  await navigate(page, 'history');
  await expect(page.locator('[data-archive-article]')).toHaveCount(14);
  await navigate(page, 'lidar', 'error');
  await page.locator('[data-chapter-retry="lidar"]').click();
  await expect(page.locator('[data-page="lidar"]')).toHaveAttribute('data-status', 'ready');
  await expect(page.locator('[data-lidar-canvas]')).toHaveCount(1);
});

test('04 renders all eight scenarios and pauses answer continuation outside the chapter', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/yaojing-s9.glb', (route) => route.fulfill({ status: 404, body: 'missing' }));
  await page.goto('/#traffic');
  await expect(page.locator('[data-page="traffic"]')).toHaveAttribute('data-status', 'ready');
  await expect(page.locator('[data-traffic-progress]').first()).toHaveText('0 / 8');
  await page.clock.install();
  await page.locator('[data-traffic-start]').click();
  await page.clock.runFor(6000);
  await expect(page.locator('[data-traffic-title]')).toHaveText('前方红灯亮了，应该怎么做？');
  await page.locator('[data-traffic-options] button[data-correct="true"]').click();
  await navigate(page, 'history');
  await page.clock.runFor(5000);
  await navigate(page, 'traffic');
  await expect(page.locator('[data-traffic-progress]').first()).toHaveText('1 / 8');
  await expect(page.locator('[data-traffic-feedback]')).toContainText('答对了');
  await page.clock.runFor(2400);
  await expect(page.locator('[data-traffic-state]')).toContainText('车辆继续自动行驶');
  expect(errors).toEqual([]);
});
