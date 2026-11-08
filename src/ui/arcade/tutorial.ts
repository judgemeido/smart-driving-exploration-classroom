/** An isolated, unscored interaction rehearsal. No session, facts or storage. */
export function mountArcadeTutorial(host: HTMLElement): () => void {
  let selected = false;
  let connected = false;
  host.innerHTML = `<section class="arcade-tutorial-experiment" data-tutorial-experiment aria-label="不计分的接线练习"><h3>先试一下，让台灯亮起来</h3><svg viewBox="0 0 400 120" role="img" aria-label="电源、导线和台灯组成的简单回路"><path d="M45 70H170V95H320V70" fill="none" stroke="#6e8298" stroke-width="3"/><rect x="20" y="45" width="50" height="40" rx="4" fill="#2457d6"/><path d="M38 58h14m-7-7v14M38 74h14" stroke="white" stroke-width="2"/><g data-tutorial-lamp data-lit="false"><path d="M285 58L305 20H335L355 58Z" fill="#e7edf5" stroke="#183153" stroke-width="2"/><path d="M320 58v33m-25 4h50" stroke="#183153" stroke-width="3"/></g><path data-tutorial-wire d="M70 65H275" fill="none" stroke="#6e8298" stroke-width="3" stroke-dasharray="6 5"/></svg><div class="arcade-start-actions"><button type="button" data-rehearsal-lead aria-pressed="false">电源线头</button><button type="button" data-rehearsal-port>台灯插口</button><button type="button" data-rehearsal-cancel>取消选择</button></div><p data-rehearsal-feedback role="status">先点电源线头，再点台灯插口。这里只练操作，不计时、不计分。</p></section>`;
  const lead = host.querySelector<HTMLButtonElement>('[data-rehearsal-lead]')!;
  const lamp = host.querySelector<SVGGElement>('[data-tutorial-lamp]')!;
  const message = host.querySelector<HTMLElement>('[data-rehearsal-feedback]')!;
  const wire = host.querySelector<SVGPathElement>('[data-tutorial-wire]')!;
  function paint() {
    lead.setAttribute('aria-pressed', String(selected));
    lamp.dataset.lit = String(connected);
    lamp.querySelector('path')!.setAttribute('fill', connected ? '#f6c85f' : '#e7edf5');
    wire.setAttribute('stroke', connected ? '#2457d6' : '#6e8298');
    wire.setAttribute('stroke-dasharray', connected ? 'none' : '6 5');
  }
  const click = (event: MouseEvent) => {
    const target = (event.target as Element).closest('button');
    if (target?.hasAttribute('data-rehearsal-lead')) {
      selected = true;
      message.textContent = '线头已选中。再点台灯插口；Escape 或取消选择可以放下。';
    } else if (target?.hasAttribute('data-rehearsal-port')) {
      if (selected) {
        connected = true;
        selected = false;
        message.textContent = '回路接通，台灯亮了。活动里也可以先选物体，再点落点。';
      } else message.textContent = '先选择电源线头，再点台灯插口。';
    } else if (target?.hasAttribute('data-rehearsal-cancel')) {
      selected = false;
      connected = false;
      message.textContent = '选择已取消。可以重新接线，操作不会留下错误。';
    }
    paint();
  };
  const key = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && selected) {
      event.preventDefault();
      event.stopPropagation();
      selected = false;
      message.textContent = '选择已取消，可以重新接线。';
      paint();
      lead.focus();
    }
  };
  host.addEventListener('click', click);
  host.addEventListener('keydown', key);
  return () => {
    host.removeEventListener('click', click);
    host.removeEventListener('keydown', key);
  };
}
