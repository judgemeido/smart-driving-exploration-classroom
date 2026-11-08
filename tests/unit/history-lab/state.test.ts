import { describe, expect, it } from 'vitest';
import { createHistoryLabState, reduceHistoryLab, unicodeLength } from '../../../src/activities/history-lab/state';
import { historyLabContent, energyPlans, futureClaims } from '../../../src/activities/history-lab/content';
import { getHistorySource } from '../../../src/activities/history-lab/source';
import { historyLearningContent } from '../../../src/chapters/history/learning-data';

const order = ['history-event-2001','history-event-2009','history-event-2015','history-event-2020','history-event-2026'];
const config = { profile: 'guided' as const, seed: 921 };
function sorted() {
  let state = createHistoryLabState(config);
  order.forEach((cardId,toIndex) => { state = reduceHistoryLab(state,{type:'move-event',cardId,toIndex}).state; });
  return state;
}
function needs(round = 0) {
  let state = reduceHistoryLab(reduceHistoryLab(sorted(),{type:'check'}).state,{type:'continue'}).state;
  for (let i=0;i<round;i++) {
    const task=historyLabContent.needs[i];
    const solution = task.id==='history-cleaner-energy' ? energyPlans[0].modules : task.solution;
    task.slots.forEach((slot,index)=>{state=reduceHistoryLab(state,{type:'place-module',slotId:slot.id,moduleId:solution[index]}).state;});
    state=reduceHistoryLab(reduceHistoryLab(state,{type:'check'}).state,{type:'continue'}).state;
  }
  return state;
}
describe('history lab facts and assembly',()=>{
  it('references original facts and preserves five event identities',()=>{
    expect(getHistorySource().learning).toBe(historyLearningContent);
    expect(getHistorySource().exhibits).toHaveLength(14);
    expect(historyLabContent.events.map(e=>e.id)).toEqual(order);
    expect(historyLabContent.objectives.reduce((sum,o)=>sum+o.weight,0)).toBe(1000);
  });
  it('produces reproducible shuffled tracks with every event once',()=>{
    const a=createHistoryLabState(config), b=createHistoryLabState(config);
    expect(a.timelineOrder).toEqual(b.timelineOrder);
    expect([...a.timelineOrder].sort()).toEqual([...order].sort());
    expect(a.timelineOrder).not.toEqual(order);
  });
  it('inserts an event and shifts intervening events rather than swapping',()=>{
    const a=createHistoryLabState(config);
    const first=a.timelineOrder[0];
    const moved=reduceHistoryLab(a,{type:'move-event',cardId:first,toIndex:3}).state;
    expect(moved.timelineOrder).toEqual([a.timelineOrder[1],a.timelineOrder[2],a.timelineOrder[3],first,a.timelineOrder[4]]);
    expect(reduceHistoryLab(a,{type:'move-event',cardId:first,toIndex:5}).state).toBe(a);
    expect(reduceHistoryLab(a,{type:'move-event',cardId:'unknown',toIndex:1}).state).toBe(a);
  });
  it('rejects malformed duplicate, missing or unknown timeline identities',()=>{
    const base=createHistoryLabState(config);
    for(const timelineOrder of [[order[0],order[0],...order.slice(2)],order.slice(1),['unknown',...order.slice(1)]]){
      const state={...base,timelineOrder};
      expect(reduceHistoryLab(state,{type:'check'}).state).toBe(state);
      expect(reduceHistoryLab(state,{type:'move-event',cardId:order[1],toIndex:0}).state).toBe(state);
    }
  });
  it.each([-1,5,1.5,NaN,Infinity])('rejects timeline destination %s',toIndex=>{
    const state=createHistoryLabState(config);
    expect(reduceHistoryLab(state,{type:'move-event',cardId:order[0],toIndex}).state).toBe(state);
  });
  it.each([0,120])('accepts %s Unicode points without changing relation scoring',length=>{
    let state=needs(3); const group=futureClaims[2];
    state=reduceHistoryLab(state,{type:'choose-future',choiceId:group.id}).state;
    state=reduceHistoryLab(state,{type:'place-claim',slotId:'future-who',cardId:group.who[0].id}).state;
    state=reduceHistoryLab(state,{type:'place-claim',slotId:'future-condition',cardId:group.condition.id}).state;
    const revision=state.revision['history-future-choice'];
    state=reduceHistoryLab(state,{type:'edit-reason',value:'🚗'.repeat(length)}).state;
    const result=reduceHistoryLab(state,{type:'check'});
    expect(result.facts[0]).toMatchObject({verdict:'correct',revision});
  });
  it('checks only once per revision and points to the first inversion without resetting',()=>{
    const a=createHistoryLabState(config);
    const result=reduceHistoryLab(a,{type:'check'});
    expect(result.facts[0].verdict).toBe('incorrect');
    expect(result.state.timelineOrder).toEqual(a.timelineOrder);
    expect(result.state.errorIds).toHaveLength(2);
    const indices=result.state.errorIds.map(id=>order.indexOf(id));
    expect(indices[0]).toBeGreaterThan(indices[1]);
    expect(reduceHistoryLab(result.state,{type:'check'}).facts).toEqual([]);
  });
  it('requires explicit confirmation and continue, then locks the track',()=>{
    const a=sorted(); expect(a.completed).toEqual([]);
    const checked=reduceHistoryLab(a,{type:'check'});
    expect(checked.facts).toEqual([{objectiveId:'history-event-order',revision:a.revision['history-event-order'],verdict:'correct',usedHint:false}]);
    expect(checked.state.stage).toBe('timeline');
    expect(reduceHistoryLab(checked.state,{type:'move-event',cardId:order[0],toIndex:4}).state).toBe(checked.state);
    expect(reduceHistoryLab(checked.state,{type:'continue'}).state.stage).toBe('needs');
  });
  it('incomplete assembly is not an incorrect attempt; wrong slots stay editable',()=>{
    let a=needs();
    expect(reduceHistoryLab(a,{type:'check'}).facts).toEqual([]);
    a=reduceHistoryLab(a,{type:'place-module',slotId:'production-step',moduleId:'production-divide'}).state;
    a=reduceHistoryLab(a,{type:'place-module',slotId:'production-flow',moduleId:'appearance-color'}).state;
    const wrong=reduceHistoryLab(a,{type:'check'});
    expect(wrong.facts[0].verdict).toBe('incorrect');
    expect(wrong.state.slots['production-step']).toBe('production-divide');
    expect(wrong.state.errorIds).toEqual(['production-flow']);
  });
  it.each([0,1,2])('accepts complete energy chain %s once for the same objective',index=>{
    let a=needs(1); const plan=energyPlans[index];
    a=reduceHistoryLab(a,{type:'select-energy-plan',planId:plan.id}).state;
    ['energy-source','energy-conversion','energy-motion'].forEach((slotId,i)=>{a=reduceHistoryLab(a,{type:'place-module',slotId,moduleId:plan.modules[i]}).state;});
    const checked=reduceHistoryLab(a,{type:'check'});
    expect(checked.facts[0]).toMatchObject({objectiveId:'history-cleaner-energy',verdict:'correct'});
    expect(reduceHistoryLab(checked.state,{type:'select-energy-plan',planId:energyPlans[(index+1)%3].id}).state).toBe(checked.state);
  });
  it('rejects a mixed energy chain and preserves all installed parts',()=>{
    let a=needs(1);
    ['energy-source','energy-conversion','energy-motion'].forEach((slotId,i)=>{a=reduceHistoryLab(a,{type:'place-module',slotId,moduleId:[energyPlans[0].modules[0],energyPlans[1].modules[1],energyPlans[0].modules[2]][i]}).state;});
    const checked=reduceHistoryLab(a,{type:'check'});
    expect(checked.facts[0].verdict).toBe('incorrect');
    expect(checked.state.errorIds).toEqual(['energy-conversion']);
    expect(checked.state.slots).toEqual(a.slots);
  });
  it.each(['future-safety','future-energy','future-accessibility','future-comfort'])('accepts equally valid future %s without a written reason',choiceId=>{
    let a=needs(3);
    a=reduceHistoryLab(a,{type:'choose-future',choiceId}).state;
    const group=futureClaims.find(g=>g.id===choiceId)!;
    a=reduceHistoryLab(a,{type:'place-claim',slotId:'future-who',cardId:group.who[1].id}).state;
    a=reduceHistoryLab(a,{type:'place-claim',slotId:'future-condition',cardId:group.condition.id}).state;
    const checked=reduceHistoryLab(a,{type:'check'});
    expect(checked.facts[0]).toMatchObject({objectiveId:'history-future-choice',verdict:'correct'});
    expect(checked.state.completed).toHaveLength(5);
  });
  it('counts Unicode points, preserves overlong reasons and allows omitting them',()=>{
    expect(unicodeLength('汽🚗车')).toBe(3);
    let a=needs(3); const group=futureClaims[0];
    a=reduceHistoryLab(a,{type:'choose-future',choiceId:group.id}).state;
    a=reduceHistoryLab(a,{type:'place-claim',slotId:'future-who',cardId:group.who[0].id}).state;
    a=reduceHistoryLab(a,{type:'place-claim',slotId:'future-condition',cardId:group.condition.id}).state;
    a=reduceHistoryLab(a,{type:'edit-reason',value:'🚗'.repeat(121)+'<script>'}).state;
    expect(reduceHistoryLab(a,{type:'check'}).facts).toEqual([]);
    expect(a.reason).toBe('🚗'.repeat(121)+'<script>');
    const omitted=reduceHistoryLab(a,{type:'omit-reason'}).state;
    expect(omitted.reason).toBe(a.reason);
    expect(reduceHistoryLab(omitted,{type:'check'}).facts[0].verdict).toBe('correct');
  });
  it('changing future ability clears dependent claims but preserves reason',()=>{
    let a=needs(3);
    a=reduceHistoryLab(a,{type:'choose-future',choiceId:'future-safety'}).state;
    a=reduceHistoryLab(a,{type:'place-claim',slotId:'future-who',cardId:futureClaims[0].who[0].id}).state;
    a=reduceHistoryLab(a,{type:'edit-reason',value:'我的想法'}).state;
    a=reduceHistoryLab(a,{type:'choose-future',choiceId:'future-energy'}).state;
    expect(a.slots['future-who']).toBeUndefined(); expect(a.reason).toBe('我的想法');
  });
  it('remembers an explicit answer hint on the later correct fact',()=>{
    let a=reduceHistoryLab(sorted(),{type:'hint'}).state;
    const checked=reduceHistoryLab(a,{type:'check'});
    expect(checked.facts[0].usedHint).toBe(true);
  });
});
