import {expect,test} from '@playwright/test';

test('lesson four lets the teacher enter birthdays in order and view a persistent calendar for each class',async({page},testInfo)=>{
  await page.goto('/?mode=explore&source=zhongwen&stage=1&lesson=4');
  await expect(page.locator('.exploration-card h3 rt').filter({hasText:'jǐ yuè jǐ rì?'})).toBeVisible();
  await page.getByRole('link',{name:'开始生日调查'}).click();
  await expect(page.getByRole('heading',{name:'你的生日是几月几日？'})).toBeVisible();
  const pinyin=page.getByRole('checkbox',{name:'拼音',exact:true});
  await expect(pinyin).toBeChecked();
  await expect(page.locator('#calendar-title rt').filter({hasText:'jǐ yuè jǐ rì?'})).toBeVisible();
  await expect(page.locator('#calendar-record-empty rt').first()).toBeVisible();
  await expect(page.locator('footer rt').first()).toBeVisible();

  const classes=page.getByRole('combobox',{name:'班级',exact:true});
  const records=page.getByRole('button',{name:'录入生日'});
  const view=page.getByRole('button',{name:'看大日历'});
  const classmates=page.getByLabel('现在请谁回答？');
  const month=page.getByRole('combobox',{name:'月份',exact:true});
  const day=page.getByRole('combobox',{name:'日期',exact:true});

  async function addClass(name,names){
    await records.click();
    const settings=page.locator('#calendar-add-class');
    if (!await settings.locator('form').isVisible()) {
      await settings.locator('summary').click();
    }
    await page.getByLabel('班级名称').fill(name);
    await page.getByRole('button',{name:'保存班级'}).click();
    await expect(classes.locator('option:checked')).toHaveText(name);
    await page.getByLabel('每行一个姓名').fill(names);
    await page.getByRole('button',{name:'添加到本班'}).click();
  }

  async function recordBirthday(m,d){
    await month.selectOption(String(m));
    await day.selectOption(String(d));
    await page.getByRole('button',{name:'记录生日',exact:true}).click();
  }

  await addClass('周六一班','小安\n小乐\n小雨');
  await expect(classmates.locator('option:checked')).toHaveText('小安');
  await expect(page.locator('label[for="calendar-student"] rt').first()).toBeVisible();
  await expect(page.locator('#calendar-answer-line rt').first()).toBeVisible();
  await recordBirthday(2,29);
  await expect(page.locator('#calendar-entry-status rt').filter({hasText:'yǐ jìlù'})).toBeVisible();
  await expect(classmates.locator('option:checked')).toHaveText('小乐');
  await page.getByRole('button',{name:'下一位'}).click();
  await expect(classmates.locator('option:checked')).toHaveText('小雨');
  await recordBirthday(2,29);
  await expect(classmates.locator('option:checked')).toHaveText('小乐');
  await month.selectOption('4');
  await expect(day.locator('option[value="31"]')).toHaveCount(0);
  await recordBirthday(4,30);
  await pinyin.uncheck();
  await expect(page.locator('#calendar-answer-line rt').first()).toBeHidden();
  await expect(page.locator('#calendar-recorded-count')).toHaveText(/已记录\s*三\s*人，共\s*三\s*人/,{useInnerText:true});

  await view.click();
  await expect(page.locator('.calendar-month-card')).toHaveCount(12);
  await expect(page.getByRole('button',{name:'查看十二月日历'})).toBeInViewport();
  await expect(page.locator('[data-month="2"] .calendar-birthday')).toContainText('二十九日');
  await expect(page.locator('[data-month="2"] .calendar-person')).toHaveText('小安、小雨');
  await expect(page.locator('[data-month="4"] .calendar-person')).toHaveText('小乐');
  await page.screenshot({path:testInfo.outputPath('class-birthday-year.png')});
  await page.getByRole('button',{name:'查看二月日历'}).click();
  await expect(page.locator('.calendar-day-cell')).toHaveCount(29);
  await expect(page.locator('[data-day="29"] .calendar-person')).toHaveText(['小安','小雨']);
  await page.screenshot({path:testInfo.outputPath('class-birthday-month.png'),fullPage:true});

  await addClass('周日二班','Amy');
  await expect(classmates.locator('option:checked')).toHaveText('Amy');
  await recordBirthday(8,5);
  await view.click();
  await expect(page.locator('.calendar-person')).toHaveText(['Amy']);
  await classes.selectOption({label:'周六一班'});
  await expect(page.locator('[data-month="2"] .calendar-person')).toHaveText('小安、小雨');
  await page.reload();
  await expect(pinyin).not.toBeChecked();
  await expect(classes.locator('option:checked')).toHaveText('周六一班');
  await view.click();
  await expect(page.locator('[data-month="4"] .calendar-person')).toHaveText('小乐');
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button',{name:'查看二月日历'}).click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('deletion can be cancelled or confirmed without removing the student',async({page},testInfo)=>{
  await page.addInitScript(()=>{
    const key='hanzi-flip.birthday-calendar.v1';
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key,JSON.stringify({version:1,selectedClassId:'test-class',classes:[{
      id:'test-class',name:'测试班',students:[
        {id:'student-a',name:'小安',birthday:{month:2,day:29}},
        {id:'student-b',name:'小雨',birthday:{month:2,day:29}},
      ],
    }]}));
  });
  await page.goto('/birthday-calendar.html');
  const student=page.getByRole('combobox',{name:'现在请谁回答？'});
  const remove=page.getByRole('button',{name:'删除生日',exact:true});
  const dialog=page.getByRole('dialog',{name:'删除生日？'});
  const month=page.getByRole('combobox',{name:'月份',exact:true});
  await remove.click();
  await expect(dialog.locator('#calendar-delete-message')).toContainText('小安');
  await expect(dialog.locator('rt').filter({hasText:'shēngrì ma?'})).toBeVisible();
  await page.screenshot({path:testInfo.outputPath('birthday-delete.png')});
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(month).toHaveValue('2');
  await remove.click();
  await dialog.getByRole('button',{name:'确认删除'}).click();
  await expect(student).toHaveValue('student-a');
  await expect(month).toHaveValue('');
  await expect(remove).toBeHidden();
  await expect(page.locator('#calendar-entry-status rt').filter({hasText:'yǐ shānchú'})).toBeVisible();

  await page.reload();
  await expect(student).toHaveValue('student-a');
  await expect(month).toHaveValue('');
  await page.getByRole('button',{name:'看大日历'}).click();
  await expect(page.locator('[data-month="2"] .calendar-person')).toHaveText('小雨');
});
