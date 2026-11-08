import { energyPlans, futureClaims, historyLabContent, moduleById } from './content';
export interface HistoryFact { readonly objectiveId:string; readonly revision:number; readonly verdict:'correct'|'incorrect'; readonly usedHint:boolean }
export interface HistoryLabState {
  readonly profile:'guided'|'standard'; readonly stage:'timeline'|'needs'|'future'; readonly timelineOrder:readonly string[];
  readonly round:number; readonly slots:Readonly<Record<string,string>>; readonly energyPlan:string; readonly futureChoice:string;
  readonly reason:string; readonly omitReason:boolean; readonly completed:readonly string[]; readonly hinted:readonly string[];
  readonly revision:Readonly<Record<string,number>>; readonly checked:Readonly<Record<string,number>>;
  readonly feedback:string; readonly errorIds:readonly string[];
}
export type HistoryAction =
  | {type:'move-event';cardId:string;toIndex:number} | {type:'place-module';slotId:string;moduleId:string}
  | {type:'select-energy-plan';planId:string} | {type:'choose-future';choiceId:string}
  | {type:'place-claim';slotId:string;cardId:string} | {type:'edit-reason';value:string} | {type:'omit-reason'}
  | {type:'check'} | {type:'hint'} | {type:'continue'};
export const unicodeLength=(value:string)=>Array.from(value).length;
export function currentObjective(state:HistoryLabState):string {
  return state.stage==='timeline'?'history-event-order':state.stage==='future'?'history-future-choice':historyLabContent.needs[state.round].id;
}
export function createHistoryLabState(config:{profile:'guided'|'standard';seed:number}):HistoryLabState {
  let seed=config.seed>>>0;
  const order=[...historyLabContent.order];
  for(let i=order.length-1;i>0;i--){seed=(Math.imul(seed,1664525)+1013904223)>>>0; const j=seed%(i+1); [order[i],order[j]]=[order[j],order[i]];}
  if(order.every((id,i)=>id===historyLabContent.order[i])) order.push(order.shift()!);
  return {profile:config.profile,stage:'timeline',timelineOrder:order,round:0,slots:{},energyPlan:energyPlans[0].id,futureChoice:'',reason:'',omitReason:false,completed:[],hinted:[],revision:{},checked:{},feedback:'先选一节事件，再选择它要去的站位。',errorIds:[]};
}
export function reduceHistoryLab(state:HistoryLabState,action:HistoryAction):{state:HistoryLabState;facts:readonly HistoryFact[]} {
  const unchanged=()=>({state,facts:[]}); const objective=currentObjective(state); const locked=state.completed.includes(objective);
  if(state.stage==='timeline'&&(state.timelineOrder.length!==5||new Set(state.timelineOrder).size!==5||state.timelineOrder.some(id=>!historyLabContent.order.includes(id))))return unchanged();
  const commit=(patch:Partial<HistoryLabState>,edit=false)=>({state:{...state,...patch,...(edit?{revision:{...state.revision,[objective]:(state.revision[objective]??0)+1},feedback:'已放好，检查前仍可调整。',errorIds:[]}: {})},facts:[] as readonly HistoryFact[]});
  if(action.type==='continue') {
    if(!locked)return unchanged();
    if(state.stage==='timeline')return commit({stage:'needs',round:0,feedback:'选择模块，再点关系槽。'});
    if(state.stage==='needs')return state.round<2?commit({round:state.round+1,feedback:'选择模块，再点关系槽。'}):commit({stage:'future',feedback:'先选你重视的能力，再组装帮助对象和条件。'});
    return unchanged();
  }
  if(locked)return unchanged();
  if(action.type==='move-event'){
    if(state.stage!=='timeline'||!Number.isInteger(action.toIndex)||action.toIndex<0||action.toIndex>4)return unchanged();
    const index=state.timelineOrder.indexOf(action.cardId); if(index<0||index===action.toIndex)return unchanged();
    const next=[...state.timelineOrder];next.splice(index,1);next.splice(action.toIndex,0,action.cardId);return commit({timelineOrder:next},true);
  }
  if(action.type==='place-module'){
    if(state.stage!=='needs')return unchanged();const need=historyLabContent.needs[state.round];
    if(!need.slots.some(s=>s.id===action.slotId)||!need.modules.includes(action.moduleId)||state.slots[action.slotId]===action.moduleId)return unchanged();
    return commit({slots:{...state.slots,[action.slotId]:action.moduleId}},true);
  }
  if(action.type==='select-energy-plan'){
    if(state.stage!=='needs'||state.round!==1||!energyPlans.some(p=>p.id===action.planId)||state.energyPlan===action.planId)return unchanged();
    const slots={...state.slots};['energy-source','energy-conversion','energy-motion'].forEach(id=>delete slots[id]);return commit({energyPlan:action.planId,slots},true);
  }
  if(action.type==='choose-future'){
    if(state.stage!=='future'||!futureClaims.some(c=>c.id===action.choiceId)||state.futureChoice===action.choiceId)return unchanged();
    const slots={...state.slots};delete slots['future-who'];delete slots['future-condition'];return commit({futureChoice:action.choiceId,slots},true);
  }
  if(action.type==='place-claim'){
    if(state.stage!=='future'||!['future-who','future-condition'].includes(action.slotId)||!futureClaims.some(c=>[...c.who,c.condition].some(card=>card.id===action.cardId))||state.slots[action.slotId]===action.cardId)return unchanged();
    return commit({slots:{...state.slots,[action.slotId]:action.cardId}},true);
  }
  if(action.type==='edit-reason')return state.stage==='future'&&state.reason!==action.value?commit({reason:action.value,omitReason:false}):unchanged();
  if(action.type==='omit-reason')return state.stage==='future'?commit({omitReason:!state.omitReason}):unchanged();
  if(action.type==='hint'){
    let feedback='';
    if(state.stage==='timeline'){
      const index=state.timelineOrder.findIndex((id,i)=>id!==historyLabContent.order[i]);const event=historyLabContent.events.find(e=>e.id===historyLabContent.order[index]);
      feedback=event?`位置提示：把 ${event.year} 放到第 ${index+1} 站。`:'轨道已按年份连好，可以检查。';
    }else if(state.stage==='needs'){
      const need=historyLabContent.needs[state.round];const answer=state.round===1?energyPlans.find(p=>p.id===state.energyPlan)!.modules:need.solution;
      const index=need.slots.findIndex((s,i)=>state.slots[s.id]!==answer[i]); feedback=index>=0?`关系提示：${need.slots[index].label}需要“${moduleById(answer[index])!.label}”。`:'关系已连好，可以试运行。';
    }else{const group=futureClaims.find(c=>c.id===state.futureChoice)??futureClaims[0];feedback=`关系提示：“${group.label}”可以帮助${group.who[0].label}，还需要${group.condition.label}。`;}
    return commit({hinted:[...new Set([...state.hinted,objective])],feedback});
  }
  if(action.type!=='check')return unchanged();
  let errorIds:string[]=[];let feedback='';
  if(state.stage==='timeline'){
    for(let i=0;i<4;i++)if(historyLabContent.order.indexOf(state.timelineOrder[i])>historyLabContent.order.indexOf(state.timelineOrder[i+1])){
      errorIds=[state.timelineOrder[i],state.timelineOrder[i+1]];const [a,b]=errorIds.map(id=>historyLabContent.events.find(e=>e.id===id)!.year);feedback=`${a} 在 ${b} 前面，先看看这两个年份。选一节，再放到合适站位。`;break;
    }
    if(!errorIds.length)feedback='轨道已连通。研究、示范、感知和补能建设相互支持；这只是馆内的五个历史片段。';
  }else if(state.stage==='needs'){
    const need=historyLabContent.needs[state.round];const missing=need.slots.find(s=>!state.slots[s.id]);
    if(missing)return commit({feedback:`还差“${missing.label}”：选一个模块，再点这个槽。`,errorIds:[missing.id]});
    const expected=state.round===1?energyPlans.find(p=>p.id===state.energyPlan)!.modules:need.solution;
    const wrong=need.slots.find((s,i)=>!(state.round===2&&i===0&&state.slots[s.id]==='road-radar')&&state.slots[s.id]!==expected[i]);
    if(wrong){errorIds=[wrong.id];feedback=`检查“${wrong.label}”：${moduleById(state.slots[wrong.id])!.label}不能建立这里的关系。保留其他槽，只替换这一处。`;}
    else feedback=need.success;
  }else{
    const group=futureClaims.find(c=>c.id===state.futureChoice);
    if(!group)return commit({feedback:'还差一种能力：选一个你重视的方向。',errorIds:['future-ability']});
    const missing=['future-who','future-condition'].find(s=>!state.slots[s]);
    if(missing)return commit({feedback:missing==='future-who'?'还差帮助对象：选一句情境，再放入“帮助谁”。':'还差成立条件：选一句条件，再放入“还需要”。',errorIds:[missing]});
    if(!state.omitReason&&unicodeLength(state.reason)>120)return commit({feedback:'理由超过120字。全文已保留，可以精简，或选择“不附理由”完成。',errorIds:['reason']});
    const wrong=!group.who.some(w=>w.id===state.slots['future-who'])?'future-who':state.slots['future-condition']!==group.condition.id?'future-condition':null;
    if(wrong){errorIds=[wrong];feedback='这段关系还没连上所选能力。查看帮助对象与成立条件，只替换标出的槽。';}
    else feedback='说明卡已保存。这是你的设计选择，游戏没有评价你的观点优劣。';
  }
  const revision=state.revision[objective]??0;
  if(state.checked[objective]===revision)return unchanged();
  const correct=errorIds.length===0;
  return {state:{...state,feedback,errorIds,checked:{...state.checked,[objective]:revision},completed:correct?[...state.completed,objective]:state.completed},facts:[{objectiveId:objective,revision,verdict:correct?'correct':'incorrect',usedHint:state.hinted.includes(objective)}]};
}
