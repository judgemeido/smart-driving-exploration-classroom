import { expect, it } from 'vitest';
import { historyExhibits, archiveAssets } from '../../src/chapters/history/data';
import { disassemblyTasks, assemblyInfo } from '../../src/chapters/explore/data';
import { scenarios, orderOptions } from '../../src/chapters/traffic/data';

it('keeps the expanded 23 exhibits and references available archive assets', () => {
  expect(historyExhibits).toHaveLength(23);
  expect(new Set(historyExhibits.map((item) => item.id)).size).toBe(23);
  for (const exhibit of historyExhibits)
    if (exhibit.imageTitle) expect(archiveAssets[exhibit.imageTitle]?.image).toBeTruthy();
});

it('keeps the three model tasks tied to known assemblies', () => {
  expect(disassemblyTasks.map((task) => task.target)).toEqual(['BatteryPack', 'ADAS', 'Cabin']);
  for (const task of disassemblyTasks) expect(assemblyInfo[task.target]).toBeDefined();
});

it('keeps eight traffic situations with unique ids, ordered stops and a single correct choice', () => {
  expect(scenarios).toHaveLength(8);
  expect(new Set(scenarios.map((scenario) => scenario.id)).size).toBe(8);
  scenarios.forEach((scenario, index) => {
    expect(scenario.options.filter((option) => option.correct)).toHaveLength(1);
    if (index > 0) expect(scenario.stopZ).toBeLessThan(scenarios[index - 1].stopZ);
    const before = [...scenario.options];
    const ordered = orderOptions(scenario, index);
    expect(new Set(ordered)).toEqual(new Set(before));
    expect(ordered.filter((option) => option.correct)).toHaveLength(1);
    expect(scenario.options).toEqual(before);
  });
});
