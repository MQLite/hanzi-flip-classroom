import {test,expect} from '@playwright/test';
const labels=['识字翻翻乐','打地鼠','汉字迷宫','汉字拼图','笔画很忙','组词小工坊','女巫的毒药','汉字建筑师','汉字数独','句子小火车','情景探索'];
const key='hanzi-flip.question-bank';
const questions=[{id:'bright',grade:1,character:'明',pinyin:'míng',words:['明月','明月'],sentence:'明月真美。'}];
async function personal(page){await page.addInitScript(({key,questions})=>localStorage.setItem(key,JSON.stringify({schemaVersion:1,questions})),{key,questions});await page.goto('/');}
async function finishFlip(page){const count=await page.locator('#progress-dots i').count();for(let i=0;i<count;i++){await page.locator('#reveal').click();await page.locator('#correct').click();}await expect(page.locator('#journey-next')).toBeEnabled();}
test('map presents ordered islands, honest skips and independent challenges without changing banks',async({page})=>{
 await personal(page);const before=await page.evaluate(k=>localStorage.getItem(k),key);
 await page.locator('#open-island-map').click();await expect(page.locator('#island-map')).toBeVisible();
 expect(await page.locator('.island-card').evaluateAll(nodes=>nodes.map(n=>n.dataset.mode))).toEqual(['flip','mole','maze','puzzle','strokes','workshop','poison','building','sudoku','train','explore']);
 for(const label of labels)await expect(page.locator('#island-map')).toContainText(label);
 await expect(page.locator('.island-card[data-mode="explore"]')).toBeDisabled();
 await page.locator('.island-card[data-mode="puzzle"]').click();await expect(page.locator('#mode-puzzle')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#island-journey-strip')).toBeHidden();expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe(before);
});
test('native completion unlocks next island; independent play pauses and resume returns to unfinished stage',async({page})=>{
 await personal(page);await page.locator('#open-island-map').click();await page.getByRole('button',{name:'按顺序闯关',exact:true}).click();
 await expect(page.locator('#island-journey-strip')).toBeVisible();await expect(page.locator('#journey-next')).toBeDisabled();
 await finishFlip(page);await expect(page.locator('#journey-next')).toContainText('打地鼠');await page.locator('#journey-next').click();
 await expect(page.locator('#mode-mole')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#journey-next')).toBeDisabled();
 await page.locator('[data-mole-slot][data-status="up"]').first().click();
 await page.locator('#mode-puzzle').click();await expect(page.locator('#island-journey-strip')).toBeHidden();
 await page.locator('#open-island-map').click();await page.getByRole('button',{name:'继续闯关',exact:true}).click();
 await expect(page.locator('#mode-mole')).toHaveAttribute('aria-pressed','true');await expect(page.locator('[data-mole-slot][data-status="up"]')).toHaveCount(2);
 while(await page.locator('[data-mole-slot][data-status="up"]').count())await page.locator('[data-mole-slot][data-status="up"]').first().click();
 await expect(page.locator('#journey-next')).toBeEnabled();await page.reload();
 await expect(page.locator('#mode-maze')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#island-journey-strip')).toContainText('2 /');
});
test('lesson identity stays fixed between stages and switching lessons pauses progress',async({page})=>{
 await page.goto('/');await page.getByLabel('题库来源').selectOption('zhongwen');await page.getByLabel('练习范围').selectOption('lesson');await page.getByLabel('选择课次').selectOption('2');
 await page.locator('#open-island-map').click();await page.getByRole('button',{name:'按顺序闯关',exact:true}).click();
 await finishFlip(page);await page.locator('#journey-next').click();await expect(page.getByLabel('选择课次')).toHaveValue('2');
 await page.getByLabel('选择课次').selectOption('3');await expect(page.locator('#island-journey-strip')).toBeHidden();
 await page.locator('#open-island-map').click();await expect(page.getByRole('button',{name:'按顺序闯关',exact:true})).toBeVisible();
});
test('mobile map and journey controls fit and blocked storage does not break games',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.addInitScript(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='hanzi-flip.island-journeys.v1')throw Error('blocked');return original.call(this,key,value);};});
 await page.goto('/');await page.locator('#open-island-map').click();await page.getByRole('button',{name:'按顺序闯关',exact:true}).click();
 await expect(page.locator('#island-journey-strip')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('#journey-map').click();await expect(page.locator('#island-map')).toContainText('本页');
});
test('a full available lesson traverses five native games and celebrates on the main classroom page',async({page})=>{
 test.setTimeout(60000);
 await page.addInitScript(key=>localStorage.setItem(key,JSON.stringify({schemaVersion:1,questions:[{id:'one',grade:1,character:'一',pinyin:'yī',words:['一','一'],sentence:'一。'}]})),key);
 await page.goto('/');const before=await page.evaluate(k=>localStorage.getItem(k),key);
 await page.locator('#open-island-map').click();await page.getByRole('button',{name:'按顺序闯关',exact:true}).click();
 await finishFlip(page);await page.locator('#journey-next').click();await page.locator('[data-mole-slot][data-status="up"]').click();await expect(page.locator('#journey-next')).toBeEnabled();await page.locator('#journey-next').click();
 await page.locator('#maze-start').click();
 const route=await page.locator('[data-maze-cell]').evaluateAll(nodes=>{const open=new Set(nodes.map(n=>Number(n.dataset.mazeCell))),queue=[[9]],seen=new Set([9]);while(queue.length){const p=queue.shift(),last=p.at(-1);if(last===71)return p;for(const n of [last-9,last+9,last-1,last+1])if(open.has(n)&&!seen.has(n)&&Math.abs(Math.floor(n/9)-Math.floor(last/9))+Math.abs(n%9-last%9)===1){seen.add(n);queue.push([...p,n]);}}return [];});
 expect(route.length).toBeGreaterThan(2);for(const index of route.slice(1)){await page.locator(`[data-maze-cell="${index}"]`).click();await page.locator('#maze-confirm').click();}
 await page.locator('#journey-next').click();await expect(page.locator('#mode-strokes')).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'选择横',exact:true}).click();await page.locator('.glyph-shadow path[role="button"]').focus();await page.keyboard.press('Enter');
 await expect(page.locator('#journey-next')).toBeEnabled();
 for(const viewport of [{width:1280,height:720},{width:1920,height:1080},{width:390,height:844}]){await page.setViewportSize(viewport);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`docs/codex/journey-main-${viewport.width}.png`,fullPage:true});}
 await page.setViewportSize({width:1280,height:720});await page.locator('#journey-next').click();await expect(page.locator('#mode-building')).toHaveAttribute('aria-pressed','true');
 await page.locator('#builder-start').click();await page.locator('#builder-draw').click();await page.locator('#builder-confirm').click();await page.locator('[data-builder-card]').click();await page.locator('#builder-restore').click();
 await expect(page.locator('#lesson-celebration')).toBeVisible();await expect(page.locator('#lesson-celebration')).toContainText('太牛啦');
 await page.getByRole('button',{name:'关闭庆祝',exact:true}).click();await expect(page.locator('#island-journey-strip')).toContainText('5 / 5 岛');
 expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe(before);await page.locator('#mode-flip').click();await expect(page.locator('#island-journey-strip')).toBeHidden();
});
