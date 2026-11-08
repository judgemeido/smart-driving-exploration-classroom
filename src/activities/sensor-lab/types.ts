import type { DomainFact } from '../../shared/arcade/types';
export type Profile = 'guided'|'standard';
export type ObjectiveId = 'pulse-hit'|'echo-received'|'outline-evidence'|'nearest-mark'|'sensor-evidence'|'risk-response';
export type SensorId = 'lidar'|'radar'|'camera';
export interface Point { readonly x:number; readonly y:number }
export interface SensorTarget { readonly id:string; readonly label:string; readonly reflectivePoint:Point; readonly bearingDegrees:number }
export interface WeatherTarget { readonly id:string; readonly label:string; readonly reflectivePoint:Point; readonly visibleSampleIds:readonly string[]; readonly noiseSampleIds:readonly string[] }
export interface SensorScenario { readonly profile:Profile; readonly seed:string|number; readonly contentVersion:string; readonly angleStep:number; readonly halfAngleDegrees:number; readonly rulerStep:number; readonly rulerTolerance:number; readonly weather:'rain'|'fog'; readonly targets:readonly SensorTarget[]; readonly weatherTargets:readonly WeatherTarget[] }
export interface RayHit { readonly reflectivePoint:Point; readonly distanceMeters:number; readonly roundTripNanoseconds:number }
export type Stage = 'pulse'|'scan'|'weather';
export interface SensorState {
  readonly stage:Stage; readonly revision:number; readonly directionDegrees:number; readonly receiverPort:'tx'|'rx'|null;
  readonly fired:boolean; readonly rayTargetId:string|null; readonly completed:readonly ObjectiveId[]; readonly hinted:readonly ObjectiveId[];
  readonly scanDegrees:number; readonly scanStarted:boolean; readonly sampleSlots:readonly number[]; readonly selectedTargetId:string|null; readonly rulerMeters:number;
  readonly evidenceSlots:readonly [SensorId|null,SensorId|null]; readonly action:'continue'|'slow'|'stop'; readonly signal:boolean; readonly feedback:string;
  readonly submitted:readonly string[];
}
export type SensorAction =
 | {type:'direction';degrees:number}|{type:'connect-receiver';port:'tx'|'rx'|null}|{type:'fire'}
 | {type:'scan';degrees:number}|{type:'confirm-outline'}|{type:'select-target';targetId:string}|{type:'ruler';meters:number}|{type:'confirm-nearest'}
 | {type:'plug-evidence';slot:0|1;sensor:SensorId|null}|{type:'confirm-evidence'}|{type:'action';action:'continue'|'slow'|'stop'}|{type:'signal';enabled:boolean}|{type:'apply-plan'}
 | {type:'next'}|{type:'hint';objectiveId:ObjectiveId};
export interface SensorTransition { readonly state:SensorState; readonly facts:readonly DomainFact[] }
export interface MeasuredTarget extends SensorTarget {readonly distanceMeters:number;readonly roundTripNanoseconds:number;readonly uniqueSampleIds:readonly string[]}
export interface SensorSnapshot extends SensorState {readonly measuredTargets:readonly MeasuredTarget[];readonly ray:RayHit|null;readonly weatherEvidence:readonly (WeatherTarget & {readonly confirmedFields:readonly string[]})[]}
