import type { ChapterController } from '../../app/types';
import type { ActivityId, ArcadeRunConfig, ArcadeSession } from '../../shared/arcade/types';
export type UiFeedback = {
  kind: 'instruction' | 'incomplete' | 'correction' | 'success';
  text: string;
  objectId?: string;
  evidence?: readonly string[];
};
export type UiPrimaryAction = { id: string; label: string; disabled: boolean; reason?: string };
export interface ArcadeShellModel {
  title: string;
  goal: string;
  stageLabel: string;
  timing: { mode: 'practice' | 'contest'; remainingMs: number | null };
  primary: UiPrimaryAction;
  feedback: UiFeedback;
}
export interface ArcadeShell {
  readonly stage: HTMLElement;
  readonly tools: HTMLElement;
  readonly evidence: HTMLElement;
  update(model: ArcadeShellModel): void;
  dispose(): void;
}
export interface ArcadeGameContext {
  host: HTMLElement;
  session: ArcadeSession;
  config: ArcadeRunConfig;
  seed: number;
  setGoal(text: string): void;
  setFeedback(text: string): void;
}
export type ArcadeGameController = ChapterController;
export interface ArcadeActivityDefinition {
  activityId: ActivityId;
  title: string;
  description: string;
  objectives: readonly { id: string; weight: number }[];
  tutorial?: readonly string[];
  createGame(context: ArcadeGameContext): ArcadeGameController;
}
