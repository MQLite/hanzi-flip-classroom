import {test,expect} from '@playwright/test';
import {mazeRoute,followMazeRoute} from '../maze/route.js';
async function start(page,motion='no-preference'){await page.emulateMedia({reducedMotion:motion});await page.goto('/?mode=maze');await page.locator('#maze-start').click();await expect(page.locator('#maze-scene')).toHaveAttribute('data-render-mode','3d');}
test('3D explorer stays put for a read choice, walks after confirmation and pauses the next action',async({page})=>{
  await start(page);const scene=page.locator('#maze-scene'),canvas=scene.locator('canvas');await expect(canvas).toBeVisible();await expect(scene).toHaveAttribute('data-avatar-cell','9');await page.locator('[data-maze-cell="10"]').click();await expect(scene).toHaveAttribute('data-avatar-cell','9');const before=await canvas.screenshot();
  await page.locator('#maze-confirm').click();await expect(scene).toHaveAttribute('data-motion','walk');await expect(page.locator('#maze-confirm')).toBeDisabled();expect(Buffer.compare(before,await canvas.screenshot())).not.toBe(0);await expect(scene).toHaveAttribute('data-motion','idle');await expect(scene).toHaveAttribute('data-avatar-cell','10');await expect(page.locator('#maze-progress')).toContainText('1');
});
test('the final step reaches the exit before celebration, and refreshes do not replay the reward',async({page})=>{
  await start(page,'reduce');const path=await mazeRoute(page);await followMazeRoute(page,path,path.at(-2));
  await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('[data-maze-cell="71"]').click();await page.locator('#maze-confirm').click();await expect(page.locator('#maze-scene')).toHaveAttribute('data-motion','walk');await expect(page.locator('#maze-celebration')).toBeHidden();
  await expect(page.locator('#maze-scene')).toHaveAttribute('data-motion','celebrate');await expect(page.locator('#maze-celebration')).toBeVisible();await page.screenshot({path:'docs/codex/poison/maze-3d-win.png',fullPage:true});await expect(page.locator('#maze-scene')).toHaveAttribute('data-motion','idle');await page.locator('#pinyin').locator('..').click();await expect(page.locator('#maze-scene')).toHaveAttribute('data-motion','idle');await page.locator('#mode-poison').click();await page.locator('#mode-maze').click();await expect(page.locator('#maze-scene')).toHaveAttribute('data-motion','idle');await page.locator('#maze-restart').click();await expect(page.locator('#hanzi-maze')).toHaveAttribute('data-phase','play');
});
test('one canvas survives text/mode changes, hidden pages and real context loss settle the pawn',async({page})=>{
  await start(page);const canvas=page.locator('#maze-scene canvas');await canvas.evaluate(n=>n.dataset.identity='same');await page.locator('[data-maze-cell="10"]').click();await page.locator('#maze-confirm').click();await page.locator('#mode-poison').click();await page.locator('#mode-maze').click();await expect(canvas).toHaveAttribute('data-identity','same');await expect(page.locator('#maze-scene')).toHaveAttribute('data-avatar-cell','10');await page.locator('#pinyin').locator('..').click();await expect(canvas).toHaveAttribute('data-identity','same');
  await page.locator('[data-maze-cell="9"]').click();await page.locator('#maze-confirm').click();await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await expect(page.locator('#maze-scene')).toHaveAttribute('data-motion','idle');await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});await expect(page.locator('#maze-scene')).toHaveAttribute('data-avatar-cell','9');
  await page.locator('[data-maze-cell="10"]').click();await page.locator('#maze-confirm').click();await canvas.evaluate(n=>n.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());await expect(page.locator('#maze-scene')).toHaveAttribute('data-render-mode','flat');await expect(page.locator('#maze-scene')).toHaveAttribute('data-avatar-cell','10');await page.locator('[data-maze-cell="9"]').click();await expect(page.locator('#maze-confirm')).toBeEnabled();
});
test('reduced motion and changing display during a walk preserve correct position and unlock reading',async({page})=>{
  await start(page);await page.locator('#maze-board').focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');await expect(page.locator('#maze-scene')).toHaveAttribute('data-motion','walk');await page.emulateMedia({reducedMotion:'reduce'});await expect(page.locator('#maze-scene')).toHaveAttribute('data-motion','idle');await expect(page.locator('#maze-scene')).toHaveAttribute('data-avatar-cell','10');
  await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('[data-maze-cell="9"]').click();await page.locator('#maze-confirm').click();await page.locator('#maze-scene-mode').click();await expect(page.locator('#maze-scene')).toHaveAttribute('data-render-mode','flat');await expect(page.locator('#maze-scene')).toHaveAttribute('data-motion','idle');await page.locator('#maze-scene-mode').click();await expect(page.locator('#maze-scene')).toHaveAttribute('data-render-mode','3d');await expect(page.locator('#maze-scene')).toHaveAttribute('data-avatar-cell','9');
});
test('no WebGL retains the complete native read-gated maze',async({page})=>{
  await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/iu.test(type)?null:original.call(this,type,...args);};});await page.goto('/?mode=maze');await page.locator('#maze-start').click();await expect(page.locator('#maze-scene')).toHaveAttribute('data-render-mode','flat');
  await expect(page.locator('.maze-landmark--start')).toHaveText('起点');
  await expect(page.locator('.maze-landmark--goal')).toHaveText('出口');
  await followMazeRoute(page,await mazeRoute(page));await expect(page.locator('#maze-celebration')).toBeVisible();await expect(page.locator('#maze-restart')).toBeEnabled();
});
test('the explorer walks onto a bomb, reveals it, and retreats only on the first visit',async({page})=>{
  await page.addInitScript(()=>{Math.random=()=>0;});
  await start(page,'reduce');
  const route=await mazeRoute(page),scene=page.locator('#maze-scene');
  await followMazeRoute(page,route,route[2]);
  await page.emulateMedia({reducedMotion:'no-preference'});
  const trap=page.locator(`[data-maze-cell="${route[3]}"]`);
  await trap.click();
  await expect(page.locator('#maze-read-word')).toBeVisible();
  await expect(page.locator('#maze-encounter')).toHaveCount(0);
  await page.locator('#maze-confirm').click();
  await expect(scene.locator('.maze-effect-badge')).toBeVisible();
  await expect(scene).toHaveAttribute('data-avatar-cell',String(route[3]));
  await expect(scene).toHaveAttribute('data-expression','startled');
  expect((await scene.locator('.maze-effect-badge').boundingBox()).width).toBeGreaterThan(110);
  await page.waitForTimeout(850);
  await expect(scene.locator('.maze-effect-badge')).toBeVisible();
  await expect(scene).toHaveAttribute('data-avatar-cell',String(route[3]));
  await expect(page.locator('#maze-encounter')).toHaveText(/炸弹！后退 1 步/);
  await expect(trap).toBeDisabled();
  await expect(scene).toHaveAttribute('data-motion','idle');
  await expect(scene).toHaveAttribute('data-avatar-cell',String(route[2]));
  await trap.click();await page.locator('#maze-confirm').click();
  await expect(scene).toHaveAttribute('data-motion','idle');
  await expect(scene).toHaveAttribute('data-avatar-cell',String(route[3]));
  await expect(page.locator('#maze-encounter')).toHaveCount(0);
});
test('maze English directions are optional and independent of pronunciation hints',async({page})=>{
  await page.goto('/?mode=maze');
  const english=page.getByRole('checkbox',{name:'英文指令'}),pinyin=page.getByRole('checkbox',{name:'拼音提示'});
  await expect(english).toBeVisible();
  await expect(english).not.toBeChecked();
  await english.check();
  await expect(page.locator('#maze-start').getByText('Start the maze',{exact:true})).toBeVisible();
  await page.locator('#maze-start').click();
  await page.locator('[data-maze-cell="10"]').click();
  await expect(page.getByText('Read this character aloud.',{exact:true})).toBeVisible();
  await expect(page.locator('#maze-read-word [lang=en], [data-maze-cell] [lang=en]')).toHaveCount(0);
  await expect(pinyin).not.toBeChecked();
  await pinyin.check();
  await expect(page.locator('.maze-read-pinyin')).toBeVisible();
  await english.uncheck();
  await expect(page.getByText('Read this character aloud.',{exact:true})).toHaveCount(0);
  await expect(page.locator('.maze-read-pinyin')).toBeVisible();
});
test('projected character buttons support touch and fit both phone and projector',async({browser,baseURL})=>{
  const context=await browser.newContext({baseURL,viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'no-preference'}),page=await context.newPage();await page.goto('/?mode=maze');const saved=await page.evaluate(()=>localStorage.getItem('hanzi-flip.question-bank'));await page.locator('#maze-start').tap();await expect(page.locator('#maze-scene canvas')).toBeVisible();await page.locator('[data-maze-cell="10"]').tap();await page.locator('#maze-confirm').tap();await expect(page.locator('#maze-scene')).toHaveAttribute('data-avatar-cell','10');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'docs/codex/poison/maze-3d-mobile.png',fullPage:true});
  for(const {width,height,minFont}of [{width:1280,height:720,minFont:30},{width:1920,height:1080,minFont:55}]){
    await page.setViewportSize({width,height});await expect(page.locator('[data-maze-cell="9"]')).toBeVisible();
    await expect.poll(()=>page.locator('[data-maze-cell="9"] strong').evaluate(n=>parseFloat(getComputedStyle(n).fontSize))).toBeGreaterThanOrEqual(minFont);
    expect((await page.locator('.maze-world').boundingBox()).width).toBeGreaterThan(650);
    expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBeLessThanOrEqual(height);
    const clipped=await page.locator('[data-maze-cell]').evaluateAll(nodes=>nodes.filter(n=>{const cell=n.getBoundingClientRect(),world=n.closest('.maze-stage').querySelector('.maze-world').getBoundingClientRect();return cell.left<world.left||cell.right>world.right||cell.top<world.top||cell.bottom>world.bottom;}).length);
    expect(clipped).toBe(0);
    await page.screenshot({path:`docs/codex/poison/maze-3d-projector-${height}.png`,fullPage:true});
  }
  await page.locator('[data-maze-cell="9"]').click();await expect(page.locator('#maze-read-word')).toBeVisible();
  await page.locator('#maze-scene-mode').click();await expect(page.locator('#maze-scene')).toHaveAttribute('data-render-mode','flat');
  expect(parseFloat(await page.locator('[data-maze-cell="9"] strong').evaluate(n=>getComputedStyle(n).fontSize))).toBeGreaterThanOrEqual(50);
  expect(await page.evaluate(()=>localStorage.getItem('hanzi-flip.question-bank'))).toBe(saved);await context.close();
});
