import {test,expect} from '@playwright/test';
const key='hanzi-flip.question-bank';
test('opening the site shows the island map as a usable homepage with course controls',async({page})=>{
 await page.goto('/');await expect(page.locator('#island-map')).toBeVisible();await expect(page.locator('#island-map')).not.toHaveJSProperty('tagName','DIALOG');
 await expect(page.locator('.island-card')).toHaveCount(11);await expect(page.locator('.classroom')).toBeHidden();await expect(page.locator('#reveal')).toBeHidden();
 await expect(page.getByLabel('题库来源')).toBeVisible();await expect(page.locator('#stage')).toBeVisible();await expect(page.getByLabel('选择课次')).toBeEnabled();await expect(page.getByLabel('练习范围')).toBeHidden();
 await expect(page.getByRole('button',{name:'按顺序闯关',exact:true})).toBeVisible();const stored=await page.evaluate(k=>localStorage.getItem(k),key);
 await page.keyboard.press('Space');await page.keyboard.press('ArrowRight');await expect(page.locator('#island-map')).toBeVisible();
 await page.locator('#open-help').click();await expect(page.locator('#help-dialog')).toBeVisible();await page.getByRole('button',{name:'关闭帮助',exact:true}).click();
 expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe(stored);
});
test('homepage selection drives journey and survives returning home and reloading',async({page})=>{
 await page.goto('/');await page.getByLabel('题库来源').selectOption('zhongwen');await page.getByLabel('选择册数',{exact:true}).selectOption('2');await page.getByLabel('选择课次').selectOption('4');
 await expect(page.locator('.island-map-course')).toContainText('第4课');await expect(page.locator('.island-card[data-mode="explore"]')).toBeDisabled();
 await page.getByRole('button',{name:'按顺序闯关',exact:true}).click();await expect(page.locator('#island-map')).toBeHidden();await expect(page.locator('#mode-flip')).toHaveAttribute('aria-pressed','true');await expect(page.getByLabel('选择课次')).toHaveValue('4');
 await page.locator('#open-island-map').click();await expect(page.locator('#island-map')).toBeVisible();await expect(page.getByRole('button',{name:'继续闯关',exact:true})).toBeVisible();
 await page.reload();await expect(page.locator('#island-map')).toBeVisible();await expect(page.getByLabel('选择册数',{exact:true})).toHaveValue('2');await expect(page.getByLabel('选择课次')).toHaveValue('4');
 await page.getByRole('button',{name:'继续闯关',exact:true}).click();await expect(page.locator('#island-journey-strip')).toBeVisible();await expect(page.getByLabel('选择课次')).toHaveValue('4');
});
test('independent challenge launches the selected course and deep links still open games',async({page})=>{
 await page.goto('/');await page.locator('#stage').selectOption('2A');await page.getByLabel('选择课次').selectOption('1');await page.locator('.island-card[data-mode="maze"]').click();
 await expect(page.locator('#mode-maze')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#island-map')).toBeHidden();await expect(page.locator('#island-journey-strip')).toBeHidden();
 await page.reload();await expect(page.locator('#mode-maze')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#stage')).toHaveValue('2A');
 await page.locator('#open-island-map').click();await expect(page.locator('#island-map')).toBeVisible();await expect(page.getByLabel('选择课次')).toBeEnabled();
 await page.goto('/?mode=strokes');await expect(page.locator('.writing-grid')).toBeVisible();await expect(page.locator('#island-map')).toBeHidden();
 await page.goto('/?mode=flip');await expect(page.locator('#reveal')).toBeVisible();await expect(page.locator('#island-map')).toBeHidden();
});
test('home offers fifth-book lessons and adapts personal grade and empty content',async({page})=>{
 await page.goto('/');await page.getByLabel('题库来源').selectOption('zhongwen');await page.getByLabel('选择册数',{exact:true}).selectOption('5');await expect(page.getByLabel('选择课次')).toHaveValue('1');
 await expect(page.getByLabel('选择课次').locator('option')).toHaveCount(12);
 await page.getByLabel('选择课次').selectOption('9');
 await expect(page.locator('.island-card[data-mode="flip"]')).toBeEnabled();
 await expect(page.locator('.island-card[data-mode="sudoku"]')).toBeEnabled();
 await page.locator('.island-card[data-mode="explore"]').click();await expect(page.locator('#exploration-catalog')).toContainText('旧屋里的两封信');
 await page.locator('#open-island-map').click();await page.getByLabel('题库来源').selectOption('personal');await expect(page.getByLabel('选择年级')).toBeVisible();await expect(page.locator('#stage')).toBeHidden();
 await page.getByLabel('选择年级').selectOption('4');await expect(page.locator('.island-map-course')).toContainText('4年级');
 await page.evaluate(k=>localStorage.setItem(k,JSON.stringify({schemaVersion:1,questions:[]})),key);await page.reload();await expect(page.getByRole('button',{name:'按顺序闯关',exact:true})).toBeDisabled();
});
test('cancelling a fresh challenge keeps the homepage visible and usable',async({page})=>{
 await page.goto('/?mode=puzzle');await page.locator('.parts-palette button').first().click();await page.locator('#open-island-map').click();
 page.once('dialog',d=>d.dismiss());await page.locator('.island-card[data-mode="building"]').click();await expect(page.locator('#island-map')).toBeVisible();await expect(page.getByLabel('题库来源')).toBeVisible();
 page.once('dialog',d=>d.accept());await page.locator('.island-card[data-mode="building"]').click();await expect(page.locator('#hanzi-building')).toBeVisible();await expect(page.locator('#island-map')).toBeHidden();
});
test('launching a lower island on a phone begins at the top of its game',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await page.locator('.island-card[data-mode="train"]').click();
 await expect(page.locator('#mode-train')).toHaveAttribute('aria-pressed','true');expect(await page.evaluate(()=>scrollY)).toBeLessThan(80);
});
test('personal grade restoration agrees with the displayed control and launched vocabulary',async({page})=>{
 const questions=[{id:'one',grade:1,character:'一',pinyin:'yī',words:['一','一'],sentence:'一。'},{id:'wood',grade:4,character:'木',pinyin:'mù',words:['木头','树木'],sentence:'木头。'}];
 await page.addInitScript(({key,questions})=>localStorage.setItem(key,JSON.stringify({schemaVersion:1,questions})),{key,questions});
 await page.goto('/');await page.getByLabel('选择年级').selectOption('4');await page.reload();
 await expect(page.getByLabel('选择年级')).toHaveValue('4');await expect(page.locator('.island-map-course')).toContainText('4年级');
 await page.locator('.island-card[data-mode="mole"]').click();expect((await page.locator('[data-mole-slot][data-status="up"] .mole-word').allTextContents()).sort()).toEqual(['木','木头','树木']);
 await page.locator('#open-island-map').click();await page.getByLabel('选择年级').selectOption('1');await page.reload();await expect(page.getByLabel('选择年级')).toHaveValue('1');
 await page.locator('.island-card[data-mode="mole"]').click();expect(await page.locator('[data-mole-slot][data-status="up"] .mole-word').allTextContents()).toEqual(['一']);
});
test('projector island artwork leaves the game names readable below it',async({page})=>{
 await page.setViewportSize({width:1280,height:720});await page.goto('/');
 const boxes=await page.locator('.island-card').evaluateAll(cards=>cards.map(card=>({art:card.querySelector('.island-art').getBoundingClientRect().bottom,label:card.querySelector('.island-label').getBoundingClientRect().top})));
 for(const box of boxes)expect(box.label).toBeGreaterThanOrEqual(box.art);
});
for(const viewport of [{width:1280,height:720},{width:1920,height:1080},{width:390,height:844}])test(`homepage islands and launch controls fit ${viewport.width}`,async({page})=>{
 await page.setViewportSize(viewport);await page.goto('/');await expect(page.locator('#island-map')).toBeVisible();await expect(page.getByRole('button',{name:'按顺序闯关',exact:true})).toBeInViewport();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 if(viewport.width>=1000)await expect(page.locator('.island-card').last()).toBeInViewport();
 await page.locator('.island-card').last().scrollIntoViewIfNeeded();await expect(page.locator('.island-card').last()).toBeInViewport();await page.screenshot({path:`docs/codex/island-home-${viewport.width}.png`,fullPage:true});
});
