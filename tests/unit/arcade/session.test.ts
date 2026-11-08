import { describe, expect, it } from 'vitest';
import { createArcadeSession } from '../../../src/shared/arcade/session';
import { createArcadeRepository, recoverInterruptedArcadeDraft } from '../../../src/shared/arcade/storage';
import type { ArcadeRunConfig, ArcadeSnapshot } from '../../../src/shared/arcade/types';
const config = (mode: 'practice' | 'contest' = 'contest'): ArcadeRunConfig => ({
  activityId: 'sensor-lab',
  mode,
  profile: 'guided',
  challengeCode: 'SA1-R07-7K2M4C-G',
  contentVersion: 'science-arcade-content-1',
  scoringVersion: 'science-arcade-score-1',
  durationMs: mode === 'contest' ? 360000 : null,
  slotId: 'player',
  nickname: '实验员',
  objectives: [
    { id: 'a', weight: 200 },
    { id: 'b', weight: 800 },
  ],
});
function setup() {
  let time = 0;
  const repository = createArcadeRepository({ storage: null });
  const session = createArcadeSession({ repository, clock: { nowMs: () => time } });
  return {
    session,
    repository,
    advance: (t: number) => {
      time = t;
    },
  };
}
const fact = (
  id: string,
  revision: number,
  verdict: 'correct' | 'incorrect' = 'correct',
  usedHint = false,
) => ({ objectiveId: id, revision, verdict, usedHint });
describe('arcade session guards', () => {
  it('records corrected completion once and freezes a real result', () => {
    const { session, advance } = setup();
    expect(session.start(config()).ok).toBe(true);
    session.record([fact('a', 1, 'incorrect')]);
    session.record([fact('a', 1)]);
    session.record([fact('a', 2)]);
    advance(270000);
    session.record([fact('b', 1)]);
    const result = session.finish('completed')!;
    expect(result.score).toEqual({ progress: 700, quality: 160, efficiency: 50, total: 910 });
    expect(session.finish('timeout')).toBe(result);
    expect(session.record([])).toBe(false);
  });
  it('counts a hint before success but never changes an already completed objective', () => {
    const { session } = setup();
    session.start(config());
    session.record([fact('a', 1, 'correct', true)]);
    session.record([fact('a', 2, 'correct', false), fact('b', 1)]);
    expect(session.finish('completed')!.score!.quality).toBe(160);
  });
  it('times out before accepting an action at the exact budget boundary', () => {
    const { session, advance } = setup();
    session.start(config());
    advance(360000);
    expect(session.record([fact('a', 1)])).toBe(false);
    const r = session.finish('completed')!;
    expect(r.status).toBe('timeout');
    expect(r.score!.total).toBe(0);
  });
  it('continues the contest clock while inactive and refuses edits', () => {
    const { session, advance } = setup();
    session.start(config());
    session.setActive(false);
    advance(360000);
    expect(session.record([])).toBe(false);
    session.setActive(true);
    expect(session.finish('completed')!.status).toBe('timeout');
  });
  it('keeps practice untimed and allows a new practice only after finishing', () => {
    const { session, advance } = setup();
    session.start(config('practice'));
    advance(900000);
    session.setActive(false);
    expect(session.record([])).toBe(false);
    session.setActive(true);
    expect(session.record([fact('a', 1), fact('b', 1)])).toBe(true);
    expect(session.finish('completed')).toMatchObject({ elapsedMs: null, score: null, eligible: false });
    expect(session.start(config('practice')).ok).toBe(true);
  });
  it('notifies after record returns so candidate state can commit first', async () => {
    const { session } = setup();
    const snapshots: ArcadeSnapshot[] = [];
    session.start(config());
    session.subscribe((s) => snapshots.push(s));
    expect(snapshots).toHaveLength(1);
    session.record([fact('a', 1), fact('b', 1)]);
    expect(snapshots).toHaveLength(1);
    await Promise.resolve();
    expect(snapshots.at(-1)!.phase).toBe('finished');
  });
  it('rejects invalid facts atomically and prevents stale revision success', () => {
    const { session } = setup();
    session.start(config());
    expect(session.record([fact('a', 1), fact('unknown', 1)])).toBe(false);
    session.record([fact('a', 2, 'incorrect')]);
    session.record([fact('a', 1), fact('b', 1)]);
    expect(session.finish('timeout')!.objectives[0].completed).toBe(false);
  });
  it('retains the first contest lock but renaming cannot release it', () => {
    const { session, repository } = setup();
    session.start(config());
    session.finish('abandoned');
    repository.updatePreferences({ nickname: '别名' });
    expect(session.start({ ...config(), nickname: '别名' })).toEqual({ ok: false, reason: 'attempt-used' });
  });
  it('reports another live run without ending it, then explicitly recovers only the expected id', () => {
    const { session, repository } = setup();
    const start = session.start(config());
    if (!start.ok) throw Error();
    const second = createArcadeSession({ repository });
    expect(second.start({ ...config(), challengeCode: 'SA1-R08-7K2M4C-G' })).toEqual({
      ok: false,
      reason: 'other-run-active',
    });
    expect(repository.read().results).toHaveLength(0);
    expect(recoverInterruptedArcadeDraft(repository, 'wrong')).toBeNull();
    expect(recoverInterruptedArcadeDraft(repository, start.runId)?.status).toBe('interrupted');
    expect(recoverInterruptedArcadeDraft(repository, start.runId)).toBeNull();
  });
  it('refuses a domain edit after an explicitly recovered run loses ownership', () => {
    const { session, repository } = setup();
    const start = session.start(config());
    if (!start.ok) throw Error();
    recoverInterruptedArcadeDraft(repository, start.runId);
    expect(session.record([fact('a', 1)])).toBe(false);
    expect(repository.read().results).toHaveLength(1);
  });
});
