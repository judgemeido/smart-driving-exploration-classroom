import { expect,test,type Page } from '@playwright/test';
const order=['history-event-2001','history-event-2009','history-event-2015','history-event-2020','history-event-2026'];
async function start(page:Page){await page.goto('/games/history/');await page.getByRole('button',{name:'开始练习',exact:true}).click();await expect(page.locator('[data-hl-track]')).toBeVisible();}
async function press(page:Page,selector:string){await page.locator(selector).focus();await page.keyboard.press('Enter');}
async function sort(page:Page){for(const [toIndex,id] of order.entries()){await press(page,`[data-hl-event="${id}"]`);await press(page,`[data-hl-place="${toIndex}"]`);}await page.locator('[data-hl-primary]').click();}
async function place(page:Page,module:string,slot:string){await press(page,`[data-hl-module="${module}"]`);await press(page,`[data-hl-slot="${slot}"]`);}
async function next(page:Page){await page.locator('[data-hl-primary]').click();}
async function needs(page:Page,plan='battery'){
  await next(page);
  await place(page,'production-divide','production-step');await place(page,'production-cooperate','production-flow');await next(page);await next(page);
  await page.locator(`[data-hl-plan="energy-plan-${plan}"]`).click();
  await expect(page.locator('[data-hl-need-modules] [data-hl-module]')).toHaveCount(4);
  const source=plan==='battery'?'battery':plan==='hybrid'?'hybrid':'hydrogen';const convert=plan==='battery'?'motor':plan==='hybrid'?'hybrid':'fuelcell';
  await place(page,`energy-source-${source}`,'energy-source');await place(page,`energy-convert-${convert}`,'energy-conversion');await place(page,'energy-motion-wheel','energy-motion');await next(page);await next(page);
  await place(page,'road-radar','road-input');await place(page,'road-analysis','road-compute');await place(page,'road-action','road-response');await next(page);await next(page);
}
test('keyboard insertion preserves identity, locates errors, cancels selection and needs explicit continue',async({page})=>{
  await start(page);
  const before=await page.locator('[data-hl-event]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-hl-event')));
  await next(page);await expect(page.locator('[data-hl-feedback]')).toContainText('前面');
  await expect(page.locator('[data-hl-event][data-error="true"]')).toHaveCount(2);
  expect(await page.locator('[data-hl-event]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-hl-event')))).toEqual(before);
  const id=before[0]!;await press(page,`[data-hl-event="${id}"]`);await page.keyboard.press('Escape');await expect(page.locator(`[data-hl-event="${id}"]`)).toBeFocused();
  await sort(page);await expect(page.locator('[data-hl-track]')).toBeVisible();await expect(page.locator('[data-hl-primary]')).toHaveText('去解决需求');
  await expect(page.locator('[data-hl-event]')).toHaveCount(5);
});
for(const plan of ['battery','hybrid','hydrogen'])test(`assembles ${plan} chain and finishes a future card with optional reason`,async({page})=>{
  await start(page);await sort(page);await needs(page,plan);
  await press(page,'[data-hl-module="future-accessibility"]');await press(page,'[data-hl-slot="future-ability"]');
  await place(page,'future-accessibility-who-1','future-who');await place(page,'future-accessibility-condition','future-condition');
  await page.locator('[data-hl-reason]').fill('🚗'.repeat(121)+'<script>alert(1)</script>');await next(page);
  await expect(page.locator('[data-hl-feedback]')).toContainText('120');
  await expect(page.locator('[data-hl-reason]')).toHaveValue('🚗'.repeat(121)+'<script>alert(1)</script>');
  await page.getByLabel('不附理由').check();await next(page);
  await expect(page.locator('.arcade-outcome')).toHaveJSProperty('open',true);
  await expect(page.locator('[data-hl-feedback]')).toContainText('说明卡已保存');
  await expect(page.getByText('需要更方便上下车的人',{exact:false}).first()).toBeVisible();
});
test('reading is available on demand and closing the dialog restores its source focus',async({page})=>{
  await start(page);await page.locator('[data-hl-reading]').click();
  const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
  await expect(dialog.locator('article')).toHaveCount(5);await expect(dialog).toContainText('发电和电池制造');
  await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(page.locator('[data-hl-reading]')).toBeFocused();
});
test('future materials are grouped by role and slot selection narrows the tray with cancel recovery',async({page})=>{
  await start(page);await sort(page);await needs(page);
  await place(page,'future-energy','future-ability');
  await expect(page.locator('[data-hl-claim-group="future-who"]')).toContainText('帮助谁');
  await expect(page.locator('[data-hl-claim-group="future-condition"]')).toContainText('成立条件');
  await press(page,'[data-hl-slot="future-who"]');
  await expect(page.locator('[data-hl-claim-group="future-who"]')).toBeVisible();await expect(page.locator('[data-hl-claim-group="future-condition"]')).toBeHidden();
  await expect(page.locator('[data-hl-module]:visible')).toHaveCount(3);
  await press(page,'[data-hl-slot="future-condition"]');
  await expect(page.locator('[data-hl-claim-group="future-who"]')).toBeHidden();await expect(page.locator('[data-hl-module]:visible')).toHaveCount(2);
  await page.keyboard.press('Escape');await expect(page.locator('[data-hl-claim-group="future-who"]')).toBeVisible();
  await expect(page.locator('[data-hl-slot="future-condition"]')).toBeFocused();
  const size=await page.locator('[data-hl-primary]').evaluate(button=>parseFloat(getComputedStyle(button).fontSize));expect(size).toBeGreaterThanOrEqual(18);
});
test('pause and resume restores the primary action and editing while retaining verified locks',async({page})=>{
  await start(page);await page.locator('[data-pause]').click();
  await expect(page.locator('[data-hl-primary]')).toBeDisabled();
  await page.locator('[data-pause]').click();
  await expect(page.locator('[data-hl-primary]')).toBeEnabled();await expect(page.locator('[data-hl-event]').first()).toBeEnabled();
  await sort(page);await page.locator('[data-pause]').click();await page.locator('[data-pause]').click();
  await expect(page.locator('[data-hl-event]').first()).toBeDisabled();await expect(page.locator('[data-hl-primary]')).toBeEnabled();
  await needs(page);const reason=page.locator('[data-hl-reason]');await reason.fill('恢复以后仍能编辑。');
  await page.locator('[data-pause]').click();await expect(reason).toBeDisabled();await expect(page.locator('[data-hl-omit]')).toBeDisabled();
  await page.locator('[data-pause]').click();await expect(reason).toBeEnabled();await expect(page.locator('[data-hl-omit]')).toBeEnabled();await expect(reason).toHaveValue('恢复以后仍能编辑。');
  await expect(page.locator('[data-hl-reading]')).toBeEnabled();await expect(page.locator('[data-hl-primary]')).toBeEnabled();
});
test('hidden then visible restores the primary action without resetting the track',async({page})=>{
  await start(page);const primary=page.locator('[data-hl-primary]');
  const orderBefore=await page.locator('[data-hl-event]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-hl-event')));
  await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'));});
  await expect(primary).toBeDisabled();
  await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});document.dispatchEvent(new Event('visibilitychange'));});
  await expect(primary).toBeEnabled();expect(await page.locator('[data-hl-event]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-hl-event')))).toEqual(orderBefore);
  await primary.click();await expect(page.locator('[data-hl-feedback]')).toContainText('前面');
});
test('real mouse drag inserts an event and keeps confirmation separate',async({page})=>{
  await start(page);const events=page.locator('[data-hl-event]');const initial=await events.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-hl-event')));
  const from=await events.first().boundingBox(),to=await events.nth(3).boundingBox();
  await page.mouse.move(from!.x+from!.width/2,from!.y+30);await page.mouse.down();
  await page.mouse.move(to!.x+to!.width/2,to!.y+30,{steps:16});await page.mouse.up();
  expect(await events.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-hl-event')))).toEqual([initial[1],initial[2],initial[3],initial[0],initial[4]]);
  await expect(page.locator('[data-hl-primary]')).toHaveText('检查轨道');
});
test('IME composition cannot confirm early and HTML is displayed only as text',async({page})=>{
  await start(page);await sort(page);await needs(page);
  await place(page,'future-safety','future-ability');await place(page,'future-safety-who-0','future-who');await place(page,'future-safety-condition','future-condition');
  const reason=page.locator('[data-hl-reason]');await reason.fill('<img src=x onerror=alert(1)>');await reason.dispatchEvent('compositionstart');await next(page);
  await expect(page.locator('[data-result]')).toBeHidden();
  await reason.dispatchEvent('compositionend');await next(page);await expect(page.locator('.arcade-outcome')).toHaveJSProperty('open',true);
  await expect(page.locator('[data-hl-outcome]')).toContainText('<img src=x onerror=alert(1)>');await expect(page.locator('[data-hl-outcome] img')).toHaveCount(0);
});
test('mobile track is vertical and pointer cancellation leaves every event untouched',async({page})=>{
  await page.setViewportSize({width:390,height:844});await start(page);
  const buttons=page.locator('[data-hl-event]');const a=await buttons.nth(0).boundingBox(),b=await buttons.nth(1).boundingBox();expect(b!.y).toBeGreaterThan(a!.y);
  const before=await buttons.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-hl-event')));
  await buttons.first().dispatchEvent('pointerdown',{pointerId:2,pointerType:'touch',clientX:a!.x+15,clientY:a!.y+15});
  await buttons.first().dispatchEvent('pointermove',{pointerId:2,pointerType:'touch',clientX:b!.x+20,clientY:b!.y+20});
  await buttons.first().dispatchEvent('pointercancel',{pointerId:2,pointerType:'touch'});
  expect(await buttons.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-hl-event')))).toEqual(before);
  await sort(page);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
