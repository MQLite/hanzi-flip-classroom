import { test, expect } from '@playwright/test';
const questions=[
 {id:'dad',grade:1,character:'爸',pinyin:'bà',words:['爸爸','老爸'],sentence:'爸爸在家。'},
 {id:'tree',grade:1,character:'木',pinyin:'mù',words:['木头','树木'],sentence:'这里有树木。'},
];
async function openWorkshop(page,bank=questions){
 await page.addInitScript(bank=>localStorage.setItem('hanzi-flip.question-bank',JSON.stringify({schemaVersion:1,questions:bank})),bank);
 await page.goto('/');
 await page.getByRole('button',{name:'组词小工坊',exact:true}).click();
}
async function choose(page,word){
 for(const character of word)await page.locator('#workshop-tiles button[aria-pressed="false"]').getByText(character,{exact:true}).first().click();
}
async function submit(page,word){await choose(page,word);await page.locator('#workshop-submit').click();}
const score=page=>page.locator('[data-score="team-1"]');
const tiles=page=>page.locator('#workshop-tiles button');
const stamps=page=>page.locator('#workshop-collection .collected-word');
const ids=page=>tiles(page).evaluateAll(nodes=>nodes.map(n=>n.dataset.tileId));

test('batch uses four preselected words with summed duplicate letters and consumes only a match',async({page})=>{
 await openWorkshop(page);
 await expect(page.locator('#workshop-count')).toHaveValue('4');
 await expect(tiles(page)).toHaveCount(8);
 await expect(tiles(page).getByText('爸',{exact:true})).toHaveCount(3);
 await expect(tiles(page).getByText('木',{exact:true})).toHaveCount(2);
 const initial=await ids(page);
 await choose(page,'爸爸');
 const selected=await page.locator('#workshop-tiles button[aria-pressed="true"]').evaluateAll(nodes=>nodes.map(n=>n.dataset.tileId));
 const stableTile=page.locator('#workshop-tiles button').getByText('头',{exact:true});
 const relativePosition=()=>stableTile.evaluate(tile=>{
  const tileBox=tile.getBoundingClientRect(),tray=tile.closest('#workshop-scene').getBoundingClientRect();
  return {x:tileBox.x-tray.x,y:tileBox.y-tray.y};
 });
 const before=await relativePosition();
 await page.locator('#workshop-submit').click();
 await expect(tiles(page)).toHaveCount(6);
 expect(await ids(page)).toEqual(initial.filter(id=>!selected.includes(id)));
 await expect(stamps(page)).toHaveAttribute('data-source','reference');
 await expect(stamps(page)).toContainText('爸爸');
 await expect(score(page)).toHaveText('1');
 await expect(page.locator('#workshop-word')).toHaveText('');
 const after=await relativePosition();
 expect(Math.abs(after.x-before.x)).toBeLessThan(2);expect(Math.abs(after.y-before.y)).toBeLessThan(2);
 await expect(page.locator('#workshop-remaining')).toContainText('6');
});

test('all reference words can be collected from one tray, including shared letters',async({page})=>{
 await openWorkshop(page);
 for(const [i,word]of ['爸爸','老爸','木头','树木'].entries()){
  await submit(page,word);await expect(tiles(page)).toHaveCount(8-(i+1)*2);
 }
 await expect(score(page)).toHaveText('4');await expect(stamps(page)).toHaveCount(4);
 await expect(page.locator('#workshop')).toHaveAttribute('data-phase','complete');
 await expect(page.locator('#workshop-collection')).toBeVisible();
});

test('continues with unused lesson words while keeping cumulative scores and stamps',async({page})=>{
 const bank=[
  ...questions,
  {id:'sky',grade:1,character:'天',pinyin:'tiān',words:['今天','白天'],sentence:'今天是晴天。'},
 ];
 await openWorkshop(page,bank);
 const referenceWords=()=>page.locator('#workshop-references .workshop-reference').allTextContents();
 const firstBatch=await referenceWords();
 expect(firstBatch).toHaveLength(4);
 for(const word of firstBatch)await submit(page,word);
 await expect(page.locator('#workshop')).toHaveAttribute('data-phase','complete');
 await expect(score(page)).toHaveText('4');await expect(stamps(page)).toHaveCount(4);

 await page.getByRole('button',{name:'继续下一盘',exact:true}).click();

 await expect(page.locator('#workshop')).toHaveAttribute('data-phase','active');
 await expect(page.locator('#progress')).toHaveText('00 / 02');
 await expect(score(page)).toHaveText('4');await expect(stamps(page)).toHaveCount(4);
 const secondBatch=await referenceWords();
 expect(secondBatch).toHaveLength(2);
 expect(secondBatch.every(word=>!firstBatch.includes(word))).toBe(true);
 for(const word of secondBatch)await submit(page,word);
 await expect(score(page)).toHaveText('6');await expect(stamps(page)).toHaveCount(6);
 await expect(page.locator('#workshop-status')).toContainText('本课/阶段的参考词已全部完成');
 await expect(page.getByRole('button',{name:'继续下一盘',exact:true})).toHaveCount(0);
});

test('unmatched word waits for teacher; approval restores exact tiles and gives a distinct stamp',async({page})=>{
 await openWorkshop(page);const initial=await ids(page);
 await submit(page,'爸木');
 await expect(page.locator('#workshop-teacher')).toBeVisible();
 await expect(page.locator('#workshop-word')).toHaveText('爸木');
 await expect(score(page)).toHaveText('0');await expect(stamps(page)).toHaveCount(0);
 await expect(page.locator('#workshop-submit')).toBeDisabled();await expect(page.locator('#workshop-clear')).toBeDisabled();
 await page.locator('#workshop-accept').click();
 await expect(page.locator('#workshop-word')).toHaveText('');
 expect(await ids(page)).toEqual(initial);
 await expect(stamps(page)).toHaveAttribute('data-source','teacher');await expect(stamps(page)).toContainText('爸木');
 await expect(score(page)).toHaveText('1');
 await submit(page,'爸爸');await expect(tiles(page)).toHaveCount(6);
 await expect(stamps(page)).toHaveCount(2);await expect(score(page)).toHaveText('2');
});

test('teacher rejection returns the same tiles without score or collection and allows retry',async({page})=>{
 await openWorkshop(page);const initial=await ids(page);
 await submit(page,'爸木');await page.locator('#workshop-reject').click();
 await expect(page.locator('#workshop-word')).toHaveText('');
 expect(await ids(page)).toEqual(initial);await expect(score(page)).toHaveText('0');await expect(stamps(page)).toHaveCount(0);
 await submit(page,'老爸');await expect(tiles(page)).toHaveCount(6);await expect(score(page)).toHaveText('1');
});

test('a repeated teacher-approved word cannot collect or score again',async({page})=>{
 await openWorkshop(page);await submit(page,'爸木');await page.locator('#workshop-accept').click();
 await expect(page.locator('#workshop-word')).toHaveText('');
 await submit(page,'爸木');await expect(page.locator('#workshop-word')).toHaveText('');
 await expect(stamps(page)).toHaveCount(1);await expect(score(page)).toHaveText('1');await expect(tiles(page)).toHaveCount(8);
 await expect(page.locator('#workshop-teacher')).toBeHidden();
});

test('pending approval keeps submitting team even after team switch',async({page})=>{
 await openWorkshop(page);await submit(page,'爸木');
 await page.locator('#teams button').nth(1).click();await page.locator('#workshop-accept').click();
 await expect(score(page)).toHaveText('1');await expect(page.locator('[data-score="team-2"]')).toHaveText('0');
});

test('pending teacher decision survives mode switching with independent scores',async({page})=>{
 await openWorkshop(page);await submit(page,'爸木');
 await page.getByRole('button',{name:'句子小火车',exact:true}).click();await expect(score(page)).toHaveText('0');
 await page.getByRole('button',{name:'识字翻翻乐',exact:true}).click();await page.locator('#reveal').click();await page.locator('#correct').click();
 await expect(score(page)).toHaveText('1');
 await page.getByRole('button',{name:'组词小工坊',exact:true}).click();
 await expect(page.locator('#workshop-word')).toHaveText('爸木');await expect(page.locator('#workshop-teacher')).toBeVisible();await expect(score(page)).toHaveText('0');
 await page.locator('#workshop-reject').click();await expect(page.locator('#workshop-word')).toHaveText('');
});

test('changing batch count confirms abandonment, preserves on cancel and resets on acceptance',async({page})=>{
 await openWorkshop(page);await submit(page,'爸爸');await expect(tiles(page)).toHaveCount(6);
 page.once('dialog',dialog=>dialog.dismiss());await page.locator('#workshop-count').selectOption('2');
 await expect(page.locator('#workshop-count')).toHaveValue('4');await expect(score(page)).toHaveText('1');await expect(tiles(page)).toHaveCount(6);
 page.once('dialog',dialog=>dialog.accept());await page.locator('#workshop-count').selectOption('2');
 await expect(page.locator('#workshop-count')).toHaveValue('2');await expect(tiles(page)).toHaveCount(4);await expect(score(page)).toHaveText('0');await expect(stamps(page)).toHaveCount(0);
});

test('keyboard focus stays visible and native selection supports undo and clear',async({page})=>{
 await openWorkshop(page);await page.getByRole('button',{name:'简化显示',exact:true}).click();
 const tile=tiles(page).getByText('爸',{exact:true}).first();
 const paint=()=>tile.evaluate(e=>{const s=getComputedStyle(e);return [s.backgroundColor,s.backgroundImage,s.boxShadow]});
 const unfocused=await paint();await page.keyboard.press('Tab');await tile.focus();await expect.poll(paint).not.toEqual(unfocused);
 await page.keyboard.press('Space');await expect(page.locator('#workshop-word')).toHaveText('爸');
 await choose(page,'木');await page.locator('#workshop-undo').click();await expect(page.locator('#workshop-word')).toHaveText('爸');
 await page.locator('#workshop-clear').click();await expect(page.locator('#workshop-word')).toHaveText('');
});

test('animation locks repeated submission and mode interruption settles only workshop',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await openWorkshop(page);await submit(page,'爸爸');
 await expect(page.locator('#workshop-submit')).toBeDisabled();
 await page.getByRole('button',{name:'识字翻翻乐',exact:true}).click();await expect(score(page)).toHaveText('0');await expect(page.locator('#progress')).toHaveText('01 / 02');
 await page.getByRole('button',{name:'组词小工坊',exact:true}).click();await expect(score(page)).toHaveText('1');await expect(tiles(page)).toHaveCount(6);await expect(stamps(page)).toHaveCount(1);
});

test('GPU loss during teacher fusion restores inventory once and resumes 3D on recovery',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await openWorkshop(page);await submit(page,'爸木');await page.locator('#workshop-accept').click();
 const host=page.locator('#workshop-scene');
 await host.locator('canvas').evaluate(canvas=>{
  const ext=canvas.getContext('webgl2').getExtension('WEBGL_lose_context');if(!ext)throw new Error('GPU loss extension required');
  canvas.addEventListener('webglcontextrestored',()=>canvas.dataset.restored='true',{once:true});
  canvas.addEventListener('webglcontextlost',()=>setTimeout(()=>ext.restoreContext(),100),{once:true});ext.loseContext();
 });
 await expect(page.locator('#workshop-word')).toHaveText('');await expect(tiles(page)).toHaveCount(8);await expect(score(page)).toHaveText('1');await expect(stamps(page)).toHaveCount(1);
 await expect(host.locator('canvas')).toHaveAttribute('data-restored','true');
 await page.getByRole('button',{name:'立体显示',exact:true}).click();await expect(host).toHaveAttribute('data-mode','webgl');
 await submit(page,'爸爸');await expect(tiles(page)).toHaveCount(6);
});

test('WebGL initialization failure still supports teacher rejection and reference consumption',async({page})=>{
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.startsWith('webgl')?null:original.call(this,type,...args)}});
 await openWorkshop(page);await expect(page.locator('#workshop-scene')).toHaveAttribute('data-mode','simple');
 await submit(page,'爸木');await page.locator('#workshop-reject').click();await expect(page.locator('#workshop-word')).toHaveText('');
 await submit(page,'爸爸');await expect(tiles(page)).toHaveCount(6);await expect(score(page)).toHaveText('1');
});

test('no valid references retains access to bank repair',async({page})=>{
 await openWorkshop(page,[{...questions[0],words:['木头','爸 爸']}]);
 await expect(page.locator('#workshop')).toHaveAttribute('data-phase','empty');await expect(tiles(page)).toHaveCount(0);
 await page.getByRole('button',{name:'题库管理',exact:true}).click();await expect(page.locator('#bank-search')).toBeVisible();
});

test('fewer references than requested starts with actual count',async({page})=>{
 await openWorkshop(page,questions.slice(0,1));await expect(tiles(page)).toHaveCount(4);
 await submit(page,'爸爸');await submit(page,'老爸');await expect(page.locator('#workshop')).toHaveAttribute('data-phase','complete');
});

test('empty bank still opens teacher management',async({page})=>{
 await openWorkshop(page,[]);await expect(page.locator('#workshop')).toHaveAttribute('data-phase','empty');
 await page.getByRole('button',{name:'题库管理',exact:true}).click();await expect(page.locator('#bank-search')).toBeVisible();
});

test('restarting while teacher approval is pending discards the old decision',async({page})=>{
 await openWorkshop(page);await submit(page,'爸木');
 page.once('dialog',dialog=>dialog.accept());await page.locator('#restart').click();
 await expect(page.locator('#workshop-teacher')).toBeHidden();await expect(page.locator('#workshop-word')).toHaveText('');
 await expect(tiles(page)).toHaveCount(8);await expect(stamps(page)).toHaveCount(0);await expect(score(page)).toHaveText('0');
 await submit(page,'爸爸');await expect(tiles(page)).toHaveCount(6);await expect(score(page)).toHaveText('1');
});

test('maximum 32 tiles and eight-character draft remain usable on projector and phone',async({page})=>{
 const answer='爸爸爸爸爸爸爸爸';
 await openWorkshop(page,[{...questions[0],words:[answer,'爸山水火土日月人']},{...questions[1],words:['木木木木木木木木','木天地玄黄宇宙洪']}]);
 await expect(tiles(page)).toHaveCount(32);
 for(const[width,height]of[[1920,1080],[1280,720],[390,844]]){
  await page.setViewportSize({width,height});if(await page.locator('#workshop-clear').isEnabled())await page.locator('#workshop-clear').click();
  await choose(page,answer);await expect(page.locator('#workshop-word')).toHaveText(answer);
  const bounds=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));expect(bounds.scroll).toBeLessThanOrEqual(bounds.width);
  const submit=await page.locator('#workshop-submit').boundingBox();expect(submit.x).toBeGreaterThanOrEqual(0);expect(submit.x+submit.width).toBeLessThanOrEqual(width);
  if(width>=1000)expect(submit.y+submit.height).toBeLessThanOrEqual(height);
  await page.screenshot({path:`docs/codex/workshop-batch/batch-${width}.png`,fullPage:true});
 }
});

test('short projector shows fusion and teacher decisions without needing a page scroll',async({page})=>{
 await page.setViewportSize({width:1280,height:720});await openWorkshop(page);
 const pageBottom=locator=>locator.evaluate(e=>e.getBoundingClientRect().bottom+scrollY);
 expect(await pageBottom(page.locator('#workshop-submit'))).toBeLessThanOrEqual(720);
 await submit(page,'爸木');
 expect(await pageBottom(page.locator('#workshop-accept'))).toBeLessThanOrEqual(720);
 expect(await pageBottom(page.locator('#workshop-reject'))).toBeLessThanOrEqual(720);
});
