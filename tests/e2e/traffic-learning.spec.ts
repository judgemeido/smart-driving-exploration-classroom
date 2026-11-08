import { expect, test, type Page } from '@playwright/test';

const originalIds = [
  'red-light',
  'pedestrians',
  'yellow-light',
  'school-zone',
  'green-pedestrians',
  'queue',
  'construction',
  'ambulance',
];
const practiceIds = [
  'traffic-practice-green-clear',
  'traffic-practice-sudden-person',
  'traffic-practice-obstacle',
  'traffic-practice-heavy-rain',
  'traffic-practice-sensor-uncertain',
];
const answers = [
  'traffic-green-clear-question:choice-1',
  'traffic-sudden-person-question:choice-2',
  'traffic-obstacle-question:choice-3',
  'traffic-heavy-rain-question:choice-1',
  'traffic-sensor-uncertain-question:choice-2',
];

async function openTraffic(page: Page) {
  await page.route('**/yaojing-s9.glb', (route) => route.fulfill({ status: 404, body: 'missing' }));
  await page.goto('/#traffic');
  await expect(page.locator('[data-page="traffic"]')).toHaveAttribute('data-status', 'ready');
  await expect(page.locator('[data-traffic-state]')).toContainText('示意车继续');
  const time = new Date('2026-11-08T00:00:00Z');
  await page.clock.install({ time });
  await page.clock.pauseAt(new Date(time.getTime() + 1000));
}
async function completeOriginal(page: Page) {
  await page.locator('[data-traffic-start]').click();
  await expect(page.locator('[data-traffic-practice-open]')).toBeHidden();
  for (let index = 0; index < 8; index += 1) {
    await page.clock.runFor(6000);
    await page.locator(`[data-choice-id="${originalIds[index]}:0"]`).click();
    if (index === 1 || index === 4) await page.clock.runFor(5600);
    else await page.locator('[data-traffic-next]').click();
  }
  await expect(page.locator('[data-traffic-title]')).toHaveText('安全小队得分：8 / 8');
}
async function openPractice(page: Page) {
  await page.locator('[data-traffic-practice-open]').click();
  await expect(page.locator('[data-traffic-learning]')).toHaveAttribute('data-mode', 'practice');
}
async function navigate(page: Page, id: string) {
  // 01–03 now use another entry. Exercise the retained controller's suspension without old chapter UI.
  await page.evaluate((active) => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: active ? 'visible' : 'hidden',
    });
    document.dispatchEvent(new Event('visibilitychange'));
  }, id === 'traffic');
}

test('original result opens and closes all eight review cards without duplicating controls', async ({
  page,
}) => {
  test.setTimeout(180000);
  await openTraffic(page);
  await completeOriginal(page);
  for (let repeat = 0; repeat < 2; repeat += 1) {
    await page.locator('[data-traffic-review-open]').click();
    await expect(page.locator('[data-traffic-review-card]')).toHaveCount(8);
    await expect(page.locator('[data-traffic-review-choice]')).toHaveCount(24);
    await expect(page.locator('[data-traffic-learning]')).toContainText('全题复习');
    await expect(page.locator('[data-traffic-learning]')).not.toContainText('你的错题');
    await page.locator('[data-traffic-learning-close]').click();
    await expect(page.locator('[data-traffic-learning]')).toBeHidden();
    await expect(page.locator('[data-traffic-title]')).toHaveText('安全小队得分：8 / 8');
    await expect(page.locator('[data-traffic-score]')).toHaveText('8 分');
  }
});

test('five practice scenarios require observation, retry, feedback and summary with original eight points intact', async ({
  page,
}) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openTraffic(page);
  await completeOriginal(page);
  await openPractice(page);
  await page.locator('[data-traffic-practice-start]').click();
  for (let index = 0; index < 5; index += 1) {
    const learning = page.locator('[data-traffic-learning]');
    await expect(learning).toHaveAttribute('data-phase', 'observe');
    await expect(learning).toHaveAttribute('data-scenario-id', practiceIds[index]);
    await expect(page.locator('[data-traffic-practice-choice]')).toHaveCount(0);
    await page.clock.runFor(1500);
    await page.locator('[data-traffic-practice-observed]').click();
    await expect(learning).toHaveAttribute('data-phase', 'decide');
    if (index === 0) {
      await page.locator('[data-traffic-practice-choice="traffic-green-clear-question:choice-2"]').click();
      await expect(learning).toHaveAttribute('data-phase', 'feedback');
      await expect(page.locator('[data-traffic-practice-continue]')).toHaveCount(0);
      await page.locator('[data-traffic-practice-retry]').click();
    }
    await page.locator(`[data-traffic-practice-choice="${answers[index]}"]`).click();
    await page.clock.runFor(4000);
    await expect(learning).toHaveAttribute('data-phase', 'feedback');
    const feedback = await page.locator('[data-traffic-practice-continue]').elementHandle();
    await page.locator('[data-traffic-practice-continue]').click();
    await feedback?.evaluate((button) => button.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await expect(learning).toHaveAttribute('data-phase', 'summarize');
    await expect(page.locator('[data-traffic-practice-progress]')).toHaveText(`已掌握 ${index} / 5`);
    await page.locator('[data-traffic-practice-continue]').click();
  }
  await expect(page.locator('[data-traffic-learning]')).toHaveAttribute('data-phase', 'complete');
  await expect(page.locator('[data-traffic-practice-progress]')).toHaveText('已掌握 5 / 5');
  await expect(page.locator('[data-traffic-learning]')).toContainText('我能解释');
  await page.locator('[data-traffic-practice-reset]').click();
  await expect(page.locator('[data-traffic-learning]')).toHaveAttribute('data-phase', 'ready');
  await expect(page.locator('[data-traffic-score]')).toHaveText('8 分');
  await page.locator('[data-traffic-learning-close]').click();
  await expect(page.locator('[data-traffic-title]')).toHaveText('安全小队得分：8 / 8');
  expect(errors).toEqual([]);
});

test('practice remains across visibility suspension and exit restores the road view without duplicate submissions', async ({
  page,
}) => {
  await openTraffic(page);
  await openPractice(page);
  await page.locator('[data-traffic-practice-start]').click();
  await page.locator('[data-traffic-practice-observed]').click();
  await page.locator(`[data-traffic-practice-choice="${answers[0]}"]`).click();
  await navigate(page, 'history');
  await page.clock.runFor(8000);
  await navigate(page, 'traffic');
  await expect(page.locator('[data-traffic-learning]')).toHaveAttribute('data-phase', 'feedback');
  await expect(page.locator('[data-traffic-practice-progress]')).toHaveText('已掌握 0 / 5');
  await page.locator('[data-traffic-learning-close]').click();
  await expect(page.locator('[data-traffic-overlay]')).toBeVisible();
  await expect(page.locator('[data-traffic-state]')).toContainText('准备出发');
  await expect(page.locator('[data-traffic-canvas]')).toHaveAttribute('data-scene-mode', 'original');
  await openPractice(page);
  await expect(page.locator('[data-traffic-learning]')).toHaveAttribute('data-phase', 'feedback');
  await expect(page.locator('[data-traffic-practice-continue]')).toHaveCount(1);
  await page.locator('[data-traffic-practice-continue]').click();
  await expect(page.locator('[data-traffic-learning]')).toHaveAttribute('data-phase', 'summarize');
  await page.locator('[data-traffic-learning-close]').click();
  await page.locator('[data-traffic-start]').click();
  await page.clock.runFor(6000);
  await expect(page.locator('[data-traffic-title]')).toHaveText('前方红灯亮了，应该怎么做？');
});

test('page exit resets new learning memory while BFCache retains the original score', async ({ page }) => {
  test.setTimeout(180000);
  await openTraffic(page);
  await completeOriginal(page);
  await openPractice(page);
  await page.locator('[data-traffic-practice-start]').click();
  await page.locator('[data-traffic-practice-observed]').click();
  await page.locator(`[data-traffic-practice-choice="${answers[0]}"]`).click();
  await page.locator('[data-traffic-practice-continue]').click();
  await page.locator('[data-traffic-practice-continue]').click();
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
  await page.clock.runFor(4000);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await expect(page.locator('[data-traffic-learning]')).toBeHidden();
  await expect(page.locator('[data-traffic-score]')).toHaveText('8 分');
  await openPractice(page);
  await expect(page.locator('[data-traffic-learning]')).toHaveAttribute('data-phase', 'ready');
  await expect(page.locator('[data-traffic-practice-progress]')).toHaveText('已掌握 0 / 5');
});
