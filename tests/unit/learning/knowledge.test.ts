import { describe, expect, it } from 'vitest';
import {
  freshKnowledge,
  submitKnowledge,
  restoreKnowledge,
  updateAnswer,
} from '../../../src/learning/knowledge-state';
describe('knowledge exchange records', () => {
  it('requires three answers and locks the first submitted result', () => {
    let r = freshKnowledge();
    expect(submitKnowledge('Q1', r).submitted).toBeNull();
    [1, 2, 1].forEach((a, i) => {
      r = updateAnswer(r, i, a);
    });
    r = submitKnowledge('Q1', r);
    expect(r.submitted?.score).toBe(3);
    expect(updateAnswer(r, 0, 0).answers[0]).toBe(1);
    expect(submitKnowledge('Q1', r).submitted).toEqual(r.submitted);
  });
  it('keeps drafts and validates stored results with version protection', () => {
    const state = { version: 1, records: { Q2: updateAnswer(freshKnowledge(), 1, 1) } };
    expect(restoreKnowledge(JSON.stringify(state)).data.records.Q2.answers[1]).toBe(1);
    expect(restoreKnowledge('{broken').protected).toBe(true);
    expect(restoreKnowledge('{"version":2,"records":{}}').protected).toBe(true);
  });
  it('scores evidence questions independently and rejects forged submitted scores', () => {
    let r = freshKnowledge();
    [0, 1, 2].forEach((a, i) => {
      r = updateAnswer(r, i, a);
    });
    r = submitKnowledge('Q2', r);
    expect(r.submitted?.score).toBe(3);
    const data = { version: 1, records: { Q2: { ...r, submitted: { ...r.submitted, score: 99 } } } };
    expect(restoreKnowledge(JSON.stringify(data)).protected).toBe(true);
  });
});
