import {expect, test} from '@playwright/test';
import {createJourney} from '../../src/island-journey-core.js';
import {JOURNEY_KEY} from '../../src/island-journey-storage.js';
import {GAME_ORDER} from '../../src/game-order.js';
import {RIVER_ROUTES} from '../../src/river-routes.js';
import {ZHONGWEN_CONTENT} from '../../src/zhongwen-content.js';

test.use({launchOptions:{args:['--enable-unsafe-swiftshader']}});

const course = {source:'zhongwen', stage:'2', lesson:12, grade:1, revision:'rivers-test'};
const catalogUrl = '/?mode=explore&source=zhongwen&stage=2&lesson=12';

async function readRoute(page, route, onReach) {
  const word = page.locator('#river-word');
  const map = page.locator('#river-map');
  const boat = page.locator('#river-boat');
  const progress = page.locator('#river-progress');
  await expect(map).toHaveAttribute('data-river', route.id);
  await expect(progress).toHaveText('0 / 12');
  for (const [index, entry] of route.entries.entries()) {
    await expect(word).toHaveText(entry);
    const mapBox = await map.boundingBox();
    const wordBox = await word.boundingBox();
    expect(wordBox.x).toBeGreaterThan(mapBox.x);
    expect(wordBox.x + wordBox.width).toBeLessThan(mapBox.x + mapBox.width);
    expect(wordBox.y).toBeGreaterThan(mapBox.y);
    expect(wordBox.y + wordBox.height).toBeLessThan(mapBox.y + mapBox.height);
    await word.click();
    await expect(progress).toHaveText(`${index + 1} / 12`);
    const [x, y] = route.points[index + 1];
    const position = await boat.evaluate(node => ['--x', '--y'].map(name => parseFloat(node.style.getPropertyValue(name))));
    expect(position[0]).toBeCloseTo(x * 100);
    expect(position[1]).toBeCloseTo(y * 100);
    await onReach?.(index + 1);
  }
  await expect(word).toBeHidden();
}

async function checkReview(page, title, route) {
  const review = page.getByRole('region', {name:title});
  await expect(review.getByRole('listitem')).toHaveText(route.entries.map((entry, index) => `${index + 1}${entry}`));
  const map = page.getByRole('img', {name:/从源头到.*的全程示意图/});
  await expect(map).toBeVisible();
  await expect(page.locator('canvas.river-scene')).toBeHidden();
  await expect(page.locator('#lesson-celebration')).toHaveCount(0);
  await expect(review.getByRole('heading')).toBeFocused();
}

test('the second-book lesson reviews both river maps and all 24 cards before celebrating', async ({page}, testInfo) => {
  const lesson = ZHONGWEN_CONTENT.find(row => row.book === 2 && row.lesson === 12);
  const [yangtze, yellow] = RIVER_ROUTES;
  expect(yangtze.entries).toEqual(lesson.characters.map(entry => entry.character));
  const reading = new Set(lesson.vocabulary.filter(entry => entry.section === '读一读').map(entry => entry.word));
  expect(new Set(yellow.entries).size).toBe(12);
  for (const word of yellow.entries) expect(reading.has(word), word).toBe(true);

  await page.setViewportSize({width:1280,height:720});
  await page.goto(catalogUrl);
  const catalog = page.locator('#exploration-catalog');
  await expect(catalog.getByRole('heading', {name:'长江与黄河'})).toBeVisible();
  await catalog.getByRole('link', {name:'进入情景'}).click();
  await expect(page).toHaveURL(/rivers\.html$/);
  await expect(page.locator('#river-map')).toHaveAttribute('data-renderer','3d');
  await expect(page.locator('canvas.river-scene')).toBeVisible();
  await expect(page.locator('#river-mouth')).toHaveText('东 · 东海');
  await page.screenshot({path:testInfo.outputPath('yangtze.png')});
  await readRoute(page, yangtze, async step => {
    if (step === 5) {
      await expect(page.locator('#river-reach')).toContainText('三峡');
      await page.screenshot({path:testInfo.outputPath('gorges.png')});
    }
  });
  await expect(page.locator('#lesson-celebration')).toHaveCount(0);
  await expect(page.getByText('小船到东海啦！', {exact:true})).toBeVisible();
  await checkReview(page, '长江 · 带读生字', yangtze);
  await expect(page.getByRole('button', {name:'去黄河 →'})).toBeInViewport({ratio:1});
  await page.screenshot({path:testInfo.outputPath('yangtze-review.png')});

  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button', {name:'去黄河 →'}).click();
  await expect(page.getByRole('region', {name:'长江 · 带读生字'})).toBeHidden();
  await expect(page.locator('canvas.river-scene')).toBeVisible();
  await expect(page.locator('#river-mouth')).toHaveText('东 · 渤海');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({path:testInfo.outputPath('yellow.png')});
  await readRoute(page, yellow, async step => {
    if (step === 8) {
      await expect(page.locator('#river-reach')).toContainText('黄土高原');
      await page.screenshot({path:testInfo.outputPath('loess.png')});
    }
  });
  await checkReview(page, '黄河 · 带读词语', yellow);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({path:testInfo.outputPath('yellow-review.png')});
  await page.getByRole('button', {name:'读完了，放烟花'}).click();
  await expect(page.getByRole('dialog', {name:'长江黄河通关！'})).toBeVisible();
  await page.getByRole('button', {name:'关闭庆祝'}).click();
  await page.getByRole('button', {name:'再游一次'}).click();
  await expect(page.locator('#river-word')).toHaveText('江');
  await expect(page.locator('#river-progress')).toHaveText('0 / 12');
});

test('the boat moves before the next card and island credit waits until both rivers are complete', async ({page}) => {
  await page.goto(catalogUrl);
  const journey = createJourney({course, runId:'rivers-run', availability:GAME_ORDER.map(game => ({...game, available:game.id === 'explore'}))});
  await page.evaluate(({key, journey}) => localStorage.setItem(key, JSON.stringify([journey])), {key:JOURNEY_KEY, journey});
  const params = new URLSearchParams({journey:journey.runId, journeyCourse:JSON.stringify(course), islandScenario:'two-rivers'});
  await page.goto('/rivers.html?' + params);
  await expect(page.locator('#river-map')).toHaveAttribute('data-renderer','3d');

  await page.emulateMedia({reducedMotion:'no-preference'});
  const first = page.getByRole('button', {name:'江', exact:true});
  await first.click();
  await expect(page.locator('#river-boat')).toHaveClass(/is-sailing/);
  await expect(page.locator('#river-word')).toHaveText('河');
  await expect(page.locator('#river-progress')).toHaveText('1 / 12');
  await page.locator('.river-scene').evaluate(canvas => canvas.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
  await expect(page.locator('#river-map')).toHaveAttribute('data-renderer','flat');
  await expect(page.locator('#river-progress')).toHaveText('1 / 12');
  await page.emulateMedia({reducedMotion:'reduce'});
  for (const entry of RIVER_ROUTES[0].entries.slice(1)) await page.getByRole('button', {name:entry, exact:true}).click();
  const stored = () => page.evaluate(key => JSON.parse(localStorage.getItem(key))[0], JOURNEY_KEY);
  expect((await stored()).status).toBe('active');

  await page.getByRole('button', {name:'去黄河 →'}).click();
  await readRoute(page, RIVER_ROUTES[1]);
  await checkReview(page, '黄河 · 带读词语', RIVER_ROUTES[1]);
  expect((await stored()).status).toBe('active');
  await page.getByRole('button', {name:'读完了，放烟花'}).click();
  await expect(page.getByRole('dialog', {name:'太牛啦'})).toHaveCount(1);
  expect(await stored()).toMatchObject({status:'complete', celebrated:true, completed:['explore']});
  await page.getByRole('button', {name:'关闭庆祝'}).click();
  await expect(page.getByRole('button', {name:'返回小岛地图'})).toBeVisible();
});
