import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const evidence = path.resolve('.superpowers/sdd/2026-11-08-science-activities/screenshots');
for (const [width, height] of [
  [1440, 900],
  [1366, 768],
  [1024, 768],
  [768, 1024],
  [390, 844],
  [320, 568],
]) {
  for (const activity of ['history', 'structure', 'sensor'])
    test(`${activity} workbench at ${width}x${height}`, async ({ page }) => {
      await mkdir(evidence, { recursive: true });
      await page.setViewportSize({ width, height });
      await page.goto(`/games/${activity}/index.html`);
      await page.getByRole('button', { name: '开始练习', exact: true }).click();
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => scrollTo(0, 0));
      const metrics = await page.evaluate(() => {
        const elements = [
          ...document.querySelectorAll<HTMLElement>(
            '[data-game-host] button, [data-game-host] select, [data-game-host] summary',
          ),
        ].filter((el) => el.getBoundingClientRect().height > 0);
        const boxes = elements.map((el) => {
          const box = el.getBoundingClientRect();
          return {
            text: el.textContent?.trim().slice(0, 80),
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height,
            fontSize: getComputedStyle(el).fontSize,
          };
        });
        const primary = document.querySelector<HTMLElement>(
          '[data-hl-primary], [data-structure-primary], [data-command="primary"]',
        );
        const box = primary?.getBoundingClientRect();
        return {
          width: innerWidth,
          height: innerHeight,
          scrollWidth: document.documentElement.scrollWidth,
          primary: box ? { top: box.top, bottom: box.bottom } : null,
          controls: boxes,
        };
      });
      await writeFile(path.join(evidence, `${activity}-${width}.json`), JSON.stringify(metrics, null, 2));
      await page.screenshot({ path: path.join(evidence, `${activity}-${width}.png`), fullPage: true });
      expect(metrics.scrollWidth).toBeLessThanOrEqual(width);
      if (width >= 1200)
        expect(metrics.primary?.bottom, 'main action fits the first viewport').toBeLessThanOrEqual(height);
    });
}
