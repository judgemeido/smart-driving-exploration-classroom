import type { StructureLabContent } from './content';
import type { StructureLabState } from './state';
import { getStructureSource } from './source';
export function describeStructureEvidence(state: StructureLabState, content: StructureLabContent) {
  const source = getStructureSource();
  return content.objectives.map((objective) => ({
    id: objective.id,
    label: objective.sourceTaskId
      ? source.tasks.find((t) => t.id === objective.sourceTaskId)!.title.replace(/^找到/, '')
      : `${content.boards.find((b) => b.id === objective.boardId)!.title}功能关系`,
    source: 'diagram' as const,
    completed: state.completedObjectiveIds.includes(objective.id),
    usedHint: state.hintedObjectiveIds.includes(objective.id),
    teachingOnly: objective.teachingOnly === true,
  }));
}
