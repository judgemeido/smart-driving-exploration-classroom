import type { ChapterController } from '../../app/types';
import { getQualityPreference } from '../../shared/performance';

export type LidarExplorerController = (() => void) & ChapterController;

/** Mount the reviewed exhibit as an isolated document so its styles cannot
 * alter the car, history, traffic or classroom pages. Load only on activation. */
export function mount(host: HTMLElement): LidarExplorerController {
  const container = host.querySelector<HTMLElement>('[data-lidar-exhibit-host]');
  if (!container) throw new Error('激光雷达展厅缺少展示容器');
  const frame = document.createElement('iframe');
  frame.className = 'lidar-exhibit-frame';
  frame.title = '激光雷达结构研究：拆解、零件查询与环境测距';
  frame.setAttribute('allow', 'fullscreen');
  container.append(frame);
  let active = false;
  let loaded = false;
  let disposed = false;
  const navigation = document.querySelector<HTMLElement>('[data-chapter-menu]');
  const resize = () => {
    if (navigation && active) host.style.paddingTop = `${Math.ceil(navigation.getBoundingClientRect().bottom)}px`;
  };
  const observer = new ResizeObserver(resize);
  if (navigation) observer.observe(navigation);
  const notify = () => frame.contentWindow?.postMessage({ type: 'lidar-exhibit:active', active }, location.origin);
  const onMessage = (event: MessageEvent) => {
    if (disposed || event.source !== frame.contentWindow || event.origin !== location.origin) return;
    if (event.data?.type === 'lidar-exhibit:loaded') notify();
    if (event.data?.type === 'lidar-exhibit:error')
      host.dispatchEvent(new CustomEvent('chapter:error', { bubbles: true, detail: new Error('雷达模型载入失败，请重试') }));
  };
  window.addEventListener('message', onMessage);
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    observer.disconnect();
    host.style.removeProperty('padding-top');
    window.removeEventListener('message', onMessage);
    frame.remove();
  };
  return Object.assign(dispose, {
    dispose,
    setActive(value: boolean) {
      if (disposed) return;
      active = value;
      resize();
      if (active && !loaded) {
        loaded = true;
        frame.src = `${import.meta.env.BASE_URL}lidar/index.html?quality=${getQualityPreference()}`;
      }
      notify();
    },
  });
}
