/** Shared by the museum, classroom and same-origin lidar iframe. No Three.js import. */
export type QualityPreference = 'auto' | 'low' | 'high';
export type QualityProfile = {
  low: boolean;
  maxFps: number;
  maxPixelRatio: number;
  maxPixels: number;
  shadows: boolean;
};
export const QUALITY_STORAGE_KEY = 'smart-driving:quality';
export const ADAPTIVE_STORAGE_KEY = 'smart-driving:auto-low';
export interface DeviceHints {
  cores?: number;
  memory?: number;
  saveData?: boolean;
  mobile?: boolean;
}
export function chooseQuality(preference: QualityPreference, hints: DeviceHints, slow = false): QualityProfile {
  const low = preference === 'low' || (preference === 'auto' &&
    (slow || hints.saveData === true || hints.mobile === true ||
      (hints.cores !== undefined && hints.cores <= 4) ||
      (hints.memory !== undefined && hints.memory <= 4)));
  return low
    ? { low, maxFps: 30, maxPixelRatio: 1, maxPixels: 600_000, shadows: false }
    : { low, maxFps: 60, maxPixelRatio: 1.5, maxPixels: 2_000_000, shadows: true };
}
export function renderPixelRatio(width: number, height: number, dpr: number, profile: QualityProfile) {
  return Math.min(Math.max(dpr || 1, 0.5), profile.maxPixelRatio,
    Math.sqrt(profile.maxPixels / Math.max(1, width * height)));
}
const valid = (value: unknown): value is QualityPreference => ['auto', 'low', 'high'].includes(value as string);
let preference: QualityPreference | undefined;
let slow: boolean | undefined;
let samples = 0;
let duration = 0;
let cadenceSamples = 0;
let slowFrames = 0;
const listeners = new Set<(profile: QualityProfile) => void>();
function hints(): DeviceHints {
  if (typeof navigator === 'undefined') return {};
  const device = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  return { cores: device.hardwareConcurrency || undefined, memory: device.deviceMemory,
    saveData: device.connection?.saveData,
    mobile: typeof matchMedia === 'function' && matchMedia('(pointer: coarse) and (max-width: 1024px)').matches };
}
export function getQualityPreference(): QualityPreference {
  if (preference) return preference;
  try {
    const query = new URLSearchParams(location.search).get('quality');
    const stored = localStorage.getItem(QUALITY_STORAGE_KEY);
    preference = valid(query) ? query : valid(stored) ? stored : 'auto';
  } catch { preference = 'auto'; }
  return preference;
}
export function getQualityProfile(): QualityProfile {
  if (slow === undefined) {
    try { slow = sessionStorage.getItem(ADAPTIVE_STORAGE_KEY) === 'true'; } catch { slow = false; }
  }
  return chooseQuality(getQualityPreference(), hints(), slow);
}
function publish() {
  const profile = getQualityProfile();
  if (typeof document !== 'undefined') document.documentElement.dataset.performanceQuality = profile.low ? 'low' : 'high';
  listeners.forEach(listener => listener(profile));
}
export function setQualityPreference(value: QualityPreference) {
  preference = value;
  slow = false;
  resetSamples();
  try { sessionStorage.removeItem(ADAPTIVE_STORAGE_KEY); } catch { /* In-memory adaptation works without storage. */ }
  try { localStorage.setItem(QUALITY_STORAGE_KEY, value); } catch { /* Session-only choice still works. */ }
  // A preview's ?quality=low must not override the user's later selection on refresh.
  try {
    const url = new URL(location.href);
    if (url.searchParams.has('quality')) {
      url.searchParams.delete('quality');
      history.replaceState(history.state, '', url);
    }
  } catch { /* Embedded or restricted contexts may not allow replacing history. */ }
  publish();
}
function resetSamples() { samples = duration = cadenceSamples = slowFrames = 0; }
function downgrade() {
  slow = true;
  resetSamples();
  try { sessionStorage.setItem(ADAPTIVE_STORAGE_KEY, 'true'); } catch { /* Keep the current document adaptive. */ }
  publish();
}
function onStorage(event: StorageEvent) {
  if (event.key === ADAPTIVE_STORAGE_KEY) slow = event.newValue === 'true';
  else if (event.key === QUALITY_STORAGE_KEY) {
    preference = valid(event.newValue) ? event.newValue : 'auto';
    slow = false;
  } else return;
  resetSamples();
  publish();
}
export function watchQuality(listener: (profile: QualityProfile) => void) {
  if (!listeners.size && typeof window !== 'undefined') window.addEventListener('storage', onStorage);
  listeners.add(listener);
  const profile = getQualityProfile();
  if (typeof document !== 'undefined') document.documentElement.dataset.performanceQuality = profile.low ? 'low' : 'high';
  listener(profile);
  return () => {
    listeners.delete(listener);
    if (!listeners.size && typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
  };
}
/** Ignore shader warm-up, then lower auto quality once if rendering is persistently costly. */
export function reportRenderCost(milliseconds: number) {
  if (getQualityPreference() !== 'auto' || getQualityProfile().low) return;
  samples++;
  if (samples <= 20) return;
  duration += milliseconds;
  if (samples < 65) return;
  if (duration / (samples - 20) > 22) { downgrade(); }
  samples = duration = 0;
}

/** Sustained slow frame delivery also catches stalls not reflected in CPU submission time. */
export function reportFrameInterval(milliseconds: number) {
  if (getQualityPreference() !== 'auto' || getQualityProfile().low) return;
  if (!Number.isFinite(milliseconds) || milliseconds <= 0 || milliseconds > 250) {
    cadenceSamples = slowFrames = 0;
    return;
  }
  cadenceSamples++;
  if (cadenceSamples <= 30) return; // Ignore loading and shader warm-up.
  if (milliseconds > 38) slowFrames++;
  if (cadenceSamples < 120) return;
  if (slowFrames >= 54) downgrade();
  cadenceSamples = slowFrames = 0;
}
