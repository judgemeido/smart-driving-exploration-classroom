import { getNavigationGroups } from '../app/navigation-items';
export function createChapterNavigation(host: HTMLElement, currentId: string): { dispose(): void } {
  const outer = document.createElement('details');
  outer.className = 'arcade-navigation';
  const summary = document.createElement('summary');
  summary.textContent = '展厅与活动';
  outer.append(summary);
  const nav = document.createElement('nav');
  nav.className = 'arcade-navigation__groups';
  nav.setAttribute('aria-label', '展厅与科学活动');
  outer.append(nav);
  for (const group of getNavigationGroups()) {
    const details = document.createElement('details');
    details.open = group.items.some((item) => item.id === currentId);
    const heading = document.createElement('summary');
    heading.textContent = `${group.number} ${group.title}`;
    details.append(heading);
    for (const item of group.items) {
      const a = document.createElement('a');
      a.href = item.href;
      a.textContent = item.label;
      if (item.id === currentId) a.setAttribute('aria-current', 'page');
      details.append(a);
    }
    nav.append(details);
  }
  host.append(outer);
  const key = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && outer.open) {
      outer.open = false;
      summary.focus();
    }
  };
  host.addEventListener('keydown', key);
  return {
    dispose() {
      host.removeEventListener('keydown', key);
      outer.remove();
    },
  };
}
