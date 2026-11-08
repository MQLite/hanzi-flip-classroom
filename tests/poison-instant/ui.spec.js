import {test,expect} from '@playwright/test';
async function readStage(page,count=1){
  await page.goto('/?mode=poison');await page.locator('#poison-count').selectOption(String(count));await page.locator('#poison-start').click();await page.locator('#poison-begin-hide').click();
  const ids=await page.locator('[data-poison-card]').evaluateAll(nodes=>nodes.map(n=>n.dataset.poisonCard));for(const id of ids.slice(0,count))await page.locator(`[data-poison-card="${id}"]`).click();await page.locator('#poison-seal').click();await page.locator('#poison-read').click();return ids;
}
test('each read card gives instant feedback and poison immediately offers use or skip antidote',async({page})=>{
  const ids=await readStage(page,2);await expect(page.locator('#poison-reveal')).toHaveCount(0);await page.locator(`[data-poison-card="${ids[2]}"]`).click();await expect(page.locator(`[data-poison-card="${ids[2]}"]`)).toBeDisabled();await expect(page.locator('#poison-feedback')).toContainText('安全');
  await page.locator(`[data-poison-card="${ids[0]}"]`).click();await expect(page.locator('#witch-poison')).toHaveAttribute('data-phase','complete');await expect(page.getByRole('dialog',{name:'需要解药吗？'})).toBeVisible();await expect(page.locator('#poison-magic')).toBeVisible();await page.locator('#poison-antidote-skip').click();await expect(page.getByRole('dialog',{name:'需要解药吗？'})).toHaveCount(0);await expect(page.locator('#poison-next-activity')).toBeVisible();
});
test('antidote can be used immediately and mute stays available without restarting',async({page})=>{
  const [id]=await readStage(page);await page.locator('#poison-sound').uncheck();await page.locator(`[data-poison-card="${id}"]`).click();await page.locator('#poison-antidote').click();await expect(page.locator('#poison-antidote-sentence')).toBeVisible();await page.locator('#poison-rescue').click();await expect(page.locator('#poison-magic')).toContainText('解救成功');await expect(page.locator('#poison-next-activity')).toBeVisible();await expect(page.locator('#poison-sound')).not.toBeChecked();
});
test('cartoon poison and rescue audio produce bounded non-silent sound in a real offline audio engine',async({page})=>{
  await page.goto('/');const audio=await page.evaluate(async()=>{
    const {schedulePoisonSound,scheduleRescueSound}=await import('/src/poison-sound.js'),results=[];
    for(const schedule of [schedulePoisonSound,scheduleRescueSound]){const context=new OfflineAudioContext(1,44100,44100);schedule(context);const buffer=await context.startRendering(),samples=buffer.getChannelData(0);let sum=0,peak=0;for(const value of samples){sum+=value*value;peak=Math.max(peak,Math.abs(value));}results.push({rms:Math.sqrt(sum/samples.length),peak});}return results;
  });for(const sound of audio){expect(sound.rms).toBeGreaterThan(.001);expect(sound.peak).toBeLessThan(.3);}
});
