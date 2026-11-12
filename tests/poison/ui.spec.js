import {test,expect} from '@playwright/test';
import {ZHONGWEN_COURSES} from '../../src/curriculum.js';
test.beforeEach(async({page})=>{await page.goto('/?mode=poison');});
async function prepare(page,count=1){await page.locator('#poison-count').selectOption(String(count));await page.locator('#poison-start').click();await expect(page.locator('[data-poison-card]')).toHaveCount(0);await page.locator('#poison-begin-hide').click();}
async function hide(page,count=1){const ids=await page.locator('[data-poison-card]').evaluateAll((nodes,count)=>nodes.slice(0,count).map(n=>n.dataset.poisonCard),count);for(const id of ids)await page.locator(`[data-poison-card="${id}"]`).click();await page.locator('#poison-seal').click();await expect(page.locator('.is-secret')).toHaveCount(0);await expect(page.locator('[data-poison-card]')).toHaveCount(0);await page.locator('#poison-read').click();return ids;}
test('one poison gives an immediate magical end and a new witch gets a clean round',async({page})=>{
  const saved=await page.evaluate(()=>localStorage.getItem('hanzi-flip.question-bank'));await prepare(page);const [id]=await hide(page);await page.locator(`[data-poison-card="${id}"]`).click();await expect(page.locator('#witch-poison')).toHaveAttribute('data-phase','complete');await expect(page.locator('#poison-magic')).toBeVisible();await expect(page.locator('#witch-poison')).not.toContainText('出局');await expect(page.locator('#poison-antidote-prompt')).toBeVisible();
  await page.locator('#poison-next').click();await expect(page.locator('#witch-poison')).toHaveAttribute('data-phase','cover');await expect(page.locator('#witch-poison')).toContainText('第 1 / 3 轮 · 读生字');await page.locator('#poison-begin-hide').click();await expect(page.locator('.is-secret')).toHaveCount(0);expect(await page.evaluate(()=>localStorage.getItem('hanzi-flip.question-bank'))).toBe(saved);
});
test('optional antidote reads the exact chosen lesson sentence; skip and other-course paths stay usable',async({page})=>{
  const firstId=await page.locator('#poison-antidote-choice').inputValue(),sentence=await page.locator('#poison-antidote-choice option:checked').textContent();await prepare(page);const [id]=await hide(page);await page.locator(`[data-poison-card="${id}"]`).click();await page.locator('#poison-antidote').click();await expect(page.locator('#poison-antidote-sentence')).toHaveText(sentence);await page.locator('#poison-rescue').click();await expect(page.locator('.poison-magic-art.is-rescued')).toBeVisible();await expect(page.locator('#poison-next')).toBeVisible();
  await page.locator('#poison-change-lesson').click();await page.getByLabel('选择课次').selectOption('2');expect(await page.locator('#poison-antidote-choice').inputValue()).not.toBe(firstId);await page.locator('#poison-antidote-choice').selectOption('');await prepare(page);const [without]=await hide(page);await page.locator(`[data-poison-card="${without}"]`).click();await expect(page.locator('#poison-antidote')).toBeDisabled();await page.locator('#poison-antidote-skip').click();await expect(page.locator('#poison-next')).toBeVisible();
});
test('two poisons require exact choices and the first poison ends after instant safe-card feedback',async({page})=>{
  await prepare(page,2);const ids=await page.locator('[data-poison-card]').evaluateAll(nodes=>nodes.map(n=>n.dataset.poisonCard));await page.locator(`[data-poison-card="${ids[0]}"]`).click();await expect(page.locator('#poison-seal')).toBeDisabled();await page.locator(`[data-poison-card="${ids[1]}"]`).click();await page.locator(`[data-poison-card="${ids[2]}"]`).click();await expect(page.locator('.is-secret')).toHaveCount(2);await page.locator('#poison-seal').click();await page.locator('#poison-read').click();
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
  await page.emulateMedia({reducedMotion:'no-preference'});await prepare(page);const [id]=await hide(page);await page.locator(`[data-poison-card="${id}"]`).click();await expect(page.locator('#poison-antidote-prompt')).toBeVisible();expect(await page.locator('#poison-magic').evaluate(n=>n.getAnimations({subtree:true}).length)).toBeGreaterThan(0);await expect.poll(()=>page.locator('.poison-frog').evaluate(n=>Number(getComputedStyle(n).opacity))).toBe(1);await page.screenshot({path:'docs/codex/poison/instant-magic.png',fullPage:true});
});
test('setup retains minimum-safe and sixteen-card limits',async({page})=>{
  const chosen=await page.locator('[data-poison-choice][aria-pressed="true"]').evaluateAll(nodes=>nodes.map(n=>n.dataset.poisonChoice));for(const id of chosen)await page.locator(`[data-poison-choice="${id}"]`).click();await expect(page.locator('#poison-start')).toBeDisabled();for(let i=0;i<2;i++)await page.locator('[data-poison-choice][aria-pressed="false"]').first().click();await page.locator('#poison-count').selectOption('2');await expect(page.locator('#poison-start')).toBeDisabled();await page.locator('[data-poison-choice][aria-pressed="false"]').first().click();await expect(page.locator('#poison-start')).toBeEnabled();await page.getByLabel('学习阶段',{exact:true}).selectOption('3A');await page.getByLabel('选择课次').selectOption('4');for(let i=0;i<5;i++)await page.locator('[data-poison-choice][aria-pressed="false"]').first().click();await expect(page.locator('[data-poison-choice][aria-pressed="true"]')).toHaveCount(16);await expect(page.locator('#toast')).toContainText('最多16张');
});

test('three rounds use lesson characters, Read Aloud vocabulary and character structure before fireworks', async ({page}, testInfo) => {
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
  const [poison] = await hide(page);
  await host.locator(`[data-poison-card="${poison}"]`).click();
  await expect(host.locator('#poison-continue')).toHaveCount(0);
  await host.locator('#poison-antidote-skip').click();
  await expect(page.locator('#lesson-celebration')).toHaveCount(0);
  await host.locator('#poison-continue').click();

  const question = host.locator('.poison-challenge-question strong');
  const confirm = host.getByRole('button', {name:/答对了/});
  const reading = new Set(lesson.vocabulary.filter(item => item.section === '读一读').map(item => item.word));
  const translated = new Set();
  await expect(host).toHaveAttribute('data-phase','translate');
  await expect(host).toContainText('把「读一读」里的词语翻译成英语。');
  await page.screenshot({path:testInfo.outputPath('translation-1280.png')});
  for (let index = 0; index < 12; index++) {
    const word = await question.textContent();
    expect(reading.has(word), word).toBe(true);
    translated.add(word);
    await confirm.click();
    await expect(host.locator('.poison-challenge-count')).toHaveText(`已答对 ${index + 1} / 12`);
  }
  expect(translated.size).toBe(12);
  await expect(page.locator('#lesson-celebration')).toHaveCount(0);
  await host.getByRole('button', {name:'进入第三轮 · 分析结构'}).click();

  await page.setViewportSize({width:390,height:844});
  await expect(host).toHaveAttribute('data-phase','structure');
  await expect(question).toHaveText('江');
  await host.getByText('看结构提示', {exact:true}).click();
  await expect(host.locator('details')).toContainText('三点水');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({path:testInfo.outputPath('structure-390.png')});
  for (const character of ['江','河','古']) {
    await expect(question).toHaveText(character);
    await expect(page.locator('#lesson-celebration')).toHaveCount(0);
    await confirm.click();
  }
  await expect(page.getByRole('dialog', {name:'女巫被打败了！'})).toBeVisible();
  await page.getByRole('button', {name:'关闭庆祝'}).click();
  await expect(host.getByRole('img', {name:'女巫被打败，垂下空药瓶'})).toBeVisible();
  await host.getByRole('button', {name:'再挑战一次'}).click();
  await expect(host).toHaveAttribute('data-phase','prepare');
});
