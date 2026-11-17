// Compatibility entry for existing integrations. New app uses the chapter registry.
import { mount, type LidarExplorerController } from './chapters/lidar/controller';
export type { LidarExplorerController } from './chapters/lidar/controller';

export function setupLidarExplorer(host: HTMLElement): LidarExplorerController {
  if (!host.querySelector('[data-lidar-exhibit-host]')) {
    const dispose = () => {};
    return Object.assign(dispose, { dispose, setActive: () => {} });
  }
  const controller = mount(host);
  try {
    controller.setActive(true);
    return controller;
  } catch (error) {
    controller.dispose();
    throw error;
  }
}
