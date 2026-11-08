import './styles.css';
import { bootstrap } from './app/bootstrap';
import { view } from './chapters/traffic/view';
import type { ChapterDefinition } from './app/types';
const root = document.querySelector<HTMLElement>('#app')!;
const chapters: ChapterDefinition[] = [
  {
    id: 'traffic',
    number: '04',
    title: '安全上路',
    subtitle: '道路规则',
    label: '道路安全体验',
    immersive: true,
    view,
    async load(host, signal) {
      const module = await import('./chapters/traffic/controller');
      signal?.throwIfAborted();
      return module.mount(host);
    },
  },
];
const app = bootstrap(root, chapters);
const back = document.createElement('a');
back.href = `${import.meta.env.BASE_URL}index.html#lidar/S3`;
back.textContent = '返回探索课堂';
back.style.cssText =
  'position:fixed;left:4vw;bottom:22px;z-index:40;color:#f1efe8;background:#223b35;padding:10px 18px;border-radius:6px;font:18px Microsoft YaHei,sans-serif';
root.append(back);
if (import.meta.hot) import.meta.hot.dispose(() => app.dispose());
