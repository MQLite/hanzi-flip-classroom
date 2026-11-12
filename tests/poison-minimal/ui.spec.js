import {test,expect} from '@playwright/test';
async function readPoison(page,lesson='1'){
 await page.goto('/?mode=poison');if(lesson!=='1')await page.locator('#lesson').selectOption(lesson);const sentence=await page.locator('#poison-antidote-choice option:checked').textContent();
 await page.locator('#poison-start').click();await page.locator('#poison-begin-hide').click();await page.locator('[data-poison-card]').first().click();await page.locator('#poison-seal').click();await page.locator('#poison-read').click();await page.locator('[data-poison-card]').first().click();return sentence;
}
async function visibleCopy(page){
 return page.locator('#witch-poison').evaluate(root=>{
  const buttons=[...root.querySelectorAll('button:not([hidden])')];
  try{
   for(const button of buttons)button.hidden=true;
   return root.innerText.replace(/[\p{Extended_Pictographic}\uFE0F\s]/gu,'');
  }finally{
   for(const button of buttons)button.hidden=false;
  }
 });
}
test('poison aftermath keeps only the required phrases, real antidote sentence and functional controls',async({page})=>{
 await page.setViewportSize({width:1280,height:720});
 const sentence=await readPoison(page);await expect(page.getByRole('dialog',{name:'需要解药吗？'})).toBeVisible();expect(await visibleCopy(page)).toBe('哎呀，中毒啦！');await page.locator('#poison-antidote').click();
 expect(await visibleCopy(page)).toBe(('哎呀，中毒啦！请读出解药句子'+sentence).replace(/\s/gu,''));await expect(page.locator('.poison-witch')).toBeVisible();await expect(page.locator('.poison-witch text')).toHaveCount(0);await page.screenshot({path:'docs/codex/poison/minimal-antidote-1280.png',fullPage:true});
 await page.locator('#poison-rescue').click();await expect(page.locator('.poison-magic-art.is-rescued')).toBeVisible();await expect(page.locator('#poison-next')).toBeVisible();expect(await visibleCopy(page)).toBe('');
});
test('other lessons retain their own exact antidote sentence without source captions',async({page})=>{
 const sentence=await readPoison(page,'2');expect(sentence).not.toBe('你好！');await page.locator('#poison-antidote').click();await expect(page.locator('#poison-antidote-sentence')).toHaveText(sentence);expect(await visibleCopy(page)).toBe(('哎呀，中毒啦！请读出解药句子'+sentence).replace(/\s/gu,''));
 await expect(page.locator('#poison-magic')).not.toContainText('教材第');await page.locator('#poison-antidote-skip').click();await page.locator('#poison-next').click();await expect(page.locator('#witch-poison')).toHaveAttribute('data-phase','cover');
});
