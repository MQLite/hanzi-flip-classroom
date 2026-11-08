import {test,expect} from '@playwright/test';
async function setup(page,type='house',count=3){
  await page.goto('/?mode=building');await expect(page.locator('#mode-building')).toHaveAttribute('aria-pressed','true');
  await page.locator(`#builder-type-${type}`).click();
  const ids=await page.locator('[data-builder-choice][aria-pressed="true"]').evaluateAll(nodes=>nodes.map(n=>n.dataset.builderChoice));
  for(const id of ids.slice(count))await page.locator(`[data-builder-choice="${id}"]`).click();
  const phrase=await page.locator('#builder-sentence-choice option:checked').textContent();await page.locator('#builder-start').click();return phrase;
}
async function finishBuild(page,count=3){
  for(let i=0;i<count;i++){await page.locator('#builder-draw').click();await expect(page.locator('#builder-word')).not.toBeEmpty();await page.locator('#builder-confirm').click();}
  await expect(page.locator('#hanzi-building')).toHaveAttribute('data-phase','built');
}
async function collapse(page,count=3){
  await page.locator('#builder-challenge').click();
  for(let i=0;i<count;i++){
    await page.locator('#builder-draw').click();await expect(page.locator('.is-danger,[data-danger],.builder-danger')).toHaveCount(0);await page.locator('#builder-confirm').click();
    if(await page.locator('#hanzi-building').getAttribute('data-phase')==='collapsed')break;
  }
  await expect(page.locator('#hanzi-building')).toHaveAttribute('data-phase','collapsed');
}
for(const [type,name] of [['house','房'],['bridge','桥'],['tower','塔'],['building','楼']])test(`${name}: words construct the building, random danger collapses it, lesson sentence restores it`,async({page})=>{
  const phrase=await setup(page,type),saved=await page.evaluate(()=>localStorage.getItem('hanzi-flip.question-bank'));
  await expect(page.locator('#builder-scene svg')).toHaveAttribute('aria-label',`正在搭建的${name}`);
  await expect(page.locator('#builder-confirm')).toBeDisabled();await finishBuild(page);
  await expect(page.locator('#builder-scene .built-part')).toHaveCount(16);await expect(page.locator('#builder-scene svg')).toHaveAttribute('aria-label',`完整的${name}`);
  await collapse(page);await expect(page.locator('#builder-rescue-sentence')).toHaveText(phrase);await expect(page.locator('#builder-draw')).toHaveCount(0);
  await page.locator('#builder-restore').click();await expect(page.locator('#hanzi-building')).toHaveAttribute('data-phase','restored');await expect(page.locator('#builder-scene .built-part')).toHaveCount(16);
  await expect(page.locator('#builder-scene svg')).toHaveClass(/is-restored/);expect(await page.evaluate(()=>localStorage.getItem('hanzi-flip.question-bank'))).toBe(saved);
});
test('native keyboard, mode snapshots and other-lesson reset keep independent progress',async({page})=>{
  await setup(page);await page.locator('#builder-draw').focus();await page.keyboard.press('Space');const word=await page.locator('#builder-word').textContent();
  await page.locator('#mode-flip').click();await page.locator('#mode-building').click();await expect(page.locator('#builder-word')).toHaveText(word);
  await page.locator('#builder-confirm').focus();await page.keyboard.press('Enter');await expect(page.locator('#builder-progress')).toContainText('1 / 3');
  await page.keyboard.press('ArrowRight');await expect(page.locator('#builder-progress')).toContainText('1 / 3');await finishBuild(page,2);
  await page.locator('#builder-change-lesson').click();await page.getByLabel('选择课次').selectOption('2');await expect(page.locator('.builder-course')).toContainText('第2课');
  await page.locator('#builder-start').click();await expect(page.locator('#builder-progress')).toContainText('0 /');
});
test('numbers-only lesson builds without invented sentences; empty bank has a clear disabled start',async({page})=>{
  await page.goto('/?mode=building');await page.getByLabel('选择课次').selectOption('3');await expect(page.locator('#builder-sentence-choice option')).toHaveCount(1);
  await expect(page.locator('#hanzi-building')).toContainText('本课暂无重点句子');
  const count=await page.locator('[data-builder-choice][aria-pressed="true"]').count();await page.locator('#builder-start').click();await finishBuild(page,count);await expect(page.locator('#builder-challenge')).toBeDisabled();
  await page.addInitScript(()=>localStorage.setItem('hanzi-flip.question-bank',JSON.stringify({schemaVersion:1,questions:[]})));await page.reload();await expect(page.locator('#builder-start')).toBeDisabled();await expect(page.locator('#hanzi-building')).toContainText('没有可用词语');
});
test('holding Enter cannot advance through reading, construction, collapse and rescue',async({page})=>{
  await setup(page,'house',1);await page.locator('#builder-draw').focus();await page.keyboard.down('Enter');
  for(let i=0;i<5;i++)await page.keyboard.down('Enter');await page.keyboard.up('Enter');
  await expect(page.locator('#hanzi-building')).toHaveAttribute('data-phase','build');await expect(page.locator('#builder-progress')).toContainText('0 / 1');
  await expect(page.locator('#builder-word')).toBeVisible();
  await page.keyboard.press('Enter');await expect(page.locator('#hanzi-building')).toHaveAttribute('data-phase','built');
  await page.keyboard.press('Enter');await expect(page.locator('#hanzi-building')).toHaveAttribute('data-phase','challenge');
  await page.keyboard.press('Enter');await page.keyboard.press('Enter');await expect(page.locator('#hanzi-building')).toHaveAttribute('data-phase','collapsed');
  await page.keyboard.press('Enter');await expect(page.locator('#hanzi-building')).toHaveAttribute('data-phase','restored');
});
test('touchscreen reads, collapses and rescues without overflow',async({browser,baseURL})=>{
  const context=await browser.newContext({baseURL,viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'}),page=await context.newPage();await page.goto('/?mode=building');
  const ids=await page.locator('[data-builder-choice][aria-pressed="true"]').evaluateAll(nodes=>nodes.map(n=>n.dataset.builderChoice));for(const id of ids.slice(2))await page.locator(`[data-builder-choice="${id}"]`).tap();
  await page.locator('#builder-type-bridge').tap();await page.locator('#builder-start').tap();
  for(let i=0;i<2;i++){await page.locator('#builder-draw').tap();await page.locator('#builder-confirm').tap();}
  await page.locator('#builder-challenge').tap();for(let i=0;i<2;i++){await page.locator('#builder-draw').tap();await page.locator('#builder-confirm').tap();if(await page.locator('#hanzi-building').getAttribute('data-phase')==='collapsed')break;}
  await expect(page.locator('#builder-rescue-sentence')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'docs/codex/poison/building-mobile.png',fullPage:true});await page.locator('#builder-restore').tap();await expect(page.locator('#hanzi-building')).toHaveAttribute('data-phase','restored');await context.close();
});
test('Zhongwen lesson choices stay scoped and selection is limited to sixteen words',async({page})=>{
  await page.goto('/?mode=building');await page.getByLabel('题库来源').selectOption('zhongwen');await page.getByLabel('选择册数').selectOption('2');
  const first=await page.locator('#builder-sentence-choice').inputValue();await expect(page.locator('.builder-course')).toContainText('第二册');
  for(let i=0;i<4;i++)await page.locator('[data-builder-choice][aria-pressed="false"]').first().click();
  await expect(page.locator('[data-builder-choice][aria-pressed="true"]')).toHaveCount(16);await page.locator('[data-builder-choice][aria-pressed="false"]').first().click();
  await expect(page.locator('[data-builder-choice][aria-pressed="true"]')).toHaveCount(16);await expect(page.locator('#toast')).toContainText('最多16个词');
  const ids=await page.locator('[data-builder-choice][aria-pressed="true"]').evaluateAll(nodes=>nodes.map(n=>n.dataset.builderChoice));for(const id of ids)await page.locator(`[data-builder-choice="${id}"]`).click();
  await expect(page.locator('#builder-start')).toBeDisabled();await page.getByLabel('选择课次').selectOption('2');
  await expect(page.locator('.builder-course')).toContainText('第2课');expect(await page.locator('#builder-sentence-choice').inputValue()).not.toBe(first);await expect(page.locator('#builder-start')).toBeEnabled();
});
test('long words fit a projector; normal-motion collapse and restoration animate',async({page})=>{
  await page.setViewportSize({width:1280,height:720});await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/?mode=building');await page.getByLabel('学习阶段',{exact:true}).selectOption('3A');await page.getByLabel('选择课次').selectOption('4');
  const ids=await page.locator('[data-builder-choice][aria-pressed="true"]').evaluateAll(nodes=>nodes.map(n=>n.dataset.builderChoice));for(const id of ids)await page.locator(`[data-builder-choice="${id}"]`).click();
  await page.locator('[data-builder-choice]').filter({hasText:'玩儿电子游戏'}).click();await page.locator('#builder-start').click();await page.locator('#builder-draw').click();
  expect(await page.locator('#builder-word').evaluate(n=>n.scrollWidth<=n.clientWidth)).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'docs/codex/poison/building-desktop.png',fullPage:true});await page.locator('#builder-confirm').click();await collapse(page,1);
  await expect(page.locator('#builder-scene')).toHaveAttribute('data-motion','collapse');await expect(page.locator('#builder-restore')).toBeEnabled();await page.locator('#builder-restore').click();await expect(page.locator('#hanzi-building')).toHaveAttribute('data-phase','restored');
});
