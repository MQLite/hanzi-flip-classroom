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

test('fifth classroom mode routes only the matching textbook lesson to its scenario',async({page})=>{
  await page.goto('/?mode=flip');
  await expect(page.locator('#mode-flip')).toBeVisible();
  await expect(page.locator('#mode-sudoku')).toBeVisible();
  const originalCharacter=await page.locator('.hanzi').innerText();
  await page.getByRole('button',{name:'情景探索',exact:true}).click();
  await expect(page.locator('#mode-explore')).toHaveAttribute('aria-pressed','true');
  await expect(page.getByLabel('题库来源')).toHaveValue('zhongwen');
  await expect(page.getByLabel('选择册数',{exact:true})).toHaveValue('5');
  await expect(page.getByLabel('选择课次',{exact:true})).toHaveValue('9');
  await expect(page.locator('#exploration-catalog')).toContainText('古诗二首');
  await page.getByLabel('选择册数',{exact:true}).selectOption('1');
  await expect(page.locator('#exploration-catalog')).toContainText('待补充');
  await expect(page.getByRole('link',{name:'进入情景',exact:true})).toHaveCount(0);
  await page.getByLabel('选择册数',{exact:true}).selectOption('5');
  await page.locator('#mode-flip').click();
  await expect(page.locator('.hanzi')).toHaveText(originalCharacter);
  await expect(page.getByLabel('学习阶段',{exact:true}).locator('option[value="5"]')).toHaveCount(0);
  await page.locator('#mode-explore').click();
  await expect(page.getByLabel('选择册数',{exact:true})).toHaveValue('5');
  await page.getByRole('link',{name:'进入情景',exact:true}).click();
  await expect(page.getByRole('heading',{name:'旧屋里的两封信',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'带提示探索',exact:true})).toBeVisible();
  await page.getByRole('link',{name:/返回情景探索/}).click();
  await expect(page.locator('#mode-explore')).toHaveAttribute('aria-pressed','true');
  await expect(page.getByRole('link',{name:'进入情景',exact:true})).toBeVisible();
});

test('exploration catalog stays scoped on other textbooks and fits mobile screens',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/?mode=explore');
  await expect(page.getByRole('link',{name:'进入情景',exact:true})).toBeVisible();
  await page.getByLabel('题库来源').selectOption('paradise');
  await expect(page.locator('#exploration-catalog')).toContainText('待补充');
  await expect(page.getByRole('link',{name:'进入情景',exact:true})).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByLabel('题库来源').selectOption('zhongwen');
  await page.getByLabel('选择册数',{exact:true}).selectOption('5');
  await expect(page.getByRole('link',{name:'进入情景',exact:true})).toBeVisible();
  await page.screenshot({path:'test-results/exploration-catalog-mobile.png',fullPage:true});
});

test('unvisited practice modes choose a supported book after fifth-book exploration',async({page})=>{
  for(const mode of ['train','workshop','sudoku']){
    await page.goto('/?mode=explore');
    await page.locator(`#mode-${mode}`).click();
    await expect(page.getByLabel('选择册数',{exact:true})).toHaveValue('1');
    await expect(page.getByLabel('选择课次',{exact:true})).toHaveValue('1');
    await expect(page.locator(`#${mode==='train'?'sentence-train':mode}`)).toBeVisible();
    await page.locator('#mode-explore').click();
    await expect(page.getByLabel('选择册数',{exact:true})).toHaveValue('5');
    await expect(page.getByRole('link',{name:'进入情景',exact:true})).toBeVisible();
  }
});

test('ambient soundtrack is opt-in and can be muted without affecting puzzle progress',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const audio=await page.context().newCDPSession(page);
  let contextState=null,oscillators=0;
  audio.on('WebAudio.contextCreated',({context})=>{contextState=context.contextState;});
  audio.on('WebAudio.contextChanged',({context})=>{contextState=context.contextState;});
  audio.on('WebAudio.audioNodeCreated',({node})=>{if(node.nodeType.includes('Oscillator'))oscillators++;});
  await audio.send('WebAudio.enable');
  await page.goto('/quest.html');
  const music=page.getByRole('button',{name:'探索配乐',exact:true});
  await expect(music).toHaveAttribute('aria-pressed','false');
  expect(contextState).toBe(null);
  await music.click();
  await expect(music).toHaveAttribute('aria-pressed','true');
  await expect.poll(()=>contextState).toBe('running');
  await expect.poll(()=>oscillators).toBeGreaterThan(0);
  await page.getByRole('button',{name:'带提示探索',exact:true}).click();
  await solve(page,'wardrobe',{left:'纟',right:'逢',reading:'féng'});
  await expect(music).toHaveAttribute('aria-pressed','true');
  await music.click();
  await expect(music).toHaveAttribute('aria-pressed','false');
  await expect.poll(()=>contextState).toBe('suspended');
  await expect(page.locator('[data-object="wardrobe"]')).toHaveAttribute('data-solved','true');
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(errors).toEqual([]);
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
