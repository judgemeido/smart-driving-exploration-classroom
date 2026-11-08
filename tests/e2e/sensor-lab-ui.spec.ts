import { test, expect, type Page } from '@playwright/test';

async function start(page:Page) {
  await page.goto('/games/sensor/index.html');
  await page.getByRole('button',{name:'开始练习',exact:true}).click();
}
async function assertStageObjectsFit(page:Page) {
  const boxes=await page.locator('[data-sensor-field]').evaluate(field=>{
    const svg=field.querySelector('svg')!;
    const frame=svg.getBoundingClientRect();
    return Array.from(svg.querySelectorAll('[data-stage-target]')).map(target=>{
      const r=target.getBoundingClientRect();
      return {left:r.left-frame.left,top:r.top-frame.top,right:r.right-frame.left,bottom:r.bottom-frame.top,width:frame.width,height:frame.height};
    });
  });
  expect(boxes.length).toBeGreaterThan(0);
  for(const b of boxes) {
    expect(b.left).toBeGreaterThanOrEqual(0);expect(b.top).toBeGreaterThanOrEqual(0);
    expect(b.right).toBeLessThanOrEqual(b.width);expect(b.bottom).toBeLessThanOrEqual(b.height);
  }
}
async function setRange(page:Page,name:string,value:number) {
  const slider=page.getByRole('slider',{name,exact:true});
  await slider.focus();
  await slider.press('Home');
  const min=Number(await slider.getAttribute('min'));
  const step=Number(await slider.getAttribute('step'));
  for(let n=min;n<value;n+=step) await slider.press('ArrowRight');
}
async function pulse(page:Page) {
  const bearing=Number(await page.locator('[data-pulse-bearing]').getAttribute('data-pulse-bearing'));
  await setRange(page,'发射方向',bearing);
  await page.getByRole('button',{name:'发射一次',exact:true}).click();
  await page.getByRole('button',{name:'接收线头',exact:true}).click();
  await page.getByRole('button',{name:'Tx 发射口',exact:true}).click();
  await page.getByRole('button',{name:'发射一次',exact:true}).click();
  await expect(page.locator('[data-sensor-feedback]')).toContainText('把接收头接到 Rx');
  await assertStageObjectsFit(page);
  if(process.env.ARCADE_SCREENSHOT_DIR) await page.screenshot({path:`${process.env.ARCADE_SCREENSHOT_DIR}/sensor-wrong-tx-${page.viewportSize()!.width}.png`,fullPage:true});
  await page.getByRole('button',{name:'接收线头',exact:true}).click();
  await page.getByRole('button',{name:'Rx 接收口',exact:true}).click();
  await page.getByRole('button',{name:'发射一次',exact:true}).click();
  await expect(page.locator('[data-sensor-feedback]')).toContainText('已接住回波');
  await assertStageObjectsFit(page);
  if(process.env.ARCADE_SCREENSHOT_DIR) await page.screenshot({path:`${process.env.ARCADE_SCREENSHOT_DIR}/sensor-received-rx-${page.viewportSize()!.width}.png`,fullPage:true});
}
test('pulse shows the original wrong port and can repair one lead',async({page})=>{
  await start(page);await pulse(page);
  await expect(page.locator('[data-sensor-stage="pulse"]')).toBeVisible();
  await expect(page.getByRole('button',{name:'去扫描与测量',exact:true})).toBeVisible();
});
test('real keyboard controls complete scanning, distance, and the weather repair route',async({page})=>{
  await start(page);await pulse(page);
  await page.getByRole('button',{name:'去扫描与测量',exact:true}).click();
  await page.getByRole('button',{name:'采样当前方向',exact:true}).click();
  const scan=page.getByRole('slider',{name:'扫描方向',exact:true});
  await scan.focus();await scan.press('End');
  await page.getByRole('button',{name:'确认轮廓',exact:true}).click();
  await assertStageObjectsFit(page);
  if(process.env.ARCADE_SCREENSHOT_DIR) await page.screenshot({path:`${process.env.ARCADE_SCREENSHOT_DIR}/sensor-scan-${page.viewportSize()!.width}.png`,fullPage:true});
  await page.getByRole('button',{name:/选择目标 A/}).click();
  await setRange(page,'距离标尺',8);
  await page.getByRole('button',{name:'确认最近目标',exact:true}).click();
  await page.getByRole('button',{name:'去天气实验',exact:true}).click();
  await assertStageObjectsFit(page);
  if(process.env.ARCADE_SCREENSHOT_DIR) await page.screenshot({path:`${process.env.ARCADE_SCREENSHOT_DIR}/sensor-weather-${page.viewportSize()!.width}.png`,fullPage:true});
  await page.getByRole('button',{name:'激光雷达线头',exact:true}).click();
  await page.getByRole('button',{name:/证据位 1/}).click();
  await page.getByRole('button',{name:'摄像头线头',exact:true}).click();
  await page.getByRole('button',{name:/证据位 2/}).click();
  await page.getByRole('button',{name:'核对证据',exact:true}).click();
  await expect(page.locator('[data-sensor-feedback]')).toContainText('摄像头换成');
  await page.getByRole('button',{name:'毫米波雷达线头',exact:true}).click();
  await page.getByRole('button',{name:/证据位 2/}).click();
  await page.getByRole('button',{name:'核对证据',exact:true}).click();
  await page.getByRole('button',{name:'停下',exact:true}).click();
  await page.getByLabel('打开提示灯',{exact:true}).check();
  await page.getByRole('button',{name:'应用观察方案',exact:true}).click();
  await expect(page.locator('[data-result]')).toBeVisible();
});
test('touch cancellation removes a draft lead without connecting a receiver',async({browser})=>{
  const context=await browser.newContext({hasTouch:true,viewport:{width:390,height:844}});
  const page=await context.newPage();await start(page);
  const bearing=Number(await page.locator('[data-pulse-bearing]').getAttribute('data-pulse-bearing'));
  await setRange(page,'发射方向',bearing);
  await page.getByRole('button',{name:'发射一次',exact:true}).tap();
  const lead=page.getByRole('button',{name:'接收线头',exact:true});
  const box=(await lead.boundingBox())!;
  const cdp=await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+box.width/2+30,y:box.y+box.height/2+15}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
  await expect(page.locator('.sensor-drag-wire')).toBeHidden();
  await expect(page.locator('[data-port="rx"]')).toHaveAttribute('aria-pressed','false');
  await expect(page.locator('[data-port="tx"]')).toHaveAttribute('aria-pressed','false');
  await lead.tap();
  await expect(lead).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'Rx 接收口',exact:true}).tap();
  await expect(page.locator('[data-port="rx"]')).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'发射一次',exact:true}).tap();
  await expect(page.locator('[data-sensor-feedback]')).toContainText('已接住回波');
  await context.close();
});
test('ordinary touch taps keep the lead selected through the socket capture release',async({browser})=>{
  const context=await browser.newContext({hasTouch:true,viewport:{width:390,height:844}});
  const page=await context.newPage();await start(page);
  const bearing=Number(await page.locator('[data-pulse-bearing]').getAttribute('data-pulse-bearing'));
  await setRange(page,'发射方向',bearing);
  await page.getByRole('button',{name:'发射一次',exact:true}).tap();
  const lead=page.getByRole('button',{name:'接收线头',exact:true});
  await lead.tap();await expect(lead).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'Rx 接收口',exact:true}).tap();
  await expect(page.locator('[data-port="rx"]')).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'发射一次',exact:true}).tap();
  await expect(page.locator('[data-sensor-feedback]')).toContainText('已接住回波');
  await context.close();
});
test('pausing clears a draft lead and resuming restores all pulse controls',async({page})=>{
  await start(page);
  const direction=page.getByRole('slider',{name:'发射方向',exact:true});
  const bearing=Number(await page.locator('[data-pulse-bearing]').getAttribute('data-pulse-bearing'));
  await setRange(page,'发射方向',bearing);
  await page.getByRole('button',{name:'发射一次',exact:true}).click();
  const lead=page.getByRole('button',{name:'接收线头',exact:true});
  await lead.click();await expect(lead).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'暂停操作',exact:true}).click();
  await expect(direction).toBeDisabled();
  await expect(lead).toBeDisabled();
  await page.getByRole('button',{name:'继续操作',exact:true}).click();
  await expect(direction).toBeEnabled();await expect(direction).toHaveValue(String(bearing));
  await expect(lead).toBeEnabled();await expect(lead).toHaveAttribute('aria-pressed','false');
  await expect(page.getByRole('button',{name:'发射一次',exact:true})).toBeEnabled();
  await lead.click();await page.getByRole('button',{name:'Rx 接收口',exact:true}).click();
  await page.getByRole('button',{name:'发射一次',exact:true}).click();
  await expect(page.locator('[data-sensor-feedback]')).toContainText('已接住回波');
});
test('mobile input keeps the receiver connection accessible with reduced motion',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.emulateMedia({reducedMotion:'reduce'});
  await start(page);await pulse(page);
  expect(await page.locator('body').evaluate(el=>el.scrollWidth<=window.innerWidth)).toBe(true);
});
test('320px stage keeps every marker and label inside the SVG',async({page})=>{
  await page.setViewportSize({width:320,height:568});
  await page.emulateMedia({reducedMotion:'reduce'});
  await start(page);await assertStageObjectsFit(page);await pulse(page);
  await page.getByRole('button',{name:'去扫描与测量',exact:true}).click();
  await assertStageObjectsFit(page);
  expect(await page.locator('body').evaluate(el=>el.scrollWidth<=window.innerWidth)).toBe(true);
});
for(const viewport of [{width:390,height:844},{width:320,height:568}]) {
  test(`mobile aiming keeps the target and fire visible while the keyboard adjusts at ${viewport.width}`,async({page})=>{
    await page.setViewportSize(viewport);await start(page);
    const direction=page.getByRole('slider',{name:'发射方向',exact:true});
    await direction.focus();await direction.press('ArrowLeft');
    const target=page.locator('[data-stage-target="target-1"]');
    const fire=page.getByRole('button',{name:'发射一次',exact:true});
    for(const locator of [target,direction,fire]) {
      const box=(await locator.boundingBox())!;
      expect(box.y).toBeGreaterThanOrEqual(0);expect(box.y+box.height).toBeLessThanOrEqual(viewport.height);
    }
    await direction.press('Tab');
    const focused=await page.locator(':focus').boundingBox();
    expect(focused!.y).toBeGreaterThanOrEqual(0);expect(focused!.y+focused!.height).toBeLessThanOrEqual(viewport.height);
    await page.keyboard.press('Tab');await expect(fire).toBeFocused();
    const box=(await fire.boundingBox())!;
    expect(box.y+box.height).toBeLessThanOrEqual(viewport.height);
  });
}
