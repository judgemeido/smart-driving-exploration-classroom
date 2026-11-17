import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

// Development-only instrumentation; no inspector or counters are added to the website.
const browser = await chromium.launch({ channel: 'msedge' });
try {
  const page = await browser.newPage();
  await page.goto(`${process.env.PERFORMANCE_AUDIT_URL ?? 'http://127.0.0.1:5175'}/legacy.html?quality=low#explore`);
  await page.locator('[data-model-loading].is-complete').waitFor();
  if (await page.locator('[data-powerflow-story]').getAttribute('aria-hidden') === 'false') await page.locator('[data-powerflow-skip]').click();
  await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').map(entry => entry.name).find(url => /\/deps\/three\.js\?/.test(url));
    if (!url) throw new Error('Run this audit against the Vite development server.');
    const { Material } = await import(url);
    const clone = Material.prototype.clone, dispose = Material.prototype.dispose;
    window.materialAudit = { created: 0, disposed: 0 };
    Material.prototype.clone = function () { window.materialAudit.created++; return clone.call(this); };
    Material.prototype.dispose = function () { window.materialAudit.disposed++; return dispose.call(this); };
  });
  const snapshots = [];
  for (const focus of ['battery', 'cabin', 'adas', 'all']) {
    const before = await page.evaluate(() => ({ ...window.materialAudit }));
    await page.locator(`[data-focus="${focus}"]`).click();
    const after = await page.evaluate(() => ({ ...window.materialAudit }));
    snapshots.push({ focus, created: after.created - before.created, disposed: after.disposed - before.disposed });
  }
  const canvas = page.locator('#model-canvas'), box = await canvas.boundingBox();
  let point;
  for (const y of [.45, .55, .65]) {
    for (const x of [.4, .5, .6]) {
      await canvas.click({ position: { x: box.width * x, y: box.height * y } });
      if (await page.locator('[data-part-popup]').getAttribute('aria-hidden') === 'false') { point = { x: box.width * x, y: box.height * y }; break; }
    }
    if (point) break;
  }
  if (!point) throw new Error('Could not pick a car part for material lifetime auditing.');
  await page.locator('[data-part-popup-close]').click();
  const before = await page.evaluate(() => ({ ...window.materialAudit }));
  for (let i = 0; i < 10; i++) {
    await canvas.click({ position: point });
    await page.locator('[data-part-popup-close]').click();
  }
  const after = await page.evaluate(() => ({ ...window.materialAudit }));
  const report = { focusMaterials: snapshots, tenPickCloseCycles: { created: after.created - before.created, disposed: after.disposed - before.disposed } };
  if (report.tenPickCloseCycles.created !== report.tenPickCloseCycles.disposed) throw new Error('Selection materials leaked.');
  await writeFile('authoring/performance-tools/material-audit.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
