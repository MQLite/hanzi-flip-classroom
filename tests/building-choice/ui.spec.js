import {test,expect} from '@playwright/test';
test('all built words are offered, read safe cards disappear and a chosen danger collapses immediately',async({page})=>{
  await page.addInitScript(()=>Math.random=()=>.5);await page.goto('/?mode=building');
  const ids=await page.locator('[data-builder-choice][aria-pressed="true"]').evaluateAll(nodes=>nodes.map(n=>n.dataset.builderChoice));for(const id of ids.slice(3))await page.locator(`[data-builder-choice="${id}"]`).click();await page.locator('#builder-start').click();
  for(let i=0;i<3;i++){await page.locator('#builder-draw').click();await page.locator('#builder-confirm').click();}
  await expect(page.locator('[data-builder-card]')).toHaveCount(3);const first=await page.locator('[data-builder-card]').first().getAttribute('data-builder-card');await page.locator(`[data-builder-card="${first}"]`).click();
  await expect(page.locator(`[data-builder-card="${first}"]`)).toHaveCount(0);await expect(page.locator('[data-builder-card]')).toHaveCount(2);await expect(page.locator('#hanzi-building')).toHaveAttribute('data-phase','challenge');
  for(let i=0;i<2;i++){await page.locator('[data-builder-card]').first().click();if(await page.locator('#hanzi-building').getAttribute('data-phase')==='collapsed')break;}
  await expect(page.locator('#hanzi-building')).toHaveAttribute('data-phase','collapsed');await expect(page.locator('#builder-rescue-sentence')).toBeVisible();await expect(page.locator('#builder-next-activity')).toHaveCount(0);await page.locator('#builder-restore').click();await expect(page.locator('#builder-next-activity')).toBeVisible();
});
