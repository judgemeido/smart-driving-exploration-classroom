import { expect,it } from 'vitest';
import { applyHistoryAction } from '../../../src/activities/history-lab/transaction';
import { createHistoryLabState } from '../../../src/activities/history-lab/state';
it('keeps the exact draft when the session rejects a candidate, including edits without facts',()=>{
  const state=createHistoryLabState({seed:21,profile:'guided'});
  expect(applyHistoryAction(state,{type:'move-event',cardId:state.timelineOrder[0],toIndex:2},()=>false)).toBe(state);
  expect(applyHistoryAction(state,{type:'check'},()=>false)).toBe(state);
});
it('applies an accepted draft edit while leaving the caller state immutable',()=>{
  const state=createHistoryLabState({seed:21,profile:'guided'});
  const next=applyHistoryAction(state,{type:'move-event',cardId:state.timelineOrder[0],toIndex:2},()=>true);
  expect(next.timelineOrder[2]).toBe(state.timelineOrder[0]);
  expect(next).not.toBe(state); expect(state.completed).toEqual([]);
});
