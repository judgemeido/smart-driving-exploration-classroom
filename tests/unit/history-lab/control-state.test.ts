import { expect,it } from 'vitest';
import { updateHistoryControlStates } from '../../../src/activities/history-lab/control-state';
import { createHistoryLabState, type HistoryLabState } from '../../../src/activities/history-lab/state';

function controls(){
  const entries=['primary','cancel','reading','event','place','slot','module','plan','hint','reason','omit'].map(name=>({name,disabled:false,hasAttribute:(attribute:string)=>attribute===`data-hl-${name}`}));
  const root={querySelectorAll:()=>entries} as unknown as HTMLElement;
  return {root,entries,get:(name:string)=>entries.find(entry=>entry.name===name)!};
}
it('restores the same primary and editing controls after inactive then active',()=>{
  const state=createHistoryLabState({profile:'guided',seed:1}); const c=controls();
  updateHistoryControlStates(c.root,state,false);
  expect(c.get('primary').disabled).toBe(true);expect(c.get('reason').disabled).toBe(true);expect(c.get('reading').disabled).toBe(false);
  updateHistoryControlStates(c.root,state,true);
  for(const control of c.entries)expect(control.disabled,control.name).toBe(false);
});
it('restores continue while preserving verified event locks after inactive then active',()=>{
  const state:HistoryLabState={...createHistoryLabState({profile:'guided',seed:1}),completed:['history-event-order']};const c=controls();
  updateHistoryControlStates(c.root,state,false);updateHistoryControlStates(c.root,state,true);
  expect(c.get('primary').disabled).toBe(false);expect(c.get('reading').disabled).toBe(false);
  for(const name of ['event','place','module','hint','cancel'])expect(c.get(name).disabled,name).toBe(true);
});
it('keeps the final card including reason and omit checkbox read only on activation',()=>{
  const state:HistoryLabState={...createHistoryLabState({profile:'guided',seed:1}),stage:'future',completed:['history-future-choice']};const c=controls();
  updateHistoryControlStates(c.root,state,false);updateHistoryControlStates(c.root,state,true);
  expect(c.get('primary').disabled).toBe(true);expect(c.get('reading').disabled).toBe(false);
  for(const name of ['slot','module','reason','omit'])expect(c.get(name).disabled,name).toBe(true);
});
