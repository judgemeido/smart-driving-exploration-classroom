import { expect, test } from '@playwright/test';
import { ARCADE_STORAGE_KEY } from '../../src/shared/arcade/storage';

async function beginContest(page: import('@playwright/test').Page) {
  const settings = page.locator('[data-contest-settings]');
  if (!(await settings.evaluate((element) => (element as HTMLDetailsElement).open)))
    await settings.locator('summary').click();
  await page.getByRole('button', { name: '开始挑战', exact: true }).click();
}

test('practice is ready before competition settings are expanded', async ({ page }) => {
  await page.goto('/games/history/index.html');
  await expect(page.getByRole('button', { name: '开始练习', exact: true })).toBeVisible();
  await expect(page.locator('[name="nickname"]')).toBeHidden();
  await expect(page.locator('[name="challengeCode"]')).toBeHidden();
  await page.getByRole('button', { name: '开始练习', exact: true }).click();
  await expect(page.locator('[data-running]')).toBeVisible();
});

test('tutorial restores focus and scroll without starting a contest', async ({ page }) => {
  await page.goto('/games/history/index.html');
  const trigger = page.getByRole('button', { name: '操作说明', exact: true });
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-tutorial-dialog]')).toBeVisible();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-tutorial-dialog]')).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('');
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) ?? '{}').activeDraft ?? null,
      ARCADE_STORAGE_KEY,
    ),
  ).toBeNull();
  await expect(page.locator('[data-prepare]')).toBeVisible();
});

test('the unscored tutorial explains selection, connection and cancellation before starting', async ({
  page,
}) => {
  await page.goto('/games/structure/index.html');
  await page.getByRole('button', { name: '操作说明', exact: true }).click();
  await page.getByRole('button', { name: '电源线头', exact: true }).click();
  await page.getByRole('button', { name: '取消选择', exact: true }).click();
  await expect(page.locator('[data-tutorial-lamp]')).toHaveAttribute('data-lit', 'false');
  await page.getByRole('button', { name: '电源线头', exact: true }).click();
  await page.getByRole('button', { name: '台灯插口', exact: true }).click();
  await expect(page.locator('[data-tutorial-lamp]')).toHaveAttribute('data-lit', 'true');
  await expect(page.locator('[data-tutorial-experiment]')).toContainText('回路接通');
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) ?? '{}').contestLocks?.length ?? 0,
      ARCADE_STORAGE_KEY,
    ),
  ).toBe(0);
});

test('pause keeps contest time running, navigation interrupts, and renaming cannot unlock the attempt', async ({
  page,
}) => {
  await page.clock.install();
  await page.goto('/games/history/index.html');
  await beginContest(page);
  await page.getByRole('button', { name: '暂停操作', exact: true }).click();
  await page.clock.runFor(61000);
  await expect(page.locator('[data-clock]')).toContainText('4:59');
  await expect(page.locator('[data-game-host]')).toHaveJSProperty('inert', true);
  await page.reload();
  await expect(page.locator('[data-prepare]')).toBeVisible();
  await page.locator('[data-contest-settings] summary').click();
  await page.locator('[name="nickname"]').fill('换一个代号');
  await beginContest(page);
  await expect(page.locator('[data-start-message]')).toContainText('已参加过');
  const store = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), ARCADE_STORAGE_KEY);
  expect(store.results).toHaveLength(1);
  expect(store.results[0]).toMatchObject({ status: 'interrupted', eligible: false, score: null });
  expect(store.contestLocks).toHaveLength(1);
});

test('another tab only reports the owner; explicit recovery interrupts the exact run', async ({
  page,
  context,
}) => {
  await page.goto('/games/history/index.html');
  await beginContest(page);
  const other = await context.newPage();
  await other.goto('/games/sensor/index.html');
  await expect(other.locator('[data-draft-message]')).toContainText('未结束');
  await expect(page.locator('[data-running]')).toBeVisible();
  await beginContest(other);
  await expect(other.locator('[data-start-message]')).toContainText('另一局');
  await other.getByRole('button', { name: '结束未完成挑战', exact: true }).click();
  await expect(page.locator('[data-result]')).toBeVisible();
  await expect(page.locator('[data-result-card]')).toContainText('中断');
  const store = await other.evaluate((key) => JSON.parse(localStorage.getItem(key)!), ARCADE_STORAGE_KEY);
  expect(store.results).toHaveLength(1);
  expect(store.results[0].status).toBe('interrupted');
  await other.close();
});

test('a cached page return shows preparation and cannot resume the old contest', async ({ page }) => {
  await page.goto('/games/history/index.html');
  await beginContest(page);
  await page.evaluate(() => {
    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
  });
  await expect(page.locator('[data-prepare]')).toBeVisible();
  await expect(page.locator('[data-running]')).toBeHidden();
  const store = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), ARCADE_STORAGE_KEY);
  expect(store.results).toHaveLength(1);
  expect(store.results[0].status).toBe('interrupted');
});

for (const failure of ['blocked', 'corrupt'] as const)
  test(`${failure} storage remains playable and reports unsaved status`, async ({ page }) => {
    await page.addInitScript(
      ({ key, failure }) => {
        if (failure === 'corrupt') localStorage.setItem(key, 'corrupt source preserved');
        else
          Object.defineProperty(Storage.prototype, 'setItem', {
            value() {
              throw new DOMException('blocked', 'QuotaExceededError');
            },
          });
      },
      { key: ARCADE_STORAGE_KEY, failure },
    );
    await page.goto('/games/history/index.html');
    await page.getByRole('button', { name: '开始练习', exact: true }).click();
    await expect(page.locator('[data-running]')).toBeVisible();
    await page.getByRole('button', { name: '结束本局', exact: true }).click();
    await expect(page.locator('[data-result-card]')).toContainText('本机未保存');
    if (failure === 'corrupt')
      expect(await page.evaluate((key) => localStorage.getItem(key), ARCADE_STORAGE_KEY)).toBe(
        'corrupt source preserved',
      );
  });
