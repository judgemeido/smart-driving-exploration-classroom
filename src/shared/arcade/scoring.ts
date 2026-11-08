import { parseChallengeCode } from './challenge-code';
import type { ArcadeRunConfig, ArcadeScore, ObjectiveProgress } from './types';
export function validObjectives(objectives: readonly { id: string; weight: number }[]): boolean {
  return (
    Array.isArray(objectives) &&
    objectives.length > 0 &&
    objectives.length <= 100 &&
    objectives.every(
      (o) =>
        o &&
        typeof o.id === 'string' &&
        o.id.length > 0 &&
        o.id.length <= 100 &&
        Number.isInteger(o.weight) &&
        o.weight > 0,
    ) &&
    new Set(objectives.map((o) => o.id)).size === objectives.length &&
    objectives.reduce((s, o) => s + o.weight, 0) === 1000
  );
}
export function validRunConfig(config: ArcadeRunConfig): boolean {
  if (
    !config ||
    !['history-lab', 'structure-lab', 'sensor-lab'].includes(config.activityId) ||
    !['guided', 'standard'].includes(config.profile) ||
    !['practice', 'contest'].includes(config.mode)
  )
    return false;
  const code = parseChallengeCode(config.challengeCode);
  return (
    !!code &&
    code.code === config.challengeCode &&
    code.profile === config.profile &&
    (config.mode === 'contest' ? config.durationMs === 360000 : config.durationMs === null) &&
    ['contentVersion', 'scoringVersion', 'slotId', 'nickname'].every(
      (k) =>
        typeof config[k as keyof ArcadeRunConfig] === 'string' &&
        (config[k as keyof ArcadeRunConfig] as string).length > 0 &&
        (config[k as keyof ArcadeRunConfig] as string).length <= 100,
    ) &&
    Array.from(config.nickname).length <= 12 &&
    validObjectives(config.objectives)
  );
}
export function calculateArcadeScore(
  objectives: readonly ObjectiveProgress[],
  elapsedMs: number,
  durationMs: number,
): ArcadeScore {
  if (!validObjectives(objectives) || !Number.isFinite(elapsedMs) || elapsedMs < 0 || durationMs !== 360000)
    throw new Error('Invalid arcade scoring input');
  const e = objectives.reduce((s, o) => s + (o.completed ? o.weight : 0), 0);
  const f = objectives.reduce((s, o) => s + (o.completed && o.firstCorrect && !o.usedHint ? o.weight : 0), 0);
  const progress = Math.floor((700 * e) / 1000),
    quality = Math.floor((200 * f) / 1000);
  const efficiency =
    e === 1000 ? Math.floor(100 * Math.max(0, Math.min(1, (durationMs - elapsedMs) / 180000))) : 0;
  return { progress, quality, efficiency, total: progress + quality + efficiency };
}
export function createComparisonKey(
  config: Pick<
    ArcadeRunConfig,
    'activityId' | 'challengeCode' | 'profile' | 'contentVersion' | 'scoringVersion' | 'durationMs'
  >,
): string {
  return JSON.stringify([
    config.activityId,
    config.challengeCode,
    config.profile,
    config.contentVersion,
    config.scoringVersion,
    config.durationMs,
  ]);
}
