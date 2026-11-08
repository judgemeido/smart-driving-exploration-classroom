import {expect,test} from '@playwright/test';
test('history gallery retains fourteen exhibits and year navigation after learning moves to the independent activity',async({page})=>{
  await page.goto('/#history');
  await expect(page.locator('[data-archive-article]')).toHaveCount(14);
  await expect(page.locator('[data-history-learning-toggle],[data-history-learning-panel],[data-history-order-card],[data-history-reason]')).toHaveCount(0);
  const target=page.locator('[data-timeline-target]').last();const id=await target.getAttribute('data-timeline-target');await target.click();
  await expect(target).toHaveClass(/is-selected/);await expect(page.locator(`#${id}`)).toBeInViewport();
});
