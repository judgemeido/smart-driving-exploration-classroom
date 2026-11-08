import { expect, it } from 'vitest';
import { getNavigationGroups } from '../../../src/app/navigation-items';
it('builds seven real links under a deployment base while retaining all gallery hashes', () => {
  const groups = getNavigationGroups('/science/');
  expect(groups).toHaveLength(4);
  expect(groups.flatMap((g) => g.items).map((i) => i.href)).toEqual([
    '/science/legacy.html#history',
    '/science/games/history/index.html',
    '/science/legacy.html#explore',
    '/science/games/structure/index.html',
    '/science/legacy.html#lidar',
    '/science/games/sensor/index.html',
    '/science/legacy.html#traffic',
  ]);
});
