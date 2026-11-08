import { expect, test, type Page } from '@playwright/test';

async function navigate(page: Page, chapter: string) {
  if (await page.locator('[data-menu-button]').isVisible()) await page.locator('[data-menu-button]').click();
  await page.locator(`[data-go="${chapter}"]`).click();
  await expect(page.locator(`[data-page="${chapter}"]`)).toHaveAttribute('data-status', 'ready');
  await expect(page.locator('[data-page].is-active')).toHaveCount(1);
}

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  test(`four galleries retain base navigation and expose the three independent activities at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/#history');
    await expect(page.locator('[data-archive-article]')).toHaveCount(14);
    await expect(page.locator('[data-history-learning-toggle], [data-history-learning-panel]')).toHaveCount(
      0,
    );
    for (const chapter of ['explore', 'lidar', 'traffic', 'history']) await navigate(page, chapter);
    await expect(
      page.locator(
        '[data-learning-start], [data-explore-learning], [data-lidar-learning-toggle], [data-lidar-learning]',
      ),
    ).toHaveCount(0);
    await expect(page.locator('[data-chapter-total]')).toHaveText('04');
    if (await page.locator('[data-menu-button]').isVisible())
      await page.locator('[data-menu-button]').click();
    await page.locator('[data-activity-menu]>summary').click();
    for (const activity of ['history', 'structure', 'sensor'])
      await expect(page.locator(`a[href$="games/${activity}/index.html"]`)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });

  test(`04 learning still restores keyboard focus at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/#traffic');
    await expect(page.locator('[data-page="traffic"]')).toHaveAttribute('data-status', 'ready');
    const trigger = page.locator('[data-traffic-practice-open]');
    await trigger.focus();
    await page.keyboard.press('Enter');
    const panel = page.locator('[data-traffic-learning]');
    await expect(panel).toBeVisible();
    expect(await panel.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    await panel.locator('[data-traffic-learning-close]').click();
    await expect(panel).toBeHidden();
    await expect(trigger).toBeFocused();
  });
}

for (const activity of ['history', 'structure', 'sensor'])
  test(`${activity} uses a real refreshable document without loading a 3D exhibit`, async ({ page }) => {
    const urls: string[] = [];
    page.on('request', (request) => urls.push(request.url()));
    const response = await page.goto(`/games/${activity}/index.html`);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('button', { name: '开始练习', exact: true })).toBeVisible();
    await page.reload();
    await expect(page.locator('[data-prepare]')).toBeVisible();
    await expect(page.locator('[data-page], canvas, [data-model-canvas]')).toHaveCount(0);
    expect(urls.filter((url) => /\.(glb|dae)(?:\?|$)|three(?:\.module)?[-.]/i.test(url))).toEqual([]);
  });
