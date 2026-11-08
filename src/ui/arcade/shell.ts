import type { ChapterController } from '../../app/types';
import { createArcadeSession } from '../../shared/arcade/session';
import { createArcadeRepository, recoverInterruptedArcadeDraft } from '../../shared/arcade/storage';
import { createActivitySeed, parseChallengeCode } from '../../shared/arcade/challenge-code';
import {
  CONTENT_VERSION,
  SCORING_VERSION,
  type ArcadeRunConfig,
  type ArcadeSnapshot,
} from '../../shared/arcade/types';
import type { ArcadeActivityDefinition, ArcadeGameController, ArcadeShell, ArcadeShellModel } from './types';
import { renderArcadeResult } from './results';
import { updateArcadeFeedback } from './feedback';
import { createActivityDrawer } from './drawer';
import { mountArcadeTutorial } from './tutorial';
import { createArcadeSound } from './sound';
import './tokens.css';
import './styles.css';
export type { ArcadeActivityDefinition, ArcadeGameContext, ArcadeGameController } from './types';
const text = (element: Element | null, value: string) => {
  if (element && element.textContent !== value) element.textContent = value;
};
export function createArcadeShell(host: HTMLElement, onPrimary: (id: string) => void): ArcadeShell {
  host.classList.add('arcade-root');
  host.innerHTML =
    '<header class="arcade-task"><div><h1 data-shell-title></h1><p data-shell-goal></p></div><p data-shell-stage></p><p data-shell-clock></p></header><div class="arcade-workspace"><section class="arcade-stage" aria-label="科学操作舞台"></section><aside class="arcade-evidence" aria-label="实验依据"></aside></div><section class="arcade-tools" aria-label="本步工具"></section><p class="arcade-feedback" role="status" aria-live="polite"></p><footer class="arcade-actions"><span data-shell-reason></span><button type="button" class="arcade-primary" data-shell-primary></button></footer>';
  const stage = host.querySelector<HTMLElement>('.arcade-stage')!,
    tools = host.querySelector<HTMLElement>('.arcade-tools')!,
    evidence = host.querySelector<HTMLElement>('.arcade-evidence')!,
    primary = host.querySelector<HTMLButtonElement>('[data-shell-primary]')!;
  let action = '';
  const click = () => onPrimary(action);
  primary.addEventListener('click', click);
  return {
    stage,
    tools,
    evidence,
    update(model: ArcadeShellModel) {
      text(host.querySelector('[data-shell-title]'), model.title);
      text(host.querySelector('[data-shell-goal]'), model.goal);
      text(host.querySelector('[data-shell-stage]'), model.stageLabel);
      text(
        host.querySelector('[data-shell-clock]'),
        model.timing.mode === 'practice' ? '不限时练习' : formatTime(model.timing.remainingMs ?? 0),
      );
      action = model.primary.id;
      text(primary, model.primary.label);
      primary.disabled = model.primary.disabled;
      text(host.querySelector('[data-shell-reason]'), model.primary.reason ?? '');
      updateArcadeFeedback(host.querySelector<HTMLElement>('.arcade-feedback')!, model.feedback);
    },
    dispose() {
      primary.removeEventListener('click', click);
    },
  };
}
function formatTime(ms: number) {
  const seconds = Math.ceil(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
export function mountArcade(host: HTMLElement, definition: ArcadeActivityDefinition): ChapterController {
  host.classList.add('arcade-root');
  const repository = createArcadeRepository();
  const session = createArcadeSession({ repository });
  const sound = createArcadeSound();
  let previousCompleted = 0;
  let game: ArcadeGameController | null = null,
    last: ArcadeSnapshot | null = null,
    paused = false,
    disposed = false,
    shownResult: string | null = null,
    clearArmed = false,
    pageLeft = false,
    returnedToPreparation = false;
  host.innerHTML = `<div class="arcade-utility"><button type="button" data-tutorial>操作说明</button><button type="button" data-history>本机记录</button><button type="button" data-sound aria-pressed="false">声音：关</button></div><section class="arcade-prepare" data-prepare><h1 data-title></h1><p data-description></p><form data-setup><div class="arcade-fields"><label>我的代号 <input name="nickname" maxlength="24" autocomplete="off" aria-describedby="nickname-help"></label><label>支持档位 <select name="profile"><option value="guided">引导 · 建议三四年级</option><option value="standard">标准 · 建议五六年级</option></select></label><label>老师的挑战码 <input name="challengeCode" autocomplete="off" spellcheck="false" aria-describedby="code-help"></label></div><p id="nickname-help" class="arcade-small">可以用代号，最多12个字符。无需真实姓名。</p><p id="code-help" class="arcade-small">同一个活动、挑战码、档位和版本的首次正式成绩才可比较。</p><div class="arcade-prepare-rules"><p>练习不限时，可以纠错后再试。</p><p>正式挑战 6 分钟，预计操作 3–6 分钟。暂停或切到后台时倒计时继续；跳转、刷新或离开页面会中断，返回不能恢复。</p><p>探索完成最多700分，首次验证最多200分，时间奖励最多100分。纠正后仍有探索分。</p></div><p data-start-message role="status" aria-live="polite"></p><p data-draft-message></p><button type="button" data-recover hidden>结束未完成挑战</button><div class="arcade-start-actions"><button type="button" class="arcade-primary" data-practice>开始练习</button><button type="submit" data-contest>开始挑战</button></div></form><p class="arcade-small">本机保留最近30天，最多200条记录和200个正式次数锁。不同电脑不会自动同步。</p><p class="arcade-small" data-versions></p></section><section data-running hidden><header class="arcade-task"><p data-goal></p><div class="arcade-run-meta"><span data-progress></span><strong data-clock></strong><button type="button" data-pause>暂停操作</button><button type="button" data-end>结束本局</button></div></header><p data-pause-message role="status" hidden></p><div data-game-host></div><p class="arcade-feedback" data-feedback role="status" aria-live="polite"></p></section><section data-result hidden><div data-result-card></div><button type="button" class="arcade-primary" data-replay>重玩练习</button><button type="button" data-ready>返回准备</button></section><p class="arcade-persistence" data-persistence role="status"></p><dialog class="arcade-dialog" data-tutorial-dialog aria-labelledby="tutorial-title"><h2 id="tutorial-title">开始前，先了解操作</h2><div data-tutorial-content></div><p>操作说明不影响成绩。活动里的答案提示会标明影响的目标。</p><button type="button" data-drawer-close>我知道了</button></dialog><dialog class="arcade-dialog" data-history-dialog aria-labelledby="history-title"><h2 id="history-title">此浏览器的游戏记录</h2><p>正式挑战与练习分组展示。其他电脑不会自动同步。</p><div data-history-content></div><div class="arcade-history-actions"><button type="button" data-next-player>换下一位玩家</button><button type="button" data-clear>清除本机游戏记录</button><button type="button" data-reset>恢复本机游戏初始状态</button></div><p data-clear-message role="status"></p><button type="button" data-drawer-close>关闭记录</button></dialog>`;
  const $ = <T extends HTMLElement = HTMLElement>(selector: string) =>
    (host.querySelector<T>(selector) ?? host.closest('#app')?.querySelector<T>(selector))!;
  const prepare = $('[data-prepare]'),
    running = $('[data-running]'),
    resultPanel = $('[data-result]'),
    gameHost = $('[data-game-host]'),
    form = $<HTMLFormElement>('[data-setup]');
  const utility = $('.arcade-utility');
  const topbar = host.closest('#app')?.querySelector<HTMLElement>('.arcade-topbar');
  if (topbar) topbar.insertBefore(utility, topbar.lastElementChild);
  const outcome = document.createElement('details');
  outcome.className = 'arcade-outcome';
  const outcomeSummary = document.createElement('summary');
  outcomeSummary.textContent = '查看我的操作成果';
  outcome.append(outcomeSummary);
  resultPanel.insertBefore(outcome, $('[data-replay]'));
  const nickname = form.elements.namedItem('nickname') as HTMLInputElement,
    profile = form.elements.namedItem('profile') as HTMLSelectElement,
    codeInput = form.elements.namedItem('challengeCode') as HTMLInputElement;
  const contestSettings = document.createElement('details');
  contestSettings.dataset.contestSettings = '';
  contestSettings.className = 'arcade-contest-settings';
  const contestSummary = document.createElement('summary');
  contestSummary.textContent = '正式挑战设置 · 6 分钟';
  const contestFields = document.createElement('div');
  contestFields.className = 'arcade-fields';
  contestFields.append(nickname.closest('label')!, codeInput.closest('label')!);
  contestSettings.append(
    contestSummary,
    contestFields,
    $('#nickname-help'),
    $('#code-help'),
    $('.arcade-prepare-rules'),
    $('[data-contest]'),
  );
  form.append(contestSettings);
  const preview = document.createElement('div');
  preview.className = 'arcade-preparation-preview';
  preview.innerHTML =
    '<svg viewBox="0 0 460 100" aria-hidden="true"><path d="M25 70H435" fill="none" stroke="#d6e1ee" stroke-width="3"/><rect x="50" y="25" width="80" height="46" rx="5" fill="#edf2ff" stroke="#2457d6" stroke-width="2"/><path d="M72 48l12 12 24-24M170 48h120m-14-10 14 10-14 10" fill="none" stroke="#2457d6" stroke-width="3"/><circle cx="358" cy="48" r="25" fill="#e8f6f0" stroke="#087b63" stroke-width="2"/><path d="M347 48l8 8 15-17" fill="none" stroke="#087b63" stroke-width="3"/></svg><p>动手调整，让变化说话。</p><button type="button" data-preview-tutorial>先试接线，不计分</button>';
  prepare.insertBefore(preview, form);
  text($('[data-title]'), definition.title);
  text($('[data-description]'), definition.description);
  text($('[data-versions]'), `内容 ${CONTENT_VERSION} · 评分 ${SCORING_VERSION}`);
  function applyPreferences() {
    const p = repository.read().preferences;
    nickname.value = p.nickname;
    profile.value = p.profile;
    codeInput.value = p.lastChallengeCode ?? `SA1-R07-7K2M4C-${p.profile === 'guided' ? 'G' : 'S'}`;
    const sound = $<HTMLButtonElement>('[data-sound]');
    sound.textContent = p.soundEnabled ? '声音：开' : '声音：关';
    sound.setAttribute('aria-pressed', String(p.soundEnabled));
  }
  function persistenceMessage() {
    text(
      $('[data-persistence]'),
      repository.notice ||
        (repository.persistence === 'saved'
          ? '记录只保存在此浏览器，不会上传。'
          : '本次成绩可查看，本机未保存。本页临时挑战：刷新会丢失记录，本地次数锁不可靠。'),
    );
  }
  function draftMessage() {
    const d = repository.read().activeDraft;
    text(
      $('[data-draft-message]'),
      d
        ? `此浏览器还有一局未结束的正式挑战。${d.config.activityId === definition.activityId ? '请返回原窗口继续。' : '可以返回该活动的原窗口继续。'}`
        : '',
    );
    $('[data-recover]').hidden = !d;
    $('[data-recover]').dataset.runId = d?.runId ?? '';
  }
  function ready() {
    game?.setActive(false);
    prepare.hidden = false;
    running.hidden = true;
    resultPanel.hidden = true;
    shownResult = null;
    draftMessage();
    persistenceMessage();
  }
  function start(mode: 'practice' | 'contest') {
    const practiceProfile = profile.value === 'standard' ? 'standard' : 'guided';
    const parsed = parseChallengeCode(
      mode === 'practice'
        ? `${(parseChallengeCode(codeInput.value)?.code ?? 'SA1-R07-7K2M4C-G').slice(0, -1)}${practiceProfile === 'guided' ? 'G' : 'S'}`
        : codeInput.value,
    );
    if (!parsed) {
      text($('[data-start-message]'), '挑战码格式不正确。示例 SA1-R07-7K2M4C-G，请核对老师公布的代码。');
      return;
    }
    if (parsed.profile !== profile.value) {
      text($('[data-start-message]'), '挑战码末尾 G 对应引导档，S 对应标准档。请让所选档位与挑战码一致。');
      return;
    }
    if (last?.phase === 'running') session.finish('abandoned');
    repository.updatePreferences({
      nickname: nickname.value,
      profile: parsed.profile,
      lastChallengeCode: parsed.code,
    });
    const p = repository.read().preferences;
    const config: ArcadeRunConfig = {
      activityId: definition.activityId,
      mode,
      profile: parsed.profile,
      challengeCode: parsed.code,
      contentVersion: CONTENT_VERSION,
      scoringVersion: SCORING_VERSION,
      durationMs: mode === 'contest' ? 360000 : null,
      slotId: p.slotId,
      nickname: p.nickname,
      objectives: definition.objectives,
    };
    const started = session.start(config);
    if (!started.ok) {
      const messages = {
        'invalid-config': '此活动配置暂时无法开始。',
        'already-running': '本局仍在进行。',
        'attempt-used': '这个代号槽位已参加过这一轮，请重玩练习；新一轮请老师更换挑战码。',
        'other-run-active': '此浏览器另一局正式挑战尚未结束。请返回原窗口，或明确结束未完成挑战。',
        'capacity-full': '正式次数锁已满。现在仍可练习；请清理本机游戏记录后组织新轮次。',
      };
      text($('[data-start-message]'), messages[started.reason]);
      draftMessage();
      return;
    }
    game?.dispose();
    gameHost.replaceChildren();
    running.insertBefore(gameHost, $('[data-feedback]'));
    outcome.open = false;
    pageLeft = false;
    returnedToPreparation = false;
    paused = false;
    previousCompleted = 0;
    shownResult = null;
    prepare.hidden = true;
    resultPanel.hidden = true;
    running.hidden = false;
    gameHost.inert = false;
    $('[data-pause-message]').hidden = true;
    text($('[data-pause]'), '暂停操作');
    text($('[data-goal]'), definition.description);
    text($('[data-feedback]'), '');
    game = definition.createGame({
      host: gameHost,
      session,
      config,
      seed: createActivitySeed(parsed.seed, definition.activityId),
      setGoal(value) {
        text($('[data-goal]'), value);
      },
      setFeedback(value) {
        text($('[data-feedback]'), value);
      },
    });
    game.setActive(document.visibilityState !== 'hidden');
    persistenceMessage();
  }
  const unsubscribe = session.subscribe((snapshot) => {
    last = snapshot;
    const completed = snapshot.objectives.filter((objective) => objective.completed).length;
    if (
      completed > previousCompleted &&
      repository.read().preferences.soundEnabled &&
      document.visibilityState !== 'hidden'
    )
      sound.play();
    previousCompleted = completed;
    if (snapshot.phase === 'running') {
      text(
        $('[data-progress]'),
        `${snapshot.objectives.filter((o) => o.completed).length} / ${snapshot.objectives.length} 已完成`,
      );
      text(
        $('[data-clock]'),
        snapshot.config?.mode === 'practice' ? '不限时练习' : `剩余 ${formatTime(snapshot.remainingMs ?? 0)}`,
      );
    }
    if (snapshot.phase === 'finished' && returnedToPreparation) {
      ready();
      return;
    }
    if (snapshot.phase === 'finished' && snapshot.result && shownResult !== snapshot.runId) {
      shownResult = snapshot.runId;
      game?.setActive(false);
      gameHost.inert = false;
      outcome.append(gameHost);
      outcome.open = snapshot.result.status === 'completed';
      running.hidden = true;
      prepare.hidden = true;
      resultPanel.hidden = false;
      renderArcadeResult($('[data-result-card]'), snapshot.result, snapshot.persistence);
      $('[data-result-card]').tabIndex = -1;
      $('[data-result-card]').focus();
      persistenceMessage();
    }
  });
  const tutorialContent = $('[data-tutorial-content]');
  const rehearsal = document.createElement('div');
  tutorialContent.append(rehearsal);
  const disposeTutorial = mountArcadeTutorial(rehearsal);
  for (const line of definition.tutorial ?? [
    '先选物体，再点落点；选中状态可以取消。',
    '用试运行或确认检查结果，保留正确部分后修正。',
    '按步骤主动继续，完成全部目标后查看真实结果。',
  ]) {
    const p = document.createElement('p');
    p.textContent = line;
    tutorialContent.append(p);
  }
  const drawers = [
    createActivityDrawer(
      $<HTMLButtonElement>('[data-tutorial]'),
      $<HTMLDialogElement>('[data-tutorial-dialog]'),
    ),
    createActivityDrawer(
      $<HTMLButtonElement>('[data-history]'),
      $<HTMLDialogElement>('[data-history-dialog]'),
    ),
  ];
  function history() {
    const content = $('[data-history-content]');
    content.replaceChildren();
    const results = repository.read().results.filter((r) => r.config.activityId === definition.activityId);
    for (const mode of ['contest', 'practice'] as const) {
      const section = document.createElement('section'),
        heading = document.createElement('h3');
      heading.textContent = mode === 'contest' ? '正式挑战' : '练习';
      section.append(heading);
      const matching = results.filter((r) => r.config.mode === mode).reverse();
      if (!matching.length) {
        const p = document.createElement('p');
        p.textContent = '还没有本活动记录';
        section.append(p);
      }
      for (const result of matching) {
        const item = document.createElement('article');
        renderArcadeResult(item, result, repository.persistence);
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = '删除这条记录';
        button.dataset.deleteResult = result.runId;
        item.append(button);
        section.append(item);
      }
      content.append(section);
    }
    clearArmed = false;
    text($('[data-clear-message]'), '删除单条记录保留正式次数锁。清除全部后无法核验旧参赛次数。');
  }
  function click(event: MouseEvent) {
    const target = (event.target as Element).closest<HTMLElement>('button');
    if (!target || (!host.contains(target) && !utility.contains(target))) return;
    if (target.hasAttribute('data-practice')) start('practice');
    else if (target.hasAttribute('data-preview-tutorial')) $<HTMLButtonElement>('[data-tutorial]').click();
    else if (target.hasAttribute('data-replay')) start('practice');
    else if (target.hasAttribute('data-ready')) ready();
    else if (target.hasAttribute('data-pause')) {
      paused = !paused;
      session.setActive(!paused && document.visibilityState !== 'hidden');
      game?.setActive(!paused && document.visibilityState !== 'hidden');
      gameHost.inert = paused;
      target.textContent = paused ? '继续操作' : '暂停操作';
      text(
        $('[data-pause-message]'),
        last?.config?.mode === 'contest' ? '操作已暂停，正式倒计时继续。' : '练习已暂停。',
      );
      $('[data-pause-message]').hidden = !paused;
    } else if (target.hasAttribute('data-end')) session.finish('abandoned');
    else if (target.hasAttribute('data-sound')) {
      const enabled = !repository.read().preferences.soundEnabled;
      repository.updatePreferences({ soundEnabled: enabled });
      target.textContent = enabled ? '声音：开' : '声音：关';
      target.setAttribute('aria-pressed', String(enabled));
      if (enabled) sound.play();
    } else if (target.hasAttribute('data-history')) history();
    else if (target.hasAttribute('data-recover')) {
      const id = target.dataset.runId;
      if (id) {
        recoverInterruptedArcadeDraft(repository, id);
        draftMessage();
        text($('[data-start-message]'), '对应局已记录为中断。它不参与正式成绩比较；新轮次请更换挑战码。');
      }
    } else if (target.dataset.deleteResult) {
      repository.deleteResult(target.dataset.deleteResult);
      history();
    } else if (target.hasAttribute('data-next-player')) {
      if (last?.phase === 'running') session.finish('abandoned');
      repository.createPlayerSlot();
      applyPreferences();
      history();
      ready();
      text($('[data-clear-message]'), '已创建下一位玩家的独立代号槽位。');
    } else if (target.hasAttribute('data-clear')) {
      const current = repository.read();
      if (!clearArmed) {
        clearArmed = true;
        target.textContent = '确认清除这些游戏记录';
        text(
          $('[data-clear-message]'),
          `将删除 ${current.results.length} 条记录、${current.contestLocks.length} 个正式次数锁${current.activeDraft ? '，并结束未完成挑战' : ''}。代号与偏好保留。请再次点击确认。`,
        );
      } else {
        if (last?.phase === 'running') session.finish('abandoned');
        repository.clearRecords();
        target.textContent = '清除本机游戏记录';
        history();
        ready();
      }
    } else if (target.hasAttribute('data-reset')) {
      if (target.dataset.confirm !== 'yes') {
        target.dataset.confirm = 'yes';
        text($('[data-clear-message]'), '再次点击将删除全部游戏记录和次数锁，并恢复匿名代号与静音默认。');
      } else {
        if (last?.phase === 'running') session.finish('abandoned');
        repository.reset();
        delete target.dataset.confirm;
        applyPreferences();
        history();
        ready();
      }
    }
  }
  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    start('contest');
  };
  host.addEventListener('click', click);
  if (topbar) utility.addEventListener('click', click);
  form.addEventListener('submit', submit);
  const pagehide = () => {
    pageLeft = true;
    if (last?.phase === 'running') session.finish('interrupted');
    game?.setActive(false);
  };
  const pageshow = () => {
    if (pageLeft) {
      returnedToPreparation = true;
      ready();
    }
  };
  host.addEventListener('arcade:pagehide', pagehide);
  host.addEventListener('arcade:pageshow', pageshow);
  const ticker = window.setInterval(() => {
    if (last?.phase === 'running') session.setActive(!paused && document.visibilityState !== 'hidden');
  }, 250);
  applyPreferences();
  draftMessage();
  persistenceMessage();
  return {
    setActive(active) {
      session.setActive(active && !paused);
      game?.setActive(active && !paused);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      window.clearInterval(ticker);
      unsubscribe();
      game?.dispose();
      session.dispose();
      repository.dispose();
      drawers.forEach((d) => d.dispose());
      disposeTutorial();
      sound.dispose();
      host.removeEventListener('click', click);
      if (topbar) utility.removeEventListener('click', click);
      form.removeEventListener('submit', submit);
      host.removeEventListener('arcade:pagehide', pagehide);
      host.removeEventListener('arcade:pageshow', pageshow);
    },
  };
}
