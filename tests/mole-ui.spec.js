import {test,expect} from '@playwright/test';

const key='hanzi-flip.question-bank';
async function personal(page,questions){
  await page.addInitScript(({key,questions})=>localStorage.setItem(key,JSON.stringify({schemaVersion:1,questions})),{key,questions});
  await page.goto('/?mode=mole');
}
const questions=[{id:'ball',grade:1,character:'球',pinyin:'qiú',words:['篮球','足球'],sentence:'我喜欢打篮球。'}];
const up=page=>page.locator('[data-mole-slot][data-status="up"]');

test('sixth mode uses current lesson characters and vocabulary without changing the saved bank',async({page})=>{
  await page.goto('/');
  await page.getByLabel('题库来源').selectOption('zhongwen');await page.getByLabel('选择册数',{exact:true}).selectOption('2');
  const before=await page.evaluate(key=>localStorage.getItem(key),key);
  await page.getByRole('button',{name:'打地鼠',exact:true}).click();
  await expect(page.locator('#mode-mole')).toHaveAttribute('aria-pressed','true');
  await expect(page.getByLabel('练习范围')).toBeHidden();
  await expect(up(page)).toHaveCount(9);
  await page.getByLabel('打地鼠练习内容').selectOption('characters');
  expect(await up(page).locator('.mole-word').allTextContents()).toEqual(expect.arrayContaining(['在','教','汉','语','写','歌','画']));
  await expect(page.locator('#mole')).toContainText('0 / 7');
  await page.getByLabel('打地鼠练习内容').selectOption('words');
  expect((await up(page).locator('.mole-word').allTextContents()).every(w=>[...w].length>1)).toBe(true);
  expect(await page.evaluate(key=>localStorage.getItem(key),key)).toBe(before);
});

test('teacher clicks hit moles once and all correct answers trigger the celebration',async({page})=>{
  await personal(page,questions);
  await expect(up(page)).toHaveCount(3);
  await expect(page.locator('#mole-celebration')).toBeHidden();
  await up(page).first().focus();await page.keyboard.press('Enter');
  await expect(page.locator('[data-score="team-1"]')).toHaveText('1');
  await page.locator('#teams button').nth(1).click();
  while(await up(page).count())await up(page).first().click();
  await expect(page.locator('#mole')).toHaveAttribute('data-phase','complete');
  await expect(page.locator('#mole-celebration')).toBeVisible();
  await expect(page.locator('#mole-celebration')).toContainText('全部读对啦');
  await expect(page.locator('[data-score="team-2"]')).toHaveText('2');
  await page.screenshot({path:'test-results/mole-complete.png',fullPage:true});
  await page.getByRole('button',{name:'再玩一轮',exact:true}).click();
  await expect(up(page)).toHaveCount(3);await expect(page.locator('[data-score="team-1"]')).toHaveText('0');
});

test('hammer locks a hit, mode changes settle it and each game retains its own progress',async({page})=>{
  await page.emulateMedia({reducedMotion:'no-preference'});await personal(page,questions);
  const first=up(page).first(),slot=await first.getAttribute('data-mole-slot');
  const mole=page.locator(`[data-mole-slot="${slot}"]`),word=await mole.getAttribute('data-mole-word');
  await mole.click();await expect(mole).toHaveAttribute('data-status','hit');await expect(mole).toBeDisabled();
  await expect(mole.locator('.mole-hammer')).toBeVisible();
  await page.locator('#mode-flip').click();await page.locator('#reveal').click();
  await page.locator('#mode-mole').click();
  await expect(page.locator('[data-score="team-1"]')).toHaveText('1');await expect(up(page)).toHaveCount(2);
  expect(await up(page).evaluateAll(nodes=>nodes.map(n=>n.dataset.moleWord))).not.toContain(word);
  page.once('dialog',d=>d.dismiss());await page.locator('#restart').click();
  await expect(page.locator('[data-score="team-1"]')).toHaveText('1');
});

test.describe('touch devices',()=>{
test.use({hasTouch:true});
test('mobile words and pinyin fit, tap hits work and empty content never celebrates',async({page})=>{
  await page.setViewportSize({width:390,height:844});await personal(page,[{...questions[0],words:['中华人民共和国','篮球']}]);
  await page.locator('.switch-label').tap();
  await expect(page.getByLabel('拼音提示',{exact:true})).toBeChecked();
  await expect(page.locator('.mole-pinyin').filter({hasText:'qiú'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await up(page).first().tap();await expect(page.locator('[data-score="team-1"]')).toHaveText('1');
  await page.screenshot({path:'test-results/mole-mobile.png',fullPage:true});
  page.once('dialog',d=>d.accept());await page.getByLabel('打地鼠练习内容').selectOption('characters');
  await expect(up(page)).toHaveCount(1);
  await page.getByLabel('题库来源').selectOption('zhongwen');
  await expect(page.getByLabel('选择册数',{exact:true})).toHaveValue('1');
});
});

test('sixth mode recovers a supported book after exploration and shows an honest empty state',async({page})=>{
  await page.goto('/?mode=explore');await page.locator('#mode-mole').click();
  await expect(page.getByLabel('选择册数',{exact:true})).toHaveValue('1');await expect(up(page)).not.toHaveCount(0);
  await page.locator('#mode-explore').click();await expect(page.getByLabel('选择册数',{exact:true})).toHaveValue('5');
  await personal(page,[{...questions[0],words:['球','球']}]);
  await expect(up(page)).toHaveCount(1);
  await page.getByLabel('打地鼠练习内容').selectOption('words');
  await expect(page.locator('#mole')).toHaveAttribute('data-phase','empty');
  await expect(page.locator('#mole')).toContainText('没有可用词语');await expect(page.locator('#mole-celebration')).toBeHidden();
});
