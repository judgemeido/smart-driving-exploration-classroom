import type { ChapterController } from '../../app/types';
import type { ArcadeSession, ArcadeRunConfig } from '../../shared/arcade/types';
import { historyLabContent, moduleById, futureClaims } from './content';
import { getHistorySource } from './source';
import { createHistoryLabState,currentObjective,type HistoryAction } from './state';
import { applyHistoryAction } from './transaction';
import { escapeText, renderStage, updateStage } from './view';
import { updateHistoryControlStates } from './control-state';

export interface HistoryGameContext {host:HTMLElement;session:ArcadeSession;config:ArcadeRunConfig;seed:number;setGoal(text:string):void;setFeedback(text:string):void}
interface Drag {id:string;pointerId:number;x:number;y:number;started:boolean;target:number|null;origin:HTMLButtonElement;ghost:HTMLElement|null}
export function createHistoryGame(context:HistoryGameContext):ChapterController {
  const {host,session}=context;
  let state=createHistoryLabState({profile:context.config.profile,seed:context.seed});
  let active=true,disposed=false,selection:string|null=null,selectedSlot:string|null=null,drag:Drag|null=null,preventClick=false,composing=false;
  host.innerHTML='<section class="history-lab" aria-label="进化修复站操作桌"></section>';
  const root=host.querySelector<HTMLElement>('.history-lab')!;
  const abort=new AbortController();const {signal}=abort;
  function goal(){return state.stage==='timeline'?'把五节事件按年份从早到晚连起来':state.stage==='needs'?historyLabContent.needs[state.round].goal:'装出帮助对象、能力与条件的说明卡';}
  function paint(fresh=false){
    if(fresh)renderStage(root,state);else updateStage(root,state);
    context.setGoal(goal());
    paintSelection();
    updateHistoryControlStates(root,state,active);
  }
  function dispatch(action:HistoryAction){
    if(!active||disposed)return;
    const before=state;state=applyHistoryAction(state,action,facts=>session.record(facts));
    if(before===state)return;
    const fresh=state.stage!==before.stage||state.round!==before.round;
    if(fresh||action.type==='move-event'||action.type==='place-module'||action.type==='place-claim'||action.type==='choose-future'){selection=null;selectedSlot=null;}
    paint(fresh);
    if(action.type==='check'||action.type==='hint'||fresh)context.setFeedback(state.feedback);
    if(fresh)root.querySelector<HTMLElement>('[data-hl-heading]')?.focus({preventScroll:true});
  }
  function selectedLabel(){return historyLabContent.events.find(e=>e.id===selection)?.year??moduleById(selection??undefined)?.label??futureClaims.flatMap(c=>[c,...c.who,c.condition]).find(c=>c.id===selection)?.label??'';}
  function paintSelection(){
    root.querySelectorAll<HTMLButtonElement>('[data-hl-event],[data-hl-module]').forEach(button=>button.setAttribute('aria-pressed',String((button.dataset.hlEvent??button.dataset.hlModule)===selection)));
    const slotLabel=selectedSlot==='future-who'?'帮助谁':selectedSlot==='future-condition'?'成立条件':'需要哪种能力';
    root.querySelector<HTMLElement>('[data-hl-selection]')!.textContent=selection?`已拿起：${selectedLabel()}。选择落点，或按 Escape 取消。`:selectedSlot?`正在填写“${slotLabel}”。选择这一组材料，再点原槽放入；可取消或直接换槽。`:'未选择物体';
    root.querySelector<HTMLElement>('[data-hl-cancel]')!.hidden=!selection&&!selectedSlot;
    root.querySelectorAll<HTMLElement>('[data-hl-place]').forEach(button=>{button.classList.toggle('is-ready',Boolean(selection));button.textContent=selection?`放到第 ${Number(button.dataset.hlPlace)+1} 站`:`第 ${Number(button.dataset.hlPlace)+1} 站`;});
    root.querySelectorAll<HTMLElement>('[data-hl-slot]').forEach(button=>{button.classList.toggle('is-ready',Boolean(selection)||selectedSlot===button.dataset.hlSlot);});
    root.querySelectorAll<HTMLElement>('[data-hl-claim-group]').forEach(group=>{group.hidden=Boolean(selectedSlot&&selectedSlot!==group.dataset.hlClaimGroup);});
    const abilities=root.querySelector<HTMLElement>('.hl-abilities');if(abilities)abilities.hidden=Boolean(selectedSlot&&selectedSlot!=='future-ability');
  }
  function cancelSelection(returnFocus=true){const id=selection??selectedSlot;selection=null;selectedSlot=null;paintSelection();if(returnFocus&&id)root.querySelector<HTMLElement>(`[data-hl-event="${id}"],[data-hl-module="${id}"],[data-hl-slot="${id}"]`)?.focus({preventScroll:true});}
  function applySelected(slot:string){
    if(!selection){if(state.stage==='future'){selectedSlot=slot;paintSelection();}return;}
    if(state.stage==='timeline')dispatch({type:'move-event',cardId:selection,toIndex:Number(slot)});
    else if(state.stage==='needs')dispatch({type:'place-module',slotId:slot,moduleId:selection});
    else if(slot==='future-ability')dispatch({type:'choose-future',choiceId:selection});
    else dispatch({type:'place-claim',slotId:slot,cardId:selection});
  }
  function readSources(){
    const previous=document.activeElement as HTMLElement|null;
    const dialog=document.createElement('dialog');dialog.className='hl-source-dialog';
    dialog.innerHTML=`<div class="hl-dialog-head"><h2>展品资料</h2><button type="button" class="hl-text-button" data-hl-close>关闭资料</button></div><p>这些是馆内的五个发展片段，不代表完整的世界汽车史。</p>${getHistorySource().learning.contextCards.map(card=>`<article><h3>${escapeText(card.title)}</h3><p>${escapeText(card.copy)}</p>${card.note?`<p>${escapeText(card.note)}</p>`:''}</article>`).join('')}<details><summary>查看事件与对应展品</summary>${historyLabContent.events.map(event=>{const exhibit=getHistorySource().exhibits.find(e=>e.id===event.sourceExhibitId);return `<p><strong>${event.year}</strong> · ${escapeText(event.label)}${exhibit?`<br>来源：${escapeText(exhibit.title)}`:''}</p>`;}).join('')}</details>`;
    document.body.append(dialog);const oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
    function close(){dialog.close();}
    dialog.querySelector('[data-hl-close]')!.addEventListener('click',close,{signal});
    dialog.addEventListener('close',()=>{document.body.style.overflow=oldOverflow;dialog.remove();previous?.focus({preventScroll:true});},{once:true});
    dialog.showModal();dialog.querySelector<HTMLElement>('[data-hl-close]')!.focus();
  }
  root.addEventListener('click',event=>{
    if(disposed||composing)return;
    const button=(event.target as Element).closest<HTMLButtonElement>('button');if(!button||button.disabled)return;
    if(button.hasAttribute('data-hl-reading')){readSources();return;}
    if(!active)return;
    if(preventClick){preventClick=false;return;}
    const id=button.dataset.hlEvent??button.dataset.hlModule;
    if(id){selection=selection===id?null:id;paintSelection();return;}
    if(button.hasAttribute('data-hl-place')){applySelected(button.dataset.hlPlace!);return;}
    if(button.hasAttribute('data-hl-slot')){applySelected(button.dataset.hlSlot!);return;}
    if(button.hasAttribute('data-hl-cancel')){cancelSelection();return;}
    if(button.hasAttribute('data-hl-plan')){selection=null;dispatch({type:'select-energy-plan',planId:button.dataset.hlPlan!});return;}
    if(button.hasAttribute('data-hl-primary')){dispatch({type:state.completed.includes(currentObjective(state))?'continue':'check'});return;}
    if(button.hasAttribute('data-hl-hint')){dispatch({type:'hint'});return;}
    if(button.hasAttribute('data-hl-reading'))readSources();
  },{signal});
  root.addEventListener('keydown',event=>{if(event.key==='Escape'){cancelDrag();cancelSelection();event.preventDefault();}},{signal});
  root.addEventListener('compositionstart',()=>{composing=true;},{signal});
  root.addEventListener('compositionend',event=>{composing=false;if(event.target instanceof HTMLTextAreaElement)dispatch({type:'edit-reason',value:event.target.value});},{signal});
  root.addEventListener('input',event=>{if(!composing&&event.target instanceof HTMLTextAreaElement)dispatch({type:'edit-reason',value:event.target.value});},{signal});
  root.addEventListener('change',event=>{if(event.target instanceof HTMLInputElement&&event.target.hasAttribute('data-hl-omit'))dispatch({type:'omit-reason'});},{signal});
  function cancelDrag(){
    if(!drag)return;const old=drag;drag=null;old.ghost?.remove();
    root.querySelectorAll<HTMLElement>('[data-hl-station]').forEach(station=>{station.style.transform='';station.removeAttribute('data-preview');});
    old.origin.classList.remove('is-dragging');
    if(old.origin.hasPointerCapture?.(old.pointerId))old.origin.releasePointerCapture(old.pointerId);
  }
  root.addEventListener('pointerdown',event=>{
    const origin=(event.target as Element).closest<HTMLButtonElement>('[data-hl-event]');if(!active||!origin||origin.disabled||event.button!==0)return;
    cancelDrag();drag={id:origin.dataset.hlEvent!,pointerId:event.pointerId,x:event.clientX,y:event.clientY,started:false,target:null,origin,ghost:null};
    try { origin.setPointerCapture?.(event.pointerId); } catch { /* Synthetic cancellation tests have no native capture. */ }
  },{signal});
  root.addEventListener('pointermove',event=>{
    if(!drag||drag.pointerId!==event.pointerId)return;
    const threshold=event.pointerType==='touch'?10:6;
    if(!drag.started&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<threshold)return;
    if(!drag.started){drag.started=true;selection=drag.id;paintSelection();const box=drag.origin.getBoundingClientRect();drag.ghost=drag.origin.cloneNode(true) as HTMLElement;drag.ghost.classList.add('hl-drag-ghost');drag.ghost.removeAttribute('data-hl-event');drag.ghost.setAttribute('aria-hidden','true');drag.ghost.style.width=`${box.width}px`;document.body.append(drag.ghost);drag.origin.classList.add('is-dragging');}
    event.preventDefault();drag.ghost!.style.left=`${event.clientX-drag.origin.offsetWidth/2}px`;drag.ghost!.style.top=`${event.clientY-35}px`;
    const stations=[...root.querySelectorAll<HTMLElement>('[data-hl-station]')];
    // Layout boxes, rather than transformed previews, remain the target truth.
    const track=root.querySelector<HTMLElement>('[data-hl-track]')!;const vertical=getComputedStyle(track).flexDirection==='column';
    const boxes=stations.map(station=>{const box=station.getBoundingClientRect();const style=getComputedStyle(station);const matrix=new DOMMatrixReadOnly(style.transform==='none'?undefined:style.transform);return {x:box.x-matrix.m41,y:box.y-matrix.m42,width:box.width,height:box.height};});
    const target=boxes.findIndex(box=>event.clientX>=box.x-12&&event.clientX<=box.x+box.width+12&&event.clientY>=box.y-12&&event.clientY<=box.y+box.height+12);
    drag.target=target>=0?target:null;
    const from=state.timelineOrder.indexOf(drag.id);stations.forEach((station,index)=>{
      let shifted=index;if(target>=0){if(index===from)shifted=target;else if(from<target&&index>from&&index<=target)shifted=index-1;else if(from>target&&index>=target&&index<from)shifted=index+1;}
      const delta=vertical?boxes[shifted].y-boxes[index].y:boxes[shifted].x-boxes[index].x;
      station.style.transform=vertical?`translateY(${delta}px)`:`translateX(${delta}px)`;station.dataset.preview=String(target===index);
    });
  },{signal});
  root.addEventListener('pointerup',event=>{
    if(!drag||drag.pointerId!==event.pointerId)return;const old=drag;cancelDrag();
    if(old.started){preventClick=true;if(old.target!==null)dispatch({type:'move-event',cardId:old.id,toIndex:old.target});else cancelSelection(false);old.origin.focus({preventScroll:true});}
  },{signal});
  root.addEventListener('pointercancel',()=>{cancelDrag();cancelSelection(false);},{signal});
  root.addEventListener('lostpointercapture',()=>{if(drag){cancelDrag();cancelSelection(false);}},{signal});
  window.addEventListener('blur',()=>{cancelDrag();cancelSelection(false);},{signal});
  paint(true);
  return {
    setActive(value){active=value;if(!value){cancelDrag();cancelSelection(false);}paint();},
    dispose(){if(disposed)return;disposed=true;cancelDrag();abort.abort();document.querySelectorAll<HTMLDialogElement>('.hl-source-dialog').forEach(dialog=>dialog.close());host.replaceChildren();},
  };
}
