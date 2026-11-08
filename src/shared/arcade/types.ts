export type ActivityId = 'history-lab' | 'structure-lab' | 'sensor-lab';
export type Profile = 'guided' | 'standard';
export type FinishReason = 'completed' | 'timeout' | 'abandoned' | 'interrupted';
export type Persistence = 'saved' | 'memory-only' | 'read-only';
export interface DomainFact {
  objectiveId: string;
  revision: number;
  verdict: 'correct' | 'incorrect';
  usedHint: boolean;
}
export interface ObjectiveProgress {
  id: string;
  weight: number;
  completed: boolean;
  firstCorrect: boolean;
  usedHint: boolean;
}
export interface ArcadeRunConfig {
  activityId: ActivityId;
  mode: 'practice' | 'contest';
  profile: Profile;
  challengeCode: string;
  contentVersion: string;
  scoringVersion: string;
  durationMs: 360000 | null;
  slotId: string;
  nickname: string;
  objectives: readonly { id: string; weight: number }[];
}
export interface ArcadeScore {
  progress: number;
  quality: number;
  efficiency: number;
  total: number;
}
export interface ArcadeResult {
  runId: string;
  config: ArcadeRunConfig;
  status: FinishReason;
  eligible: boolean;
  elapsedMs: number | null;
  objectives: readonly ObjectiveProgress[];
  score: ArcadeScore | null;
  createdEpochMs: number;
}
export interface ArcadeSnapshot {
  phase: 'idle' | 'running' | 'finished';
  runId: string | null;
  config: ArcadeRunConfig | null;
  elapsedMs: number | null;
  remainingMs: number | null;
  objectives: readonly ObjectiveProgress[];
  result: ArcadeResult | null;
  persistence: Persistence;
}
export type StartResult =
  | { ok: true; runId: string }
  | {
      ok: false;
      reason: 'invalid-config' | 'already-running' | 'attempt-used' | 'other-run-active' | 'capacity-full';
    };
export interface ArcadeSession {
  start(config: ArcadeRunConfig): StartResult;
  record(facts: readonly DomainFact[]): boolean;
  finish(reason: FinishReason): ArcadeResult | null;
  subscribe(listener: (snapshot: ArcadeSnapshot) => void): () => void;
  setActive(active: boolean): void;
  dispose(): void;
}
export interface ArcadePreferences {
  slotId: string;
  nickname: string;
  profile: Profile;
  lastChallengeCode: string | null;
  soundEnabled: boolean;
}
export interface ArcadeDraft {
  runId: string;
  slotId: string;
  comparisonKey: string;
  config: ArcadeRunConfig;
  objectives: readonly ObjectiveProgress[];
  elapsedMs: number;
  startedEpochMs: number;
  savedEpochMs: number;
}
export interface ArcadeLocalStoreV1 {
  schemaVersion: 1;
  dataVersion: 'science-arcade-1';
  revision: number;
  preferences: ArcadePreferences;
  activeDraft: ArcadeDraft | null;
  contestLocks: { slotId: string; comparisonKey: string; runId: string; createdEpochMs: number }[];
  results: ArcadeResult[];
}
export const CONTENT_VERSION = 'science-arcade-content-1';
export const SCORING_VERSION = 'science-arcade-score-1';
