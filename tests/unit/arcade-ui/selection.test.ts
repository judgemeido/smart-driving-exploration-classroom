import { expect, it } from 'vitest';
import { reduceSelection } from '../../../src/ui/arcade/selection';
it('clears an old target when choosing another item and cancels both ends', () => {
  expect(reduceSelection({ itemId: 'a', targetId: 'slot' }, { type: 'select-item', id: 'b' })).toEqual({
    itemId: 'b',
    targetId: null,
  });
  expect(reduceSelection({ itemId: 'a', targetId: 'slot' }, { type: 'cancel' })).toEqual({
    itemId: null,
    targetId: null,
  });
});
it('ignores a target before an item is selected', () => {
  expect(reduceSelection({ itemId: null, targetId: null }, { type: 'select-target', id: 'slot' })).toEqual({
    itemId: null,
    targetId: null,
  });
});
