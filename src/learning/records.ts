import { activities } from './catalog';
import type { ActivityRecord, EvidenceRun, Portfolio } from './types';
export const STORAGE_KEY = 'science-learning:portfolio:v1';
type Reader = Pick<Storage, 'getItem'>;
type Writer = Pick<Storage, 'setItem'>;
export const emptyRecord = (): ActivityRecord => ({
  draft: null,
  prediction: '',
  explanation: '',
  runs: [],
  completed: false,
});
export function appendRun(record: ActivityRecord, run: EvidenceRun): ActivityRecord {
  const runs = [...record.runs, structuredClone(run)];
  return { ...record, runs: runs.length > 12 ? [runs[0], ...runs.slice(-11)] : runs };
}
function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function validatePortfolio(value: unknown): value is Portfolio {
  if (!object(value) || value.version !== 1 || !object(value.records)) return false;
  return Object.entries(value.records).every(
    ([id, r]) =>
      activities.some((a) => a.id === id) &&
      object(r) &&
      typeof r.prediction === 'string' &&
      r.prediction.length <= 2000 &&
      typeof r.explanation === 'string' &&
      r.explanation.length <= 4000 &&
      typeof r.completed === 'boolean' &&
      Array.isArray(r.runs) &&
      r.runs.length <= 12 &&
      r.runs.every(
        (run) =>
          object(run) &&
          typeof run.id === 'string' &&
          typeof run.prediction === 'string' &&
          object(run.scene) &&
          ['vehicle', 'sensor', 'battery', 'evolution'].includes(String(run.scene.kind)) &&
          object(run.evidence) &&
          typeof run.evidence.title === 'string' &&
          typeof run.evidence.summary === 'string' &&
          typeof run.evidence.valid === 'boolean' &&
          Array.isArray(run.evidence.metrics) &&
          run.evidence.metrics.every(
            (m) => object(m) && typeof m.label === 'string' && typeof m.value === 'string',
          ) &&
          Array.isArray(run.evidence.notes) &&
          run.evidence.notes.every((n) => typeof n === 'string'),
      ),
  );
}
export function loadPortfolio(storage?: Reader): { portfolio: Portfolio; error?: string } {
  const blank: Portfolio = { version: 1, records: {} };
  try {
    const raw = (storage ?? localStorage).getItem(STORAGE_KEY);
    if (!raw) return { portfolio: blank };
    if (raw.length > 2_000_000) throw new Error('large');
    const value: unknown = JSON.parse(raw);
    if (!validatePortfolio(value)) throw new Error('schema');
    return { portfolio: value };
  } catch {
    return { portfolio: blank, error: '原学习记录无法读取，已保留原数据。本次记录可导出保存。' };
  }
}
export function savePortfolio(portfolio: Portfolio, storage?: Writer): boolean {
  try {
    (storage ?? localStorage).setItem(STORAGE_KEY, JSON.stringify(portfolio));
    return true;
  } catch {
    return false;
  }
}
