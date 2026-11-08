import type { ActivityId, Profile } from './types';
export const CHALLENGE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
export interface ChallengeCode {
  code: string;
  round: string;
  seed: string;
  profile: Profile;
}
export function parseChallengeCode(text: string): ChallengeCode | null {
  if (typeof text !== 'string') return null;
  const code = text.trim().toUpperCase();
  const match = /^SA1-(R\d{2})-([23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6})-([GS])$/.exec(code);
  return match
    ? { code, round: match[1], seed: match[2], profile: match[3] === 'G' ? 'guided' : 'standard' }
    : null;
}
export function createActivitySeed(seed: string, activityId: ActivityId): number {
  let hash = 2166136261;
  for (const char of `${seed}:${activityId}`) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
export function createSeededRandom(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
