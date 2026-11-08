import {test,expect} from '@playwright/test';
async function setup(page){await page.goto('/?mode=strokes');await page.locator('#bank-source').selectOption('zhongwen');await page.getByRole('button',{name:'触屏描写',exact:true}).click();await expect(page.locator('.handwriting-pad .glyph-shadow path')).toHaveCount(1);}
async function points(page,offset=0){const data=await (await page.request.get('/strokes/'+encodeURIComponent('一')+'.json')).json();return data.medians[0].map(p=>[p[0],p[1]+offset]);}
async function draw(page,trace){await page.locator('.handwriting-pad').scrollIntoViewIfNeeded();const screen=await page.locator('.handwriting-pad').evaluate((svg,trace)=>trace.map(p=>{const q=new DOMPoint(p[0],900-p[1]).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y};}),trace);await page.mouse.move(screen[0].x,screen[0].y);await page.mouse.down();for(const p of screen.slice(1))await page.mouse.move(p.x,p.y,{steps:4});await page.mouse.up();}
test('finger guide is separate from brush outline and a reasonable offset earns a real fullscreen score',async({page})=>{
 await setup(page);await expect(page.locator('.handwriting-guide path')).toHaveCount(1);await expect(page.locator('.handwriting-side')).toContainText('不必描满');
 await draw(page,await points(page,60));const popup=page.locator('#handwriting-score-dialog');await expect(popup).toBeVisible();
 const score=Number(await page.locator('#handwriting-score').getAttribute('data-score'));expect(score).toBeGreaterThanOrEqual(85);expect(score).toBeLessThan(100);await expect(popup.locator('.handwriting-score-dialog__value')).toHaveText(String(score));
 await popup.getByRole('button',{name:'关闭',exact:true}).click();await expect(popup).toHaveCount(0);await expect(page.locator('#handwriting-score')).toBeVisible();
 await page.getByRole('button',{name:'下一字 →',exact:true}).click();await page.getByRole('button',{name:'← 上一字',exact:true}).click();await expect(popup).toHaveCount(0);
});
test('only newly completed handwriting opens the popup; retries, review, and dragging do not',async({page})=>{
 await setup(page);const trace=await points(page);await draw(page,[...trace].reverse());await expect(page.locator('#handwriting-score-dialog')).toHaveCount(0);
 await draw(page,trace);await expect(page.locator('#handwriting-score-dialog')).toBeVisible();await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'重写本字',exact:true}).click();await draw(page,trace);await expect(page.locator('#handwriting-score-dialog')).toBeVisible();
 await page.evaluate(()=>document.querySelector('#mode-puzzle').click());await expect(page.locator('#handwriting-score-dialog')).toHaveCount(0);await page.locator('#mode-strokes').click();await expect(page.locator('#handwriting-score-dialog')).toHaveCount(0);
 await page.getByRole('button',{name:'拖动笔画',exact:true}).click();await page.getByRole('button',{name:'选择横',exact:true}).click();await page.locator('.glyph-shadow path[role="button"]').focus();await page.keyboard.press('Enter');await expect(page.locator('#handwriting-score-dialog')).toHaveCount(0);
});
test('score popup covers a phone without scrolling and closes back to the completed grid',async({page})=>{
 await page.setViewportSize({width:390,height:844});await setup(page);await draw(page,await points(page));const popup=page.locator('#handwriting-score-dialog');await expect(popup).toBeVisible();
 const box=await popup.boundingBox();expect(Math.round(box.width)).toBe(390);expect(Math.round(box.height)).toBe(844);await expect(popup.getByRole('button',{name:'关闭',exact:true})).toBeInViewport();
 await popup.getByRole('button',{name:'关闭',exact:true}).click();await expect(page.locator('#handwriting-score')).toContainText('100');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
