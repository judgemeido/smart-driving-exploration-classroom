export type SelectionState = { itemId: string | null; targetId: string | null };
export function reduceSelection(
  state: SelectionState,
  action: { type: 'select-item' | 'select-target' | 'cancel'; id?: string },
): SelectionState {
  if (action.type === 'cancel') return { itemId: null, targetId: null };
  if (action.type === 'select-item') return { itemId: action.id ?? null, targetId: null };
  return state.itemId ? { ...state, targetId: action.id ?? null } : state;
}
