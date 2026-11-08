import './styles.css';
import { activities, sections } from './catalog';
import { parseRoute, routeHash, type Route } from './routes';
import { appendRun, emptyRecord, loadPortfolio, savePortfolio, validatePortfolio } from './records';
import { createStage } from './stage';
import { createHistoryExperiment } from './activities/history';
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

root.innerHTML = `<div class="learning-app"><a class="skip-link" href="#lesson-title">跳到当前实验</a><header class="lab-header"><a href="#history/H1" class="lab-brand">${mark}<span>智驾探索课堂</span></a><nav aria-label="学习章节">${sections.map((s) => `<a data-section="${s.id}" href="#${s.id}"><span>${s.number}</span>${s.title}</a>`).join('')}<a href="${base}legacy.html#traffic"><span>04</span>安全上路</a></nav><a class="portfolio-link" href="#report">我的学习记录</a></header><main data-learning-view></main><footer class="lab-footer"><span>智驾探索课堂 · 观察有依据，判断有理由</span><span>功能教学模型 · 可反复尝试</span></footer></div>`;
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
function evidenceMarkup(e: Observation) {
  return `<h4>${safe(e.title)}</h4><p>${safe(e.summary)}</p><dl>${e.metrics.map((m) => `<div><dt>${safe(m.label)}</dt><dd>${safe(m.value)}</dd></div>`).join('')}</dl><details><summary>依据与模型边界</summary><ul>${e.notes.map((n) => `<li>${safe(n)}</li>`).join('')}</ul></details>`;
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
    exploded: '分层展开',
    cutaway: '内部观察',
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
  view.innerHTML = `<div class="lesson lesson--${id}"><aside class="lesson-index"><p>${section.short}</p><nav aria-label="当前章节活动">${activities
    .filter((a) => a.section === activity.section)
    .map(
      (a) =>
        `<a href="${routeHash(a.id)}"${a.id === id ? ' aria-current="page"' : ''}><span>${a.id}</span>${a.title}<b aria-label="已记录">${portfolio.records[a.id]?.completed ? '已记录' : ''}</b></a>`,
    )
    .join(
      '',
    )}</nav><div class="learning-cycle"><strong>每一次探索</strong><ol><li>听老师讲解</li><li>写下预测</li><li>改变一个条件</li><li>记录证据，解释变化</li></ol></div></aside><article class="lesson-body"><div class="lesson-heading"><div><h1 id="lesson-title" tabindex="-1">${activity.title}</h1><p>${activity.question}</p></div><span class="lesson-tag">${section.number} / ${section.short}</span></div><details class="teacher-note"><summary>老师讲解 <span>听完后，开始你的独立验证</span></summary><p>${activity.teacher}</p></details><div class="work-area"><section class="model-area" aria-label="三维观察台"><div class="model-toolbar"><span>功能模型 · 拖动旋转，滚轮缩放</span><button type="button" data-camera>重置视角</button></div><div class="model-stage" data-model-stage></div><div class="model-bottom"><span data-model-description>先观察结构，再改变一个条件</span><div><button type="button" data-replay>演示当前状态</button><button type="button" data-quality aria-pressed="false">低配模式</button></div></div></section><aside class="experiment-panel"><h2>动手验证</h2><p class="experiment-instruction">${activity.instruction}</p><section class="prediction-panel"><label for="prediction">先预测</label><p>${activity.predictionPrompt}</p><textarea id="prediction" data-prediction rows="2" maxlength="500" placeholder="我认为……因为……">${safe(record.prediction)}</textarea></section><div class="run-area"><p class="run-hint">每次运行保存一份独立证据，调整后可以再次对照。</p><button type="button" class="primary-button" data-run>运行并记录 <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7 4 7 6-7 6Z" fill="currentColor"/></svg></button><p class="inline-feedback" data-feedback role="status" aria-live="polite"></p></div><div data-experiment-controls></div></aside></div><section class="evidence-section" aria-labelledby="evidence-title"><div class="section-heading"><h2 id="evidence-title">我的观察证据</h2><span data-run-count></span></div><p class="section-intro">保留变化前后的结果。比较时，看看你是否只改变了一个条件。</p><div class="evidence-list" data-evidence></div></section><section class="reflection-section"><div><h2>用证据说明发现</h2><p>${activity.transfer}</p><p class="lab-help">预测不必正确。说明“我改变了什么、观察到了什么”，就是有价值的发现。</p></div><div><label for="explanation">我的解释</label><textarea id="explanation" data-explanation rows="3" maxlength="1000" placeholder="改变……后，我发现……；这说明……">${safe(record.explanation)}</textarea><div class="reflection-actions"><button type="button" data-complete class="secondary-button">保存我的解释</button><span data-saved role="status"></span></div><p data-save-status class="save-status" role="status"></p></div></section><div class="lesson-next">${activities.findIndex((a) => a.id === id) < activities.length - 1 ? `<a href="${routeHash(activities[activities.findIndex((a) => a.id === id) + 1].id)}">继续下一项探索 <span>→</span></a>` : '<a href="#report">整理我的学习记录 <span>→</span></a>'}<button type="button" data-export>导出学习记录</button></div></article></div>`;
  const status = view.querySelector<HTMLElement>('[data-save-status]')!;
  const feedback = view.querySelector<HTMLElement>('[data-feedback]')!;
  const controls = view.querySelector<HTMLElement>('[data-experiment-controls]')!;
  const stage = createStage(view.querySelector<HTMLElement>('[data-model-stage]')!);
  const prediction = view.querySelector<HTMLTextAreaElement>('[data-prediction]')!;
  const explanation = view.querySelector<HTMLTextAreaElement>('[data-explanation]')!;
  let experiment: Experiment | undefined;
  function saveDraft() {
    if (!experiment || disposed) return;
    record = {
      ...record,
      draft: structuredClone(experiment.getDraft()),
      prediction: prediction.value,
      explanation: explanation.value,
    };
    portfolio.records[id] = record;
    persist(status);
  }
  const factory =
    activity.section === 'history'
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
  if (activity.section !== 'history') {
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
  function renderEvidence() {
    view.querySelector('[data-run-count]')!.textContent =
      record.runs.length === 12 ? '保留首次与最近 11 次验证' : `${record.runs.length} 次验证`;
    view.querySelector('[data-evidence]')!.innerHTML = record.runs.length
      ? record.runs
          .map(
            (r, i) =>
              `<article class="evidence-run" data-evidence-run><div class="evidence-run-heading"><strong>观察 ${i + 1}</strong><span>${i === record.runs.length - 1 ? '最近一次' : '保留的证据'}</span></div><p class="evidence-prediction">当时的预测：${safe(r.prediction)}</p>${evidenceMarkup(r.evidence)}<details><summary>当时的实验条件</summary>${conditionsMarkup(r.draft)}</details></article>`,
          )
          .join('')
      : '<div class="evidence-empty"><span>还没有记录</span><p>写下预测，改变一个条件，然后点击“运行并记录”。你的结果会保存在这里。</p></div>';
  }
  renderEvidence();
  if (initial.error) status.textContent = initial.error;
  const listen = (selector: string, type: string, fn: () => void) =>
    view.querySelector(selector)!.addEventListener(type, fn, { signal: abort.signal });
  listen('[data-prediction]', 'input', saveDraft);
  listen('[data-explanation]', 'input', saveDraft);
  listen('[data-run]', 'click', () => {
    if (!prediction.value.trim()) {
      feedback.textContent = '先写下一句预测，再验证你的想法。预测错误也可以继续。';
      prediction.focus();
      return;
    }
    const evidence = experiment!.observe();
    record = appendRun(record, {
      id: crypto.randomUUID(),
      draft: experiment!.getDraft(),
      scene,
      evidence,
      prediction: prediction.value,
    });
    saveDraft();
    renderEvidence();
    stage.replay();
    feedback.textContent = `已记录第 ${record.runs.length} 次观察。${evidence.valid ? '试着只改一个条件，再运行一次作对照。' : '证据已保存；请根据结果补充或调整，再验证。'}`;
  });
  listen('[data-complete]', 'click', () => {
    const saved = view.querySelector<HTMLElement>('[data-saved]')!;
    if (!record.runs.some((r) => r.evidence.valid)) {
      saved.textContent = '先完成一次有效验证，再保存解释。';
      return;
    }
    if (!explanation.value.trim()) {
      saved.textContent = '写下你从证据中发现了什么。';
      explanation.focus();
      return;
    }
    record.completed = true;
    saveDraft();
    saved.textContent = '解释已记入学习档案。你仍可以继续实验。';
  });
  listen('[data-camera]', 'click', () => stage.resetCamera());
  listen('[data-replay]', 'click', () => stage.replay());
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
      return `<section><div><span>${a.id}</span><a href="${routeHash(a.id)}">${a.title}</a><strong>${r?.completed ? '已写下解释' : r?.runs.length ? '已有观察，等待解释' : '尚未记录'}</strong></div><p>${r?.explanation ? safe(r.explanation) : '进入活动，留下自己的预测与观察。'}</p><details><summary>查看 ${r?.runs.length ?? 0} 次证据</summary>${r?.runs.map((e) => `<article class="evidence-run">${evidenceMarkup(e.evidence)}</article>`).join('') ?? ''}</details></section>`;
    })
    .join(
      '',
    )}</div><section class="import-section"><h2>在这台电脑恢复记录</h2><p>选择之前导出的JSON，检查内容后再确认替换。不会与当前记录自动混合。</p><input type="file" accept="application/json,.json" data-import aria-label="选择学习记录文件"><div data-import-preview role="status"></div></section><a href="#history/H1">返回探索课堂</a></article>`;
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
  const id = activities.find((a) => a.id === first)?.id ?? 'H1';
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
