import {expect, test} from '@playwright/test';
import {createJourney} from '../../src/island-journey-core.js';
import {GAME_ORDER} from '../../src/game-order.js';

const course = {source:'paradise',stage:'2A',lesson:3,grade:1,revision:'time-test'};
const storageKey = 'hanzi-flip.island-journeys.v1';

test('read each clock before Doudou answers, then charge and finish the exploration', async ({page}, testInfo) => {
  const run = createJourney({course,runId:'doudou-time-test',availability:GAME_ORDER.map(game=>({...game,available:game.id==='explore'}))});
  await page.setViewportSize({width:1280,height:720});
  await page.goto('/?mode=explore&source=paradise&stage=2A&lesson=3');
  const catalog = page.locator('#exploration-catalog');
  await expect(catalog.getByRole('heading',{name:'豆豆，现在几点？',exact:true})).toBeVisible();
  const entry = catalog.getByRole('link',{name:'进入情景',exact:true});
  const href = await entry.getAttribute('href');
  await page.evaluate(({key,run})=>localStorage.setItem(key,JSON.stringify([run])),{key:storageKey,run});
  const params = new URLSearchParams({islandScenario:'doudou-time',journey:run.runId,journeyCourse:JSON.stringify(course)});
  await page.goto(href+'?'+params);
  await expect(page.getByRole('heading',{name:'豆豆，现在几点？'})).toBeVisible();
  const line = page.locator('#time-line');
  const speaker = page.locator('#time-speaker');
  const next = page.locator('#time-next');
  const clock = page.locator('#time-clock');
  const scene = page.locator('#time-scene');
  const bubble = scene.locator('.time-dialogue');
  await expect(scene).toHaveAttribute('data-shot','wake');
  const table = scene.locator('#time-table');
  await expect(table).toBeHidden();
  await expect(scene.locator('#time-xiaoming')).toBeVisible();
  await expect.poll(()=>scene.locator('.boy-wake').evaluate(img=>img.naturalWidth)).toBeGreaterThan(0);
  await expect(scene.locator('#time-robot')).toBeVisible();
  await expect(bubble).toHaveCount(1);
  await expect(bubble).toBeInViewport({ratio:1});
  await expect(speaker).toHaveAttribute('aria-label','小明');
  await page.screenshot({path:testInfo.outputPath('wake.png')});
  const vocab = new Map();
  const periods = [
    {id:'morning', time:'现在八点。', angles:['240deg','0deg'], food:'我吃面条。', pose:'noodles'},
    {id:'noon', time:'现在十二点。', angles:['0deg','0deg'], food:'我吃米饭。', pose:'rice'},
    {id:'evening', time:'现在七点半。', angles:['225deg','180deg'], food:'我吃饺子。', pose:'dumplings'},
  ];

  for (const period of periods) {
    await expect(page.locator('#time-scene')).toHaveAttribute('data-period',period.id);
    const spoken = [];
    while (await page.locator('#time-scene').getAttribute('data-period') === period.id && await next.getAttribute('aria-label') !== '给豆豆充电') {
      const sentence = await line.getAttribute('aria-label');
      spoken.push(sentence);
      const pinyin = await line.locator('ruby rt').allTextContents();
      expect(pinyin.length,sentence).toBeGreaterThan(0);
      expect(pinyin.every(Boolean),sentence).toBe(true);
      if (sentence === '谢谢！我要去吃早饭了。') {
        await expect(scene).toHaveAttribute('data-shot','meal');
        await expect(scene.locator('.boy-seated')).toBeVisible();
      }
      if (sentence === period.food) {
        await expect(scene).toHaveAttribute('data-shot','food');
        const pose = scene.locator('.boy-'+period.pose);
        await expect(pose).toBeVisible();
        await expect.poll(()=>pose.evaluate(img=>img.naturalWidth)).toBeGreaterThan(0);
        await expect(scene.locator('.boy-seated')).toBeHidden();
        await expect(scene.locator('.boy-wake')).toBeHidden();
        await expect(table).toBeVisible();
        const tableBounds = await table.boundingBox();
        const foot = await scene.locator('.time-robot .foot-right').boundingBox();
        expect(foot.x).toBeGreaterThan(tableBounds.x+tableBounds.width);
        expect(foot.y).toBeGreaterThan(tableBounds.y+tableBounds.height/2);
        await page.screenshot({path:testInfo.outputPath(period.pose+'.png')});
      }
      if (sentence.startsWith('不了')) await expect(line.locator('[data-word=不了] rt')).toHaveText('Bù le,');
      for (const token of await line.locator('[data-word]').all()) {
        vocab.set(await token.getAttribute('data-word'),await token.locator('small[lang=en]').textContent());
      }
      if (sentence.includes('现在几点？')) {
        await expect(speaker).toHaveAttribute('aria-label','小明');
        const askLeft = (await bubble.boundingBox()).x;
        await expect(scene).toHaveAttribute('data-speaker','xiaoming');
        await expect(speaker.locator('rt')).toHaveText('Xiǎomíng');
        await expect(clock).toBeVisible();
        await expect(line).not.toHaveAccessibleName(period.time);
        await expect(clock.locator('[data-hand=hour]')).toHaveCSS('--angle',period.angles[0]);
        await expect(clock.locator('[data-hand=minute]')).toHaveCSS('--angle',period.angles[1]);
        await expect(next).toHaveAccessibleName('我说好了');
        await expect(page.locator('#time-instruction small[lang=en]')).toHaveText('Look at the clock and say the time.');
        await expect(next.locator('small[lang=en]')).toHaveText('I’ve said it');
        await expect(next).toHaveAccessibleDescription('I’ve said it');
        await expect(clock).toBeInViewport({ratio:1});
        await page.screenshot({path:testInfo.outputPath(period.id+'.png')});
        await next.click();
        await expect(line).toHaveAccessibleName(period.time);
        await expect(next.locator('small[lang=en]')).toHaveCount(0);
        await expect(speaker).toHaveAttribute('aria-label','豆豆');
        await expect(scene).toHaveAttribute('data-speaker','doudou');
        expect((await bubble.boundingBox()).x).toBeGreaterThan(askLeft);
        continue;
      }
      await next.click();
    }
    expect(spoken).toContain(period.time);
    expect(spoken).toContain(period.food);
  }

  vocab.set('充电',await line.locator('[data-word=充电] small[lang=en]').textContent());
  expect([...vocab.keys()].sort()).toEqual(['要去','早饭','午饭','晚饭','一起','不了','机器人','充电'].sort());
  expect([...vocab.values()].every(value=>value.trim())).toBe(true);
  await expect(line).toHaveAccessibleName('请给我充电，谢谢！');
  await expect(page.locator('#time-heart')).toBeHidden();
  await next.click();
  await expect(line).toHaveAccessibleName('爱你！');
  await expect(page.locator('#time-heart')).toBeVisible();
  await expect(page.locator('#time-robot')).toHaveClass(/is-loving/);
  await expect(line.locator('rt')).toHaveText('Ài nǐ!');
  const loveGlyph = line.locator('canvas.time-love-glyph');
  await expect(loveGlyph).toBeVisible();
  await expect(loveGlyph).toHaveText('爱你');
  const glyphHasInk = await loveGlyph.evaluate(canvas => {
    const pixels = canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
    return pixels.some((value,index) => index % 4 === 3 && value > 0);
  });
  expect(glyphHasInk).toBe(true);
  await page.screenshot({path:testInfo.outputPath('love.png')});
  expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key))[0].status,storageKey)).toBe('active');
  await next.click();
  await expect(page.locator('#lesson-celebration-title')).toHaveText('太牛啦');
  expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key))[0].status,storageKey)).toBe('complete');
});

test('mobile play fits the clock, shows the charging animation, and can replay', async ({page}, testInfo) => {
  await page.setViewportSize({width:390,height:844});
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('/doudou-time.html');
  const next = page.locator('#time-next');
  const line = page.locator('#time-line');
  for (let turn = 0; turn < 30 && await next.getAttribute('aria-label') !== '给豆豆充电'; turn++) {
    await expect(page.locator('#time-scene .time-dialogue')).toBeInViewport({ratio:1});
    if (await line.getAttribute('aria-label') === '我吃米饭。') {
      const table = page.locator('#time-table');
      await expect(table).toBeInViewport({ratio:.99});
      await expect(page.locator('.boy-rice')).toBeVisible();
      const tableBounds = await table.boundingBox();
      const foot = await page.locator('.time-robot .foot-right').boundingBox();
      expect(foot.x).toBeGreaterThan(tableBounds.x+tableBounds.width);
      await page.screenshot({path:testInfo.outputPath('mobile-rice.png'),animations:'disabled'});
    }
    if (await next.getAttribute('aria-label') === '我说好了') {
      await expect(page.locator('#time-clock')).toBeInViewport({ratio:1});
      await expect(next).toBeInViewport();
      await expect(next.locator('small[lang=en]')).toBeInViewport();
      await expect(page.locator('#time-instruction small[lang=en]')).toBeInViewport();
    }
    await next.click();
  }
  await expect(next).toHaveAccessibleName('给豆豆充电');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await next.click();
  await expect(next).toBeDisabled();
  await expect(page.locator('#time-robot')).toHaveClass(/is-charging/);
  await expect(line).toHaveAccessibleName('爱你！');
  await expect(page.locator('#time-heart')).toHaveCSS('opacity','1');
  await page.screenshot({path:testInfo.outputPath('mobile-love.png')});
  await page.getByRole('button',{name:'再玩一次',exact:true}).click();
  await expect(line).toHaveAccessibleName('早上好，豆豆！');
  await expect(page.locator('#time-heart')).toBeHidden();
});
