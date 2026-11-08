import { energyPlans,futureClaims,type Need } from './content';
export function getNeedTrayIds(need:Need,profile:'guided'|'standard',energyPlan:string):readonly string[] {
  if(need.id==='history-cleaner-energy'){
    const index=energyPlans.findIndex(plan=>plan.id===energyPlan);
    const plan=energyPlans[index<0?0:index];
    const distractor=energyPlans[((index<0?0:index)+1)%energyPlans.length].modules[0];
    return [...plan.modules,distractor];
  }
  return profile==='guided'?need.modules.filter(id=>id!=='production-alone'):need.modules;
}
export function getFutureClaimGroups(choiceId:string):readonly {slotId:string;label:string;cards:readonly {id:string;label:string}[]}[] {
  const index=futureClaims.findIndex(choice=>choice.id===choiceId);if(index<0)return [];
  const group=futureClaims[index],next=futureClaims[(index+1)%futureClaims.length];
  return [{slotId:'future-who',label:'帮助谁',cards:[...group.who,next.who[0]]},{slotId:'future-condition',label:'成立条件',cards:[group.condition,next.condition]}];
}
