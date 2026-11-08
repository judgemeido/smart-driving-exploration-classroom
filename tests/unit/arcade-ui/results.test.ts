import { expect, it } from 'vitest';
import { describeArcadeResult } from '../../../src/ui/arcade/results';
import type { ArcadeResult } from '../../../src/shared/arcade/types';
it('labels interrupted scores as observations and untimed practice without fake totals', () => {
  const base = {
    config: { mode: 'practice' },
    status: 'completed',
    score: null,
    elapsedMs: null,
    objectives: [{ completed: true }, { completed: false }],
    eligible: false,
  } as ArcadeResult;
  expect(describeArcadeResult(base)).toMatchObject({
    title: '练习完成',
    timing: '不限时练习',
    total: '观察记录',
    completion: '1 / 2 个目标已完成',
  });
  expect(
    describeArcadeResult({
      ...base,
      config: { ...base.config, mode: 'contest' },
      status: 'interrupted',
      elapsedMs: 2500,
    }),
  ).toMatchObject({ title: '本次挑战已中断', total: '观察记录', timing: '2.5 秒' });
});
it('explains the actual three score components of an eligible result', () => {
  const r = {
    config: { mode: 'contest' },
    status: 'completed',
    score: { progress: 700, quality: 160, efficiency: 50, total: 910 },
    elapsedMs: 270000,
    objectives: [{ completed: true }],
    eligible: true,
  } as ArcadeResult;
  expect(describeArcadeResult(r)).toMatchObject({
    total: '910 分',
    timing: '270.0 秒',
    parts: '探索完成 700 · 首次验证 160 · 时间奖励 50',
  });
});
