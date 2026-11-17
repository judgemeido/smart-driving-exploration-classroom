import { expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createRigidBatches } from '../../src/shared/rigid-batches';

function fixture() {
  const root = new THREE.Group(), door = new THREE.Group();
  const material = new THREE.MeshStandardMaterial();
  const sources = [0, 1, 2].map(i => {
    const source = new THREE.Mesh(new THREE.BoxGeometry(.2, .3, .1), material);
    source.name = `Bolt_${i}`;
    source.position.set(i * .4, .2, 0);
    source.updateMatrix();
    source.matrixAutoUpdate = false;
    door.add(source);
    return source;
  });
  root.add(door);
  return { root, door, material, sources };
}

it('preserves geometry bounds and triangles while a batched door rotates and explodes', () => {
  const { root, door, sources } = fixture();
  const batches = createRigidBatches(root);
  expect(batches.count).toBe(1);
  for (const [rotation, offset] of [[0, 0], [.72, 1.55]]) {
    door.rotation.y = rotation;
    door.position.y = offset;
    root.updateMatrixWorld(true);
    const expected = new THREE.Box3().setFromObject(door);
    batches.render(() => {
      root.updateMatrixWorld(true);
      const proxy = door.children.find(child => !sources.includes(child as THREE.Mesh)) as THREE.Mesh;
      const actual = new THREE.Box3().setFromObject(proxy);
      expect(actual.min.distanceTo(expected.min)).toBeLessThan(1e-6);
      expect(actual.max.distanceTo(expected.max)).toBeLessThan(1e-6);
      expect(proxy.geometry.index!.count).toBe(sources.reduce((n, s) => n + s.geometry.index!.count, 0));
      expect(sources.every(s => !s.visible)).toBe(true);
    });
    expect(door.children).toEqual(sources);
    expect(sources.every(s => s.visible)).toBe(true);
  }
  const raycaster = new THREE.Raycaster(new THREE.Vector3(0, 1.75, 2), new THREE.Vector3(0, 0, -1));
  expect(raycaster.intersectObject(root, true)[0].object.name).toBe('Bolt_0');
  batches.dispose();
});

it('falls back for individual highlighting, visibility, transparency or edited transforms', () => {
  const { root, door, material, sources } = fixture();
  const batches = createRigidBatches(root);
  const expectOriginal = () => batches.render(() => expect(door.children).toEqual(sources));
  sources[0].material = material.clone();
  expectOriginal();
  sources[0].material.dispose(); sources[0].material = material;
  sources[1].visible = false; expectOriginal(); expect(sources[1].visible).toBe(false);
  sources[1].visible = true;
  material.transparent = true; expectOriginal(); material.transparent = false;
  sources[2].position.x += .1; sources[2].updateMatrix(); expectOriginal();
  batches.dispose();
});

it('restores authored nodes even if drawing fails and only disposes proxy geometry', () => {
  const { root, door, material, sources } = fixture();
  const batches = createRigidBatches(root);
  const dispose = vi.spyOn(material, 'dispose');
  let geometryDispose: ReturnType<typeof vi.spyOn> | undefined;
  expect(() => batches.render(() => {
    const proxy = door.children.at(-1) as THREE.Mesh;
    geometryDispose = vi.spyOn(proxy.geometry, 'dispose');
    throw new Error('context lost');
  })).toThrow('context lost');
  expect(door.children).toEqual(sources);
  expect(sources.every(s => s.visible)).toBe(true);
  batches.dispose(); batches.dispose();
  expect(geometryDispose).toHaveBeenCalledTimes(1);
  expect(dispose).not.toHaveBeenCalled();
});

it('converts quantized positions before baking translations without clipping them', () => {
  const root = new THREE.Group(), material = new THREE.MeshBasicMaterial();
  for (const x of [3, 5]) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Int16Array([0, 0, 0, 32767, 0, 0, 0, 32767, 0]), 3, true));
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = x; mesh.updateMatrix(); mesh.matrixAutoUpdate = false; root.add(mesh);
  }
  const batches = createRigidBatches(root);
  batches.render(() => {
    const proxy = root.children.at(-1) as THREE.Mesh;
    expect(proxy.geometry.boundingBox!.min.x).toBe(3);
    expect(proxy.geometry.boundingBox!.max.x).toBe(6);
  });
  batches.dispose();
});
