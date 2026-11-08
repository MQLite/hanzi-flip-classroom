import {test,expect} from '@playwright/test';
test('site: navigation order, direct links, mode snapshots and unchanged stored bank',async({page})=>{
 await page.goto('/?mode=puzzle');await expect(page.locator('#mode-puzzle')).toHaveAttribute('aria-pressed','true');
 expect(await page.locator('.game-modes button').allTextContents()).toEqual(['识字翻翻乐','汉字拼图','笔画很忙','组词小工坊','句子小火车','汉字数独','情景探索','打地鼠','女巫的毒药','汉字建筑师','汉字迷宫']);
 const stored=await page.evaluate(()=>localStorage.getItem('hanzi-flip.question-bank'));
 await page.locator('.parts-palette button').first().click();await expect(page.locator('.parts-tray button')).toHaveCount(1);
 await page.locator('#mode-strokes').click();await expect(page.locator('.writing-grid')).toBeVisible();await page.locator('#mode-puzzle').click();await expect(page.locator('.parts-tray button')).toHaveCount(1);
 page.once('dialog',dialog=>dialog.dismiss());await page.locator('#restart').click();await expect(page.locator('.parts-tray button')).toHaveCount(1);
 page.once('dialog',dialog=>dialog.accept());await page.locator('#restart').click();await expect(page.locator('.parts-tray button')).toHaveCount(0);
 for(const id of ['building','maze','poison']){await page.locator('#mode-'+id).click();await expect(page.locator('#pinyin')).not.toBeChecked();}
 expect(await page.evaluate(()=>localStorage.getItem('hanzi-flip.question-bank'))).toBe(stored);
 await page.goto('/?mode=strokes');await expect(page.locator('#mode-strokes')).toHaveAttribute('aria-pressed','true');
});
test('fixture: selects parts without a target and reveals only a matching character',async({page})=>{
 await page.goto('/tests/construction/fixture.html?mode=puzzle');await expect(page.locator('.parts-palette button').first()).toBeVisible();await expect(page.locator('.puzzle-reveal svg')).toHaveCount(0);
 await page.locator('.parts-palette button').filter({hasText:'日'}).first().click();await page.locator('.parts-palette button').filter({hasText:'月'}).first().click();await page.getByRole('button',{name:'合一合',exact:true}).click();await expect(page.locator('.puzzle-reveal')).toContainText('明');await expect(page.locator('.puzzle-reveal svg')).toHaveCount(1);
});
test('fixture: large white-shadow grid, selecting plays real audio but does not write',async({page})=>{
 await page.goto('/tests/construction/fixture.html?mode=strokes');const grid=page.locator('.writing-grid');await expect(grid.locator('.glyph-shadow path').first()).toBeVisible();expect((await grid.boundingBox()).width).toBeGreaterThan(400);
 const name=await page.evaluate(()=>window.state.characters[0].names[0]);await page.locator('.stroke-palette button').filter({hasText:name}).first().click();expect(await page.evaluate(()=>window.state.placed)).toBe(0);
 const samples=await page.evaluate(async(name)=>{const r=await fetch('/audio/stroke-names/'+name+'.wav');const context=new AudioContext();const buffer=await context.decodeAudioData(await r.arrayBuffer());const data=buffer.getChannelData(0);let peak=0;for(const sample of data)peak=Math.max(peak,Math.abs(sample));await context.close();return {duration:buffer.duration,peak};},name);expect(samples.duration).toBeGreaterThan(.2);expect(samples.peak).toBeGreaterThan(.01);
});
test('fixture: pointer dragging places only the next stroke and lesson completion opens review',async({page})=>{
 await page.goto('/tests/construction/fixture.html?mode=strokes');
 const count=await page.evaluate(()=>window.state.characters.length);
 for(let characterIndex=0;characterIndex<count;characterIndex++){
  const record=await page.evaluate(()=>window.state.characters[window.state.index]);
  const geometry=await (await page.request.get('/strokes/'+encodeURIComponent(record.character)+'.json')).json();
  for(let i=0;i<record.names.length;i++){
   const grid=page.locator('.writing-grid');await expect(grid.locator('.glyph-shadow path')).toHaveCount(record.names.length);
   const palette=page.getByRole('button',{name:'选择'+record.names[i],exact:true});await palette.scrollIntoViewIfNeeded();const source=await palette.boundingBox();
   const median=geometry.medians[i],point=median[Math.floor(median.length/2)];
   const target=await grid.evaluate((svg,p)=>{const q=new DOMPoint(p[0],900-p[1]).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y};},point);
   await page.mouse.move(source.x+source.width/2,source.y+source.height/2);await page.mouse.down();await page.mouse.move(target.x,target.y,{steps:8});await page.mouse.up();
   await expect.poll(()=>page.evaluate(()=>window.state.placed)).toBe(i+1);
  }
  if(characterIndex<count-1)await page.getByRole('button',{name:'下一字 →',exact:true}).click();
 }
 await expect(page.locator('.stroke-review')).toBeVisible();await expect(page.locator('.stroke-review-grid button')).toHaveCount(29);
});
test('site: lesson changes replace vocabulary and classroom/mobile layouts stay within width',async({page})=>{
 await page.goto('/?mode=strokes');await page.locator('#bank-source').selectOption('zhongwen');await expect(page.locator('.writing-stage h3')).toContainText('一');await page.locator('#lesson').selectOption('2');await expect(page.locator('.writing-stage h3')).toContainText('人');
 for(const viewport of [{width:1280,height:720},{width:1920,height:1080},{width:390,height:844}]){
  await page.setViewportSize(viewport);await expect(page.locator('.writing-grid .glyph-shadow path').first()).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
  const bounds=await page.locator('.writing-grid').boundingBox();expect(bounds.width).toBeGreaterThan(viewport.width<700?240:330);
  await page.screenshot({path:`docs/codex/forms-${viewport.width}.png`,fullPage:true});
 }
});
test('site: late old glyph loads cannot replace a new lesson and real audio stops on mode change',async({page})=>{
 await page.addInitScript(()=>{const Native=window.Audio;window._clips=[];window.Audio=class extends Native{constructor(url){super(url);window._clips.push(this);}};});
 let release,blocked=false;const gate=new Promise(resolve=>release=resolve);
 await page.route('**/strokes/*.json',async route=>{if(decodeURIComponent(route.request().url()).endsWith('/好.json')){blocked=true;await gate;}await route.continue();});
 await page.goto('/?mode=strokes');await expect.poll(()=>blocked).toBe(true);await page.locator('#bank-source').selectOption('zhongwen');
 await expect(page.locator('.writing-grid')).toHaveAttribute('aria-label','一的大田字格');release();await expect(page.locator('.writing-grid .glyph-shadow path')).toHaveCount(1);
 await page.getByRole('button',{name:'选择横',exact:true}).click();await expect.poll(()=>page.evaluate(()=>window._clips.some(a=>!a.paused))).toBe(true);
 await page.locator('#mode-flip').click();expect(await page.evaluate(()=>window._clips.every(a=>a.paused))).toBe(true);await expect(page.locator('.stroke-drag-ghost')).toHaveCount(0);
});
test('fixture: a cancelled old audio promise cannot overwrite the next selection hint',async({page})=>{
 await page.addInitScript(()=>{window._pending=[];window.Audio=class{pause(){}play(){return new Promise(resolve=>window._pending.push(resolve));}};});
 await page.goto('/tests/construction/fixture.html?mode=strokes');const b=page.locator('.stroke-palette button').first();await b.click();await b.click();
 await page.evaluate(()=>window._pending[0]());await expect(page.locator('.selected-stroke-label')).not.toContainText('未能播放');
});
