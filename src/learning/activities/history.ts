import type { ExperimentFactory, Observation } from '../types';
import { archiveAssets, historyExhibits } from '../../chapters/history/data';
import {
  checkHistoryOrder,
  evaluateEnergy,
  historyCards,
  moveHistoryCard,
  restoreHistoryDraft,
} from './history-state';

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text = '',
  className = '',
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.textContent = text;
  node.className = className;
  return node;
}
const energyCopy = {
  electric: {
    title: '纯电动',
    path: '电池储存的能量 → 电控调节 → 电机 → 传动机构 → 车轮',
    note: '通过充电补能。行驶时没有尾气；发电与电池制造仍会影响环境。',
  },
  fuel: {
    title: '燃油',
    path: '燃料的化学能 → 发动机 → 传动机构 → 车轮',
    note: '通过加油补能，发动机燃烧燃料做功并产生尾气。此处只比较能量路径，不给出效率排名。',
  },
  hybrid: {
    title: '混合动力',
    path: '燃料与电池 → 发动机、电机按系统设计协作 → 传动机构 → 车轮',
    note: '混合动力有多种结构，并非所有车型都能外接充电；能量如何分配取决于具体设计。',
  },
};

export const createHistoryExperiment: ExperimentFactory = (host, context) => {
  let draft = restoreHistoryDraft(context.initialDraft);
  const history = context.activityId === 'H1';
  let historyFocus = 'overview';
  const root = element('div', '', 'lab-control-group');
  host.append(root);
  const sync = () =>
    context.setScene({
      kind: 'vehicle',
      energy: draft.energy,
      selected: history ? historyFocus : undefined,
      power: history ? true : draft.power,
      transmission: history ? true : draft.transmission,
      running: !history && draft.energy === 'electric' && draft.power,
      exploded: draft.exploded,
      cutaway: draft.cutaway,
    });
  const changed = () => {
    sync();
    context.onChange();
  };
  const button = (label: string, action: () => void) => {
    const node = element('button', label, 'lab-inline-action');
    node.type = 'button';
    node.addEventListener('click', action);
    return node;
  };
  const toggle = (label: string, key: 'power' | 'transmission' | 'exploded' | 'cutaway') => {
    const wrapper = element('label', '', 'lab-option');
    const input = element('input');
    input.type = 'checkbox';
    input.checked = draft[key];
    input.addEventListener('change', () => {
      draft[key] = input.checked;
      changed();
    });
    wrapper.append(input, document.createTextNode(label));
    root.append(wrapper);
  };
  const archiveDetail = element('div');
  if (history) {
    const list = element('ol', '', 'lab-list history-browser');
    let selectedCard = draft.order[0];
    const browseLabel = element('label', '查看档案与位置', 'lab-label');
    const browse = element('select', '', 'lab-select history-position');
    browseLabel.append(browse);
    browse.addEventListener('change', () => {
      selectedCard = browse.value;
      renderCards();
      changed();
    });
    root.append(browseLabel);
    const feedback = element('p', '', 'lab-note');
    feedback.setAttribute('role', 'status');
    const renderCards = (focusId?: string, focusDirection?: number) => {
      list.replaceChildren();
      browse.replaceChildren();
      draft.order.forEach((id, index) => {
        const card = historyCards.find((item) => item.id === id)!;
        const option = element('option', `${index + 1}. ${card.year} · ${card.label}`);
        option.value = id;
        browse.append(option);
      });
      if (focusId) selectedCard = focusId;
      browse.value = selectedCard;
      historyFocus =
        (
          {
            'history-event-2001': 'motor',
            'history-event-2009': 'battery',
            'history-event-2015': 'sensor',
            'history-event-2020': 'computer',
            'history-event-2026': 'battery',
          } as Record<string, string>
        )[selectedCard] ?? 'overview';
      draft.order.forEach((id, index) => {
        if (id !== selectedCard) return;
        const card = historyCards.find((item) => item.id === id)!;
        const exhibit = historyExhibits.find((item) => item.id === card.sourceExhibitId)!;
        const row = element('li', '', 'lab-row');
        row.value = index + 1;
        const details = element('div');
        details.append(
          element('h4', `${card.year} · ${card.label}`),
          element('p', exhibit.detail, 'lab-help'),
          element('p', exhibit.story, 'lab-help'),
        );
        const asset = archiveAssets[exhibit.imageTitle ?? exhibit.eventTitles[0]];
        if (asset) {
          if (asset.image) {
            const image = element('img');
            image.src = asset.image;
            image.alt = asset.imageAlt ?? exhibit.title;
            image.loading = 'lazy';
            image.style.maxWidth = '100%';
            image.style.maxHeight = '160px';
            details.append(image);
          }
          details.append(element('p', [asset.caption, asset.credit].filter(Boolean).join(' · '), 'lab-help'));
          if (asset.sourceUrl?.startsWith('https://')) {
            const source = element('a', '打开史料来源 ↗', 'lab-source');
            source.href = asset.sourceUrl;
            source.target = '_blank';
            source.rel = 'noopener noreferrer';
            details.append(source);
          }
          if (asset.story) details.append(element('p', asset.story, 'lab-help'));
        }
        for (const direction of [-1, 1] as const) {
          const control = button(direction === -1 ? '上移' : '下移', () => {
            draft.order = moveHistoryCard(draft.order, index, direction);
            feedback.textContent = '已调整顺序。';
            renderCards(id, direction);
            changed();
          });
          control.setAttribute('aria-label', `${card.label}${direction === -1 ? '上移' : '下移'}一个位置`);
          control.disabled = direction === -1 ? index === 0 : index === draft.order.length - 1;
          row.append(control);
          if (focusId === id && focusDirection === direction)
            queueMicrotask(() => {
              if (!control.disabled) control.focus();
              else row.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
            });
        }
        archiveDetail.replaceChildren(details);
        list.append(row);
      });
    };
    renderCards();
    const check = button('核对顺序', () => {
      const result = checkHistoryOrder(draft.order);
      feedback.textContent = result.conflicts.length
        ? result.conflicts.join('；')
        : '相邻年代都从早到晚。再用具体事件解释：科研、示范、感知和补能如何回应不同需要？';
    });
    const actions = element('div', '', 'history-actions');
    actions.append(list, check);
    root.append(actions, feedback);
    const label = element('label', '史料推理', 'lab-label');
    const reasoning = element('select', '', 'lab-select');
    const placeholder = element('option', '请选择史料与需要的联系');
    placeholder.value = '';
    reasoning.append(placeholder);
    const needs: Record<string, string> = {
      'history-event-2001': '科研协作 → 研究电池、电机与电控',
      'history-event-2009': '城市出行 → 在真实道路中示范、检验新能源车',
      'history-event-2015': '观察道路 → 在测试道路研究环境感知',
      'history-event-2020': '使用需要 → 发展充电设施和联网功能',
      'history-event-2026': '补能需要 → 继续探索电池与充电技术',
    };
    const choices = historyCards.map((card) => ({
      value: `依据${card.year}「${card.label}」：${needs[card.id] ?? card.label}。`,
      label: `${card.year} · ${needs[card.id] ?? card.label}`,
    }));
    for (const choice of choices) {
      const option = element('option', choice.label);
      option.value = choice.value;
      reasoning.append(option);
    }
    reasoning.value = choices.some((choice) => choice.value === draft.reasoning) ? draft.reasoning : '';
    if (draft.reasoning && !reasoning.value) {
      const legacy = element('details', '', 'lab-secondary-details');
      legacy.append(element('summary', '查看以前保存的推理'), element('p', draft.reasoning, 'lab-help'));
      root.append(legacy);
    }
    label.append(reasoning);
    reasoning.addEventListener('change', () => {
      draft.reasoning = reasoning.value;
      changed();
    });
    root.append(label);
  } else {
    const label = element('label', '能源方案', 'lab-label');
    const select = element('select', '', 'lab-select');
    for (const [value, copy] of Object.entries(energyCopy)) {
      const option = element('option', copy.title);
      option.value = value;
      select.append(option);
    }
    select.value = draft.energy;
    label.append(select);
    root.append(label);
    const description = element('p', '', 'lab-note');
    const note = element('p', '', 'lab-help');
    const electricControls = element('div', '', 'lab-options');
    const updateEnergy = () => {
      description.textContent = energyCopy[draft.energy].path;
      note.textContent = energyCopy[draft.energy].note;
      electricControls.hidden = draft.energy !== 'electric';
    };
    select.addEventListener('change', () => {
      draft.energy = select.value as typeof draft.energy;
      updateEnergy();
      changed();
    });
    const energyDetails = element('details', '', 'lab-secondary-details');
    energyDetails.append(
      element('summary', '能源说明与模型边界'),
      description,
      note,
      element('p', '断路实验只检验纯电动教学台架；其他能源只比较路径。', 'lab-help'),
    );
    root.append(energyDetails);
    const originalRoot = root;
    const addControl = (text: string, key: 'power' | 'transmission') => {
      toggle(text, key);
      electricControls.append(originalRoot.lastChild!);
    };
    addControl('接通电池供能', 'power');
    addControl('连接传动机构', 'transmission');
    root.append(electricControls);
    energyDetails.append(
      element(
        'p',
        '理想教学台架：忽略惯性、滑行与再生制动。断供能时电机与车轮均停止；只断传动时电机可转、车轮不转。',
        'lab-note',
      ),
    );
    const source = element('a', '能源方式说明：美国能源部 Alternative Fuels Data Center ↗', 'lab-source');
    source.href = 'https://afdc.energy.gov/vehicles/how-do-all-electric-cars-work';
    source.target = '_blank';
    source.rel = 'noopener noreferrer';
    energyDetails.append(source);
    updateEnergy();
  }
  const viewDetails = element('details', '', 'lab-secondary-details');
  viewDetails.append(element('summary', '查看史料与来源'));
  if (history) viewDetails.append(archiveDetail);
  if (history) root.append(viewDetails);
  sync();
  return {
    getDraft: () => ({ ...draft, order: [...draft.order] }),
    observe: (): Observation => {
      if (history) {
        const result = checkHistoryOrder(draft.order);
        return {
          title: '进化档案核对',
          summary: result.conflicts.length
            ? '发现相邻年代倒置，请按史料修订。'
            : '年代顺序成立；因果联系需要由史料和理由支持。',
          metrics: [
            { label: '从早到晚的相邻关系', value: `${result.orderedPairs}/${draft.order.length - 1}` },
            {
              label: '当前顺序',
              value: draft.order.map((id) => historyCards.find((card) => card.id === id)!.year).join(' → '),
            },
          ],
          notes: [
            ...result.conflicts,
            draft.reasoning.trim() ? `我的推理：${draft.reasoning.trim()}` : '尚未选择史料推理。',
            '电动化与智能化可以并行，年代排序不代表单线替代关系。',
          ],
          valid: result.conflicts.length === 0 && draft.reasoning.trim().length >= 10,
        };
      }
      const model = evaluateEnergy(draft);
      return {
        title: `${energyCopy[draft.energy].title}能量路径`,
        summary:
          draft.energy === 'electric'
            ? !draft.power
              ? '供能断开，电机和车轮均停止。'
              : !draft.transmission
                ? '供能接通但传动断开：电机可转，车轮不转。'
                : '供能与传动均接通，电机带动车轮。'
            : '已选择能源方式阅读；切回纯电动完成可控断路实验。',
        metrics: [
          {
            label: '电机',
            value: draft.energy === 'electric' ? (model.motor ? '转动' : '停止') : '此台架未模拟',
          },
          {
            label: '车轮',
            value: draft.energy === 'electric' ? (model.wheels ? '转动' : '停止') : '此台架未模拟',
          },
          { label: '能量路径', value: energyCopy[draft.energy].path },
        ],
        notes: [energyCopy[draft.energy].note, '无惯性教学台架；结果不包含真实车辆的滑行、损耗或效率估算。'],
        valid: draft.energy === 'electric',
      };
    },
    dispose: () => root.remove(),
  };
};
