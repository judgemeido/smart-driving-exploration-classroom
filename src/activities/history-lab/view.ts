import { energyPlans, futureClaims, historyLabContent, moduleById, type Module } from './content';
import { currentObjective, unicodeLength, type HistoryLabState } from './state';
import { futureGeometry,mechanismGlyph,wagonGeometry } from './graphics';
import { getNeedTrayIds,getFutureClaimGroups } from './tray';
export const escapeText=(value:string)=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const moduleButton=(module:{id:string;label:string;kind?:string})=>`<button type="button" class="hl-module" data-hl-module="${module.id}" aria-pressed="false">${mechanismGlyph(module.kind??'process')}<span>${escapeText(module.label)}</span></button>`;
function slot(id:string,label:string){return `<div class="hl-relation"><span class="hl-relation-label">${label}</span><button type="button" class="hl-slot" data-hl-slot="${id}" aria-label="${label}，尚未放入"><span class="hl-slot-symbol" aria-hidden="true">＋</span><span data-hl-slot-copy>放入模块</span></button><span class="hl-path-label" data-hl-path="${id}"></span></div>`;}
export function renderStage(root:HTMLElement,state:HistoryLabState){
  const phase=state.stage==='timeline'?'时间轨道':state.stage==='needs'?'需求装配':'未来说明卡';
  root.innerHTML=`<div class="hl-stage-heading"><h2 tabindex="-1" data-hl-heading>${phase}</h2><span class="hl-stage-progress">${state.stage==='timeline'?'1':state.stage==='needs'?'2':'3'} / 3</span><button class="hl-text-button" type="button" data-hl-reading>展品资料</button></div><div class="hl-workbench"><div class="hl-workspace" data-hl-workspace></div><aside class="hl-evidence" aria-label="操作证据"><h3>这一站的证据</h3><p data-hl-evidence></p><p class="hl-selection" data-hl-selection>未选择物体</p><button class="hl-text-button" type="button" data-hl-cancel hidden>取消选择</button><p class="hl-feedback" role="status" aria-live="polite" data-hl-feedback></p><button class="hl-text-button hl-hint" type="button" data-hl-hint>给我这一步的答案提示</button><span class="hl-small">使用答案提示后，仍可完成本项目标。</span></aside></div><section class="hl-tool-tray" aria-label="当前工具" data-hl-tools></section><div class="hl-action-bar"><p data-hl-action-note></p><button type="button" class="hl-primary" data-hl-primary>检查轨道</button></div>`;
  const workspace=root.querySelector<HTMLElement>('[data-hl-workspace]')!;
  const tools=root.querySelector<HTMLElement>('[data-hl-tools]')!;
  if(state.stage==='timeline'){
    workspace.innerHTML=`<ol class="hl-track" data-hl-track aria-label="五站时间轨道">${state.timelineOrder.map((id,index)=>{
      const event=historyLabContent.events.find(e=>e.id===id)!;
      return `<li class="hl-track-station" data-hl-station="${id}"><button type="button" class="hl-event" data-hl-event="${id}" aria-pressed="false"><strong>${event.year}</strong><span>${event.label}</span>${wagonGeometry}</button><button class="hl-place" type="button" data-hl-place="${index}" aria-label="放到第 ${index+1} 站">第 ${index+1} 站</button></li>`;
    }).join('')}</ol><p class="hl-caption">馆内的五个发展片段 · 从早到晚连接</p>`;
    tools.innerHTML='<p><strong>移动一节，其他节顺次让位。</strong> 点击或按 Enter 选中事件，再点它要去的站位；也可以拖动。</p>';
  }else if(state.stage==='needs'){
    const task=historyLabContent.needs[state.round];
    workspace.innerHTML=`<h3 class="hl-task-title">${task.title}</h3><div class="hl-mechanism hl-mechanism-${state.round}" data-hl-mechanism>${task.slots.map(s=>slot(s.id,s.label)).join('<span class="hl-arrow" aria-hidden="true">→</span>')}</div><div class="hl-run-path" data-hl-run-path aria-hidden="true"><span></span></div><p class="hl-causal-note" data-hl-causal-note></p>${state.round===1?`<fieldset class="hl-energy-plans"><legend>选择一种方案探索</legend>${energyPlans.map(p=>`<button type="button" data-hl-plan="${p.id}" aria-pressed="${state.energyPlan===p.id}">${p.label}</button>`).join('')}</fieldset><p class="hl-small">三条方案并存，共同完成一个目标。混动为组合示意，不代表所有混动车型的同一种内部结构。</p>`:''}`;
    const ids=getNeedTrayIds(task,state.profile,state.energyPlan);
    tools.innerHTML=`<p class="hl-tool-instruction">选择模块，再放到图中的关系槽。</p><div class="hl-modules" data-hl-need-modules data-plan="${state.energyPlan}">${ids.map(id=>moduleButton(moduleById(id)!)).join('')}</div>`;
  }else{
    workspace.innerHTML=`${futureGeometry}<div class="hl-future-slots">${slot('future-who','帮助谁')}${slot('future-ability','需要哪种能力')}${slot('future-condition','还需要什么条件')}</div><p class="hl-explanation" data-hl-explanation></p><div class="hl-reason-area"><label for="hl-reason">我的理由 <span class="hl-small">（可选，0–120字）</span></label><textarea id="hl-reason" rows="2" data-hl-reason aria-describedby="hl-reason-count"></textarea><span class="hl-small" id="hl-reason-count" data-hl-reason-count>0 / 120 字</span><label class="hl-omit"><input type="checkbox" data-hl-omit>不附理由</label></div>`;
    tools.innerHTML=`<p class="hl-tool-instruction">先装入能力。四种价值没有排名；再点关系槽，只看这一组材料。可取消选择或直接换槽。</p><div class="hl-modules hl-abilities">${futureClaims.map(c=>moduleButton(c)).join('')}</div><div class="hl-claims" data-hl-claims></div>`;
  }
  updateStage(root,state);
}
export function updateStage(root:HTMLElement,state:HistoryLabState){
  const objective=currentObjective(state),done=state.completed.includes(objective);
  root.dataset.stage=state.stage;root.dataset.completed=String(done);
  root.querySelector<HTMLElement>('[data-hl-feedback]')!.textContent=state.feedback;
  root.querySelector<HTMLElement>('[data-hl-feedback]')!.dataset.error=String(state.errorIds.length>0);
  const evidence=root.querySelector<HTMLElement>('[data-hl-evidence]')!;
  evidence.textContent=state.stage==='timeline'?'年份印在每节事件上。先找最早的一节，轨道会保留你的每次调整。':state.stage==='needs'?`当前装配 ${state.round+1} / 3。验证的是整条关系，空槽可以继续补齐。`:'三槽组成一句解释。理由不参与评分，空白也可完成。';
  const primary=root.querySelector<HTMLButtonElement>('[data-hl-primary]')!;
  primary.textContent=done?(state.stage==='timeline'?'去解决需求':state.stage==='needs'?(state.round===2?'制作未来说明卡':'继续下一项需求'):'说明卡已保存'):(state.stage==='timeline'?'检查轨道':state.stage==='needs'?'试运行方案':'保存说明卡');
  root.querySelector<HTMLElement>('[data-hl-action-note]')!.textContent=done?'已验证 · 正确关系已固定，可以回看。':'检查前可随时调整；一次只指出一个可修正位置。';
  root.querySelector<HTMLButtonElement>('[data-hl-hint]')!.disabled=done;
  root.querySelectorAll<HTMLButtonElement>('[data-hl-event],[data-hl-slot],[data-hl-plan],[data-hl-module]').forEach(button=>{button.disabled=done;});
  if(state.stage==='timeline'){
    const track=root.querySelector<HTMLElement>('[data-hl-track]')!;
    const active=document.activeElement as HTMLElement|null;
    state.timelineOrder.forEach((id,index)=>{
      const station=root.querySelector<HTMLElement>(`[data-hl-station="${id}"]`)!;
      // Move only changed nodes. Identity and focus survive repeated insertions.
      if(track.children[index]!==station)track.insertBefore(station,track.children[index]??null);
      const target=station.querySelector<HTMLButtonElement>('[data-hl-place]')!;target.dataset.hlPlace=String(index);target.setAttribute('aria-label',`放到第 ${index+1} 站`);target.textContent=`第 ${index+1} 站`;target.disabled=done;
      station.querySelector<HTMLElement>('[data-hl-event]')!.dataset.error=String(state.errorIds.includes(id));
    });
    if(active&&root.contains(active)&&document.activeElement!==active)active.focus({preventScroll:true});
  }else{
    root.querySelectorAll<HTMLButtonElement>('[data-hl-slot]').forEach(button=>{
      const id=button.dataset.hlSlot!,module=moduleById(state.slots[id]);
      const group=futureClaims.find(c=>c.id===state.futureChoice);
      const claim=futureClaims.flatMap(c=>[...c.who,c.condition]).find(c=>c.id===state.slots[id]);
      const label=id==='future-ability'?group?.label:module?.label??claim?.label;
      button.dataset.error=String(state.errorIds.includes(id));
      button.classList.toggle('is-filled',Boolean(label));
      const symbol=button.querySelector<HTMLElement>('.hl-slot-symbol')!;
      symbol.innerHTML=module?mechanismGlyph((module as Module).kind):label?'<svg viewBox="0 0 80 64" class="hl-glyph" aria-hidden="true"><path d="m20 32 14 14 27-30" fill="none" stroke="currentColor" stroke-width="4"/></svg>':'＋';
      button.querySelector<HTMLElement>('[data-hl-slot-copy]')!.textContent=label??'放入模块';
      const heading=button.closest('.hl-relation')!.querySelector('.hl-relation-label')!.textContent;
      button.setAttribute('aria-label',`${heading}，${label??'尚未放入'}`);
    });
    if(state.stage==='needs'){
      if(state.round===1){
        const tray=root.querySelector<HTMLElement>('[data-hl-need-modules]')!;
        if(tray.dataset.plan!==state.energyPlan){tray.dataset.plan=state.energyPlan;tray.innerHTML=getNeedTrayIds(historyLabContent.needs[state.round],state.profile,state.energyPlan).map(id=>moduleButton(moduleById(id)!)).join('');}
      }
      root.querySelectorAll<HTMLElement>('[data-hl-plan]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.hlPlan===state.energyPlan)));
      const note=root.querySelector<HTMLElement>('[data-hl-causal-note]')!;
      note.textContent=done?(state.round===0?'半成品沿工位前进：分工与连续协作建立了流程。':state.round===1?'来源 → 转化 → 运动。还要考虑能源来源、制造和使用条件。':'道路信息 → 计算分析 → 合适行动。观察设备不能单独保证安全。'):'装入模块后，试运行会沿这条路径检查关系。';
    }else{
      const group=futureClaims.find(c=>c.id===state.futureChoice);
      const tray=root.querySelector<HTMLElement>('[data-hl-claims]')!;
      if(tray.dataset.choice!==state.futureChoice){
        tray.dataset.choice=state.futureChoice;
        tray.innerHTML=getFutureClaimGroups(state.futureChoice).map(claimGroup=>`<section class="hl-claim-group" data-hl-claim-group="${claimGroup.slotId}" aria-label="${claimGroup.label}"><h3>${claimGroup.label}</h3><div class="hl-modules">${claimGroup.cards.map(c=>moduleButton(c)).join('')}</div></section>`).join('');
      }
      const who=futureClaims.flatMap(c=>c.who).find(c=>c.id===state.slots['future-who']);
      const condition=futureClaims.map(c=>c.condition).find(c=>c.id===state.slots['future-condition']);
      root.querySelector<HTMLElement>('[data-hl-explanation]')!.textContent=`为了帮助${who?.label??'……'}，我选择${group?.label??'……'}，还需要${condition?.label??'……'}。`;
      const reason=root.querySelector<HTMLTextAreaElement>('[data-hl-reason]')!;if(reason.value!==state.reason)reason.value=state.reason;
      reason.disabled=done;reason.setAttribute('aria-invalid',String(state.errorIds.includes('reason')));
      root.querySelector<HTMLElement>('[data-hl-reason-count]')!.textContent=`${unicodeLength(state.reason)} / 120 字${state.omitReason?' · 全文保留，本次不附':''}`;
      const omit=root.querySelector<HTMLInputElement>('[data-hl-omit]')!;omit.checked=state.omitReason;omit.disabled=done;
      if(state.completed.length===5&&!root.querySelector('[data-hl-outcome]')){
        const outcome=document.createElement('section');outcome.className='hl-outcome';outcome.dataset.hlOutcome='';
        const title=document.createElement('h3');title.textContent='我完成的进化研究';outcome.append(title);
        const track=document.createElement('p');track.textContent=state.timelineOrder.map(id=>historyLabContent.events.find(event=>event.id===id)!.year).join(' → ');outcome.append(track);
        for(const need of historyLabContent.needs){const line=document.createElement('p');line.textContent=`${need.title}：${need.slots.map(slot=>moduleById(state.slots[slot.id])?.label??'未完成').join(' → ')}`;outcome.append(line);}
        const explanation=document.createElement('p');explanation.textContent=root.querySelector('[data-hl-explanation]')!.textContent;outcome.append(explanation);
        const reasonSummary=document.createElement('p');reasonSummary.textContent=state.omitReason?'本次不附理由。':state.reason?`我的理由：${state.reason}`:'没有附加理由，说明关系仍然成立。';outcome.append(reasonSummary);
        root.append(outcome);
      }
    }
  }
}
