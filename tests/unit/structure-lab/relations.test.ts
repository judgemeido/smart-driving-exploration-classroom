import { expect, it } from 'vitest';
import { getBoardRelationIds, structureContent } from '../../../src/activities/structure-lab/content';
it('offers all current board relation categories and a plausible distractor without unrelated category overload', () => {
  for (const board of structureContent.boards) {
    const options = getBoardRelationIds(board);
    for (const edge of board.requiredEdges) expect(options).toContain(edge.relationId);
    expect(options.length).toBeLessThan(10);
    expect(options.some((id) => !board.requiredEdges.some((edge) => edge.relationId === id))).toBe(true);
  }
  expect(getBoardRelationIds(structureContent.boards[0])).not.toContain('image');
  expect(getBoardRelationIds(structureContent.boards[0])).not.toContain('radio-target');
});
