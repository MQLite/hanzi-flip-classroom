import {test,expect} from '@playwright/test';
async function start(page){await page.goto('/?mode=maze');await expect(page.locator('#mode-maze')).toHaveAttribute('aria-pressed','true');await page.locator('#maze-start').click();}
const current=page=>page.locator('[data-maze-cell][aria-current="location"]');
async function path(page){return page.locator('[data-maze-cell]').evaluateAll(nodes=>{const open=new Set(nodes.map(n=>Number(n.dataset.mazeCell))),queue=[[9]],seen=new Set([9]);while(queue.length){const path=queue.shift(),last=path.at(-1);if(last===71)return path;for(const n of [last-9,last+9,last-1,last+1])if(open.has(n)&&!seen.has(n)&&Math.abs(Math.floor(n/9)-Math.floor(last/9))+Math.abs(n%9-last%9)===1){seen.add(n);queue.push([...path,n]);}}return [];});}
test('maze choices require reading confirmation, walls and far cells stay blocked',async({page})=>{
  await start(page);await expect(page.locator('.maze-cell')).toHaveCount(81);await expect(current(page)).toHaveAttribute('data-maze-cell','9');await expect(page.locator('[data-maze-cell="71"]')).toBeDisabled();await page.locator('[data-maze-cell="10"]').click();await expect(current(page)).toHaveAttribute('data-maze-cell','9');await expect(page.locator('#maze-read-word')).not.toBeEmpty();await page.locator('#maze-cancel').click();await expect(page.locator('#maze-confirm')).toBeDisabled();
  await page.locator('[data-maze-cell="10"]').click();await page.locator('#maze-confirm').click();await expect(current(page)).toHaveAttribute('data-maze-cell','10');await expect(page.locator('#maze-progress')).toContainText('1');
});
test('an observed route reaches the exit one read at a time, preserves the bank and offers a replay',async({page})=>{
  await start(page);const saved=await page.evaluate(()=>localStorage.getItem('hanzi-flip.question-bank')),route=await path(page);expect(route.length).toBeGreaterThan(2);for(const index of route.slice(1)){await page.locator(`[data-maze-cell="${index}"]`).click();await page.locator('#maze-confirm').click();}
  await expect(page.locator('#hanzi-maze')).toHaveAttribute('data-phase','complete');await expect(page.locator('#maze-celebration')).toContainText('出口');await expect(page.locator('#maze-restart')).toBeVisible();await expect(page.locator('#maze-next-activity,#maze-previous-activity')).toHaveCount(0);expect(await page.evaluate(()=>localStorage.getItem('hanzi-flip.question-bank'))).toBe(saved);
});
test('native arrows select a neighboring character, Enter confirms once and mode switches keep position',async({page})=>{
  await start(page);await page.locator('#maze-board').focus();await page.keyboard.press('ArrowRight');await expect(current(page)).toHaveAttribute('data-maze-cell','9');await page.keyboard.press('Enter');await expect(current(page)).toHaveAttribute('data-maze-cell','10');await page.keyboard.down('Enter');for(let i=0;i<5;i++)await page.keyboard.down('Enter');await page.keyboard.up('Enter');await expect(current(page)).toHaveAttribute('data-maze-cell','10');await page.locator('#mode-flip').click();await page.locator('#mode-maze').click();await expect(current(page)).toHaveAttribute('data-maze-cell','10');
});
test('touchscreen maze stays readable within mobile width',async({browser,baseURL})=>{
  const context=await browser.newContext({baseURL,viewport:{width:390,height:844},hasTouch:true,isMobile:true}),page=await context.newPage();await page.goto('/?mode=maze');await page.locator('#maze-start').tap();await page.locator('[data-maze-cell="10"]').tap();await page.locator('#maze-confirm').tap();await expect(current(page)).toHaveAttribute('data-maze-cell','10');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'docs/codex/poison/maze-mobile.png',fullPage:true});await context.close();
});
test('empty bank keeps a clear start state and access to management',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('hanzi-flip.question-bank',JSON.stringify({schemaVersion:1,questions:[]})));await page.goto('/?mode=maze');await expect(page.locator('#maze-start')).toBeDisabled();await expect(page.locator('#hanzi-maze')).toContainText('没有可用生字');await page.locator('#open-bank').click();await expect(page.getByRole('dialog',{name:'题库管理',exact:true})).toBeVisible();
});
test('the three games use the normal game menu and retain their own lessons',async({page})=>{
  await page.goto('/?mode=maze');
  const separateFlow=page.getByRole('navigation',{name:'本课活动衔接',includeHidden:true}),grade=page.getByLabel('学习阶段',{exact:true}),lesson=page.getByLabel('选择课次');
  await expect(separateFlow).toHaveCount(0);
  await grade.selectOption('3A');await lesson.selectOption('4');
  await page.locator('#mode-poison').click();await expect(page.locator('#witch-poison')).toBeVisible();await expect(separateFlow).toHaveCount(0);await grade.selectOption('1B');
  await page.locator('#mode-building').click();await expect(page.locator('#hanzi-building')).toBeVisible();await expect(separateFlow).toHaveCount(0);await grade.selectOption('2A');
  await page.locator('#mode-maze').click();await expect(grade).toHaveValue('3A');await expect(lesson).toHaveValue('4');
  await page.locator('#mode-poison').click();await expect(grade).toHaveValue('1B');
});
