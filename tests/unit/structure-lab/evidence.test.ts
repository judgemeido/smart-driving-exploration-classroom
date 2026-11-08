import { expect, it } from 'vitest';
import { describeStructureEvidence } from '../../../src/activities/structure-lab/evidence';
import { structureContent } from '../../../src/activities/structure-lab/content';
import { createStructureLabState } from '../../../src/activities/structure-lab/state';
it('reports all actual diagram objectives, partial status, hints and teaching-only millimeter evidence', () => {
  const state = {
    ...createStructureLabState(
      { mode: 'practice', profile: 'guided', challengeCode: 'demo', contentVersion: '1' },
      structureContent,
    ),
    completedObjectiveIds: ['explore-energy-battery'],
    hintedObjectiveIds: ['explore-energy-battery'],
  };
  const report = describeStructureEvidence(state, structureContent);
  expect(report).toHaveLength(16);
  expect(report.every((r) => r.source === 'diagram')).toBe(true);
  expect(report.filter((r) => r.completed)).toHaveLength(1);
  expect(report.find((r) => r.id === 'explore-energy-battery')?.usedHint).toBe(true);
  expect(report.find((r) => r.id === 'explore-sensor-millimeter')?.teachingOnly).toBe(true);
});
