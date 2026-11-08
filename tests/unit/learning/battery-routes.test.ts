import { describe, expect, it } from 'vitest';
import { activities, sections } from '../../../src/learning/catalog';
import { parseRoute, routeHash } from '../../../src/learning/routes';
import { emptyRecord, loadPortfolio, savePortfolio } from '../../../src/learning/records';

describe('battery entry and existing classroom compatibility', () => {
  it('opens the new first lesson and preserves chapter numbering', () => {
    expect(sections.map(({ id, number }) => [id, number])).toEqual([
      ['battery', '00'], ['history', '01'], ['explore', '02'], ['lidar', '03'],
    ]);
    expect(activities[0].id).toBe('B1');
    for (const hash of ['', '#', '#unknown', '#battery', '#battery/unknown'])
      expect(parseRoute(hash)).toBe('B1');
    expect(routeHash('B1')).toBe('#battery/B1');
  });

  it('keeps existing deep links independently addressable', () => {
    for (const [hash, id] of [
      ['#history', 'H1'], ['#history/H1', 'H1'], ['#history/H2', 'H2'],
      ['#explore/E1', 'E1'], ['#lidar/S3', 'S3'], ['#knowledge/Q1', 'Q1'],
      ['#traffic', 'traffic'], ['#report', 'report'],
    ]) expect(parseRoute(hash)).toBe(id);
  });

  it('adds battery records without replacing previous student evidence', () => {
    const old = { ...emptyRecord(), prediction: '旧预测', explanation: '旧解释' };
    let raw = JSON.stringify({ version: 1, records: { H1: old, H2: emptyRecord() } });
    const storage = { getItem: () => raw, setItem: (_: string, value: string) => { raw = value; } };
    const loaded = loadPortfolio(storage);
    expect(loaded.error).toBeUndefined();
    loaded.portfolio.records.B1 = emptyRecord();
    expect(savePortfolio(loaded.portfolio, storage)).toBe(true);
    const restored = loadPortfolio(storage);
    expect(restored.error).toBeUndefined();
    expect(restored.portfolio.records.H1).toEqual(old);
    expect(restored.portfolio.records.B1).toEqual(emptyRecord());
  });
});
