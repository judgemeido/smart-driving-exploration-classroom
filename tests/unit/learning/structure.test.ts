import { describe, expect, it } from 'vitest';
import { parseStructureDraft, runChain, inspectPart } from '../../../src/learning/activities/structure-state';

describe('structure causal experiment', () => {
  it('requires both safe yielding and progress after the pedestrian clears', () => {
    const result = runChain({ fault: 'none', rule: 'yield', power: true, transmission: true });
    expect(result.frames.map((f) => f.command)).toEqual(['stop', 'go']);
    expect(result.safe).toBe(true);
    expect(result.completed).toBe(true);
  });
  it('keeps missing evidence uncertain and never invents a go command', () => {
    const result = runChain({ fault: 'input', rule: 'yield', power: true, transmission: true });
    expect(result.frames.every((f) => f.evidence === 'uncertain')).toBe(true);
    expect(result.completed).toBe(false);
  });
  it('distinguishes missing computation from a disconnected actuator', () => {
    const base = { rule: 'yield' as const, power: true, transmission: true };
    expect(runChain({ ...base, fault: 'compute' }).frames[0].command).toBeNull();
    const disconnected = runChain({ ...base, fault: 'actuator' });
    expect(disconnected.frames[0].command).toBe('stop');
    expect(disconnected.frames[0].execution).toBeNull();
    expect(disconnected.safe).toBe(false);
  });
  it('does not count permanent parking as task completion or drive through a pedestrian as safe', () => {
    const base = { fault: 'none' as const, power: true, transmission: true };
    expect(runChain({ ...base, rule: 'park' }).completed).toBe(false);
    expect(runChain({ ...base, rule: 'always-go' }).safe).toBe(false);
  });
  it('opening the shell preserves function while loss of power or transmission prevents movement', () => {
    expect(inspectPart('motor', true, true)).toContain('传动');
    expect(inspectPart('motor', false, true)).toContain('断开');
    expect(runChain({ fault: 'none', rule: 'yield', power: true, transmission: false }).completed).toBe(
      false,
    );
  });
  it('validates persisted draft values instead of trusting storage', () => {
    expect(
      parseStructureDraft({ fault: 'oops', power: 'false', selected: '<script>', step: 99 }),
    ).toMatchObject({ fault: 'actuator', power: true, selected: 'motor', step: 0 });
  });
});
