import { describe, expect, it } from 'vitest';
import { ARCADE_STORAGE_KEY, createArcadeRepository } from '../../../src/shared/arcade/storage';
function storage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
  };
}
describe('local science records', () => {
  it('persists preferences, sanitizes nicknames, and creates a distinct player slot', () => {
    const s = storage(),
      r = createArcadeRepository({ storage: s });
    const original = r.read().preferences.slotId;
    expect(r.read().preferences.soundEnabled).toBe(false);
    r.updatePreferences({ nickname: '  <小车>\u0000  ', soundEnabled: true });
    const reloaded = createArcadeRepository({ storage: s });
    expect(reloaded.read().preferences.nickname).toBe('<小车>');
    expect(reloaded.read().preferences.soundEnabled).toBe(true);
    reloaded.createPlayerSlot();
    expect(reloaded.read().preferences.slotId).not.toBe(original);
  });
  it('leaves corrupt and future stores intact and reports read-only state', () => {
    for (const raw of ['broken', JSON.stringify({ schemaVersion: 9 })]) {
      const s = storage();
      s.setItem(ARCADE_STORAGE_KEY, raw);
      const r = createArcadeRepository({ storage: s });
      r.updatePreferences({ nickname: '新' });
      expect(s.getItem(ARCADE_STORAGE_KEY)).toBe(raw);
      expect(r.persistence).toBe('read-only');
    }
  });
  it('plays in memory when writes throw and never clears unrelated data', () => {
    const s = storage();
    s.setItem('unrelated', 'keep');
    const r = createArcadeRepository({
      storage: {
        ...s,
        setItem: () => {
          throw new Error('quota');
        },
      },
    });
    r.updatePreferences({ nickname: '仍可玩' });
    expect(r.read().preferences.nickname).toBe('仍可玩');
    expect(r.persistence).toBe('memory-only');
    r.clearRecords();
    expect(s.getItem('unrelated')).toBe('keep');
  });
});
