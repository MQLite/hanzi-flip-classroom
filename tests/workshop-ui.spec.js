import { test, expect } from '@playwright/test';
const questions = [
  { id:'w-dad', grade:1, character:'爸', pinyin:'bà', words:['爸爸','老爸'], sentence:'爸爸在家。' },
  { id:'w-tree', grade:1, character:'木', pinyin:'mù', words:['木头','树木'], sentence:'这里有一棵树木。' },
  { id:'w-rain', grade:1, character:'雨', pinyin:'yǔ', words:['下雨','雨水'], sentence:'今天下雨了。' },
];
async function openWorkshop(page, bank = questions.slice(0,1)) {
  await page.addInitScript(bank => localStorage.setItem('hanzi-flip.question-bank',JSON.stringify({schemaVersion:1,questions:bank})),bank);
  await page.goto('/');
  await page.getByRole('button',{name:'组词小工坊',exact:true}).click();
  await expect(page.getByRole('heading',{name:'组词小工坊',exact:true})).toBeVisible();
}
const wordButton = (page,word) => page.locator('#workshop-tiles').getByRole('button',{name:word,exact:true});

test('complete word blocks select singly, submit home and record distinct words with one score',async({page})=>{
  await openWorkshop(page);
  await expect(page.locator('#workshop-submit')).toBeDisabled();
  await expect(page.locator('#workshop-tiles button')).toHaveCount(2);
  await wordButton(page,'爸爸').click();
  await expect(page.locator('#workshop-word')).toHaveText('爸爸');
  await expect(wordButton(page,'爸爸')).toHaveAttribute('aria-pressed','true');
  await wordButton(page,'老爸').click();
  await expect(page.locator('#workshop-word')).toHaveText('老爸');
  await expect(wordButton(page,'爸爸')).toHaveAttribute('aria-pressed','false');
  await page.locator('#workshop-submit').click();
  await expect(page.locator('#workshop-word')).toHaveText('');
  await expect(wordButton(page,'老爸')).toHaveAttribute('aria-pressed','false');
  await expect(page.locator('#workshop-collection .collected-word')).toHaveText(['老爸']);
  await expect(page.locator('#workshop-submit')).toBeDisabled();
  await expect(page.locator('#progress')).toHaveText('01 / 01');
  await expect(page.locator('[data-score="team-1"]')).toHaveText('1');
  await wordButton(page,'爸爸').click();
  await page.locator('#workshop-submit').click();
  await expect(page.locator('#workshop-collection .collected-word')).toHaveText(['老爸','爸爸']);
  await expect(page.locator('[data-score="team-1"]')).toHaveText('1');
  await page.locator('#next').click();
  await expect(page.getByText('这一轮，真棒！',{exact:true})).toBeVisible();
  await expect(page.locator('#workshop-collection')).toBeVisible();
  await expect(page.locator('#workshop-collection .collected-word')).toHaveText(['老爸','爸爸']);
  await page.locator('#back').click();
  await expect(page.locator('#workshop-word')).toHaveText('');
  await expect(page.locator('#workshop-collection .collected-word')).toHaveCount(2);
});

test('mode switching preserves selection, records, pinyin and independent score',async({page})=>{
  await openWorkshop(page);
  await wordButton(page,'爸爸').click();
  await page.locator('#workshop-submit').click();
  await wordButton(page,'老爸').click();
  await page.locator('.switch-label').click();
  await page.getByRole('button',{name:'识字翻翻乐',exact:true}).click();
  await expect(page.locator('#pinyin')).toBeChecked();
  await expect(page.locator('[data-score="team-1"]')).toHaveText('0');
  await page.locator('#reveal').click();
  await page.locator('#teams button').nth(1).click();
  await page.locator('#correct').click();
  await page.getByRole('button',{name:'组词小工坊',exact:true}).click();
  await expect(page.locator('#workshop-word')).toHaveText('老爸');
  await expect(page.locator('#pinyin')).not.toBeChecked();
  await expect(page.locator('[data-score="team-1"]')).toHaveText('1');
  await expect(page.locator('[data-score="team-2"]')).toHaveText('0');
  await expect(page.locator('#workshop-collection .collected-word')).toHaveText(['爸爸']);
});

test('practice review and keyboard navigation remain available',async({page})=>{
  await openWorkshop(page,questions);
  const target=await page.locator('#workshop-target').innerText();
  await page.locator('#workshop-tiles button').first().click();
  await page.locator('#practice').click();
  await expect(page.locator('#workshop-submit')).toBeDisabled();
  await expect(page.locator('#workshop-tiles button').first()).toBeDisabled();
  await page.locator('#next').click();
  await page.locator('#workshop-tiles button').first().click();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#progress')).toHaveText('03 / 03');
  await page.locator('#next').click();
  await page.getByRole('button',{name:'开始复习',exact:true}).click();
  await expect(page.locator('#progress')).toHaveText('01 / 01');
  await expect(page.locator('#workshop-target')).toHaveText(target);
  await expect(page.locator('#workshop-word')).toHaveText('');
});

test('native keyboard selects and submits; dialog suppresses shortcuts',async({page})=>{
  await openWorkshop(page);
  await wordButton(page,'爸爸').focus();
  await page.keyboard.press('Space');
  await expect(page.locator('#workshop-word')).toHaveText('爸爸');
  await page.locator('#workshop-submit').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#workshop-word')).toHaveText('');
  await expect(page.locator('#workshop-collection')).toContainText('爸爸');
  await page.getByRole('button',{name:'使用帮助',exact:true}).click();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#progress')).toHaveText('01 / 01');
});

test('animated word block travels to center and returns to its original position on submit',async({page})=>{
  await page.emulateMedia({reducedMotion:'no-preference'});
  await openWorkshop(page);
  const tile=wordButton(page,'爸爸');
  const home=await tile.boundingBox();
  await tile.click();
  await expect.poll(async()=>Math.abs((await tile.boundingBox()).y-home.y)).toBeGreaterThan(70);
  await page.locator('#workshop-submit').click();
  await expect.poll(async()=>{
    const returned=await tile.boundingBox();
    return Math.abs(returned.x-home.x)+Math.abs(returned.y-home.y);
  }).toBeLessThan(2);
  await expect(page.locator('#workshop-collection .collected-word')).toHaveText(['爸爸']);
});

test('empty bank retains access to question management',async({page})=>{
  await openWorkshop(page,[]);
  await expect(page.getByText('当前范围还没有题目',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'添加课堂题目',exact:true}).click();
  await expect(page.locator('#bank-search')).toBeVisible();
});

test('invalid reference words leave a disabled submit and accessible bank tools',async({page})=>{
  await openWorkshop(page,[{...questions[0],words:['树木','爸 爸']}]);
  await expect(page.locator('#workshop-tiles button')).toHaveCount(0);
  await expect(page.locator('#workshop-submit')).toBeDisabled();
  await page.getByRole('button',{name:'题库管理',exact:true}).click();
  await expect(page.locator('#bank-search')).toBeVisible();
});

test('new round clears records only after restart confirmation',async({page})=>{
  await openWorkshop(page);
  await wordButton(page,'爸爸').click();
  await page.locator('#workshop-submit').click();
  page.once('dialog',dialog=>dialog.dismiss());
  await page.locator('#restart').click();
  await expect(page.locator('#workshop-collection .collected-word')).toHaveText(['爸爸']);
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#restart').click();
  await expect(page.locator('#workshop-collection .collected-word')).toHaveCount(0);
  await expect(page.locator('[data-score="team-1"]')).toHaveText('0');
  await expect(wordButton(page,'爸爸')).toBeEnabled();
});

test('curriculum selections restore separately with selected word',async({page})=>{
  await page.goto('/');
  await page.getByLabel('学习阶段',{exact:true}).selectOption('2A');
  await page.getByLabel('练习范围').selectOption('lesson');
  await page.getByLabel('选择课次').selectOption('3');
  await page.getByRole('button',{name:'组词小工坊',exact:true}).click();
  await page.getByLabel('学习阶段',{exact:true}).selectOption('3B');
  await page.getByLabel('选择课次').selectOption('9');
  await page.locator('#workshop-tiles button').first().click();
  const selected=await page.locator('#workshop-word').innerText();
  await page.getByRole('button',{name:'识字翻翻乐',exact:true}).click();
  await expect(page.getByLabel('学习阶段',{exact:true})).toHaveValue('2A');
  await expect(page.getByLabel('选择课次')).toHaveValue('3');
  await page.getByRole('button',{name:'组词小工坊',exact:true}).click();
  await expect(page.getByLabel('学习阶段',{exact:true})).toHaveValue('3B');
  await expect(page.getByLabel('选择课次')).toHaveValue('9');
  await expect(page.locator('#workshop-word')).toHaveText(selected);
});

test('WebGL unavailable leaves selection and submission usable',async({page})=>{
  await page.addInitScript(()=>{
    const original=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(type,...args){return type.startsWith('webgl')?null:original.call(this,type,...args);};
  });
  await openWorkshop(page);
  await expect(page.locator('#workshop-scene')).toHaveAttribute('data-mode','simple');
  await wordButton(page,'爸爸').click();
  await page.locator('#workshop-submit').click();
  await expect(page.locator('#workshop-collection')).toContainText('爸爸');
});

test('desk dominates projector and long word controls stay within viewport',async({page})=>{
  const word='爸爸爸爸爸爸爸爸';
  await openWorkshop(page,[{...questions[0],words:[word,'老爸']}]);
  for(const[width,height]of[[1920,1080],[1280,720],[390,844]]){
    await page.setViewportSize({width,height});
    await wordButton(page,word).click();
    const textBounds=await wordButton(page,word).evaluate(button=>({scroll:button.scrollWidth,width:button.clientWidth}));
    expect(textBounds.scroll).toBeLessThanOrEqual(textBounds.width);
    const bounds=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));
    expect(bounds.scroll).toBeLessThanOrEqual(bounds.width);
    for(const selector of['#workshop-word','#workshop-submit','#workshop-tiles']){
      const box=await page.locator(selector).boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x+box.width).toBeLessThanOrEqual(width+1);
    }
    if(width>=1000){
      const desk=await page.locator('#workshop-scene').boundingBox();
      expect(desk.width).toBeGreaterThan(width*.65);
      expect(desk.height).toBeGreaterThan(height*.45);
      const action=await page.locator('#workshop-submit').boundingBox();
      expect(action.y+action.height).toBeLessThanOrEqual(height);
    }
  }
});

for(const mode of['识字翻翻乐','组词小工坊']){
  test(`restored GPU context resumes ${mode} without losing state`,async({page})=>{
    await openWorkshop(page);
    await page.getByRole('button',{name:mode,exact:true}).click();
    if(mode==='组词小工坊')await wordButton(page,'爸爸').click();
    const host=page.locator(mode==='组词小工坊'?'#workshop-scene':'#scene');
    await expect(host).toHaveAttribute('data-mode','webgl');
    await host.locator('canvas').evaluate(canvas=>{
      const extension=canvas.getContext('webgl2').getExtension('WEBGL_lose_context');
      if(!extension)throw new Error('GPU context loss extension required');
      canvas.addEventListener('webglcontextrestored',()=>{canvas.dataset.testRestored='true';},{once:true});
      canvas.addEventListener('webglcontextlost',()=>{setTimeout(()=>extension.restoreContext(),100);},{once:true});
      extension.loseContext();
    });
    await expect(host).toHaveAttribute('data-mode','simple');
    await expect(host.locator('canvas')).toHaveAttribute('data-test-restored','true');
    await page.getByRole('button',{name:'立体显示',exact:true}).click();
    await expect(host).toHaveAttribute('data-mode','webgl');
    if(mode==='组词小工坊'){
      await expect(page.locator('#workshop-word')).toHaveText('爸爸');
      await page.locator('#workshop-submit').click();
    }else{
      await page.locator('#reveal').click();
      await page.locator('#correct').click();
    }
    await expect(page.locator('[data-score="team-1"]')).toHaveText('1');
  });
}
