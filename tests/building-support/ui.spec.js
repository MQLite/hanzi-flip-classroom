import {test,expect} from '@playwright/test';
async function fixture(page,{motion='reduce'}={}){
  await page.emulateMedia({reducedMotion:motion});await page.goto('/?mode=building');
  await page.evaluate(async()=>{
    const {createBuildingView}=await import('/src/building.js'),core=await import('/src/building-core.js');
    document.querySelector('#hanzi-building').hidden=true;
    const host=document.createElement('div');host.id='support-fixture';host.style.width='100%';document.querySelector('.play-area').append(host);
    const words=['甲','乙','丙','丁'].map((word,i)=>({id:'w'+i,word})),sentence={id:'s',sentence:'我喜欢中文。'},pool={words,sentences:[sentence],label:'支撑测试',note:''};
    let state=core.createBuildingState({words,sentence,random:()=>.999});for(let i=0;i<4;i++)state=core.confirmBuildingWord(core.drawBuildingWord(state));
    const render=()=>view.update({state,pool,showPinyin:false}),view=createBuildingView(host,(intent,id)=>{if(intent==='challenge-card')state=core.chooseBuildingChallengeWord(state,id);if(intent==='restore')state=core.restoreBuilding(state);render();});
    window.supportFixture={render,get state(){return state;},view,host};render();view.scene.setActive(true);
  });return page.locator('#support-fixture');
}
test('a lower support drops only its upper column and keeps those poses through display changes and refresh',async({page},testInfo)=>{
  const host=await fixture(page,{motion:'no-preference'}),stable=host.locator('[data-word-brick="w3"]'),home=await stable.getAttribute('transform');
  await host.locator('[data-builder-card="w0"]').click();await expect(host).toHaveAttribute('data-phase','collapsed');
  await expect(host.locator('#builder-scene')).toHaveAttribute('data-motion','collapse');await expect(host.locator('#builder-restore')).toBeDisabled();
  await host.locator('#builder-scene-mode').click();await expect(host.locator('#builder-scene')).toHaveAttribute('data-render-mode','flat');await expect(host.locator('#builder-restore')).toBeEnabled();
  await expect(host.locator('[data-word-brick="w0"]')).toHaveCount(0);await expect(host.locator('[data-word-brick="w2"]')).toHaveAttribute('data-support-state','fallen');
  await expect(host.locator('[data-support-state="fallen"]:not([data-word-brick])')).toHaveCount(0);
  await expect(stable).toHaveAttribute('data-support-state','standing');await expect(stable).toHaveAttribute('transform',home);
  const fallen=await host.locator('[data-word-brick="w2"]').getAttribute('transform');await page.evaluate(()=>window.supportFixture.render());
  await expect(host.locator('[data-word-brick="w2"]')).toHaveAttribute('transform',fallen);await expect(stable).toHaveAttribute('transform',home);
  await host.locator('#builder-scene-mode').click();await expect(host.locator('#builder-scene')).toHaveAttribute('data-render-mode','3d');await page.screenshot({path:testInfo.outputPath('local-collapse.png'),fullPage:true});
  await host.locator('#builder-restore').click();await expect(host).toHaveAttribute('data-phase','restored');await expect(host.locator('#builder-restore')).toHaveCount(0);
  await expect(host.locator('#builder-challenge')).toBeEnabled();await expect(host.locator('[data-word-brick][data-support-state="fallen"]')).toHaveCount(0);
});
test('safe top-down removal drops detached trim and ends with optional rescue',async({page},testInfo)=>{
  const host=await fixture(page),saved=await page.evaluate(()=>localStorage.getItem('hanzi-flip.question-bank'));
  for(const [index,id]of ['w2','w3','w0','w1'].entries()){
    await host.locator(`[data-builder-card="${id}"]`).click();await expect(host).toHaveAttribute('data-phase',index===3?'cleared':'challenge');
    await expect(host.locator(`[data-builder-card="${id}"]`)).toHaveCount(0);await expect(host.locator('[data-word-brick][data-support-state="fallen"]')).toHaveCount(0);
  }
  await expect(host).toContainText('词砖已安全拆完');await expect(host.locator('#builder-restore')).toBeEnabled();
  await expect(host.locator('[data-word-brick]')).toHaveCount(0);expect(await page.evaluate(()=>localStorage.getItem('hanzi-flip.question-bank'))).toBe(saved);
  await page.screenshot({path:testInfo.outputPath('safe-clear.png'),fullPage:true});await host.locator('#builder-restore').click();await expect(host).toHaveAttribute('data-phase','restored');await expect(host.locator('[data-word-brick]')).toHaveCount(4);
});
