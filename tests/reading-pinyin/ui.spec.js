import {test,expect} from '@playwright/test';
async function dock(page){await expect(page.locator('.lesson-toolbar #pinyin')).toHaveCount(0);await expect(page.locator('#reading-pinyin-dock #pinyin')).toHaveCount(1);await expect(page.locator('#pinyin')).not.toBeChecked();}
async function corner(page){const control=await page.locator('#pinyin').locator('..').boundingBox(),area=await page.locator('.play-area').boundingBox();expect(area.x+area.width-control.x-control.width).toBeLessThan(28);expect(area.y+area.height-control.y-control.height).toBeLessThan(24);}
test('building starts without pinyin; lower-right optional switch preserves words, progress and teacher choice',async({page})=>{
  await page.goto('/?mode=building');await dock(page);await expect(page.locator('.builder-pinyin:visible')).toHaveCount(0);await page.locator('#builder-start').click();await page.locator('#builder-draw').click();await expect(page.locator('#builder-word')).toBeVisible();await expect(page.locator('.builder-pinyin:visible')).toHaveCount(0);await corner(page);const word=await page.locator('#builder-word').textContent();await page.locator('#pinyin').check();await expect(page.locator('.builder-pinyin:visible')).toHaveCount(1);await expect(page.locator('#builder-word')).toHaveText(word);await page.locator('#pinyin').focus();await page.keyboard.press('Space');await expect(page.locator('#pinyin')).not.toBeChecked();await expect(page.locator('#pinyin')).toBeFocused();await expect(page.locator('#builder-progress')).toContainText('0 /');await expect(page.locator('.builder-pinyin:visible')).toHaveCount(0);
  page.on('dialog',d=>d.accept());await page.getByLabel('学习阶段',{exact:true}).selectOption('1B');await expect(page.locator('#pinyin')).not.toBeChecked();await page.locator('#pinyin').check();await page.getByLabel('学习阶段',{exact:true}).selectOption('2A');await expect(page.locator('#pinyin')).toBeChecked();await page.locator('#mode-maze').click();await expect(page.locator('#pinyin')).not.toBeChecked();await page.locator('#mode-building').click();await expect(page.locator('#pinyin')).toBeChecked();await page.locator('#pinyin').uncheck();await page.locator('#bank-source').selectOption('personal');await page.locator('#grade').selectOption('2');await expect(page.locator('#pinyin')).not.toBeChecked();await page.locator('#pinyin').check();await page.locator('#grade').selectOption('3');await expect(page.locator('#pinyin')).toBeChecked();
});
test('witch reading defaults to characters and bottom-right pinyin never resets secret choices or read cards',async({page})=>{
  await page.goto('/?mode=poison');await dock(page);await page.locator('#poison-start').click();await page.locator('#poison-begin-hide').click();const ids=await page.locator('[data-poison-card]').evaluateAll(nodes=>nodes.map(n=>n.dataset.poisonCard));await page.locator(`[data-poison-card="${ids[0]}"]`).click();await page.locator('#poison-seal').click();await page.locator('#poison-read').click();await expect(page.locator('.poison-pinyin:visible')).toHaveCount(0);await corner(page);await page.locator(`[data-poison-card="${ids[1]}"]`).click();await page.locator('#pinyin').check();expect(await page.locator('.poison-pinyin:visible').count()).toBeGreaterThan(0);await expect(page.locator(`[data-poison-card="${ids[1]}"]`)).toBeDisabled();await expect(page.locator('#witch-poison')).toHaveAttribute('data-phase','read');await page.locator('#pinyin').uncheck();await expect(page.locator('.poison-pinyin:visible')).toHaveCount(0);await expect(page.locator('#witch-poison')).toHaveAttribute('data-phase','read');
  await page.setViewportSize({width:390,height:844});await page.locator('#reading-pinyin-dock').scrollIntoViewIfNeeded();await page.locator('#pinyin').check();await expect(page.locator('#pinyin')).toBeChecked();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.locator(`[data-poison-card="${ids[0]}"]`).click();await expect(page.locator('#witch-poison')).toHaveAttribute('data-phase','complete');await expect(page.locator('#poison-antidote-prompt')).toBeVisible();
});
test('maze shows only the selected character until optional pinyin is enabled, without moving the pawn',async({page})=>{
  await page.goto('/?mode=maze');await dock(page);const saved=await page.evaluate(()=>localStorage.getItem('hanzi-flip.question-bank'));await page.locator('#maze-start').click();await page.locator('[data-maze-cell="10"]').click();await expect(page.locator('#maze-read-word')).toBeVisible();await expect(page.locator('.maze-read-pinyin:visible')).toHaveCount(0);await corner(page);await page.locator('#pinyin').check();await expect(page.locator('.maze-read-pinyin')).toBeVisible();await expect(page.locator('[aria-current="location"]')).toHaveAttribute('data-maze-cell','9');await page.locator('#pinyin').uncheck();await expect(page.locator('.maze-read-pinyin:visible')).toHaveCount(0);await page.locator('#mode-train').click();await expect(page.locator('.lesson-toolbar #pinyin')).toHaveCount(1);await expect(page.locator('#reading-pinyin-dock')).toBeHidden();await page.locator('#mode-maze').click();await expect(page.locator('#reading-pinyin-dock #pinyin')).toHaveCount(1);await expect(page.locator('#pinyin')).not.toBeChecked();await expect(page.locator('#maze-confirm')).toBeEnabled();expect(await page.evaluate(()=>localStorage.getItem('hanzi-flip.question-bank'))).toBe(saved);
});

test('building translates the directions while keeping the drawn word and reading progress intact',async({page})=>{
  await page.goto('/?mode=building');
  const toggle=page.getByRole('checkbox',{name:'英文指令'});
  const start=page.locator('#builder-start');
  await expect(toggle).not.toBeChecked();
  await expect(start).toHaveText('开始搭建');
  await toggle.check();
  await expect(start.getByText('Start building',{exact:true})).toBeVisible();
  await expect(page.locator('[data-builder-choice] [lang=en]')).toHaveCount(0);
  await expect(page.locator('#pinyin')).not.toBeChecked();

  const choices=page.locator('[data-builder-choice][aria-pressed=true]');
  while(await choices.count()>1)await choices.last().click();
  await start.click();
  await page.locator('#builder-draw').click();
  const word=page.locator('#builder-word'),original=await word.textContent();
  const confirm=page.locator('#builder-confirm');
  await expect(confirm.getByText('Correct! Add a brick.',{exact:true})).toBeVisible();
  await toggle.uncheck();
  await expect(confirm).toHaveText('读对了，搭一块词砖');
  await expect(word).toHaveText(original);
  await expect(page.locator('#builder-progress')).toContainText('0 /');
  await toggle.check();
  await confirm.click();

  const card=page.locator('[data-builder-card]');
  await expect(card.locator('[lang=en]')).toHaveCount(0);
  await card.click();
  await expect(page.getByText('Read the lesson sentence aloud to rebuild.',{exact:true})).toBeVisible();
  await expect(page.locator('#builder-rescue-sentence [lang=en]')).toHaveCount(0);
  await page.locator('#mode-poison').click();
  await expect(toggle).not.toBeChecked();
  await page.locator('#mode-maze').click();
  await expect(toggle).toBeHidden();
  await page.locator('#mode-building').click();
  await expect(toggle).toBeChecked();
  await expect(page.locator('#hanzi-building')).toHaveAttribute('data-phase','cleared');
});

test('the witch translates directions, including the antidote cue, without translating words or the sentence',async({page})=>{
  await page.goto('/?mode=poison');
  const toggle=page.getByRole('checkbox',{name:'英文指令'});
  await page.locator('#poison-start').click();
  await toggle.check();
  await expect(page.getByText('Everyone else, close your eyes.',{exact:true})).toBeVisible();
  await page.locator('#poison-begin-hide').click();
  const poison=page.locator('[data-poison-card]').first();
  await poison.click();
  await toggle.uncheck();
  await expect(poison).toHaveAttribute('aria-pressed','true');
  await page.locator('#poison-seal').click();
  await page.locator('#poison-read').click();
  await page.locator('[data-poison-card]').nth(1).click();
  await page.setViewportSize({width:390,height:844});
  await toggle.check();
  await expect(page.getByText('Read first. Your teacher taps the card.',{exact:true})).toBeVisible();
  await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
  const dock=await page.locator('#reading-pinyin-dock').boundingBox();
  const controls=await page.locator('#witch-poison .poison-controls').boundingBox();
  expect(dock.y+dock.height).toBeLessThanOrEqual(controls.y);
  await toggle.uncheck();
  await expect(page.getByText('Read first. Your teacher taps the card.',{exact:true})).toHaveCount(0);
  await toggle.check();
  await expect(page.locator('[data-poison-card]').nth(1)).toBeDisabled();
  await expect(page.locator('[data-poison-card] [lang=en]')).toHaveCount(0);
  await poison.click();
  await page.locator('#poison-antidote').click();
  const direction=page.getByText('Read the antidote sentence aloud.',{exact:true});
  await expect(direction).toBeVisible();
  await expect(page.locator('#poison-antidote-sentence [lang=en]')).toHaveCount(0);
  await toggle.uncheck();
  await expect(direction).toHaveCount(0);
  await expect(page.locator('#poison-antidote-sentence')).toBeVisible();
});
