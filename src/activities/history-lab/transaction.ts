import { reduceHistoryLab, type HistoryAction, type HistoryFact, type HistoryLabState } from './state';
/** The session must accept the candidate before any draft or completion is committed. */
export function applyHistoryAction(state:HistoryLabState,action:HistoryAction,record:(facts:readonly HistoryFact[])=>boolean):HistoryLabState {
  const candidate=reduceHistoryLab(state,action);
  return record(candidate.facts)?candidate.state:state;
}
