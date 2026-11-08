import { expect, test } from '@playwright/test';

test('vehicle parts open into an inspectable mechanical bench without changing experimental evidence', async ({
  page,
}) => {
  await page.goto('/#explore/E1');
  await expect(page.getByRole('button', { name: '剖视', exact: true })).toBeVisible({ timeout: 3000 });
  await page.getByRole('button', { name: '剖视', exact: true }).click();
  await page.locator('[data-inspect-part="motor"]').click();
  await expect(page.locator('.mechanical-part-title')).toContainText('电机');
  await expect(page.getByRole('button', { name: '局部观察', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.locator('[data-inspect-part="transmission"]').click();
  await expect(page.locator('.mechanical-readouts')).toContainText('18 / 54');
  await expect(page.locator('.mechanical-readouts')).toContainText('3 : 1');
  await page.getByRole('button', { name: '分解', exact: true }).click();
  await expect(page.getByRole('button', { name: '分解', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('textarea,input[type="text"],input[type="number"]')).toHaveCount(0);
  await page.locator('[data-prediction] input').first().check();
  await page.getByRole('button', { name: '操作', exact: true }).click();
  await page.locator('[data-run]').click();
  const savedScene = await page.evaluate(
    () => JSON.parse(localStorage.getItem('science-learning:portfolio:v1')!).records.E1.runs[0].scene,
  );
  expect(savedScene.exploded).toBe(true);
  await page.getByRole('button', { name: '操作', exact: true }).click();
  await page.getByLabel('接通传动', { exact: true }).uncheck();
  await page.locator('[data-run]').click();
  const driveRow = page
    .locator('[data-evidence-run]>dl>div')
    .filter({ has: page.getByText('车轮驱动', { exact: true }) });
  await expect(driveRow).toContainText('传动断开');
});

test('optical structure and metre-scale measurement remain explicit and share truthful distance readouts', async ({
  page,
}) => {
  await page.goto('/#lidar/S2');
  await page.getByRole('button', { name: '结构观察', exact: true }).click();
  await page.getByRole('button', { name: '剖视', exact: true }).click();
  await page.locator('[data-inspect-part="receiver"]').click();
  await expect(page.locator('.mechanical-part-title')).toContainText('接收');
  await expect(page.locator('.mechanical-caption')).toContainText('放大');
  await page.getByRole('button', { name: '测距现场', exact: true }).click();
  await expect(page.locator('.mechanical-caption')).toContainText('米');
  await expect(page.locator('.mechanical-readouts')).toContainText('106.7 ns');
  await page.getByRole('button', { name: '操作', exact: true }).click();
  await page.getByRole('slider', { name: '目标前表面距离', exact: true }).fill('32');
  await expect(page.locator('.mechanical-readouts')).toContainText('213.5 ns');
  await page.getByRole('combobox', { name: '天气', exact: true }).selectOption('fog');
  await expect(page.locator('.mechanical-readouts')).toContainText('未知');
});

test('mechanical stage keeps a usable model viewport on classroom screens', async ({ page }) => {
  for (const size of [
    { width: 1280, height: 720 },
    { width: 1366, height: 768 },
  ]) {
    await page.setViewportSize(size);
    for (const hash of ['history/H1', 'explore/E1', 'lidar/S2']) {
      await page.goto(`/#${hash}`);
      await expect(page.locator('.mechanical-viewport canvas')).toHaveCount(1);
      const box = await page.locator('.mechanical-viewport').boundingBox();
      expect(box!.width).toBeGreaterThan(400);
      expect(box!.height).toBeGreaterThan(190);
      const next = await page.locator('[data-panel="prediction"] .step-actions').boundingBox();
      expect(next!.y + next!.height).toBeLessThanOrEqual(size.height);
      expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 2)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    }
  }
});

test('history source selection opens its corresponding mechanism and keyboard inspection keeps focus', async ({
  page,
}) => {
  await page.goto('/#history/H1');
  await page.getByRole('button', { name: '操作', exact: true }).click();
  await page
    .getByRole('combobox', { name: '查看档案与位置', exact: true })
    .selectOption('history-event-2015');
  await expect(page.locator('.mechanical-part-title')).toContainText('环境感知');
  const motor = page.locator('[data-inspect-part="motor"]');
  await motor.focus();
  await page.keyboard.press('Enter');
  await expect(motor).toBeFocused();
  await expect(page.locator('.mechanical-part-title')).toContainText('电机');
});

test('expanded inspection returns to the same classroom and restores its trigger focus', async ({ page }) => {
  await page.goto('/#explore/E1');
  await page.getByRole('button', { name: '放大观察', exact: true }).click();
  await expect(page.locator('.model-area')).toHaveJSProperty('offsetWidth', 1440);
  await expect(page.getByRole('button', { name: '返回课堂', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: '返回课堂', exact: true }).click();
  await expect(page.getByRole('button', { name: '放大观察', exact: true })).toBeFocused();
  await expect(page.locator('.lesson-workbench')).toBeVisible();
});
