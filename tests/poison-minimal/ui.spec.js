import {test,expect} from '@playwright/test';
async function readPoison(page,lesson='1'){
 await page.goto('/?mode=poison');if(lesson!=='1')await page.locator('#lesson').selectOption(lesson);const sentence=await page.locator('#poison-antidote-choice option:checked').textContent();
 await page.locator('#poison-start').click();await page.locator('#poison-begin-hide').click();await page.locator('[data-poison-card]').first().click();await page.locator('#poison-seal').click();await page.locator('#poison-read').click();await page.locator('[data-poison-card]').first().click();return sentence;
}
async function visibleCopy(page){
 return page.locator('#witch-poison').evaluate(root=>{
  const controls=[...root.querySelectorAll('button:not([hidden]), .poison-character-options')];
  try{
   for(const control of controls)control.hidden=true;
   return root.innerText.replace(/[\p{Extended_Pictographic}\uFE0F\s]/gu,'');
  }finally{
   for(const control of controls)control.hidden=false;
  }
 });
}
test('poison aftermath keeps only the required phrases, real antidote sentence and functional controls',async({page},testInfo)=>{
 await page.setViewportSize({width:1280,height:720});
 const sentence=await readPoison(page);await expect(page.getByRole('dialog',{name:'需要解药吗？'})).toBeVisible();expect(await visibleCopy(page)).toBe('哎呀，中毒啦！');await page.locator('#poison-antidote').click();
 expect(await visibleCopy(page)).toBe(('哎呀，中毒啦！请读出解药句子'+sentence).replace(/\s/gu,''));await expect(page.locator('.poison-witch')).toBeVisible();await expect(page.locator('.poison-witch text')).toHaveCount(0);
 await expect.poll(()=>page.locator('#poison-antidote-sentence').evaluate(node=>parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(84);
 const feed=page.getByRole('button',{name:'喂解药',exact:true});
 await expect(feed.locator('svg')).toBeVisible();
 await expect(page.getByRole('radio',{name:'男孩'})).toBeChecked();
 await page.getByRole('radio',{name:'女孩'}).check();
 await page.screenshot({path:testInfo.outputPath('antidote-projector.png')});
 await expect(page.locator('.poison-magic-art.is-rescued')).toHaveCount(0);
 await feed.click();
 await expect(page.getByRole('img',{name:'小青蛙吃下解药，变回女孩'})).toBeVisible();
 await page.screenshot({path:testInfo.outputPath('girl-rescue.png')});
 await expect(page.locator('#poison-next')).toBeVisible();expect(await visibleCopy(page)).toBe('');
});

test('the teacher can feed the potion to restore a boy and see the transformation on a phone',async({page},testInfo)=>{
 await page.setViewportSize({width:390,height:844});
 await page.emulateMedia({reducedMotion:'no-preference'});
 await readPoison(page,'2');
 await page.locator('#poison-antidote').click();
 const sentence=page.locator('#poison-antidote-sentence');
 await expect.poll(()=>sentence.evaluate(node=>parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(42);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
 await page.getByRole('radio',{name:'女孩'}).check();
 await page.getByRole('radio',{name:'男孩'}).check();
 await page.getByRole('button',{name:'喂解药',exact:true}).click();
 const restored=page.getByRole('img',{name:'小青蛙吃下解药，变回男孩'});
 await expect(restored).toBeVisible();
 expect(await restored.evaluate(node=>node.getAnimations({subtree:true}).length)).toBeGreaterThan(0);
 await page.screenshot({path:testInfo.outputPath('boy-rescue.png'),animations:'disabled'});
});
test('other lessons retain their own exact antidote sentence without source captions',async({page})=>{
 const sentence=await readPoison(page,'2');expect(sentence).not.toBe('你好！');await page.locator('#poison-antidote').click();await expect(page.locator('#poison-antidote-sentence')).toHaveText(sentence);expect(await visibleCopy(page)).toBe(('哎呀，中毒啦！请读出解药句子'+sentence).replace(/\s/gu,''));
 await expect(page.locator('#poison-magic')).not.toContainText('教材第');await page.locator('#poison-antidote-skip').click();await page.locator('#poison-next').click();await expect(page.locator('#witch-poison')).toHaveAttribute('data-phase','cover');
});

test('both character choices rotate skin, hair, ponytails, braids and glasses',async({page},testInfo)=>{
 await readPoison(page);
 const artwork=page.locator('.poison-rescued-child');
 const skin=artwork.locator('[data-skin]').first();
 const hair=artwork.locator('[data-hair]').first();
 const appearancesByCharacter=new Map();
 let previous;
 for(let index=0;index<12;index++){
  const character=index<6?'男孩':'女孩';
  if(index>0){
   await page.locator('#poison-next').click();
   await page.locator('#poison-begin-hide').click();
   const first=page.locator('[data-poison-card]').first();
   await first.click();
   await page.locator('#poison-seal').click();
   await page.locator('#poison-read').click();
   await first.click();
  }
  await page.locator('#poison-antidote').click();
  await page.getByRole('radio',{name:character,exact:true}).check();
  await page.getByRole('button',{name:'喂解药',exact:true}).click();
  await expect(page.getByRole('img',{name:`小青蛙吃下解药，变回${character}`})).toBeVisible();
  await expect(skin).toHaveCount(1);
  const appearance=[await skin.getAttribute('fill'),await hair.getAttribute('d')];
  if(previous){
   expect(appearance[0]).not.toBe(previous[0]);
   expect(appearance[1]).not.toBe(previous[1]);
  }
  const style=await hair.getAttribute('data-hair');
  const glasses=await artwork.locator('[data-glasses]').count()>0;
  const variants=appearancesByCharacter.get(character)??[];
  variants.push({skin:appearance[0],style,glasses});
  appearancesByCharacter.set(character,variants);
  previous=appearance;
  await page.locator('#pinyin').setChecked(index%2===0);
  await expect(skin).toHaveAttribute('fill',appearance[0]);
  await expect(hair).toHaveAttribute('d',appearance[1]);
  await expect(artwork.locator('[data-glasses]')).toHaveCount(Number(glasses));
  if(['ponytail','braids'].includes(style))await artwork.screenshot({path:testInfo.outputPath(`rescue-${index+1}.png`)});
 }
 for(const variants of appearancesByCharacter.values()){
  expect(new Set(variants.map(variant=>variant.skin)).size).toBe(5);
  expect(variants.map(variant=>variant.style).sort()).toEqual(['bob','braids','curls','long','ponytail','short']);
  expect(new Set(variants.map(variant=>variant.glasses))).toEqual(new Set([true,false]));
 }
});
