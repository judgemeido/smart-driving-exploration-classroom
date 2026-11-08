import { expect, test } from '@playwright/test';

test('new classroom entry starts with battery while old vehicle links remain available', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-prediction]')).toBeVisible();
  await expect(page.locator('[data-section="battery"]')).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('[data-section]').first()).toHaveAttribute('data-section', 'battery');
  await page.goto('/#history/H2');
  await page.locator('.lab-brand').click();
  await expect(page).toHaveURL(/#battery\/B1$/);
  await page.goto('/#battery/B1');
  await expect(page.locator('[data-prediction]')).toBeVisible();
  await expect(page.locator('textarea,input[type="text"],input[type="number"],[contenteditable="true"]')).toHaveCount(0);
  for (const route of ['history/H1', 'history/H2', 'explore/E1', 'lidar/S1']) {
    await page.goto(`/#${route}`);
    await expect(page.locator('[data-prediction]')).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`#${route}$`));
  }
});

test('battery lesson saves a click-only experiment and restores its evidence', async ({ page }) => {
  await page.goto('/#battery/B1');
  const prediction = page.locator('[data-prediction] input[type="radio"]').first();
  await prediction.check();
  const chosen = await prediction.inputValue();
  await page.getByRole('button', { name: '操作', exact: true }).click();
  for (const name of ['铅酸电池', '镍氢电池', '磷酸铁锂电池', '三元锂电池']) {
    const type = page.getByRole('button', { name: new RegExp(name) });
    await type.click();
    await expect(type).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.battery-facts h3')).toHaveText(name);
  }
  await page.getByRole('button', { name: '连接充电器', exact: true }).click();
  await expect(page.locator('.battery-direction')).toContainText('充电器 → 电池');
  await page.locator('[data-run]').click();
  await expect(page.locator('[data-evidence-run]')).toHaveCount(1);
  await page.getByRole('button', { name: '操作', exact: true }).click();
  await page.getByRole('button', { name: '给用电器供电', exact: true }).click();
  await expect(page.locator('.battery-direction')).toContainText('电池 → 用电器');
  await page.locator('[data-run]').click();
  await expect(page.locator('[data-evidence-run]')).toHaveCount(1);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('science-learning:portfolio:v1')!).records.B1);
  expect(saved.runs).toHaveLength(2);
  expect(saved.runs.map((run: { draft: { flow: string } }) => run.draft.flow)).toEqual(['charge', 'discharge']);
  expect(saved.runs[0].evidence.summary.length).toBeGreaterThan(0);
  await page.reload();
  await expect(page.locator(`[data-prediction] input[value="${chosen}"]`)).toBeChecked();
  await page.getByRole('button', { name: '证据', exact: true }).click();
  await expect(page.locator('[data-evidence-run]')).toHaveCount(1);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('science-learning:portfolio:v1')!).records.B1.runs.length)).toBe(2);
});

test('battery primary controls fit classroom screens and remain keyboard reachable on mobile', async ({ page }) => {
  for (const viewport of [{ width: 1280, height: 720 }, { width: 1366, height: 768 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/#battery/B1');
    for (const name of ['预测', '操作', '证据', '发现']) {
      await page.getByRole('button', { name, exact: true }).click();
      expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 2)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    }
    await page.getByRole('button', { name: '操作', exact: true }).click();
    const run = await page.locator('[data-run]').boundingBox();
    expect(run).not.toBeNull();
    expect(run!.y + run!.height).toBeLessThanOrEqual(viewport.height);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#battery/B1');
  const operate = page.getByRole('button', { name: '操作', exact: true });
  await operate.focus();
  await page.keyboard.press('Enter');
  await expect(operate).toHaveAttribute('aria-current', 'step');
  await expect(page.locator('[data-run]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
