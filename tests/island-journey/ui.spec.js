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
