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

  const currentWord = page.locator('#tour-word');
  const advance = page.getByRole('button',{name:'读对了，前进',exact:true});
  const robot = page.locator('.tour-map [data-doudou]');
  await expect(page.locator('#tour-title')).toHaveAccessibleName('登泰山');
  const map = page.locator('.tour-map');
  await expect(map).toHaveAttribute('data-renderer','3d');
  await expect(map.locator('canvas.tour-canvas')).toBeVisible();
  await expect(robot).toBeVisible();
  const initial = await robot.evaluate(node=>node.style.left);
  for (const word of mountainWords) {
    await expect(currentWord).toHaveText(word);
    if (word === '蒙特利尔') await page.screenshot({path:testInfo.outputPath('mountain.png')});
    await advance.click();
  }
  expect(await robot.evaluate(node=>node.style.left)).not.toBe(initial);
  await expect(page.getByRole('heading',{name:'登顶啦！'})).toBeVisible();
  await page.getByRole('button',{name:'关闭庆祝'}).click();
  await page.getByRole('button',{name:'去游长江'}).click();

  await expect(page.locator('#tour-title')).toHaveAccessibleName('游长江');
  await expect(map).toHaveAttribute('data-scene','river');
  await expect(map).toHaveAttribute('data-renderer','3d');
  await page.screenshot({path:testInfo.outputPath('river.png')});
  await expect(advance).toBeInViewport();
  const west = await robot.evaluate(node=>parseFloat(node.style.left));
  for (const word of riverWords) {
    await expect(currentWord).toHaveText(word);
    await advance.click();
  }
  expect(await robot.evaluate(node=>parseFloat(node.style.left))).toBeGreaterThan(west);
  await page.getByRole('button',{name:'去北京城'}).click();

  await expect(page.locator('#tour-title')).toHaveAccessibleName('北京城里逛一逛');
  await expect(map).toHaveAttribute('data-renderer','3d');
  const placeNames = ['颐和园','故宫','长城','博物馆'];
  const sentences = ['我们到颐和园看中国。','故宫在中国，中国在东方。','万里长城万里长。','我们在博物馆逛一逛。'];
  await page.getByRole('button',{name:'故宫',exact:true}).click();
  await expect(page.locator('#tour-feedback')).toContainText('再看看');
  await expect(page.locator('#tour-sentence')).toBeHidden();
  for (const [index, place] of placeNames.entries()) {
    const choice = page.getByRole('button',{name:place,exact:true});
    await expect(choice.locator('rt')).not.toBeEmpty();
    await expect(choice.locator('small[lang="en"]')).not.toBeEmpty();
    await choice.click();
    await expect(page.locator('#tour-sentence')).toHaveAccessibleName(sentences[index]);
    await expect(page.locator('#tour-sentence rt').first()).not.toBeEmpty();
    await expect(page.locator('#tour-sentence small[lang="en"]')).not.toBeEmpty();
    const nextStop = page.getByRole('button',{name:index===3?'读完了，完成探索':'读完了，去下一站'});
    if (index === 2) {
      await expect(nextStop).toBeInViewport();
      await page.screenshot({path:testInfo.outputPath('beijing.png')});
    }
    await nextStop.click();
  }
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('hanzi-flip.island-journeys.v1'))[0].status)).toBe('complete');
  await expect(page.locator('#lesson-celebration-title')).toHaveText('太牛啦');
  await page.getByRole('button',{name:'关闭庆祝'}).click();
  await expect(page.getByRole('heading',{name:'四关都完成啦！'})).toBeVisible();
  await page.getByRole('button',{name:'从第一关再玩'}).click();
  await expect(page.locator('#start-mission')).toBeVisible();
});

test('Doudou can still climb on a phone with WebGL disabled', async ({page}) => {
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
  await expect(page.locator('#tour-word')).toHaveText('从');
  await page.getByRole('button',{name:'读对了，前进',exact:true}).click();
  await expect(page.locator('#tour-word')).toHaveText('北京');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
