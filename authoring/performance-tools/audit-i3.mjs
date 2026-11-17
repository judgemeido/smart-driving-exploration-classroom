import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

// Development-only instrumentation. CPU throttling is not an emulation of the target GPU.
const browser = await chromium.launch({ channel: 'msedge' });
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 4 });
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
  });
  await page.goto(`${process.env.PERFORMANCE_AUDIT_URL ?? 'http://127.0.0.1:5175'}/legacy.html?quality=auto#explore`);
  await page.locator('[data-model-loading].is-complete').waitFor({ timeout: 90000 });
  if (await page.locator('[data-powerflow-story]').getAttribute('aria-hidden') === 'false') await page.locator('[data-powerflow-skip]').click();
  await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').map(entry => entry.name).find(url => /\/deps\/three\.js\?/.test(url));
    if (!url) throw new Error('Run against the Vite dev server.');
    const { Scene } = await import(url);
    Scene.prototype.onAfterRender = function (renderer, scene, camera) {
      window.carAudit = { renderer, scene, camera,
        batched: { ...renderer.info.render } };
    };
  });
  await page.locator('[data-focus="all"]').click();
  await page.waitForFunction(() => window.carAudit);
  const cases = [];
  for (const focus of ['all', 'battery', 'cabin', 'adas']) {
    await page.locator(`[data-focus="${focus}"]`).click();
    await page.waitForTimeout(300);
    const result = await page.evaluate(() => {
      const a = window.carAudit, r = a.renderer;
      const batched = a.batched;
      // Render the untouched scene graph between animation frames for an exact same-camera baseline.
      r.render(a.scene, a.camera);
      const baseline = { ...r.info.render };
      const gl = r.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info');
      return { batched, baseline, pixels: r.domElement.width * r.domElement.height,
        gpu: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unavailable' };
    });
    cases.push({ focus, ...result });
  }
  await page.locator('[data-focus="all"]').click();
  await page.waitForTimeout(150);
  const images = await page.evaluate(async () => {
    const { renderer, scene, camera } = window.carAudit;
    const { createRigidBatches } = await import('/src/shared/rigid-batches.ts');
    renderer.render(scene, camera);
    const baseline = renderer.domElement.toDataURL('image/png');
    const batches = createRigidBatches(scene);
    batches.render(() => renderer.render(scene, camera));
    const batched = renderer.domElement.toDataURL('image/png');
    batches.dispose();
    return { baseline, batched };
  });
  for (const [name, data] of Object.entries(images)) await writeFile(`authoring/performance-tools/i3-${name}.png`, Buffer.from(data.split(',')[1], 'base64'));
  await page.locator('[data-focus="all"]').click();
  await page.locator('[data-explode-toggle]').click();
  await page.waitForTimeout(2200);
  await page.locator('[data-part-filter="drive"]').click();
  const canvas = page.locator('#model-canvas'), box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width * .5, box.y + box.height * .5);
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(300);
  const projected = await page.evaluate(() => {
    const { scene, camera } = window.carAudit, points = [];
    scene.updateMatrixWorld(true);
    scene.getObjectByName('EV_SUV').traverseVisible(mesh => {
      if (!mesh.isMesh) return;
      mesh.geometry.computeBoundingBox();
      const p = mesh.geometry.boundingBox.getCenter(camera.position.clone()).applyMatrix4(mesh.matrixWorld).project(camera);
      const x = (p.x + 1) / 2, y = (1 - p.y) / 2;
      if (x > .01 && x < .99 && y > .05 && y < .95 && p.z < 1) points.push({ x, y });
    });
    return points.sort((a, b) => Math.abs(a.x - .5) + Math.abs(a.y - .5) - Math.abs(b.x - .5) - Math.abs(b.y - .5));
  });
  const points = [...projected, ...[.55, .6, .65, .45, .75, .85].flatMap(y => [.03, .1, .2, .3, .4, .5, .6, .7, .8, .9, .97].map(x => ({ x, y })))];
  let selected = false;
  for (const point of points) {
      await canvas.click({ position: { x: box.width * point.x, y: box.height * point.y } });
      if (await page.locator('[data-part-popup]').getAttribute('aria-hidden') === 'false') {
        assert.match(await page.locator('[data-popup-part-facts]').textContent(), /电驱系统/, 'Picked an invisible part from a filtered-out assembly.');
        selected = true; break;
      }
  }
  if (!selected) {
    await page.screenshot({ path: 'authoring/performance-tools/i3-pick-failure.png' });
    throw new Error(`Exploded drive components could not be picked (${projected.length} projected candidates).`);
  }
  await page.locator('[data-part-popup-close]').click();
  await page.screenshot({ path: 'authoring/performance-tools/i3-exploded.png' });
  const report = { conditions: '4 logical threads / 8 GB reported, CPU throttled 4x. Physical GPU listed per case; this is not an i3-1115G4 hardware benchmark.',
    cases, explodedDrivePicking: selected };
  assert.ok(cases[0].batched.calls < cases[0].baseline.calls * .5, 'Expected substantial draw submission savings in the assembled view.');
  for (const entry of cases) {
    assert.equal(entry.batched.triangles, entry.baseline.triangles, 'Batching changed the visible triangle count.');
    assert.ok(entry.pixels <= 600000, 'Exceeded integrated-graphics framebuffer budget.');
  }
  await writeFile('authoring/performance-tools/i3-audit.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
