import {test,expect} from '@playwright/test';
const questions=[{id:'train-one',grade:1,character:'师',pinyin:'shī',words:['老师','教师'],sentence:'老师在看书。',sentenceTrain:{tokens:['老师','在','看书'],punctuation:'。',alternatives:[]}}];
async function open(page,{bank=questions,webgl=true}={}){
 await page.addInitScript(({bank,webgl})=>{localStorage.setItem('hanzi-flip.question-bank',JSON.stringify({schemaVersion:1,questions:bank}));if(!webgl){const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/.test(type)?null:original.call(this,type,...args)}}},{bank,webgl});
 await page.goto('/');await page.getByRole('button',{name:'句子小火车',exact:true}).click();
}
async function choose(page,tokens){for(const word of tokens)await page.locator('#train-palette button:not([aria-pressed="true"])').filter({hasText:word}).first().click();}
const score=page=>page.locator('[data-score="team-1"]');
test('third mode provides stable candidates, adjustment and disabled incomplete departure',async({page})=>{
 await open(page);await expect(page.getByRole('button',{name:'发车',exact:true})).toBeDisabled();
 const order=await page.locator('#train-palette button').allTextContents();await choose(page,['老师','在']);
 await expect(page.locator('#train-reading')).toHaveText('老师在。');await page.getByRole('button',{name:'撤回',exact:true}).click();
 await expect(page.locator('#train-reading')).toHaveText('老师。');await page.getByRole('button',{name:'清空',exact:true}).click();
 expect(await page.locator('#train-palette button').allTextContents()).toEqual(order);
});
test('incorrect check retains train; teacher acceptance locks one score and records actual sentence',async({page})=>{
 await open(page);await choose(page,['看书','在','老师']);await page.getByRole('button',{name:'发车',exact:true}).click();
 await expect(page.locator('#train-feedback')).toContainText('与参考答案不同');await expect(page.locator('#train-reading')).toHaveText('看书在老师。');
 await page.getByRole('button',{name:'老师判对',exact:true}).click();await expect(score(page)).toHaveText('1');
 await expect(page.locator('#train-summary')).toBeVisible();await expect(page.locator('#train-ledger')).toContainText('看书在老师。');
 await page.getByRole('button',{name:'上一句',exact:true}).click();await expect(page.getByRole('button',{name:'发车',exact:true})).toBeDisabled();
});
test('revealing requires teacher scoring, and changed selection requires a fresh check',async({page})=>{
 await open(page);await page.getByRole('button',{name:'看看参考句',exact:true}).click();await choose(page,['老师','在','看书']);
 await page.getByRole('button',{name:'发车',exact:true}).click();await expect(score(page)).toHaveText('0');await expect(page.getByRole('button',{name:'老师判对',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'撤回',exact:true}).click();await expect(page.getByRole('button',{name:'老师判对',exact:true})).toBeHidden();
 await choose(page,['看书']);await page.getByRole('button',{name:'发车',exact:true}).click();await page.getByRole('button',{name:'老师判对',exact:true}).click();await expect(score(page)).toHaveText('1');
});
test('three modes preserve independent draft, scores, and island journey',async({page})=>{
 await open(page);await choose(page,['老师']);await page.getByRole('button',{name:'识字翻翻乐',exact:true}).click();await page.locator('#reveal').click();await page.locator('#correct').click();await expect(score(page)).toHaveText('1');
 await page.getByRole('button',{name:'组词小工坊',exact:true}).click();await expect(score(page)).toHaveText('0');await page.getByRole('button',{name:'句子小火车',exact:true}).click();await expect(page.locator('#train-reading')).toHaveText('老师。');await expect(score(page)).toHaveText('0');
});
test('keyboard and no-WebGL fallback complete a sentence without page overflow',async({page})=>{
 await page.setViewportSize({width:390,height:844});await open(page,{webgl:false});await expect(page.locator('#train-scene')).toHaveAttribute('data-mode','simple');
 for(const word of ['老师','在','看书']){const b=page.locator('#train-palette button').filter({hasText:word});await b.focus();await page.keyboard.press('Space');}
 await page.getByRole('button',{name:'发车',exact:true}).focus();await page.keyboard.press('Enter');await expect(score(page)).toHaveText('1');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('manual segmentation survives unrelated edits and invalid drafts do not save',async({page})=>{
 await open(page);await page.getByRole('button',{name:'题库管理',exact:true}).click();await page.locator('.question-row').click();await page.getByText('句子小火车设置',{exact:true}).click();
 await expect(page.locator('[name="trainTokens"]')).toHaveValue('老师 / 在 / 看书');await page.locator('[name="radical"]').fill('巾');
 await page.locator('[name="trainTokens"]').fill('老师 / 看书');await expect(page.locator('#save-status')).toContainText('草稿未保存');
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('hanzi-flip.question-bank')).questions[0]);expect(stored.sentenceTrain.tokens).toEqual(['老师','在','看书']);expect(stored.radical).toBe('巾');
 await page.getByRole('button',{name:'清除手动切分',exact:true}).click();await expect(page.locator('#save-status')).toContainText('已保存');
});
const longTokens=['我们学校老师','今天','在','美丽的公园','和','小朋友们','一起开心看书'];
const longQuestion={...questions[0],id:'long',sentence:longTokens.join('')+'。',sentenceTrain:{tokens:longTokens,punctuation:'。',alternatives:[]}};
test('seven long carriages stay locally scrollable and newly appended carriage is visible',async({page})=>{
 await page.setViewportSize({width:390,height:844});await open(page,{bank:[longQuestion]});await choose(page,longTokens);
 const widths=await page.locator('.train-track-scroll').evaluate(e=>({page:document.documentElement.scrollWidth,viewport:innerWidth,scroll:e.scrollWidth,width:e.clientWidth,left:e.scrollLeft}));
 expect(widths.page).toBeLessThanOrEqual(widths.viewport);expect(widths.scroll).toBeGreaterThan(widths.width);expect(widths.left).toBeGreaterThan(0);
 const last=await page.locator('#train-selected button').last().boundingBox(),track=await page.locator('.train-track-scroll').boundingBox();expect(last.x).toBeGreaterThanOrEqual(track.x-1);expect(last.x+last.width).toBeLessThanOrEqual(track.x+track.width+1);
});
test('real departure locks navigation, finishes on switching and ignores stale restart callbacks',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await open(page,{bank:[...questions,{...questions[0],id:'two',character:'朋',pinyin:'péng',words:['朋友','小朋友'],sentence:'小朋友在看书。',sentenceTrain:{tokens:['小朋友','在','看书'],punctuation:'。',alternatives:[]}}]});
 const first=await page.locator('#train-palette button').allTextContents();const who=first.includes('老师')?'老师':'小朋友';await choose(page,[who,'在','看书']);await page.getByRole('button',{name:'发车',exact:true}).click();
 await expect(page.getByRole('button',{name:'下一句',exact:true})).toBeDisabled();await page.getByRole('button',{name:'识字翻翻乐',exact:true}).click();await page.getByRole('button',{name:'句子小火车',exact:true}).click();await expect(page.locator('#progress')).toHaveText('02 / 02');await expect(score(page)).toHaveText('1');
 const second=who==='老师'?'小朋友':'老师';await choose(page,[second,'在','看书']);await page.getByRole('button',{name:'发车',exact:true}).click();page.once('dialog',d=>d.accept());await page.locator('#restart').click();await page.waitForTimeout(1400);await expect(page.locator('#progress')).toHaveText('01 / 02');await expect(score(page)).toHaveText('0');await expect(page.locator('#train-selected button')).toHaveCount(0);
});
test('practice and skipped questions summarize separately and review contains only practice',async({page})=>{
 await open(page,{bank:[...questions,{...questions[0],id:'two',character:'朋',pinyin:'péng',words:['朋友','小朋友'],sentence:'小朋友在看书。',sentenceTrain:{tokens:['小朋友','在','看书'],punctuation:'。',alternatives:[]}}]});
 await page.getByRole('button',{name:'再练一次',exact:true}).click();await page.getByRole('button',{name:'下一句',exact:true}).click();await page.getByRole('button',{name:'下一句',exact:true}).click();await expect(page.locator('#train-summary')).toContainText('1 句再练 · 1 句未作答');await page.getByRole('button',{name:'开始复习',exact:true}).click();await expect(page.locator('#progress')).toHaveText('01 / 01');await expect(score(page)).toHaveText('0');
});
test('context loss and repeated mode changes preserve train and bounded canvas count',async({page})=>{
 await open(page);await choose(page,['老师']);const canvases=await page.locator('canvas').count();await page.locator('#train-scene canvas').first().evaluate(canvas=>canvas.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));await expect(page.locator('#train-scene')).toHaveAttribute('data-mode','simple');
 for(let n=0;n<4;n++){await page.getByRole('button',{name:'识字翻翻乐',exact:true}).click();await page.getByRole('button',{name:'句子小火车',exact:true}).click()}
 expect(await page.locator('canvas').count()).toBe(canvases);await expect(page.locator('#train-reading')).toHaveText('老师。');
});
test('form focus and dialog isolate classroom shortcuts',async({page})=>{
 await open(page);await choose(page,['老师']);await page.getByRole('button',{name:'题库管理',exact:true}).click();await page.locator('.question-row').click();await page.locator('[name="sentence"]').focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('Space');await expect(page.locator('#progress')).toHaveText('01 / 01');await expect(score(page)).toHaveText('0');
});
test('projection screenshots show populated meshes and responsive classroom',async({page})=>{
 await page.addInitScript(()=>{window.trainErrors=[];window.addEventListener('error',event=>window.trainErrors.push(event.message))});await open(page,{bank:[longQuestion]});await expect(page.locator('#train-palette button')).toHaveCount(7);await choose(page,longTokens.slice(0,4));
 for(const [width,height] of [[1920,1080],[1280,720],[390,844]]){await page.setViewportSize({width,height});await page.waitForTimeout(300);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`docs/codex/sentence-train/train-${width}.png`,fullPage:true});}expect(await page.evaluate(()=>window.trainErrors)).toEqual([]);
});



test('projector candidates and primary controls fit the actual viewport',async({page})=>{
 await open(page,{bank:[longQuestion]});for(const [width,height]of [[1920,1080],[1280,720]]){await page.setViewportSize({width,height});await page.waitForTimeout(200);const check=await page.locator('#train-check').boundingBox();expect(check.y+check.height).toBeLessThanOrEqual(height);const feedback=await page.locator('#train-feedback').boundingBox();expect(feedback.y+feedback.height).toBeLessThanOrEqual(height);for(const button of await page.locator('#train-palette button').all()){const b=await button.boundingBox();expect(b.y+b.height+16).toBeLessThanOrEqual(height)}}
});
test('native focus follows a selected carriage instead of dropping to the document',async({page})=>{
 for(const simple of [false,true]){
  await open(page);if(simple)await page.locator('#simplify').click();const candidate=page.locator('#train-palette button').filter({hasText:'老师'});await candidate.focus();await page.keyboard.press('Space');await expect(page.locator('#train-selected button')).toBeFocused();await page.keyboard.press('Space');await expect(candidate).toBeFocused();await expect(page.locator('#train-selected button')).toHaveCount(0);
  await page.keyboard.press('Space');for(let i=0;i<2;i++){await page.keyboard.press('Tab');await expect(page.locator('#train-palette button:focus')).toHaveCount(1);await page.keyboard.press('Space');await expect(page.locator('#train-selected button').last()).toBeFocused()}
  await expect(page.locator('#train-selected button')).toHaveCount(3);let steps=0;while(!(await page.locator('#train-check').evaluate(e=>document.activeElement===e))&&steps++<40)await page.keyboard.press('Tab');await expect(page.locator('#train-check')).toBeFocused();await page.keyboard.press('Enter');await expect(page.locator('#train-check')).toBeDisabled().catch(async()=>{await expect(page.locator('#train-feedback')).toContainText('与参考答案不同')});
 }
});
test('default textbook station screenshot and viewport controls',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'句子小火车',exact:true}).click();for(const b of (await page.locator('#train-palette button').all()).slice(0,3))await b.click();
 for(const[width,height]of [[1920,1080],[1280,720]]){await page.setViewportSize({width,height});await page.waitForTimeout(200);await page.screenshot({path:`docs/codex/sentence-train/train-default-${width}.png`,fullPage:true});const box=await page.locator('#train-check').boundingBox();expect(box.y+box.height).toBeLessThanOrEqual(height)}
});
test('long projector error and revealed feedback remain in the viewport',async({page})=>{
 await page.setViewportSize({width:1280,height:720});await open(page,{bank:[longQuestion]});await choose(page,[...longTokens].reverse());await page.locator('#train-check').click();
 for(const selector of ['#train-feedback','#train-accept','#train-check']){const b=await page.locator(selector).boundingBox();expect(b.y+b.height).toBeLessThanOrEqual(720)}
 await page.locator('#train-reveal').click();await page.locator('#train-check').click();for(const selector of ['#train-feedback','#train-reference','#train-accept']){const b=await page.locator(selector).boundingBox();expect(b.y+b.height).toBeLessThanOrEqual(720)}
 await page.screenshot({path:'docs/codex/sentence-train/train-error-revealed-1280.png',fullPage:true});
});
test('hidden page finishes the departing train exactly once',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await open(page);await choose(page,['老师','在','看书']);await page.locator('#train-check').click();await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))});await expect(page.locator('#train-summary')).toBeVisible();await expect(score(page)).toHaveText('1');await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'))});await expect(score(page)).toHaveText('1');
});
test('changed built-in sentence loses its mapping without changing current-round snapshot',async({page})=>{
 const bank=[{id:'hypy-1A-1-老',grade:1,character:'老',pinyin:'lǎo',words:['老师','老人'],sentence:'老师在看书。'}];await open(page,{bank});await expect(page.locator('#train-palette button')).toHaveCount(3);
 await page.getByRole('button',{name:'题库管理',exact:true}).click();await page.locator('.question-row').click();await page.getByText('句子小火车设置',{exact:true}).click();await expect(page.locator('#train-editor-preview')).toContainText('内置切分');await page.locator('[name="sentence"]').fill('老师在写字。');await expect(page.locator('#train-editor-preview')).toContainText('尚未设置有效');await page.getByRole('button',{name:'关闭题库',exact:true}).click();await expect(page.locator('#train-palette button')).toHaveCount(3);await page.locator('#restart').click();await expect(page.getByText('当前范围没有可用句子',{exact:true})).toBeVisible();
});
