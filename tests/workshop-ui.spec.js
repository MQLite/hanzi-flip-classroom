import { test, expect } from '@playwright/test';

const questions = [
  { id:'w-dad', grade:1, character:'爸', pinyin:'bà', words:['爸爸','老爸'], sentence:'爸爸在家。' },
  { id:'w-tree', grade:1, character:'木', pinyin:'mù', words:['木头','树木'], sentence:'这里有一棵树木。' },
  { id:'w-rain', grade:1, character:'雨', pinyin:'yǔ', words:['下雨','雨水'], sentence:'今天下雨了。' },
];
async function openWorkshop(page, bank = questions.slice(0, 1)) {
  await page.addInitScript(bank => localStorage.setItem('hanzi-flip.question-bank', JSON.stringify({schemaVersion:1,questions:bank})), bank);
  await page.goto('/');
  await page.getByRole('button', {name:'组词小工坊',exact:true}).click();
  await expect(page.getByRole('heading', {name:'组词小工坊',exact:true})).toBeVisible();
}

test('workshop tiles, input validation, teacher judgment and single settlement', async ({page}) => {
  await openWorkshop(page);
  const input = page.getByLabel('输入其他词语', {exact:true});
  await page.locator('#workshop-tiles button').filter({hasText:'爸'}).click();
  await page.locator('#workshop-tiles button').filter({hasText:'爸'}).click();
  await expect(page.locator('#workshop-word')).toHaveText('爸爸');
  await page.getByRole('button', {name:'撤回一字',exact:true}).click();
  await expect(page.locator('#workshop-word')).toHaveText('爸');
  await page.getByRole('button', {name:'清空',exact:true}).click();
  await expect(input).toHaveValue('');
  await input.fill('树木');
  await page.getByRole('button', {name:'揭晓参考词',exact:true}).click();
  await expect(page.locator('#correct')).toBeDisabled();
  await input.fill('爸 爸');
  await expect(page.locator('#correct')).toBeDisabled();
  await input.fill('老爸爸');
  await expect(input).toBeFocused();
  await expect(page.locator('#correct')).toBeEnabled();
  await page.locator('#correct').click();
  await expect(page.locator('[data-score="team-1"]')).toHaveText('1');
  await expect(page.locator('#workshop-collection')).toContainText('老爸爸');
  await expect(page.locator('#correct')).toBeDisabled();
  await expect(input).toBeDisabled();
  await page.locator('#next').click();
  await expect(page.getByText('这一轮，真棒！', {exact:true})).toBeVisible();
  await page.locator('#back').click();
  await expect(page.locator('#workshop-word')).toHaveText('老爸爸');
  await expect(page.locator('#correct')).toBeDisabled();
  await expect(page.locator('[data-score="team-1"]')).toHaveText('1');
});

test('mode switching preserves each score, draft, pinyin and independent team settings', async ({page}) => {
  await openWorkshop(page);
  await page.getByLabel('输入其他词语', {exact:true}).fill('爸爸');
  await page.locator('.switch-label').click();
  await page.getByRole('button', {name:'识字翻翻乐',exact:true}).click();
  await expect(page.locator('#pinyin')).toBeChecked();
  await page.locator('#reveal').click();
  await page.locator('#correct').click();
  await expect(page.locator('[data-score="team-1"]')).toHaveText('1');
  await page.getByRole('button', {name:'组词小工坊',exact:true}).click();
  await expect(page.locator('#workshop-word')).toHaveText('爸爸');
  await expect(page.locator('#pinyin')).not.toBeChecked();
  await expect(page.locator('[data-score="team-1"]')).toHaveText('0');
  await page.locator('#reveal').click();
  await page.locator('#correct').click();
  await page.getByRole('button', {name:'小组设置',exact:true}).click();
  await page.getByLabel('第 1 组名称').fill('工坊组');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', {name:'应用并开始新一轮',exact:true}).click();
  await expect(page.locator('#teams')).toContainText('工坊组');
  await page.getByRole('button', {name:'识字翻翻乐',exact:true}).click();
  await expect(page.locator('[data-score="team-1"]')).toHaveText('1');
  await expect(page.locator('#teams')).not.toContainText('工坊组');
});

test('workshop review includes marked practice but not skipped words', async ({page}) => {
  await openWorkshop(page, questions);
  await page.locator('#reveal').click();
  const target = await page.locator('#workshop-target').innerText();
  await page.locator('#practice').click();
  await page.locator('#next').click();
  await page.locator('#next').click();
  await page.locator('#next').click();
  await page.getByRole('button', {name:'开始复习',exact:true}).click();
  await expect(page.locator('#progress')).toHaveText('01 / 01');
  await expect(page.locator('#workshop-target')).toHaveText(target);
  await expect(page.getByLabel('输入其他词语', {exact:true})).toHaveValue('');
});

test('workshop input, IME and focused buttons do not invoke classroom shortcuts', async ({page}) => {
  await openWorkshop(page, questions);
  const input = page.getByLabel('输入其他词语', {exact:true});
  await input.fill('爸爸');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Space');
  await expect(page.locator('#progress')).toHaveText('01 / 03');
  await expect(page.locator('#reveal')).toBeVisible();
  await page.evaluate(() => document.body.dispatchEvent(new KeyboardEvent('keydown', {code:'Space', isComposing:true, bubbles:true})));
  await expect(page.locator('#reveal')).toBeVisible();
  const tile = page.locator('#workshop-tiles button').first();
  await tile.focus();
  await page.keyboard.press('Space');
  await expect(page.locator('#reveal')).toBeVisible();
  await page.getByRole('button', {name:'使用帮助',exact:true}).click();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#progress')).toHaveText('01 / 03');
});

test('workshop WebGL context loss and repeated mode switches preserve draft', async ({page}) => {
  await openWorkshop(page);
  await page.getByLabel('输入其他词语', {exact:true}).fill('爸爸');
  await expect(page.locator('#workshop-scene')).toHaveAttribute('data-mode', 'webgl');
  await page.locator('#workshop-scene canvas').evaluate(canvas => canvas.dispatchEvent(new Event('webglcontextlost', {cancelable:true})));
  await expect(page.locator('#workshop-scene')).toHaveAttribute('data-mode','simple');
  await expect(page.locator('#workshop-word')).toHaveText('爸爸');
  for (let i=0;i<3;i++) {
    await page.getByRole('button', {name:'识字翻翻乐',exact:true}).click();
    await page.getByRole('button', {name:'组词小工坊',exact:true}).click();
  }
  await expect(page.locator('#workshop-word')).toHaveText('爸爸');
  expect(await page.locator('#workshop-scene canvas').count()).toBeLessThanOrEqual(1);
  await page.locator('#reveal').click();
  await page.locator('#correct').click();
  await expect(page.locator('[data-score="team-1"]')).toHaveText('1');
});

test('workshop empty bank retains access to question management', async ({page}) => {
  await openWorkshop(page, []);
  await expect(page.getByText('当前范围还没有题目', {exact:true})).toBeVisible();
  await page.getByRole('button', {name:'添加课堂题目',exact:true}).click();
  await expect(page.locator('#bank-search')).toBeVisible();
});

test('workshop and flip restore independent curriculum selection without clearing draft', async ({page}) => {
  await page.goto('/');
  await page.getByLabel('学习阶段', {exact:true}).selectOption('2A');
  await page.getByLabel('练习范围').selectOption('lesson');
  await page.getByLabel('选择课次').selectOption('3');
  await page.getByRole('button', {name:'组词小工坊',exact:true}).click();
  await expect(page.getByLabel('学习阶段', {exact:true})).toHaveValue('2A');
  await expect(page.getByLabel('选择课次')).toHaveValue('3');
  await page.getByLabel('学习阶段', {exact:true}).selectOption('3B');
  await page.getByLabel('选择课次').selectOption('9');
  await page.getByLabel('输入其他词语', {exact:true}).fill('测试草稿');
  await page.getByRole('button', {name:'识字翻翻乐',exact:true}).click();
  await expect(page.getByLabel('学习阶段', {exact:true})).toHaveValue('2A');
  await expect(page.getByLabel('选择课次')).toHaveValue('3');
  await page.getByRole('button', {name:'组词小工坊',exact:true}).click();
  await expect(page.getByLabel('学习阶段', {exact:true})).toHaveValue('3B');
  await expect(page.getByLabel('选择课次')).toHaveValue('9');
  await expect(page.getByLabel('输入其他词语', {exact:true})).toHaveValue('测试草稿');
});

test('workshop renderer initialization failure leaves all classroom actions usable', async ({page}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      return type.startsWith('webgl') ? null : original.call(this, type, ...args);
    };
  });
  await openWorkshop(page);
  await expect(page.locator('#workshop-scene')).toHaveAttribute('data-mode', 'simple');
  await page.getByLabel('输入其他词语', {exact:true}).fill('爸爸');
  await page.locator('#reveal').click();
  await page.locator('#correct').click();
  await expect(page.locator('[data-score="team-1"]')).toHaveText('1');
});

test('workshop projector and narrow layout keeps text and controls in bounds', async ({page}) => {
  await openWorkshop(page);
  for (const [width,height] of [[1920,1080],[1280,720],[390,844]]) {
    await page.setViewportSize({width,height});
    await page.getByLabel('输入其他词语', {exact:true}).fill('爸爸爸爸爸爸爸爸');
    const bounds = await page.evaluate(() => ({scroll:document.documentElement.scrollWidth,width:innerWidth}));
    expect(bounds.scroll).toBeLessThanOrEqual(bounds.width);
    const box = await page.locator('#workshop-word').boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x+box.width).toBeLessThanOrEqual(width);
    const primary = page.locator('.answer-controls button:visible').first();
    await expect(primary).toBeVisible();
    if (width >= 1000) {
      const actions = await primary.boundingBox();
      expect(actions.y + actions.height).toBeLessThanOrEqual(height);
      if (await page.locator('#reveal').isVisible()) await page.locator('#reveal').click();
      const judgment = await page.locator('#correct').boundingBox();
      expect(judgment.y + judgment.height).toBeLessThanOrEqual(height);
    }
  }
});

test('short projector revealed target, progress and word tray never overlap', async ({page}) => {
  await page.setViewportSize({width:1280,height:720});
  await openWorkshop(page);
  await page.getByLabel('输入其他词语', {exact:true}).fill('爸爸');
  await page.locator('#reveal').click();
  const stage = await page.locator('.stage-top').boundingBox();
  const prompt = await page.locator('.workshop-topline h3').boundingBox();
  const target = await page.locator('.workshop-topline').boundingBox();
  const tray = await page.locator('.workshop-word-wrap').boundingBox();
  expect(prompt.y).toBeGreaterThanOrEqual(stage.y + stage.height);
  expect(tray.y).toBeGreaterThanOrEqual(target.y + target.height);
  const correct = await page.locator('#correct').boundingBox();
  expect(correct.y + correct.height).toBeLessThanOrEqual(720);
});

test('arrow navigation remains available after selecting a tile or team', async ({page}) => {
  await openWorkshop(page, questions);
  await page.locator('#workshop-tiles button').first().click();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#progress')).toHaveText('02 / 03');
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#progress')).toHaveText('01 / 03');
  await page.getByRole('button', {name:'识字翻翻乐',exact:true}).click();
  await page.locator('#teams button').first().click();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#progress')).toHaveText('02 / 03');
});

for (const mode of ['识字翻翻乐','组词小工坊']) {
  test(`restored GPU context can resume ${mode} without losing classroom state`, async ({page}) => {
    await openWorkshop(page);
    await page.getByRole('button', {name:mode,exact:true}).click();
    if (mode === '组词小工坊') await page.getByLabel('输入其他词语', {exact:true}).fill('爸爸');
    const host = page.locator(mode === '组词小工坊' ? '#workshop-scene' : '#scene');
    await expect(host).toHaveAttribute('data-mode','webgl');
    await host.locator('canvas').evaluate(canvas => {
      const extension = canvas.getContext('webgl2').getExtension('WEBGL_lose_context');
      if (!extension) throw new Error('GPU context loss extension is required for this integration test');
      canvas.addEventListener('webglcontextrestored', () => { canvas.dataset.testRestored='true'; }, {once:true});
      canvas.addEventListener('webglcontextlost', () => { setTimeout(() => extension.restoreContext(),100); }, {once:true});
      extension.loseContext();
    });
    await expect(host).toHaveAttribute('data-mode','simple');
    await expect(host.locator('canvas')).toHaveAttribute('data-test-restored','true');
    await page.getByRole('button', {name:'立体显示',exact:true}).click();
    await expect(host).toHaveAttribute('data-mode','webgl');
    await expect(page.locator('#progress')).toHaveText('01 / 01');
    if (mode === '组词小工坊') await expect(page.getByLabel('输入其他词语', {exact:true})).toHaveValue('爸爸');
    await page.locator('#reveal').click();
    await page.locator('#correct').click();
    await expect(page.locator('[data-score="team-1"]')).toHaveText('1');
  });
}
