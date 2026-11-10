import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{await page.goto('/?mode=flip');});
async function startNumbers(page){
  await page.locator('#mode-sudoku').click();
  await page.getByLabel('选择课次').selectOption('3');
  await page.locator('#sudoku-start').click();
  await expect(page.locator('[data-sudoku-cell]')).toHaveCount(81);
}
async function collectAll(page){
  const clues=await page.locator('[data-sudoku-cell][data-word-id]').evaluateAll(nodes=>{
    const seen=new Set();return nodes.flatMap(n=>seen.has(n.dataset.wordId)?[]:(seen.add(n.dataset.wordId),[n.dataset.sudokuCell]));
  });
  for(const cell of clues){await page.locator(`[data-sudoku-cell="${cell}"]`).click();await page.locator('#sudoku-collect').click();}
  await expect(page.locator('#sudoku')).toHaveAttribute('data-phase','fill');
}
async function solutionFromClues(page){
  const values=await page.locator('[data-sudoku-cell]').evaluateAll(nodes=>nodes.map(n=>n.dataset.wordId??null));
  const ids=[...new Set(values.filter(Boolean))];
  function solve(a){const cell=a.indexOf(null);if(cell<0)return a;const row=Math.floor(cell/9),col=cell%9;
    for(const id of ids)if(!a.some((v,i)=>v===id&&(Math.floor(i/9)===row||i%9===col||Math.floor(i/27)===Math.floor(row/3)&&Math.floor(i%9/3)===Math.floor(col/3)))){
      const next=[...a];next[cell]=id;const solved=solve(next);if(solved)return solved;
    }return null;
  }return {values,solution:solve(values)};
}
async function drag(page,from,to){
  const a=await from.boundingBox(),b=await to.boundingBox();
  await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();
  await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:12});await page.mouse.up();
}
test('preparation reports real shortages and selects nine words from the same lesson',async({page})=>{
  await page.locator('#mode-sudoku').click();
  await expect(page.locator('#sudoku')).toContainText('只有5个可用词');
  await expect(page.locator('#sudoku-start')).toBeDisabled();
  await expect(page.getByLabel('练习范围')).toBeHidden();
  await page.locator('[data-sudoku-lesson="3"]').click();
  await expect(page.locator('[data-sudoku-choice][aria-pressed="true"]')).toHaveCount(9);
  await expect(page.locator('#sudoku-start')).toBeEnabled();
  await page.locator('#sudoku-start').click();
  await expect(page.locator('[data-sudoku-cell]:not([data-word-id])')).toHaveCount(12);
});

test('Paradise 2A lesson 1 starts a round with all nine countries, including classroom additions',async({page})=>{
  const countries=['中国','美国','澳大利亚','加拿大','英国','法国','新西兰','汤加','哥伦比亚'];
  await page.getByLabel('题库来源').selectOption('paradise');
  await page.getByLabel('学习阶段',{exact:true}).selectOption('2A');
  await page.locator('#mode-sudoku').click();
  const selected=page.locator('[data-sudoku-choice][aria-pressed="true"]');
  await expect(selected).toHaveCount(9);
  expect(await selected.evaluateAll(nodes=>nodes.map(n=>n.dataset.sudokuChoice.split('/').at(-1)))).toEqual(countries);
  await expect(page.locator('#sudoku-start')).toBeEnabled();
  await page.locator('#sudoku-start').click();
  await expect(page.locator('[data-sudoku-cell]')).toHaveCount(81);
  const clueWords=await page.locator('[data-sudoku-cell][data-word-id]').evaluateAll(nodes=>[...new Set(nodes.map(n=>n.dataset.wordId.split('/').at(-1)))]);
  expect(clueWords.sort()).toEqual([...countries].sort());
  await collectAll(page);
  for(const word of countries)await expect(page.locator('#sudoku-bank')).toContainText(word);
  await expect(page.locator('#sudoku-bank')).toContainText('Xīnxīlán');
  await expect(page.locator('#sudoku-bank')).toContainText('Tāngjiā');
  await expect(page.locator('#sudoku-bank')).toContainText('Gēlúnbǐyà');
});
test('clues copy into complete reusable cards; filling, undo and clear never award a second point',async({page})=>{
  await startNumbers(page);
  const {values,solution}=await solutionFromClues(page);
  const first=page.locator('[data-sudoku-cell][data-word-id]').first(),id=await first.getAttribute('data-word-id');
  await drag(page,first,page.locator('#sudoku-collect'));
  await expect(page.locator('[data-sudoku-card]')).toHaveCount(1);
  await expect(first).toHaveAttribute('data-word-id',id);
  await drag(page,first,page.locator('#sudoku-collect'));
  await expect(page.locator('[data-sudoku-card]')).toHaveCount(1);
  await collectAll(page);
  const cell=values.indexOf(null),target=page.locator(`[data-sudoku-cell="${cell}"]`);
  const correct=page.locator(`[data-sudoku-card][data-word-id="${solution[cell]}"]`);
  const wrongId=solution.find(v=>v!==solution[cell]);
  await page.locator(`[data-sudoku-card][data-word-id="${wrongId}"]`).click();await target.click();
  await expect(target).not.toHaveAttribute('data-word-id');
  await expect(page.locator('#sudoku-feedback')).toHaveAttribute('data-kind','error');
  await drag(page,correct,target);
  await expect(target).toHaveAttribute('data-word-id',solution[cell]);
  await expect(page.locator('[data-score="team-1"]')).toHaveText('1');
  await page.locator('#sudoku-undo').click();
  await correct.click();await target.click();
  await expect(page.locator('[data-score="team-1"]')).toHaveText('1');
  await page.locator('#sudoku-clear').click();
  await expect(target).not.toHaveAttribute('data-word-id');
  await correct.click();await target.click();
  await expect(page.locator('[data-score="team-1"]')).toHaveText('1');
  const remaining=values.flatMap((value,index)=>value===null&&index!==cell?[index]:[]);
  const place=async index=>{
    await page.locator(`[data-sudoku-card][data-word-id="${solution[index]}"]`).click();
    await page.locator(`[data-sudoku-cell="${index}"]`).click();
  };
  for(const index of remaining.slice(0,-1))await place(index);
  const celebration=page.getByRole('dialog',{name:'数独完成啦！'});
  await expect(celebration).toHaveCount(0);
  await place(remaining.at(-1));
  await expect(celebration).toBeVisible();
  await expect(celebration.locator('canvas')).toBeVisible();
  const desktopViewport=page.viewportSize();
  await page.setViewportSize({width:390,height:844});
  expect(await celebration.getByRole('heading').evaluate(heading=>{
    const title=heading.getBoundingClientRect(),dialog=heading.closest('dialog').getBoundingClientRect();
    return title.left>=dialog.left&&title.right<=dialog.right;
  })).toBe(true);
  await celebration.getByRole('button',{name:'关闭庆祝'}).click();
  await page.setViewportSize(desktopViewport);
  await expect(celebration).toHaveCount(0);
  await expect(page.locator('#sudoku')).toHaveAttribute('data-phase','complete');
  await expect(page.locator('[data-score="team-1"]')).toHaveText('12');
  await expect(page.locator('[data-sudoku-card]')).toHaveCount(9);
  await page.locator('#sudoku-undo').click();
  await place(remaining.at(-1));
  await expect(page.locator('#sudoku')).toHaveAttribute('data-phase','complete');
  await expect(celebration).toHaveCount(0);
});

test('the Sudoku celebration plays a brief quiet chime and remembers when it is muted',async({page})=>{
  const peak=await page.evaluate(async()=>{
    const {scheduleSudokuChime}=await import('/src/sudoku-sound.js');
    const context=new OfflineAudioContext(1,44100,44100);
    scheduleSudokuChime(context);
    const samples=(await context.startRendering()).getChannelData(0);
    return samples.reduce((max,sample)=>Math.max(max,Math.abs(sample)),0);
  });
  expect(peak).toBeGreaterThan(0.01);
  expect(peak).toBeLessThan(0.07);

  await page.addInitScript(()=>{
    const Audio=window.AudioContext;
    window.chime={starts:0,closes:0};
    window.AudioContext=class extends Audio {
      createOscillator(){
        const note=super.createOscillator(),start=note.start.bind(note);
        note.start=(...args)=>{window.chime.starts++;return start(...args);};
        // Only the modal dismissal can close this test's audio context.
        Object.defineProperty(note,'onended',{set(){}});
        return note;
      }
      close(){window.chime.closes++;return super.close();}
    };
  });
  await page.reload();
  const toggle=page.getByRole('checkbox',{name:'庆祝音效'});
  const celebration=page.getByRole('dialog',{name:'数独完成啦！'});
  async function solveBoard(){
    const {values,solution}=await solutionFromClues(page);
    await collectAll(page);
    for(const [index,value] of values.entries()){
      if(value!==null)continue;
      await page.locator(`[data-sudoku-card][data-word-id="${solution[index]}"]`).click();
      await page.locator(`[data-sudoku-cell="${index}"]`).click();
    }
    await expect(celebration).toBeVisible();
  }
  await startNumbers(page);
  await expect(toggle).toBeChecked();
  await solveBoard();
  await expect.poll(()=>page.evaluate(()=>window.chime.starts)).toBeGreaterThan(0);
  await celebration.getByRole('button',{name:'关闭庆祝'}).click();
  await expect.poll(()=>page.evaluate(()=>window.chime.closes)).toBe(1);

  await toggle.uncheck();
  await page.reload();
  await startNumbers(page);
  await expect(toggle).not.toBeChecked();
  await solveBoard();
  expect(await page.evaluate(()=>window.chime)).toEqual({starts:0,closes:0});
});

test('four modes retain separate progress and Sudoku owns its keyboard navigation',async({page})=>{
  await page.locator('#reveal').click();const flip=(await page.locator('.hanzi').textContent())[0];
  await startNumbers(page);await collectAll(page);
  const cell=page.locator('[data-sudoku-cell="0"]');await cell.focus();await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-sudoku-cell="1"]')).toBeFocused();
  await page.locator('#mode-train').click();await expect(page.locator('#sentence-train')).toBeVisible();
  await page.locator('#mode-workshop').click();await expect(page.locator('#workshop')).toBeVisible();
  await page.locator('#mode-flip').click();await expect(page.locator('.hanzi')).toContainText(flip);
  await page.locator('#mode-sudoku').click();await expect(page.locator('#sudoku')).toHaveAttribute('data-phase','fill');
  await expect(page.locator('[data-sudoku-card]')).toHaveCount(9);
});
test('Zhongwen supports lesson word choices and mobile has local board scrolling with tap input',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.getByLabel('题库来源').selectOption('zhongwen');await page.locator('#mode-sudoku').click();
  await expect(page.locator('#sudoku')).toContainText('暨南大学');
  await page.locator('[data-sudoku-choice][aria-pressed="true"]').first().click();
  await expect(page.locator('#sudoku-start')).toBeDisabled();
  await page.locator('[data-sudoku-choice][aria-pressed="false"]').first().click();await page.locator('#sudoku-start').click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await collectAll(page);
  const {values,solution}=await solutionFromClues(page),cell=values.indexOf(null);
  await page.locator(`[data-sudoku-card][data-word-id="${solution[cell]}"]`).click();
  await page.locator(`[data-sudoku-cell="${cell}"]`).click();
  await expect(page.locator('[data-score="team-1"]')).toHaveText('1');
  await page.screenshot({path:'docs/codex/sudoku/mobile.png',fullPage:true});
  await page.setViewportSize({width:1280,height:720});
  await page.evaluate(()=>scrollTo(0,0));
  expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBeLessThanOrEqual(720);
  const bounds=await page.locator('#sudoku-feedback').boundingBox();expect(bounds.y+bounds.height).toBeLessThanOrEqual(720);
  await page.screenshot({path:'docs/codex/sudoku/desktop.png',fullPage:true});
});
test('personal homophones stay readable without WebGL and scores belong to the selected team; bank stays intact',async({page})=>{
  const chars=['他','她','一','二','三','四','五','六','七'],pinyin=['tā','tā','yī','èr','sān','sì','wǔ','liù','qī'];
  const bank={schemaVersion:1,questions:chars.map((character,i)=>({id:`sudoku-${i}`,grade:1,character,pinyin:pinyin[i],words:[`${character}字`,`${character}词`],sentence:'这是课堂练习。'}))};
  await page.addInitScript(bank=>{
    localStorage.setItem('hanzi-flip.question-bank',JSON.stringify(bank));
    const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.startsWith('webgl')?null:original.call(this,type,...args);};
  },bank);
  await page.reload();const stored=await page.evaluate(()=>localStorage.getItem('hanzi-flip.question-bank'));
  await page.locator('#mode-sudoku').click();await page.locator('#sudoku-start').click();
  for(const char of ['他','她']){
    const clues=page.locator(`[data-sudoku-cell][data-word-id="personal/1/${char}"]`);
    expect(await clues.count()).toBeGreaterThan(0);await expect(clues.locator('.sudoku-pinyin')).toHaveCount(0);
  }
  const {values,solution}=await solutionFromClues(page);await collectAll(page);
  const blank=values.indexOf(null);await page.locator('#teams .team').nth(1).click();
  await page.locator(`[data-sudoku-card][data-word-id="${solution[blank]}"]`).click();await page.locator(`[data-sudoku-cell="${blank}"]`).click();
  await expect(page.locator('[data-score="team-2"]')).toHaveText('1');await expect(page.locator('[data-score="team-1"]')).toHaveText('0');
  page.once('dialog',d=>d.dismiss());await page.locator('#restart').click();await expect(page.locator('#sudoku')).toHaveAttribute('data-phase','fill');
  page.once('dialog',d=>d.accept());await page.locator('#restart').click();await expect(page.locator('#sudoku')).toHaveAttribute('data-phase','prepare');
  await expect(page.locator('[data-score="team-2"]')).toHaveText('0');
  expect(await page.evaluate(()=>localStorage.getItem('hanzi-flip.question-bank'))).toBe(stored);
});
test('a cancelled drag cannot collect into another mode or leave a floating card',async({page})=>{
  await startNumbers(page);const first=page.locator('[data-sudoku-cell][data-word-id]').first(),box=await first.boundingBox();
  await page.mouse.move(box.x+20,box.y+20);await page.mouse.down();await page.mouse.move(box.x+70,box.y+70,{steps:8});
  await expect(page.locator('.sudoku-drag-ghost')).toHaveCount(1);
  await page.locator('#mode-train').focus();await page.keyboard.press('Enter');await page.mouse.up();
  await expect(page.locator('.sudoku-drag-ghost')).toHaveCount(0);
  await page.locator('#mode-sudoku').click();await expect(page.locator('[data-sudoku-card]')).toHaveCount(0);
  await expect(page.locator('#sudoku')).toHaveAttribute('data-phase','collect');
});
test('touchscreen can collect and fill with taps',async({browser,baseURL})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,baseURL});
  const page=await context.newPage();await page.goto('/?mode=flip');await page.locator('#mode-sudoku').tap();await page.getByLabel('选择课次').selectOption('3');await page.locator('#sudoku-start').tap();
  const {values,solution}=await solutionFromClues(page);
  const clues=await page.locator('[data-sudoku-cell][data-word-id]').evaluateAll(nodes=>{const ids=new Set();return nodes.flatMap(n=>ids.has(n.dataset.wordId)?[]:(ids.add(n.dataset.wordId),[n.dataset.sudokuCell]));});
  for(const cell of clues){await page.locator(`[data-sudoku-cell="${cell}"]`).tap();await page.locator('#sudoku-collect').tap();}
  await expect(page.locator('#sudoku')).toHaveAttribute('data-phase','fill');
  const cell=values.indexOf(null);await page.locator(`[data-sudoku-card][data-word-id="${solution[cell]}"]`).tap();await page.locator(`[data-sudoku-cell="${cell}"]`).tap();
  await expect(page.locator('[data-score="team-1"]')).toHaveText('1');await context.close();
});
test('long textbook words fit the short projector board and keep full pinyin on their cards',async({page})=>{
  await page.setViewportSize({width:1280,height:720});
  await page.locator('#mode-sudoku').click();await page.getByLabel('学习阶段',{exact:true}).selectOption('3A');await page.getByLabel('选择课次').selectOption('4');
  await page.locator('#sudoku-start').click();
  const clues=page.locator('[data-sudoku-cell][data-word-id$="/玩儿电子游戏"]');expect(await clues.count()).toBeGreaterThan(0);
  await expect(clues.locator('.sudoku-pinyin')).toHaveCount(0);
  expect(await clues.locator('.sudoku-word').evaluateAll(nodes=>nodes.every(n=>n.scrollHeight<=n.clientHeight&&n.scrollWidth<=n.clientWidth))).toBe(true);
  await collectAll(page);
  const card=page.locator('[data-sudoku-card][data-word-id$="/玩儿电子游戏"]');await expect(card.locator('.sudoku-pinyin')).not.toHaveText('');
  expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBeLessThanOrEqual(720);
  await page.screenshot({path:'docs/codex/sudoku/long-words.png',fullPage:true});
});
