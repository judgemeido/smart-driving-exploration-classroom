import './knowledge.css';
import {
  freshKnowledge,
  knowledgeQuestions,
  restoreKnowledge,
  submitKnowledge,
  updateAnswer,
  type KnowledgeId,
} from './knowledge-state';
export function mountKnowledge(host: HTMLElement, id: KnowledgeId): { dispose(): void } {
  const key = 'science-learning:knowledge:v1';
  let raw: string | null = null;
  let unavailable = false;
  try {
    raw = localStorage.getItem(key);
  } catch {
    unavailable = true;
  }
  const restored = restoreKnowledge(raw);
  const data = restored.data;
  let record = data.records[id] ?? freshKnowledge();
  let message = restored.protected
    ? '原记录损坏或来自较新版本，已只读保护。本轮可继续，但不会覆盖原记录，请导出本轮。'
    : unavailable
      ? '无法访问本机存储，本轮尚未保存。请导出本轮。'
      : '草稿保存在当前浏览器；提交后保留首次结果。';
  const abort = new AbortController();
  const root = document.createElement('section');
  root.className = 'knowledge-page';
  host.append(root);
  const text = (tag: string, content: string, className?: string) => {
    const el = document.createElement(tag);
    el.textContent = content;
    if (className) el.className = className;
    return el;
  };
  function persist() {
    data.records[id] = record;
    if (restored.protected || unavailable) return;
    try {
      localStorage.setItem(key, JSON.stringify(data));
      message = '已保存到当前浏览器。首次提交、讲评和后续修正分别保留。';
    } catch {
      message = '本轮尚未保存：本机存储空间不足或写入被阻止。请导出本轮。';
    }
  }
  function button(label: string, action: () => void) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.addEventListener('click', action, { signal: abort.signal });
    return b;
  }
  function render(focusId?: string) {
    root.replaceChildren();
    root.append(
      text('h1', id === 'Q1' ? '用证据解释汽车怎样协作' : '用证据判断传感信息'),
      text('p', '老师口头组织交流，每人在本机独立作答。共3题，每题1分；没有计时或排名。', 'knowledge-intro'),
    );
    const status = text('p', message, 'knowledge-status');
    status.setAttribute('role', 'status');
    root.append(status);
    knowledgeQuestions[id].forEach((q, i) => {
      const field = document.createElement('fieldset');
      field.className = 'knowledge-question';
      const legend = document.createElement('legend');
      legend.textContent = `${i + 1}. ${q.prompt}`;
      field.append(legend);
      q.options.forEach((label, a) => {
        const wrapper = document.createElement('label');
        wrapper.className = 'knowledge-choice';
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = `knowledge-${id}-${i}`;
        input.id = `knowledge-${id}-${i}-${a}`;
        input.value = String(a);
        input.checked = record.answers[i] === a;
        input.disabled = !!record.submitted;
        input.addEventListener(
          'change',
          () => {
            record = updateAnswer(record, i, a);
            persist();
            status.textContent = message;
          },
          { signal: abort.signal },
        );
        wrapper.append(input, document.createTextNode(label));
        field.append(wrapper);
      });
      if (record.reviewed)
        field.append(
          text('p', `讲评：${q.explanation} 正确选项：${q.options[q.correct]}`, 'knowledge-explanation'),
        );
      root.append(field);
    });
    const actions = document.createElement('div');
    actions.className = 'knowledge-actions';
    if (!record.submitted) {
      const submit = button('提交首次作答', () => {
        if (record.answers.some((a) => a === null)) {
          status.textContent = '还有题目未选择。请完成3题后再提交。';
          root
            .querySelector<HTMLInputElement>(
              `input[name="knowledge-${id}-${record.answers.findIndex((a) => a === null)}"]`,
            )
            ?.focus();
          return;
        }
        record = submitKnowledge(id, record);
        persist();
        render('knowledge-review');
      });
      actions.append(submit);
    } else {
      root.append(
        text(
          'p',
          `首次作答已提交 · ${record.submitted.score} / 3 分。首次答案与分数已锁定。`,
          'knowledge-result',
        ),
      );
      if (!record.reviewed) {
        const review = button('主动查看讲评', () => {
          record = { ...record, reviewed: true };
          persist();
          render('knowledge-correction');
        });
        review.id = 'knowledge-review';
        actions.append(review);
      } else {
        const label = document.createElement('label');
        label.className = 'knowledge-correction';
        label.htmlFor = 'knowledge-correction';
        label.append(text('span', '讲评后的修正：哪条证据改变了你的想法？（独立保存，不改首次成绩）'));
        const correction = document.createElement('textarea');
        correction.id = 'knowledge-correction';
        correction.rows = 4;
        correction.maxLength = 2000;
        correction.value = record.correction;
        correction.addEventListener(
          'input',
          () => {
            record = { ...record, correction: correction.value };
            persist();
            status.textContent = message;
          },
          { signal: abort.signal },
        );
        label.append(correction);
        root.append(label);
      }
    }
    actions.append(
      button('导出本轮', () => {
        const blob = new Blob([JSON.stringify({ version: 1, activity: id, record }, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `knowledge-${id}.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }),
    );
    const next = document.createElement('a');
    next.href = id === 'Q1' ? '#lidar/S1' : '#report';
    next.textContent = id === 'Q1' ? '进入感知世界 →' : '查看学习报告 →';
    actions.append(next);
    root.append(actions);
    if (focusId) root.querySelector<HTMLElement>(`#${focusId}`)?.focus();
  }
  render();
  return {
    dispose() {
      abort.abort();
      root.remove();
    },
  };
}
