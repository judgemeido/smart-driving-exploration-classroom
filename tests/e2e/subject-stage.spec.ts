import { expect, test } from '@playwright/test';

test('whole-car starts recognizable and classroom opening follows the model view', async ({ page }) => {
  await page.goto('/#history/H1');
  await page.getByRole('button', { name: '操作', exact: true }).click();
  await expect(page.locator('[data-era="modern-ev"]')).toHaveAttribute('aria-pressed', 'true');
  const open = page.getByRole('button', { name: '打开车身观察', exact: true });
  await open.click();
  await expect(open).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-view-mode="assembly"]').click();
  await expect(open).toHaveAttribute('aria-pressed', 'false');
  await page.locator('[data-inspect-part="body"]').click();
  await expect(page.locator('[data-view-mode="assembly"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-view-mode="section"]').click();
  await expect(open).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await page.getByRole('button', { name: '操作', exact: true }).click();
  await expect(open).toHaveAttribute('aria-pressed', 'true');
});

test('battery casing inspection opens an intact casing and context loss keeps evidence usable', async ({ page }) => {
  await page.goto('/#battery/B1');
  await page.locator('[data-inspect-part="cell"]').click();
  await expect(page.locator('[data-view-mode="assembly"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-prediction] input').first().check();
  await page.getByRole('button', { name: '操作', exact: true }).click();
  await page.locator('canvas').dispatchEvent('webglcontextlost');
  await expect(page.locator('.lab-stage-fallback')).toBeVisible();
  await page.getByRole('button', { name: '连接充电器', exact: true }).click();
  await expect(page.locator('.lab-stage-fallback')).toContainText('充电');
  await page.locator('[data-run]').click();
  await expect(page.locator('[data-evidence-run]')).toContainText('充电器 → 电池');
});
