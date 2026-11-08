import {test,expect} from '@playwright/test';

test('LiDAR keeps its original device experiment after the independent lab migration',async({page})=>{
  await page.goto('/#lidar');
  await expect(page.locator('[data-page="lidar"]')).toHaveAttribute('data-status','ready');
  await expect(page.locator('[data-lidar-learning-toggle], [data-lidar-learning], [data-lidar-learning-labels]')).toHaveCount(0);
  await expect(page.locator('[data-lidar-mode]')).toHaveCount(3);
  await expect(page.locator('[data-lidar-step]')).toHaveCount(4);
  const slider=page.locator('[data-lidar-distance]');
  await expect(slider).toHaveAttribute('min','5');
  await expect(slider).toHaveAttribute('max','80');
  await slider.focus();await slider.press('Home');
  for(let m=5;m<20;m++) await slider.press('ArrowRight');
  await expect(page.locator('[data-lidar-time]').first()).toHaveText('约 133.4 ns');
  for(let m=20;m<60;m++) await slider.press('ArrowRight');
  await expect(page.locator('[data-lidar-time]').first()).toHaveText('约 400.3 ns');
  await page.locator('[data-lidar-reset]').click();
  await expect(slider).toHaveValue('60');
  await page.locator('[data-lidar-step="3"]').click();
  await expect(page.locator('[data-lidar-points]')).toHaveText('720 pts / 示意');
});

test('independent sensor page works with all LiDAR meshes unavailable and preserves six scientific sources',async({page})=>{
  const requests:string[]=[];
  page.on('request',r=>requests.push(r.url()));
  await page.route('**/*.dae',route=>route.abort());
  await page.route('**/*.glb',route=>route.abort());
  await page.goto('/games/sensor/index.html');
  await page.getByRole('button',{name:'开始练习',exact:true}).click();
  await page.getByText('科学资料与操作方法',{exact:true}).click();
  await expect(page.locator('.sensor-science')).toContainText('往返路程除以二');
  await expect(page.locator('.sensor-science dt')).toHaveCount(6);
  await expect(page.locator('.sensor-science')).toContainText('卫星定位不能识别行人');
  await expect(page.getByRole('slider',{name:'发射方向',exact:true})).toBeVisible();
  expect(requests.filter(url=>/\.(?:dae|glb)(?:\?|$)/.test(url))).toEqual([]);
});
