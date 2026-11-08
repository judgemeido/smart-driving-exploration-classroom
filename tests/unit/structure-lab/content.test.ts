import { describe, expect, it } from 'vitest';
import { structureContent } from '../../../src/activities/structure-lab/content';
import { getStructureSource } from '../../../src/activities/structure-lab/source';

describe('structure diagram content', () => {
  it('preserves all 13 topics once, three graphs, and the 1000 weight contract', () => {
    const { objectives, boards, parts } = structureContent;
    const installation = objectives.filter((o) => o.sourceTaskId);
    expect(installation.map((o) => o.id).sort()).toEqual(
      getStructureSource()
        .tasks.map((t) => t.id)
        .sort(),
    );
    expect(boards.map((b) => installation.filter((o) => o.boardId === b.id).length)).toEqual([4, 4, 5]);
    expect(objectives.reduce((sum, o) => sum + o.weight, 0)).toBe(1000);
    expect(parts.filter((p) => p.id === 'part-wheel')).toHaveLength(1);
    expect(objectives.find((o) => o.id === 'explore-structure-chassis')?.requiredSocketParts).toEqual({
      'socket-support-suspension': 'part-suspension',
      'socket-support-brakes': 'part-brakes',
    });
  });
  it('uses teaching-only millimeter evidence and known directed graph ports', () => {
    expect(structureContent.parts.find((p) => p.id === 'part-millimeter-teaching')?.teachingOnly).toBe(true);
    for (const board of structureContent.boards) {
      for (const edge of board.requiredEdges) {
        expect(board.nodes.some((n) => n.id === edge.sourceId)).toBe(true);
        expect(board.nodes.some((n) => n.id === edge.targetId)).toBe(true);
        expect(edge.sourceId).not.toBe(edge.targetId);
      }
    }
    expect(structureContent.boards.map((b) => b.requiredEdges.length)).toEqual([4, 4, 6]);
  });
});
