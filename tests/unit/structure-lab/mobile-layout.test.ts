import { expect, it } from 'vitest';
import { structureContent } from '../../../src/activities/structure-lab/content';
import { getMobileStructureLayout } from '../../../src/activities/structure-lab/graphics';
import { getMobileEdgeEndpoints } from '../../../src/activities/structure-lab/graphics';
it('lays out readable mobile subsystem nodes in two columns with distinct real edge endpoints', () => {
  for (const board of structureContent.boards) {
    const layout = getMobileStructureLayout(board, 288);
    expect(layout.width).toBe(288);
    expect(layout.height).toBeGreaterThanOrEqual(340);
    for (const socket of layout.sockets) {
      expect(socket.x).toBeGreaterThanOrEqual(65);
      expect(socket.x).toBeLessThanOrEqual(223);
      expect(socket.y).toBeGreaterThanOrEqual(65);
    }
    for (const edge of board.requiredEdges) {
      const source = layout.nodes.find((n) => n.id === edge.sourceId)!;
      const target = layout.nodes.find((n) => n.id === edge.targetId)!;
      expect(source).toBeDefined();
      expect(target).toBeDefined();
      expect(source.x !== target.x || source.y !== target.y).toBe(true);
    }
  }
});

for (const width of [288, 308, 350])
  it(`keeps horizontal arrow endpoints outside actual ${width}px mobile cards`, () => {
    const layout = getMobileStructureLayout(structureContent.boards[0], width);
    const source = layout.nodes[0],
      target = layout.nodes[1],
      halfWidth = width / 4 - 8;
    const endpoints = getMobileEdgeEndpoints(source, target, width);
    expect(endpoints.start.x).toBeGreaterThan(source.x + halfWidth);
    expect(endpoints.end.x).toBeLessThan(target.x - halfWidth);
    expect(endpoints.end.x - endpoints.start.x).toBeGreaterThanOrEqual(9);
  });
