import { evaluateChoice, type ChoiceQuestion } from '../../shared/learning-assessment';
import { exploreReviewQuestions } from './learning-data';
import { teachingAssemblyGroups, type AssemblyReturnState } from './assembly-state';

function element<K extends keyof HTMLElementTagNameMap>(tag: K, copy?: string, className?: string) {
  const node = document.createElement(tag);
  if (copy !== undefined) node.textContent = copy;
  if (className) node.className = className;
  return node;
}
function button(copy: string, attribute: string, value = '') {
  const node = element('button', copy);
  node.type = 'button';
  node.setAttribute(attribute, value);
  return node;
}
function questionCard(question: ChoiceQuestion, answer: string | undefined) {
  const card = element('fieldset', undefined, 'explore-question');
  card.append(element('legend', question.prompt));
  const choices = element('div', undefined, 'explore-learning-choices');
  for (const choice of question.choices) {
    const option = button(choice.label, 'data-review-answer', choice.id);
    option.dataset.reviewQuestion = question.id;
    option.setAttribute('aria-pressed', String(answer === choice.id));
    choices.append(option);
  }
  const feedback = element('p', undefined, 'explore-learning-feedback');
  feedback.setAttribute('data-review-feedback', question.id);
  feedback.setAttribute('role', 'status');
  const verdict = evaluateChoice(question, answer ?? '');
  feedback.textContent =
    verdict === 'correct'
      ? question.correctFeedback
      : verdict === 'incorrect'
        ? question.retryFeedback
        : '选择一个答案，读完解释后再继续。';
  card.append(choices, feedback);
  return card;
}

export function renderExploreReview(host: HTMLElement, answers: Readonly<Record<string, string>>): void {
  const panel = host.querySelector<HTMLElement>('[data-explore-review]');
  if (!panel) return;
  panel.replaceChildren(
    element('h3', '三组系统功能复习'),
    element('p', '回想刚才找到的部件。每题都可以修改答案，复习不会改变拆解进度。'),
  );
  for (const question of exploreReviewQuestions) panel.append(questionCard(question, answers[question.id]));
  panel.append(button('关闭复习，继续观察', 'data-explore-review-close'));
}

export function renderExploreAssembly(host: HTMLElement, state: AssemblyReturnState): void {
  const panel = host.querySelector<HTMLElement>('[data-explore-assembly]');
  if (!panel) return;
  const count = element('b', `${state.returnedGroups.length} / 4`);
  count.dataset.assemblyCount = '';
  const header = element('div', undefined, 'explore-learning-header');
  header.append(element('h3', '把结构放回去'), count);
  const summary = element(
    'p',
    state.status === 'complete' ? '四组已完成，车保持组装状态。' : '按这条教学顺序，让模型逐组回到位置。',
  );
  summary.dataset.assemblySummary = '';
  panel.replaceChildren(header, summary, element('p', '这是认识系统关系的归位演示，不是工厂真实装配流程。'));
  const list = element('ol');
  for (const group of teachingAssemblyGroups)
    list.append(
      element(
        'li',
        `${group.label} · ${state.returnedGroups.includes(group.id) ? '已归位' : state.currentGroup === group.id ? '正在归位' : '等待'}`,
      ),
    );
  const meter = element('progress');
  meter.max = 1;
  meter.value = state.progress;
  meter.setAttribute('aria-label', '当前组归位进度');
  meter.dataset.assemblyProgress = '';
  const nextGroup = teachingAssemblyGroups[state.returnedGroups.length];
  const next = button(nextGroup ? `归位：${nextGroup.label}` : '全部归位', 'data-assembly-next');
  next.disabled = !!state.currentGroup || state.status !== 'ready';
  panel.append(
    list,
    meter,
    next,
    button(state.status === 'complete' ? '返回自由观察' : '取消归位，恢复进入前状态', 'data-assembly-cancel'),
  );
}
