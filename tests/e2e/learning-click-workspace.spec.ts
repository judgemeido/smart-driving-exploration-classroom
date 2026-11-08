import { expect, test } from '@playwright/test';

const routes = ['history/H1', 'history/H2', 'explore/E1', 'explore/E2', 'lidar/S1', 'lidar/S2', 'lidar/S3'];

test('learning requires only clicking and keeps a selected prediction after reload', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/#lidar/S2');
  await expect(
    page.locator('textarea,input[type="text"],input[type="number"],[contenteditable="true"]'),
  ).toHaveCount(0);
  const prediction = page.locator('[data-prediction] input[type="radio"]').first();
  await prediction.check();
  const value = await prediction.inputValue();
  await page.getByRole('button', { name: '操作', exact: true }).click();
  await page.locator('[data-run]').click();
  await expect(page.locator('[data-evidence-run]')).toHaveCount(1);
  const evidenceActions = await page.locator('[data-panel="evidence"] .step-actions').boundingBox();
  expect(evidenceActions!.y + evidenceActions!.height).toBeLessThanOrEqual(720);
  await page.getByRole('button', { name: '发现', exact: true }).click();
  const explanation = page.locator('[data-explanation] input[type="radio"]').first();
  await explanation.check();
  const chosen = await explanation.inputValue();
  await page.locator('[data-complete]').click();
  await expect(page.locator('[data-saved]')).toContainText('已记入');
  await page.reload();
  await expect(page.locator(`[data-prediction] input[value="${value}"]`)).toBeChecked();
  await page.getByRole('button', { name: '发现', exact: true }).click();
  await expect(page.locator(`[data-explanation] input[value="${chosen}"]`)).toBeChecked();
});

test('every activity exposes a complete compact workspace on classroom screens', async ({ page }) => {
  for (const viewport of [
    { width: 1366, height: 768 },
    { width: 1280, height: 720 },
  ]) {
    await page.setViewportSize(viewport);
    for (const route of routes) {
      await page.goto(`/#${route}`);
      await expect(page.locator('.lesson-steps')).toBeVisible();
      await expect(page.locator('textarea,input[type="text"],input[type="number"]')).toHaveCount(0);
      for (const name of ['预测', '操作', '证据', '发现']) {
        await page.getByRole('button', { name, exact: true }).click();
        expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 2)).toBe(
          true,
        );
        const model = await page.locator('[data-model-stage]').boundingBox();
        expect(model!.height).toBeGreaterThan(230);
        if (name === '操作') {
          const action = await page.locator('[data-run]').boundingBox();
          expect(action!.y + action!.height).toBeLessThanOrEqual(viewport.height);
        }
      }
    }
  }
});

test('prediction is an explicit choice and keyboard step navigation moves focus', async ({ page }) => {
  await page.goto('/#lidar/S2');
  await page.getByRole('button', { name: '操作', exact: true }).click();
  await page.locator('[data-run]').click();
  await expect(page.locator('[data-prediction]')).toBeVisible();
  await expect(page.locator('[data-prediction] input').first()).toBeFocused();
  const tab = page.getByRole('button', { name: '操作', exact: true });
  await tab.focus();
  await page.keyboard.press('Enter');
  await expect(tab).toHaveAttribute('aria-current', 'step');
});

test('mobile and enlarged text reflow without hiding the learning controls', async ({ page }) => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 640, height: 720 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/#lidar/S2');
    await page.getByRole('button', { name: '操作', exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await expect(page.locator('[data-run]')).toBeVisible();
    await expect(page.getByRole('slider', { name: '目标前表面距离', exact: true })).toBeVisible();
  }
});

test('knowledge questions and reviewed corrections fit the classroom viewport without typing', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  for (const id of ['Q1', 'Q2']) {
    await page.goto(`/#knowledge/${id}`);
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: new RegExp(`第${i + 1}题 ·`) }).click();
      await page.getByRole('radio').first().check();
    }
    await page.getByRole('button', { name: '提交首次作答', exact: true }).click();
    await page.getByRole('button', { name: '主动查看讲评', exact: true }).click();
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: new RegExp(`第${i + 1}题 ·`) }).click();
      await expect(page.locator('textarea,input[type="text"],input[type="number"]')).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 2)).toBe(true);
      await expect(page.locator('#knowledge-correction')).toBeVisible();
    }
  }
});

test('H1 can order all five sources and save a supported finding entirely by clicking', async ({ page }) => {
  await page.goto('/#history/H1');
  await page.locator('[data-prediction] input').first().check();
  await page.getByRole('button', { name: '操作', exact: true }).click();
  const cards = page.getByRole('combobox', { name: '查看档案与位置', exact: true });
  const ordered = await cards.locator('option').evaluateAll((options) =>
    options
      .map((option) => ({
        value: (option as HTMLOptionElement).value,
        year: Number(option.textContent!.match(/\d{4}/)![0]),
      }))
      .sort((a, b) => a.year - b.year),
  );
  expect(ordered).toHaveLength(5);
  for (const [target, card] of ordered.entries()) {
    await cards.selectOption(card.value);
    let position = await cards.evaluate((select) => (select as HTMLSelectElement).selectedIndex);
    while (position > target) {
      await page.locator('.history-browser button').first().click();
      position = await cards.evaluate((select) => (select as HTMLSelectElement).selectedIndex);
    }
  }
  await page.getByRole('combobox', { name: '史料推理', exact: true }).selectOption({ index: 1 });
  await page.locator('[data-run]').click();
  await expect(page.locator('[data-evidence-run]')).toContainText('年代顺序成立');
  await page.getByRole('button', { name: '发现', exact: true }).click();
  await page.locator('[data-explanation] input').first().check();
  await page.locator('[data-complete]').click();
  await expect(page.locator('[data-saved]')).toContainText('已记入');
  await page.reload();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('science-learning:portfolio:v1')!).records.H1.completed,
    ),
  ).toBe(true);
});
