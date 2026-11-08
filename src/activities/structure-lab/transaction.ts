import type { DomainFact } from '../../shared/arcade/types';
import type { StructureLabContent } from './content';
import { reduceStructureLab, type StructureLabAction, type StructureLabState } from './state';
/** Session owns the deadline: even an edit with no facts must pass its guard. */
export function commitStructureAction(
  state: StructureLabState,
  action: StructureLabAction,
  content: StructureLabContent,
  record: (facts: readonly DomainFact[]) => boolean,
): StructureLabState {
  const candidate = reduceStructureLab(state, action, content);
  return record(candidate.facts) ? candidate.state : state;
}
