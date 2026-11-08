import {test, expect} from '@playwright/test';

async function setup(page, {motion = 'no-preference', clock = false} = {}) {
  // Prevent development hot reloads from restarting exact-duration assertions.
  await page.routeWebSocket('**/*', () => {});
  await page.emulateMedia({reducedMotion: motion});
  if (clock) {
    await page.clock.install({time: new Date('2026-11-09T00:00:00Z')});
    await page.clock.pauseAt(new Date('2026-11-09T00:00:01Z'));
  }
  await page.goto('/tests/lesson-celebration/fixture.html');
  await page.waitForFunction(() => window.fixture?.ready);
  expect(await page.evaluate(() => window.fixture.loadError)).toBeNull();
}

async function open(page) {
  await page.locator('#start').click();
  await expect(page.getByRole('dialog', {name: '太牛啦', exact: true})).toBeVisible();
}

async function coloredPixels(page) {
  return page.locator('#lesson-celebration canvas').evaluate(canvas => {
    const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    let colorful = 0;
    for (let i = 0; i < pixels.length; i += 16) {
      const max = Math.max(pixels[i], pixels[i + 1], pixels[i + 2]);
      const min = Math.min(pixels[i], pixels[i + 1], pixels[i + 2]);
      if (pixels[i + 3] > 100 && max > 150 && max - min > 45) colorful++;
    }
    return colorful;
  });
}

test('celebration remains visible at 9999ms and closes exactly at 10000ms without resources', async ({page}) => {
  await setup(page, {clock: true});
  await open(page);
  await page.clock.runFor(9999);
  await expect(page.locator('#lesson-celebration')).toBeVisible();
  expect(await page.evaluate(() => window.fixture.closes)).toBe(0);
  await page.clock.runFor(1);
  await expect(page.locator('#lesson-celebration')).toHaveCount(0);
  expect(await page.evaluate(() => window.fixture.closes)).toBe(1);
  expect(await page.evaluate(() => window.fixture.resources())).toEqual({timers: 0, frames: 0, listeners: 0});
  await expect(page.locator('#start')).toBeFocused();
});

test('fireworks paint colorful distinct frames and resize to the viewport', async ({page}, testInfo) => {
  await setup(page, {clock: true});
  await open(page);
  expect(await coloredPixels(page)).toBeGreaterThan(100);
  const first = await page.locator('canvas').evaluate(canvas => canvas.toDataURL());
  await page.clock.runFor(240);
  const second = await page.locator('canvas').evaluate(canvas => canvas.toDataURL());
  expect(second).not.toBe(first);
  expect(await coloredPixels(page)).toBeGreaterThan(100);
  await page.screenshot({path: testInfo.outputPath('fireworks-1440.png')});
  await page.setViewportSize({width: 390, height: 844});
  const size = await page.locator('canvas').boundingBox();
  expect(size).toEqual({x: 0, y: 0, width: 390, height: 844});
  expect(await coloredPixels(page)).toBeGreaterThan(100);
  await page.evaluate(() => window.fixture.handles[0].dispose());
  expect(await page.evaluate(() => window.fixture.resources())).toEqual({timers: 0, frames: 0, listeners: 0});
});

test('reduced motion paints static colorful confetti for the same ten seconds', async ({page}) => {
  await setup(page, {motion: 'reduce', clock: true});
  await open(page);
  expect(await coloredPixels(page)).toBeGreaterThan(100);
  const first = await page.locator('canvas').evaluate(canvas => canvas.toDataURL());
  await page.clock.runFor(9999);
  expect(await page.locator('canvas').evaluate(canvas => canvas.toDataURL())).toBe(first);
  expect((await page.evaluate(() => window.fixture.resources())).frames).toBe(0);
  await page.clock.runFor(1);
  await expect(page.locator('#lesson-celebration')).toHaveCount(0);
  expect(await page.evaluate(() => window.fixture.resources())).toEqual({timers: 0, frames: 0, listeners: 0});
});

test('teacher close and Escape restore focus, preserve body styling and isolate game keys', async ({page}) => {
  await setup(page);
  const originalBody = await page.locator('body').getAttribute('style');
  await open(page);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('1');
  await page.keyboard.press('k');
  expect(await page.evaluate(() => window.fixture.keys)).toEqual([]);
  await page.getByRole('button', {name: '关闭庆祝', exact: true}).click();
  await expect(page.locator('#lesson-celebration')).toHaveCount(0);
  await expect(page.locator('#start')).toBeFocused();
  expect(await page.locator('body').getAttribute('style')).toBe(originalBody);
  expect(await page.evaluate(() => window.fixture.resources())).toEqual({timers: 0, frames: 0, listeners: 0});
  await open(page);
  await page.keyboard.press('Escape');
  await expect(page.locator('#lesson-celebration')).toHaveCount(0);
  await expect(page.locator('#start')).toBeFocused();
  expect(await page.evaluate(() => window.fixture.closes)).toBe(2);
  await page.keyboard.press('ArrowLeft');
  expect(await page.evaluate(() => window.fixture.keys)).toEqual(['ArrowLeft']);
  await open(page);
  await page.keyboard.press('Space');
  await expect(page.locator('#lesson-celebration')).toHaveCount(0);
  expect(await page.evaluate(() => window.fixture.closes)).toBe(3);
});

test('duplicate invocation replaces the old celebration and repeated teardown stays harmless', async ({page}) => {
  await setup(page, {clock: true});
  await open(page);
  await page.evaluate(() => window.fixture.show());
  await expect(page.locator('#lesson-celebration')).toHaveCount(1);
  expect(await page.evaluate(() => window.fixture.closes)).toBe(1);
  expect((await page.evaluate(() => window.fixture.resources())).timers).toBe(1);
  await page.evaluate(() => {
    window.fixture.handles[0].close();
    window.fixture.handles[0].dispose();
    window.fixture.handles[1].close();
    window.fixture.handles[1].dispose();
  });
  await expect(page.locator('#lesson-celebration')).toHaveCount(0);
  expect(await page.evaluate(() => window.fixture.closes)).toBe(2);
  expect(await page.evaluate(() => window.fixture.resources())).toEqual({timers: 0, frames: 0, listeners: 0});
  await page.clock.runFor(10000);
  expect(await page.evaluate(() => window.fixture.closes)).toBe(2);
});

test('page exit tears down timers, frames, dialog and input listeners', async ({page}) => {
  await setup(page);
  await open(page);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
  await expect(page.locator('#lesson-celebration')).toHaveCount(0);
  expect(await page.evaluate(() => window.fixture.resources())).toEqual({timers: 0, frames: 0, listeners: 0});
  await page.keyboard.press('ArrowDown');
  expect(await page.evaluate(() => window.fixture.keys)).toEqual(['ArrowDown']);
});

for (const viewport of [{width: 1280, height: 720}, {width: 1920, height: 1080}, {width: 390, height: 844}]) {
  test(`celebration fills the top layer and keeps teacher controls visible at ${viewport.width}`, async ({page}, testInfo) => {
    await page.setViewportSize(viewport);
    await setup(page, {motion: 'reduce'});
    await open(page);
    const dialog = page.locator('#lesson-celebration');
    expect(await dialog.evaluate(node => node.matches(':modal'))).toBe(true);
    expect(await dialog.boundingBox()).toEqual({x: 0, y: 0, ...viewport});
    const title = page.getByRole('heading', {name: '太牛啦', exact: true});
    const titleBox = await title.boundingBox();
    expect(titleBox.width).toBeGreaterThan(viewport.width < 700 ? 230 : 450);
    const button = await page.getByRole('button', {name: '关闭庆祝', exact: true}).boundingBox();
    expect(button.x).toBeGreaterThanOrEqual(0);
    expect(button.y).toBeGreaterThanOrEqual(0);
    expect(button.x + button.width).toBeLessThanOrEqual(viewport.width);
    expect(button.y + button.height).toBeLessThanOrEqual(viewport.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    await page.screenshot({path: testInfo.outputPath(`celebration-${viewport.width}.png`)});
  });
}
