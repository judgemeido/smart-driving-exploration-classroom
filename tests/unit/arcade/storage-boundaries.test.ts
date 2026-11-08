import { describe, expect, it } from 'vitest';
import { createArcadeSession } from '../../../src/shared/arcade/session';
import {
  ARCADE_STORAGE_KEY,
  createArcadeRepository,
  recoverInterruptedArcadeDraft,
} from '../../../src/shared/arcade/storage';
import type { ArcadeResult, ArcadeRunConfig } from '../../../src/shared/arcade/types';

function memory() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
}
const config: ArcadeRunConfig = {
  activityId: 'sensor-lab',
  mode: 'contest',
  profile: 'guided',
  challengeCode: 'SA1-R07-7K2M4C-G',
  contentVersion: 'science-arcade-content-1',
  scoringVersion: 'science-arcade-score-1',
  durationMs: 360000,
  slotId: 'player',
  nickname: '实验员',
  objectives: [{ id: 'a', weight: 1000 }],
};
const objective = { id: 'a', weight: 1000, completed: true, firstCorrect: true, usedHint: false };
function practice(id: string, date: number): ArcadeResult {
  return {
    runId: id,
    config: { ...config, mode: 'practice', durationMs: null },
    status: 'completed',
    eligible: false,
    elapsedMs: null,
    objectives: [objective],
    score: null,
    createdEpochMs: date,
  };
}

describe('storage retention and ownership boundaries', () => {
  it('refuses edits after another repository recovers the draft without a storage event', () => {
    const port = memory();
    const owner = createArcadeRepository({ storage: port });
    const session = createArcadeSession({ repository: owner });
    const started = session.start(config);
    if (!started.ok) throw new Error('failed setup');
    const other = createArcadeRepository({ storage: port });
    recoverInterruptedArcadeDraft(other, started.runId);
    expect(session.record([])).toBe(false);
    expect(session.record([{ objectiveId: 'a', revision: 1, verdict: 'correct', usedHint: false }])).toBe(
      false,
    );
    expect(owner.read().results).toHaveLength(1);
    expect(owner.read().results[0].status).toBe('interrupted');
  });

  it('cannot revive a cleared contest as an eligible timeout without a storage event', () => {
    const port = memory();
    const owner = createArcadeRepository({ storage: port });
    let time = 0;
    const session = createArcadeSession({ repository: owner, clock: { nowMs: () => time } });
    session.start(config);
    createArcadeRepository({ storage: port }).clearRecords();
    time = 360000;
    session.setActive(true);
    expect(session.finish('timeout')).toMatchObject({ status: 'interrupted', eligible: false, score: null });
    expect(owner.read().results).toHaveLength(0);
    expect(owner.read().contestLocks).toHaveLength(0);
  });

  it('keeps a locked formal result when newer practice records exceed 200', () => {
    const port = memory();
    const now = Date.now();
    const repository = createArcadeRepository({ storage: port, nowEpochMs: () => now + 1000 });
    const session = createArcadeSession({ repository, clock: { nowMs: () => 0 } });
    session.start(config);
    session.record([{ objectiveId: 'a', revision: 1, verdict: 'correct', usedHint: false }]);
    const formalId = repository.read().results[0].runId;
    for (let i = 0; i < 200; i++) repository.save(practice(`practice-${i}`, now + i + 1));
    expect(repository.read().results).toHaveLength(200);
    expect(repository.read().results.some((result) => result.runId === formalId)).toBe(true);
    expect(repository.read().results.some((result) => result.runId === 'practice-0')).toBe(false);
    expect(repository.read().contestLocks).toHaveLength(1);
  });

  it('discards an invalid eligibility flag but preserves its official lock', () => {
    const port = memory();
    const repository = createArcadeRepository({ storage: port });
    const session = createArcadeSession({ repository });
    session.start(config);
    session.record([{ objectiveId: 'a', revision: 1, verdict: 'correct', usedHint: false }]);
    const raw = JSON.parse(port.getItem(ARCADE_STORAGE_KEY)!);
    raw.results[0].eligible = false;
    port.setItem(ARCADE_STORAGE_KEY, JSON.stringify(raw));
    const reloaded = createArcadeRepository({ storage: port });
    expect(reloaded.read().results).toHaveLength(0);
    expect(reloaded.read().contestLocks).toHaveLength(1);
    expect(reloaded.notice).toContain('1');
  });

  it('expires 30-day records together and skips time deletion on a clock rollback', () => {
    let date = 40 * 86400000;
    const repository = createArcadeRepository({ storage: memory(), nowEpochMs: () => date });
    repository.save(practice('expired', 9 * 86400000));
    repository.save(practice('recent', 39 * 86400000));
    expect(repository.read().results.map((result) => result.runId)).toEqual(['recent']);
    date = 20 * 86400000;
    repository.save(practice('rollback', 19 * 86400000));
    expect(
      repository
        .read()
        .results.map((result) => result.runId)
        .sort(),
    ).toEqual(['recent', 'rollback']);
  });

  it('retains the lock after deleting a result and rejects a 201st live lock', () => {
    const repository = createArcadeRepository({ storage: memory() });
    for (let i = 0; i < 200; i++) {
      const current = { ...config, slotId: `player-${i}` };
      expect(
        repository.begin(current, `formal-${i}`, [{ ...objective, completed: false, firstCorrect: false }])
          .ok,
      ).toBe(true);
      repository.save({
        runId: `formal-${i}`,
        config: current,
        status: 'abandoned',
        eligible: false,
        elapsedMs: 0,
        objectives: [{ ...objective, completed: false, firstCorrect: false }],
        score: null,
        createdEpochMs: Date.now(),
      });
    }
    repository.deleteResult('formal-0');
    expect(repository.begin({ ...config, slotId: 'player-0' }, 'repeat', [objective])).toEqual({
      ok: false,
      reason: 'attempt-used',
    });
    expect(repository.begin({ ...config, slotId: 'new-player' }, 'overflow', [objective])).toEqual({
      ok: false,
      reason: 'capacity-full',
    });
    expect(repository.read().contestLocks).toHaveLength(200);
    expect(repository.read().results).toHaveLength(199);
  });
});
