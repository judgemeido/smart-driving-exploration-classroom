import { expect, test } from '@playwright/test';

test('mechanical whole-car inspection remains usable on classroom screens and preserves the activity', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 1366, height: 768 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/#history/H1');
    await page.locator('[data-prediction] input').first().check();
    for (const part of [
      'chassis',
      'suspension',
      'brake',
      'battery',
      'motor',
      'transmission',
      'computer',
      'interior',
      'sensor',
    ]) {
      const control = page.locator(`[data-inspect-part="${part}"]`);
      await control.focus();
      await page.keyboard.press('Enter');
      await expect(control).toBeFocused();
      await expect(control).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('[data-isolate]')).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('.mechanical-part-title')).not.toHaveText('');
    }
    await page.locator('[data-inspect-part="overview"]').click();
    for (const mode of ['exploded', 'section', 'assembly']) {
      await page.locator(`[data-view-mode="${mode}"]`).click();
      await expect(page.locator(`[data-view-mode="${mode}"]`)).toHaveAttribute('aria-pressed', 'true');
    }
    await page.getByRole('button', { name: '操作', exact: true }).click();
    await page.locator('[data-era="hybrid"]').click();
    await expect(page.locator('[data-inspect-part="engine"]')).toBeVisible();
    await page.locator('[data-era="modern-ev"]').click();
    await expect(page.locator('[data-inspect-part="engine"]')).toHaveCount(0);
    if ((await page.locator('[data-quality]').getAttribute('aria-pressed')) !== 'true')
      await page.locator('[data-quality]').click();
    await expect(page.locator('[data-quality]')).toHaveAttribute('aria-pressed', 'true');
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollHeight <= innerHeight + 2 &&
          document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    const canvas = await page.locator('canvas').boundingBox();
    expect(canvas!.height).toBeGreaterThan(190);
  }
  expect(errors).toEqual([]);
});

test('model replay starts the same timed power demonstration as the activity', async ({ page }) => {
  await page.goto('/#history/H1');
  await page.locator('[data-replay]').click();
  const state = () =>
    page.evaluate(
      () => JSON.parse(localStorage.getItem('science-learning:portfolio:v1')!).records.H1.draft.evolution,
    );
  expect(await state()).toMatchObject({ running: true, demonstrated: true });
  await expect.poll(async () => (await state()).running).toBe(false);
  await page.getByRole('button', { name: '操作', exact: true }).click();
  await expect(page.locator('.evolution-controls [role="status"]')).toContainText('演示结束');
  await page.locator('[data-era="early-electric"]').click();
  await page.getByRole('button', { name: '打开车身观察', exact: true }).click();
  await page.getByRole('button', { name: '预测', exact: true }).click();
  await page.locator('[data-prediction] input').first().check();
  await page.getByRole('button', { name: '操作', exact: true }).click();
  await page.locator('[data-run]').click();
  await expect(page.locator('[data-evidence-run]')).toContainText('早期电动车');
});
