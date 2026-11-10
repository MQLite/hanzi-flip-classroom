import {test,expect} from '@playwright/test';

async function poison(page){
  await page.goto('/?mode=poison');const saved=await page.evaluate(()=>localStorage.getItem('hanzi-flip.question-bank'));
  await page.locator('#poison-start').click();await page.locator('#poison-begin-hide').click();const ids=await page.locator('[data-poison-card]').evaluateAll(nodes=>nodes.map(n=>n.dataset.poisonCard));
  await page.locator(`[data-poison-card="${ids[0]}"]`).click();await page.locator('#poison-seal').click();await page.locator('#poison-read').click();
  await page.locator(`[data-poison-card="${ids[1]}"]`).click();await expect(page.locator('.poison-witch')).toHaveCount(0);
  await page.locator(`[data-poison-card="${ids[0]}"]`).click();return saved;
}

test('poison immediately brings out a grinning witch holding an empty bottle, alongside the antidote choice',async({page})=>{
  await page.setViewportSize({width:1280,height:720});await page.emulateMedia({reducedMotion:'no-preference'});const saved=await poison(page);
  const witch=page.getByRole('img',{name:'女巫拿着空药瓶，咧嘴坏笑',exact:true});await expect(witch).toBeVisible();await expect(page.locator('#poison-antidote-prompt')).toBeVisible();
  await expect(witch.locator('[data-empty="true"]')).toHaveCount(1);await expect(witch.locator('.witch-grin')).toBeVisible();await expect(witch.locator('text')).toHaveCount(0);
  expect(await witch.evaluate(n=>n.getAnimations({subtree:true}).length)).toBeGreaterThan(0);
  await witch.evaluate(n=>Promise.all(n.getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{}))));
  await page.screenshot({path:'docs/codex/poison/witch-empty-bottle-1280.png',fullPage:true});
  await page.locator('#pinyin').check();await expect(page.locator('.poison-witch')).toBeVisible();expect(await page.locator('.poison-witch').evaluate(n=>n.getAnimations({subtree:true}).length)).toBe(0);
  await page.locator('#poison-antidote').click();await expect(page.locator('#poison-antidote-sentence')).toBeVisible();await page.locator('#poison-rescue').click();await expect(page.locator('.poison-witch')).toHaveCount(0);await expect(page.locator('.poison-magic-art.is-rescued')).toBeVisible();
  await page.locator('#poison-next').click();await expect(page.locator('.poison-witch')).toHaveCount(0);expect(await page.evaluate(()=>localStorage.getItem('hanzi-flip.question-bank'))).toBe(saved);
});

test('reduced motion keeps the complete witch and bottle visible on a phone without overflowing',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await poison(page);
  const witch=page.locator('.poison-witch');await expect(witch).toBeVisible();expect(await witch.evaluate(n=>n.getAnimations({subtree:true}).length)).toBe(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  const bottle=await witch.locator('[data-empty="true"]').boundingBox(),art=await witch.boundingBox();expect(bottle.x).toBeGreaterThanOrEqual(art.x);expect(bottle.x+bottle.width).toBeLessThanOrEqual(art.x+art.width);
  await page.screenshot({path:'docs/codex/poison/witch-empty-bottle-390.png',fullPage:true});await page.locator('#poison-antidote-skip').click();await expect(page.locator('#poison-next')).toBeVisible();
});
