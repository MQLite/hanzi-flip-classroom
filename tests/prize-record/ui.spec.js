import {test, expect} from '@playwright/test';

const key = 'hanzi-flip.prize-record.v1';
async function addClass(page, name) {
  const details = page.locator('#prize-new-class');
  if (!await details.evaluate(element => element.open)) await details.locator('summary').click();
  await page.getByLabel('班级名称', {exact:true}).fill(name);
  await page.locator('#prize-class-form').getByRole('button', {name:'添加班级', exact:true}).click();
  await expect(page.getByLabel('集章班级')).toContainText(name);
}
async function addStudents(page, names) {
  const details = page.locator('#prize-new-students');
  if (!await details.evaluate(element => element.open)) await details.locator('summary').click();
  await page.getByLabel('学生姓名', {exact:true}).fill(names);
  await page.locator('#prize-student-form').getByRole('button', {name:'添加学生', exact:true}).click();
  await expect(page.getByLabel('学生姓名', {exact:true})).toHaveValue('');
}
const cardFor = (page, name) => page.getByRole('article', {name:name + '的集章记录', exact:true});

test('right-hand records persist classes, stamp reasons and gifts with a reversible exchange', async ({page}, testInfo) => {
  await page.setViewportSize({width:1440, height:900});
  await page.goto('/');
  const panel = page.getByRole('dialog', {name:'Prize Record', exact:true});
  await expect(panel).toBeVisible();
  const panelBox = await panel.boundingBox();
  const mapBox = await page.locator('#island-map').boundingBox();
  expect(panelBox.x).toBeGreaterThanOrEqual(mapBox.x + mapBox.width);
  await page.setViewportSize({width:1280, height:720});
  const narrowPanel = await panel.boundingBox();
  const narrowMap = await page.locator('#island-map').boundingBox();
  expect(narrowPanel.x).toBeGreaterThanOrEqual(narrowMap.x + narrowMap.width);
  await page.setViewportSize({width:1440, height:900});
  const bank = await page.evaluate(() => localStorage.getItem('hanzi-flip.question-bank'));
  await addClass(page, '周六 1pm');
  await addStudents(page, '小明\n安安');
  const card = cardFor(page, '小明');
  for (let index = 0; index < 11; index++) {
    await card.getByRole('button', {name:index % 2 ? '表现 +1' : '作业 +1', exact:true}).click();
    await expect(card.locator('.prize-balance')).toHaveText((index + 1) + ' 个章');
  }
  await expect(card.locator('.prize-stamp.is-filled')).toHaveCount(10);
  await page.screenshot({path:testInfo.outputPath('prize-record-desktop.png')});
  await card.getByRole('button', {name:'兑换 1 份礼物', exact:true}).click();
  await expect(card.locator('.prize-balance')).toHaveText('1 个章');
  await expect(card).toContainText('已兑换 1 份礼物');
  await card.locator('summary').click();
  await expect(card.locator('.prize-history')).toContainText('完成作业');
  await expect(card.locator('.prize-history')).toContainText('课堂表现');
  await card.getByRole('button', {name:'撤回上次兑换', exact:true}).click();
  await expect(card.locator('.prize-balance')).toHaveText('11 个章');
  await card.getByRole('button', {name:'撤回上次盖章', exact:true}).click();
  await expect(card.locator('.prize-balance')).toHaveText('10 个章');
  await card.getByRole('button', {name:'兑换 1 份礼物', exact:true}).click();
  await expect(card.locator('.prize-balance')).toHaveText('0 个章');
  await page.reload();
  await expect(card.locator('.prize-balance')).toHaveText('0 个章');
  await expect(card).toContainText('已兑换 1 份礼物');
  await expect(cardFor(page, '安安').locator('.prize-balance')).toHaveText('0 个章');
  await addClass(page, '周日班');
  await addStudents(page, 'Jack');
  await expect(card).toHaveCount(0);
  const firstClass = await page.getByLabel('集章班级').locator('option').filter({hasText:'周六 1pm'}).getAttribute('value');
  await page.getByLabel('集章班级').selectOption(firstClass);
  await expect(card).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('hanzi-flip.question-bank'))).toBe(bank);
});

test('a phone can open records during a game, type names and return to the same game', async ({page}, testInfo) => {
  await page.setViewportSize({width:390, height:844});
  await page.goto('/?mode=flip');
  await page.getByRole('button', {name:'Prize Record', exact:true}).click();
  const panel = page.getByRole('dialog', {name:'Prize Record', exact:true});
  await addClass(page, '小班');
  await addStudents(page, '艾米、Ben');
  await cardFor(page, 'Ben').getByRole('button', {name:'表现 +1', exact:true}).click();
  await expect(cardFor(page, 'Ben').locator('.prize-balance')).toHaveText('1 个章');
  await page.screenshot({path:testInfo.outputPath('prize-record-phone.png')});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', {name:'收起集章表', exact:true}).click();
  await expect(panel).not.toBeVisible();
  await expect(page.locator('#reveal')).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(panel).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(panel).not.toBeVisible();
});

test('two classroom tabs serialize stamps without losing a balance', async ({page, context}) => {
  await page.goto('/');
  await addClass(page, '共用班');
  await addStudents(page, '小明');
  const second = await context.newPage();
  await second.goto('/');
  async function award(tab, name) {
    const student = cardFor(tab, '小明');
    for (let index = 0; index < 5; index++) {
      await student.getByRole('button', {name, exact:true}).click();
      await expect.poll(() => tab.evaluate(({key,kind}) => {
        const history = JSON.parse(localStorage.getItem(key)).classes[0].students[0].history;
        return history.filter(event => event.kind === kind).length;
      }, {key,kind:name === '作业 +1' ? 'homework' : 'participation'})).toBe(index + 1);
    }
  }
  await Promise.all([award(page, '作业 +1'), award(second, '表现 +1')]);
  await expect(cardFor(page, '小明').locator('.prize-balance')).toHaveText('10 个章');
  await expect(cardFor(second, '小明').locator('.prize-balance')).toHaveText('10 个章');
});

test('unavailable storage allows temporary records and explains that they are only in this page', async ({page}) => {
  await page.addInitScript(() => {
    const native = Storage.prototype.setItem;
    Storage.prototype.setItem = function(name, value) {
      if (name === 'hanzi-flip.prize-record.v1') throw new Error('quota');
      return native.call(this, name, value);
    };
  });
  await page.goto('/');
  await addClass(page, '临时班');
  await addStudents(page, '小明');
  await cardFor(page, '小明').getByRole('button', {name:'作业 +1', exact:true}).click();
  await expect(cardFor(page, '小明').locator('.prize-balance')).toHaveText('1 个章');
  await expect(page.locator('#prize-warning')).toContainText('暂存在本页');
});

test('a seventeen-student class is searchable and names can be edited without losing stamps', async ({page}) => {
  await page.goto('/');
  await addClass(page, '周六大班');
  await addStudents(page, Array.from({length:17}, (_,index) => '同学' + (index + 1)).join('\n'));
  await expect(page.locator('.prize-student')).toHaveCount(17);
  await page.getByRole('searchbox', {name:'查找学生'}).fill('同学17');
  const student = cardFor(page, '同学17');
  await expect(page.locator('.prize-student')).toHaveCount(1);
  await student.getByRole('button', {name:'作业 +1', exact:true}).click();
  await student.locator('summary').click();
  page.once('dialog', dialog => dialog.accept('同学十七'));
  await student.getByRole('button', {name:'修改姓名', exact:true}).click();
  await page.getByRole('searchbox', {name:'查找学生'}).fill('');
  const renamed = cardFor(page, '同学十七');
  await expect(renamed.locator('.prize-balance')).toHaveText('1 个章');
  await renamed.locator('summary').click();
  page.once('dialog', dialog => dialog.dismiss());
  await renamed.getByRole('button', {name:'删除学生', exact:true}).click();
  await expect(renamed).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await renamed.getByRole('button', {name:'删除学生', exact:true}).click();
  await expect(page.locator('.prize-student')).toHaveCount(16);
});
