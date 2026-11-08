import {test, expect} from '@playwright/test';

test('real classroom entry uses left components, middle assembly, right result and bottom introductions',async({page})=>{
  await page.setViewportSize({width:1280,height:720});await page.goto('/?mode=puzzle');
  await expect(page.locator('#hanzi-construction .puzzle-workspace')).toBeVisible();
  const left=await page.locator('.puzzle-choices').boundingBox(),middle=await page.locator('.puzzle-assembly').boundingBox(),right=await page.locator('.puzzle-answers').boundingBox(),intro=await page.locator('.component-introductions').boundingBox();
  expect(left.x+left.width).toBeLessThanOrEqual(middle.x);expect(middle.x+middle.width).toBeLessThanOrEqual(right.x);expect(intro.y).toBeGreaterThanOrEqual(Math.max(left.y+left.height,middle.y+middle.height,right.y+right.height));
  await page.getByRole('button',{name:'选择女',exact:true}).click();await page.getByRole('button',{name:'选择子',exact:true}).click();await page.getByRole('button',{name:'合一合',exact:true}).click();await expect(page.locator('.puzzle-reveal')).toContainText('好');const answer=await page.locator('.puzzle-reveal article').boundingBox();expect(answer.y+answer.height).toBeLessThanOrEqual(720);
});

async function choose(page, name) {
  await page.getByRole('button', {name: `选择${name}`, exact: true}).click();
}

for (const viewport of [{width:1280, height:720}, {width:1920, height:1080}]) {
  test(`choices, assembly and answer occupy separate columns at ${viewport.width}`, async ({page}, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto('/tests/puzzle-layout/fixture.html');
    await expect(page.locator('.parts-palette button')).toHaveCount(5);
    await choose(page, '女');
    await choose(page, '子');
    await page.getByRole('button', {name:'合一合', exact:true}).click();
    await expect(page.locator('.puzzle-reveal article')).toContainText('好');
    await expect(page.locator('.puzzle-reveal svg path')).toHaveCount(6);
    const palette = await page.locator('.parts-palette').boundingBox();
    const tray = await page.locator('.parts-tray').boundingBox();
    const answer = await page.locator('.puzzle-reveal article').boundingBox();
    const intros = await page.locator('.component-introductions').boundingBox();
    expect(palette.x + palette.width).toBeLessThanOrEqual(tray.x);
    expect(tray.x + tray.width).toBeLessThanOrEqual(answer.x);
    expect(Math.abs(palette.y - tray.y)).toBeLessThan(60);
    expect(Math.abs(tray.y - answer.y)).toBeLessThan(60);
    expect(answer.y + answer.height).toBeLessThanOrEqual(viewport.height);
    expect(intros.y).toBeGreaterThanOrEqual(Math.max(palette.y + palette.height, tray.y + tray.height, answer.y + answer.height));
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    await page.screenshot({path:testInfo.outputPath(`puzzle-${viewport.width}.png`), fullPage:true});
  });
}

test('discovery waits for a valid combination and preserves repeated parts and every matching answer', async ({page}) => {
  await page.goto('/tests/puzzle-layout/fixture.html?scenario=multiset');
  await expect(page.locator('.puzzle-reveal article')).toHaveCount(0);
  await expect(page.getByRole('button', {name:'合一合', exact:true})).toBeDisabled();
  await choose(page, '木');
  await page.getByRole('button', {name:'合一合', exact:true}).click();
  await expect(page.locator('.puzzle-reveal article')).toHaveCount(0);
  await choose(page, '木');
  await expect(page.locator('.parts-tray button')).toHaveCount(2);
  await page.getByRole('button', {name:'合一合', exact:true}).click();
  await expect(page.locator('.puzzle-reveal article')).toContainText('林');
  await expect(page.locator('.puzzle-reveal svg path')).toHaveCount(8);
  await choose(page, '木');
  await choose(page, '木');
  await page.getByRole('button', {name:'合一合', exact:true}).click();
  await expect(page.locator('.puzzle-collected span')).toHaveText(['林']);
  await choose(page, '口');
  await choose(page, '十');
  await expect(page.locator('.puzzle-reveal article')).toHaveCount(0);
  await page.getByRole('button', {name:'合一合', exact:true}).click();
  await expect(page.locator('.puzzle-reveal article')).toHaveCount(2);
  await expect(page.locator('.puzzle-reveal')).toContainText('叶');
  await expect(page.locator('.puzzle-reveal')).toContainText('古');
  await expect(page.locator('.puzzle-collected span')).toHaveText(['林', '叶', '古']);
  await choose(page, '女');
  await choose(page, '子');
  await page.getByRole('button', {name:'移除第1个女', exact:true}).click();
  await expect(page.locator('.parts-tray button')).toHaveCount(1);
  await choose(page, '女');
  await page.getByRole('button', {name:'合一合', exact:true}).click();
  await expect(page.locator('.construction-celebrate')).toBeVisible();
  expect(await page.evaluate(() => window.fixture.unchanged())).toBe(true);
});

test('English introductions stay below the row while coverage and references remain available', async ({page}) => {
  await page.goto('/tests/puzzle-layout/fixture.html?scenario=multiset');
  await expect(page.locator('.construction-coverage')).toContainText('中');
  await expect(page.locator('.construction-coverage')).toContainText('老');
  await expect(page.locator('.construction-coverage')).toContainText('龘');
  await page.locator('.component-introductions summary').click();
  await expect(page.locator('.component-intro-list article')).toHaveCount(5);
  await expect(page.locator('.component-intro-list p').first()).toHaveText(/[A-Za-z]/);
  await page.locator('.construction-references summary').click();
  await expect(page.locator('.construction-references p')).toContainText('笔顺');
});

test('long palettes scroll locally without shrinking component glyphs', async ({page}) => {
  await page.setViewportSize({width:1280, height:720});
  await page.goto('/tests/puzzle-layout/fixture.html?scenario=long');
  const palette = page.locator('.parts-palette');
  await expect(palette.locator('button').first()).toBeVisible();
  const dimensions = await palette.evaluate(el => ({height:el.clientHeight, scrollHeight:el.scrollHeight, overflow:getComputedStyle(el).overflowY}));
  expect(dimensions.scrollHeight).toBeGreaterThan(dimensions.height);
  expect(['auto', 'scroll']).toContain(dimensions.overflow);
  const glyph = await palette.locator('.part-shape').first().boundingBox();
  expect(glyph.width).toBeGreaterThanOrEqual(58);
  expect(glyph.height).toBeGreaterThanOrEqual(58);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280);
});

test('mobile stacks choice, assembly and answer in that order without overflow', async ({page}) => {
  await page.setViewportSize({width:390, height:844});
  await page.goto('/tests/puzzle-layout/fixture.html');
  await choose(page, '女');
  await choose(page, '子');
  await page.getByRole('button', {name:'合一合', exact:true}).click();
  const palette = await page.locator('.parts-palette').boundingBox();
  const tray = await page.locator('.parts-tray').boundingBox();
  const answer = await page.locator('.puzzle-reveal article').boundingBox();
  const intros = await page.locator('.component-introductions').boundingBox();
  expect(palette.y + palette.height).toBeLessThanOrEqual(tray.y);
  expect(tray.y + tray.height).toBeLessThanOrEqual(answer.y);
  expect(answer.y + answer.height).toBeLessThanOrEqual(intros.y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('a protected-only lesson keeps its honest empty state and teaching guidance', async ({page}) => {
  await page.goto('/tests/puzzle-layout/fixture.html?scenario=empty');
  await expect(page.locator('.construction-empty')).toContainText('笔画');
  await expect(page.locator('.parts-palette button')).toHaveCount(0);
  await expect(page.locator('.construction-coverage')).toContainText('中');
  await expect(page.locator('.construction-coverage')).toContainText('龘');
});
