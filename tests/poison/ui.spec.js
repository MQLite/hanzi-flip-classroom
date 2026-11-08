import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{await page.goto('/');});
async function prepare(page,count=1){
  await page.locator('#mode-poison').click();await page.locator('#poison-count').selectOption(String(count));await page.locator('#poison-start').click();
  await expect(page.locator('#witch-poison')).toHaveAttribute('data-phase','cover');await expect(page.locator('[data-poison-card]')).toHaveCount(0);
  await page.locator('#poison-begin-hide').click();
}
async function hide(page,count=1){
  const ids=await page.locator('[data-poison-card]').evaluateAll((nodes,count)=>nodes.slice(0,count).map(n=>n.dataset.poisonCard),count);
  for(const id of ids)await page.locator(`[data-poison-card="${id}"]`).click();
  await page.locator('#poison-seal').click();await expect(page.locator('.is-secret')).toHaveCount(0);await expect(page.locator('[data-poison-card]')).toHaveCount(0);
  await page.locator('#poison-read').click();return ids;
}
test('one poison: close eyes, secretly select, read then reveal, magical end and new witch reset',async({page})=>{
  const saved=await page.evaluate(()=>localStorage.getItem('hanzi-flip.question-bank'));
  await prepare(page);const [id]=await hide(page);
  await expect(page.locator('#poison-reveal')).toBeDisabled();await page.locator(`[data-poison-card="${id}"]`).click();
  await expect(page.locator('#witch-poison')).toHaveAttribute('data-phase','read');await expect(page.locator('#poison-magic')).toHaveCount(0);
  await page.locator('#poison-reveal').click();await expect(page.locator('#witch-poison')).toHaveAttribute('data-phase','complete');
  await expect(page.locator('#poison-magic')).toBeVisible();await expect(page.locator('#poison-magic')).toContainText('本轮结束');
  await expect(page.locator('[data-poison-card]:enabled')).toHaveCount(0);await expect(page.locator('#witch-poison')).not.toContainText('出局');
  await page.screenshot({path:'docs/codex/poison/magic.png',fullPage:true});
  await page.locator('#poison-next').click();await expect(page.locator('#witch-poison')).toHaveAttribute('data-phase','cover');await expect(page.locator('#witch-poison')).toContainText('第2轮');
  await page.locator('#poison-begin-hide').click();await expect(page.locator('.is-secret')).toHaveCount(0);
  expect(await page.evaluate(()=>localStorage.getItem('hanzi-flip.question-bank'))).toBe(saved);
});
test('two poisons require two choices, safe cards stay used, and the first poison ends immediately',async({page})=>{
  await prepare(page,2);const all=await page.locator('[data-poison-card]').evaluateAll(nodes=>nodes.map(n=>n.dataset.poisonCard));
  await page.locator(`[data-poison-card="${all[0]}"]`).click();await expect(page.locator('#poison-seal')).toBeDisabled();
  await page.locator(`[data-poison-card="${all[1]}"]`).click();await page.locator(`[data-poison-card="${all[2]}"]`).click();await expect(page.locator('.is-secret')).toHaveCount(2);
  await page.locator('#poison-seal').click();await page.locator('#poison-read').click();
  await page.locator(`[data-poison-card="${all[2]}"]`).click();await page.locator('#poison-cancel').click();await expect(page.locator('#poison-reveal')).toBeDisabled();
  await page.locator(`[data-poison-card="${all[2]}"]`).click();await page.locator('#poison-reveal').click();await expect(page.locator(`[data-poison-card="${all[2]}"]`)).toBeDisabled();
  await expect(page.locator('#poison-feedback')).toContainText('安全');
  await page.locator(`[data-poison-card="${all[0]}"]`).click();await page.locator('#poison-reveal').click();await expect(page.locator('#witch-poison')).toHaveAttribute('data-phase','complete');
  await expect(page.locator('#poison-magic')).toContainText('换一位');
});
test('secret selections are covered on mode and help interruptions; reading progress stays independent',async({page})=>{
  await prepare(page);const id=await page.locator('[data-poison-card]').first().getAttribute('data-poison-card');await page.locator(`[data-poison-card="${id}"]`).click();
  await page.locator('#mode-flip').click();await page.locator('#mode-poison').click();await expect(page.locator('#witch-poison')).toHaveAttribute('data-phase','cover');await expect(page.locator('.is-secret')).toHaveCount(0);
  await page.locator('#poison-begin-hide').click();await expect(page.locator('.is-secret')).toHaveCount(1);
  await page.locator('#open-help').click();await expect(page.locator('#witch-poison')).toHaveAttribute('data-phase','cover');await page.getByRole('button',{name:'关闭帮助',exact:true}).click();
  await page.locator('#poison-begin-hide').click();await page.locator('#poison-seal').click();await page.locator('#poison-read').click();
  const safeId=(await page.locator('[data-poison-card]').evaluateAll(nodes=>nodes.map(n=>n.dataset.poisonCard))).find(w=>w!==id);
  await page.locator(`[data-poison-card="${safeId}"]`).click();await page.locator('#poison-reveal').click();
  await page.locator('#mode-sudoku').click();await expect(page.locator('#sudoku')).toBeVisible();await page.locator('#mode-mole').click();await expect(page.locator('#mole')).toBeVisible();
  await page.locator('#mode-poison').click();await expect(page.locator(`[data-poison-card="${safeId}"]`)).toBeDisabled();await expect(page.locator('#witch-poison')).toHaveAttribute('data-phase','read');
});
test('textbook vocabulary dialog covers secret choices before students return',async({page})=>{
  await prepare(page);await page.locator('[data-poison-card]').first().click();
  await expect(page.locator('.is-secret')).toHaveCount(1);
  await page.locator('#open-paradise-vocabulary').click();
  await expect(page.locator('#paradise-vocabulary-dialog')).toBeVisible();
  await expect(page.locator('#witch-poison')).toHaveAttribute('data-phase','cover');
  await expect(page.locator('.is-secret')).toHaveCount(0);
  await page.locator('#close-paradise-vocabulary').click();
  await expect(page.locator('[data-poison-card]')).toHaveCount(0);
  await page.locator('#poison-begin-hide').click();await expect(page.locator('.is-secret')).toHaveCount(1);
});
test('hidden page covers setup and keyboard actions never invoke flip shortcuts',async({page})=>{
  await prepare(page);await page.locator('[data-poison-card]').first().focus();await page.keyboard.press('Enter');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  await expect(page.locator('#witch-poison')).toHaveAttribute('data-phase','cover');
  await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,value:false}));await page.locator('#poison-begin-hide').click();
  await page.locator('#poison-seal').focus();await page.keyboard.press('Enter');await page.locator('#poison-read').focus();await page.keyboard.press('Enter');
  await page.locator('[data-poison-card]').first().focus();await page.keyboard.press('Enter');await expect(page.locator('#poison-reveal')).toBeEnabled();
  await page.keyboard.press('ArrowRight');await expect(page.locator('#witch-poison')).toHaveAttribute('data-phase','read');
});
test('long words fit projector and mobile, and an empty bank keeps access to management',async({page})=>{
  await page.setViewportSize({width:1280,height:720});await page.locator('#mode-poison').click();await page.getByLabel('学习阶段',{exact:true}).selectOption('3A');await page.getByLabel('选择课次').selectOption('4');
  await page.locator('#poison-start').click();await page.locator('#poison-begin-hide').click();await hide(page);
  const long=page.locator('[data-poison-card]').filter({hasText:'玩儿电子游戏'});await expect(long).toBeVisible();
  expect(await long.locator('.poison-term').evaluate(n=>n.scrollWidth<=n.clientWidth&&n.scrollHeight<=n.clientHeight)).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBeLessThanOrEqual(720);await page.screenshot({path:'docs/codex/poison/desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'docs/codex/poison/mobile.png',fullPage:true});
  await page.addInitScript(()=>localStorage.setItem('hanzi-flip.question-bank',JSON.stringify({schemaVersion:1,questions:[]})));await page.reload();await page.locator('#mode-poison').click();await expect(page.locator('#poison-start')).toBeDisabled();await page.locator('#open-bank').click();await expect(page.getByRole('dialog',{name:'题库管理',exact:true})).toBeVisible();
});
test('touchscreen can hide a poison, reveal it and start with a new witch',async({browser,baseURL})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,baseURL}),page=await context.newPage();
  await page.goto('/');await page.locator('#mode-poison').tap();await page.locator('#poison-start').tap();await page.locator('#poison-begin-hide').tap();
  const id=await page.locator('[data-poison-card]').first().getAttribute('data-poison-card');await page.locator(`[data-poison-card="${id}"]`).tap();await page.locator('#poison-seal').tap();await page.locator('#poison-read').tap();
  await page.locator(`[data-poison-card="${id}"]`).tap();await page.locator('#poison-reveal').tap();await expect(page.locator('#poison-magic')).toBeVisible();await page.locator('#poison-next').tap();await expect(page.locator('#witch-poison')).toHaveAttribute('data-phase','cover');await context.close();
});
test('normal motion plays smoke and transforms into a frog before the next round',async({page})=>{
  await page.emulateMedia({reducedMotion:'no-preference'});await prepare(page);const [id]=await hide(page);
  await page.locator(`[data-poison-card="${id}"]`).click();await page.locator('#poison-reveal').click();
  expect(await page.locator('#poison-magic').evaluate(n=>n.getAnimations({subtree:true}).length)).toBeGreaterThan(0);
  await expect.poll(()=>page.locator('.poison-magic-art i').evaluateAll(nodes=>nodes.some(n=>Number(getComputedStyle(n).opacity)>.1))).toBe(true);
  await expect.poll(()=>page.locator('.poison-frog').evaluate(n=>Number(getComputedStyle(n).opacity))).toBe(1);
  await expect(page.locator('#witch-poison')).toHaveAttribute('data-phase','complete');await expect(page.locator('#poison-next')).toBeEnabled();
});
test('setup enforces a safe card and sixteen-card limit without losing the current selection',async({page})=>{
  await page.locator('#mode-poison').click();
  const chosen=await page.locator('[data-poison-choice][aria-pressed="true"]').evaluateAll(nodes=>nodes.map(n=>n.dataset.poisonChoice));
  for(const id of chosen)await page.locator(`[data-poison-choice="${id}"]`).click();
  await expect(page.locator('#poison-start')).toBeDisabled();
  await page.locator('[data-poison-choice][aria-pressed="false"]').first().click();await page.locator('[data-poison-choice][aria-pressed="false"]').first().click();
  await expect(page.locator('#poison-start')).toBeEnabled();await page.locator('#poison-count').selectOption('2');await expect(page.locator('#poison-start')).toBeDisabled();
  await page.locator('[data-poison-choice][aria-pressed="false"]').first().click();await expect(page.locator('#poison-start')).toBeEnabled();
  await page.getByLabel('题库来源').selectOption('zhongwen');await page.getByLabel('选择册数').selectOption('2');
  for(let i=0;i<4;i++)await page.locator('[data-poison-choice][aria-pressed="false"]').first().click();
  await expect(page.locator('[data-poison-choice][aria-pressed="true"]')).toHaveCount(16);
  await page.locator('[data-poison-choice][aria-pressed="false"]').first().click();await expect(page.locator('[data-poison-choice][aria-pressed="true"]')).toHaveCount(16);
  await expect(page.locator('#toast')).toContainText('最多16张');
});
