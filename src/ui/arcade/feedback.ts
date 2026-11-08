import type { UiFeedback } from './types';
export function updateArcadeFeedback(host: HTMLElement, feedback: UiFeedback): void {
  if (host.textContent !== feedback.text) host.textContent = feedback.text;
  host.dataset.kind = feedback.kind;
  host.setAttribute('role', 'status');
  host.setAttribute('aria-live', 'polite');
}
