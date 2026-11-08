import {test,expect} from '@playwright/test';

async function setup(page){await page.goto('/?mode=strokes');await page.locator('#bank-source').selectOption('zhongwen');await page.getByRole('button',{name:'触屏描写',exact:true}).click();await expect(page.locator('.handwriting-pad .glyph-shadow path')).toHaveCount(1);}
async function geometry(page,ch='一'){return (await page.request.get('/strokes/'+encodeURIComponent(ch)+'.json')).json();}
async function screenPoints(page,points){return page.locator('.handwriting-pad').evaluate((svg,points)=>points.map(p=>{const q=new DOMPoint(p[0],900-p[1]).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y};}),points);}
async function writeMouse(page,points){const screen=await screenPoints(page,points);await page.mouse.move(screen[0].x,screen[0].y);await page.mouse.down();for(const p of screen.slice(1))await page.mouse.move(p.x,p.y,{steps:3});await page.mouse.up();const popup=page.locator('#handwriting-score-dialog');if(await popup.count())await popup.getByRole('button',{name:'关闭',exact:true}).click();}
async function dragFirst(page,ch='一'){
 const data=await geometry(page,ch),median=data.medians[0];const source=await page.getByRole('button',{name:'选择横',exact:true}).boundingBox();const target=await page.locator('.writing-grid').evaluate((svg,p)=>{const q=new DOMPoint(p[0],900-p[1]).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y};},median[Math.floor(median.length/2)]);await page.mouse.move(source.x+source.width/2,source.y+source.height/2);await page.mouse.down();await page.mouse.move(target.x,target.y,{steps:6});await page.mouse.up();
}
test('touch mode rejects backwards strokes silently, speaks a correct stroke once and shows the character score',async({page})=>{
 await page.addInitScript(()=>{const Native=window.Audio;window._writingClips=[];window.Audio=class extends Native{constructor(url){super(url);window._writingClips.push(this);}};});
 await setup(page);const data=await geometry(page);await writeMouse(page,[...data.medians[0]].reverse());await expect(page.locator('.handwriting-ink path')).toHaveCount(0);expect(await page.evaluate(()=>window._writingClips.length)).toBe(0);
 await writeMouse(page,data.medians[0]);await expect(page.locator('.handwriting-ink path')).toHaveCount(1);await expect(page.locator('#handwriting-score')).toBeVisible();expect(Number(await page.locator('#handwriting-score').getAttribute('data-score'))).toBeGreaterThanOrEqual(95);
 expect(await page.evaluate(()=>window._writingClips.length)).toBe(1);expect(decodeURIComponent(await page.evaluate(()=>window._writingClips[0].src))).toContain('横.wav');
 await page.getByRole('button',{name:'下一字 →',exact:true}).click();await expect(page.locator('.writing-stage h3')).toContainText('二');await expect(page.locator('#handwriting-score')).toHaveCount(0);await page.getByRole('button',{name:'← 上一字',exact:true}).click();await expect(page.locator('#handwriting-score')).toBeVisible();expect(await page.evaluate(()=>window._writingClips.length)).toBe(1);
});
test('dragging and writing keep independent progress through mode snapshots, undo and rewrite',async({page})=>{
 await page.goto('/?mode=strokes');await page.locator('#bank-source').selectOption('zhongwen');await expect(page.locator('.glyph-shadow path')).toHaveCount(1);await dragFirst(page);await expect(page.locator('.glyph-written path')).toHaveCount(1);
 await page.getByRole('button',{name:'触屏描写',exact:true}).click();await expect(page.locator('.handwriting-ink path')).toHaveCount(0);const data=await geometry(page);await writeMouse(page,data.medians[0]);await expect(page.locator('#handwriting-score')).toBeVisible();await page.getByRole('button',{name:'拖动笔画',exact:true}).click();await expect(page.locator('.glyph-written path')).toHaveCount(1);
 await page.getByRole('button',{name:'触屏描写',exact:true}).click();await page.locator('#mode-flip').click();await page.locator('#mode-strokes').click();await expect(page.getByRole('button',{name:'触屏描写',exact:true})).toHaveAttribute('aria-pressed','true');await expect(page.locator('#handwriting-score')).toBeVisible();
 await page.getByRole('button',{name:'撤回一笔',exact:true}).click();await expect(page.locator('.handwriting-ink path')).toHaveCount(0);await expect(page.locator('#handwriting-score')).toHaveCount(0);await writeMouse(page,data.medians[0]);await page.getByRole('button',{name:'重写本字',exact:true}).click();await expect(page.locator('.handwriting-ink path')).toHaveCount(0);await page.getByRole('button',{name:'拖动笔画',exact:true}).click();await expect(page.locator('.glyph-written path')).toHaveCount(1);
});
test('real touch cancellation and hidden-page interruption never submit a partial stroke',async({page})=>{
 await setup(page);const data=await geometry(page),points=await screenPoints(page,data.medians[0]);const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
 const touch=(type,p)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:p?[{x:p.x,y:p.y,id:1}]:[]});await touch('touchStart',points[0]);await touch('touchMove',points[Math.floor(points.length/2)]);await touch('touchCancel');await expect(page.locator('.handwriting-ink path')).toHaveCount(0);
 await touch('touchStart',points[0]);await touch('touchMove',points[Math.floor(points.length/2)]);await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await touch('touchEnd');await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,value:false}));await expect(page.locator('.handwriting-ink path')).toHaveCount(0);
 await touch('touchStart',points[0]);for(const p of points.slice(1))await touch('touchMove',p);await touch('touchEnd');await expect(page.locator('#handwriting-score')).toBeVisible();await cdp.detach();
});
test('a pending gesture cannot finish into another lesson and mode switching keeps mute',async({page})=>{
 await setup(page);const points=await screenPoints(page,(await geometry(page)).medians[0]);await page.mouse.move(points[0].x,points[0].y);await page.mouse.down();await page.mouse.move(points[1].x,points[1].y);
 await page.locator('#mode-flip').evaluate(b=>b.click());await page.mouse.up();await page.locator('#mode-strokes').click();await expect(page.locator('.handwriting-ink path')).toHaveCount(0);
 await page.getByRole('button',{name:'读音：开启',exact:true}).click();await page.locator('#lesson').selectOption('2');await expect(page.getByRole('button',{name:'触屏描写',exact:true})).toHaveAttribute('aria-pressed','true');await expect(page.getByRole('button',{name:'读音：关闭',exact:true})).toBeVisible();await expect(page.locator('.handwriting-ink path')).toHaveCount(0);
});
test('handwriting grid and score controls fit projector and phone widths',async({page})=>{
 await setup(page);for(const viewport of [{width:1280,height:720},{width:1920,height:1080},{width:390,height:844}]){await page.setViewportSize(viewport);await expect(page.locator('.handwriting-pad')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);const rect=await page.locator('.handwriting-pad').boundingBox();expect(rect.width).toBeGreaterThan(viewport.width<700?240:330);await page.screenshot({path:`docs/codex/handwriting-${viewport.width}.png`,fullPage:true});}
});
test('multi-bend character traces speak all six names only on acceptance and keep a single score',async({page})=>{
 await page.addInitScript(()=>{const Native=window.Audio;window._writingClips=[];window.Audio=class extends Native{constructor(url){super(url);window._writingClips.push(this);}};});
 await page.goto('/?mode=strokes');await page.getByRole('button',{name:'触屏描写',exact:true}).click();await expect(page.locator('.writing-stage h3')).toContainText('好');const data=await geometry(page,'好');await expect(page.locator('.handwriting-pad .glyph-shadow path')).toHaveCount(6);
 for(let i=0;i<data.medians.length;i++){await writeMouse(page,data.medians[i]);await expect(page.locator('.handwriting-ink path')).toHaveCount(i+1);}
 const names=await page.evaluate(()=>window._writingClips.map(a=>decodeURIComponent(a.src).split('/').at(-1).split('.wav')[0]));expect(names).toEqual(['撇点','撇','横','横撇','弯钩','横']);await expect(page.locator('#handwriting-score')).toBeVisible();await expect(page.locator('.handwriting-result-list [data-character="好"]')).toHaveCount(1);
});
test('the final character score stays visible until the teacher opens the optional review',async({page})=>{
 await page.goto('/tests/handwriting/fixture.html');await expect(page.locator('.handwriting-pad .glyph-shadow path')).toHaveCount(1);await writeMouse(page,(await geometry(page)).medians[0]);await expect(page.locator('#handwriting-score')).toBeVisible();await expect(page.locator('.stroke-review')).toHaveCount(0);
 await page.getByRole('button',{name:'笔画总复习 / 预习',exact:true}).click();await expect(page.locator('.stroke-review-grid button')).toHaveCount(29);await page.getByRole('button',{name:'返回本课练习',exact:true}).click();await expect(page.locator('#handwriting-score')).toBeVisible();
});
test('a real pen stroke can complete tracing after an outside-grid release was cancelled',async({page})=>{
 await setup(page);const data=await geometry(page);await writeMouse(page,[data.medians[0][0],[1200,700]]);await expect(page.locator('.handwriting-ink path')).toHaveCount(0);
 const points=await screenPoints(page,data.medians[0]),cdp=await page.context().newCDPSession(page);const send=(type,p,buttons)=>cdp.send('Input.dispatchMouseEvent',{type,x:p.x,y:p.y,button:'left',buttons,pointerType:'pen',force:buttons ? .5 : 0});
 await send('mousePressed',points[0],1);for(const p of points.slice(1))await send('mouseMoved',p,1);await send('mouseReleased',points.at(-1),0);await expect(page.locator('#handwriting-score')).toBeVisible();await cdp.detach();
});
test('phone touch input completes a trace after the canvas is scrolled into view',async({page})=>{
 await page.setViewportSize({width:390,height:844});await setup(page);await page.locator('.handwriting-pad').scrollIntoViewIfNeeded();const points=await screenPoints(page,(await geometry(page)).medians[0]);const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...points[0],id:1}]});for(const p of points.slice(1))await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...p,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await expect(page.locator('#handwriting-score')).toBeVisible();await cdp.detach();
});
test('window and canvas resizing cancel an active stroke before it can receive credit',async({page})=>{
 for(const change of ['window','canvas']){
  await page.setViewportSize({width:1280,height:720});await setup(page);const median=(await geometry(page)).medians[0],middle=Math.floor(median.length/2),first=await screenPoints(page,median);
  await page.mouse.move(first[0].x,first[0].y);await page.mouse.down();for(const p of first.slice(1,middle+1))await page.mouse.move(p.x,p.y);
  if(change==='window')await page.setViewportSize({width:1400,height:800});else await page.locator('.handwriting-pad').evaluate(n=>n.style.width='300px');
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));const rest=await screenPoints(page,median.slice(middle));for(const p of rest)await page.mouse.move(p.x,p.y);await page.mouse.up();
  await expect(page.locator('.handwriting-ink path')).toHaveCount(0);await expect(page.locator('#handwriting-score')).toHaveCount(0);await writeMouse(page,median);await expect(page.locator('#handwriting-score')).toBeVisible();
 }
});
