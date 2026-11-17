import { chapters as registeredChapters, ChapterImportError } from './chapters';
import type { ChapterDefinition } from './types';
import { renderShell } from './shell';
import { resolveChapter } from './navigation';
import { createChapterRuntime, type ChapterStatus } from './runtime';
import { createScope } from '../shared/lifecycle';
import { bindQualityControl } from '../shared/quality-control';

export function bootstrap(root: HTMLElement, chapters: readonly ChapterDefinition[] = registeredChapters) {
  const scope = createScope();
  const hosts = renderShell(root, chapters);
  const qualitySelect = root.querySelector<HTMLSelectElement>('[data-quality-select]')!;
  scope.add(bindQualityControl(qualitySelect));
  const ids = chapters.map((chapter) => chapter.id);
  const menu = root.querySelector<HTMLElement>('[data-chapter-menu]')!;
  const menuButton = root.querySelector<HTMLButtonElement>('[data-menu-button]')!;
  let current = '';

  function closeMenu() {
    menu.classList.remove('is-open');
    menuButton.classList.remove('is-open');
    menuButton.setAttribute('aria-expanded', 'false');
  }

  function showStatus(id: string, status: ChapterStatus, error?: unknown) {
    const host = hosts.get(id)!;
    host.dataset.status = status;
    host.setAttribute('aria-busy', String(status === 'loading'));
    host.querySelector('[data-chapter-status]')?.remove();
    if (status !== 'error' && status !== 'loading') return;
    const panel = document.createElement('div');
    panel.dataset.chapterStatus = status;
    panel.className = `chapter-runtime chapter-runtime--${status}`;
    panel.setAttribute('role', status === 'error' ? 'alert' : 'status');
    const text = document.createElement('p');
    text.textContent =
      status === 'loading' ? '正在准备展厅…' : '这个展厅暂时无法加载，可以重试或切换其他展厅。';
    panel.append(text);
    if (status === 'error') {
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'asset-retry';
      retry.dataset.chapterRetry = id;
      retry.dataset.reload = String(error instanceof ChapterImportError);
      retry.textContent = error instanceof ChapterImportError ? '重新加载此页' : '重试此展厅';
      panel.append(retry);
      console.error(`Chapter ${id} failed`, error);
    }
    host.append(panel);
  }

  const runtime = createChapterRuntime(
    chapters.map((chapter) => ({
      id: chapter.id,
      load: (signal) => chapter.load(hosts.get(chapter.id)!, signal),
    })),
    showStatus,
  );
  runtime.setVisible(document.visibilityState !== 'hidden');

  function showPage(id: string, historyMode: 'push' | 'replace' | 'none') {
    const chapter = chapters.find((entry) => entry.id === id)!;
    if (historyMode !== 'none' && location.hash !== `#${id}`) {
      window.history[historyMode === 'push' ? 'pushState' : 'replaceState']({}, '', `#${id}`);
    }
    if (current === id) {
      closeMenu();
      return;
    }
    current = id;
    for (const definition of chapters) {
      const active = definition.id === id;
      const host = hosts.get(definition.id)!;
      host.classList.toggle('is-active', active);
      host.setAttribute('aria-hidden', String(!active));
      host.inert = !active;
      for (const target of [document.documentElement, document.body]) {
        target.classList.toggle(`page-${definition.id}`, active && definition.immersive);
      }
    }
    for (const target of [document.documentElement, document.body])
      target.classList.toggle('page-immersive', chapter.immersive);
    root.querySelectorAll<HTMLElement>('[data-go]').forEach((item) => {
      item.classList.toggle('is-active', item.dataset.go === id);
      if (item.dataset.go === id) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });
    root.querySelector('[data-chapter-number]')!.textContent = chapter.number;
    root.querySelector('[data-chapter-label]')!.textContent = chapter.label;
    closeMenu();
    window.scrollTo({ top: 0, behavior: 'auto' });
    void runtime.activate(id);
  }

  scope.listen(root, 'click', (event: MouseEvent) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLElement>(
      '[data-go], [data-next], [data-chapter-home], [data-chapter-retry], [data-menu-button]',
    );
    if (!button || !root.contains(button)) return;
    if (button.hasAttribute('data-menu-button')) {
      const open = menu.classList.toggle('is-open');
      menuButton.classList.toggle('is-open', open);
      menuButton.setAttribute('aria-expanded', String(open));
      return;
    }
    if (button.dataset.chapterRetry) {
      if (button.dataset.reload === 'true') {
        location.reload();
        return;
      }
      const chapter = chapters.find((entry) => entry.id === button.dataset.chapterRetry)!;
      hosts.get(chapter.id)!.innerHTML = chapter.view;
      void runtime.retry(chapter.id);
      return;
    }
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const id = button.dataset.go ?? button.dataset.next ?? ids[0];
    showPage(ids.includes(id) ? id : ids[0], 'push');
  });
  const onLocation = () => {
    const id = resolveChapter(location.hash, ids);
    showPage(id, location.hash === `#${id}` ? 'none' : 'replace');
  };
  scope.listen(window, 'popstate', onLocation);
  scope.listen(window, 'hashchange', onLocation);
  scope.listen(document, 'visibilitychange', () => runtime.setVisible(document.visibilityState !== 'hidden'));
  scope.listen(window, 'pagehide', (event: PageTransitionEvent) => {
    if (event.persisted) runtime.setVisible(false);
    else dispose();
  });
  scope.listen(window, 'pageshow', () => runtime.setVisible(document.visibilityState !== 'hidden'));
  scope.listen(window, 'keydown', (event: KeyboardEvent) => {
    if (event.key === 'Escape') closeMenu();
  });
  scope.listen(root, 'chapter:error', (event: CustomEvent<unknown>) => {
    const host = (event.target as Element).closest<HTMLElement>('[data-page]');
    if (host?.dataset.page) runtime.fail(host.dataset.page, event.detail);
  });
  onLocation();

  function dispose() {
    runtime.dispose();
    scope.dispose();
    for (const target of [document.documentElement, document.body]) {
      target.classList.remove('page-immersive', ...chapters.map((chapter) => `page-${chapter.id}`));
    }
  }
  return { dispose };
}
