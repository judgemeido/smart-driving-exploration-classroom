export function createActivityDrawer(
  trigger: HTMLButtonElement,
  dialog: HTMLDialogElement,
): { dispose(): void } {
  let previousOverflow = '';
  const open = () => {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    trigger.setAttribute('aria-expanded', 'true');
  };
  const close = () => {
    document.body.style.overflow = previousOverflow;
    trigger.setAttribute('aria-expanded', 'false');
    trigger.focus();
  };
  const click = (event: MouseEvent) => {
    if ((event.target as Element).closest('[data-drawer-close]')) dialog.close();
  };
  trigger.addEventListener('click', open);
  dialog.addEventListener('close', close);
  dialog.addEventListener('click', click);
  return {
    dispose() {
      trigger.removeEventListener('click', open);
      dialog.removeEventListener('close', close);
      dialog.removeEventListener('click', click);
      if (dialog.open) {
        dialog.close();
        document.body.style.overflow = previousOverflow;
      }
    },
  };
}
