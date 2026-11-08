import { describe, expect, it } from 'vitest';
import { view } from '../../../src/chapters/explore/view';
import { readFileSync } from 'node:fs';
describe('02 museum migration', () => {
  it('removes the duplicate thirteen-topic launcher while preserving basic exhibits', () => {
    expect(view).not.toContain('data-learning-start');
    expect(view).not.toContain('data-explore-learning');
    for (const selector of [
      'data-assembly-open',
      'data-explore-review',
      'data-disassembly-start',
      'data-focus',
      'data-model-action',
      'data-part-filter',
      'data-powerflow-replay',
      'model-canvas',
    ])
      expect(view).toContain(selector);
  });
  it('keeps review and assembly renderers without the retired learning input branch', () => {
    const renderer = readFileSync('src/chapters/explore/learning-view.ts', 'utf8');
    const controller = readFileSync('src/chapters/explore/controller.ts', 'utf8');
    expect(renderer).toContain('export function renderExploreReview');
    expect(renderer).toContain('export function renderExploreAssembly');
    expect(renderer).not.toContain('renderExploreLearning');
    expect(controller).not.toContain('learningOpen');
    expect(controller).not.toContain('data-learning-');
  });
});
