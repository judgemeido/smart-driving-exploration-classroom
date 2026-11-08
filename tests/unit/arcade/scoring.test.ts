import { describe, expect, it } from 'vitest';
import { calculateArcadeScore, createComparisonKey } from '../../../src/shared/arcade/scoring';
import {
  parseChallengeCode,
  createActivitySeed,
  createSeededRandom,
} from '../../../src/shared/arcade/challenge-code';

describe('science arcade score', () => {
  it.each([
    [1000, 1000, 180000, 1000],
    [1000, 1000, 270000, 950],
    [1000, 800, 270000, 910],
    [600, 400, 360000, 500],
  ])('scores E=%i F=%i t=%i', (e, f, t, total) => {
    const objectives = [
      { id: 'first', weight: f, completed: true, firstCorrect: true, usedHint: false },
      { id: 'corrected', weight: e - f, completed: true, firstCorrect: false, usedHint: false },
      { id: 'rest', weight: 1000 - e, completed: false, firstCorrect: false, usedHint: false },
    ].filter((o) => o.weight > 0);
    expect(calculateArcadeScore(objectives, t, 360000).total).toBe(total);
  });
  it('rejects invalid objective weights instead of producing a plausible score', () => {
    expect(() =>
      calculateArcadeScore(
        [{ id: 'a', weight: 999, completed: true, firstCorrect: true, usedHint: false }],
        0,
        360000,
      ),
    ).toThrow();
  });
  it('separates profile and version in comparison keys', () => {
    const c = {
      activityId: 'history-lab',
      challengeCode: 'SA1-R07-7K2M4C-G',
      profile: 'guided',
      contentVersion: 'one',
      scoringVersion: 'one',
      durationMs: 360000,
    } as const;
    expect(createComparisonKey(c)).not.toBe(createComparisonKey({ ...c, profile: 'standard' }));
    expect(createComparisonKey(c)).not.toBe(createComparisonKey({ ...c, contentVersion: 'two' }));
  });
});
describe('challenge codes', () => {
  it('normalizes valid codes and rejects wrong characters or versions', () => {
    expect(parseChallengeCode(' sa1-r07-7k2m4c-g ')).toMatchObject({
      code: 'SA1-R07-7K2M4C-G',
      profile: 'guided',
      seed: '7K2M4C',
    });
    expect(parseChallengeCode('SA2-R07-7K2M4C-G')).toBeNull();
    expect(parseChallengeCode('SA1-R07-7K2M0C-G')).toBeNull();
  });
  it('keeps scenarios deterministic while splitting activity streams', () => {
    const seed = createActivitySeed('7K2M4C', 'sensor-lab');
    const a = createSeededRandom(seed),
      b = createSeededRandom(seed);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(seed).not.toBe(createActivitySeed('7K2M4C', 'history-lab'));
  });
});
