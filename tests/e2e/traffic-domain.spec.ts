import { expect, test, type Page } from '@playwright/test';

const scenarioIds = [
  'red-light',
  'pedestrians',
  'yellow-light',
  'school-zone',
  'green-pedestrians',
  'queue',
  'construction',
  'ambulance',
];
const titles = [
  '前方红灯亮了，应该怎么做？',
  '斑马线上有人正在过街',
  '黄灯亮了，车还没有越过停止线',
  '学校附近有“限速 30”标志',
  '虽然是绿灯，行人还没走完斑马线',
  '前方车辆排起了队，可以借道绕行吗？',
  '前方有施工锥桶，应该怎么通过？',
  '听到警报声、看到闪灯的救护车，怎么办？',
];

async function openTraffic(page: Page) {
  await page.route('**/yaojing-s9.glb', (route) => route.fulfill({ status: 404, body: 'missing' }));
  await page.goto('/#traffic');
  await expect(page.locator('[data-page="traffic"]')).toHaveAttribute('data-status', 'ready');
  await expect(page.locator('[data-traffic-state]')).toContainText('示意车继续');
  // Freeze between driver operations so assertions test the specified remaining duration.
  const time = new Date('2026-11-08T00:00:00Z');
  await page.clock.install({ time });
  await page.clock.pauseAt(new Date(time.getTime() + 1000));
  await page.locator('[data-traffic-start]').click();
}

async function question(page: Page, index: number) {
  await page.clock.runFor(6000);
  await expect(page.locator('[data-traffic-title]')).toHaveText(titles[index]);
  await expect(page.locator('[data-traffic-progress]').first()).toHaveText(`${index + 1} / 8`);
  await expect(page.locator('[data-traffic-options] button')).toHaveCount(3);
}

async function navigate(page: Page, id: string) {
  // 01–03 now use another entry. Retain this controller's lifecycle regression via BFCache events.
  await page.evaluate(
    (active) =>
      window.dispatchEvent(new PageTransitionEvent(active ? 'pageshow' : 'pagehide', { persisted: true })),
    id === 'traffic',
  );
}

test('traffic domain completes eight correct answers with manual and timed continuation', async ({
  page,
}) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openTraffic(page);
  for (let index = 0; index < 8; index += 1) {
    await question(page, index);
    const choice = page.locator(`[data-choice-id="${scenarioIds[index]}:0"]`);
    await expect(choice).toHaveAttribute('data-correct', 'true');
    // The retained DOM hint cannot change the actual answer rule.
    if (index === 0)
      await choice.evaluate((button) => {
        button.dataset.correct = 'false';
      });
    await choice.click();
    await choice.dispatchEvent('click');
    await expect(page.locator('[data-traffic-score]')).toHaveText(`${index + 1} 分`);
    if (index === 1 || index === 4) {
      await expect(page.locator('[data-traffic-state]')).toContainText('行人正在通过');
      await expect(page.locator('[data-traffic-overlay]')).toBeHidden();
      await page.clock.runFor(5600);
    } else if (index % 2 === 0) {
      const next = page.locator('[data-traffic-next]');
      await next.click();
      await next.dispatchEvent('click');
    } else await page.clock.runFor(2400);
  }
  await expect(page.locator('[data-traffic-title]')).toHaveText('安全小队得分：8 / 8');
  await expect(page.locator('[data-traffic-start]')).toHaveText('再走一次');
  await page.locator('[data-traffic-start]').click();
  await expect(page.locator('[data-traffic-score]')).toHaveText('0 分');
  await expect(page.locator('[data-traffic-progress]').first()).toHaveText('0 / 8');
  expect(errors).toEqual([]);
});

test('traffic domain keeps wrong answers at zero and completes the original eight questions', async ({
  page,
}) => {
  test.setTimeout(180000);
  await openTraffic(page);
  for (let index = 0; index < 8; index += 1) {
    await question(page, index);
    const wrong = index === 0 || index === 4;
    const choice = page.locator(`[data-choice-id="${scenarioIds[index]}:${wrong ? 1 : 0}"]`);
    await choice.click();
    await choice.dispatchEvent('click');
    if (wrong) {
      await expect(page.locator('[data-traffic-feedback]')).toContainText('再记住这个安全做法。');
      await expect(page.locator('[data-traffic-overlay]')).toBeVisible();
    }
    if (index === 1) await page.clock.runFor(5600);
    else if (index % 2 === 0) await page.locator('[data-traffic-next]').click();
    else await page.clock.runFor(2400);
  }
  await expect(page.locator('[data-traffic-title]')).toHaveText('安全小队得分：6 / 8');
  await page.locator('[data-traffic-reset]').click();
  await expect(page.locator('[data-traffic-title]')).toHaveText('准备好了吗？');
  await expect(page.locator('[data-traffic-score]')).toHaveText('0 分');
  await expect(page.locator('[data-traffic-next]')).toBeHidden();
  await page.locator('[data-traffic-start]').click();
  await question(page, 0);
});

test('traffic domain retains remaining feedback and crossing time across page suspension', async ({
  page,
}) => {
  test.setTimeout(120000);
  await openTraffic(page);
  await question(page, 0);
  await page.locator('[data-choice-id="red-light:0"]').click();
  await page.clock.runFor(500);
  await navigate(page, 'history');
  await page.clock.runFor(6000);
  await navigate(page, 'traffic');
  await expect(page.locator('[data-traffic-title]')).toHaveText(titles[0]);
  await expect(page.locator('[data-traffic-feedback]')).toContainText('答对了');
  await page.clock.runFor(1700);
  await expect(page.locator('[data-traffic-state]')).toContainText('情境 01');
  await page.clock.runFor(200);
  await expect(page.locator('[data-traffic-state]')).toContainText('车辆继续自动行驶');
  await question(page, 1);
  await page.locator('[data-choice-id="pedestrians:0"]').click();
  await page.clock.runFor(2000);
  await navigate(page, 'history');
  await page.clock.runFor(6000);
  await navigate(page, 'traffic');
  await expect(page.locator('[data-traffic-state]')).toContainText('行人正在通过');
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
  await page.clock.runFor(6000);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await page.clock.runFor(2000);
  await expect(page.locator('[data-traffic-state]')).toContainText('行人正在通过');
  await expect(page.locator('[data-traffic-score]')).toHaveText('2 分');
  await page.clock.runFor(1500);
  await expect(page.locator('[data-traffic-state]')).toContainText('车辆继续自动行驶');
  await question(page, 2);
});
