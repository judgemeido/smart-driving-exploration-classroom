import { historyLearningContent } from '../../chapters/history/learning-data';
export const historyCards = historyLearningContent.orderActivity.cards;
export interface HistoryDraft {
  order: string[];
  reasoning: string;
  energy: 'electric' | 'fuel' | 'hybrid';
  power: boolean;
  transmission: boolean;
  exploded: boolean;
  cutaway: boolean;
}
export function restoreHistoryDraft(value: unknown): HistoryDraft {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const ids = new Set(historyCards.map((card) => card.id));
  const order =
    Array.isArray(raw.order) &&
    raw.order.length === ids.size &&
    new Set(raw.order).size === ids.size &&
    raw.order.every((id) => typeof id === 'string' && ids.has(id))
      ? ([...raw.order] as string[])
      : [...historyLearningContent.orderActivity.initialOrder];
  return {
    order,
    reasoning: typeof raw.reasoning === 'string' ? raw.reasoning.slice(0, 1000) : '',
    energy: raw.energy === 'fuel' || raw.energy === 'hybrid' ? raw.energy : 'electric',
    power: typeof raw.power === 'boolean' ? raw.power : true,
    transmission: typeof raw.transmission === 'boolean' ? raw.transmission : true,
    exploded: raw.exploded === true,
    cutaway: raw.cutaway === true,
  };
}
export function moveHistoryCard(order: readonly string[], index: number, direction: -1 | 1): string[] {
  const next = [...order];
  const target = index + direction;
  if (index < 0 || index >= next.length || target < 0 || target >= next.length) return next;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
export function checkHistoryOrder(order: readonly string[]): { conflicts: string[]; orderedPairs: number } {
  const conflicts: string[] = [];
  for (let index = 1; index < order.length; index++) {
    const before = historyCards.find((card) => card.id === order[index - 1]);
    const after = historyCards.find((card) => card.id === order[index]);
    if (!before || !after) {
      conflicts.push('资料卡缺失，请重新排列。');
      continue;
    }
    if (parseFloat(before.year) > parseFloat(after.year))
      conflicts.push(
        `${before.year}「${before.label}」放在 ${after.year}「${after.label}」之前：请核对这两份史料的年代。`,
      );
  }
  return { conflicts, orderedPairs: Math.max(0, order.length - 1 - conflicts.length) };
}
export function evaluateEnergy(state: Pick<HistoryDraft, 'power' | 'transmission'>): {
  motor: boolean;
  wheels: boolean;
} {
  return { motor: state.power, wheels: state.power && state.transmission };
}
