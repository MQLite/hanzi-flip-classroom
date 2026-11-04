import {test,expect} from '@playwright/test';

const saveKey='hanzi-flip.poetry-quest.v1';
const pick=async(page,field,value)=>page.locator(`[data-field="${field}"][data-value="${value}"]`).click();
async function solve(page,object,answers){
  await page.locator(`[data-object="${object}"]`).click();
  for(const [field,value] of Object.entries(answers))await pick(page,field,value);
  await page.locator('#quest-check').click();
  await expect(page.locator(`[data-object="${object}"]`)).toHaveAttribute('data-solved','true');
}
async function fourMemories(page){
  await solve(page,'mirror',{unchanged:'accent',changed:'hair'});
  await solve(page,'door',{self:'home',children:'guest',evidence:'unknown'});
  await solve(page,'wardrobe',{left:'纟',right:'逢',reading:'féng'});
  await solve(page,'desk',{feeling:'worry',evidence:'late'});
}

test('homepage opens the standalone quest and existing classroom modes remain available',async({page})=>{
  await page.goto('/');
  await expect(page.locator('#mode-flip')).toBeVisible();
  await expect(page.locator('#mode-sudoku')).toBeVisible();
  await page.getByRole('link',{name:'诗词解谜',exact:true}).click();
  await expect(page.getByRole('heading',{name:'旧屋里的两封信',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'带提示探索',exact:true})).toBeVisible();
});

test('challenge quest supports both branches, evidence, hints and two correctly delivered letters',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/quest.html');
  await page.evaluate(()=>localStorage.setItem('hanzi-flip.question-bank','existing-bank-untouched'));
  await page.getByRole('button',{name:'独立挑战',exact:true}).click();
  await page.locator('[data-object="desk"]').click();
  await expect(page.locator('#quest-inspector')).toContainText('先找回衣柜');
  await page.locator('[data-object="mirror"]').click();
  await page.locator('#quest-hint').click();
  await expect(page.locator('#quest-hints')).toBeVisible();
  await expect(page.locator('#quest-progress')).toContainText('0 / 5');
  await fourMemories(page);
  await page.locator('[data-object="mailbox"]').click();
  await page.locator('[data-letter="motherLetter"]').click();
  await page.locator('[data-recipient="home"]').click();
  await expect(page.locator('#quest-feedback')).toContainText('还没有对应');
  await page.locator('[data-recipient="mother"]').click();
  await expect(page.locator('#quest-progress')).toContainText('4 / 5');
  await page.locator('[data-letter="homeLetter"]').click();
  await page.locator('[data-recipient="home"]').click();
  await expect(page.locator('#quest-complete')).toBeVisible();
  await expect(page.locator('#quest-progress')).toContainText('5 / 5');
  expect(await page.evaluate(()=>localStorage.getItem('hanzi-flip.question-bank'))).toBe('existing-bank-untouched');
  expect(errors).toEqual([]);
  await page.screenshot({path:'test-results/quest-complete-desktop.png',fullPage:true});
});

test('reload continues progress and reset only happens after confirmation',async({page})=>{
  await page.goto('/quest.html');
  await page.getByRole('button',{name:'带提示探索',exact:true}).click();
  await solve(page,'wardrobe',{left:'纟',right:'逢',reading:'féng'});
  await page.reload();
  await page.getByRole('button',{name:'继续上次探索',exact:true}).click();
  await expect(page.locator('#quest-progress')).toContainText('1 / 5');
  page.once('dialog',dialog=>dialog.dismiss());
  await page.locator('#quest-reset').click();
  await expect(page.locator('#quest-progress')).toContainText('1 / 5');
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#quest-reset').click();
  await expect(page.locator('#quest-progress')).toContainText('0 / 5');
});

test('mobile taps, keyboard choices and poem support remain readable without horizontal overflow',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/quest.html');
  await page.getByRole('button',{name:'带提示探索',exact:true}).click();
  await page.locator('[data-object="wardrobe"]').click();
  const left=page.locator('[data-field="left"][data-value="纟"]');
  await left.focus();await page.keyboard.press('Enter');
  await expect(page.locator('[data-field="left"][data-value="纟"]')).toHaveAttribute('aria-pressed','true');
  await page.locator('#quest-book').click();
  await expect(page.locator('#quest-inspector')).toContainText('慈母手中线');
  await expect(page.locator('#quest-inspector')).toContainText('乡音无改');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/quest-mobile.png',fullPage:true});
});

test('unusable saves and blocked storage still permit a new local playthrough',async({browser,baseURL})=>{
  const context=await browser.newContext({baseURL});
  const page=await context.newPage();
  await page.goto('/quest.html');
  await page.evaluate(key=>localStorage.setItem(key,'{"version":1,"solved":["desk"]}'),saveKey);
  await page.reload();
  await expect(page.getByRole('button',{name:'继续上次探索',exact:true})).toHaveCount(0);
  await page.addInitScript(()=>{Storage.prototype.setItem=function(){throw new DOMException('disabled','SecurityError');};});
  await page.reload();
  await page.getByRole('button',{name:'带提示探索',exact:true}).click();
  await solve(page,'wardrobe',{left:'纟',right:'逢',reading:'féng'});
  await expect(page.locator('#quest-storage-note')).toContainText('本次仍可继续');
  await context.close();
});

test('earned letters remain readable before the other branch and after delivery',async({page})=>{
  await page.goto('/quest.html');await page.getByRole('button',{name:'带提示探索',exact:true}).click();
  await solve(page,'wardrobe',{left:'纟',right:'逢',reading:'féng'});
  await solve(page,'desk',{feeling:'worry',evidence:'late'});
  await page.locator('[data-letter="motherLetter"]').click();
  await expect(page.locator('#quest-inspector')).toContainText('衣上的针脚也是家留给我的牵挂');
  await solve(page,'mirror',{unchanged:'accent',changed:'hair'});
  await solve(page,'door',{self:'home',children:'guest'});
  await page.locator('[data-object="mailbox"]').click();
  await page.locator('[data-letter="motherLetter"]').click();await page.locator('[data-recipient="mother"]').click();
  await page.locator('[data-letter="homeLetter"]').click();await page.locator('[data-recipient="home"]').click();
  await page.getByRole('button',{name:'回看收集的记忆'}).click();
  await page.locator('[data-letter="homeLetter"]').click();
  await expect(page.locator('#quest-inspector')).toContainText('你已经有了新的故事');
});

test('zero solved puzzles still protect saved exploration from a new-mode replacement',async({page})=>{
  await page.goto('/quest.html');await page.getByRole('button',{name:'带提示探索',exact:true}).click();
  await page.locator('[data-object="mirror"]').click();await page.locator('#quest-hint').click();await page.locator('#quest-hint').click();
  await page.reload();
  const before=await page.evaluate(key=>localStorage.getItem(key),saveKey);
  let asked=false;page.once('dialog',async dialog=>{asked=true;await dialog.dismiss();});
  await page.getByRole('button',{name:'独立挑战',exact:true}).click();
  expect(asked).toBe(true);
  expect(await page.evaluate(key=>localStorage.getItem(key),saveKey)).toBe(before);
  await expect(page.getByRole('button',{name:'继续上次探索',exact:true})).toBeVisible();
});

test('inspector keeps the current control visible and focuses feedback on small laptops',async({page})=>{
  await page.setViewportSize({width:1024,height:620});
  await page.goto('/quest.html');await page.getByRole('button',{name:'带提示探索',exact:true}).click();
  const wardrobe=page.locator('[data-object="wardrobe"]');await wardrobe.focus();await page.keyboard.press('Enter');
  await expect(page.getByRole('heading',{name:'针脚之间',exact:true})).toBeFocused();
  const reading=page.locator('[data-field="reading"][data-value="féng"]');
  await reading.scrollIntoViewIfNeeded();
  const before=await page.locator('#quest-inspector').evaluate(n=>n.scrollTop);expect(before).toBeGreaterThan(0);
  await reading.click();
  expect(await page.locator('#quest-inspector').evaluate(n=>n.scrollTop)).toBeGreaterThanOrEqual(before-2);
  await expect(page.locator('[data-field="reading"][data-value="féng"]')).toBeInViewport();
  await page.locator('#quest-check').click();
  await expect(page.locator('#quest-feedback')).toBeInViewport();
  await expect(page.locator('#quest-feedback')).toBeFocused();
});
