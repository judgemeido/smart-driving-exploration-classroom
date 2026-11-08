import './styles.css';
import { activities, sections } from './catalog';
import { activityChoices } from './choices';
import { parseRoute, routeHash, type Route } from './routes';
import { appendRun, emptyRecord, loadPortfolio, savePortfolio, validatePortfolio } from './records';
import { createStage } from './stage';
import { createHistoryExperiment } from './activities/history';
import { createBatteryExperiment } from './activities/battery';
import { createStructureExperiment } from './activities/structure';
import { createSensorExperiment } from './activities/sensor';
import { mountKnowledge } from './knowledge';
import type { ActivityRecord, Experiment, Observation, SceneSnapshot } from './types';

const root = document.querySelector<HTMLElement>('#app')!;
const initial = loadPortfolio();
let portfolio = initial.portfolio;
let storageProtected = !!initial.error;
let disposeView = () => {};
let current: Route | '' = '';
let setViewActive = (_active: boolean) => {};
const base = import.meta.env.BASE_URL;
const mark = `<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M4 22 10 9h12l6 13M7 17h18M10 24h.01M22 24h.01" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><circle cx="16" cy="8" r="3" fill="currentColor"/></svg>`;
const safe = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

root.innerHTML = `<div class="learning-app"><a class="skip-link" href="#lesson-title">跳到当前实验</a><header class="lab-header"><a href="#battery/B1" class="lab-brand">${mark}<span>智驾探索课堂</span></a><nav aria-label="学习章节">${sections.map((s) => `<a data-section="${s.id}" href="#${s.id}"><span>${s.number}</span>${s.title}</a>`).join('')}<a href="${base}legacy.html#traffic"><span>04</span>安全上路</a></nav><div class="lab-header-links"><a class="museum-link" href="${base}legacy.html#history">原版展馆</a><a class="portfolio-link" href="#report">我的学习记录</a></div></header><main data-learning-view></main><footer class="lab-footer"><span>智驾探索课堂 · 观察有依据，判断有理由</span><span>功能教学模型 · 可反复尝试</span></footer></div>`;
const view = root.querySelector<HTMLElement>('[data-learning-view]')!;
root.querySelector('.skip-link')!.addEventListener('click', (event) => {
  event.preventDefault();
  view.querySelector<HTMLElement>('h1')?.focus();
});

function persist(status?: HTMLElement) {
  const saved = !storageProtected && savePortfolio(portfolio);
  if (status)
    status.textContent = storageProtected
      ? initial.error!
      : saved
        ? '已保存在这台电脑'
        : '暂未保存：浏览器存储不可用，请导出学习记录。';
}
function download() {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(portfolio, null, 2)], { type: 'application/json' }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = '智驾探索课堂-学习记录.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function evidenceMarkup(e: Observation, showNotes = true) {
  return `<h4>${safe(e.title)}</h4><p>${safe(e.summary)}</p><dl>${e.metrics.map((m) => `<div><dt>${safe(m.label)}</dt><dd>${safe(m.value)}</dd></div>`).join('')}</dl>${showNotes ? `<details><summary>依据与模型边界</summary><ul>${e.notes.map((n) => `<li>${safe(n)}</li>`).join('')}</ul></details>` : ''}`;
}
function conditionsMarkup(draft: unknown) {
  if (!draft || typeof draft !== 'object') return '';
  const labels: Record<string, string> = {
    power: '电池供能',
    transmission: '传动连接',
    energy: '能源方式',
    selected: '观察对象',
    sensor: '感知设备',
    distance: '目标前表面距离（米）',
    angle: '光束偏转（度）',
    occluded: '近处遮挡',
    weather: '天气',
    fault: '链路断点',
    rule: '控制规则',
    batteryType: '电池类型',
    flow: '充放电状态',
  };
  const values: Record<string, string> = {
    electric: '纯电动',
    fuel: '燃油',
    hybrid: '混合动力',
    camera: '摄像头',
    radar: '毫米波雷达',
    lidar: '激光雷达',
    clear: '晴朗',
    rain: '轻雨',
    fog: '浓雾',
    none: '全部连通',
    input: '输入链路',
    compute: '计算链路',
    actuator: '执行链路',
    yield: '有人或不明时停车，确认清空再通行',
    park: '始终停车',
    'always-go': '始终通行',
    battery: '动力电池',
    motor: '驱动电机',
    transmission: '传动系统',
    computer: '计算单元',
    sensor: '传感器',
    brake: '制动系统',
    target: '目标表面',
    'lead-acid': '铅酸电池',
    nimh: '镍氢电池',
    lfp: '磷酸铁锂电池',
    nmc: '三元锂电池',
    rest: '断开电路',
    charge: '充电器向电池补能',
    discharge: '电池向用电器供能',
  };
  return `<dl>${Object.entries(draft)
    .filter(([key]) => key in labels)
    .map(
      ([key, value]) =>
        `<div><dt>${labels[key]}</dt><dd>${safe(typeof value === 'boolean' ? (value ? '是 / 接通' : '否 / 断开') : (values[String(value)] ?? String(value)))}</dd></div>`,
    )
    .join('')}</dl>`;
}
function mountLesson(id: Exclude<Route, 'traffic' | 'report' | 'Q1' | 'Q2'>) {
  const activity = activities.find((a) => a.id === id)!;
  const section = sections.find((s) => s.id === activity.section)!;
  let record: ActivityRecord = portfolio.records[id] ?? emptyRecord();
  let scene: SceneSnapshot = { kind: 'vehicle' };
  let disposed = false;
  const abort = new AbortController();
  const choices = activityChoices[id];
  const choiceMarkup = (
    kind: 'prediction' | 'explanation',
    legend: string,
    options: string[],
    previous: string,
  ) =>
    `<fieldset class="choice-group" data-${kind}><legend>${legend}</legend>${options.map((label, index) => `<label class="choice-option"><input type="radio" name="${kind}" value="${index}"${previous === label ? ' checked' : ''}><span>${safe(label)}</span></label>`).join('')}</fieldset>${previous && !options.includes(previous) ? `<details class="previous-response"><summary>查看之前保存的文字记录</summary><p>${safe(previous)}</p></details>` : ''}`;
  view.innerHTML = `<div class="lesson lesson--${id}"><aside class="lesson-index"><p>${section.short}</p><nav aria-label="当前章节活动">${activities
    .filter((a) => a.section === activity.section)
    .map(
      (a) =>
        `<a href="${routeHash(a.id)}"${a.id === id ? ' aria-current="page"' : ''}><span>${a.id}</span>${a.title}<b aria-label="已记录">${portfolio.records[a.id]?.completed ? '已记录' : ''}</b></a>`,
    )
    .join(
      '',
    )}</nav><div class="learning-cycle"><strong>每一次探索</strong><ol><li>听老师讲解</li><li>点击选择预测</li><li>改变一个条件</li><li>对照证据，选择发现</li></ol></div></aside><article class="lesson-body">
    <div class="lesson-heading"><div><h1 id="lesson-title" tabindex="-1">${activity.title}</h1><p>${activity.question}</p></div><span class="lesson-tag">${section.number} / ${section.short}</span></div>
    <details class="teacher-note"><summary>老师讲解 <span>听完后，开始你的独立验证</span></summary><p>${activity.teacher}</p></details>
    <div class="work-area"><section class="model-area" aria-label="三维观察台"><div class="model-stage" data-model-stage></div><div class="model-bottom"><span data-model-description>拖动旋转 · 点击部件拆解</span><div><button type="button" data-expand aria-pressed="false">放大观察</button><button type="button" data-camera>重置视角</button><button type="button" data-replay>演示当前状态</button><button type="button" data-quality aria-pressed="false">低配模式</button></div></div></section>
    <aside class="lesson-workbench" aria-label="探索工作台"><nav class="lesson-steps" aria-label="探索步骤">${(['prediction', 'experiment', 'evidence', 'reflection'] as const).map((step, i) => `<button type="button" data-step="${step}" aria-controls="step-${step}"${i === 0 ? ' aria-current="step"' : ''}><span aria-hidden="true">${i + 1}</span> ${['预测', '操作', '证据', '发现'][i]}</button>`).join('')}</nav><div class="lesson-panels">
    <section id="step-prediction" class="step-panel" data-panel="prediction" aria-label="选择预测"><div class="prediction-panel"><h2>先选一个预测</h2><p>${activity.predictionPrompt}</p>${choiceMarkup('prediction', '你认为会怎样？', choices.predictions, record.prediction)}<p class="lab-help">先选你的想法，再用实验验证。预测不必正确。</p></div><div class="step-actions"><button type="button" class="primary-button" data-go="experiment">选好了，去操作 →</button></div></section>
    <section id="step-experiment" class="step-panel experiment-panel" data-panel="experiment" aria-label="动手操作" hidden><h2 class="visually-hidden">动手验证</h2><p class="experiment-instruction">${activity.instruction}</p><div data-experiment-controls></div><div class="run-area"><button type="button" class="primary-button" data-run>运行并记录 <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7 4 7 6-7 6Z" fill="currentColor"/></svg></button><p class="inline-feedback" data-feedback role="status" aria-live="polite"></p></div></section>
    <section id="step-evidence" class="step-panel evidence-section" data-panel="evidence" aria-label="查看证据" hidden><div class="section-heading"><h2 id="evidence-title">我的观察证据</h2><span data-run-count></span></div><div class="evidence-list" data-evidence></div><div class="step-actions"><button type="button" class="secondary-button" data-go="experiment">再改一个条件</button><button type="button" class="primary-button" data-go="reflection">选择我的发现 →</button></div></section>
    <section id="step-reflection" class="step-panel reflection-section" data-panel="reflection" aria-label="选择发现" hidden><div><h2>用证据选择发现</h2><p>${activity.transfer}</p></div><div>${choiceMarkup('explanation', '选择与你的观察相符的一项', choices.findings, record.explanation)}<div class="reflection-actions"><button type="button" data-complete class="primary-button">保存我的发现</button><span data-saved role="status"></span></div><p class="lab-help">只记录你的选择；是否支持这项发现，还要回看实际证据。</p></div></section>
    </div></aside></div><div class="lesson-next">${activities.findIndex((a) => a.id === id) < activities.length - 1 ? `<a href="${routeHash(activities[activities.findIndex((a) => a.id === id) + 1].id)}">继续下一项探索 <span>→</span></a>` : '<a href="#report">整理我的学习记录 <span>→</span></a>'}<span data-save-status class="save-status" role="status"></span><button type="button" data-export>导出学习记录</button></div></article></div>`;
  const status = view.querySelector<HTMLElement>('[data-save-status]')!;
  const feedback = view.querySelector<HTMLElement>('[data-feedback]')!;
  const controls = view.querySelector<HTMLElement>('[data-experiment-controls]')!;
  const stage = createStage(
    view.querySelector<HTMLElement>('[data-model-stage]')!,
    (part) => experiment?.selectPart?.(part),
    (presentation) => experiment?.setPresentation?.(presentation),
  );
  const prediction = view.querySelector<HTMLFieldSetElement>('[data-prediction]')!;
  const explanation = view.querySelector<HTMLFieldSetElement>('[data-explanation]')!;
  const selectedChoice = (field: HTMLElement, options: string[]) => {
    const checked = field.querySelector<HTMLInputElement>('input:checked');
    return checked ? options[Number(checked.value)] : '';
  };
  function showStep(step: string, focus = false) {
    if (step === 'experiment') feedback.textContent = '';
    view.querySelectorAll<HTMLElement>('[data-panel]').forEach((panel) => {
      panel.hidden = panel.dataset.panel !== step;
      if (!panel.hidden) panel.scrollTop = 0;
    });
    view.querySelectorAll<HTMLButtonElement>('[data-step]').forEach((button) => {
      if (button.dataset.step === step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    if (focus) view.querySelector<HTMLElement>(`[data-step="${step}"]`)?.focus({ preventScroll: true });
  }
  view
    .querySelectorAll<HTMLButtonElement>('[data-step],[data-go]')
    .forEach((button) =>
      button.addEventListener(
        'click',
        () => showStep(button.dataset.step ?? button.dataset.go!, !!button.dataset.go),
        { signal: abort.signal },
      ),
    );
  let experiment: Experiment | undefined;
  function saveDraft() {
    if (!experiment || disposed) return;
    record = {
      ...record,
      draft: structuredClone(experiment.getDraft()),
      prediction: selectedChoice(prediction, choices.predictions) || record.prediction,
      explanation: selectedChoice(explanation, choices.findings) || record.explanation,
    };
    portfolio.records[id] = record;
    persist(status);
  }
  const factory =
    activity.section === 'battery'
      ? createBatteryExperiment
      : activity.section === 'history'
      ? createHistoryExperiment
      : activity.section === 'explore'
        ? createStructureExperiment
        : createSensorExperiment;
  experiment = factory(controls, {
    activityId: id,
    initialDraft: record.draft,
    setScene(snapshot) {
      scene = structuredClone(snapshot);
      stage.setSnapshot(scene);
    },
    onChange: saveDraft,
  });
  if (activity.section === 'explore' || activity.section === 'lidar') {
    const quiz = document.createElement('a');
    quiz.href = routeHash(activity.section === 'explore' ? 'Q1' : 'Q2');
    quiz.textContent = '课堂知识交流 · 3 道问题';
    quiz.className = 'lesson-quiz-link';
    view.querySelector('.lesson-index')!.append(quiz);
  }
  if (id === 'E2' || id === 'S3') {
    const next = view.querySelector<HTMLAnchorElement>('.lesson-next > a')!;
    next.href = routeHash(id === 'E2' ? 'Q1' : 'Q2');
    next.textContent = '进入课堂知识交流 →';
  }
  let evidenceIndex = Math.max(0, record.runs.length - 1);
  function renderEvidence() {
    view.querySelector('[data-run-count]')!.textContent =
      record.runs.length === 12 ? '保留首次与最近 11 次验证' : `${record.runs.length} 次验证`;
    evidenceIndex = Math.min(evidenceIndex, Math.max(0, record.runs.length - 1));
    const r = record.runs[evidenceIndex];
    view.querySelector('[data-evidence]')!.innerHTML = r
      ? `<nav class="evidence-navigation" aria-label="切换观察记录"><button type="button" class="lab-inline-action" data-evidence-index="0"${evidenceIndex === 0 ? ' disabled' : ''}>首次</button><button type="button" class="lab-inline-action" data-evidence-index="${evidenceIndex - 1}"${evidenceIndex === 0 ? ' disabled' : ''}>上一次</button><span>${evidenceIndex + 1} / ${record.runs.length}</span><button type="button" class="lab-inline-action" data-evidence-index="${evidenceIndex + 1}"${evidenceIndex === record.runs.length - 1 ? ' disabled' : ''}>下一次</button><button type="button" class="lab-inline-action" data-evidence-index="${record.runs.length - 1}"${evidenceIndex === record.runs.length - 1 ? ' disabled' : ''}>最新</button></nav><article class="evidence-run" data-evidence-run><h3 class="visually-hidden">观察 ${evidenceIndex + 1}</h3>${evidenceMarkup(r.evidence, false)}<details><summary>预测、条件与模型说明</summary><p class="evidence-prediction">当时的预测：${safe(r.prediction)}</p>${conditionsMarkup(r.draft)}<ul>${r.evidence.notes.map((note) => `<li>${safe(note)}</li>`).join('')}</ul></details>${evidenceIndex > 0 ? `<details class="evidence-baseline"><summary>与第一次观察对照</summary>${evidenceMarkup(record.runs[0].evidence)}${conditionsMarkup(record.runs[0].draft)}</details>` : ''}</article>`
      : '<div class="evidence-empty"><span>还没有记录</span><p>点击选择预测，改变一个条件，再点击“运行并记录”。</p></div>';
  }
  view.querySelector('[data-evidence]')!.addEventListener(
    'click',
    (event) => {
      const button =
        event.target instanceof Element
          ? event.target.closest<HTMLButtonElement>('[data-evidence-index]')
          : null;
      if (!button || button.disabled) return;
      const label = button.textContent;
      evidenceIndex = Number(button.dataset.evidenceIndex);
      renderEvidence();
      const replacement = Array.from(view.querySelectorAll<HTMLButtonElement>('[data-evidence-index]')).find(
        (item) => item.textContent === label,
      );
      if (replacement && !replacement.disabled) replacement.focus({ preventScroll: true });
      else
        view
          .querySelector<HTMLButtonElement>('[data-evidence-index]:not(:disabled)')
          ?.focus({ preventScroll: true });
    },
    { signal: abort.signal },
  );
  renderEvidence();
  if (initial.error) status.textContent = initial.error;
  const listen = (selector: string, type: string, fn: () => void) =>
    view.querySelector(selector)!.addEventListener(type, fn, { signal: abort.signal });
  listen('[data-prediction]', 'change', saveDraft);
  listen('[data-explanation]', 'change', saveDraft);
  listen('[data-run]', 'click', () => {
    const selected = selectedChoice(prediction, choices.predictions);
    if (!selected) {
      status.textContent = '先点击选择一个预测，再验证你的想法。';
      showStep('prediction');
      prediction.querySelector<HTMLInputElement>('input')!.focus({ preventScroll: true });
      return;
    }
    const evidence = experiment!.observe();
    record = appendRun(record, {
      id: crypto.randomUUID(),
      draft: experiment!.getDraft(),
      scene: { ...scene, ...stage.getPresentation() },
      evidence,
      prediction: selected,
    });
    evidenceIndex = record.runs.length - 1;
    saveDraft();
    renderEvidence();
    stage.replay();
    feedback.textContent = `已记录第 ${record.runs.length} 次观察。${evidence.valid ? '试着只改一个条件，再运行一次作对照。' : '证据已保存；请根据结果补充或调整，再验证。'}`;
    showStep('evidence', true);
  });
  listen('[data-complete]', 'click', () => {
    const saved = view.querySelector<HTMLElement>('[data-saved]')!;
    if (!record.runs.some((r) => r.evidence.valid)) {
      saved.textContent = '先完成一次有效验证，再保存发现。';
      return;
    }
    if (!selectedChoice(explanation, choices.findings)) {
      saved.textContent = '请点击选择一项与观察证据相符的发现。';
      explanation.querySelector<HTMLInputElement>('input')!.focus({ preventScroll: true });
      return;
    }
    record.completed = true;
    saveDraft();
    saved.textContent = '发现已记入学习档案，可以继续验证。';
  });
  listen('[data-camera]', 'click', () => stage.resetCamera());
  const modelArea = view.querySelector<HTMLElement>('.model-area')!;
  const expandButton = view.querySelector<HTMLButtonElement>('[data-expand]')!;
  listen('[data-expand]', 'click', () => {
    const change =
      document.fullscreenElement === modelArea ? document.exitFullscreen() : modelArea.requestFullscreen();
    void change.catch(() => {
      status.textContent = '浏览器未能放大观察，可使用滚轮放大模型。';
    });
  });
  document.addEventListener(
    'fullscreenchange',
    () => {
      const expanded = document.fullscreenElement === modelArea;
      expandButton.textContent = expanded ? '返回课堂' : '放大观察';
      expandButton.setAttribute('aria-pressed', String(expanded));
    },
    { signal: abort.signal },
  );
  listen('[data-replay]', 'click', () => {
    if (experiment?.demonstrate) experiment.demonstrate();
    else stage.replay();
  });
  listen('[data-quality]', 'click', () => {
    const button = view.querySelector<HTMLButtonElement>('[data-quality]')!;
    const low = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', String(low));
    button.textContent = low ? '已用低配模式' : '低配模式';
    stage.setQuality(low);
  });
  listen('[data-export]', 'click', download);
  const visibility = () => stage.setActive(document.visibilityState !== 'hidden');
  document.addEventListener('visibilitychange', visibility, { signal: abort.signal });
  visibility();
  setViewActive = (active) => stage.setActive(active);
  disposeView = () => {
    if (document.fullscreenElement === modelArea) void document.exitFullscreen().catch(() => {});
    saveDraft();
    disposed = true;
    abort.abort();
    experiment?.dispose();
    stage.dispose();
  };
}
function mountReport() {
  view.innerHTML = `<article class="report-page"><div class="lesson-heading"><div><h1 id="lesson-title">我的学习记录</h1><p>把操作变成证据，把证据连成解释。</p></div><button type="button" class="primary-button" data-export>导出学习记录</button></div><p class="lab-note">记录保存在当前浏览器。换电脑前请导出；这里没有整班排名。旧活动成绩保留在原存储中，不转换成学习完成。</p><div class="report-list">${activities
    .map((a) => {
      const r = portfolio.records[a.id];
      return `<section><div><span>${a.id}</span><a href="${routeHash(a.id)}">${a.title}</a><strong>${r?.completed ? '已保存发现' : r?.runs.length ? '已有观察，等待选择发现' : '尚未记录'}</strong></div><p>${r?.explanation ? safe(r.explanation) : '进入活动，点击选择预测并留下观察。'}</p><details><summary>查看 ${r?.runs.length ?? 0} 次证据</summary>${r?.runs.map((e) => `<article class="evidence-run">${evidenceMarkup(e.evidence)}</article>`).join('') ?? ''}</details></section>`;
    })
    .join(
      '',
    )}</div><section class="import-section"><h2>在这台电脑恢复记录</h2><p>选择之前导出的JSON，检查内容后再确认替换。不会与当前记录自动混合。</p><input type="file" accept="application/json,.json" data-import aria-label="选择学习记录文件"><div data-import-preview role="status"></div></section><a href="#battery/B1">返回探索课堂</a></article>`;
  const abort = new AbortController();
  view.querySelector('[data-export]')!.addEventListener('click', download, { signal: abort.signal });
  view.querySelector('[data-import]')!.addEventListener(
    'change',
    async (event) => {
      const input = event.target as HTMLInputElement;
      const file = input.files?.[0];
      const preview = view.querySelector<HTMLElement>('[data-import-preview]')!;
      if (!file) return;
      try {
        if (file.size > 2_000_000) throw new Error('large');
        const value: unknown = JSON.parse(await file.text());
        if (!validatePortfolio(value)) throw new Error('schema');
        if (abort.signal.aborted) return;
        preview.textContent = `文件有效，含 ${Object.keys(value.records).length} 项活动记录。确认后将替换当前学习记录。`;
        const button = document.createElement('button');
        button.className = 'secondary-button';
        button.textContent = '确认恢复这些记录';
        button.addEventListener(
          'click',
          () => {
            portfolio = structuredClone(value);
            storageProtected = false;
            persist();
            mountReport();
          },
          { once: true, signal: abort.signal },
        );
        preview.append(button);
      } catch {
        if (!abort.signal.aborted)
          preview.textContent = '文件无法读取或版本不兼容。请重新选择导出的学习记录，当前记录未改变。';
      }
    },
    { signal: abort.signal },
  );
  disposeView = () => abort.abort();
}
function navigate() {
  const route = parseRoute(location.hash);
  if (route === current) return;
  disposeView();
  current = route;
  if (route === 'traffic') {
    location.replace(`${base}legacy.html#traffic`);
    return;
  }
  setViewActive = () => {};
  if (route === 'report') mountReport();
  else if (route === 'Q1' || route === 'Q2') {
    view.innerHTML = '<article class="report-page" data-knowledge-host></article>';
    const quiz = mountKnowledge(view.querySelector<HTMLElement>('[data-knowledge-host]')!, route);
    disposeView = () => quiz.dispose();
  } else mountLesson(route);
  const section = activities.find((a) => a.id === route)?.section;
  root.querySelectorAll<HTMLAnchorElement>('[data-section]').forEach((a) => {
    if (a.dataset.section === section) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  document.title = `${activities.find((a) => a.id === route)?.title ?? (route === 'Q1' || route === 'Q2' ? '课堂知识交流' : '我的学习记录')} · 智驾探索课堂`;
  window.scrollTo(0, 0);
}
if (!location.hash) {
  const first = document.body.dataset.initialActivity;
  const id = activities.find((a) => a.id === first)?.id ?? 'B1';
  history.replaceState(null, '', routeHash(id));
}
window.addEventListener('hashchange', navigate);
window.addEventListener('pagehide', (event) => {
  if ((event as PageTransitionEvent).persisted) setViewActive(false);
  else disposeView();
});
window.addEventListener('pageshow', () => setViewActive(document.visibilityState !== 'hidden'));
navigate();
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    disposeView();
    window.removeEventListener('hashchange', navigate);
  });
