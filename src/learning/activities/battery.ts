import type { ExperimentFactory } from '../types';
import {
  batteryTypes,
  batteryParts,
  parseBatteryDraft,
  batteryObservation,
  batteryDirection,
} from './battery-state';
import '../battery.css';

export const createBatteryExperiment: ExperimentFactory = (host, context) => {
  let state = parseBatteryDraft(context.initialDraft);
  const abort = new AbortController();
  const partFeedback: Record<string, string> = {
    overview: '先选一种电池，再用模型上方的“剖视”打开壳体，比较里面的结构。',
    cell: '外壳容纳内部材料并保护电芯；壳体打开只是观察方式，不能代表电池停止工作。',
    electrodes: '正、负电极使用不同材料。充放电时发生化学变化，把化学能和电能互相转化。',
    separator: '隔膜把两极隔开，防止直接接触造成短路；电解质中的离子仍能通过。',
    terminals: '端子连接外部电路。选择“连接充电器”或“给用电器供电”，看能量方向怎样反过来。',
    pack: '多个单体组成电池组，还需要连接、保护与管理。模型后侧是缩小展示的成组示例。',
  };
  function render() {
    const backgroundOpen = host.querySelector<HTMLDetailsElement>('[data-battery-background]')?.open ?? false;
    const focused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement.dataset.batteryChoice
        : undefined;
    const info = batteryTypes[state.batteryType];
    host.innerHTML = `<div class="battery-lesson"><p class="lab-label">选择电池，观察它怎样储能</p><div class="battery-choices" role="group" aria-label="选择电池类型">${Object.entries(
      batteryTypes,
    )
      .map(
        ([key, item]) =>
          `<button type="button" data-battery-choice="${key}" data-type="${key}" aria-pressed="${state.batteryType === key}"><strong>${item.name}</strong><span>${item.era}</span></button>`,
      )
      .join(
        '',
      )}</div><p class="battery-timeline">1859 铅酸诞生 → 20 世纪末镍氢兴起、1991 锂离子商业化 → 如今多种方案并行</p><p class="battery-family">磷酸铁锂和三元锂，都是锂离子电池的分支。</p><div class="battery-facts"><h3>${info.name}</h3><p>${info.chemistry}。</p><p><strong>常见用途：</strong>${info.use}。</p><p><strong>选择时要权衡：</strong>${info.tradeoff}</p></div><p class="battery-inspect-feedback" role="status">${partFeedback[state.selected]}</p><div role="group" aria-label="选择电池工作状态" class="battery-flow">${(
      [
        ['rest', '断开电路'],
        ['charge', '连接充电器'],
        ['discharge', '给用电器供电'],
      ] as const
    )
      .map(
        ([key, label]) =>
          `<button type="button" data-battery-choice="${key}" data-flow="${key}" aria-pressed="${state.flow === key}">${label}</button>`,
      )
      .join(
        '',
      )}</div><p class="battery-direction" role="status"><strong>能量方向：</strong>${batteryDirection(state.flow)}${state.flow === 'rest' ? '；本页不测量电量。' : state.flow === 'charge' ? '；电能转为储存的化学能。' : '；储存的化学能转为电能。'}</p><details><summary>模型说明与资料</summary><p>用上方“剖视”“分解”打开壳体，再选择电极、隔膜或端子。隔膜让两极避免直接接触，同时允许电解质中的离子通过。</p><p>模型是不同结构的教学样例，不是当年历史实物。外形不能单独判断化学体系；三元锂和磷酸铁锂也可制成多种形状。图中箭头表示能量方向，不是电子穿过隔膜。</p><p>资料：<a href="https://afdc.energy.gov/vehicles/electric-batteries" target="_blank" rel="noopener noreferrer">美国能源部 AFDC 电池介绍</a>；<a href="https://www.nobelprize.org/prizes/chemistry/2019/popular-information/" target="_blank" rel="noopener noreferrer">诺贝尔化学奖 2019：锂离子电池的发展</a>。这里只比较常见取舍，不评选“最好”的电池。</p></details></div>`;
    const lesson = host.querySelector<HTMLElement>('.battery-lesson')!;
    const choices = lesson.querySelector<HTMLElement>('.battery-choices')!;
    const flow = lesson.querySelector<HTMLElement>('.battery-flow')!;
    const direction = lesson.querySelector<HTMLElement>('.battery-direction')!;
    choices.after(flow, direction);
    for (const control of flow.querySelectorAll<HTMLButtonElement>('button')) {
      control.setAttribute('aria-label', control.textContent!);
      control.textContent = { rest: '断开电路', charge: '充电', discharge: '供电' }[control.dataset.flow!] ?? '';
    }
    const background = document.createElement('details');
    background.dataset.batteryBackground = '';
    background.open = backgroundOpen;
    const summary = document.createElement('summary');
    summary.textContent = '发展档案：1859 → 1991 → 今天';
    background.append(summary);
    for (const selector of ['.battery-timeline', '.battery-family', '.battery-facts'])
      background.append(lesson.querySelector<HTMLElement>(selector)!);
    direction.after(background);
    const inspectFeedback = lesson.querySelector<HTMLElement>('.battery-inspect-feedback')!;
    inspectFeedback.hidden = state.selected === 'overview';
    context.setScene({
      kind: 'battery',
      batteryType: state.batteryType,
      batteryFlow: state.flow,
      selected: state.selected,
    });
    if (focused) host.querySelector<HTMLElement>(`[data-battery-choice="${focused}"]`)?.focus();
  }
  host.addEventListener(
    'click',
    (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
      if (!button) return;
      if (button.dataset.type) state = parseBatteryDraft({ ...state, batteryType: button.dataset.type });
      if (button.dataset.flow) state = parseBatteryDraft({ ...state, flow: button.dataset.flow });
      render();
      context.onChange();
    },
    { signal: abort.signal },
  );
  render();
  return {
    getDraft: () => ({ ...state }),
    observe: () => batteryObservation(state),
    selectPart(part) {
      if ((batteryParts as readonly string[]).includes(part)) {
        state.selected = part;
        render();
        context.onChange();
      }
    },
    dispose() {
      abort.abort();
      host.replaceChildren();
    },
  };
};
