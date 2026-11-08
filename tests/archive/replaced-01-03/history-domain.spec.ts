import { expect, test } from '@playwright/test';

test('history timeline selects and scrolls to the first and last archive entries', async ({ page }) => {
  await page.goto('/#history');
  const buttons = page.locator('[data-timeline-target]');
  await expect(buttons).toHaveCount(14);
  await expect(page.locator('[data-archive-article]')).toHaveCount(14);
  for (const button of [buttons.last(), buttons.first(), buttons.first()]) {
    const target = await button.getAttribute('data-timeline-target');
    await button.click();
    await expect(button).toHaveClass(/is-selected/);
    await expect(page.locator('[data-timeline-target].is-selected')).toHaveCount(1);
    await expect(page.locator(`[id="${target}"][data-archive-article]`)).toBeInViewport();
  }
  const future = page.locator('[data-archive-article]').last();
  await expect(future.locator('.archive-article__media--empty')).toContainText('未来展望');
});

test('history stops responding to timeline clicks after page teardown', async ({ page }) => {
  await page.goto('/#history');
  await page.locator('[data-timeline-target]').first().click();
  const selected = await page
    .locator('[data-timeline-target].is-selected')
    .getAttribute('data-timeline-target');
  await page.evaluate(() => {
    window.dispatchEvent(new PageTransitionEvent('pagehide'));
    document.querySelectorAll<HTMLButtonElement>('[data-timeline-target]').item(13).click();
  });
  await expect(page.locator('[data-timeline-target].is-selected')).toHaveAttribute(
    'data-timeline-target',
    selected!,
  );
});
