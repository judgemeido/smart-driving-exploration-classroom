import { expect, it } from 'vitest';
import { getNavigationGroups } from '../../../src/app/navigation-items';
it('builds seven real links under a deployment base while retaining all gallery hashes', () => {
  const groups = getNavigationGroups('/science/');
  expect(groups).toHaveLength(4);
  expect(groups.flatMap((g) => g.items).map((i) => i.href)).toEqual([
    '/science/index.html#history',
    '/science/games/history/index.html',
    '/science/index.html#explore',
    '/science/games/structure/index.html',
    '/science/index.html#lidar',
    '/science/games/sensor/index.html',
    '/science/index.html#traffic',
  ]);
});
