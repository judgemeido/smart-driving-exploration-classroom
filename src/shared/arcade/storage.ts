import { calculateArcadeScore, createComparisonKey, validRunConfig } from './scoring';
import { parseChallengeCode } from './challenge-code';
import type {
  ArcadeDraft,
  ArcadeLocalStoreV1,
  ArcadePreferences,
  ArcadeResult,
  ArcadeRunConfig,
  ObjectiveProgress,
  Persistence,
  StartResult,
} from './types';
export const ARCADE_STORAGE_KEY = 'science-arcade:local:v1';
const MAX = 200,
  RETENTION = 30 * 86400000;
type StoragePort = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export function createLocalId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `local-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
  );
}
export function sanitizeNickname(value: string): string {
  return (
    Array.from(value.replace(/[\u0000-\u001f\u007f-\u009f]/g, '').trim())
      .slice(0, 12)
      .join('') || '实验员'
  );
}
function fresh(): ArcadeLocalStoreV1 {
  return {
    schemaVersion: 1,
    dataVersion: 'science-arcade-1',
    revision: 0,
    preferences: {
      slotId: createLocalId(),
      nickname: '实验员',
      profile: 'guided',
      lastChallengeCode: null,
      soundEnabled: false,
    },
    activeDraft: null,
    contestLocks: [],
    results: [],
  };
}
const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;
const string = (s: unknown): s is string => typeof s === 'string' && s.length > 0 && s.length <= 300;
function progressValid(p: readonly ObjectiveProgress[], config: ArcadeRunConfig): boolean {
  return (
    Array.isArray(p) &&
    p.length === config.objectives.length &&
    p.every(
      (o, i) =>
        o &&
        o.id === config.objectives[i].id &&
        o.weight === config.objectives[i].weight &&
        typeof o.completed === 'boolean' &&
        typeof o.firstCorrect === 'boolean' &&
        typeof o.usedHint === 'boolean' &&
        (!o.firstCorrect || (o.completed && !o.usedHint)),
    )
  );
}
function resultValid(r: ArcadeResult): boolean {
  if (
    !r ||
    !string(r.runId) ||
    !validRunConfig(r.config) ||
    !['completed', 'timeout', 'abandoned', 'interrupted'].includes(r.status) ||
    typeof r.eligible !== 'boolean' ||
    !finite(r.createdEpochMs) ||
    !progressValid(r.objectives, r.config)
  )
    return false;
  if (r.status === 'completed' && !r.objectives.every((o) => o.completed)) return false;
  if (r.config.mode === 'practice') return r.elapsedMs === null && r.score === null && !r.eligible;
  if (!finite(r.elapsedMs) || r.elapsedMs > 360000) return false;
  if (r.status === 'abandoned' || r.status === 'interrupted') return r.score === null && !r.eligible;
  if (!r.eligible) return false;
  if (r.status === 'timeout' && r.elapsedMs !== 360000) return false;
  const score = calculateArcadeScore(r.objectives, r.elapsedMs, 360000);
  return (
    !!r.score &&
    ['progress', 'quality', 'efficiency', 'total'].every(
      (k) => r.score![k as keyof typeof score] === score[k as keyof typeof score],
    )
  );
}
function decode(raw: string): { store: ArcadeLocalStoreV1; discarded: number } {
  const s = JSON.parse(raw) as ArcadeLocalStoreV1;
  if (
    !s ||
    s.schemaVersion !== 1 ||
    s.dataVersion !== 'science-arcade-1' ||
    !Number.isInteger(s.revision) ||
    s.revision < 0 ||
    !s.preferences ||
    !Array.isArray(s.results) ||
    !Array.isArray(s.contestLocks)
  )
    throw new Error('Unsupported or corrupt store');
  const p = s.preferences;
  if (
    !string(p.slotId) ||
    typeof p.nickname !== 'string' ||
    p.nickname !== sanitizeNickname(p.nickname) ||
    !['guided', 'standard'].includes(p.profile) ||
    typeof p.soundEnabled !== 'boolean' ||
    (p.lastChallengeCode !== null && !parseChallengeCode(p.lastChallengeCode))
  )
    throw new Error('Invalid preferences');
  if (
    s.contestLocks.length > MAX ||
    !s.contestLocks.every(
      (l) => l && string(l.slotId) && string(l.comparisonKey) && string(l.runId) && finite(l.createdEpochMs),
    )
  )
    throw new Error('Invalid locks');
  const d = s.activeDraft;
  if (
    d !== null &&
    (!d ||
      !validRunConfig(d.config) ||
      d.config.mode !== 'contest' ||
      !string(d.runId) ||
      d.slotId !== d.config.slotId ||
      d.comparisonKey !== createComparisonKey(d.config) ||
      !progressValid(d.objectives, d.config) ||
      !finite(d.elapsedMs) ||
      d.elapsedMs > 360000 ||
      !finite(d.startedEpochMs) ||
      !finite(d.savedEpochMs))
  )
    throw new Error('Invalid active draft');
  const results = s.results.filter(resultValid);
  return {
    store: { ...s, results: boundedResults(results, s.contestLocks) },
    discarded: s.results.length - results.length,
  };
}
function boundedResults(results: ArcadeResult[], locks: ArcadeLocalStoreV1['contestLocks']): ArcadeResult[] {
  const protectedIds = new Set(locks.map((lock) => lock.runId));
  return [...results]
    .sort(
      (a, b) =>
        Number(protectedIds.has(b.runId)) - Number(protectedIds.has(a.runId)) ||
        b.createdEpochMs - a.createdEpochMs,
    )
    .slice(0, MAX)
    .sort((a, b) => a.createdEpochMs - b.createdEpochMs);
}
export interface ArcadeRepository {
  readonly persistence: Persistence;
  readonly notice: string;
  read(): ArcadeLocalStoreV1;
  begin(config: ArcadeRunConfig, runId: string, objectives: readonly ObjectiveProgress[]): StartResult;
  checkpoint(draft: ArcadeDraft): void;
  save(result: ArcadeResult): void;
  updatePreferences(partial: Partial<Omit<ArcadePreferences, 'slotId'>>): void;
  createPlayerSlot(nickname?: string): ArcadePreferences;
  deleteResult(runId: string): void;
  clearRecords(): void;
  reset(): void;
  subscribe(listener: () => void): () => void;
  dispose(): void;
}
export function createArcadeRepository(
  options: { storage?: StoragePort | null; nowEpochMs?: () => number } = {},
): ArcadeRepository {
  let port: StoragePort | null = null,
    persistence: Persistence = 'saved',
    notice = '';
  try {
    port = options.storage === undefined ? (globalThis.localStorage ?? null) : options.storage;
  } catch {
    persistence = 'memory-only';
  }
  if (!port) persistence = 'memory-only';
  let state = fresh(),
    lastRaw: string | null = null;
  const now = options.nowEpochMs ?? Date.now;
  const listeners = new Set<() => void>();
  function readPort() {
    if (!port || persistence !== 'saved') return;
    try {
      const raw = port.getItem(ARCADE_STORAGE_KEY);
      if (raw === lastRaw) return;
      if (raw !== null) {
        const decoded = decode(raw);
        state = decoded.store;
        if (decoded.discarded) notice = `已忽略 ${decoded.discarded} 条损坏记录，正式次数锁仍保留。`;
      } else if (lastRaw !== null) state = fresh();
      lastRaw = raw;
    } catch {
      persistence = 'read-only';
      notice = '本机记录损坏或版本不兼容，原数据已保留。本次成绩可查看，本机未保存。';
    }
  }
  readPort();
  function retain() {
    const date = now();
    const dates = [
      ...state.results.map((r) => r.createdEpochMs),
      ...state.contestLocks.map((l) => l.createdEpochMs),
    ];
    if (dates.every((d) => d <= date)) {
      state.results = state.results.filter((r) => date - r.createdEpochMs <= RETENTION);
      state.contestLocks = state.contestLocks.filter((l) => date - l.createdEpochMs <= RETENTION);
    }
    state.results = boundedResults(state.results, state.contestLocks);
  }
  function persist() {
    state.revision++;
    if (port && persistence === 'saved') {
      try {
        const raw = JSON.stringify(state);
        port.setItem(ARCADE_STORAGE_KEY, raw);
        lastRaw = raw;
      } catch {
        persistence = 'memory-only';
        notice = '本次成绩可查看，本机未保存。';
      }
    }
    for (const listener of listeners) listener();
  }
  const repository: ArcadeRepository = {
    get persistence() {
      return persistence;
    },
    get notice() {
      return notice;
    },
    read() {
      readPort();
      return structuredClone(state);
    },
    begin(config, runId, objectives) {
      readPort();
      retain();
      if (state.activeDraft) return { ok: false, reason: 'other-run-active' };
      const key = createComparisonKey(config);
      if (state.contestLocks.some((l) => l.slotId === config.slotId && l.comparisonKey === key))
        return { ok: false, reason: 'attempt-used' };
      if (state.contestLocks.length >= MAX) return { ok: false, reason: 'capacity-full' };
      const epoch = now();
      state.contestLocks.push({ slotId: config.slotId, comparisonKey: key, runId, createdEpochMs: epoch });
      state.activeDraft = {
        runId,
        slotId: config.slotId,
        comparisonKey: key,
        config: structuredClone(config),
        objectives: structuredClone(objectives),
        elapsedMs: 0,
        startedEpochMs: epoch,
        savedEpochMs: epoch,
      };
      persist();
      return { ok: true, runId };
    },
    checkpoint(draft) {
      readPort();
      if (state.activeDraft?.runId !== draft.runId) return;
      state.activeDraft = structuredClone(draft);
      persist();
    },
    save(result) {
      readPort();
      if (state.results.some((r) => r.runId === result.runId)) return;
      state.results.push(structuredClone(result));
      if (state.activeDraft?.runId === result.runId) state.activeDraft = null;
      retain();
      persist();
    },
    updatePreferences(partial) {
      readPort();
      const p = state.preferences;
      if (typeof partial.nickname === 'string') p.nickname = sanitizeNickname(partial.nickname);
      if (partial.profile === 'guided' || partial.profile === 'standard') p.profile = partial.profile;
      if (typeof partial.soundEnabled === 'boolean') p.soundEnabled = partial.soundEnabled;
      if (
        partial.lastChallengeCode === null ||
        (typeof partial.lastChallengeCode === 'string' && parseChallengeCode(partial.lastChallengeCode))
      )
        p.lastChallengeCode = partial.lastChallengeCode ?? null;
      persist();
    },
    createPlayerSlot(nickname) {
      readPort();
      state.preferences = {
        ...state.preferences,
        slotId: createLocalId(),
        nickname: sanitizeNickname(nickname ?? '实验员'),
      };
      persist();
      return { ...state.preferences };
    },
    deleteResult(runId) {
      readPort();
      state.results = state.results.filter((r) => r.runId !== runId);
      persist();
    },
    clearRecords() {
      readPort();
      state = { ...fresh(), preferences: { ...state.preferences } };
      persistence = port ? 'saved' : 'memory-only';
      notice = '';
      persist();
    },
    reset() {
      state = fresh();
      persistence = port ? 'saved' : 'memory-only';
      notice = '';
      persist();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose() {
      listeners.clear();
      if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
    },
  };
  function onStorage(event: StorageEvent) {
    if (event.key !== ARCADE_STORAGE_KEY) return;
    readPort();
    for (const listener of listeners) listener();
  }
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage);
  return repository;
}
export function recoverInterruptedArcadeDraft(
  repository: ArcadeRepository,
  expectedRunId: string,
): ArcadeResult | null {
  const d = repository.read().activeDraft;
  if (!d || d.runId !== expectedRunId) return null;
  const result: ArcadeResult = {
    runId: d.runId,
    config: d.config,
    status: 'interrupted',
    eligible: false,
    elapsedMs: d.elapsedMs,
    objectives: d.objectives,
    score: null,
    createdEpochMs: Date.now(),
  };
  repository.save(result);
  return result;
}
