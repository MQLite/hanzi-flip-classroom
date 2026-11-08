import {test,expect} from '@playwright/test';
async function start(page,{type='house',words=2,motion='no-preference'}={}){
  await page.emulateMedia({reducedMotion:motion});await page.goto('/?mode=building');await page.locator(`#builder-type-${type}`).click();
  const ids=await page.locator('[data-builder-choice][aria-pressed="true"]').evaluateAll(nodes=>nodes.map(n=>n.dataset.builderChoice));for(const id of ids.slice(words))await page.locator(`[data-builder-choice="${id}"]`).click();
  await page.locator('#builder-start').click();await expect(page.locator('#builder-scene')).toHaveAttribute('data-render-mode','3d');
}
async function build(page,words=2){for(let i=0;i<words;i++){await page.locator('#builder-draw').click();await page.locator('#builder-confirm').click();}await expect(page.locator('[data-builder-card]').first()).toBeEnabled();}
async function collapse(page,words=2){if(await page.locator('#builder-challenge').count())await page.locator('#builder-challenge').click();for(let i=0;i<words;i++){await page.locator('[data-builder-card]').first().click();if(await page.locator('#hanzi-building').getAttribute('data-phase')==='collapsed')break;}}
test('actual 3D blocks drop, scatter and fly back with distinct frames while teacher controls wait',async({page})=>{
  await start(page);const canvas=page.locator('#builder-scene canvas');await expect(canvas).toBeVisible();const before=await canvas.screenshot();
  await page.locator('#builder-draw').click();await page.locator('#builder-confirm').click();await expect(page.locator('#builder-scene')).toHaveAttribute('data-motion','drop');await expect(page.locator('#builder-draw')).toBeDisabled();
  const flying=await canvas.screenshot();expect(Buffer.compare(before,flying)).not.toBe(0);await expect(page.locator('#builder-draw')).toBeEnabled();
  await page.locator('#builder-draw').click();await page.locator('#builder-confirm').click();await expect(page.locator('[data-builder-card]').first()).toBeEnabled();const whole=await canvas.screenshot();
  await collapse(page);await expect(page.locator('#builder-scene')).toHaveAttribute('data-motion','collapse');await expect(page.locator('#builder-restore')).toBeDisabled();await expect(page.locator('#builder-restore')).toBeEnabled();const rubble=await canvas.screenshot();expect(Buffer.compare(whole,rubble)).not.toBe(0);
  await page.screenshot({path:'docs/codex/poison/3d-collapse.png',fullPage:true});await page.locator('#builder-restore').click();await expect(page.locator('#builder-scene')).toHaveAttribute('data-motion','restore');await expect(page.locator('#builder-challenge')).toBeDisabled();
  const returning=await canvas.screenshot();expect(Buffer.compare(rubble,returning)).not.toBe(0);await expect(page.locator('#builder-challenge')).toBeEnabled();await page.screenshot({path:'docs/codex/poison/3d-restored.png',fullPage:true});
});
test('word/pinyin renders reuse one canvas and leaving mid-drop settles without stale locks',async({page})=>{
  await start(page);await page.locator('#builder-scene canvas').evaluate(n=>n.dataset.identity='keep');await page.locator('#builder-draw').click();await page.locator('#pinyin').locator('..').click();
  await expect(page.locator('#builder-scene canvas')).toHaveAttribute('data-identity','keep');await page.locator('#builder-confirm').click();await page.locator('#mode-poison').click();await page.locator('#mode-building').click();
  await expect(page.locator('#builder-scene canvas')).toHaveAttribute('data-identity','keep');await expect(page.locator('#builder-scene')).toHaveAttribute('data-motion','idle');await expect(page.locator('#builder-draw')).toBeEnabled();await expect(page.locator('#builder-progress')).toContainText('1 / 2');
  await page.locator('#builder-draw').click();await page.locator('#builder-confirm').click();await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  await expect(page.locator('#builder-scene')).toHaveAttribute('data-motion','idle');await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});await expect(page.locator('[data-builder-card]').first()).toBeEnabled();
});
test('reduced motion retains static 3D and changing display during collapse unlocks SVG rescue',async({page})=>{
  await start(page,{motion:'reduce',words:1});await build(page,1);await expect(page.locator('#builder-scene')).toHaveAttribute('data-motion','idle');await page.emulateMedia({reducedMotion:'no-preference'});await collapse(page,1);
  await page.locator('#builder-scene-mode').click();await expect(page.locator('#builder-scene')).toHaveAttribute('data-render-mode','flat');await expect(page.locator('#builder-restore')).toBeEnabled();await page.locator('#builder-restore').click();await expect(page.locator('#hanzi-building')).toHaveAttribute('data-phase','restored');
  await page.locator('#builder-scene-mode').click();await expect(page.locator('#builder-scene')).toHaveAttribute('data-render-mode','3d');await expect(page.locator('#builder-challenge')).toBeEnabled();
});
test('real WebGL context loss during a drop keeps lesson progress and a playable fallback',async({page})=>{
  await start(page);await page.locator('#builder-draw').click();await page.locator('#builder-confirm').click();
  await page.locator('#builder-scene canvas').evaluate(canvas=>canvas.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
  await expect(page.locator('#builder-scene')).toHaveAttribute('data-render-mode','flat');await expect(page.locator('#builder-progress')).toContainText('1 / 2');await expect(page.locator('#builder-draw')).toBeEnabled();await page.locator('#builder-draw').click();await page.locator('#builder-confirm').click();await expect(page.locator('[data-builder-card]').first()).toBeEnabled();
});
test('no WebGL still supports the complete build and sentence-rescue flow',async({page})=>{
  await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/iu.test(type)?null:original.call(this,type,...args);};});
  await page.goto('/?mode=building');const ids=await page.locator('[data-builder-choice][aria-pressed="true"]').evaluateAll(nodes=>nodes.map(n=>n.dataset.builderChoice));for(const id of ids.slice(1))await page.locator(`[data-builder-choice="${id}"]`).click();await page.locator('#builder-start').click();
  await expect(page.locator('#builder-scene')).toHaveAttribute('data-render-mode','flat');await build(page,1);await collapse(page,1);await page.locator('#builder-restore').click();await expect(page.locator('#hanzi-building')).toHaveAttribute('data-phase','restored');
});
test('reducing motion settles a drop immediately and restarting a collapse leaves the new round unlocked',async({page})=>{
  await start(page,{words:1});await page.locator('#builder-draw').click();await page.locator('#builder-confirm').click();await expect(page.locator('#builder-scene')).toHaveAttribute('data-motion','drop');
  await page.emulateMedia({reducedMotion:'reduce'});await expect(page.locator('#builder-scene')).toHaveAttribute('data-motion','idle');await expect(page.locator('[data-builder-card]').first()).toBeEnabled();
  await page.emulateMedia({reducedMotion:'no-preference'});await collapse(page,1);page.once('dialog',dialog=>dialog.accept());await page.locator('#restart').click();
  await expect(page.locator('#hanzi-building')).toHaveAttribute('data-phase','prepare');await page.locator('#builder-start').click();await expect(page.locator('#builder-progress')).toContainText('0 /');await expect(page.locator('#builder-scene')).toHaveAttribute('data-motion','idle');await expect(page.locator('#builder-draw')).toBeEnabled();
});
test('four static 3D silhouettes fit projector/mobile and keep the saved bank unchanged',async({page})=>{
  for(const type of ['house','bridge','tower','building']){
    await page.setViewportSize({width:1280,height:720});await start(page,{type,words:1,motion:'reduce'});const saved=await page.evaluate(()=>localStorage.getItem('hanzi-flip.question-bank'));await build(page,1);await expect(page.locator('#builder-scene canvas')).toBeVisible();await page.screenshot({path:`docs/codex/poison/3d-${type}.png`,fullPage:true});
    await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(await page.locator('#builder-scene canvas').evaluate(n=>n.width>0&&n.height>0)).toBe(true);expect(await page.evaluate(()=>localStorage.getItem('hanzi-flip.question-bank'))).toBe(saved);
    await collapse(page,1);await page.screenshot({path:`docs/codex/poison/3d-mobile-collapsed-${type}.png`,fullPage:true});
  }await page.screenshot({path:'docs/codex/poison/3d-mobile.png',fullPage:true});
});
test('an inactive view settles newly received progress without starting an animation or locking controls',async({page})=>{
  await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/?mode=building');
  const result=await page.evaluate(async()=>{
    const {createBuildingView}=await import('/src/building.js'),{createBuildingState,drawBuildingWord,confirmBuildingWord}=await import('/src/building-core.js');
    const fixture=document.createElement('div');fixture.style.width='500px';document.body.append(fixture);
    const words=[{id:'a',word:'房'},{id:'b',word:'桥'}],pool={words,sentences:[],label:'本课',note:''},view=createBuildingView(fixture,()=>{});
    let state=createBuildingState({words});view.scene.setActive(false);
    const model=()=>({state,pool,selectedIds:words.map(w=>w.id),structure:'house',sentenceId:'',showPinyin:false});
    view.update(model());state=confirmBuildingWord(drawBuildingWord(state));view.update(model());
    const result={motion:fixture.querySelector('#builder-scene').dataset.motion,disabled:fixture.querySelector('#builder-draw').disabled};view.dispose();fixture.remove();return result;
  });expect(result).toEqual({motion:'idle',disabled:false});
});
