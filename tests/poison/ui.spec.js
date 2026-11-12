import {test,expect} from '@playwright/test';
import {ZHONGWEN_COURSES} from '../../src/curriculum.js';
test.beforeEach(async({page})=>{await page.goto('/?mode=poison');});
async function prepare(page){await page.locator('#poison-start').click();await expect(page.locator('[data-poison-card]')).toHaveCount(0);await page.locator('#poison-begin-hide').click();}
async function hide(page,count=1){const ids=await page.locator('[data-poison-card]').evaluateAll((nodes,count)=>nodes.slice(0,count).map(n=>n.dataset.poisonCard),count);for(const id of ids)await page.locator(`[data-poison-card="${id}"]`).click();await page.locator('#poison-seal').click();await expect(page.locator('.is-secret')).toHaveCount(0);await expect(page.locator('[data-poison-card]')).toHaveCount(0);await page.locator('#poison-read').click();return ids;}
test('one poison gives an immediate magical end and a new witch gets a clean round',async({page})=>{
  const saved=await page.evaluate(()=>localStorage.getItem('hanzi-flip.question-bank'));await prepare(page);const [id]=await hide(page);await page.locator(`[data-poison-card="${id}"]`).click();await expect(page.locator('#witch-poison')).toHaveAttribute('data-phase','complete');await expect(page.locator('#poison-magic')).toBeVisible();await expect(page.locator('#witch-poison')).not.toContainText('出局');await expect(page.locator('#poison-antidote-prompt')).toBeVisible();
  await page.locator('#poison-next').click();await expect(page.locator('#witch-poison')).toHaveAttribute('data-phase','cover');await expect(page.locator('#witch-poison')).toContainText('第 1 / 3 轮');await page.locator('#poison-begin-hide').click();await expect(page.locator('.is-secret')).toHaveCount(0);expect(await page.evaluate(()=>localStorage.getItem('hanzi-flip.question-bank'))).toBe(saved);
});
test('optional antidote reads the exact chosen lesson sentence; skip and other-course paths stay usable',async({page})=>{
  const firstId=await page.locator('#poison-antidote-choice').inputValue(),sentence=await page.locator('#poison-antidote-choice option:checked').textContent();await prepare(page);const [id]=await hide(page);await page.locator(`[data-poison-card="${id}"]`).click();await page.locator('#poison-antidote').click();await expect(page.locator('#poison-antidote-sentence')).toHaveText(sentence);await page.locator('#poison-rescue').click();await expect(page.locator('.poison-magic-art.is-rescued')).toBeVisible();await expect(page.locator('#poison-next')).toBeVisible();
  await page.locator('#poison-change-lesson').click();await page.getByLabel('选择课次').selectOption('2');expect(await page.locator('#poison-antidote-choice').inputValue()).not.toBe(firstId);await page.locator('#poison-antidote-choice').selectOption('');await prepare(page);const [without]=await hide(page);await page.locator(`[data-poison-card="${without}"]`).click();await expect(page.locator('#poison-antidote')).toBeDisabled();await page.locator('#poison-antidote-skip').click();await expect(page.locator('#poison-next')).toBeVisible();
});
test('one secret poison stays selected when a second card is tried, and safe cards give instant feedback',async({page})=>{
  await prepare(page);const ids=await page.locator('[data-poison-card]').evaluateAll(nodes=>nodes.map(n=>n.dataset.poisonCard));await expect(page.locator('#poison-seal')).toBeDisabled();await page.locator(`[data-poison-card="${ids[0]}"]`).click();await page.locator(`[data-poison-card="${ids[1]}"]`).click();await expect(page.locator('.is-secret')).toHaveCount(1);await page.locator('#poison-seal').click();await page.locator('#poison-read').click();
  await page.locator(`[data-poison-card="${ids[2]}"]`).click();await expect(page.locator(`[data-poison-card="${ids[2]}"]`)).toBeDisabled();await expect(page.locator('#poison-feedback')).toContainText('安全');await page.locator(`[data-poison-card="${ids[0]}"]`).click();await expect(page.locator('#witch-poison')).toHaveAttribute('data-phase','complete');
});
test('held Enter cannot automatically use or confirm the antidote after a poisonous card',async({page})=>{
  await prepare(page);const [id]=await hide(page);await page.locator(`[data-poison-card="${id}"]`).focus();await page.keyboard.down('Enter');for(let i=0;i<5;i++)await page.keyboard.down('Enter');await page.keyboard.up('Enter');await expect(page.locator('#poison-antidote-prompt')).toBeVisible();await expect(page.locator('.poison-magic-art.is-rescued')).toHaveCount(0);await page.keyboard.press('Enter');await expect(page.locator('#poison-antidote-sentence')).toBeVisible();await page.keyboard.press('Enter');await expect(page.locator('.poison-magic-art.is-rescued')).toBeVisible();
});
test('secrets are covered on mode, help and textbook-dialog interruptions and reading progress is independent',async({page})=>{
  await prepare(page);const id=await page.locator('[data-poison-card]').first().getAttribute('data-poison-card');await page.locator(`[data-poison-card="${id}"]`).click();await page.locator('#mode-flip').click();await page.locator('#mode-poison').click();await expect(page.locator('#witch-poison')).toHaveAttribute('data-phase','cover');await page.locator('#poison-begin-hide').click();await expect(page.locator('.is-secret')).toHaveCount(1);
  await page.locator('#open-help').click();await page.getByRole('button',{name:'关闭帮助',exact:true}).click();await expect(page.locator('#witch-poison')).toHaveAttribute('data-phase','cover');await page.locator('#poison-begin-hide').click();await page.locator('#open-paradise-vocabulary').click();await page.locator('#close-paradise-vocabulary').click();await expect(page.locator('[data-poison-card]')).toHaveCount(0);await page.locator('#poison-begin-hide').click();await page.locator('#poison-seal').click();await page.locator('#poison-read').click();const safe=(await page.locator('[data-poison-card]').evaluateAll(nodes=>nodes.map(n=>n.dataset.poisonCard))).find(value=>value!==id);await page.locator(`[data-poison-card="${safe}"]`).click();await page.locator('#mode-sudoku').click();await page.locator('#mode-mole').click();await page.locator('#mode-poison').click();await expect(page.locator(`[data-poison-card="${safe}"]`)).toBeDisabled();
});
test('hidden pages cover secret selection and native keyboard cards give immediate feedback',async({page})=>{
  await prepare(page);await page.locator('[data-poison-card]').first().focus();await page.keyboard.press('Enter');await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await expect(page.locator('#witch-poison')).toHaveAttribute('data-phase','cover');await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,value:false}));await page.locator('#poison-begin-hide').click();await page.locator('#poison-seal').click();await page.locator('#poison-read').click();await page.locator('[data-poison-card]').first().focus();await page.keyboard.press('ArrowRight');await expect(page.locator('#witch-poison')).toHaveAttribute('data-phase','read');await page.keyboard.press('Enter');await expect(page.locator('#witch-poison')).toHaveAttribute('data-phase','complete');
});
test('long words fit mobile/projector and empty data keeps management accessible',async({page})=>{
  await page.setViewportSize({width:1280,height:720});await page.getByLabel('学习阶段',{exact:true}).selectOption('3A');await page.getByLabel('选择课次').selectOption('4');await prepare(page);await hide(page);const cards=await page.locator('[data-poison-card] .poison-term').allTextContents();expect(cards.every(card=>[...card].length===1)).toBe(true);await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.addInitScript(()=>localStorage.setItem('hanzi-flip.question-bank',JSON.stringify({schemaVersion:1,questions:[]})));await page.reload();await expect(page.locator('#poison-start')).toBeDisabled();await page.locator('#open-bank').click();await expect(page.getByRole('dialog',{name:'题库管理',exact:true})).toBeVisible();
});
test('touchscreen can hide poison, receive immediate effect and skip the antidote',async({browser,baseURL})=>{
  const context=await browser.newContext({baseURL,viewport:{width:390,height:844},hasTouch:true,isMobile:true}),page=await context.newPage();await page.goto('/?mode=poison');await page.locator('#poison-start').tap();await page.locator('#poison-begin-hide').tap();const id=await page.locator('[data-poison-card]').first().getAttribute('data-poison-card');await page.locator(`[data-poison-card="${id}"]`).tap();await page.locator('#poison-seal').tap();await page.locator('#poison-read').tap();await page.locator(`[data-poison-card="${id}"]`).tap();await expect(page.locator('#poison-antidote-prompt')).toBeVisible();await page.locator('#poison-antidote-skip').tap();await expect(page.locator('#poison-next')).toBeVisible();await context.close();
});
test('normal motion gives smoke, frog transformation and a clear antidote question',async({page})=>{
  await page.emulateMedia({reducedMotion:'no-preference'});await prepare(page);const [id]=await hide(page);await page.locator(`[data-poison-card="${id}"]`).click();await expect(page.locator('#poison-antidote-prompt')).toBeVisible();expect(await page.locator('#poison-magic').evaluate(n=>n.getAnimations({subtree:true}).length)).toBeGreaterThan(0);await expect.poll(()=>page.locator('.poison-frog').evaluate(n=>Number(getComputedStyle(n).opacity))).toBe(1);
});
test('setup retains minimum-safe and sixteen-card limits',async({page})=>{
  const chosen=await page.locator('[data-poison-choice][aria-pressed="true"]').evaluateAll(nodes=>nodes.map(n=>n.dataset.poisonChoice));for(const id of chosen)await page.locator(`[data-poison-choice="${id}"]`).click();await page.locator('[data-poison-choice][aria-pressed="false"]').first().click();await expect(page.locator('#poison-start')).toBeDisabled();await page.locator('[data-poison-choice][aria-pressed="false"]').first().click();await expect(page.locator('#poison-start')).toBeEnabled();await page.getByLabel('学习阶段',{exact:true}).selectOption('3A');await page.getByLabel('选择课次').selectOption('4');for(let i=0;i<5;i++)await page.locator('[data-poison-choice][aria-pressed="false"]').first().click();await expect(page.locator('[data-poison-choice][aria-pressed="true"]')).toHaveCount(16);await expect(page.locator('#toast')).toContainText('最多16张');
});

test('all three classroom rounds read lesson cards, hide fresh poison and celebrate after the third round', async ({page}, testInfo) => {
  await page.setViewportSize({width:1280,height:720});
  await page.goto('/?mode=poison&source=zhongwen&stage=2&lesson=12');
  const lesson = ZHONGWEN_COURSES.find(course => course.stage === '2' && course.lesson === 12);
  const host = page.locator('#witch-poison');
  const choices = host.locator('[data-poison-choice]');
  await expect(choices.locator('.poison-term')).toHaveText([...lesson.characters]);
  for (const choice of await choices.all()) {
    if (!['江','河','古'].includes(await choice.locator('.poison-term').textContent())) await choice.click();
  }
  await prepare(page);
  const reading = new Set(lesson.vocabulary.filter(item => item.section === '读一读').map(item => item.word));
  for (const round of [1,2,3]) {
    await expect(host).toHaveAttribute('data-round', String(round));
    if (round > 1) {
      await expect(host).toHaveAttribute('data-phase','cover');
      await host.locator('#poison-begin-hide').click();
    }
    await expect(host.locator('.is-secret')).toHaveCount(0);
    const cards = host.locator('[data-poison-card]');
    const items = await cards.locator('.poison-term').allTextContents();
    if (round === 2) {
      expect(new Set(items).size).toBe(12);
      expect(items.every(item => reading.has(item))).toBe(true);
    } else expect(items.sort()).toEqual(['古','江','河']);

    const poison = await cards.first().getAttribute('data-poison-card');
    await cards.first().click();
    await cards.nth(1).click();
    await expect(host.locator('.is-secret')).toHaveCount(1);
    await host.locator('#poison-seal').click();
    await host.locator('#poison-read').click();
    await expect(host.locator('.is-secret')).toHaveCount(0);
    await expect(host.getByRole('heading',{name:'读一读',exact:true})).toBeVisible();
    await expect(host.locator('.poison-heading p')).toHaveText('先读，再点卡。');
    await expect(host).not.toContainText(/翻译|说英语|分析结构|部件提示/);
    await expect(host.locator('.poison-card-status').first()).toBeHidden();
    const dock = await page.locator('#reading-pinyin-dock').boundingBox();
    const lastCard = await cards.last().boundingBox();
    expect(dock.y).toBeGreaterThanOrEqual(lastCard.y + lastCard.height);
    if (round === 2) await page.screenshot({path:testInfo.outputPath('reading-1280.png')});
    if (round === 3) {
      await page.setViewportSize({width:390,height:844});
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
      await page.screenshot({path:testInfo.outputPath('reading-390.png')});
    }
    await cards.nth(1).click();
    await expect(cards.nth(1)).toBeDisabled();
    await host.locator(`[data-poison-card="${poison}"]`).click();
    await expect(host).toHaveAttribute('data-phase','complete');
    await expect(host.getByRole('dialog',{name:'需要解药吗？'})).toBeVisible();
    await expect(host.locator('#poison-continue')).toHaveCount(0);
    await host.locator('#poison-antidote-skip').click();
    await expect(host.locator('#poison-continue')).toHaveText(round < 3 ? '下一轮' : '完成挑战');
    await expect(page.locator('#lesson-celebration')).toHaveCount(0);
    await host.locator('#poison-continue').click();
  }
  await expect(page.getByRole('dialog', {name:'女巫被打败了！'})).toBeVisible();
  await page.getByRole('button', {name:'关闭庆祝'}).click();
  await expect(host.getByRole('img', {name:'女巫被打败，垂下空药瓶'})).toBeVisible();
  await host.getByRole('button', {name:'再挑战一次'}).click();
  await expect(host).toHaveAttribute('data-phase','prepare');
});

test('the reading round falls back to the selected cards when there are too few lesson words', async ({page}) => {
  await page.addInitScript(() => {
    const questions = ['一','二'].map((character,index) => ({
      id:`number-${index}`,grade:1,character,pinyin:index?'èr':'yī',words:[character,character],sentence:`${character}。`,
    }));
    localStorage.setItem('hanzi-flip.question-bank',JSON.stringify({schemaVersion:1,questions}));
  });
  await page.goto('/?mode=poison&source=personal');
  await prepare(page);
  const [poison] = await hide(page);
  await page.locator(`[data-poison-card="${poison}"]`).click();
  await page.locator('#poison-antidote-skip').click();
  await page.getByRole('button',{name:'下一轮',exact:true}).click();
  await page.locator('#poison-begin-hide').click();
  const cards = page.locator('[data-poison-card] .poison-term');
  expect((await cards.allTextContents()).sort()).toEqual(['一','二']);
  await hide(page);
  await page.locator('#english-instructions').check();
  await expect(page.locator('.poison-heading .game-instruction-english')).toHaveText('Read aloud, then tap the card.');
  await expect(cards.locator('.game-instruction-english')).toHaveCount(0);
});
