import { expect, test } from '@playwright/test';
import { structureContent } from '../../src/activities/structure-lab/content';

for (const width of [320, 340, 390])
  test(`02 ${width}px keeps enlarged subsystem geometry and all directed edges visible`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/games/structure/index.html');
    await page.getByRole('button', { name: '开始练习', exact: true }).click();
    for (const [index, board] of structureContent.boards.entries()) {
      const scene = page.locator('.structure-scene');
      await expect(scene).toBeVisible();
      await expect(scene).toHaveClass(/structure-mobile-scene/);
      const sceneBox = (await scene.boundingBox())!;
      expect(sceneBox.width).toBeLessThanOrEqual(width);
      expect(sceneBox.height).toBeGreaterThan(340);
      for (const socket of board.sockets) {
        const slot = page.locator(`[data-socket="${socket.id}"]`);
        const box = (await slot.boundingBox())!;
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(120);
        await page.locator(`[data-part="${socket.partId}"]`).click();
        await slot.click();
      }
      if (board.id === 'support') await page.locator('[data-surface="wet"]').click();
      await page
        .locator('.structure-board')
        .screenshot({ path: testInfo.outputPath(`${width}-${board.id}-install.png`) });
      await page.locator('[data-structure-primary]').click();
      await expect(scene).toBeVisible();
      for (const edge of board.requiredEdges) {
        await page.locator(`[data-port="${edge.sourceId}"]`).click();
        await page.locator(`[data-port="${edge.targetId}"]`).click();
        await page.locator('[data-relation]').selectOption(edge.relationId);
        await page.locator('[data-connect-ports]').click();
      }
      const drawn = scene.locator('[data-structure-svg-edges] .structure-flow path');
      await expect(drawn).toHaveCount(board.requiredEdges.length);
      const lines = await drawn.evaluateAll((paths) =>
        paths.every((path) => {
          const line = path as SVGPathElement;
          const box = line.getBBox();
          return (
            line.getTotalLength() > 8 &&
            box.width + box.height > 8 &&
            getComputedStyle(line).display !== 'none' &&
            line.getAttribute('marker-end') === 'url(#structure-arrow)'
          );
        }),
      );
      expect(lines).toBe(true);
      const exposedArrows = await drawn.evaluateAll((paths) =>
        paths.every((path) => {
          const line = path as SVGPathElement,
            svg = line.ownerSVGElement!,
            matrix = svg.getScreenCTM()!;
          const endpoint = line.getPointAtLength(line.getTotalLength()).matrixTransform(matrix);
          const before = line
            .getPointAtLength(Math.max(0, line.getTotalLength() - 7))
            .matrixTransform(matrix);
          const cards = [...document.querySelectorAll<HTMLElement>('[data-port]')].map((node) =>
            node.getBoundingClientRect(),
          );
          const outside = (point: { x: number; y: number }) =>
            cards.every(
              (card) =>
                point.x < card.left || point.x > card.right || point.y < card.top || point.y > card.bottom,
            );
          return outside(endpoint) && outside(before);
        }),
      );
      expect(exposedArrows).toBe(true);
      await page
        .locator('.structure-board')
        .screenshot({ path: testInfo.outputPath(`${width}-${board.id}-links.png`) });
      await page.locator('[data-structure-primary]').click();
      if (index < 2) await page.locator('[data-structure-primary]').click();
    }
  });
test('02 has direct installation, correction and directed graph repair', async ({ page }) => {
  await page.goto('/games/structure/index.html');
  await page.getByRole('button', { name: '开始练习', exact: true }).click();
  await expect(page.locator('.structure-lab')).toBeVisible();
  await expect(page.locator('[data-model-canvas]')).toHaveCount(0);
  await page.locator('[data-part="part-motor"]').click();
  await page.locator('[data-socket="socket-power-battery"]').click();
  await page.getByRole('button', { name: '试运行', exact: true }).click();
  await expect(page.locator('[data-feedback]')).toContainText('请修正');
  for (const id of ['battery', 'motor', 'transmission', 'wheel']) {
    await page.locator(`[data-part="part-${id}"]`).click();
    await page.locator(`[data-socket="socket-power-${id}"]`).click();
  }
  await page.getByRole('button', { name: '试运行', exact: true }).click();
  await expect(page.locator('[data-structure-stage]')).toHaveText('系统关系');
  const connect = async (source: string, target: string, relation: string) => {
    await page.locator(`[data-port="node-${source}"]`).click();
    await page.locator(`[data-port="node-${target}"]`).click();
    await page.locator('[data-relation]').selectOption(relation);
    await page.locator('[data-connect-ports]').click();
  };
  await connect('battery', 'motor', 'rotation');
  await page.getByRole('button', { name: '验证系统', exact: true }).click();
  await expect(page.locator('[data-feedback]')).toContainText('还差');
  await connect('motor', 'transmission', 'rotation');
  await connect('transmission', 'wheel', 'rotation');
  await connect('wheel', 'road', 'contact-force');
  await page.getByRole('button', { name: '验证系统', exact: true }).click();
  await expect(page.locator('[data-feedback]')).toContainText('请修正');
  await page.locator('[data-remove-edge]').first().click();
  await connect('battery', 'motor', 'electric-energy');
  await page.getByRole('button', { name: '验证系统', exact: true }).click();
  await expect(page.locator('[data-feedback]')).toContainText('系统已连通');
  await page.getByRole('button', { name: '前往支撑台' }).click();
  await expect(page.locator('[data-structure-board]')).toHaveText('支撑台');
});

test('02 narrow-screen Tab focus stays exposed and relation options wait for endpoints', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 600 });
  await page.goto('/games/structure/index.html');
  await page.getByRole('button', { name: '开始练习', exact: true }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByRole('button', { name: '结束本局', exact: true }).focus();
  await page.keyboard.press('Tab');
  const slot = page.locator('[data-socket="socket-power-battery"]');
  await expect(slot).toBeFocused();
  const evidence = await slot.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const center = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    const hit = document.elementFromPoint(center.x, center.y);
    return {
      top: rect.top,
      bottom: rect.bottom,
      height: innerHeight,
      exposed: hit === element || element.contains(hit),
    };
  });
  expect(evidence.top).toBeGreaterThanOrEqual(0);
  // Browser focus scrolling may land within one CSS pixel of the viewport edge
  // after fractional layout rounding. The real hit test below still catches an
  // obscuring toolbar; tolerate only this subpixel scroll quantization.
  expect(evidence.bottom).toBeLessThanOrEqual(evidence.height + 1);
  expect(evidence.exposed).toBe(true);
  for (const id of ['battery', 'motor', 'transmission', 'wheel']) {
    await page.locator(`[data-part="part-${id}"]`).click();
    await page.locator(`[data-socket="socket-power-${id}"]`).click();
  }
  await page.locator('[data-structure-primary]').click();
  const relations = page.locator('[data-relation]');
  await expect(relations).toBeDisabled();
  await expect(relations.locator('option')).toHaveCount(4);
  await expect(relations.locator('option[value="image"]')).toHaveCount(0);
  await expect(relations.locator('option[value="radio-target"]')).toHaveCount(0);
  await page.locator('[data-port="node-battery"]').click();
  await expect(relations).toBeDisabled();
  await page.locator('[data-port="node-motor"]').click();
  await expect(relations).toBeEnabled();
  await page.keyboard.press('Escape');
  await expect(relations).toBeDisabled();
});

test('02 completes all thirteen installation topics and three systems with keyboard controls', async ({
  page,
}) => {
  const models: string[] = [];
  page.on('request', (request) => {
    if (/\.(glb|dae)(\?|$)/i.test(request.url())) models.push(request.url());
  });
  await page.goto('/games/structure/index.html');
  await page.getByRole('button', { name: '开始练习', exact: true }).click();
  const enter = async (selector: string) => {
    await page.locator(selector).focus();
    await page.keyboard.press('Enter');
  };
  for (const [index, board] of structureContent.boards.entries()) {
    for (const socket of board.sockets) {
      await enter(`[data-part="${socket.partId}"]`);
      await enter(`[data-socket="${socket.id}"]`);
    }
    if (board.id === 'support') {
      await enter('[data-structure-primary]');
      await expect(page.locator('[data-structure-stage]')).toHaveText('补装部件');
      await expect(page.locator('[data-feedback]')).toContainText('湿滑');
      await enter('[data-surface="wet"]');
    }
    if (board.id === 'perception') {
      await expect(page.locator('[data-socket="socket-sensor-millimeter-teaching"]')).toContainText(
        '教学示意',
      );
      await expect(page.locator('[data-part="part-millimeter-teaching"]')).toContainText('教学示意');
    }
    await enter('[data-structure-primary]');
    for (const edge of board.requiredEdges) {
      await enter(`[data-port="${edge.sourceId}"]`);
      await enter(`[data-port="${edge.targetId}"]`);
      await page.locator('[data-relation]').selectOption(edge.relationId);
      await enter('[data-connect-ports]');
    }
    await enter('[data-structure-primary]');
    if (index < 2) await enter('[data-structure-primary]');
  }
  await expect(page.locator('[data-result]')).toBeVisible();
  await expect(page.locator('[data-result-card]')).toContainText('16 / 16');
  await expect(page.locator('[data-result-card]')).toContainText('练习');
  expect(models).toEqual([]);
});

test('02 touch tap and cancelled drag preserve a correct installation', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.goto('/games/structure/index.html');
  await page.getByRole('button', { name: '开始练习', exact: true }).tap();
  const part = page.locator('[data-part="part-battery"]');
  await part.tap();
  await page.locator('[data-socket="socket-power-battery"]').tap();
  await expect(page.locator('[data-socket="socket-power-battery"]')).toContainText('动力电池');
  await part.scrollIntoViewIfNeeded();
  const bounds = (await part.boundingBox())!;
  await page.mouse.move(bounds.x + 30, bounds.y + 25);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 60, bounds.y + 55);
  await part.dispatchEvent('pointercancel', { pointerId: 1, pointerType: 'touch', isPrimary: true });
  await page.mouse.up();
  await expect(page.locator('.is-drop-target')).toHaveCount(0);
  await expect(page.locator('[data-socket="socket-power-battery"]')).toContainText('动力电池');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await context.close();
});
