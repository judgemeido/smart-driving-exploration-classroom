import { expect,it } from 'vitest';
import { energyPlans,futureClaims,historyLabContent,moduleById } from '../../../src/activities/history-lab/content';
import { getNeedTrayIds,getFutureClaimGroups } from '../../../src/activities/history-lab/tray';
it.each(['guided','standard'] as const)('keeps every energy solution reachable with at most four modules in %s',profile=>{
  for(const plan of energyPlans){
    const ids=getNeedTrayIds(historyLabContent.needs[1],profile,plan.id);
    expect(ids).toHaveLength(4);expect(new Set(ids).size).toBe(4);
    for(const id of plan.modules)expect(ids).toContain(id);
    for(const id of ids)expect(moduleById(id)).toBeDefined();
    expect(ids.filter(id=>!plan.modules.some(solution=>solution===id))).toHaveLength(1);
  }
});
it('separates people and conditions while preserving both accepted people for every value',()=>{
  for(const value of futureClaims){
    const groups=getFutureClaimGroups(value.id);
    expect(groups).toHaveLength(2);
    expect(groups[0].slotId).toBe('future-who');expect(groups[1].slotId).toBe('future-condition');
    expect(groups[0].cards.map(card=>card.id)).toContain(value.who[0].id);
    expect(groups[0].cards.map(card=>card.id)).toContain(value.who[1].id);
    expect(groups[1].cards.map(card=>card.id)).toContain(value.condition.id);
    expect(groups[0].cards.every(card=>card.id.includes('-who-'))).toBe(true);
    expect(groups[1].cards.every(card=>card.id.endsWith('-condition'))).toBe(true);
  }
  expect(getFutureClaimGroups('unknown')).toEqual([]);
});
