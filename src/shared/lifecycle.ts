import { getQualityProfile, reportRenderCost, reportFrameInterval } from './performance';

export function createScope() {
  const aborter = new AbortController();
  const cleanups: (() => void)[] = [];
  let disposed = false;
  const add = (cleanup: () => void) => {
    if (disposed) cleanup();
    else cleanups.push(cleanup);
  };
  return {
    signal: aborter.signal,
    add,
    listen<T extends Event>(
      target: EventTarget | null | undefined,
      type: string,
      handler: (event: T) => void,
      options?: boolean | AddEventListenerOptions,
    ) {
      if (!target || disposed) return;
      target.addEventListener(type, handler as EventListener, options);
      add(() => target.removeEventListener(type, handler as EventListener, options));
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      aborter.abort();
      for (const cleanup of cleanups.splice(0).reverse()) {
        try {
          cleanup();
        } catch (error) {
          console.error('Resource cleanup failed', error);
        }
      }
    },
  };
}

/** A single countdown that retains its remaining time on chapter/tab suspension. */
export function createPausableTimer() {
  let active = false;
  let disposed = false;
  let handle: ReturnType<typeof setTimeout> | undefined;
  let callback: (() => void) | undefined;
  let remaining = 0;
  let deadline = 0;
  function clear() {
    if (handle !== undefined) clearTimeout(handle);
    handle = undefined;
  }
  function arm() {
    if (!active || !callback || disposed) return;
    deadline = Date.now() + remaining;
    handle = setTimeout(() => {
      handle = undefined;
      const action = callback;
      callback = undefined;
      action?.();
    }, remaining);
  }
  return {
    schedule(action: () => void, milliseconds: number) {
      if (disposed) return;
      clear();
      callback = action;
      remaining = Math.max(0, milliseconds);
      arm();
    },
    cancel() {
      clear();
      callback = undefined;
    },
    setActive(value: boolean) {
      if (disposed || active === value) return;
      if (!value && handle !== undefined) {
        remaining = Math.max(0, deadline - Date.now());
        clear();
      }
      active = value;
      if (active) arm();
    },
    dispose() {
      disposed = true;
      clear();
      callback = undefined;
    },
  };
}

export function createAnimationLoop(
  renderer: { setAnimationLoop(callback: ((time: number) => void) | null): void },
  update: (deltaSeconds: number) => void,
  onError: (error: unknown) => void = (error) => console.error('Render loop failed', error),
) {
  let active = false;
  let disposed = false;
  let previous: number | undefined;
  let lastFrame: number | undefined;
  return {
    setActive(value: boolean) {
      if (disposed || active === value) return;
      active = value;
      previous = undefined;
      lastFrame = undefined;
      renderer.setAnimationLoop(
        value
          ? (time: number) => {
              const interval = 1000 / getQualityProfile().maxFps;
              if (lastFrame !== undefined && time - lastFrame < interval - 1) return;
              const frameInterval = lastFrame === undefined ? 0 : time - lastFrame;
              lastFrame = time;
              const delta =
                previous === undefined ? 0 : Math.max(0, Math.min((time - previous) / 1000, 0.05));
              previous = time;
              try {
                const started = performance.now();
                update(delta);
                reportRenderCost(performance.now() - started);
                if (frameInterval) reportFrameInterval(frameInterval);
              } catch (error) {
                active = false;
                renderer.setAnimationLoop(null);
                onError(error);
              }
            }
          : null,
      );
    },
    dispose() {
      disposed = true;
      active = false;
      renderer.setAnimationLoop(null);
    },
  };
}
