import { chromium } from 'file:///C:/Users/shangguan/.codex/skills/teardown/node_modules/playwright/index.mjs';
import { writeFile } from 'node:fs/promises';

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const failures = [];
const report = [];
for (const viewport of [{ width: 1440, height: 960 }, { width: 768, height: 1024 }, { width: 390, height: 844 }]) {
  const page = await browser.newPage({ viewport });
  page.on('pageerror', error => failures.push(String(error)));
  page.on('response', response => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
  await page.goto('http://localhost:5175/legacy.html#history');
  await page.locator('#archive-2025-saic').waitFor();
  const cards = page.locator('[data-archive-article]');
  for (const card of await cards.all()) {
    await card.scrollIntoViewIfNeeded();
    await card.locator('img').evaluateAll(async images => Promise.all(images.map(image => image.decode())));
  }
  const audit = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('[data-archive-article]')];
    const images = cards.flatMap(card => [...card.querySelectorAll('img')]);
    return {
      count: cards.length,
      imageCount: images.length,
      uniqueImages: new Set(images.map(image => image.src)).size,
      imagesLoaded: images.every(image => image.complete && image.naturalWidth > 0),
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      imageLinks: cards.reduce((n, card) => n + card.querySelectorAll('a').length, 0),
      hiddenForeignAssets: images.filter(image => /sensor-lidar-(car|unit)/.test(image.src)).length,
      dates: cards.map(card => card.querySelector('.archive-article__year').textContent),
      himaBadges: cards.filter(card => /archive-202[1345]-(aito|hima|stelato|maextro|saic)/.test(card.id)).map(card => card.querySelector('.archive-article__badge').textContent),
      creditLabels: /资料来源|图片署名|Wikimedia|CC BY/.test(document.querySelector('[data-history-archive-list]').textContent),
      galleryColumns: getComputedStyle(document.querySelector('.archive-list')).gridTemplateColumns,
      mainlineStops: [...document.querySelectorAll('.history-mainline__stop strong')].map(el => el.textContent),
      mainlineExhibits: document.querySelectorAll('.archive-article--mainline').length,
      companionExhibits: ['archive-2018-nio', 'archive-2019-li', 'archive-2020-byd', 'archive-2021-geely'].every(id => document.getElementById(id)),
      namesInArticle: ['比亚迪', '蔚来', '吉利', '小鹏', '理想', '零跑', '小米', '长安', '奇瑞', '上汽', '北汽', '江汽', '东风', '广汽埃安', '五菱', '红旗'].every(name => document.querySelector('#archive-2020s .archive-article__copy').textContent.includes(name)),
    };
  });
  if (audit.count !== 23 || audit.uniqueImages !== 22 || !audit.imagesLoaded || audit.overflow || audit.imageLinks || audit.hiddenForeignAssets || audit.creditLabels || audit.himaBadges.length !== 5 || audit.mainlineExhibits !== 5 || audit.mainlineStops.length !== 5 || !audit.companionExhibits || !audit.namesInArticle) failures.push(JSON.stringify(audit));
  await page.locator('.history-mainline__stop[data-timeline-target="archive-2023-hima"]').click();
  await page.waitForTimeout(1800);
  await page.screenshot({ path: new URL(`history-hima-${viewport.width}.png`, import.meta.url).pathname.replace(/^\/(C:)/, '$1') });
  audit.navigationVisible = await page.locator('#archive-2023-hima').evaluate(el => { const r = el.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; });
  if (!audit.navigationVisible) failures.push(`Timeline navigation failed at ${viewport.width}`);
  await page.locator('.history-mainline').scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({ path: new URL(`history-mainline-${viewport.width}.png`, import.meta.url).pathname.replace(/^\/(C:)/, '$1') });
  report.push({ width: viewport.width, ...audit });
  await page.close();
}
await browser.close();
await writeFile(new URL('validation.json', import.meta.url), JSON.stringify({ report, failures }, null, 2));
console.log(JSON.stringify({ report, failures }, null, 2));
if (failures.length) process.exitCode = 1;
