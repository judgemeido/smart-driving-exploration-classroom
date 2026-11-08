import { describe, expect, it } from 'vitest';
import { structureContent as c } from '../../../src/activities/structure-lab/content';
import {
  createStructureLabState,
  reduceStructureLab,
  type StructureLabAction,
  type StructureLabState,
} from '../../../src/activities/structure-lab/state';
const config = {
  mode: 'practice' as const,
  profile: 'guided' as const,
  challengeCode: 'demo',
  contentVersion: '1',
};
const step = (s: StructureLabState, a: StructureLabAction) => reduceStructureLab(s, a, c);
function installed(boardIndex = 0) {
  let s = createStructureLabState(config, c);
  s = { ...s, boardId: c.boards[boardIndex].id };
  for (const socket of c.boards[boardIndex].sockets)
    s = step(s, { type: 'install', socketId: socket.id, partId: socket.partId }).state;
  if (boardIndex === 1) s = step(s, { type: 'surface', value: 'wet' }).state;
  return step(s, { type: 'check-install' }).state;
}
describe('structure installation', () => {
  it('does not judge empty slots; preserves correct parts and rejects repeated checks', () => {
    let s = createStructureLabState(config, c);
    expect(step(s, { type: 'check-install' }).facts).toEqual([]);
    s = step(s, { type: 'install', socketId: 'socket-power-battery', partId: 'part-motor' }).state;
    let t = step(s, { type: 'check-install' });
    expect(t.facts).toMatchObject([{ objectiveId: 'explore-energy-battery', verdict: 'incorrect' }]);
    s = t.state;
    expect(step(s, { type: 'check-install' }).facts).toEqual([]);
    s = step(s, { type: 'install', socketId: 'socket-power-battery', partId: 'part-battery' }).state;
    t = step(s, { type: 'check-install' });
    expect(t.facts[0].verdict).toBe('correct');
    expect(
      step(t.state, { type: 'install', socketId: 'socket-power-battery', partId: 'part-motor' }).state,
    ).toBe(t.state);
  });
  it('requires both suspension and brakes, plus an independent wet road observation', () => {
    let s = { ...createStructureLabState(config, c), boardId: 'support' as const };
    for (const id of ['suspension', 'brakes'])
      s = step(s, { type: 'install', socketId: `socket-support-${id}`, partId: 'part-suspension' }).state;
    const t = step(s, { type: 'check-install' });
    expect(t.facts.find((f) => f.objectiveId === 'explore-structure-chassis')?.verdict).toBe('incorrect');
    s = step(t.state, { type: 'install', socketId: 'socket-support-brakes', partId: 'part-brakes' }).state;
    s = step(s, { type: 'install', socketId: 'socket-support-wheel', partId: 'part-wheel' }).state;
    const dry = step(s, { type: 'check-install' });
    expect(dry.facts.some((f) => f.objectiveId === 'explore-structure-wheel')).toBe(false);
    s = step(dry.state, { type: 'surface', value: 'wet' }).state;
    expect(step(s, { type: 'check-install' }).facts).toContainEqual(
      expect.objectContaining({ objectiveId: 'explore-structure-wheel', verdict: 'correct' }),
    );
  });
  it('records explicit hints only for the requested objective', () => {
    let s = createStructureLabState(config, c);
    s = step(s, { type: 'hint', objectiveId: 'explore-energy-battery' }).state;
    s = step(s, { type: 'install', socketId: 'socket-power-battery', partId: 'part-battery' }).state;
    expect(step(s, { type: 'check-install' }).facts[0].usedHint).toBe(true);
  });
});
describe('directed relation graphs', () => {
  it('previews two selected endpoints without creating a relation or a fact', () => {
    let s = installed();
    s = step(s, { type: 'select-port', nodeId: 'node-battery' }).state;
    const t = step(s, { type: 'select-port', nodeId: 'node-motor' });
    expect(t.state.selectedPortId).toBe('node-battery');
    expect(t.state.selectedTargetPortId).toBe('node-motor');
    expect(t.state.edgesByBoard.power).toHaveLength(0);
    expect(t.facts).toEqual([]);
    expect(step(t.state, { type: 'cancel' }).state.selectedTargetPortId).toBeNull();
  });
  for (const index of [0, 1, 2])
    it(`judges only complete ${c.boards[index].id} graphs and allows local repair`, () => {
      let s = installed(index);
      const b = c.boards[index];
      expect(s.stage).toBe('link');
      s = step(s, { type: 'connect', ...b.requiredEdges[0], relationId: 'analysis' }).state;
      expect(step(s, { type: 'check-links' }).facts).toEqual([]);
      for (const edge of b.requiredEdges.slice(1)) s = step(s, { type: 'connect', ...edge }).state;
      let t = step(s, { type: 'check-links' });
      expect(t.facts[0].verdict).toBe('incorrect');
      s = t.state;
      expect(step(s, { type: 'check-links' }).facts).toEqual([]);
      s = step(s, { type: 'remove-edge', edgeId: s.edgesByBoard[b.id][0].id }).state;
      s = step(s, { type: 'connect', ...b.requiredEdges[0] }).state;
      t = step(s, { type: 'check-links' });
      expect(t.facts[0].verdict).toBe('correct');
      expect(t.state.stage).toBe('group-feedback');
      expect(step(t.state, { type: 'remove-edge', edgeId: t.state.edgesByBoard[b.id][0].id }).state).toBe(
        t.state,
      );
      const next = step(t.state, { type: 'continue' }).state;
      expect(next.boardId).toBe(c.boards[Math.min(index + 1, 2)].id);
    });
  it('rejects duplicate, unknown, self, and cross-board edges; extra valid edges must be removed', () => {
    let s = installed();
    const edge = c.boards[0].requiredEdges[0];
    s = step(s, { type: 'connect', ...edge }).state;
    for (const input of [
      edge,
      { ...edge, targetId: edge.sourceId },
      { ...edge, targetId: 'node-lidar' },
      { ...edge, relationId: 'unknown' },
    ])
      expect(step(s, { type: 'connect', ...input }).state).toBe(s);
    for (const e of c.boards[0].requiredEdges.slice(1)) s = step(s, { type: 'connect', ...e }).state;
    s = step(s, {
      type: 'connect',
      sourceId: 'node-battery',
      targetId: 'node-wheel',
      relationId: 'electric-energy',
    }).state;
    expect(step(s, { type: 'check-links' }).facts[0].verdict).toBe('incorrect');
  });
  it('freezes every edit after finishing', () => {
    const s = step(installed(), { type: 'finish', reason: 'timeout' }).state;
    expect(step(s, { type: 'connect', ...c.boards[0].requiredEdges[0] }).state).toBe(s);
  });
  it('completes exactly all 16 diagram objectives and starts a separate clean practice', () => {
    let s = createStructureLabState(config, c);
    const facts = [];
    for (const board of c.boards) {
      for (const socket of board.sockets)
        s = step(s, { type: 'install', socketId: socket.id, partId: socket.partId }).state;
      if (board.id === 'support') s = step(s, { type: 'surface', value: 'wet' }).state;
      let t = step(s, { type: 'check-install' });
      facts.push(...t.facts);
      s = t.state;
      for (const edge of board.requiredEdges) s = step(s, { type: 'connect', ...edge }).state;
      t = step(s, { type: 'check-links' });
      facts.push(...t.facts);
      s = step(t.state, { type: 'continue' }).state;
    }
    expect(facts).toHaveLength(16);
    expect(new Set(facts.map((f) => f.objectiveId)).size).toBe(16);
    expect(facts.every((f) => f.verdict === 'correct')).toBe(true);
    expect(s.finishReason).toBe('completed');
    const fresh = createStructureLabState(config, c);
    expect(fresh.completedObjectiveIds).toEqual([]);
    expect(fresh.installedBySocket).toEqual({});
  });
});
