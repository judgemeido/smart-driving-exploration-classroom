import type { ArcadeGameContext } from '../../ui/arcade/shell';
import { bindPointerDrag } from '../../ui/arcade/pointer-drag';
import { createSeededRandom } from '../../shared/arcade/challenge-code';
import {
  structureContent as content,
  relationLabels,
  getBoardRelationIds,
  type DiagramBoard,
} from './content';
import {
  partGraphic,
  sceneGraphic,
  mobileSceneGraphic,
  getMobileStructureLayout,
  edgeGraphic,
  escapeHtml,
} from './graphics';
import { getStructureSource } from './source';
import { createStructureLabState, type StructureLabAction } from './state';
import { commitStructureAction } from './transaction';
import { gameView } from './view';
import { describeStructureEvidence } from './evidence';

export function createStructureGame(context: ArcadeGameContext) {
  const { host, session, config } = context;
  host.innerHTML = gameView;
  let state = createStructureLabState(config, content),
    active = true,
    disposed = false,
    currentBoard = '',
    geometryKey = '';
  const $ = <T extends HTMLElement = HTMLElement>(selector: string) => host.querySelector<T>(selector)!;
  const random = createSeededRandom(context.seed);
  const ordering = new Map(content.parts.map((p) => [p.id, random()]));
  const relation = $<HTMLSelectElement>('[data-relation]');
  function act(action: StructureLabAction) {
    if (!active || disposed) return;
    const before = state;
    state = commitStructureAction(state, action, content, (facts) => session.record(facts));
    if (before !== state) {
      render();
      context.setFeedback(state.feedback);
      if (action.type === 'remove-edge') {
        const source = before.edgesByBoard[before.boardId].find(
          (edge) => edge.id === action.edgeId,
        )?.sourceId;
        if (source)
          host.querySelector<HTMLButtonElement>(`[data-port="${source}"]`)?.focus({ preventScroll: true });
      }
    } else if (action.type === 'connect' && active) {
      context.setFeedback('这条关系不能重复连接。已连接的关系保留，请选择其他端口或关系。');
    }
  }
  function buildBoard(board: DiagramBoard) {
    currentBoard = board.id;
    relation.innerHTML = getBoardRelationIds(board)
      .map((id) => `<option value="${id}">${relationLabels[id]}</option>`)
      .join('');
    $('[data-structure-scene]').innerHTML = sceneGraphic(board);
    $('[data-object-layer]').innerHTML = board.sockets
      .map(
        (s) =>
          `<button type="button" class="structure-socket" data-socket="${s.id}" style="--x:${s.x / 9}%;--y:${s.y / 4}%" aria-label="${s.label}，未安装"><span data-slot-art></span><span class="structure-socket-label">${s.label}</span><span class="structure-small" data-slot-status>待安装</span></button>`,
      )
      .join('');
    $('[data-port-layer]').innerHTML = board.nodes
      .map((n) => {
        const socket = board.sockets.find((s) => s.x === n.x && s.y === n.y);
        return `<button type="button" class="structure-port" data-port="${n.id}" style="--x:${n.x / 9}%;--y:${n.y / 4}%" aria-label="关系端口：${n.label}">${partGraphic(socket?.partId ?? n.id.replace('node-', 'part-'))}<span class="structure-port-dot" aria-hidden="true"></span><span>${n.label}</span></button>`;
      })
      .join('');
    let available = content.parts.filter((p) => board.sockets.some((s) => s.partId === p.id));
    if (config.profile === 'standard')
      available = [...available, ...content.parts.filter((p) => !available.includes(p)).slice(0, 1)];
    available.sort((a, b) => ordering.get(a.id)! - ordering.get(b.id)!);
    $('[data-part-tray]').innerHTML = available
      .map(
        (p) =>
          `<button type="button" class="structure-part arcade-draggable-handle" data-part="${p.id}" aria-pressed="false">${partGraphic(p.id)}<span>${p.label}</span><span class="structure-small">${p.functionLabel}</span></button>`,
      )
      .join('');
    const source = getStructureSource();
    $('[data-structure-reference]').replaceChildren();
    for (const objective of content.objectives.filter((o) => o.boardId === board.id && o.sourceTaskId)) {
      const task = source.tasks.find((t) => t.id === objective.sourceTaskId)!;
      const p = document.createElement('p');
      p.textContent = task.question.correctFeedback;
      $('[data-structure-reference]').append(p);
    }
  }
  function render() {
    const board = content.boards.find((b) => b.id === state.boardId)!;
    if (currentBoard !== board.id) buildBoard(board);
    const mobile = window.matchMedia('(max-width:767px)').matches;
    const geometry = mobile ? getMobileStructureLayout(board, $('.structure-board').clientWidth) : board;
    const key = `${board.id}:${mobile ? ('width' in geometry ? geometry.width : 0) : 'desktop'}`;
    if (key !== geometryKey) {
      geometryKey = key;
      $('[data-structure-scene]').innerHTML = mobile
        ? mobileSceneGraphic(geometry as ReturnType<typeof getMobileStructureLayout>)
        : sceneGraphic(board);
    }
    $('.structure-board').style.height = mobile
      ? `${(geometry as ReturnType<typeof getMobileStructureLayout>).height}px`
      : '';
    for (const socket of geometry.sockets) {
      const button = $(`[data-socket="${socket.id}"]`);
      button.style.setProperty('--x', mobile ? `${socket.x}px` : `${socket.x / 9}%`);
      button.style.setProperty('--y', mobile ? `${socket.y}px` : `${socket.y / 4}%`);
    }
    for (const node of geometry.nodes) {
      const button = $(`[data-port="${node.id}"]`);
      button.style.setProperty('--x', mobile ? `${node.x}px` : `${node.x / 9}%`);
      button.style.setProperty('--y', mobile ? `${node.y}px` : `${node.y / 4}%`);
    }
    const installing = state.stage === 'install',
      complete = state.stage === 'group-feedback';
    $('[aria-label="二维汽车系统操作桌"]').dataset.board = board.id;
    $('[aria-label="二维汽车系统操作桌"]').dataset.stage = state.stage;
    $('[data-structure-board]').textContent = board.title;
    $('[data-structure-stage]').textContent = installing ? '补装部件' : complete ? '系统已验证' : '系统关系';
    context.setGoal(
      installing ? `补齐${board.title}缺少的功能，再试运行` : `把${board.title}的功能关系连起来`,
    );
    $('[data-port-layer]').hidden = installing;
    $('[data-part-tray]').hidden = !installing;
    $('[data-link-tools]').hidden = installing;
    $('[data-surface-tools]').hidden = !(installing && board.id === 'support');
    for (const s of board.sockets) {
      const button = $<HTMLButtonElement>(`[data-socket="${s.id}"]`),
        partId = state.installedBySocket[s.id];
      const p = content.parts.find((p) => p.id === partId);
      const locked = content.objectives.some(
        (o) => state.completedObjectiveIds.includes(o.id) && s.id in o.requiredSocketParts,
      );
      const wrong =
        !!p &&
        !locked &&
        state.lastCheckedRevision[content.objectives.find((o) => s.id in o.requiredSocketParts)!.id] ===
          state.revisionByObjective[content.objectives.find((o) => s.id in o.requiredSocketParts)!.id] &&
        p.id !== s.partId;
      const graphicId = partId ?? s.partId;
      if (button.dataset.graphic !== graphicId) {
        button.querySelector('[data-slot-art]')!.innerHTML = partGraphic(graphicId);
        button.dataset.graphic = graphicId;
      }
      button.classList.toggle('is-empty', !p);
      button.classList.toggle('is-verified', locked);
      button.classList.toggle('is-wrong', wrong);
      button.classList.toggle('is-target', installing && !!state.selectedPartId && !locked);
      button.disabled = locked || !installing;
      button.setAttribute(
        'aria-label',
        `${s.label}，${p?.label ?? '未安装'}${locked ? '，已验证' : wrong ? '，待修正' : ''}`,
      );
      button.querySelector('[data-slot-status]')!.textContent = locked
        ? '已验证'
        : wrong
          ? '待修正'
          : p
            ? p.label
            : '待安装';
    }
    for (const p of host.querySelectorAll<HTMLButtonElement>('[data-part]'))
      p.setAttribute('aria-pressed', String(p.dataset.part === state.selectedPartId));
    for (const n of host.querySelectorAll<HTMLButtonElement>('[data-port]')) {
      n.setAttribute(
        'aria-pressed',
        String(n.dataset.port === state.selectedPortId || n.dataset.port === state.selectedTargetPortId),
      );
      n.disabled = complete;
    }
    const selected = content.parts.find((p) => p.id === state.selectedPartId);
    if (selected) $('[data-observation]').textContent = `${selected.label}：${selected.functionLabel}`;
    else if (!installing) $('[data-observation]').textContent = board.observation;
    const count = content.objectives.filter(
      (o) => o.boardId === board.id && state.completedObjectiveIds.includes(o.id),
    ).length;
    $('[data-evidence-status]').textContent =
      `本台已验证 ${count} / ${board.sockets.length + 1} 项功能证据${board.id === 'perception' ? '；毫米波为教学示意' : ''}`;
    $('[data-structure-achievements]').replaceChildren(
      ...describeStructureEvidence(state, content).map((item) => {
        const row = document.createElement('li');
        row.textContent = `${item.label} · ${item.completed ? '已验证' : '未完成'} · 二维图示${item.teachingOnly ? ' · 教学示意' : ''}${item.usedHint ? ' · 已用答案提示' : ''}`;
        return row;
      }),
    );
    $('[data-link-instruction]').textContent = complete
      ? '本台关系已锁定，可以继续下一台。'
      : state.selectedTargetPortId
        ? `已选：${board.nodes.find((n) => n.id === state.selectedPortId)!.label} → ${board.nodes.find((n) => n.id === state.selectedTargetPortId)!.label}。选择关系后连接。`
        : state.selectedPortId
          ? `起点：${board.nodes.find((n) => n.id === state.selectedPortId)!.label}。请选择终点。`
          : '选择起点、终点，再选择关系标签。也可以拖线选择两个端点。';
    $<HTMLButtonElement>('[data-connect-ports]').disabled =
      complete || !state.selectedPortId || !state.selectedTargetPortId;
    relation.disabled = complete || !state.selectedPortId || !state.selectedTargetPortId;
    const edges = state.edgesByBoard[board.id];
    const checked =
      state.lastCheckedRevision[`structure-link-${board.id}`] ===
      state.revisionByObjective[`structure-link-${board.id}`];
    const portBounds = new Map(
      geometry.nodes.map((node) => {
        const rect = $(`[data-port="${node.id}"]`).getBoundingClientRect();
        return [node.id, { width: rect.width, height: rect.height }] as const;
      }),
    );
    $('[data-structure-svg-edges]').innerHTML = edgeGraphic(geometry, edges, checked, mobile, portBounds);
    const list = $('[data-edge-list]');
    const focused = document.activeElement as HTMLElement | null;
    const focusId = focused?.dataset.removeEdge;
    list.innerHTML = edges
      .map((e) => {
        const from = board.nodes.find((n) => n.id === e.sourceId)!.label,
          to = board.nodes.find((n) => n.id === e.targetId)!.label;
        const valid = board.requiredEdges.some(
          (r) => r.sourceId === e.sourceId && r.targetId === e.targetId && r.relationId === e.relationId,
        );
        return `<button type="button" class="structure-edge ${checked && !valid ? 'is-wrong' : ''}" data-remove-edge="${e.id}" ${complete ? 'disabled' : ''} aria-label="删除关系：${escapeHtml(from)} 到 ${escapeHtml(to)}，${relationLabels[e.relationId]}"><span>${escapeHtml(from)} → ${escapeHtml(to)} · ${relationLabels[e.relationId]}</span><span aria-hidden="true">${complete ? '已验证' : '删除'}</span></button>`;
      })
      .join('');
    if (focusId)
      list
        .querySelector<HTMLButtonElement>(`[data-remove-edge="${focusId}"]`)
        ?.focus({ preventScroll: true });
    for (const b of host.querySelectorAll('[data-surface]'))
      b.setAttribute('aria-pressed', String((b as HTMLElement).dataset.surface === state.surface));
    const primary = $<HTMLButtonElement>('[data-structure-primary]');
    primary.textContent = installing
      ? '试运行'
      : complete
        ? `前往${content.boards[content.boards.indexOf(board) + 1]?.title ?? '成果页'}`
        : '验证系统';
    $<HTMLButtonElement>('[data-structure-hint]').disabled = complete;
    $<HTMLButtonElement>('[data-structure-cancel]').disabled = complete;
    host.classList.toggle('structure-tested', Object.keys(state.lastCheckedRevision).length > 0);
    host.classList.toggle('structure-complete', complete);
  }
  function click(event: MouseEvent) {
    const b = (event.target as Element).closest<HTMLElement>('button');
    if (!b || !host.contains(b) || !active) return;
    if (b.dataset.part) act({ type: 'select-part', partId: b.dataset.part });
    else if (b.dataset.socket) {
      if (state.selectedPartId)
        act({ type: 'install', socketId: b.dataset.socket, partId: state.selectedPartId });
      else context.setFeedback('先选下方一个部件，再点这个功能位置。');
    } else if (b.dataset.port) act({ type: 'select-port', nodeId: b.dataset.port });
    else if (b.hasAttribute('data-connect-ports') && state.selectedPortId && state.selectedTargetPortId)
      act({
        type: 'connect',
        sourceId: state.selectedPortId,
        targetId: state.selectedTargetPortId,
        relationId: relation.value,
      });
    else if (b.dataset.removeEdge) act({ type: 'remove-edge', edgeId: b.dataset.removeEdge });
    else if (b.dataset.surface) act({ type: 'surface', value: b.dataset.surface as 'dry' | 'wet' });
    else if (b.hasAttribute('data-structure-primary'))
      act({
        type:
          state.stage === 'install' ? 'check-install' : state.stage === 'link' ? 'check-links' : 'continue',
      });
    else if (b.hasAttribute('data-structure-cancel')) act({ type: 'cancel' });
    else if (b.hasAttribute('data-structure-hint')) {
      const objective = content.objectives.find(
        (o) =>
          o.boardId === state.boardId &&
          !state.completedObjectiveIds.includes(o.id) &&
          !state.hintedObjectiveIds.includes(o.id) &&
          (state.stage === 'install' ? !!o.sourceTaskId : !o.sourceTaskId),
      );
      if (objective) act({ type: 'hint', objectiveId: objective.id });
      else context.setFeedback('本台可用提示已显示，可以继续按提示操作。');
    }
  }
  function clearPreview() {
    for (const e of host.querySelectorAll('.is-drop-target')) e.classList.remove('is-drop-target');
    host.classList.remove('is-dragging');
  }
  const unbind = bindPointerDrag(host, {
    resolveItem(element) {
      if (!active) return null;
      return state.stage === 'install'
        ? (element.closest<HTMLElement>('[data-part]')?.dataset.part ?? null)
        : state.stage === 'link'
          ? (element.closest<HTMLElement>('[data-port]')?.dataset.port ?? null)
          : null;
    },
    resolveTarget(x, y) {
      const element = document.elementFromPoint(x, y);
      const target = element?.closest<HTMLElement>(
        state.stage === 'install' ? '[data-socket]' : '[data-port]',
      );
      return target && !target.hasAttribute('disabled')
        ? (target.dataset.socket ?? target.dataset.port ?? null)
        : null;
    },
    preview(item, target) {
      clearPreview();
      host.classList.add('is-dragging');
      if (target)
        host
          .querySelector(`[${state.stage === 'install' ? 'data-socket' : 'data-port'}="${target}"]`)
          ?.classList.add('is-drop-target');
      const p = content.parts.find((p) => p.id === item);
      $('[data-observation]').textContent = p
        ? `正在移动：${p.label}。松开到功能位置；Escape 取消。`
        : '正在拖线：松开到终点，使用当前关系标签。';
    },
    commit(item, target) {
      clearPreview();
      if (state.stage === 'install') act({ type: 'install', partId: item, socketId: target });
      else {
        act({ type: 'cancel' });
        act({ type: 'select-port', nodeId: item });
        act({ type: 'select-port', nodeId: target });
      }
    },
    cancel: clearPreview,
  });
  const key = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      const source = state.selectedPartId
        ? host.querySelector<HTMLButtonElement>(`[data-part="${state.selectedPartId}"]`)
        : state.selectedPortId
          ? host.querySelector<HTMLButtonElement>(`[data-port="${state.selectedPortId}"]`)
          : null;
      clearPreview();
      act({ type: 'cancel' });
      source?.focus({ preventScroll: true });
    }
  };
  host.addEventListener('click', click);
  host.addEventListener('keydown', key);
  const resizeObserver = new ResizeObserver(() => {
    if (!disposed) render();
  });
  resizeObserver.observe($('.structure-board'));
  render();
  context.setFeedback(state.feedback);
  return {
    setActive(value: boolean) {
      active = value;
      host.inert = !value;
      if (!value) clearPreview();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      unbind();
      resizeObserver.disconnect();
      host.removeEventListener('click', click);
      host.removeEventListener('keydown', key);
    },
  };
}
