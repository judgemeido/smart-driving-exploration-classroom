import type { DomainFact, FinishReason } from '../../shared/arcade/types';
import {
  relationLabels,
  type DiagramEdge,
  type StructureLabBoard,
  type StructureLabContent,
} from './content';
export interface StructureLabConfig {
  readonly mode: 'practice' | 'contest';
  readonly profile: 'guided' | 'standard';
  readonly challengeCode: string;
  readonly contentVersion: string;
}
export interface StructureLabState {
  readonly config: StructureLabConfig;
  readonly stage: 'install' | 'link' | 'group-feedback' | 'result';
  readonly boardId: StructureLabBoard;
  readonly installedBySocket: Readonly<Record<string, string>>;
  readonly edgesByBoard: Readonly<Record<StructureLabBoard, readonly (DiagramEdge & { id: string })[]>>;
  readonly surface: 'dry' | 'wet';
  readonly selectedPartId: string | null;
  readonly selectedPortId: string | null;
  readonly selectedTargetPortId: string | null;
  readonly feedback: string;
  readonly revisionByObjective: Readonly<Record<string, number>>;
  readonly lastCheckedRevision: Readonly<Record<string, number>>;
  readonly completedObjectiveIds: readonly string[];
  readonly hintedObjectiveIds: readonly string[];
  readonly finishReason: FinishReason | null;
  readonly edgeSequence: number;
}
export type StructureLabAction =
  | { type: 'select-part'; partId: string }
  | { type: 'install'; socketId: string; partId: string }
  | { type: 'select-port'; nodeId: string }
  | ({ type: 'connect' } & DiagramEdge)
  | { type: 'remove-edge'; edgeId: string }
  | { type: 'surface'; value: 'dry' | 'wet' }
  | { type: 'check-install' }
  | { type: 'check-links' }
  | { type: 'hint'; objectiveId: string }
  | { type: 'continue' }
  | { type: 'cancel' }
  | { type: 'finish'; reason: FinishReason };
export interface StructureLabTransition {
  readonly state: StructureLabState;
  readonly facts: readonly DomainFact[];
}
export function createStructureLabState(
  config: StructureLabConfig,
  _content: StructureLabContent,
): StructureLabState {
  return {
    config,
    stage: 'install',
    boardId: 'power',
    installedBySocket: {},
    edgesByBoard: { power: [], support: [], perception: [] },
    surface: 'dry',
    selectedPartId: null,
    selectedPortId: null,
    selectedTargetPortId: null,
    feedback: '选择一个部件，再点需要这个功能的位置。',
    revisionByObjective: {},
    lastCheckedRevision: {},
    completedObjectiveIds: [],
    hintedObjectiveIds: [],
    finishReason: null,
    edgeSequence: 0,
  };
}
const edgeKey = (e: DiagramEdge) => `${e.sourceId}|${e.targetId}|${e.relationId}`;
export function reduceStructureLab(
  state: StructureLabState,
  action: StructureLabAction,
  content: StructureLabContent,
): StructureLabTransition {
  const unchanged = () => ({ state, facts: [] });
  if (state.finishReason) return unchanged();
  if (action.type === 'finish')
    return {
      state: {
        ...state,
        finishReason: action.reason,
        stage: 'result',
        selectedPartId: null,
        selectedPortId: null,
        selectedTargetPortId: null,
      },
      facts: [],
    };
  const board = content.boards.find((b) => b.id === state.boardId)!;
  const objectives = content.objectives.filter((o) => o.boardId === board.id && o.sourceTaskId);
  const linkId = `structure-link-${board.id}`;
  const done = (id: string) => state.completedObjectiveIds.includes(id);
  const revision = (ids: readonly string[]) => {
    const result = { ...state.revisionByObjective };
    for (const id of ids) result[id] = (result[id] ?? 0) + 1;
    return result;
  };
  const update = (patch: Partial<StructureLabState>): StructureLabTransition => ({
    state: { ...state, ...patch },
    facts: [],
  });
  if (action.type === 'cancel')
    return update({
      selectedPartId: null,
      selectedPortId: null,
      selectedTargetPortId: null,
      feedback: '已取消选择，已装部件和连线保留。',
    });
  if (action.type === 'hint') {
    const objective = content.objectives.find((o) => o.id === action.objectiveId && o.boardId === board.id);
    if (!objective || done(objective.id) || state.hintedObjectiveIds.includes(objective.id))
      return unchanged();
    const first = Object.entries(objective.requiredSocketParts)[0];
    const hint = first
      ? `${content.parts.find((p) => p.id === first[1])!.label} → ${board.sockets.find((s) => s.id === first[0])!.label}`
      : board.requiredEdges
          .map(
            (e) =>
              `${board.nodes.find((n) => n.id === e.sourceId)!.label} → ${board.nodes.find((n) => n.id === e.targetId)!.label}：${relationLabels[e.relationId]}`,
          )
          .join('；');
    return update({
      hintedObjectiveIds: [...state.hintedObjectiveIds, objective.id],
      feedback: `答案提示（本目标保留完成贡献，失去首次验证贡献）：${hint}`,
    });
  }
  if (action.type === 'select-part') {
    if (state.stage !== 'install' || !content.parts.some((p) => p.id === action.partId)) return unchanged();
    return update({
      selectedPartId: state.selectedPartId === action.partId ? null : action.partId,
      feedback: '现在点图中的功能位置。试运行前可以替换未确认的部件。',
    });
  }
  if (action.type === 'install') {
    if (
      state.stage !== 'install' ||
      !board.sockets.some((s) => s.id === action.socketId) ||
      !content.parts.some((p) => p.id === action.partId)
    )
      return unchanged();
    if (
      objectives.some((o) => done(o.id) && action.socketId in o.requiredSocketParts) ||
      state.installedBySocket[action.socketId] === action.partId
    )
      return unchanged();
    const affected = objectives.filter((o) => action.socketId in o.requiredSocketParts).map((o) => o.id);
    return update({
      installedBySocket: { ...state.installedBySocket, [action.socketId]: action.partId },
      revisionByObjective: revision(affected),
      selectedPartId: null,
      feedback: '部件已放入。可以继续补装，再按“试运行”。',
    });
  }
  if (action.type === 'surface') {
    if (
      board.id !== 'support' ||
      state.stage !== 'install' ||
      state.surface === action.value ||
      done('explore-structure-wheel')
    )
      return unchanged();
    return update({
      surface: action.value,
      revisionByObjective: revision(['explore-structure-wheel']),
      feedback:
        action.value === 'wet'
          ? '湿滑时接触表现会变化：加速、转弯和减速都需要更谨慎。试运行来观察。'
          : '干燥路面：轮胎通过与路面接触改变车辆运动。',
    });
  }
  if (action.type === 'check-install') {
    if (state.stage !== 'install') return unchanged();
    const facts: DomainFact[] = [];
    const checked = { ...state.lastCheckedRevision };
    const completed = [...state.completedObjectiveIds];
    let correction = '';
    let missing = '';
    for (const objective of objectives) {
      if (done(objective.id)) continue;
      const required = Object.entries(objective.requiredSocketParts);
      const revision = state.revisionByObjective[objective.id] ?? 0;
      if (required.some(([id]) => !state.installedBySocket[id])) {
        missing ||= '还有功能位置没放部件。空位置不会算错。';
        continue;
      }
      if (objective.id === 'explore-structure-wheel' && state.surface !== 'wet') {
        missing ||= '轮胎已安装：还要切到湿滑路面并试运行，观察接触关系。';
        continue;
      }
      if (checked[objective.id] === revision) continue;
      const correct = required.every(([id, part]) => state.installedBySocket[id] === part);
      checked[objective.id] = revision;
      facts.push({
        objectiveId: objective.id,
        revision,
        verdict: correct ? 'correct' : 'incorrect',
        usedHint: state.hintedObjectiveIds.includes(objective.id),
      });
      if (correct) completed.push(objective.id);
      else {
        const wrong = required.find(([id, part]) => state.installedBySocket[id] !== part)!;
        correction ||= `请修正“${board.sockets.find((s) => s.id === wrong[0])!.label}”：这里需要${content.parts.find((p) => p.id === wrong[1])!.functionLabel}的部件。其他已验证部件已保留。`;
      }
    }
    const all = objectives.every((o) => completed.includes(o.id));
    return {
      state: {
        ...state,
        lastCheckedRevision: checked,
        completedObjectiveIds: completed,
        stage: all ? 'link' : 'install',
        feedback: all
          ? '本台部件已验证！现在选起点、终点和关系，把系统连起来。'
          : correction || missing || '已验证的部件保持固定。继续补齐其他功能。',
      },
      facts,
    };
  }
  if (action.type === 'select-port') {
    if (state.stage !== 'link' || !board.nodes.some((n) => n.id === action.nodeId)) return unchanged();
    if (!state.selectedPortId)
      return update({
        selectedPortId: action.nodeId,
        selectedTargetPortId: null,
        feedback: '起点已选。现在选择终点。',
      });
    if (state.selectedPortId === action.nodeId)
      return update({ selectedPortId: null, selectedTargetPortId: null, feedback: '已取消端口选择。' });
    return update({
      selectedTargetPortId: action.nodeId,
      feedback: '端点已选。选择它们之间的功能关系，再按“连接端口”。',
    });
  }
  if (action.type === 'connect') {
    if (
      state.stage !== 'link' ||
      done(linkId) ||
      action.sourceId === action.targetId ||
      !relationLabels[action.relationId] ||
      ![action.sourceId, action.targetId].every((id) => board.nodes.some((n) => n.id === id))
    )
      return unchanged();
    if (state.edgesByBoard[board.id].some((e) => edgeKey(e) === edgeKey(action))) return unchanged();
    const id = `edge-${state.edgeSequence + 1}`;
    return update({
      edgesByBoard: {
        ...state.edgesByBoard,
        [board.id]: [
          ...state.edgesByBoard[board.id],
          { id, sourceId: action.sourceId, targetId: action.targetId, relationId: action.relationId },
        ],
      },
      edgeSequence: state.edgeSequence + 1,
      revisionByObjective: revision([linkId]),
      selectedPortId: null,
      selectedTargetPortId: null,
      feedback: '已增加一条有方向的功能关系。连齐后验证；错线可以单独删除。',
    });
  }
  if (action.type === 'remove-edge') {
    if (
      state.stage !== 'link' ||
      done(linkId) ||
      !state.edgesByBoard[board.id].some((e) => e.id === action.edgeId)
    )
      return unchanged();
    return update({
      edgesByBoard: {
        ...state.edgesByBoard,
        [board.id]: state.edgesByBoard[board.id].filter((e) => e.id !== action.edgeId),
      },
      revisionByObjective: revision([linkId]),
      feedback: '只删除了这条关系，其他关系保留。',
    });
  }
  if (action.type === 'check-links') {
    if (state.stage !== 'link' || done(linkId)) return unchanged();
    const edges = state.edgesByBoard[board.id],
      revision = state.revisionByObjective[linkId] ?? 0;
    if (edges.length < board.requiredEdges.length)
      return update({
        feedback: `还差 ${board.requiredEdges.length - edges.length} 条功能关系。未连齐不算错。`,
      });
    if (state.lastCheckedRevision[linkId] === revision) return unchanged();
    const correct =
      edges.length === board.requiredEdges.length &&
      board.requiredEdges.every((e) => edges.some((candidate) => edgeKey(e) === edgeKey(candidate)));
    const wrong = edges.find(
      (e) => !board.requiredEdges.some((required) => edgeKey(required) === edgeKey(e)),
    );
    const error = wrong
      ? `请修正 ${board.nodes.find((n) => n.id === wrong.sourceId)!.label} → ${board.nodes.find((n) => n.id === wrong.targetId)!.label} 的“${relationLabels[wrong.relationId]}”关系。删掉这条，再检查功能和方向。`
      : '还有多余关系，请只保留这台需要的功能链。';
    return {
      state: {
        ...state,
        stage: correct ? 'group-feedback' : 'link',
        lastCheckedRevision: { ...state.lastCheckedRevision, [linkId]: revision },
        completedObjectiveIds: correct
          ? [...state.completedObjectiveIds, linkId]
          : state.completedObjectiveIds,
        feedback: correct ? `系统已连通。${board.observation}` : error,
      },
      facts: [
        {
          objectiveId: linkId,
          revision,
          verdict: correct ? 'correct' : 'incorrect',
          usedHint: state.hintedObjectiveIds.includes(linkId),
        },
      ],
    };
  }
  if (action.type === 'continue') {
    if (state.stage !== 'group-feedback') return unchanged();
    const next = content.boards[content.boards.indexOf(board) + 1];
    return next
      ? update({
          boardId: next.id,
          stage: 'install',
          selectedPartId: null,
          selectedPortId: null,
          selectedTargetPortId: null,
          feedback: '新台面缺少几项功能，请补装并试运行。',
        })
      : update({ stage: 'result', finishReason: 'completed' });
  }
  return unchanged();
}
