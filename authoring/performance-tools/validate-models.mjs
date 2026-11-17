import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { getBounds } from '@gltf-transform/functions';
import { MeshoptDecoder } from 'meshoptimizer';

await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const jobs = JSON.parse(await (await import('node:fs/promises')).readFile('authoring/performance-tools/model-report.json', 'utf8'));
const report = [];
for (const job of jobs) {
  const original = (await io.read(job.input)).getRoot();
  const optimized = (await io.read(job.output)).getRoot();
  const bounds = getBounds(original.listScenes()[0]);
  const tolerance = Math.max(...bounds.max.map((n, i) => n - bounds.min[i])) * .0001;
  let maxBoundsError = 0, checkedNodes = 0;
  const checkBounds = (a, b) => {
    const before = getBounds(a), after = getBounds(b);
    for (const edge of ['min', 'max']) for (let i = 0; i < 3; i++) {
      if (!Number.isFinite(before[edge][i]) && !Number.isFinite(after[edge][i])) continue;
      const error = Math.abs(before[edge][i] - after[edge][i]);
      assert.ok(error <= tolerance, `Bounds changed: ${a.getName()} (${error} > ${tolerance})`);
      maxBoundsError = Math.max(maxBoundsError, error);
    }
  };
  checkBounds(original.listScenes()[0], optimized.listScenes()[0]);
  if (job.interactiveNodeNamesPreserved) {
    const available = new Map();
    for (const node of optimized.listNodes()) {
      const list = available.get(node.getName()) ?? [];
      list.push(node);
      available.set(node.getName(), list);
    }
    for (const node of original.listNodes().filter(n => n.getName())) {
      const target = available.get(node.getName())?.shift();
      assert.ok(target, `Missing interactive node: ${node.getName()}`);
      assert.deepEqual(target.getExtras(), node.getExtras(), `Changed part metadata: ${node.getName()}`);
      checkBounds(node, target);
      checkedNodes++;
    }
  }
  const triangles = root => root.listMeshes().reduce((total, mesh) => total + mesh.listPrimitives().reduce((sum, p) =>
    sum + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3, 0), 0);
  assert.equal(triangles(original), triangles(optimized), 'Geometry triangles were removed');
  report.push({ asset: job.output, checkedNamedNodes: checkedNodes, triangles: triangles(optimized),
    maxBoundsError, tolerance, extrasPreserved: job.interactiveNodeNamesPreserved });
}
await writeFile('authoring/performance-tools/model-validation.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
