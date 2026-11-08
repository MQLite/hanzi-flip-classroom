import {test, expect} from '@playwright/test';

async function setup(page) {
  // Root integration edits must not reload this independent component fixture.
  await page.routeWebSocket('**/*', () => {});
  await page.goto('/tests/handwriting-score/fixture.html');
  await page.waitForFunction(() => window.fixture?.ready);
  expect(await page.evaluate(() => window.fixture.loadError)).toBeNull();
}

async function open(page) {
  await page.locator('#start').click();
  await expect(page.getByRole('dialog', {name: '描写参考分', exact: true})).toBeVisible();
}

test('shows the actual final score and three supplied metrics immediately without a timer', async ({page}) => {
  await setup(page);
  await open(page);
  const dialog = page.locator('#handwriting-score-dialog');
  await expect(dialog.locator('.handwriting-score-dialog__character')).toHaveText('好');
  await expect(dialog.locator('.handwriting-score-dialog__value')).toHaveText('86');
  await expect(dialog.locator('dt')).toHaveText(['字形', '位置', '长度']);
  await expect(dialog.locator('dd')).toHaveText(['91', '73', '82']);
  expect(await page.evaluate(() => window.fixture.resources())).toEqual({timers: 0, frames: 0, listeners: 4});
  await page.clock.install();
  await page.clock.fastForward(120000);
  await expect(dialog).toBeVisible();
  expect(await page.evaluate(() => window.fixture.closes)).toBe(0);
});

test('teacher close restores focus, preserves body styling and releases every owned resource once', async ({page}) => {
  await setup(page);
  const bodyStyle = await page.locator('body').getAttribute('style');
  await open(page);
  await expect(page.getByRole('button', {name: '关闭', exact: true})).toBeFocused();
  await page.getByRole('button', {name: '关闭', exact: true}).click();
  await expect(page.locator('#handwriting-score-dialog')).toHaveCount(0);
  await expect(page.locator('#start')).toBeFocused();
  await page.evaluate(() => { window.fixture.handles[0].close(); window.fixture.handles[0].dispose(); });
  expect(await page.evaluate(() => window.fixture.closes)).toBe(1);
  expect(await page.evaluate(() => window.fixture.resources())).toEqual({timers: 0, frames: 0, listeners: 0});
  expect(await page.locator('body').getAttribute('style')).toBe(bodyStyle);
});

test('isolates game keyboard and pointer input while preserving Tab, Enter, Space and Escape', async ({page}) => {
  await setup(page);
  const pad = await page.locator('#writing-pad').boundingBox();
  await open(page);
  for (const key of ['ArrowRight', '1', 'k', 'Tab', 'Shift+Tab']) await page.keyboard.press(key);
  expect(await page.evaluate(() => window.fixture.keys)).toEqual([]);
  const focus = await page.evaluate(() => ({tag: document.activeElement.tagName, id: document.activeElement.id, inside: document.querySelector('#handwriting-score-dialog').contains(document.activeElement)}));
  expect(focus.inside, JSON.stringify(focus)).toBe(true);
  await page.mouse.click(pad.x + 10, pad.y + 10);
  expect(await page.evaluate(() => window.fixture.pointers)).toBe(0);
  await page.getByRole('button', {name: '关闭', exact: true}).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#handwriting-score-dialog')).toHaveCount(0);
  await open(page);
  await page.keyboard.press('Space');
  await expect(page.locator('#handwriting-score-dialog')).toHaveCount(0);
  await open(page);
  await page.evaluate(() => { window.fixture.keys = []; });
  await page.keyboard.press('Escape');
  await expect(page.locator('#handwriting-score-dialog')).toHaveCount(0);
  expect(await page.evaluate(() => window.fixture.keys.filter(key => key.startsWith('keydown:')))).toEqual([]);
  await expect(page.locator('#start')).toBeFocused();
  expect(await page.evaluate(() => window.fixture.closes)).toBe(3);
  await page.keyboard.press('ArrowLeft');
  expect(await page.evaluate(() => window.fixture.keys)).toContain('keydown:ArrowLeft');
  expect(await page.evaluate(() => window.fixture.resources())).toEqual({timers: 0, frames: 0, listeners: 0});
});

test('native close removes the dialog and notifies the caller once', async ({page}) => {
  await setup(page);
  await open(page);
  await page.evaluate(() => document.querySelector('#handwriting-score-dialog').close());
  await expect(page.locator('#handwriting-score-dialog')).toHaveCount(0);
  expect(await page.evaluate(() => window.fixture.closes)).toBe(1);
  expect(await page.evaluate(() => window.fixture.resources())).toEqual({timers: 0, frames: 0, listeners: 0});
});

test('replacement closes the old instance and obsolete handles cannot close the replacement', async ({page}) => {
  await setup(page);
  await open(page);
  await page.evaluate(() => window.fixture.show({character: '明', score: 69, metrics: undefined}));
  await expect(page.locator('#handwriting-score-dialog')).toHaveCount(1);
  await expect(page.locator('.handwriting-score-dialog__character')).toHaveText('明');
  await expect(page.locator('.handwriting-score-dialog__value')).toHaveText('69');
  await expect(page.locator('#handwriting-score-dialog dl')).toHaveCount(0);
  expect(await page.evaluate(() => window.fixture.closes)).toBe(1);
  await page.evaluate(() => { window.fixture.handles[0].close(); window.fixture.handles[0].dispose(); });
  await expect(page.locator('#handwriting-score-dialog')).toBeVisible();
  await page.evaluate(() => { window.fixture.handles[1].dispose(); window.fixture.handles[1].close(); });
  await expect(page.locator('#handwriting-score-dialog')).toHaveCount(0);
  await expect(page.locator('#start')).toBeFocused();
  expect(await page.evaluate(() => window.fixture.closes)).toBe(2);
  expect(await page.evaluate(() => window.fixture.resources())).toEqual({timers: 0, frames: 0, listeners: 0});
});

test('pagehide releases modal resources and a detached previous focus is left to the caller', async ({page}) => {
  await setup(page);
  await open(page);
  await page.evaluate(() => {
    const start = document.querySelector('#start');
    start.focus = () => { throw new Error('A detached control must not regain focus'); };
    start.remove();
    window.dispatchEvent(new PageTransitionEvent('pagehide'));
  });
  await expect(page.locator('#handwriting-score-dialog')).toHaveCount(0);
  expect(await page.evaluate(() => window.fixture.closes)).toBe(1);
  expect(await page.evaluate(() => window.fixture.resources())).toEqual({timers: 0, frames: 0, listeners: 0});
  await page.keyboard.press('ArrowDown');
  expect(await page.evaluate(() => window.fixture.keys)).toContain('keydown:ArrowDown');
});

for (const viewport of [{width: 1280, height: 720}, {width: 1920, height: 1080}, {width: 390, height: 844}]) {
  test(`fills the native top layer with a readable final score and visible close control at ${viewport.width}`, async ({page}, testInfo) => {
    await page.setViewportSize(viewport);
    await setup(page);
    await open(page);
    const dialog = page.locator('#handwriting-score-dialog');
    expect(await dialog.evaluate(node => node.matches(':modal'))).toBe(true);
    expect(await dialog.boundingBox()).toEqual({x: 0, y: 0, ...viewport});
    for (const selector of ['.handwriting-score-dialog__score', '.handwriting-score-dialog__close', '.handwriting-score-dialog__character']) {
      const bounds = await dialog.locator(selector).boundingBox();
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.y).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
    }
    const scoreSize = await dialog.locator('.handwriting-score-dialog__value').evaluate(node => parseFloat(getComputedStyle(node).fontSize));
    expect(scoreSize).toBeGreaterThanOrEqual(viewport.width < 700 ? 120 : 175);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    await page.screenshot({path: testInfo.outputPath(`handwriting-score-${viewport.width}.png`)});
  });
}
