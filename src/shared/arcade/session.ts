import { calculateArcadeScore, validRunConfig } from './scoring';
import { createArcadeRepository, createLocalId, type ArcadeRepository } from './storage';
import type {
  ArcadeRunConfig,
  ArcadeSession,
  ArcadeSnapshot,
  DomainFact,
  FinishReason,
  ObjectiveProgress,
} from './types';
export function createArcadeSession(
  options: { clock?: { nowMs(): number }; repository?: ArcadeRepository } = {},
): ArcadeSession {
  const repository = options.repository ?? createArcadeRepository(),
    clock = options.clock ?? { nowMs: () => performance.now() };
  let snapshot: ArcadeSnapshot = {
    phase: 'idle',
    runId: null,
    config: null,
    elapsedMs: null,
    remainingMs: null,
    objectives: [],
    result: null,
    persistence: repository.persistence,
  };
  let startAt = 0,
    elapsed = 0,
    active = true,
    disposed = false,
    queued = false,
    resultSaved = true,
    lastCheckpoint = 0;
  const revisions = new Map<string, number>(),
    firstSeen = new Set<string>(),
    listeners = new Set<(s: ArcadeSnapshot) => void>();
  const emit = () => {
    snapshot = { ...snapshot, persistence: resultSaved ? repository.persistence : 'memory-only' };
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      for (const listener of listeners) listener(structuredClone(snapshot));
    });
  };
  function settle() {
    if (snapshot.phase !== 'running' || snapshot.config?.mode !== 'contest') return;
    elapsed = Math.max(elapsed, Math.max(0, clock.nowMs() - startAt));
    snapshot.elapsedMs = Math.min(360000, elapsed);
    snapshot.remainingMs = Math.max(0, 360000 - elapsed);
  }
  function checkpoint() {
    if (
      snapshot.config?.mode !== 'contest' ||
      snapshot.phase !== 'running' ||
      elapsed - lastCheckpoint < 5000
    )
      return;
    lastCheckpoint = elapsed;
    const d = repository.read().activeDraft;
    if (d?.runId === snapshot.runId)
      repository.checkpoint({
        ...d,
        elapsedMs: snapshot.elapsedMs!,
        objectives: structuredClone(snapshot.objectives),
        savedEpochMs: Date.now(),
      });
  }
  function finish(reason: FinishReason) {
    if (snapshot.phase === 'finished') return snapshot.result;
    if (snapshot.phase !== 'running' || !snapshot.config || !snapshot.runId) return null;
    const stored = repository.read();
    const ownsDraft = snapshot.config.mode !== 'contest' || stored.activeDraft?.runId === snapshot.runId;
    settle();
    if (!ownsDraft) reason = 'interrupted';
    else if (snapshot.config.mode === 'contest' && elapsed >= 360000) reason = 'timeout';
    if (reason === 'completed' && !snapshot.objectives.every((o) => o.completed)) reason = 'abandoned';
    const eligible = snapshot.config.mode === 'contest' && (reason === 'completed' || reason === 'timeout');
    const result = stored.results.find((item) => !ownsDraft && item.runId === snapshot.runId) ?? {
      runId: snapshot.runId,
      config: structuredClone(snapshot.config),
      status: reason,
      eligible,
      elapsedMs: snapshot.elapsedMs,
      objectives: structuredClone(snapshot.objectives),
      score: eligible ? calculateArcadeScore(snapshot.objectives, snapshot.elapsedMs!, 360000) : null,
      createdEpochMs: Date.now(),
    };
    snapshot = { ...snapshot, phase: 'finished', result };
    if (ownsDraft) repository.save(result);
    resultSaved = ownsDraft || stored.results.some((item) => item.runId === snapshot.runId);
    emit();
    return result;
  }
  const api: ArcadeSession = {
    start(config: ArcadeRunConfig) {
      if (disposed || !validRunConfig(config)) return { ok: false, reason: 'invalid-config' };
      if (snapshot.phase === 'running') return { ok: false, reason: 'already-running' };
      const runId = createLocalId();
      const objectives: ObjectiveProgress[] = config.objectives.map((o) => ({
        ...o,
        completed: false,
        firstCorrect: false,
        usedHint: false,
      }));
      if (config.mode === 'contest') {
        const begin = repository.begin(config, runId, objectives);
        if (!begin.ok) return begin;
      }
      startAt = clock.nowMs();
      elapsed = 0;
      lastCheckpoint = 0;
      revisions.clear();
      firstSeen.clear();
      active = true;
      resultSaved = true;
      snapshot = {
        phase: 'running',
        runId,
        config: structuredClone(config),
        elapsedMs: config.mode === 'contest' ? 0 : null,
        remainingMs: config.durationMs,
        objectives,
        result: null,
        persistence: repository.persistence,
      };
      emit();
      return { ok: true, runId };
    },
    record(facts: readonly DomainFact[]) {
      if (disposed || snapshot.phase !== 'running') return false;
      if (snapshot.config?.mode === 'contest' && repository.read().activeDraft?.runId !== snapshot.runId) {
        finish('interrupted');
        return false;
      }
      settle();
      if (snapshot.config?.mode === 'contest' && elapsed >= 360000) {
        finish('timeout');
        return false;
      }
      if (!active) return false;
      if (
        !Array.isArray(facts) ||
        facts.some(
          (f) =>
            !f ||
            !snapshot.objectives.some((o) => o.id === f.objectiveId) ||
            !Number.isInteger(f.revision) ||
            f.revision < 0 ||
            !['correct', 'incorrect'].includes(f.verdict) ||
            typeof f.usedHint !== 'boolean',
        )
      )
        return false;
      const next = snapshot.objectives.map((o) => ({ ...o }));
      for (const fact of facts) {
        const o = next.find((o) => o.id === fact.objectiveId)!;
        if (o.completed || fact.revision <= (revisions.get(o.id) ?? -1)) continue;
        revisions.set(o.id, fact.revision);
        o.usedHint ||= fact.usedHint;
        if (!firstSeen.has(o.id)) {
          firstSeen.add(o.id);
          o.firstCorrect = fact.verdict === 'correct' && !o.usedHint;
        }
        if (fact.verdict === 'correct') o.completed = true;
      }
      snapshot = { ...snapshot, objectives: next };
      if (next.every((o) => o.completed)) finish('completed');
      else {
        checkpoint();
        emit();
      }
      return true;
    },
    finish,
    subscribe(listener) {
      listeners.add(listener);
      listener(structuredClone(snapshot));
      return () => listeners.delete(listener);
    },
    setActive(value) {
      if (disposed) return;
      active = value;
      if (snapshot.phase === 'running' && snapshot.config?.mode === 'contest' && repository.read().activeDraft?.runId !== snapshot.runId) {
        finish('interrupted');
        return;
      }
      settle();
      if (snapshot.phase === 'running' && snapshot.config?.mode === 'contest' && elapsed >= 360000)
        finish('timeout');
      else {
        checkpoint();
        emit();
      }
    },
    dispose() {
      if (disposed) return;
      if (snapshot.phase === 'running') finish('interrupted');
      disposed = true;
      listeners.clear();
      unsubscribeRepository();
      if (!options.repository) repository.dispose();
    },
  };
  const unsubscribeRepository = repository.subscribe(() => {
    if (snapshot.phase === 'running' && snapshot.config?.mode === 'contest') {
      const draft = repository.read().activeDraft;
      if (draft?.runId !== snapshot.runId) finish('interrupted');
    }
  });
  return api;
}
