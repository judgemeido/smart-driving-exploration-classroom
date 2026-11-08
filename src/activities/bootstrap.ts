import type { ChapterController } from '../app/types';
import type { ActivityId } from '../shared/arcade/types';
import { siteHref } from '../app/navigation-items';
import { createChapterNavigation } from '../ui/chapter-navigation';
import '../ui/arcade/tokens.css';
import '../ui/arcade/styles.css';
export interface ActivityDefinition {
  activityId: ActivityId;
  title: string;
  galleryHref: string;
  view: string;
  mount(host: HTMLElement): ChapterController;
}
export function bootstrapActivity(root: HTMLElement, definition: ActivityDefinition): { dispose(): void } {
  root.classList.add('arcade-root');
  root.replaceChildren();
  const header = document.createElement('header');
  header.className = 'arcade-topbar';
  const back = document.createElement('a');
  back.href = siteHref(definition.galleryHref);
  back.textContent = '← 返回展厅';
  const title = document.createElement('strong');
  title.textContent = definition.title;
  const nav = document.createElement('div');
  header.append(back, title, nav);
  root.append(header);
  const navigation = createChapterNavigation(nav, definition.activityId);
  const host = document.createElement('main');
  host.className = 'arcade-activity';
  host.innerHTML = definition.view;
  root.append(host);
  const controller = definition.mount(host);
  let disposed = false;
  const visible = () => controller.setActive(document.visibilityState !== 'hidden');
  const hide = () => {
    host.dispatchEvent(new CustomEvent('arcade:pagehide'));
    controller.setActive(false);
  };
  const show = (event: PageTransitionEvent) => {
    if (event.persisted) host.dispatchEvent(new CustomEvent('arcade:pageshow'));
    visible();
  };
  document.addEventListener('visibilitychange', visible);
  window.addEventListener('pagehide', hide);
  window.addEventListener('pageshow', show);
  visible();
  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      hide();
      controller.dispose();
      navigation.dispose();
      document.removeEventListener('visibilitychange', visible);
      window.removeEventListener('pagehide', hide);
      window.removeEventListener('pageshow', show);
    },
  };
}
