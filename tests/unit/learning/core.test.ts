import { describe, expect, it } from 'vitest';
import { parseRoute } from '../../../src/learning/routes';
import {
  loadPortfolio,
  savePortfolio,
  appendRun,
  emptyRecord,
  STORAGE_KEY,
} from '../../../src/learning/records';

describe('classroom navigation', () => {
  it('maps bare chapter and old pages to the new activities', () => {
    expect(parseRoute('#explore')).toBe('E1');
    expect(parseRoute('#lidar/S2')).toBe('S2');
    expect(parseRoute('#lidar/unknown')).toBe('S1');
    expect(parseRoute('#traffic')).toBe('traffic');
    expect(parseRoute('#report')).toBe('report');
    expect(parseRoute('#unknown')).toBe('B1');
  });
});
describe('learning evidence records', () => {
  it('keeps the first prediction and baseline even after many retries', () => {
    let record = emptyRecord();
    for (let i = 0; i < 15; i++)
      record = appendRun(record, {
        id: String(i),
        draft: { value: i },
        prediction: `预测${i}`,
        scene: { kind: 'vehicle' },
        evidence: { title: '实验', summary: '结果', metrics: [], notes: [], valid: true },
      });
    expect(record.runs).toHaveLength(12);
    expect(record.runs[0].id).toBe('0');
    expect(record.runs.at(-1)?.id).toBe('14');
  });
  it('copies a run so draft edits never rewrite the earlier experiment', () => {
    const draft = { distance: 16 };
    const record = appendRun(emptyRecord(), {
      id: 'one',
      draft,
      prediction: '近',
      scene: { kind: 'sensor' },
      evidence: { title: '测量', summary: '16m', metrics: [], notes: [], valid: true },
    });
    draft.distance = 60;
    expect(record.runs[0].draft).toEqual({ distance: 16 });
    expect(record.completed).toBe(false);
  });
  it('preserves corrupt or future storage and reports failed writes', () => {
    let value = '{bad';
    const storage = {
      getItem: () => value,
      setItem: (_: string, text: string) => {
        value = text;
      },
    };
    expect(loadPortfolio(storage).error).toBeTruthy();
    expect(value).toBe('{bad');
    value = JSON.stringify({ version: 8, records: {} });
    expect(loadPortfolio(storage).error).toBeTruthy();
    const blocked = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(savePortfolio({ version: 1, records: {} }, blocked)).toBe(false);
    expect(STORAGE_KEY).toBe('science-learning:portfolio:v1');
  });
  it('rejects malformed evidence rather than mounting untrusted records', () => {
    const storage = { getItem: () => JSON.stringify({ version: 1, records: { S2: { runs: [null] } } }) };
    expect(loadPortfolio(storage).error).toBeTruthy();
  });
  it('restores battery and whole-car evidence alongside previous bench records', () => {
    const record = appendRun(emptyRecord(), {
      id: 'battery-one',
      draft: { batteryType: 'lfp', batteryFlow: 'discharge' },
      prediction: '电池可以给电机供能',
      scene: { kind: 'battery' },
      evidence: { title: '电池观察', summary: '供能方向', metrics: [], notes: [], valid: true },
    });
    const oldRecord = appendRun(emptyRecord(), {
      id: 'old-history', draft: { order: ['history-event-2001'] }, prediction: '旧观察',
      scene: { kind: 'vehicle' },
      evidence: { title: '旧证据', summary: '保留', metrics: [], notes: [], valid: true },
    });
    const carRecord = appendRun(emptyRecord(), {
      id: 'whole-car', draft: { vehicleEra: 'hybrid' }, prediction: '两种动力协作',
      scene: { kind: 'evolution' },
      evidence: { title: '整车观察', summary: '整车动力', metrics: [], notes: [], valid: true },
    });
    const portfolio = { version: 1, records: { B1: record, H1: oldRecord, H2: carRecord } };
    const restored = loadPortfolio({ getItem: () => JSON.stringify(portfolio) });
    expect(restored.error).toBeUndefined();
    expect(restored.portfolio).toEqual(portfolio);
  });
});
