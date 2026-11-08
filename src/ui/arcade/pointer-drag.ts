export function bindPointerDrag(
  host: HTMLElement,
  options: {
    resolveItem: (element: Element) => string | null;
    resolveTarget: (clientX: number, clientY: number) => string | null;
    preview: (itemId: string, targetId: string | null) => void;
    commit: (itemId: string, targetId: string) => void;
    cancel: () => void;
  },
): () => void {
  let drag: {
    id: number;
    item: string;
    x: number;
    y: number;
    threshold: number;
    started: boolean;
    target: string | null;
    handle: Element;
  } | null = null;
  let suppressClick = false;
  const cancel = () => {
    if (!drag) return;
    const old = drag;
    drag = null;
    if (old.handle.hasPointerCapture?.(old.id)) old.handle.releasePointerCapture(old.id);
    options.cancel();
  };
  const down = (event: PointerEvent) => {
    if (event.button !== 0 || !event.isPrimary || !(event.target instanceof Element)) return;
    const item = options.resolveItem(event.target);
    if (!item) return;
    drag = {
      id: event.pointerId,
      item,
      x: event.clientX,
      y: event.clientY,
      threshold: event.pointerType === 'touch' ? 10 : 6,
      started: false,
      target: null,
      handle: event.target,
    };
    event.target.setPointerCapture?.(event.pointerId);
  };
  const move = (event: PointerEvent) => {
    if (!drag || drag.id !== event.pointerId) return;
    if (!drag.started && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < drag.threshold) return;
    drag.started = true;
    drag.target = options.resolveTarget(event.clientX, event.clientY);
    options.preview(drag.item, drag.target);
  };
  const up = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.id) return;
    const old = drag;
    drag = null;
    if (old.handle.hasPointerCapture?.(old.id)) old.handle.releasePointerCapture(old.id);
    if (!old.started) return;
    const target = options.resolveTarget(event.clientX, event.clientY);
    suppressClick = true;
    setTimeout(() => {
      suppressClick = false;
    }, 0);
    if (target) options.commit(old.item, target);
    else options.cancel();
  };
  const click = (event: MouseEvent) => {
    if (suppressClick) {
      event.preventDefault();
      event.stopImmediatePropagation();
      suppressClick = false;
    }
  };
  const key = (event: KeyboardEvent) => {
    if (event.key === 'Escape') cancel();
  };
  host.addEventListener('pointerdown', down);
  host.addEventListener('pointermove', move);
  host.addEventListener('pointerup', up);
  host.addEventListener('pointercancel', cancel);
  host.addEventListener('lostpointercapture', cancel);
  host.addEventListener('click', click, true);
  window.addEventListener('blur', cancel);
  window.addEventListener('keydown', key);
  return () => {
    cancel();
    host.removeEventListener('pointerdown', down);
    host.removeEventListener('pointermove', move);
    host.removeEventListener('pointerup', up);
    host.removeEventListener('pointercancel', cancel);
    host.removeEventListener('lostpointercapture', cancel);
    host.removeEventListener('click', click, true);
    window.removeEventListener('blur', cancel);
    window.removeEventListener('keydown', key);
  };
}
