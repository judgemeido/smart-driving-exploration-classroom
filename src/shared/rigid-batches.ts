import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Render-only batches. Authored nodes remain the source of picking and articulation. */
export function createRigidBatches(root: THREE.Object3D) {
  type Batch = { mesh: THREE.Mesh; parent: THREE.Object3D; sources: THREE.Mesh[]; matrices: THREE.Matrix4[] };
  const batches: Batch[] = [];
  const hidden: THREE.Mesh[] = [];
  const attached: Batch[] = [];
  let disposed = false;
  const parents: THREE.Object3D[] = [];
  root.traverse(parent => { if (parent.children.length > 1) parents.push(parent); });
  for (const parent of parents) {
    const buckets = new Map<string, THREE.Mesh[]>();
    for (const child of parent.children) {
      if (!(child instanceof THREE.Mesh) || child instanceof THREE.SkinnedMesh ||
          child instanceof THREE.InstancedMesh || child.children.length || child.matrixAutoUpdate ||
          Array.isArray(child.material) || child.material.transparent || child.material.transmission > 0 ||
          Object.keys(child.geometry.morphAttributes).length || child.matrix.determinant() <= 0 ||
          child.geometry.drawRange.start !== 0 || child.geometry.drawRange.count !== Infinity) continue;
      const attributes = Object.keys(child.geometry.attributes).sort().map(name => {
        const attr = child.geometry.getAttribute(name) as THREE.BufferAttribute;
        return `${name}:${attr.array.constructor.name}:${attr.itemSize}:${attr.normalized}:${attr.gpuType}`;
      });
      const key = [child.material.uuid, child.geometry.index !== null, child.renderOrder,
        child.layers.mask, child.castShadow, child.receiveShadow, ...attributes].join('|');
      const bucket = buckets.get(key) ?? [];
      bucket.push(child);
      buckets.set(key, bucket);
    }
    for (const sources of buckets.values()) {
      if (sources.length < 2) continue;
      const geometries = sources.map(source => {
        const geometry = source.geometry.clone();
        // Quantized GLB attributes cannot hold the full translated/rotated coordinates.
        for (const name of ['position', 'normal', 'tangent']) {
          const attribute = geometry.getAttribute(name);
          if (!attribute) continue;
          const values = new Float32Array(attribute.count * attribute.itemSize);
          for (let i = 0; i < attribute.count; i++) {
            for (let c = 0; c < attribute.itemSize; c++) values[i * attribute.itemSize + c] = attribute.getComponent(i, c);
          }
          geometry.setAttribute(name, new THREE.BufferAttribute(values, attribute.itemSize));
        }
        return geometry.applyMatrix4(source.matrix);
      });
      const geometry = mergeGeometries(geometries);
      geometries.forEach(item => item.dispose());
      if (!geometry) continue;
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      const mesh = new THREE.Mesh(geometry, sources[0].material);
      mesh.name = 'RENDER_ONLY_BATCH';
      mesh.matrixAutoUpdate = false;
      mesh.raycast = () => {}; // A proxy can never replace a named part in the inspector.
      batches.push({ mesh, parent, sources, matrices: sources.map(source => source.matrix.clone()) });
    }
  }
  return {
    get count() { return batches.length; },
    render(draw: () => void, enabled = true) {
      if (disposed || !enabled) { draw(); return; }
      try {
        for (const batch of batches) {
          const { mesh, sources, matrices, parent } = batch;
          const first = sources[0];
          const material = first.material;
          if (Array.isArray(material) || material.transparent ||
              (material as THREE.MeshPhysicalMaterial).transmission > 0 ||
              !sources.every((source, i) => source.parent === parent && source.visible &&
                source.material === material && !source.matrixAutoUpdate && source.matrix.equals(matrices[i]) &&
                source.renderOrder === first.renderOrder && source.layers.mask === first.layers.mask &&
                source.castShadow === first.castShadow && source.receiveShadow === first.receiveShadow)) continue;
          mesh.material = material;
          mesh.renderOrder = first.renderOrder;
          mesh.layers.mask = first.layers.mask;
          mesh.castShadow = first.castShadow;
          mesh.receiveShadow = first.receiveShadow;
          parent.add(mesh);
          attached.push(batch);
          for (const source of sources) { source.visible = false; hidden.push(source); }
        }
        draw();
      } finally {
        for (const source of hidden) source.visible = true;
        for (const { mesh, parent } of attached) parent.remove(mesh);
        hidden.length = attached.length = 0;
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      // Materials still belong to the original model, not these render proxies.
      for (const { mesh } of batches) mesh.geometry.dispose();
      batches.length = 0;
    },
  };
}
