import type { WebGLRenderer } from 'three';
import { getQualityProfile, renderPixelRatio, watchQuality } from './performance';

export function rendererOptions() {
  const { low } = getQualityProfile();
  return { antialias: !low, powerPreference: low ? 'low-power' as const : 'default' as const };
}
export function resizeRenderer(renderer: WebGLRenderer, width: number, height: number) {
  const profile = getQualityProfile();
  const ratio = renderPixelRatio(width, height, window.devicePixelRatio || 1, profile);
  if (renderer.getPixelRatio() !== ratio) renderer.setPixelRatio(ratio);
  renderer.setSize(width, height, false);
  renderer.domElement.dataset.renderQuality = profile.low ? 'low' : 'high';
}
export function watchRendererQuality(renderer: WebGLRenderer, resize: () => void, shadows = false) {
  return watchQuality(profile => {
    renderer.shadowMap.enabled = shadows && profile.shadows;
    resize();
  });
}
