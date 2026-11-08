import type * as THREE from 'three';
import type { SceneSnapshot } from './types';

export type MechanicalMode = 'assembly' | 'section' | 'exploded';
export interface MechanicalView {
  mode: MechanicalMode;
  selected: string;
  isolate: boolean;
  /** Sensor optical mechanism is enlarged separately from the metre-scale test scene. */
  sensorScene: 'mechanism' | 'measurement';
}
export interface MechanicalCamera {
  position: [number, number, number];
  target: [number, number, number];
}
export interface MechanicalRig {
  root: THREE.Group;
  update(snapshot: SceneSnapshot, seconds: number, view: MechanicalView): void;
  camera(view: MechanicalView, snapshot: SceneSnapshot): MechanicalCamera;
  dispose(): void;
}
