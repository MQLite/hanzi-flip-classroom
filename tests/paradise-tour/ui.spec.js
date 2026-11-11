import {expect, test} from '@playwright/test';
import {createJourney} from '../../src/island-journey-core.js';
import {GAME_ORDER} from '../../src/game-order.js';
import scenes from '../../src/city-scenes.json' with {type:'json'};

const entry = '/?mode=explore&source=paradise&stage=2A&lesson=2';
const mountainWords = '从 北京 来 上海 义乌 悉尼 蒙特利尔 纽约 温哥华 巴黎 登 泰山'.split(' ');
const riverWords = '游 长江 哪 国 人 中国 美国 澳大利亚 加拿大 英国 法国 汤加 哥伦比亚'.split(' ');

test.use({launchOptions:{args:['--enable-unsafe-swiftshader']}});

async function solveMemory(page) {
  await page.locator('#start-mission').click();
  for (const [index, scene] of scenes.entries()) {
    for (const _ of scene.lines) await page.locator('#show-clue').click();
    await page.locator('#choices').getByRole('button',{name:scene.city,exact:true}).click();
    if (index < scenes.length-1) await page.locator('#next-scene').click();
  }
}

test('Doudou leads all four parts and only the last stop completes the island challenge', async ({page}, testInfo) => {
  await page.setViewportSize({width:1280,height:720});
  const course = {source:'paradise',stage:'2A',lesson:2,grade:1,revision:'tour-test'};
  const run = createJourney({course,runId:'tour-test',availability:GAME_ORDER.map(game=>({...game,available:game.id==='explore'}))});
  await page.goto(entry);
  const catalog = page.locator('#exploration-catalog');
  await expect(catalog).toContainText('豆豆的记忆');
  await expect(catalog).toContainText('登泰山');
  await expect(catalog).toContainText('游长江');
  await expect(catalog).toContainText('北京城里逛一逛');
  const link = await catalog.getByRole('link',{name:'进入情景'}).getAttribute('href');
  await page.evaluate(run=>localStorage.setItem('hanzi-flip.island-journeys.v1',JSON.stringify([run])),run);
  const params = new URLSearchParams({islandScenario:'city-mission',journey:run.runId,journeyCourse:JSON.stringify(course)});
  await page.goto(link+'?'+params);
  await solveMemory(page);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('hanzi-flip.island-journeys.v1'))[0].status)).toBe('active');
  await expect(page.locator('#lesson-celebration')).toHaveCount(0);
  await expect(page.locator('#next-scene')).toHaveAccessibleName('去登泰山');
  await page.locator('#next-scene').click();

  const map = page.locator('.tour-map');
  const card = map.locator('#tour-card');
  const robot = map.locator('[data-doudou]');
  await expect(page.locator('#tour-title')).toHaveAccessibleName('登泰山');
  await expect(map).toHaveAttribute('data-renderer','3d');
  await expect(map.locator('canvas.tour-canvas')).toBeVisible();
  await expect(map).toBeInViewport({ratio:1});
  const initial = await robot.evaluate(node=>node.style.left);
  for (const word of mountainWords) {
    await expect(map.getByRole('button')).toHaveCount(1);
    await expect(card).toHaveAccessibleName(word);
    await expect(card).toHaveText(word);
    if (word === '蒙特利尔') await page.screenshot({path:testInfo.outputPath('mountain.png')});
    if (word === '从') await page.emulateMedia({reducedMotion:'no-preference'});
    await card.click();
    if (word === '从') {
      await expect(card).toBeHidden();
      await expect(card).toHaveText('北京');
      await page.emulateMedia({reducedMotion:'reduce'});
    }
  }
  expect(await robot.evaluate(node=>node.style.left)).not.toBe(initial);
  await expect(page.getByRole('heading',{name:'登顶啦！'})).toBeVisible();
  await page.getByRole('button',{name:'关闭庆祝'}).click();
  await map.getByRole('button',{name:'去游长江'}).click();

  await expect(page.locator('#tour-title')).toHaveAccessibleName('游长江');
  await expect(map).toHaveAttribute('data-renderer','3d');
  await expect(card).toBeInViewport({ratio:1});
  await page.screenshot({path:testInfo.outputPath('river.png')});
  const west = await robot.evaluate(node=>parseFloat(node.style.left));
  for (const word of riverWords) {
    await expect(map.getByRole('button')).toHaveCount(1);
    await expect(card).toHaveAccessibleName(word);
    await card.click();
  }
  expect(await robot.evaluate(node=>parseFloat(node.style.left))).toBeGreaterThan(west);
  await map.getByRole('button',{name:'去北京城'}).click();

  await expect(page.locator('#tour-title')).toHaveAccessibleName('北京城里逛一逛');
  await expect(map).toHaveAttribute('data-renderer','3d');
  const stops = [
    [['颐和园','看','看中国'],'我们到颐和园看中国。'],
    [['故宫','在','东方','在东方'],'故宫在中国，中国在东方。'],
    [['长城','万里','长'],'万里长城万里长。'],
    [['博物馆','城里','逛一逛'],'我们在博物馆逛一逛。'],
  ];
  for (const [index,[words,sentence]] of stops.entries()) {
    await expect(card).toHaveAccessibleName('说出地名');
    await expect(map.getByRole('button')).toHaveCount(1);
    await card.click();
    for (const word of words) {
      await expect(card).toHaveAccessibleName(word);
      await expect(card.locator('rt')).not.toBeEmpty();
      await expect(card.locator('small[lang="en"]')).not.toBeEmpty();
      await card.click();
    }
    await expect(card).toHaveAccessibleName(sentence);
    await expect(card.locator('rt').first()).not.toBeEmpty();
    await expect(card.locator('small[lang="en"]')).not.toBeEmpty();
    if (index === 2) {
      await expect(card).toBeInViewport({ratio:1});
      await page.screenshot({path:testInfo.outputPath('beijing.png')});
    }
    await card.click();
  }
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('hanzi-flip.island-journeys.v1'))[0].status)).toBe('complete');
  await expect(page.locator('#lesson-celebration-title')).toHaveText('太牛啦');
  await page.getByRole('button',{name:'关闭庆祝'}).click();
  await expect(page.getByRole('heading',{name:'四关都完成啦！'})).toBeVisible();
  await page.getByRole('button',{name:'从第一关再玩'}).click();
  await expect(page.locator('#start-mission')).toBeVisible();
});

test('Doudou can still read and travel on a phone with WebGL disabled', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      return type.startsWith('webgl') ? null : original.call(this, type, ...args);
    };
  });
  await page.goto('/city.html');
  await solveMemory(page);
  await page.locator('#next-scene').click();
  await expect(page.locator('.tour-map')).toHaveAttribute('data-renderer','flat');
  await expect(page.locator('#tour-doudou .tour-robot')).toBeVisible();
  const card = page.locator('#tour-map #tour-card');
  await expect(card).toHaveText('从');
  await card.press('Enter');
  await expect(card).toHaveText('北京');
  await expect(card).toBeFocused();
  for (const word of mountainWords.slice(1)) {
    await expect(card).toHaveText(word);
    await expect(card).toBeInViewport({ratio:1});
    await card.click();
  }
  await page.getByRole('button',{name:'关闭庆祝'}).click();
  await page.getByRole('button',{name:'去游长江'}).click();
  for (const word of riverWords) {
    await expect(card).toHaveText(word);
    await card.click();
  }
  await page.getByRole('button',{name:'去北京城'}).click();
  for (const word of ['说出地名','颐和园','看','看中国','我们到颐和园看中国。','说出地名','故宫','在','东方','在东方']) {
    await expect(card).toHaveAccessibleName(word);
    await card.click();
  }
  await expect(card).toHaveAccessibleName('故宫在中国，中国在东方。');
  await expect(card).toBeInViewport({ratio:1});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
