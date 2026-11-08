import type { ExperimentFactory } from '../types';
import { evolutionEras, restoreEvolutionDraft, evolutionEvidence } from './evolution-state';
import '../evolution.css';
export const createEvolutionExperiment: ExperimentFactory = (host, context) => {
  const draft = restoreEvolutionDraft(context.initialDraft),
    state = draft.evolution;
  state.running = false;
  const root = document.createElement('div');
  root.className = 'lab-control-group evolution-controls';
  host.append(root);
  const group = document.createElement('fieldset');
  group.className = 'evolution-picker';
  const legend = document.createElement('legend');
  legend.textContent = '选择年代与整车';
  group.append(legend);
  const buttons: HTMLButtonElement[] = [];
  evolutionEras.forEach((era) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.era = era.id;
    b.textContent = era.label;
    b.addEventListener('click', () => {
      state.era = era.id;
      state.running = false;
      if (!state.visited.includes(era.id)) state.visited.push(era.id);
      sync();
      context.onChange();
    });
    buttons.push(b);
    group.append(b);
  });
  const status = document.createElement('p');
  status.className = 'lab-help evolution-status';
  const need = document.createElement('p');
  need.className = 'lab-note';
  const added = document.createElement('p');
  added.className = 'lab-help';
  const path = document.createElement('p');
  path.className = 'evolution-path';
  const feedback = document.createElement('p');
  feedback.className = 'lab-help';
  feedback.setAttribute('role', 'status');
  root.append(group, status, need, added, path);
  const sync = () => {
    const era = evolutionEras.find((e) => e.id === state.era)!;
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.era === state.era)));
    status.textContent = `已看过 ${new Set(state.visited).size} / 4 种车型 · 点击另一种，对照车形与能源`;
    need.textContent = `回应的需要：${era.need}`;
    added.textContent = `这一方案的特点：${era.added}`;
    path.textContent = era.path;
    context.setScene({
      kind: 'evolution',
      vehicleEra: state.era,
      energy: era.energy,
      power: true,
      transmission: true,
      running: state.running,
      cutaway: state.open,
      selected: 'overview',
    });
  };
  const action = (label: string, fn: (b: HTMLButtonElement) => void) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'lab-inline-action';
    b.textContent = label;
    b.addEventListener('click', () => {
      fn(b);
      sync();
      context.onChange();
    });
    root.append(b);
    return b;
  };
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const demonstrate = () => {
    clearTimeout(timeout);
    state.running = true;
    state.demonstrated = true;
    feedback.textContent = '正在演示能量经过的部件（3秒），可再次点击重放。';
    timeout = setTimeout(() => {
      state.running = false;
      feedback.textContent = '演示结束。可以打开车身，对照能量经过的部件。';
      sync();
      context.onChange();
    }, 3000);
  };
  action('演示动力路径', demonstrate);
  const open = action('打开车身观察', (b) => {
    state.open = !state.open;
    state.demonstrated = true;
    b.setAttribute('aria-pressed', String(state.open));
    feedback.textContent = state.open
      ? '车身已打开，动力部件的位置是教学示意。'
      : '车身已合上，可比较整车轮廓。';
  });
  open.setAttribute('aria-pressed', String(state.open));
  root.append(feedback);
  // Keep the two meaningful actions next to the vehicle picker on classroom screens.
  const actions = document.createElement('div');
  actions.className = 'evolution-actions';
  actions.append(...root.querySelectorAll<HTMLButtonElement>(':scope > button'));
  group.after(actions, path, status);
  const facts = document.createElement('details');
  const factsSummary = document.createElement('summary');
  factsSummary.textContent = '这辆车回应了什么需要？';
  facts.append(factsSummary, need, added);
  status.after(facts);
  const details = document.createElement('details');
  details.className = 'lab-secondary-details';
  const summary = document.createElement('summary');
  summary.textContent = '模型边界与史料';
  const p = document.createElement('p');
  p.className = 'lab-help';
  p.textContent =
    '车型是时代特征示意，不是指定车型CAD。动力演示只显示定性能量路径，不表示真实速度、效率或混动分配。燃油、电动与混动长期并存，年代不代表优劣排名。';
  details.append(summary, p);
  for (const [title, url] of [
    [
      '奔驰：1886专利机动车',
      'https://group.mercedes-benz.com/company/tradition/company-history/1885-1886.html',
    ],
    ['美国能源部：电动车历史', 'https://www.energy.gov/articles/history-electric-car'],
    ['丰田：1997 Prius', 'https://global.toyota/en/prius20th/'],
  ]) {
    const a = document.createElement('a');
    a.className = 'lab-source';
    a.textContent = title + ' ↗';
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    details.append(a);
  }
  root.append(details);
  sync();
  return {
    demonstrate() {
      demonstrate();
      sync();
      context.onChange();
    },
    getDraft: () => ({ ...draft, evolution: { ...state, visited: [...state.visited] } }),
    observe: () => ({
      title: '整车与需要的对照',
      summary: `${evolutionEras.find((e) => e.id === state.era)!.label}：${evolutionEras.find((e) => e.id === state.era)!.need}`,
      metrics: [
        { label: '已比较车型', value: `${new Set(state.visited).size} / 4` },
        { label: '当前能量路径', value: evolutionEras.find((e) => e.id === state.era)!.path },
      ],
      notes: [
        state.demonstrated ? '已打开车身或演示动力路径。' : '请演示动力路径或打开车身。',
        '技术回应不同需要；年代不代表单向替代或优劣排名。',
      ],
      valid: evolutionEvidence(draft),
    }),
    setPresentation(presentation) {
      state.open = presentation.cutaway;
      if (presentation.cutaway || presentation.exploded) state.demonstrated = true;
      open.setAttribute('aria-pressed', String(state.open));
      context.onChange();
    },
    dispose: () => {
      clearTimeout(timeout);
      root.remove();
    },
  };
};
