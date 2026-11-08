import type { ExperimentFactory } from '../types';
import { createEvolutionExperiment } from './evolution';
import { evaluateEnergy, restoreHistoryDraft } from './history-state';
const energyCopy = {
  electric: {
    title: '纯电动',
    path: '电池储存的能量 → 电控调节 → 电机 → 传动机构 → 车轮',
    note: '通过充电补能。行驶时没有尾气；发电与电池制造仍会影响环境。',
  },
  fuel: {
    title: '燃油',
    path: '燃料的化学能 → 发动机 → 传动机构 → 车轮',
    note: '发动机燃烧燃料做功并产生尾气。只显示定性路径，不模拟燃烧过程或效率。',
  },
  hybrid: {
    title: '混合动力',
    path: '燃料与电池 → 发动机、电机按系统设计协作 → 传动机构 → 车轮',
    note: '混合动力有多种结构，并非所有车型都能外接充电；此模型不计算动力分配。',
  },
};
export const createHistoryExperiment: ExperimentFactory = (host, context) => {
  if (context.activityId === 'H1') return createEvolutionExperiment(host, context);
  const draft = restoreHistoryDraft(context.initialDraft);
  const root = document.createElement('div');
  root.className = 'lab-control-group';
  host.append(root);
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = '') => {
    const n = document.createElement(tag);
    n.textContent = text;
    n.className = className;
    return n;
  };
  const sync = () =>
    context.setScene({
      kind: 'evolution',
      vehicleEra: draft.energy === 'fuel' ? 'pioneer' : draft.energy === 'hybrid' ? 'hybrid' : 'modern-ev',
      energy: draft.energy,
      power: draft.power,
      transmission: draft.transmission,
      running: draft.energy === 'electric' && draft.power,
      exploded: draft.exploded,
      cutaway: draft.cutaway,
    });
  const changed = () => {
    sync();
    context.onChange();
  };
  const label = el('label', '能源方案', 'lab-label'),
    select = el('select', '', 'lab-select');
  for (const [value, copy] of Object.entries(energyCopy)) {
    const o = el('option', copy.title);
    o.value = value;
    select.append(o);
  }
  select.value = draft.energy;
  label.append(select);
  root.append(label);
  const path = el('p', '', 'lab-note'),
    note = el('p', '', 'lab-help'),
    controls = el('div', '', 'lab-options');
  root.append(path, controls);
  for (const [text, key] of [
    ['接通电池供能', 'power'],
    ['连接传动机构', 'transmission'],
  ] as const) {
    const l = el('label', '', 'lab-option'),
      input = el('input');
    input.type = 'checkbox';
    input.checked = draft[key];
    input.addEventListener('change', () => {
      draft[key] = input.checked;
      changed();
    });
    l.append(input, document.createTextNode(text));
    controls.append(l);
  }
  const update = () => {
    path.textContent = energyCopy[draft.energy].path;
    note.textContent = energyCopy[draft.energy].note;
    controls.hidden = draft.energy !== 'electric';
  };
  select.addEventListener('change', () => {
    draft.energy = select.value as typeof draft.energy;
    update();
    changed();
  });
  const details = el('details', '', 'lab-secondary-details');
  details.append(
    el('summary', '能源说明与模型边界'),
    note,
    el(
      'p',
      '断路实验检验纯电整车功能示意；燃油与混动只比较定性路径。忽略惯性、滑行、损耗与再生制动。断供能时电机与车轮均停止；只断传动时电机可转、车轮不转。',
      'lab-help',
    ),
  );
  const source = el('a', '能源方式说明：美国能源部 AFDC ↗', 'lab-source');
  source.href = 'https://afdc.energy.gov/vehicles/how-do-all-electric-cars-work';
  source.target = '_blank';
  source.rel = 'noopener noreferrer';
  details.append(source);
  root.append(details);
  update();
  sync();
  return {
    getDraft: () => ({ ...draft, order: [...draft.order] }),
    setPresentation(presentation) {
      draft.exploded = presentation.exploded;
      draft.cutaway = presentation.cutaway;
      context.onChange();
    },
    observe: () => {
      const model = evaluateEnergy(draft);
      return {
        title: `${energyCopy[draft.energy].title}能量路径`,
        summary:
          draft.energy !== 'electric'
            ? '已选择能源方式；切回纯电动完成可控断路实验。'
            : !draft.power
              ? '供能断开，电机和车轮均停止。'
              : !draft.transmission
                ? '供能接通但传动断开：电机可转，车轮不转。'
                : '供能与传动均接通，电机带动车轮。',
        metrics: [
          {
            label: '电机',
            value: draft.energy === 'electric' ? (model.motor ? '转动' : '停止') : '仅显示定性路径',
          },
          {
            label: '车轮',
            value: draft.energy === 'electric' ? (model.wheels ? '转动' : '停止') : '仅显示定性路径',
          },
          { label: '能量路径', value: energyCopy[draft.energy].path },
        ],
        notes: [
          energyCopy[draft.energy].note,
          '无惯性的整车功能示意；结果不包含真实车辆滑行、损耗或效率估算。',
        ],
        valid: draft.energy === 'electric',
      };
    },
    dispose: () => root.remove(),
  };
};
