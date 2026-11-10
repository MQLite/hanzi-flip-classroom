import {test,expect} from '@playwright/test';

test('Paradise 2A lesson 1 uses flag images for the three country names and keeps complete collected cards',async({page})=>{
  await page.goto('/?mode=flip');await page.locator('#mode-sudoku').click();
  await page.getByLabel('学习阶段',{exact:true}).selectOption('2A');
  await page.locator('#sudoku-start').click();
  for(const word of ['中国','加拿大','澳大利亚']){
    const clues=page.locator(`[data-sudoku-cell][data-word-id$="/${word}"][data-form="picture"]`);
    expect(await clues.count()).toBeGreaterThan(0);
    await expect(clues.locator('strong')).toHaveCount(0);
    const flag=clues.first().getByRole('img',{name:`${word}国旗`,exact:true});
    await expect(flag).toBeVisible();
    await expect.poll(()=>flag.evaluate(n=>n.complete&&n.naturalWidth>0)).toBe(true);
    if(word==='中国'){
      const a=await flag.boundingBox(),b=await page.locator('#sudoku-collect').boundingBox();
      await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();
      await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:12});await page.mouse.up();
      await expect(flag).toBeVisible();
    }else{await clues.first().click();await page.locator('#sudoku-collect').click();}
    const card=page.locator(`[data-sudoku-card][data-word-id$="/${word}"]`);
    await expect(card.locator('strong')).toHaveText(word);
    await expect(card.locator('.sudoku-pinyin')).not.toHaveText('');
    await expect(card.getByRole('img',{name:`${word}国旗`,exact:true})).toBeVisible();
  }
  await expect(page.locator('[data-sudoku-cell][data-word-id$="/美国"] img')).toHaveCount(0);
  await page.screenshot({path:'docs/codex/sudoku/country-flags.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  for(const img of await page.locator('[data-sudoku-cell] img.sudoku-flag').all()){
    expect(await img.evaluate(n=>{const a=n.getBoundingClientRect(),b=n.closest('[data-sudoku-cell]').getBoundingClientRect();return a.left>=b.left&&a.right<=b.right&&a.top>=b.top&&a.bottom<=b.bottom;})).toBe(true);
  }
  const values=await page.locator('[data-sudoku-cell]').evaluateAll(nodes=>nodes.map(n=>n.dataset.wordId??null));
  const ids=[...new Set(values.filter(Boolean))];
  function solve(a){
    const cell=a.indexOf(null);if(cell<0)return a;const row=Math.floor(cell/9),col=cell%9;
    for(const id of ids)if(!a.some((v,i)=>v===id&&(Math.floor(i/9)===row||i%9===col||Math.floor(i/27)===Math.floor(row/3)&&Math.floor(i%9/3)===Math.floor(col/3)))){
      const next=[...a];next[cell]=id;const solved=solve(next);if(solved)return solved;
    }return null;
  }
  const solution=solve(values);
  for(const id of ids.filter(id=>!['中国','加拿大','澳大利亚'].some(word=>id.endsWith(`/${word}`)))){
    await page.locator(`[data-sudoku-cell][data-word-id="${id}"]`).first().click();await page.locator('#sudoku-collect').click();
  }
  await expect(page.locator('#sudoku')).toHaveAttribute('data-phase','fill');
  for(const word of ['中国','加拿大','澳大利亚']){
    const cell=values.findIndex((v,i)=>v===null&&solution[i].endsWith(`/${word}`));expect(cell).toBeGreaterThanOrEqual(0);
    await page.locator(`[data-sudoku-card][data-word-id$="/${word}"]`).click();await page.locator(`[data-sudoku-cell="${cell}"]`).click();
    await expect(page.locator(`[data-sudoku-cell="${cell}"]`).getByRole('img',{name:`${word}国旗`,exact:true})).toBeVisible();
  }
  await expect(page.locator('[data-score="team-1"]')).toHaveText('3');
});

test('the flag replacement stays scoped to Paradise 2A lesson 1',async({page})=>{
  await page.goto('/?mode=flip');await page.getByLabel('题库来源').selectOption('zhongwen');
  await page.locator('#mode-sudoku').click();await page.getByLabel('选择册数').selectOption('2');
  await page.getByLabel('选择课次').selectOption('12');await page.locator('#sudoku-start').click();
  await expect(page.locator('[data-sudoku-cell] img.sudoku-flag')).toHaveCount(0);
  expect(await page.locator('[data-sudoku-cell][data-word-id$="/中国"] strong').count()).toBeGreaterThan(0);
});

test('Paradise 2A lesson 2 shows the three illustrations and collects each as its word',async({page})=>{
  await page.goto('/?mode=sudoku');
  await page.getByLabel('学习阶段',{exact:true}).selectOption('2A');
  await page.getByLabel('选择课次').selectOption('2');
  await page.locator('#sudoku-start').click();

  const clues=[['看','手搭在眼睛上方向前看'],['长','箭头指向较长的线'],['巴黎','埃菲尔铁塔']];
  for(const [word,label] of clues){
    const cells=page.locator(`[data-sudoku-cell][data-word-id$="/${word}"]`);
    const picture=cells.getByRole('img',{name:label,exact:true}).first();
    await expect(picture).toBeVisible();
    await expect.poll(()=>picture.evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
    await expect(cells.locator('strong')).toHaveCount(0);
    await expect(cells.locator('.sudoku-pinyin').first()).toBeVisible();
    await picture.click();
    await page.locator('#sudoku-collect').click();
    const card=page.locator(`[data-sudoku-card][data-word-id$="/${word}"]`);
    await expect(card.locator('strong')).toHaveText(word);
    await expect(card.getByRole('img',{name:label,exact:true})).toBeVisible();
  }

  await page.setViewportSize({width:390,height:844});
  const images=page.locator('[data-sudoku-cell] img.sudoku-illustration');
  expect(await images.count()).toBeGreaterThanOrEqual(clues.length);
  expect(await images.evaluateAll(nodes=>nodes.every(img=>{
    const picture=img.getBoundingClientRect(),cell=img.closest('[data-sudoku-cell]').getBoundingClientRect();
    return picture.width>0&&picture.left>=cell.left&&picture.right<=cell.right&&picture.top>=cell.top&&picture.bottom<=cell.bottom;
  }))).toBe(true);

  page.once('dialog',dialog=>dialog.accept());
  await page.getByLabel('选择课次').selectOption('1');
  await page.locator('#sudoku-start').click();
  await expect(images).toHaveCount(0);
});
