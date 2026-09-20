import { test, expect } from '@playwright/test';
const questions=[
 {id:'dad',grade:1,character:'爸',pinyin:'bà',words:['爸爸','老爸'],sentence:'爸爸在家。'},
 {id:'tree',grade:1,character:'木',pinyin:'mù',words:['木头','树木'],sentence:'这里有树木。'},
];
async function openWorkshop(page,bank=questions.slice(0,1)){
 await page.addInitScript(bank=>localStorage.setItem('hanzi-flip.question-bank',JSON.stringify({schemaVersion:1,questions:bank})),bank);
 await page.goto('/');
 await page.getByRole('button',{name:'组词小工坊',exact:true}).click();
}
async function choose(page,word){
 for(const character of word){
  await page.locator('#workshop-tiles button[aria-pressed="false"]').getByText(character,{exact:true}).first().click();
 }
}
const score=page=>page.locator('[data-score="team-1"]');

test('candidate characters include distractors and duplicate glyphs; selection order supports undo and clear',async({page})=>{
 await openWorkshop(page);
 const tiles=page.locator('#workshop-tiles button');
 expect(await tiles.count()).toBeGreaterThanOrEqual(8);
 expect(await tiles.filter({hasText:/^(爸|老)$/}).count()).toBeGreaterThanOrEqual(3);
 await choose(page,'爸爸');
 await expect(page.locator('#workshop-word')).toHaveText('爸爸');
 await expect(page.locator('#workshop-tiles button[aria-pressed="true"]')).toHaveCount(2);
 await page.locator('#workshop-undo').click();
 await expect(page.locator('#workshop-word')).toHaveText('爸');
 await page.locator('#workshop-clear').click();
 await expect(page.locator('#workshop-word')).toHaveText('');
 await expect(page.locator('#workshop-submit')).toBeDisabled();
});

test('incorrect fusion scatters and allows retry; correct creates collected stamp and ends one-question round',async({page})=>{
 await openWorkshop(page);
 await choose(page,'爸老');
 await page.locator('#workshop-submit').click();
 await expect(page.locator('#workshop-word')).toHaveText('');
 await expect(page.locator('#workshop-selection-note')).toContainText('未匹配');
 await expect(page.locator('#progress')).toHaveText('01 / 01');
 await expect(score(page)).toHaveText('0');
 await expect(page.locator('#workshop-collection .collected-word')).toHaveCount(0);
 await choose(page,'爸爸');
 await page.locator('#workshop-submit').click();
 await expect(score(page)).toHaveText('1');
 await expect(page.locator('#workshop-collection .collected-word')).toHaveText(['爸爸']);
 await expect(page.getByText('这一轮，真棒！',{exact:true})).toBeVisible();
 await expect(page.locator('#workshop-collection')).toBeVisible();
});

test('successful fusion automatically advances and regenerates palette while keeping collected words',async({page})=>{
 await openWorkshop(page,questions);
 const target=await page.locator('#workshop-target').innerText();
 const answer=questions.find(q=>q.character===target).words[0];
 await choose(page,answer);
 await page.locator('#workshop-submit').click();
 await expect(page.locator('#progress')).toHaveText('02 / 02');
 await expect(page.locator('#workshop-target')).not.toHaveText(target);
 await expect(page.locator('#workshop-word')).toHaveText('');
 await expect(page.locator('#workshop-collection .collected-word')).toHaveText([answer]);
 await expect(score(page)).toHaveText('1');
});

test('native keys select glyphs; mode switching preserves ordered draft and independent scores',async({page})=>{
 await openWorkshop(page);
 const tile=page.locator('#workshop-tiles').getByRole('button',{name:'爸',exact:true}).first();
 await page.getByRole('button',{name:'简化显示',exact:true}).click();
 const focusPaint=()=>tile.evaluate(element=>{
  const style=getComputedStyle(element);
  return [style.backgroundColor,style.backgroundImage,style.boxShadow];
 });
 const unfocusedPaint=await focusPaint();
 await page.keyboard.press('Tab');
 await tile.focus();
 await expect(tile).toBeFocused();
 await expect.poll(focusPaint).not.toEqual(unfocusedPaint);
 await tile.focus();await page.keyboard.press('Space');
 await expect(page.locator('#workshop-word')).toHaveText('爸');
 await page.getByRole('button',{name:'识字翻翻乐',exact:true}).click();
 await page.locator('#reveal').click();await page.locator('#correct').click();
 await page.getByRole('button',{name:'组词小工坊',exact:true}).click();
 await expect(page.locator('#workshop-word')).toHaveText('爸');
 await expect(score(page)).toHaveText('0');
 await choose(page,'爸');
 await page.locator('#workshop-submit').focus();await page.keyboard.press('Enter');
 await expect(score(page)).toHaveText('1');
});

test('animated success locks duplicate submissions and navigation until fusion completes',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});
 await openWorkshop(page,questions);
 const target=await page.locator('#workshop-target').innerText();
 const answer=questions.find(q=>q.character===target).words[0];
 await choose(page,answer);
 await page.locator('#workshop-submit').click();
 await expect(page.locator('#workshop-submit')).toBeDisabled();
 await expect(page.locator('#next')).toBeDisabled();
 await expect(page.locator('#workshop-collection .collected-word')).toHaveText([answer]);
 await expect(page.locator('#progress')).toHaveText('02 / 02');
 await expect(score(page)).toHaveText('1');
});

test('switching modes during result animation cannot advance another mode',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});
 await openWorkshop(page,questions);
 const target=await page.locator('#workshop-target').innerText();
 await choose(page,questions.find(q=>q.character===target).words[0]);
 await page.locator('#workshop-submit').click();
 await page.getByRole('button',{name:'识字翻翻乐',exact:true}).click();
 await expect(page.locator('#progress')).toHaveText('01 / 02');
 await expect(score(page)).toHaveText('0');
 await page.getByRole('button',{name:'组词小工坊',exact:true}).click();
 await expect(page.locator('#progress')).toHaveText('02 / 02');
 await expect(score(page)).toHaveText('1');
});

test('GPU fallback preserves selected glyphs and finishes wrong and correct fusion',async({page})=>{
 await openWorkshop(page);
 await choose(page,'爸老');
 await page.locator('#workshop-scene canvas').evaluate(c=>c.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));
 await expect(page.locator('#workshop-scene')).toHaveAttribute('data-mode','simple');
 await page.locator('#workshop-submit').click();
 await expect(page.locator('#workshop-word')).toHaveText('');
 await choose(page,'爸爸');await page.locator('#workshop-submit').click();
 await expect(page.locator('#workshop-collection .collected-word')).toHaveText(['爸爸']);
 await expect(score(page)).toHaveText('1');
});

test('WebGL initialization failure leaves character fusion usable',async({page})=>{
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.startsWith('webgl')?null:original.call(this,type,...args);};});
 await openWorkshop(page);
 await expect(page.locator('#workshop-scene')).toHaveAttribute('data-mode','simple');
 await choose(page,'爸爸');await page.locator('#workshop-submit').click();
 await expect(score(page)).toHaveText('1');
});

test('GPU loss during fusion completes once and restored context can resume the stamp collection',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});
 await openWorkshop(page);
 await choose(page,'爸爸');await page.locator('#workshop-submit').click();
 const host=page.locator('#workshop-scene');
 await host.locator('canvas').evaluate(canvas=>{
  const extension=canvas.getContext('webgl2').getExtension('WEBGL_lose_context');
  if(!extension)throw new Error('GPU loss extension required');
  canvas.addEventListener('webglcontextrestored',()=>{canvas.dataset.restored='true';},{once:true});
  canvas.addEventListener('webglcontextlost',()=>setTimeout(()=>extension.restoreContext(),100),{once:true});
  extension.loseContext();
 });
 await expect(page.getByText('这一轮，真棒！',{exact:true})).toBeVisible();
 await expect(score(page)).toHaveText('1');
 await expect(page.locator('#workshop-collection .collected-word')).toHaveText(['爸爸']);
 await expect(host.locator('canvas')).toHaveAttribute('data-restored','true');
 await page.getByRole('button',{name:'立体显示',exact:true}).click();
 await expect(host).toHaveAttribute('data-mode','webgl');
});

test('empty bank retains teacher management access',async({page})=>{
 await openWorkshop(page,[]);
 await expect(page.getByText('当前范围还没有题目',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'添加课堂题目',exact:true}).click();
 await expect(page.locator('#bank-search')).toBeVisible();
});

test('a question without valid reference answers explains how to repair it',async({page})=>{
 await openWorkshop(page,[{...questions[0],words:['木头','爸 爸']}]);
 await expect(page.locator('#workshop-submit')).toBeDisabled();
 await expect(page.locator('#workshop-selection-note')).toContainText('参考词');
 await page.getByRole('button',{name:'题库管理',exact:true}).click();
 await expect(page.locator('#bank-search')).toBeVisible();
});

test('long answers and candidate controls remain reachable on projector and mobile',async({page})=>{
 const answer='爸爸爸爸爸爸爸爸';
 await openWorkshop(page,[{...questions[0],words:[answer,'老爸']}]);
 for(const[width,height]of[[1920,1080],[1280,720],[390,844]]){
  await page.setViewportSize({width,height});
  if(await page.locator('#workshop-clear').isEnabled())await page.locator('#workshop-clear').click();
  await choose(page,answer);
  await expect(page.locator('#workshop-word')).toHaveText(answer);
  const bounds=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));
  expect(bounds.scroll).toBeLessThanOrEqual(bounds.width);
  const submit=await page.locator('#workshop-submit').boundingBox();
  expect(submit.x).toBeGreaterThanOrEqual(0);expect(submit.x+submit.width).toBeLessThanOrEqual(width);
  if(width>=1000){expect(submit.y+submit.height).toBeLessThanOrEqual(height);}
 }
});
