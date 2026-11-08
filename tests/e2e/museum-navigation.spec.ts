import { expect, test } from '@playwright/test';

test('04 restores all original galleries and their working 3D models', async ({ page }) => {
  await page.goto('/legacy.html#traffic');
  await expect(page.locator('[data-chapter-total]')).toHaveText('04');
  for (const id of ['history', 'explore', 'lidar', 'traffic']) {
    await expect(page.locator(`[data-go="${id}"]`)).toBeVisible();
  }
  await page.locator('[data-page="traffic"] [data-next="lidar"]').click();
  await expect(page).toHaveURL(/legacy\.html#lidar$/);
  await page.locator('[data-go="history"]').click();
  await expect(page).toHaveURL(/legacy\.html#history$/);
  await expect(page.locator('[data-page="history"]')).toHaveAttribute('data-status', 'ready');
  await expect(page.locator('.history-paper h1')).toContainText('中国新能源车');
  await page.locator('[data-page="history"] [data-next="explore"]').click();
  await expect(page).toHaveURL(/legacy\.html#explore$/);
  await expect(page.locator('[data-model-loading]')).toHaveClass(/is-complete/, { timeout: 30000 });
  await expect(page.locator('[data-model-loading-percent]')).toHaveText('100%');
  await expect(page.locator('#model-canvas')).toBeVisible();
  await page.locator('[data-go="lidar"]').click();
  await expect(page).toHaveURL(/legacy\.html#lidar$/);
  await expect(page.locator('[data-lidar-status]')).toHaveText('装配模型已就绪', { timeout: 30000 });
  await expect(page.locator('[data-page="lidar"]')).toHaveAttribute('data-asset-status', 'ready');
  await page.locator('[data-go="traffic"]').click();
  await expect(page.locator('[data-page="traffic"]')).toHaveAttribute('data-status', 'ready');
  await expect(page.locator('[data-page].is-active')).toHaveCount(1);
});

test('the classroom and original museum provide visible return links', async ({ page }) => {
  await page.goto('/games/history/index.html#history/H2');
  await page.getByRole('link', { name: '原版展馆', exact: true }).click();
  await expect(page).toHaveURL(/legacy\.html#history$/);
  await expect(page.locator('.history-paper h1')).toBeVisible();
  await page.getByRole('link', { name: '返回探索课堂', exact: true }).click();
  await expect(page).toHaveURL(/index\.html#lidar\/S3$/);
  await expect(page.locator('[data-prediction]')).toBeVisible();
});

test('original museum chapters remain reachable on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/legacy.html#traffic');
  await page.locator('[data-go="history"]').click();
  await expect(page.locator('.history-paper h1')).toBeVisible();
  await page.locator('[data-go="lidar"]').click();
  await expect(page.locator('[data-chapter-number]')).toHaveText('03');
  await expect(page.locator('[data-page].is-active')).toHaveCount(1);
});
