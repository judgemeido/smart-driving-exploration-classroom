export type ActivityId = 'B1' | 'H1' | 'H2' | 'E1' | 'E2' | 'S1' | 'S2' | 'S3';
export type SectionId = 'battery' | 'history' | 'explore' | 'lidar';
/** Teaching geometry; dimensions are illustrative unless explicitly given in metres. */
export interface SceneSnapshot {
  kind: 'vehicle' | 'sensor' | 'battery' | 'evolution';
  batteryType?: 'lead-acid' | 'nimh' | 'lfp' | 'nmc';
  batteryFlow?: 'rest' | 'charge' | 'discharge';
  vehicleEra?: 'pioneer' | 'early-electric' | 'hybrid' | 'modern-ev';
  power?: boolean;
  transmission?: boolean;
  running?: boolean;
  exploded?: boolean;
  cutaway?: boolean;
  selected?: string;
  fault?: 'none' | 'input' | 'compute' | 'actuator';
  chainStep?: number;
  chainCommand?: boolean;
  chainExecuted?: boolean;
  sensor?: 'camera' | 'radar' | 'lidar';
  sensorView?: 'information' | 'measurement';
  distance?: number;
  angle?: number;
  occluded?: boolean;
  weather?: 'clear' | 'rain' | 'fog';
  showRay?: boolean;
  energy?: 'electric' | 'fuel' | 'hybrid';
}
export interface Finding {
  label: string;
  value: string;
}
export interface Observation {
  title: string;
  summary: string;
  metrics: Finding[];
  notes: string[];
  valid: boolean;
}
export interface ExperimentContext {
  activityId: ActivityId;
  initialDraft: unknown;
  setScene(snapshot: SceneSnapshot): void;
  onChange(): void;
}
export interface Experiment {
  getDraft(): unknown;
  observe(): Observation;
  selectPart?(part: string): void;
  setPresentation?(view: { exploded: boolean; cutaway: boolean }): void;
  demonstrate?(): void;
  dispose(): void;
}
export type ExperimentFactory = (host: HTMLElement, context: ExperimentContext) => Experiment;
export interface ActivityDefinition {
  id: ActivityId;
  section: SectionId;
  title: string;
  question: string;
  instruction: string;
  teacher: string;
  predictionPrompt: string;
  transfer: string;
}
export interface EvidenceRun {
  id: string;
  draft: unknown;
  scene: SceneSnapshot;
  evidence: Observation;
  prediction: string;
}
export interface ActivityRecord {
  draft: unknown;
  prediction: string;
  explanation: string;
  runs: EvidenceRun[];
  completed: boolean;
}
export interface Portfolio {
  version: 1;
  records: Partial<Record<ActivityId, ActivityRecord>>;
}
