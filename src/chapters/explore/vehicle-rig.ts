import * as THREE from 'three';
import { fallbackExplodeVectors, partCategoryForName, type PartCategory } from './data';
import type { createScene } from './scene';
import type { createScope } from '../../shared/lifecycle';
import { teachingAssemblyGroups, type AssemblyReturnState } from './assembly-state';

/** Owns authored vehicle transforms; DOM and mission progress stay in the controller. */
export function createVehicleRig(
  sceneState: ReturnType<typeof createScene>,
  scope: ReturnType<typeof createScope>,
) {
  const { scene, roadSurface } = sceneState;
  let modelRoot: THREE.Object3D | null = null;
  const materialCache = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  const visibilityCache = new Map<THREE.Object3D, boolean>();
  type DoorRig = { node: THREE.Object3D; direction: number; baseRotation: number };
  const doorRigs: DoorRig[] = [];
  let tailgateRig: { node: THREE.Object3D; baseRotation: number } | null = null;
  let doorsOpen = 0;
  let doorsOpenTarget = 0;
  let tailgateOpen = 0;
  let tailgateOpenTarget = 0;
  let lightsOn = false;
  type ExplosionRig = {
    node: THREE.Object3D;
    basePosition: THREE.Vector3;
    offset: THREE.Vector3;
    baseBox: THREE.Box3;
    key: string;
  };
  const explosionRigs: ExplosionRig[] = [];
  let assemblyRoot: THREE.Object3D | null = null;
  let explosionProgress = 0;
  let explosionTarget = 0;
  let teachingAssembly: AssemblyReturnState | null = null;
  const applyBlackVehicleFinish = (material: THREE.Material) => {
    if (material.name.toLowerCase() !== 'paint_multicoat') return;
    if (!(material instanceof THREE.MeshPhysicalMaterial)) return;
    material.color.set('#080a0a');
    material.metalness = 0.52;
    material.roughness = 0.24;
    material.clearcoat = 0.36;
    material.clearcoatRoughness = 0.16;
  };

  const applyLightStateToMaterial = (material: THREE.Material) => {
    const name = material.name.toLowerCase();
    const isHeadlight = name.includes('daylight_led') || name.includes('daylight');
    const isTailLight = name.includes('tail_optics_red') || name.includes('tail_optics');
    if (!isHeadlight && !isTailLight) return;
    if (!(material instanceof THREE.MeshStandardMaterial)) return;
    material.emissiveIntensity = lightsOn ? (isTailLight ? 2.1 : 1.7) : 0.06;
  };

  const applyLightState = () => {
    materialCache.forEach((material) => {
      const materials = Array.isArray(material) ? material : [material];
      materials.forEach(applyLightStateToMaterial);
    });
    modelRoot?.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach(applyLightStateToMaterial);
    });
  };

  const updateModelActions = (deltaSeconds: number) => {
    if (doorsOpen === doorsOpenTarget && tailgateOpen === tailgateOpenTarget) return;
    doorsOpen = THREE.MathUtils.damp(doorsOpen, doorsOpenTarget, 8, deltaSeconds);
    tailgateOpen = THREE.MathUtils.damp(tailgateOpen, tailgateOpenTarget, 8, deltaSeconds);
    if (Math.abs(doorsOpen - doorsOpenTarget) < 0.0001) doorsOpen = doorsOpenTarget;
    if (Math.abs(tailgateOpen - tailgateOpenTarget) < 0.0001) tailgateOpen = tailgateOpenTarget;
    doorRigs.forEach(({ node, direction, baseRotation }) => {
      node.rotation.y = baseRotation + direction * doorsOpen * 0.72;
    });
    if (tailgateRig) {
      tailgateRig.node.rotation.z = tailgateRig.baseRotation - tailgateOpen * 0.95;
    }
  };

  const setExplosionProgress = (progress: number) => {
    explosionRigs.forEach((rig) => {
      rig.node.position.copy(rig.basePosition).addScaledVector(rig.offset, progress);
    });
    assemblyRoot?.updateMatrixWorld(true);
  };

  const prepareExplosionRigs = () => {
    if (!modelRoot) return;
    assemblyRoot =
      modelRoot.getObjectByName('EV_SUV') ??
      modelRoot.children.find((child) => child.name === 'EV_SUV') ??
      null;
    if (!assemblyRoot) return;
    assemblyRoot.updateMatrixWorld(true);
    explosionRigs.length = 0;
    assemblyRoot.children.forEach((node) => {
      if (!node.name) return;
      const raw = (node.userData as { explode_vector_blender_m?: number[] } | undefined)
        ?.explode_vector_blender_m;
      const fallback = fallbackExplodeVectors[node.name] ?? [0, 0.7, 0];
      const vector = new THREE.Vector3(
        Number(raw?.[0] ?? fallback[0]),
        Number(raw?.[1] ?? fallback[1]),
        Number(raw?.[2] ?? fallback[2]),
      ).multiplyScalar(1.55);
      explosionRigs.push({
        node,
        basePosition: node.position.clone(),
        offset: vector,
        baseBox: new THREE.Box3().setFromObject(node),
        key: node.name,
      });
    });

    // Use the authored vectors first, then push overlapping assembly boxes apart.
    // The correction runs once, so the animation remains cheap while its final state is separated.
    for (let round = 0; round < 7; round += 1) {
      setExplosionProgress(1);
      const boxes = explosionRigs.map((rig) => new THREE.Box3().setFromObject(rig.node));
      let corrected = false;
      for (let i = 0; i < explosionRigs.length; i += 1) {
        for (let j = i + 1; j < explosionRigs.length; j += 1) {
          const first = boxes[i];
          const second = boxes[j];
          if (!first.intersectsBox(second)) continue;
          const firstCenter = first.getCenter(new THREE.Vector3());
          const secondCenter = second.getCenter(new THREE.Vector3());
          const delta = firstCenter.sub(secondCenter);
          const axis =
            Math.abs(delta.x) > Math.abs(delta.y) && Math.abs(delta.x) > Math.abs(delta.z)
              ? 'x'
              : Math.abs(delta.y) > Math.abs(delta.z)
                ? 'y'
                : 'z';
          const firstMin = first.min[axis];
          const firstMax = first.max[axis];
          const secondMin = second.min[axis];
          const secondMax = second.max[axis];
          const overlap = Math.min(firstMax, secondMax) - Math.max(firstMin, secondMin) + 0.1;
          if (overlap <= 0) continue;
          const sign = delta[axis] === 0 ? (i % 2 === 0 ? 1 : -1) : Math.sign(delta[axis]);
          const correction = (overlap / Math.max(modelRoot.scale.x, 0.0001)) * 0.55;
          const push = new THREE.Vector3();
          push[axis] = sign * correction;
          explosionRigs[i].offset.add(push);
          explosionRigs[j].offset.sub(push);
          corrected = true;
        }
      }
      if (!corrected) break;
    }
    setExplosionProgress(0);
    // Leaf details stay rigid relative to their assembly. Keep every articulated
    // owner live so doors, tailgate and teaching/explosion transforms still move.
    const moving = new Set<THREE.Object3D>(explosionRigs.map(rig => rig.node));
    doorRigs.forEach(rig => moving.add(rig.node));
    if (tailgateRig) moving.add(tailgateRig.node);
    modelRoot.traverse(object => {
      if (!(object instanceof THREE.Mesh) || moving.has(object)) return;
      object.updateMatrix();
      object.matrixAutoUpdate = false;
    });
  };

  const updateExplosion = (deltaSeconds: number) => {
    if (teachingAssembly || explosionProgress === explosionTarget) return;
    explosionProgress = THREE.MathUtils.damp(explosionProgress, explosionTarget, 5.5, deltaSeconds);
    if (Math.abs(explosionProgress - explosionTarget) < 0.0001) explosionProgress = explosionTarget;
    setExplosionProgress(explosionProgress);
  };

  const setTeachingAssemblyProgress = (state: AssemblyReturnState) => {
    teachingAssembly = state;
    roadSurface.visible = false;
    explosionRigs.forEach((rig) => {
      const group = teachingAssemblyGroups.find((item) => item.names.includes(rig.key));
      const progress =
        !group || state.returnedGroups.includes(group.id)
          ? 0
          : state.currentGroup === group.id
            ? 1 - state.progress
            : 1;
      rig.node.position.copy(rig.basePosition).addScaledVector(rig.offset, progress);
    });
    assemblyRoot?.updateMatrixWorld(true);
  };
  const clearTeachingAssembly = () => {
    teachingAssembly = null;
    setExplosionProgress(explosionProgress);
    roadSurface.visible = explosionTarget < 0.5;
  };

  const prepareModel = (root: THREE.Object3D) => {
    modelRoot = root;
    modelRoot.rotation.y = Math.PI * 0.08;
    modelRoot.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = false;
        object.receiveShadow = false;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(applyBlackVehicleFinish);
        materialCache.set(object, object.material);
      }
      visibilityCache.set(object, object.visible);
    });
    const registerDoor = (name: string, direction: number) => {
      const node = modelRoot?.getObjectByName(name);
      if (node) doorRigs.push({ node, direction, baseRotation: node.rotation.y });
    };
    registerDoor('Door_FL', -1);
    registerDoor('Door_RL', -1);
    registerDoor('Door_FR', 1);
    registerDoor('Door_RR', 1);
    const tailgateNode = modelRoot.getObjectByName('Tailgate');
    if (tailgateNode) tailgateRig = { node: tailgateNode, baseRotation: tailgateNode.rotation.z };
    applyLightState();
    const bounds = new THREE.Box3().setFromObject(modelRoot);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    modelRoot.position.sub(center);
    modelRoot.position.y += size.y * 0.5;
    const maxSize = Math.max(size.x, size.y, size.z);
    const scale = 3.7 / maxSize;
    modelRoot.scale.setScalar(scale);
    // Fit the closed vehicle to the road by its actual world-space bottom.
    // The small clearance prevents wheel geometry from z-fighting with the
    // asphalt while keeping the road visually connected to the vehicle.
    modelRoot.updateMatrixWorld(true);
    const fittedBounds = new THREE.Box3().setFromObject(modelRoot);
    modelRoot.position.y += -0.94 + 0.02 - fittedBounds.min.y;
    scene.add(modelRoot);
    return { size, scale };
  };

  const applyPartFilter = (category: PartCategory) => {
    if (!assemblyRoot) return null;
    explosionRigs.forEach((rig) => {
      const visibleBySource = visibilityCache.get(rig.node) ?? true;
      rig.node.visible = visibleBySource && (category === 'all' || partCategoryForName(rig.key) === category);
    });
    return category === 'all'
      ? explosionRigs.length
      : explosionRigs.filter((rig) => partCategoryForName(rig.key) === category).length;
  };

  // The scene scope owns GPU disposal. Release retained references after UI cleanup.
  scope.add(() => {
    materialCache.clear();
    visibilityCache.clear();
    doorRigs.length = 0;
    explosionRigs.length = 0;
    tailgateRig = null;
    assemblyRoot = null;
    modelRoot = null;
    teachingAssembly = null;
  });
  return {
    materialCache,
    visibilityCache,
    get assemblyRoot() {
      return assemblyRoot;
    },
    get explosionTarget() {
      return explosionTarget;
    },
    get animating() {
      return doorsOpen !== doorsOpenTarget || tailgateOpen !== tailgateOpenTarget ||
        (!teachingAssembly && explosionProgress !== explosionTarget);
    },
    prepareModel,
    prepareExplosionRigs,
    applyPartFilter,
    setTeachingAssemblyProgress,
    clearTeachingAssembly,
    toggleDoors() {
      doorsOpenTarget = doorsOpenTarget > 0.5 ? 0 : 1;
      return doorsOpenTarget > 0.5;
    },
    toggleTailgate() {
      tailgateOpenTarget = tailgateOpenTarget > 0.5 ? 0 : 1;
      return tailgateOpenTarget > 0.5;
    },
    toggleLights() {
      lightsOn = !lightsOn;
      applyLightState();
      return lightsOn;
    },
    setExploded(open: boolean) {
      if (!open && teachingAssembly?.status === 'complete') explosionProgress = 0;
      explosionTarget = open ? 1 : 0;
      roadSurface.visible = !open;
    },
    update(deltaSeconds: number) {
      updateModelActions(deltaSeconds);
      updateExplosion(deltaSeconds);
    },
  };
}
