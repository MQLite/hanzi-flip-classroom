import {test,expect} from '@playwright/test';
import scenes from '../../src/city-scenes.json' with {type:'json'};
async function finalStage(page,query){
 await page.goto('/?mode=explore&'+query);await page.locator('#open-island-map').click();await page.getByRole('button',{name:'按顺序闯关',exact:true}).click();
 await page.evaluate(()=>{const key='hanzi-flip.island-journeys.v1',rows=JSON.parse(localStorage.getItem(key)),s=rows[0];s.index=10;s.completed=s.stages.filter(g=>g.available&&g.id!=='explore').map(g=>g.id);localStorage.setItem(key,JSON.stringify(rows));});await page.reload();
 await expect(page.locator('#mode-explore')).toHaveAttribute('aria-pressed','true');await page.getByRole('link',{name:'进入情景',exact:true}).click();
}
async function openPoetryJourney(page){
 await page.goto('/?mode=explore');await page.locator('#open-island-map').click();await page.getByRole('button',{name:'按顺序闯关',exact:true}).click();
 await expect(page.locator('#island-journey-strip')).toContainText('情景探索');await expect(page.locator('#journey-next')).toBeDisabled();
 await page.getByRole('link',{name:'进入情景',exact:true}).click();
}
async function solve(page,object,answers){await page.locator(`[data-object="${object}"]`).click();for(const [field,value] of Object.entries(answers))await page.locator(`[data-field="${field}"][data-value="${value}"]`).click();await page.locator('#quest-check').click();}
async function finishPoetry(page){
 await solve(page,'wardrobe',{left:'纟',right:'逢',reading:'féng'});await solve(page,'desk',{feeling:'worry',evidence:'late'});
 await solve(page,'mirror',{unchanged:'accent',changed:'hair'});await solve(page,'door',{self:'home',children:'guest'});
 await page.locator('[data-object="mailbox"]').click();for(const [letter,recipient] of [['motherLetter','mother'],['homeLetter','home']]){await page.locator(`[data-letter="${letter}"]`).click();await page.locator(`[data-recipient="${recipient}"]`).click();}
}
test('scenario-only lesson skips missing islands, native completion celebrates once, return preserves course',async({page})=>{
 await openPoetryJourney(page);expect(new URL(page.url()).searchParams.get('journey')).toBeTruthy();
 await expect(page.locator('#lesson-celebration')).toHaveCount(0);await page.getByRole('button',{name:'带提示探索',exact:true}).click();await finishPoetry(page);
 await expect(page.locator('#lesson-celebration')).toBeVisible();await expect(page.locator('#lesson-celebration')).toContainText('太牛啦');
 await page.getByRole('button',{name:'关闭庆祝',exact:true}).click();await page.getByRole('link',{name:'返回小岛地图',exact:true}).first().click();
 await expect(page.getByLabel('选择册数',{exact:true})).toHaveValue('5');await expect(page.getByLabel('选择课次')).toHaveValue('9');
 await expect(page.locator('#island-map')).toBeVisible();await expect(page.locator('#island-map')).toContainText('已完成 1 / 1 岛');
 await page.reload();await expect(page.locator('#lesson-celebration')).toHaveCount(0);
});
test('opening an old completed poetry save does not award a new journey',async({page})=>{
 await page.goto('/quest.html');await page.getByRole('button',{name:'带提示探索',exact:true}).click();await finishPoetry(page);
 await openPoetryJourney(page);await page.getByRole('button',{name:'继续上次探索',exact:true}).click();
 await expect(page.locator('#quest-complete')).toBeVisible();await expect(page.locator('#lesson-celebration')).toHaveCount(0);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('hanzi-flip.island-journeys.v1'))[0].completed)).toEqual([]);
});
test('native city mission completion awards its matching final island',async({page})=>{
 await finalStage(page,'source=paradise&stage=2A&lesson=2');await page.locator('#start-mission').click();
 for(let i=0;i<scenes.length;i++){for(let j=0;j<scenes[i].lines.length;j++)await page.locator('#show-clue').click();await page.getByRole('button',{name:scenes[i].city,exact:true}).click();if(i<scenes.length-1)await page.locator('#next-scene').click();}
 await expect(page.locator('#lesson-celebration')).toBeVisible();await page.getByRole('button',{name:'关闭庆祝',exact:true}).click();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('hanzi-flip.island-journeys.v1'))[0].status)).toBe('complete');
});
test('native room exit completion awards its matching final island',async({page})=>{
 await finalStage(page,'source=zhongwen&stage=1&lesson=3');await page.getByRole('button',{name:'开始探索',exact:true}).click();
 const choices=[0,1,0,1,1,1,0,1,0,0,0,1];
 for(let i=0;i<choices.length;i++){
  await page.locator(`[data-choice="${choices[i]}"]`).click();
  if(i===10){await page.locator('#room-card-slot').click();await page.locator('#room-key-pickup').click();}
  else if(i<11)await page.getByRole('button',{name:'下一条线索',exact:true}).click();
 }
 await expect(page.locator('#lesson-celebration')).toBeVisible();await page.getByRole('button',{name:'关闭庆祝',exact:true}).click();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('hanzi-flip.island-journeys.v1'))[0].status)).toBe('complete');
});
