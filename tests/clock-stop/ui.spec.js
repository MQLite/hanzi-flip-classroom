import {test, expect} from '@playwright/test';
import {createJourney} from '../../src/island-journey-core.js';
import {GAME_ORDER} from '../../src/game-order.js';

const lessonUrl = '/?mode=explore&source=paradise&stage=2A&lesson=3';
const readingText = (locator, selector) => locator.evaluate((element, selector) => {
  const copy = element.cloneNode(true);
  for (const node of copy.querySelectorAll(selector)) node.remove();
  return copy.textContent.trim();
}, selector);

async function expectAnnotated(locator) {
  const unannotated = await locator.evaluate(element => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const missing = [];
    while (walker.nextNode()) {
      const text = walker.currentNode;
      if (!/\p{Script=Han}/u.test(text.data)) continue;
      const range = document.createRange();
      range.selectNodeContents(text);
      const visible = Array.from(range.getClientRects()).some(rect => rect.width > 0 && rect.height > 0);
      if (visible && !text.parentElement.closest('ruby')?.querySelector('rt')?.textContent.trim()) {
        missing.push(text.data.trim());
      }
    }
    return missing;
  });
  expect(unannotated).toEqual([]);
}

test('each level opens independently and the clock stops for six spoken answers', async ({page}, testInfo) => {
  await page.setViewportSize({width:1280, height:720});
  await page.goto(lessonUrl);
  const first = page.getByRole('article').filter({hasText:'第1关'});
  const second = page.getByRole('article').filter({has:page.getByRole('heading',{name:'现在几点？',exact:true})});
  await expect(first.getByRole('link')).toHaveAttribute('href', './doudou-time.html');
  await expect(second.getByRole('heading').locator('rt')).toHaveText(['Xiànzài','jǐ diǎn?']);
  await expectAnnotated(second);
  await second.getByRole('link').click();
  await expect(page).toHaveURL(/\/clock-stop\.html$/);
  await expect(page.getByRole('heading',{name:'现在几点？',exact:true})).toBeVisible();
  await expect(page).toHaveTitle('现在几点？ · 汉语乐园 2A');
  await expectAnnotated(page.locator('.clock-game'));
  await expect(page.locator('#clock-face')).toBeInViewport({ratio:1});
  await page.screenshot({path:testInfo.outputPath('clock-stop-projector.png')});

  await page.setViewportSize({width:390, height:844});
  const testTime = new Date('2026-11-17T00:00:00Z');
  await page.clock.install({time:testTime});
  await page.clock.pauseAt(new Date(testTime.getTime() + 60000));
  const clock = page.getByRole('img', {name:/指针时钟/});
  const progress = page.locator('#clock-round');
  const answer = page.locator('#clock-answer');
  const hour = clock.locator('[data-hand=hour]');
  const minute = clock.locator('[data-hand=minute]');
  const start = page.getByRole('button', {name:'开始', exact:true});
  const stop = page.getByRole('button', {name:'停', exact:true});
  const check = page.getByRole('button', {name:'看答案', exact:true});
  for (let round = 1; round <= 6; round++) {
    await expect.poll(() => readingText(progress,'rt')).toBe(`第 ${round} / 6 轮`);
    await start.click();
    await expectAnnotated(page.locator('.clock-game'));
    const previous = await minute.evaluate(hand => hand.style.getPropertyValue('--angle'));
    await page.clock.runFor(850);
    await expect(minute).not.toHaveCSS('--angle', previous);
    await stop.click();
    await expect(page.locator('#clock-prompt rt')).toHaveText(['Xiànzài','jǐ diǎn?']);
    await expect(clock).toBeInViewport({ratio:1});
    const frozen = await minute.evaluate(hand => hand.style.getPropertyValue('--angle'));
    await page.clock.runFor(1700);
    await expect(minute).toHaveCSS('--angle', frozen);
    await expect(answer).toBeHidden();
    const hourAngle = await hour.evaluate(hand => Number.parseFloat(hand.style.getPropertyValue('--angle')));
    const spokenHour = ['十二','一','两','三','四','五','六','七','八','九','十','十一'][Math.floor(hourAngle / 30)];
    await check.click();
    await expect.poll(() => readingText(answer,'rt')).toBe(`现在${spokenHour}点${frozen === '180deg' ? '半' : ''}。`);
    const spokenPinyin = ['shí’èr','yī','liǎng','sān','sì','wǔ','liù','qī','bā','jiǔ','shí','shíyī'][Math.floor(hourAngle / 30)];
    await expect(answer.locator('rt')).toHaveText(['Xiànzài', `${spokenPinyin} diǎn${frozen === '180deg' ? ' bàn' : ''}.`]);
    await expectAnnotated(page.locator('.clock-game'));
    if (round === 1) await page.screenshot({path:testInfo.outputPath('clock-stop-mobile.png')});
    await page.getByRole('button', {name:round === 6 ? '完成' : '下一轮', exact:true}).click();
  }
  await expect.poll(() => readingText(page.locator('#clock-prompt'),'rt')).toBe('六轮完成！');
  await expectAnnotated(page.locator('.clock-game'));
  await page.getByRole('button', {name:'再玩一次', exact:true}).click();
  await expect.poll(() => readingText(progress,'rt')).toBe('第 1 / 6 轮');
  await expect(start).toBeVisible();
  await page.getByRole('link', {name:'返回情景探索'}).first().click();
  await expect(first.getByRole('link')).toBeVisible();
  await expect(second.getByRole('link')).toBeVisible();
});

test('opt-in recognition stops on 停, ignores unrelated speech, and falls back when access fails', async ({page}) => {
  await page.addInitScript(() => {
    window.SpeechRecognition = class {
      start() { window.recognizer = this; this.onstart?.(); }
      abort() { this.aborted = true; this.onend?.(); }
    };
  });
  await page.goto('/clock-stop.html');
  const mic = page.getByRole('checkbox', {name:'语音喊停'});
  const start = page.getByRole('button', {name:'开始', exact:true});
  const stop = page.getByRole('button', {name:'停', exact:true});
  await expect(mic).not.toBeChecked();
  await mic.check();
  await start.click();
  expect(await page.evaluate(() => window.recognizer.lang)).toBe('zh-CN');
  const voiceStatus = page.locator('#clock-voice-status');
  await expect(voiceStatus.locator('rt')).toHaveText(['Zhèngzài tīng','tíng…']);
  await expectAnnotated(page.locator('.clock-game'));
  await page.evaluate(() => window.recognizer.onresult({resultIndex:0,results:[[{transcript:'现在两点'}]]}));
  await expect(stop).toBeVisible();
  await page.evaluate(() => window.recognizer.onresult({resultIndex:0,results:[[{transcript:'停！'}]]}));
  await expect(page.locator('#clock-prompt rt')).toHaveText(['Xiànzài','jǐ diǎn?']);
  expect(await page.evaluate(() => window.recognizer.aborted)).toBe(true);
  await page.getByRole('button', {name:'下一轮', exact:true}).click();
  await start.click();
  await page.evaluate(() => window.recognizer.onerror({error:'not-allowed'}));
  await expect.poll(() => readingText(voiceStatus,'rt')).toBe('语音暂不可用，可以点「停」。');
  await expectAnnotated(voiceStatus);
  await stop.click();
  await expect(page.locator('#clock-prompt rt')).toHaveText(['Xiànzài','jǐ diǎn?']);
});

test('the lesson journey displays pinyin on the return link and fireworks dialog', async ({page}) => {
  const course = {source:'paradise', stage:'2A', lesson:3, grade:1, revision:'clock-pinyin'};
  const run = createJourney({
    course,
    runId:'clock-pinyin',
    availability:GAME_ORDER.map(game => ({...game, available:game.id === 'explore'})),
  });
  await page.addInitScript(run => localStorage.setItem('hanzi-flip.island-journeys.v1', JSON.stringify([run])), run);
  const query = new URLSearchParams({islandScenario:'clock-stop', journey:run.runId, journeyCourse:JSON.stringify(course)});
  await page.goto('/clock-stop.html?' + query.toString());
  const back = page.getByRole('link',{name:'返回小岛地图'});
  await expect(back.locator('rt')).toHaveText(['Fǎnhuí','xiǎodǎo','dìtú']);
  for (let round = 1; round <= 6; round++) {
    await page.getByRole('button',{name:'开始',exact:true}).click();
    await page.getByRole('button',{name:'停',exact:true}).click();
    await page.getByRole('button',{name:round === 6 ? '完成' : '下一轮',exact:true}).click();
  }
  const dialog = page.getByRole('dialog',{name:'太牛啦'});
  await expect(dialog.getByRole('heading').locator('rt')).toHaveText('Tài niú la');
  await expectAnnotated(dialog);
  await dialog.getByRole('button',{name:'关闭庆祝'}).click();
  await expect(dialog).toBeHidden();
});
