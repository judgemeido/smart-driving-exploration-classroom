import { archiveAssets, historyExhibits } from './data';
import { renderArchive, renderTimeline } from './render';
import { createScope } from '../../shared/lifecycle';
import type { ChapterController } from '../../app/types';

/** The gallery owns exhibits and year navigation; learning runs on its independent page. */
export function mount(host: HTMLElement): ChapterController {
  const scope=createScope();let active=true,disposed=false;
  const timeline=host.querySelector<HTMLElement>('[data-history-timeline]');
  if(timeline)timeline.innerHTML=renderTimeline(historyExhibits);
  const archive=host.querySelector<HTMLElement>('[data-history-archive-list]');
  if(archive)archive.innerHTML=renderArchive(historyExhibits,archiveAssets);
  scope.listen(host,'click',(event:MouseEvent)=>{
    if(!active||!(event.target instanceof Element))return;
    const button=event.target.closest<HTMLButtonElement>('[data-timeline-target]');
    if(!button||!host.contains(button))return;
    host.querySelectorAll('[data-timeline-target]').forEach(item=>item.classList.toggle('is-selected',item===button));
    const article=[...host.querySelectorAll<HTMLElement>('[data-archive-article]')].find(item=>item.id===button.dataset.timelineTarget);
    article?.scrollIntoView({behavior:'smooth',block:'start'});
  });
  return {
    setActive(value){if(!disposed)active=value;},
    dispose(){if(disposed)return;disposed=true;active=false;scope.dispose();},
  };
}
