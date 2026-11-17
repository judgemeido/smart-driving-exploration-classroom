import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { meshopt, dedup, flatten, join } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import { stat, writeFile } from 'node:fs/promises';

await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder,
});
const jobs = [
  ['public/assets/yaojing-s9-optimized.glb', 'public/assets/yaojing-s9-optimized-compressed.glb'],
  ['public/assets/yaojing-s9.glb', 'public/assets/yaojing-s9-traffic.glb', true],
  ['public/assets/lidar/ld016/LD016-engineering.glb', 'public/assets/lidar/ld016/LD016-engineering-compressed.glb'],
];
const report = [];
for (const [input, output, displayOnly] of jobs) {
  const document = await io.read(input);
  const root = document.getRoot();
  const names = root.listNodes().filter(n => n.getName()).map(n => n.getName());
  const count = () => root.listMeshes().reduce((sum, m) => sum + m.listPrimitives().length, 0);
  const before = count();
  // Only the traffic prop is flattened. Interactive exhibit nodes/extras stay intact.
  if (displayOnly) await document.transform(dedup({ keepUniqueNames: true }), flatten(), join());
  await document.transform(meshopt({ encoder: MeshoptEncoder, level: 'high', quantizePosition: 16, quantizeNormal: 12 }));
  if (!displayOnly && names.some(name => !root.listNodes().some(node => node.getName() === name)))
    throw new Error(`Lost an interactive node in ${input}`);
  await io.write(output, document);
  report.push({ input, output, originalBytes: (await stat(input)).size, compressedBytes: (await stat(output)).size,
    originalPrimitives: before, optimizedPrimitives: count(), interactiveNodeNamesPreserved: !displayOnly });
}
await writeFile('authoring/performance-tools/model-report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
