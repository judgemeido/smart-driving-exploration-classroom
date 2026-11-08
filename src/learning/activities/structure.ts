import type { ExperimentFactory, Observation } from '../types';
import { inspectPart, parseStructureDraft, parts, runChain, type Fault } from './structure-state';

export const createStructureExperiment: ExperimentFactory = (host, context) => {
  const isChain = context.activityId === 'E2';
  let state = parseStructureDraft(
    context.initialDraft ?? (isChain ? { exploded: true, cutaway: true } : null),
  );
  let repairNote = '';
  const abort = new AbortController();
  const faultLabels: Record<Fault, string> = {
    none: '全部连通',
    input: '输入链路',
    compute: '计算链路',
    actuator: '执行链路',
  };
  const word = (value: string | null) =>
    value === 'pedestrian'
      ? '检测到行人'
      : value === 'clear'
        ? '检测区域清空'
        : value === 'uncertain'
          ? '证据不确定（没有收到输入）'
          : value === 'stop'
            ? '停车'
            : value === 'go'
              ? '通行'
              : '无输出';
  const scene = () => {
    const result = runChain(state);
    context.setScene({
      kind: 'vehicle',
      power: state.power,
      transmission: state.transmission,
      exploded: state.exploded,
      cutaway: state.cutaway,
      selected: state.selected,
      fault: isChain ? state.fault : 'none',
      chainStep: isChain ? state.step : undefined,
      chainCommand: isChain ? result.frames[0].command !== null : undefined,
      chainExecuted: isChain ? result.frames[0].execution !== null : undefined,
      running: isChain ? state.step === 3 && result.frames[1].execution === 'go' : state.power,
    });
  };
  const option = (value: string, label: string, selected: string) =>
    `<option value="${value}"${value === selected ? ' selected' : ''}>${label}</option>`;
  const checkbox = (key: string, label: string, checked: boolean) =>
    `<label class="lab-option"><input type="checkbox" data-field="${key}"${checked ? ' checked' : ''}> ${label}</label>`;
  function render() {
    const active = document.activeElement;
    const focused =
      active instanceof HTMLElement && host.contains(active)
        ? {
            field: active.dataset.field,
            action: active.dataset.action,
            summary: active.tagName === 'SUMMARY',
          }
        : null;
    const detailsOpen = host.querySelector<HTMLDetailsElement>('details')?.open ?? false;
    const partsMarkup = `<div class="lab-control-group">
      <label class="lab-label" for="structure-part">定位部件</label>
      <select class="lab-select" id="structure-part" data-field="selected">${Object.entries(parts)
        .map(([key, label]) => option(key, label, state.selected))
        .join('')}</select>
      <p class="lab-help">模型高亮选中的部件。选择名称，再追踪它和其他部件的连接。</p>
      <div class="lab-options">${checkbox('exploded', '分层展开', state.exploded)}${checkbox('cutaway', '打开壳体 / 剖切观察', state.cutaway)}</div>
      <p class="lab-note">壳体开合只改变观察方式，不切断电源或传动。</p>
      <div class="lab-options">${checkbox('power', '接通电源', state.power)}${checkbox('transmission', '接通传动', state.transmission)}</div>
      <p class="lab-source">${inspectPart(state.selected, state.power, state.transmission)}</p>
    </div>`;
    host.innerHTML = isChain
      ? `${chainMarkup()}<details${detailsOpen ? ' open' : ''}><summary class="lab-label">查看部件与供能（选做）</summary>${partsMarkup}</details>`
      : `${partsMarkup}<div class="lab-note"><strong>追踪两条路径</strong><p>能量：电池 → 电机 → 传动 → 车轮。</p><p>信息：传感器 → 计算单元 → 电机 / 制动。</p><p>试着只断开传动，观察“电机有动力”和“车轮能前进”的区别。</p></div>`;
    if (focused) {
      const controls = Array.from(host.querySelectorAll<HTMLElement>('[data-field], [data-action], summary'));
      const replacement = controls.find((control) =>
        focused.field
          ? control.dataset.field === focused.field
          : focused.action
            ? control.dataset.action === focused.action
            : focused.summary && control.tagName === 'SUMMARY',
      );
      // A successful repair temporarily disables its button until the next check.
      // Keep the keyboard at the next useful action rather than on the document body.
      const destination =
        replacement instanceof HTMLButtonElement && replacement.disabled
          ? host.querySelector<HTMLElement>('[data-action="step"]')
          : replacement;
      destination?.focus({ preventScroll: true });
    }
    scene();
  }
  function chainMarkup() {
    const result = runChain(state);
    const stages = ['准备检查', '已检查输入', '已检查计算', '已检查执行'];
    return `<div class="lab-control-group">
      <p class="lab-label">两帧验证任务：先礼让，再通行</p>
      <p class="lab-help">相同场景依次出现“行人经过 → 检测区域清空”。控制器只能读取传感证据。成功需要第一帧停车、第二帧通行。</p>
      <label class="lab-label" for="structure-fault">设置链路断点</label>
      <select class="lab-select" id="structure-fault" data-field="fault">${(Object.keys(faultLabels) as Fault[]).map((k) => option(k, faultLabels[k], state.fault)).join('')}</select>
      <label class="lab-label" for="structure-rule">控制规则</label>
      <select class="lab-select" id="structure-rule" data-field="rule">${option('yield', '有行人或证据不明时停车；确认清空后通行', state.rule)}${option('park', '始终停车', state.rule)}${option('always-go', '始终通行（错误规则对照）', state.rule)}</select>
      <p class="lab-help">断开输入：没有证据。断开计算：不产生命令。断开执行：命令无法落实。车辆初始静止；无执行反馈不能当作已验证的制动。</p>
      <div class="lab-options"><button type="button" class="lab-inline-action" data-action="step">${state.step < 3 ? `检查下一环：${['输入', '计算', '执行'][state.step]}` : '从输入重新检查'}</button><span role="status">${stages[state.step]}</span></div>
      <div class="lab-list">${result.frames.map((f, i) => `<div class="lab-row"><strong>第 ${i + 1} 帧</strong><p>传感证据：${state.step >= 1 ? word(f.evidence) : '尚未检查'}</p><p>计算命令：${state.step >= 2 ? word(f.command) : '尚未检查'}</p><p>执行反馈：${state.step >= 3 ? word(f.execution) : '尚未检查'}</p></div>`).join('')}</div>
      <label class="lab-label" for="structure-diagnosis">根据证据，选择要修复的一处链路</label>
      <select class="lab-select" id="structure-diagnosis" data-field="diagnosis">${option('none', '先选择诊断', state.diagnosis)}${(['input', 'compute', 'actuator'] as Fault[]).map((k) => option(k, faultLabels[k], state.diagnosis)).join('')}</select>
      <button type="button" class="lab-inline-action" data-action="repair"${state.diagnosis === 'none' || state.step < 3 ? ' disabled' : ''}>只修复这一处，再用相同两帧重测</button>
      <p class="lab-note" role="status">${repairNote || '先检查三环证据，再选择修复点。修复保留场景、控制规则、电源与传动条件。点击页面“运行”记录完整两帧证据。'}</p>
    </div>`;
  }
  function changed(reset = true) {
    if (reset) state.step = 0;
    render();
    context.onChange();
  }
  host.addEventListener(
    'change',
    (event) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement || input instanceof HTMLSelectElement)) return;
      const field = input.dataset.field;
      if (!field) return;
      const value = input instanceof HTMLInputElement ? input.checked : input.value;
      state = parseStructureDraft({ ...state, [field]: value });
      repairNote = '';
      changed(!['diagnosis', 'selected', 'exploded', 'cutaway'].includes(field));
    },
    { signal: abort.signal },
  );
  host.addEventListener(
    'click',
    (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const action = target.closest<HTMLButtonElement>('button[data-action]')?.dataset.action;
      if (action === 'step') {
        state.step = (state.step + 1) % 4;
        changed(false);
      }
      if (action === 'repair' && state.step === 3 && state.diagnosis !== 'none') {
        if (state.fault === state.diagnosis) state.fault = 'none';
        repairNote = `已检查并接通${faultLabels[state.diagnosis]}。请重测，看证据链是否恢复；若输出仍缺失，重新诊断。`;
        changed();
      }
    },
    { signal: abort.signal },
  );
  render();
  return {
    getDraft: () => ({ ...state }),
    observe(): Observation {
      if (!isChain)
        return {
          title: `${parts[state.selected]}：功能与连接`,
          summary: inspectPart(state.selected, state.power, state.transmission),
          metrics: [
            { label: '观察部件', value: parts[state.selected] },
            { label: '电源', value: state.power ? '接通' : '断开' },
            { label: '传动', value: state.transmission ? '接通' : '断开' },
            { label: '车轮驱动', value: state.power ? '能量路径连通' : '驱动路径中断' },
            {
              label: '视图',
              value: `${state.exploded ? '分层展开' : '整体'} / ${state.cutaway ? '壳体打开' : '壳体闭合'}`,
            },
          ],
          notes: [
            '教学模型表达部件位置与因果连接，不代表量产车的精确尺寸或内部布局。',
            '改变视图不会改变功能；电源和传动连接才会改变驱动路径。',
          ],
          valid: true,
        };
      state.step = 3;
      render();
      context.onChange();
      const result = runChain(state);
      return {
        title: '输入 → 计算 → 执行：两帧验证',
        summary: result.completed
          ? '先停车礼让，证据确认清空后通行：安全与任务均完成。'
          : '本次验证已产生可分析证据。请分别检查安全响应和任务进展，定位最先缺失的输出。',
        metrics: [
          ...result.frames.flatMap((f, i) => [
            { label: `第${i + 1}帧 · 输入`, value: word(f.evidence) },
            { label: `第${i + 1}帧 · 命令`, value: word(f.command) },
            { label: `第${i + 1}帧 · 执行`, value: word(f.execution) },
          ]),
          {
            label: '安全响应',
            value: result.safe ? '已验证：行人阶段执行停车' : '未通过：未验证有效停车响应',
          },
          {
            label: '任务完成',
            value: result.completed ? '完成：礼让后通行' : '未完成：尚未形成完整礼让与通行',
          },
        ],
        notes: [
          '输入缺失时只能判断证据不确定，不能把“没有收到行人信号”当作“确认没有行人”。',
          '始终停车可以避免通行，却不能完成清空后的通行任务；有命令也不等于已执行。',
          '修复时保持两帧顺序、规则、电源和传动条件相同，再比较前后证据。',
        ],
        valid: true,
      };
    },
    dispose() {
      abort.abort();
      host.replaceChildren();
    },
  };
};
