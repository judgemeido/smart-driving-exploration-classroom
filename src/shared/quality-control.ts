import { getQualityPreference, setQualityPreference, watchQuality, type QualityPreference } from './performance';

/** Both entry points use the same labels, saved preference and effective version. */
export function bindQualityControl(select: HTMLSelectElement) {
  const change = () => setQualityPreference(select.value as QualityPreference);
  select.addEventListener('change', change);
  const stop = watchQuality(profile => {
    select.value = getQualityPreference();
    select.options[0].textContent = `自动 · ${profile.low ? '低配版' : '标准版'}`;
    select.title = profile.low
      ? '当前为低配版：降低渲染分辨率与光影负担，保留全部内容和交互。'
      : '当前为标准版：更高的渲染分辨率和完整光影。自动模式在持续卡顿时切换低配版。';
  });
  return () => { stop(); select.removeEventListener('change', change); };
}
