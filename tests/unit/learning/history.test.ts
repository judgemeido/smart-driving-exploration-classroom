import { describe, expect, it } from 'vitest';
import {
  restoreHistoryDraft,
  checkHistoryOrder,
  evaluateEnergy,
  moveHistoryCard,
  historyCards,
} from '../../../src/learning/activities/history-state';

describe('history evidence models', () => {
  it('reports local chronological conflicts with evidence rather than slot matches', () => {
    const result = checkHistoryOrder([...historyCards].reverse().map((card) => card.id));
    expect(result.conflicts).toHaveLength(historyCards.length - 1);
    expect(result.conflicts[0]).toContain('2026');
    expect(checkHistoryOrder(historyCards.map((card) => card.id)).conflicts).toEqual([]);
  });
  it('moves one card with bounded keyboard-friendly operations', () => {
    const order = historyCards.map((card) => card.id);
    expect(moveHistoryCard(order, 0, -1)).toEqual(order);
    expect(moveHistoryCard(order, 1, -1).slice(0, 2)).toEqual([order[1], order[0]]);
    expect(order).toEqual(historyCards.map((card) => card.id));
  });
  it('rejects duplicate and unknown restored cards and invalid control values', () => {
    const restored = restoreHistoryDraft({
      order: ['bad', 'bad'],
      energy: 'nuclear',
      power: 'false',
      transmission: false,
      reasoning: 42,
    });
    expect(new Set(restored.order).size).toBe(historyCards.length);
    expect(restored.energy).toBe('electric');
    expect(restored.power).toBe(true);
    expect(restored.transmission).toBe(false);
    expect(restored.reasoning).toBe('');
  });
  it('distinguishes a broken energy path from a broken mechanical path', () => {
    expect(evaluateEnergy({ power: false, transmission: true })).toEqual({ motor: false, wheels: false });
    expect(evaluateEnergy({ power: true, transmission: false })).toEqual({ motor: true, wheels: false });
    expect(evaluateEnergy({ power: true, transmission: true })).toEqual({ motor: true, wheels: true });
  });
});
