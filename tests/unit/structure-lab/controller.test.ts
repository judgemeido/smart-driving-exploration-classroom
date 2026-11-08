import { describe, expect, it } from 'vitest';
import { commitStructureAction } from '../../../src/activities/structure-lab/transaction';
import { createStructureLabState } from '../../../src/activities/structure-lab/state';
import { structureContent } from '../../../src/activities/structure-lab/content';
describe('structure session transaction', () => {
  it('keeps the draft unchanged if the session rejects an empty-fact edit', () => {
    const s = createStructureLabState(
      { mode: 'contest', profile: 'guided', challengeCode: 'demo', contentVersion: '1' },
      structureContent,
    );
    let called = false;
    const actual = commitStructureAction(
      s,
      { type: 'install', socketId: 'socket-power-battery', partId: 'part-battery' },
      structureContent,
      (facts) => {
        called = true;
        expect(facts).toEqual([]);
        return false;
      },
    );
    expect(called).toBe(true);
    expect(actual).toBe(s);
  });
});
