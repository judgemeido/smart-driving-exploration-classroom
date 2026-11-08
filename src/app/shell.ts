import type { ChapterDefinition } from './types';
import { getNavigationGroups } from './navigation-items';

export function renderShell(root: HTMLElement, chapters: readonly ChapterDefinition[]) {
  root.innerHTML = `
    <main class="site-shell">
      <div class="grain" aria-hidden="true"></div>
      <header class="topbar">
        <a class="brand" href="#${chapters[0].id}" data-chapter-home aria-label="返回历史页">
          <span class="brand-mark">YS9</span><span class="brand-name">智驾博物馆</span>
        </a>
        <div class="chapter-indicator" aria-label="当前章节">
          <span class="chapter-indicator__active" data-chapter-number>${chapters[0].number}</span>
          <span class="chapter-indicator__slash">/</span><span data-chapter-total>${String(chapters.length).padStart(2, '0')}</span>
          <span class="chapter-indicator__label" data-chapter-label>${chapters[0].label}</span>
        </div>
        <button class="menu-button" type="button" aria-label="打开章节菜单" aria-controls="chapter-menu" aria-expanded="false" data-menu-button><span></span><span></span></button>
      </header>
      <nav id="chapter-menu" class="chapter-menu" aria-label="章节导航" data-chapter-menu>
        ${chapters.map((chapter) => `<button class="chapter-menu__item" type="button" data-go="${chapter.id}"><span>${chapter.number}</span><strong>${chapter.title}</strong><small>${chapter.subtitle}</small></button>`).join('')}
        <details class="chapter-menu__activities" data-activity-menu><summary>科学活动</summary><div class="chapter-menu__activity-links">${getNavigationGroups()
          .flatMap((group) =>
            group.items
              .filter((item) => item.kind === 'activity')
              .map((item) => `<a href="${item.href}">${group.number} ${item.label}</a>`),
          )
          .join('')}</div></details>
      </nav>
      ${chapters.map((chapter) => `<section class="chapter chapter--${chapter.id}" id="${chapter.id}" data-page="${chapter.id}" aria-hidden="true" inert>${chapter.view}</section>`).join('')}
    </main>`;
  return new Map(
    chapters.map((chapter) => [chapter.id, root.querySelector<HTMLElement>(`[data-page="${chapter.id}"]`)!]),
  );
}
