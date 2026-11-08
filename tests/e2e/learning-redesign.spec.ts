import { expect, test, type Page } from '@playwright/test';

const storageKey = 'science-learning:portfolio:v1';
type Run = {
  draft: Record<string, unknown>;
  evidence: { summary: string; metrics: { label: string; value: string }[] };
  prediction: string;
};
async function runs(page: Page, id: string): Promise<Run[]> {
  return page.evaluate(
    ({ storageKey, id }) => JSON.parse(localStorage.getItem(storageKey) ?? '{}').records?.[id]?.runs ?? [],
    { storageKey, id },
  );
}
async function open(page: Page, route: string) {
  await page.goto(route);
  await expect(page.locator('[data-experiment-controls]')).toBeVisible();
}
async function record(
  page: Page,
  id: string,
  prediction = '我预测保持其他条件不变时，改变这一项会让证据发生可解释的变化。',
) {
  const count = (await runs(page, id)).length;
  await page.locator('[data-prediction]').fill(prediction);
  await page.locator('[data-run]').click();
  await expect.poll(async () => (await runs(page, id)).length).toBe(count + 1);
  return (await runs(page, id)).at(-1)!;
}
async function range(page: Page, label: string, value: number) {
  const control = page.getByRole('slider', { name: label, exact: true });
  // Native keyboard interaction exercises the actual control event path.
  await control.focus();
  await control.press('Home');
  const min = Number(await control.getAttribute('min'));
  for (let n = min; n < value; n++) await control.press('ArrowRight');
  await expect(control).toHaveValue(String(value));
}

for (const [path, id] of [
  ['history', 'H1'],
  ['structure', 'E1'],
  ['sensor', 'S2'],
]) {
  test(`legacy ${path} URL opens the new learning activity`, async ({ page }) => {
    await open(page, `/games/${path}/index.html`);
    await expect(page.locator('[data-model-stage] canvas')).toHaveCount(1);
    for (const text of ['01汽车如何进化', '02打开汽车看系统', '03让汽车感知世界'])
      await expect(page.getByText(text, { exact: true })).toBeVisible();
    await expect(
      page.locator('[data-contest-settings],[name="nickname"],[name="challengeCode"]'),
    ).toHaveCount(0);
    await expect(page.getByRole('button', { name: '开始挑战', exact: true })).toHaveCount(0);
    await record(page, id);
  });
}

test('E2 repairs the diagnosed link and preserves the original evidence', async ({ page }) => {
  await open(page, '/#explore/E2');
  await page.getByLabel('设置链路断点', { exact: true }).selectOption('input');
  const before = await record(page, 'E2', '输入链路断开时，没有证据不能被理解成道路无人。');
  expect(before.evidence.metrics.some((x) => x.value.includes('不确定'))).toBe(true);
  await page.getByLabel('根据证据，选择要修复的一处链路', { exact: true }).selectOption('input');
  await page.locator('[data-action="repair"]').click();
  const after = await record(page, 'E2', '只恢复输入链路，相同规则应在行人出现时停车，清空后通行。');
  expect(after.evidence.metrics.some((x) => x.value.includes('完成：礼让后通行'))).toBe(true);
  expect((await runs(page, 'E2'))[0]).toEqual(before);
  expect(before.draft.fault).toBe('input');
  expect(before.draft.step).toBe(3);
  expect(after.draft.fault).toBe('none');
});

test('S2 derives two distances, clears misses and measures the nearer occluder', async ({ page }) => {
  await open(page, '/#lidar/S2');
  const first = await record(page, 'S2', '16米的往返时间约为107纳秒。');
  expect(first.evidence.metrics.some((x) => x.value === '106.7 ns')).toBe(true);
  await range(page, '目标前表面距离', 60);
  const far = await record(page, 'S2', '60米比16米更远，往返时间应增加。');
  expect(far.evidence.metrics.some((x) => x.value === '400.3 ns')).toBe(true);
  await range(page, '光束偏转角', 20);
  const miss = await record(page, 'S2', '光束从目标旁边经过时，应没有有效回波读数。');
  expect(miss.evidence.metrics.filter((x) => x.value.includes('无有效读数'))).toHaveLength(2);
  await range(page, '光束偏转角', 0);
  await page.getByLabel('加入近处遮挡物（8m）', { exact: true }).check();
  const blocked = await record(page, 'S2', '最近的遮挡物会先产生回波。');
  expect(blocked.evidence.metrics.some((x) => x.value === '8.00 m')).toBe(true);
  expect((await runs(page, 'S2'))[0]).toEqual(first);
});

test('draft, prediction, explanation and evidence survive reload', async ({ page }) => {
  await open(page, '/#lidar/S3');
  await page.getByRole('combobox', { name: '天气', exact: true }).selectOption('rain');
  const run = await record(page, 'S3', '轻雨时仍可能测得回波，不能断言传感器失效。');
  const explanation =
    '我保持距离和角度相同，仅将晴朗改成轻雨；本次仍有可用回波，因此天气影响需要结合实际证据解释。';
  await page.locator('[data-explanation]').fill(explanation);
  await page.locator('[data-complete]').click();
  await page.reload();
  await expect(page.getByRole('combobox', { name: '天气', exact: true })).toHaveValue('rain');
  await expect(page.locator('[data-prediction]')).toHaveValue(run.prediction);
  await expect(page.locator('[data-explanation]')).toHaveValue(explanation);
  expect((await runs(page, 'S3'))[0]).toEqual(run);
});

test('keyboard controls and reduced motion retain the full experiment', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/#lidar/S2');
  await range(page, '目标前表面距离', 20);
  await page.locator('[data-prediction]').fill('增加距离后，光往返所需时间随之增加。');
  const run = page.locator('[data-run]');
  await run.focus();
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await runs(page, 'S2')).length).toBe(1);
  const teacher = page.locator('details.teacher-note > summary');
  await teacher.focus();
  await page.keyboard.press('Enter');
  await expect(teacher.locator('..')).toHaveJSProperty('open', true);
  expect((await runs(page, 'S2'))[0].evidence.metrics.some((x) => x.value === '133.4 ns')).toBe(true);
});

test('desktop and mobile keep controls and model inside the viewport', async ({ page }) => {
  for (const width of [1366, 1280, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await open(page, '/#lidar/S2');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    for (const selector of [
      '[data-model-stage]',
      '[data-experiment-controls]',
      '[data-prediction]',
      '[data-run]',
    ]) {
      const box = await page.locator(selector).boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(-1);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
    }
  }
});

test('WebGL context loss leaves a usable evidence experiment', async ({ page }) => {
  await open(page, '/#lidar/S2');
  await page.locator('[data-model-stage] canvas').dispatchEvent('webglcontextlost', { cancelable: true });
  await expect(page.locator('.lab-stage-fallback')).toContainText(/二维|备用/);
  const run = await record(page, 'S2', '即使三维显示暂时不可用，测距模型仍按相同物理关系产生证据。');
  expect(run.evidence.metrics.some((x) => x.value === '106.7 ns')).toBe(true);
  await expect(page.locator('[data-evidence]')).toContainText('106.7');
  await page.getByRole('combobox', { name: '天气', exact: true }).selectOption('fog');
  await expect(page.locator('.lab-stage-fallback')).toContainText('浓雾');
});

test('E1 preserves the motor output when only the transmission is disconnected', async ({ page }) => {
  await open(page, '/#explore/E1');
  await page.getByLabel('接通传动', { exact: true }).uncheck();
  const run = await record(page, 'E1');
  const scene = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).records.E1.runs[0].scene,
    storageKey,
  );
  expect(scene.running).toBe(true);
  expect(scene.transmission).toBe(false);
  expect(run.evidence.summary).toContain('电机');
});

for (const [label, raw] of [
  ['corrupted', '{broken-json'],
  ['future', JSON.stringify({ version: 999, records: {} })],
]) {
  test(`${label} storage remains intact while new draft is usable`, async ({ page }) => {
    await page.addInitScript(({ storageKey, raw }) => localStorage.setItem(storageKey, raw), {
      storageKey,
      raw,
    });
    await open(page, '/#lidar/S2');
    await page.locator('[data-prediction]').fill('这是一份新的预测，原来的无法读取记录必须保留。');
    await expect(page.locator('[data-save-status]')).toContainText('保留原数据');
    await page.locator('[data-run]').click();
    await expect(page.locator('[data-evidence-run]')).toHaveCount(1);
    expect(await page.evaluate((key) => localStorage.getItem(key), storageKey)).toBe(raw);
  });
}

test('rapid route changes dispose old model canvases and keep the final controls usable', async ({
  page,
}) => {
  await open(page, '/#lidar/S2');
  for (const route of ['explore/E2', 'history/H2', 'lidar/S1', 'explore/E1', 'lidar/S3']) {
    await page.evaluate((route) => {
      location.hash = route;
    }, route);
    await expect(page).toHaveURL(new RegExp(`#${route}$`));
    await expect(page.locator('[data-model-stage] canvas')).toHaveCount(1);
  }
  await expect(page.getByRole('combobox', { name: '天气', exact: true })).toBeVisible();
  await record(page, 'S3');
  await expect(page.locator('[data-model-stage] canvas')).toHaveCount(1);
});

test('explanation and prediction markup render as plain text in evidence and report', async ({ page }) => {
  await open(page, '/#lidar/S2');
  const text = '<img src=x onerror="window.__unexpectedExecution=true"> 我预测并解释：距离与往返时间成正比。';
  await record(page, 'S2', text);
  await page.locator('[data-explanation]').fill(text);
  await page.locator('[data-complete]').click();
  await expect(page.locator('[data-evidence]')).toContainText(text);
  await expect(page.locator('[data-evidence] img')).toHaveCount(0);
  await page.goto('/#report');
  await expect(page.locator('.report-list')).toContainText(text);
  await expect(page.locator('.report-list img')).toHaveCount(0);
  expect(await page.evaluate(() => Reflect.get(window, '__unexpectedExecution'))).toBeUndefined();
});

test('H2 disconnecting transmission keeps motor running and stops the wheels', async ({ page }) => {
  await open(page, '/#history/H2');
  await page.getByLabel('连接传动机构', { exact: true }).uncheck();
  const run = await record(page, 'H2', '断开传动后，电机仍有供能，但无法带动车轮。');
  expect(run.evidence.metrics).toEqual(
    expect.arrayContaining([
      { label: '电机', value: '转动' },
      { label: '车轮', value: '停止' },
    ]),
  );
  expect(run.draft.power).toBe(true);
  expect(run.draft.transmission).toBe(false);
});

test('S1 compares device information without treating range sensors as lamp color readers', async ({
  page,
}) => {
  await open(page, '/#lidar/S1');
  const sensor = page.getByRole('combobox', { name: '选择设备', exact: true });
  for (const [value, info] of [
    ['camera', '图像、颜色与纹理'],
    ['radar', '距离与相对运动'],
    ['lidar', '距离与轮廓'],
  ]) {
    await sensor.selectOption(value);
    const run = await record(page, 'S1', `我预测${value}提供的信息有其范围，需要与其他设备互补。`);
    expect(run.evidence.metrics.some((x) => x.value === info)).toBe(true);
    if (value !== 'camera')
      expect((run.evidence as Run['evidence'] & { notes: string[] }).notes.join('')).toContain('不直接读');
  }
  await expect(page.locator('[data-evidence-run]')).toHaveCount(3);
});

test('E2 keyboard inspection preserves focus through each evidence step', async ({ page }) => {
  await open(page, '/#explore/E2');
  for (const label of ['检查下一环：输入', '检查下一环：计算', '检查下一环：执行']) {
    const button = page.locator('[data-action="step"]');
    await expect(button).toHaveText(label);
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-action="step"]')).toBeFocused();
  }
  await expect(page.locator('[data-action="step"]')).toHaveText('从输入重新检查');
});

test('Q1 locks first answers and saves an explicit review correction separately', async ({ page }) => {
  await page.goto('/#knowledge/Q1');
  await expect(page.locator('.knowledge-question')).toHaveCount(3);
  for (let i = 0; i < 3; i++) await page.locator(`#knowledge-Q1-${i}-0`).check();
  await expect(page.locator('.knowledge-explanation')).toHaveCount(0);
  await page.getByRole('button', { name: '提交首次作答', exact: true }).click();
  await expect(page.locator('.knowledge-result')).toContainText('0 / 3');
  for (const radio of await page.getByRole('radio').all()) await expect(radio).toBeDisabled();
  const snapshot = await page.evaluate(
    () => JSON.parse(localStorage.getItem('science-learning:knowledge:v1')!).records.Q1.submitted,
  );
  await page.getByRole('button', { name: '主动查看讲评', exact: true }).click();
  await expect(page.locator('.knowledge-explanation')).toHaveCount(3);
  const correction = '原先只看到车轮不转；讲评提示我比较电机是否在转，才能区分供能和传动故障。';
  await page.locator('#knowledge-correction').fill(correction);
  await page.reload();
  await expect(page.locator('#knowledge-correction')).toHaveValue(correction);
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem('science-learning:knowledge:v1')!).records.Q1,
  );
  expect(saved.submitted).toEqual(snapshot);
  expect(saved.correction).toBe(correction);
  expect(saved.reviewed).toBe(true);
});

test('Q2 restores an unsubmitted answer draft and grades physically grounded measurement answers', async ({
  page,
}) => {
  await page.goto('/#knowledge/Q2');
  await page.getByRole('radio', { name: '摄像头', exact: true }).check();
  await page.reload();
  await expect(page.getByRole('radio', { name: '摄像头', exact: true })).toBeChecked();
  await expect(page.getByRole('button', { name: '提交首次作答', exact: true })).toBeVisible();
  await expect(page.locator('.knowledge-explanation')).toHaveCount(0);
  await page.getByRole('radio', { name: '约翻倍，从106.7 ns到213.5 ns', exact: true }).check();
  await page.getByRole('radio', { name: '不可以，目标状态未知，需要更多可靠证据', exact: true }).check();
  await page.getByRole('button', { name: '提交首次作答', exact: true }).click();
  await expect(page.locator('.knowledge-result')).toContainText('3 / 3');
  await page.getByRole('button', { name: '主动查看讲评', exact: true }).click();
  await expect(page.locator('.knowledge-explanation').nth(1)).toContainText('t = 2d/c');
  await expect(page.locator('.knowledge-explanation').nth(2)).toContainText('信号不足不等于目标不存在');
});
