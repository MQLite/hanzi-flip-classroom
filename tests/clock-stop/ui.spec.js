import {test, expect} from '@playwright/test';

const lessonUrl = '/?mode=explore&source=paradise&stage=2A&lesson=3';

test('each level opens independently and the clock stops for six spoken answers', async ({page}, testInfo) => {
  await page.setViewportSize({width:1280, height:720});
  await page.goto(lessonUrl);
  const first = page.getByRole('article').filter({hasText:'第1关'});
  const second = page.getByRole('article').filter({hasText:'第2关'});
  await expect(first.getByRole('link')).toHaveAttribute('href', './doudou-time.html');
  await second.getByRole('link').click();
  await expect(page).toHaveURL(/\/clock-stop\.html$/);
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
    await expect(progress).toHaveText(`第 ${round} / 6 轮`);
    await start.click();
    const previous = await minute.evaluate(hand => hand.style.getPropertyValue('--angle'));
    await page.clock.runFor(850);
    await expect(minute).not.toHaveCSS('--angle', previous);
    await stop.click();
    await expect(page.getByText('现在几点？', {exact:true})).toBeVisible();
    await expect(clock).toBeInViewport({ratio:1});
    const frozen = await minute.evaluate(hand => hand.style.getPropertyValue('--angle'));
    await page.clock.runFor(1700);
    await expect(minute).toHaveCSS('--angle', frozen);
    await expect(answer).toBeHidden();
    const hourAngle = await hour.evaluate(hand => Number.parseFloat(hand.style.getPropertyValue('--angle')));
    const spokenHour = ['十二','一','两','三','四','五','六','七','八','九','十','十一'][Math.floor(hourAngle / 30)];
    await check.click();
    await expect(answer).toHaveText(`现在${spokenHour}点${frozen === '180deg' ? '半' : ''}。`);
    if (round === 1) await page.screenshot({path:testInfo.outputPath('clock-stop-mobile.png')});
    await page.getByRole('button', {name:round === 6 ? '完成' : '下一轮', exact:true}).click();
  }
  await expect(page.getByText('六轮完成！', {exact:true})).toBeVisible();
  await page.getByRole('button', {name:'再玩一次', exact:true}).click();
  await expect(progress).toHaveText('第 1 / 6 轮');
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
  await page.evaluate(() => window.recognizer.onresult({resultIndex:0,results:[[{transcript:'现在两点'}]]}));
  await expect(stop).toBeVisible();
  await page.evaluate(() => window.recognizer.onresult({resultIndex:0,results:[[{transcript:'停！'}]]}));
  await expect(page.getByText('现在几点？', {exact:true})).toBeVisible();
  expect(await page.evaluate(() => window.recognizer.aborted)).toBe(true);
  await page.getByRole('button', {name:'下一轮', exact:true}).click();
  await start.click();
  await page.evaluate(() => window.recognizer.onerror({error:'not-allowed'}));
  await expect(page.getByText('语音暂不可用，可以点「停」。')).toBeVisible();
  await stop.click();
  await expect(page.getByText('现在几点？', {exact:true})).toBeVisible();
});
