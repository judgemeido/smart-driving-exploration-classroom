import { currentObjective,type HistoryLabState } from './state';

/** Recalculate both directions: inactivity must never become a permanent DOM lock. */
export function updateHistoryControlStates(root:HTMLElement,state:HistoryLabState,active:boolean):void {
  const locked=state.completed.includes(currentObjective(state));
  root.querySelectorAll<HTMLButtonElement|HTMLInputElement|HTMLTextAreaElement>('button,input,textarea').forEach(control=>{
    const reading=control.hasAttribute('data-hl-reading');
    const primary=control.hasAttribute('data-hl-primary');
    control.disabled=reading?false:!active||(primary?locked&&state.stage==='future':locked);
  });
}
