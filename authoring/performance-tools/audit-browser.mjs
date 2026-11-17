import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const base = process.env.PERFORMANCE_AUDIT_URL ?? 'http://127.0.0.1:5175';
const browser = await chromium.launch({ channel: 'msedge', args: ['--enable-unsafe-swiftshader'] });
const report = { conditions: 'Headless Edge, CPU throttled 4x, 2 CPU cores / 2 GB reported memory. GPU is not throttled and is identified in each case; not a physical low-end device benchmark.', cases: [] };
try {
  for (const config of [
    { name: 'desktop', viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 },
    { name: 'phone', viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  ]) {
    const context = await browser.newContext(config);
    const page = await context.newPage();
    page.setDefaultTimeout(90_000);
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 2 });
      Object.defineProperty(navigator, 'deviceMemory', { get: () => 2 });
    });
    await page.goto(`${base}/legacy.html#explore`);
    await page.locator('[data-model-loading].is-complete').waitFor();
    if (await page.locator('[data-powerflow-story]').getAttribute('aria-hidden') === 'false') await page.locator('[data-powerflow-skip]').click();
    const car = await page.locator('#model-canvas').evaluate(canvas => ({
      width: canvas.width, height: canvas.height, pixels: canvas.width * canvas.height,
      quality: canvas.dataset.renderQuality,
    }));
    await page.locator('[data-go="lidar"]').click();
    await page.locator('.lidar-exhibit-frame').waitFor();
    await page.waitForFunction(() => document.querySelector('iframe.lidar-exhibit-frame')?.contentWindow?.LD016?.state.ready);
    const frame = page.frames().find(f => f.url().includes('/lidar/index.html'));
    await page.waitForTimeout(1500);
    const sample = () => frame.evaluate(() => {
      const { renderer, showcase, state } = window.LD016;
      const gl = renderer.getContext();
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      return { frame: renderer.info.render.frame, calls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
        pixels: renderer.domElement.width * renderer.domElement.height, shadows: renderer.shadowMap.enabled,
        bloom: !!showcase.bloom, mode: state.mode, gpu: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unavailable' };
    });
    const before = await sample();
    const start = Date.now();
    await page.waitForTimeout(2000);
    const active = await sample();
    const elapsed = Date.now() - start;
    const rayPreparationUpdates = await frame.evaluate(() => {
      const lidar = window.LD016, original = lidar.scanScene.updateMatrixWorld;
      let count = 0;
      lidar.scanScene.updateMatrixWorld = function (...args) { count++; return original.apply(this, args); };
      try { lidar.scanAt(0, false); } finally { lidar.scanScene.updateMatrixWorld = original; }
      return count;
    });
    await frame.evaluate(() => document.querySelector('#rotate').click());
    let idleBefore, idleAfter;
    for (let attempt = 0; attempt < 12; attempt++) {
      idleBefore = await sample();
      await page.waitForTimeout(300);
      idleAfter = await sample();
      if (idleBefore.frame === idleAfter.frame) break;
    }
    const pausedRenderedFrames = idleAfter.frame - idleBefore.frame;
    await frame.evaluate(() => document.querySelector('#rotate').click());
    await page.locator('[data-go="history"]').click();
    const paused = await sample();
    await page.waitForTimeout(500);
    const afterPause = await sample();
    const transfers = () => performance.getEntriesByType('resource').filter(r => r.name.endsWith('.glb')).map(r => ({ name: r.name.split('/').pop(), bytes: r.decodedBodySize }));
    report.cases.push({ device: config.name, car, lidar: { ...active,
      observedFramesPerSecond: (active.frame - before.frame) * 1000 / elapsed,
      pausedRenderedFrames, rayPreparationUpdates,
      hiddenRenderedFrames: afterPause.frame - paused.frame },
      modelTransfers: [...await page.evaluate(transfers), ...await frame.evaluate(transfers)] });
    await page.screenshot({ path: `authoring/performance-tools/${config.name}-history.png` });
    await page.locator('[data-go="lidar"]').click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `authoring/performance-tools/${config.name}-lidar.png` });
    console.log(`${config.name} audit complete`);
    await context.close();
  }
  await writeFile('authoring/performance-tools/browser-audit.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
