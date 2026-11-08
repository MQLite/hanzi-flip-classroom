import {test, expect} from '@playwright/test';

const ids = ['flip','mole','maze','puzzle','strokes','workshop','poison','building','sudoku','train','explore'];
const labels = ['识字翻翻乐','打地鼠','汉字迷宫','汉字拼图','笔画很忙','组词小工坊','女巫的毒药','汉字建筑师','汉字数独','句子小火车','情景探索'];

async function openMap(page, options = {}) {
  await page.goto('/tests/island-map/fixture.html');
  await page.waitForFunction(() => window.fixtureReady);
  await page.evaluate(overrides => Object.assign(window.fixtureOptions, overrides), options);
  await page.getByRole('button', {name:'打开地图', exact:true}).click();
  await expect(page.getByRole('dialog', {name:'汉字奇遇岛 · 小岛地图'})).toBeVisible();
}

test('all eleven real islands retain their order, and unavailable islands explain why they cannot launch', async ({page}) => {
  await openMap(page);
  const cards = page.locator('#island-map .island-card');
  await expect(cards).toHaveCount(11);
  expect(await cards.evaluateAll(elements => elements.map(card => card.dataset.mode))).toEqual(ids);
  for (let i = 0; i < labels.length; i++) {
    await expect(cards.nth(i)).toContainText(labels[i]);
    await expect(cards.nth(i).locator('.island-number')).toHaveText(String(i + 1));
  }
  await expect(page.locator('[data-mode="explore"]')).toBeDisabled();
  await expect(page.locator('[data-mode="explore"]')).toContainText('已跳过');
  await expect(page.locator('[data-mode="explore"]')).toContainText('本课暂未设置情景探索');
  await expect(page.locator('.island-map-progress')).toContainText('0 / 10');
  await expect(page.locator('.island-map-course')).toHaveText('中文 · 第一册 · 第1课');
  await page.locator('[data-mode="puzzle"]').click();
  expect(await page.evaluate(() => window.fixtureEvents)).toEqual(['challenge:puzzle']);
  await expect(page.locator('#island-map')).not.toBeVisible();
  expect(await page.evaluate(() => window.fixtureMap.isOpen())).toBe(false);
});

test('a new journey starts through the primary action', async ({page}) => {
  await openMap(page);
  await page.getByRole('button', {name:'按顺序闯关', exact:true}).click();
  expect(await page.evaluate(() => window.fixtureEvents)).toEqual(['start']);
  await expect(page.locator('#island-map')).not.toBeVisible();
});

for (const status of ['active', 'paused']) {
  test(`${status} journeys show completed and current islands and resume through the primary action`, async ({page}) => {
    await openMap(page, {state:{status,index:1,completed:['flip']},storageWarning:'无法保存进度，本次仍可继续闯关'});
    await expect(page.locator('[data-mode="flip"]')).toContainText('已完成');
    await expect(page.locator('[data-mode="mole"]')).toContainText('当前岛');
    await expect(page.locator('.island-map-progress')).toContainText('1 / 10');
    await expect(page.getByRole('status')).toHaveText('无法保存进度，本次仍可继续闯关');
    await page.getByRole('button', {name:'继续闯关', exact:true}).click();
    expect(await page.evaluate(() => window.fixtureEvents)).toEqual(['resume']);
    await expect(page.locator('#island-map')).not.toBeVisible();
  });
}

test('a completed journey offers restart while retaining independent island access', async ({page}) => {
  await openMap(page, {state:{status:'complete',index:9,completed:ids.slice(0,10)}});
  await expect(page.locator('.island-map-progress')).toContainText('10 / 10');
  await expect(page.locator('.island-card').filter({hasText:'已完成'})).toHaveCount(10);
  await page.getByRole('button', {name:'再闯一次', exact:true}).click();
  expect(await page.evaluate(() => window.fixtureEvents)).toEqual(['restart']);
});

test('Escape, close control and disposal release the modal without invoking a journey action', async ({page}) => {
  await openMap(page);
  await page.keyboard.press('Escape');
  await expect(page.locator('#island-map')).not.toBeVisible();
  await expect(page.getByRole('button', {name:'打开地图', exact:true})).toBeFocused();
  await page.getByRole('button', {name:'打开地图', exact:true}).click();
  await page.getByRole('button', {name:'关闭小岛地图', exact:true}).click();
  await expect(page.locator('#island-map')).not.toBeVisible();
  expect(await page.evaluate(() => window.fixtureEvents)).toEqual([]);
  await page.evaluate(() => {window.fixtureMap.open(window.fixtureOptions);window.fixtureMap.dispose();});
  await expect(page.locator('#island-map')).toHaveCount(0);
});

test('no-content lessons cannot start a sequential journey', async ({page}) => {
  await openMap(page, {availability:ids.map(id => ({id,available:false,reason:'本课暂无相应内容'})),state:{status:'empty',index:-1,completed:[]}});
  await expect(page.getByRole('button', {name:'按顺序闯关', exact:true})).toBeDisabled();
  await expect(page.locator('.island-map-progress')).toContainText('0 / 0');
  await expect(page.locator('#island-map')).toContainText('本课暂未配置可挑战内容');
});

for (const size of [{width:1280,height:720},{width:1920,height:1080},{width:390,height:844}]) {
  test(`islands and controls remain readable at ${size.width}×${size.height}`, async ({page}, testInfo) => {
    await page.setViewportSize(size);
    await openMap(page, {state:{status:'paused',index:1,completed:['flip']}});
    const geometry = await page.locator('#island-map').evaluate(dialog => {
      const box = dialog.getBoundingClientRect();
      const cards = [...dialog.querySelectorAll('.island-card')].map(card => {
        const bounds = card.getBoundingClientRect();
        const label = card.querySelector('.island-label');
        return {x:bounds.x,y:bounds.y,width:bounds.width,height:bounds.height,fontSize:parseFloat(getComputedStyle(label).fontSize)};
      });
      return {left:box.left,right:box.right,top:box.top,bottom:box.bottom,overflow:dialog.scrollWidth > dialog.clientWidth,bodyOverflow:document.documentElement.scrollWidth > innerWidth,cards};
    });
    expect(geometry.left).toBeGreaterThanOrEqual(0);
    expect(geometry.right).toBeLessThanOrEqual(size.width);
    expect(geometry.top).toBeGreaterThanOrEqual(0);
    expect(geometry.bottom).toBeLessThanOrEqual(size.height);
    expect(geometry.overflow).toBe(false);
    expect(geometry.bodyOverflow).toBe(false);
    expect(geometry.cards.every(card => card.fontSize >= 19 && card.width >= 130 && card.height >= 90)).toBe(true);
    if (size.width > 600) {
      const rows = new Map();
      for (const card of geometry.cards) rows.set(card.y, (rows.get(card.y) || 0) + 1);
      expect([...rows.values()]).toEqual([5,4,2]);
      expect(geometry.cards.every(card => card.y + card.height <= size.height)).toBe(true);
    } else {
      for (let i = 0; i < geometry.cards.length; i++) {
        const card = geometry.cards[i];
        expect(card.x).toBeGreaterThanOrEqual(0);
        expect(card.x + card.width).toBeLessThanOrEqual(size.width);
        if (i % 2) expect(card.y).toBe(geometry.cards[i - 1].y);
      }
      await page.locator('[data-mode="train"]').scrollIntoViewIfNeeded();
      await expect(page.locator('[data-mode="train"]')).toBeInViewport();
    }
    await expect(page.getByRole('button', {name:'继续闯关', exact:true})).toBeInViewport();
    await page.screenshot({path:testInfo.outputPath(`island-map-${size.width}.png`)});
  });
}
