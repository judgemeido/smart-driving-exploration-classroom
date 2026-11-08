import { expect, test, type Page } from '@playwright/test';
import type * as THREE from 'three';
import { exploreReviewQuestions } from '../../src/chapters/explore/learning-data';

type CameraObservation = { matrix: number[]; target: number[]; position: number[] };
type ExploreProbe = {
  scene?: THREE.Scene;
  camera?: THREE.Camera;
  orbitTarget?: number[];
  entry?: CameraObservation;
  exit?: CameraObservation;
};

// Three's existing devtools observation exposes the real renderer for test inspection.
// The application receives real mouse clicks; no mission state or hit results are replaced.
async function observeExplore(page: Page) {
  await page.addInitScript(() => {
    const probe: ExploreProbe = {};
    const devtools = new EventTarget();
    Object.assign(window, { __THREE_DEVTOOLS__: devtools, __exploreProbe: probe });
    const read = (): CameraObservation | undefined => {
      if (!probe.camera || !probe.orbitTarget) return;
      return {
        matrix: [...probe.camera.matrixWorld.elements],
        target: [...probe.orbitTarget],
        position: probe.camera.position.toArray(),
      };
    };
    // Capture immediately before the delegated controller saves the real pose,
    // and after it restores it. No RAF can run between these synchronous handlers.
    // Earlier samples can still damp; later samples may legitimately auto-rotate
    // after the original controls' 2500 ms inactivity timer.
    document.addEventListener(
      'click',
      (event) => {
        if ((event.target as Element).closest('[data-assembly-open]')) {
          probe.entry = read();
          probe.exit = undefined;
        }
      },
      true,
    );
    document.addEventListener('click', (event) => {
      if ((event.target as Element).closest('[data-assembly-cancel]')) probe.exit = read();
    });
    devtools.addEventListener('observe', (event) => {
      const renderer = (event as CustomEvent).detail as THREE.WebGLRenderer;
      if (renderer.domElement?.id !== 'model-canvas') return;
      const render = renderer.render;
      renderer.render = function (scene, camera) {
        if (probe.camera !== camera) {
          const lookAt = camera.lookAt;
          camera.lookAt = function (x: THREE.Vector3 | number, y?: number, z?: number) {
            probe.orbitTarget = typeof x === 'number' ? [x, y!, z!] : x.toArray();
            const target = probe.orbitTarget;
            return lookAt.call(this, target[0], target[1], target[2]);
          };
        }
        probe.scene = scene as THREE.Scene;
        probe.camera = camera;
        return render.call(this, scene, camera);
      };
    });
  });
}

async function cameraObservation(page: Page, boundary?: 'entry' | 'exit') {
  return page.evaluate((boundary) => {
    const probe = (window as unknown as { __exploreProbe: ExploreProbe }).__exploreProbe;
    if (boundary) {
      const observation = probe[boundary];
      if (!observation) throw new Error(`Missing native ${boundary} camera observation`);
      return observation;
    }
    if (!probe.camera || !probe.orbitTarget) throw new Error('Missing observed camera/OrbitControls target');
    return {
      matrix: [...probe.camera.matrixWorld.elements],
      target: [...probe.orbitTarget],
      position: probe.camera.position.toArray(),
    };
  }, boundary);
}

for (const timing of ['pending damping', 'resumed auto-rotation'] as const) {
  test(`02 cancel restores the actual custom camera and orbit target for assembly with ${timing}`, async ({
    page,
  }) => {
    await openExplore(page);
    await page.locator('[data-explode-toggle]').click();
    const original = await cameraObservation(page);
    const canvas = page.locator('#model-canvas');
    const rect = (await canvas.boundingBox())!;
    const start = { x: rect.x + rect.width * 0.5, y: rect.y + rect.height * 0.5 };
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x + rect.width * 0.16, start.y + rect.height * 0.08, { steps: 12 });
    await page.mouse.up();
    await page.mouse.move(start.x, start.y);
    await page.mouse.down({ button: 'right' });
    await page.mouse.move(start.x + rect.width * 0.05, start.y + rect.height * 0.035, { steps: 8 });
    await page.mouse.up({ button: 'right' });
    await page.mouse.wheel(0, -240);
    if (timing === 'resumed auto-rotation') {
      // Exercise the original 2500 ms inactivity timer as well as unsettled input.
      await page.waitForTimeout(2700);
      const rotating = await cameraObservation(page);
      await expect
        .poll(async () => {
          const current = await cameraObservation(page);
          return Math.hypot(...current.position.map((value, index) => value - rotating.position[index]));
        })
        .toBeGreaterThan(0.01);
    }
    await page.locator('[data-assembly-open]').click();
    const before = await cameraObservation(page, 'entry');
    expect(
      Math.hypot(...before.position.map((value, index) => value - original.position[index])),
    ).toBeGreaterThan(0.1);
    await page.locator('[data-assembly-next]').click();
    await page.waitForTimeout(250);
    await page.locator('[data-assembly-cancel]').click();
    await expect(page.locator('[data-assembly-open]')).toBeFocused();
    const after = await cameraObservation(page, 'exit');
    for (let index = 0; index < 16; index++)
      expect(after.matrix[index]).toBeCloseTo(before.matrix[index], 10);
    for (let index = 0; index < 3; index++) expect(after.target[index]).toBeCloseTo(before.target[index], 10);
    await expect(page.locator('[data-explode-toggle]')).toHaveAttribute('aria-pressed', 'true');
  });
}

async function openExplore(page: Page) {
  await observeExplore(page);
  await page.goto('/#explore');
  await expect(page.locator('[data-model-loading]')).toHaveClass(/is-complete/, { timeout: 30000 });
  if ((await page.locator('[data-powerflow-story]').getAttribute('aria-hidden')) === 'false') {
    await page.locator('[data-powerflow-skip]').click();
  }
  await expect(page.locator('[data-powerflow-replay]')).toHaveAttribute('aria-hidden', 'false');
}

async function navigate(page: Page, chapter: string) {
  if (await page.locator('[data-menu-button]').isVisible()) await page.locator('[data-menu-button]').click();
  await page.locator(`[data-go="${chapter}"]`).click();
  await expect(page.locator(`[data-page="${chapter}"]`)).toHaveClass(/is-active/);
}

async function pickAssembly(page: Page, assemblyName: string, learningTarget = false) {
  const popup = page.locator('[data-part-popup]');
  if ((await popup.getAttribute('aria-hidden')) === 'false') {
    await page.locator('[data-part-popup-close]').click();
  }
  const focus = { BatteryPack: 'battery', ADAS: 'adas', Cabin: 'cabin' }[assemblyName];
  if (focus && !learningTarget) await page.locator(`[data-focus="${focus}"]`).click();
  const point = await page.evaluate(
    async ({ name, learningTarget }) => {
      const probe = (window as unknown as { __exploreProbe: ExploreProbe }).__exploreProbe;
      const canvas = document.querySelector<HTMLCanvasElement>('#model-canvas')!;
      const rect = canvas.getBoundingClientRect();
      const assemblyRoot = probe.scene?.getObjectByName('EV_SUV');
      const target = assemblyRoot?.getObjectByName(name);
      if (!assemblyRoot || !target || !probe.camera) throw new Error(`Missing real model target ${name}`);
      const coreUrl = performance
        .getEntriesByType('resource')
        .map((entry) => entry.name)
        .find((url) => /\/three-core-[^/]+\.js/.test(url));
      if (!coreUrl) throw new Error('Missing loaded Three core chunk');
      const core = await import(/* @vite-ignore */ coreUrl);
      const Raycaster = Object.values(core).find(
        (value) =>
          typeof value === 'function' && value.prototype?.setFromCamera && value.prototype?.intersectObject,
      ) as typeof THREE.Raycaster;
      if (!Raycaster) throw new Error('Missing real Three raycaster');
      const Vector2 = Object.values(core).find(
        (value) => typeof value === 'function' && value.prototype?.rotateAround,
      ) as typeof THREE.Vector2;
      if (!Vector2) throw new Error('Missing real Three vector');
      const raycaster = new Raycaster();
      const diagnostic = {
        camera: probe.camera.position.toArray(),
        viewport: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        meshes: 0,
        sampled: 0,
        outside: 0,
        noHit: 0,
        matching: 0,
        blockedByDom: 0,
        occluders: {} as Record<string, number>,
      };
      const meshes: THREE.Mesh[] = [];
      target.traverse((object) => {
        if ((object as THREE.Mesh).isMesh) meshes.push(object as THREE.Mesh);
      });
      diagnostic.meshes = meshes.length;
      assemblyRoot.updateMatrixWorld(true);
      for (const mesh of meshes) {
        const positions = mesh.geometry.getAttribute('position');
        const indices = mesh.geometry.index;
        const count = indices?.count ?? positions.count;
        const stride = Math.max(3, Math.floor(count / 120 / 3) * 3);
        for (let index = 0; index + 2 < count; index += stride) {
          const center = mesh.position.clone().set(0, 0, 0);
          for (let vertex = 0; vertex < 3; vertex += 1) {
            const positionIndex = indices ? indices.getX(index + vertex) : index + vertex;
            center.add(mesh.position.clone().fromBufferAttribute(positions, positionIndex));
          }
          center.divideScalar(3).applyMatrix4(mesh.matrixWorld).project(probe.camera);
          diagnostic.sampled++;
          if (Math.abs(center.x) > 0.96 || Math.abs(center.y) > 0.96 || Math.abs(center.z) > 1) {
            diagnostic.outside++;
            continue;
          }
          raycaster.setFromCamera(new Vector2(center.x, center.y), probe.camera);
          const hit: THREE.Intersection | undefined = raycaster
            .intersectObject(assemblyRoot, true)
            .find((item) => (item.object as THREE.Mesh).isMesh);
          if (!hit) {
            diagnostic.noHit++;
            continue;
          }
          let hitAssembly: THREE.Object3D = hit.object;
          while (hitAssembly.parent && hitAssembly.parent !== assemblyRoot) hitAssembly = hitAssembly.parent;
          if (learningTarget) {
            let node: THREE.Object3D | null = hit.object;
            let matches = false;
            while (node) {
              if (node.name === name) matches = true;
              if (node === assemblyRoot) break;
              node = node.parent;
            }
            if (!matches) {
              const name = hit.object.name;
              diagnostic.occluders[name] = (diagnostic.occluders[name] ?? 0) + 1;
              continue;
            }
          } else if (hitAssembly.name !== name) continue;
          const x = rect.left + ((center.x + 1) * rect.width) / 2;
          const y = rect.top + ((1 - center.y) * rect.height) / 2;
          diagnostic.matching++;
          if (document.elementFromPoint(x, y) !== canvas) {
            diagnostic.blockedByDom++;
            continue;
          }
          return { x, y };
        }
      }
      throw new Error(`No unobstructed real-model click found for ${name}; ${JSON.stringify(diagnostic)}`);
    },
    { name: assemblyName, learningTarget },
  );
  await page.mouse.click(point.x, point.y);
  await expect(popup).toHaveAttribute('aria-hidden', learningTarget ? 'true' : 'false');
}

test('02 reviews the original three systems with correction and preserves the original mission', async ({
  page,
}) => {
  await openExplore(page);
  await expect(page.locator('[data-explore-review-open]')).toBeHidden();
  await page.locator('[data-disassembly-start]').click();
  await page.waitForTimeout(1500);
  for (const name of ['BatteryPack', 'ADAS', 'Cabin']) await pickAssembly(page, name);
  await page.locator('[data-part-popup-close]').click();
  await page.locator('[data-explore-review-open]').click();
  for (const question of exploreReviewQuestions) {
    const wrong = question.choices.find((c) => c.id !== question.correctChoiceId)!;
    await page.locator(`[data-review-answer="${wrong.id}"]`).click();
    await expect(page.locator(`[data-review-feedback="${question.id}"]`)).toContainText(
      question.retryFeedback,
    );
    await page.locator(`[data-review-answer="${question.correctChoiceId}"]`).click();
    await expect(page.locator(`[data-review-feedback="${question.id}"]`)).toContainText(
      question.correctFeedback,
    );
  }
  await expect(page.locator('[data-disassembly-progress]')).toHaveText('3 / 3');
  await page.locator('[data-explore-review-close]').click();
  await page.locator('[data-model-action="doors"]').click();
  await expect(page.locator('[data-model-action="doors"]')).toHaveAttribute('aria-pressed', 'true');
});

test('02 teaching return pauses, restores cancel, completes closed, and leaves original explosion usable', async ({
  page,
}) => {
  await openExplore(page);
  await page.locator('[data-explode-toggle]').click();
  await page.locator('[data-assembly-open]').click();
  await page.locator('[data-assembly-next]').click();
  await page.waitForTimeout(250);
  await navigate(page, 'history');
  await page.waitForTimeout(1100);
  await navigate(page, 'explore');
  await expect(page.locator('[data-assembly-count]')).toHaveText('0 / 4');
  await page.locator('[data-assembly-cancel]').click();
  await expect(page.locator('[data-assembly-open]')).toBeFocused();
  await expect(page.locator('[data-explode-toggle]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-assembly-open]').click();
  for (let index = 1; index <= 4; index++) {
    await page.locator('[data-assembly-next]').click();
    await expect(page.locator('[data-assembly-count]')).toHaveText(`${index} / 4`);
  }
  await expect(page.locator('[data-assembly-summary]')).toContainText('已完成');
  await page.locator('[data-assembly-cancel]').click();
  await expect(page.locator('[data-explode-toggle]')).toHaveAttribute('aria-pressed', 'false');
  await page.locator('[data-explode-toggle]').click();
  await expect(page.locator('[data-explode-toggle]')).toHaveAttribute('aria-pressed', 'true');
  await navigate(page, 'lidar');
  await navigate(page, 'explore');
  await page.locator('[data-model-action="lights"]').click();
  await expect(page.locator('[data-model-action="lights"]')).toHaveAttribute('aria-pressed', 'true');
});

test('02 duplicate learning controls are removed while model retry and assembly remain', async ({ page }) => {
  await page.route('**/assets/yaojing-s9-optimized.glb', (route) => route.abort());
  await page.goto('/#explore');
  await expect(page.locator('[data-model-loading-label]')).toContainText('失败');
  await expect(page.locator('[data-learning-start]')).toHaveCount(0);
  await expect(page.locator('[data-explore-learning]')).toHaveCount(0);
  await expect(page.locator('[data-disassembly-start]')).toBeVisible();
  await expect(page.locator('[data-assembly-open]')).toBeVisible();
  await page.unroute('**/assets/yaojing-s9-optimized.glb');
  await page.getByRole('button', { name: '重新加载模型', exact: true }).click();
  await expect(page.locator('[data-model-loading]')).toHaveClass(/is-complete/, { timeout: 30000 });
  await page.locator('[data-assembly-open]').click();
  await page.locator('[data-assembly-next]').click();
  await page.waitForTimeout(250);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await expect(page.locator('[data-explore-assembly]')).toBeHidden();
  await page.locator('[data-assembly-open]').click();
  await expect(page.locator('[data-assembly-count]')).toHaveText('0 / 4');
});
