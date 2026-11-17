import { expect, test } from '@playwright/test';

test('defaults four-thread machines to low and remembers manual standard after a forced preview link', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 4 });
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
  });
  await page.goto('/legacy.html?quality=low#history');
  const select = page.locator('[data-quality-select]');
  await expect(page.locator('html')).toHaveAttribute('data-performance-quality', 'low');
  await expect(select.locator('option')).toHaveText(['自动 · 低配版', '标准版', '低配版']);
  await select.selectOption('high');
  await expect(page).toHaveURL(/legacy\.html#history$/);
  await page.reload();
  await expect(select).toHaveValue('high');
  await expect(page.locator('html')).toHaveAttribute('data-performance-quality', 'high');
  await select.selectOption('auto');
  await expect(select.locator('option').first()).toHaveText('自动 · 低配版');
  await page.reload();
  await expect(select).toHaveValue('auto');
  await expect(page.locator('html')).toHaveAttribute('data-performance-quality', 'low');
});

test('capable hardware starts standard and runtime fallback synchronizes with the radar iframe', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 16 });
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
  });
  await page.goto('/legacy.html#history');
  const select = page.locator('[data-quality-select]');
  await expect(select.locator('option').first()).toHaveText('自动 · 标准版');
  await expect(page.locator('html')).toHaveAttribute('data-performance-quality', 'high');
  await page.locator('[data-go="lidar"]').click();
  const frame = page.frameLocator('.lidar-exhibit-frame');
  await expect(frame.locator('#loading')).toBeHidden({ timeout: 30000 });
  // Exercise the actual public adaptive signal from the child, without changing the preference.
  const context = page.frames().find(f => f.url().includes('/lidar/index.html'))!;
  await context.evaluate(() => {
    sessionStorage.setItem('smart-driving:auto-low', 'true');
    dispatchEvent(new StorageEvent('storage', { key: 'smart-driving:auto-low', newValue: 'true', storageArea: sessionStorage }));
  });
  await expect(page.locator('html')).toHaveAttribute('data-performance-quality', 'low');
  await expect(frame.locator('#model-view canvas')).toHaveAttribute('data-render-quality', 'low');
  await expect(select).toHaveValue('auto');
  await expect(select.locator('option').first()).toHaveText('自动 · 低配版');
  await select.selectOption('high');
  await expect(frame.locator('#model-view canvas')).toHaveAttribute('data-render-quality', 'high');
  await expect.poll(() => context.evaluate(() => !!(window as any).LD016.showcase.bloom)).toBe(true);
  await select.selectOption('low');
  await expect(frame.locator('#model-view canvas')).toHaveAttribute('data-render-quality', 'low');
});

test('mobile classroom exposes the same version choices and retains the chosen preference', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/games/history/index.html#history/H2');
  const select = page.locator('[data-quality-select]');
  await expect(select).toBeVisible();
  await select.selectOption('low');
  await page.reload();
  await expect(select).toHaveValue('low');
  await select.selectOption('auto');
  await expect(select).toHaveValue('auto');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
