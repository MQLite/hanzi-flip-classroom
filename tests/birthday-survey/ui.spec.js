import {test, expect} from '@playwright/test';

const key = 'hanzi-flip.prize-record.v1';
const datesKey = 'hanzi-flip.birthday-survey.v1';
const roster = Array.from({length:16},(_,i)=>({
  id:'french-'+(i+1), name:['小明','小华','小美','安安','乐乐','豆豆','朵朵','宁宁','俊俊','果果','小雨','小晴','佳佳','明明','芳芳','可可'][i], history:[],
}));
const original = JSON.stringify({version:1,selectedClassId:'other',classes:[
  {id:'other',name:'另一个班',students:[{id:'private-other',name:'别班学生',history:[]}]},
  {id:'fr',name:'École Française',students:roster},
]});
const token = (page,part,value) => page.locator(`[data-date-token="${part}"][data-value="${value}"]`);

test('the lesson entry card shows language options and carries them into the survey',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/?mode=explore&source=paradise&stage=2A&lesson=4');
  const card=page.locator('.birthday-survey-card');
  const pinyin=card.getByRole('checkbox',{name:'拼音',exact:true});
  const english=card.getByRole('checkbox',{name:'英语',exact:true});
  const heading=card.getByRole('heading');
  await expect(heading.locator('rt').first()).toBeHidden();
  await expect(heading.locator('[lang=en]')).toBeHidden();
  await pinyin.check();
  await expect(heading.locator('rt').first()).toBeVisible();
  await english.check();
  await expect(heading.locator('[lang=en]')).toHaveText('When is your birthday?');
  await expect(heading.locator('[lang=en]')).toBeVisible();
  await pinyin.uncheck();
  await expect(heading.locator('rt').first()).toBeHidden();
  await pinyin.check();
  await page.getByRole('link',{name:'开始生日调查'}).click();
  await expect(page.locator('#survey-pinyin')).toBeChecked();
  await expect(page.locator('#survey-english')).toBeChecked();
  await expect(page.locator('h1 [lang=en]')).toBeVisible();
});

test('lesson 4 opens the survey, imports the right 16 students and charts the dates entered by drag or click',async({page},testInfo)=>{
  await page.addInitScript(({key,original})=>localStorage.setItem(key,original),{key,original});
  await page.goto('/?mode=explore&source=paradise&stage=2A&lesson=4');
  await page.getByRole('link',{name:'开始生日调查'}).click();
  await expect(page.getByRole('heading',{name:'你的生日是几月几号？',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:/两人问答|全班调查/})).toHaveCount(0);
  await expect(page.getByRole('heading',{name:'生日是几月的人最多？'})).toBeVisible();
  await expect(page.locator('.survey-month-column')).toHaveCount(12);
  await expect(page.locator('#survey-class')).toHaveValue('fr');
  await page.getByLabel('奖励记录班级').selectOption('other');
  await expect(page.locator('#survey-roster button')).toHaveCount(1);
  await page.getByLabel('奖励记录班级').selectOption('fr');
  await expect(page.locator('#survey-roster button')).toHaveCount(16);
  await expect(page.locator('#survey-student')).toHaveText(roster[0].name);
  await token(page,'month',2).dragTo(page.locator('[data-drop=month]'));
  await token(page,'day',29).dragTo(page.locator('[data-drop=day]'));
  await expect(page.locator('#survey-month-value')).toHaveText('二月',{useInnerText:true});
  await expect(page.locator('#survey-day-value')).toHaveText('二十九号',{useInnerText:true});
  await expect(token(page,'day',30)).toBeDisabled();
  await page.getByRole('button',{name:'记录生日',exact:true}).click();
  await expect(page.locator('#survey-student')).toHaveText(roster[1].name);
  await expect(page.locator('.survey-cylinder')).toHaveCount(1);
  await token(page,'month',5).click();
  await token(page,'day',8).click();
  await page.getByRole('button',{name:'记录生日',exact:true}).click();
  await expect(page.locator('#survey-progress')).toHaveText('已记录两人，共十六人',{useInnerText:true});

  await page.reload();
  await expect(page.locator('#survey-progress')).toHaveText('已记录两人，共十六人',{useInnerText:true});
  await expect(page.locator('.survey-month-column')).toHaveCount(12);
  await expect(page.locator('.survey-cylinder')).toHaveCount(2);
  await expect(page.locator('.survey-cylinder').first()).toContainText('二十九号',{useInnerText:true});
  await page.getByRole('button',{name:'揭晓答案'}).click();
  await expect(page.locator('#survey-answer')).toContainText('二月、五月并列最多，各有一人。',{useInnerText:true});
  await expect(page.locator('.survey-leader')).toHaveCount(2);
  const english=page.getByRole('checkbox',{name:'英语',exact:true});
  await english.check();
  await expect(page.locator('#survey-answer [lang=en]')).toHaveText('February and May tie for first with one student each.');
  await english.uncheck();
  await page.locator('#survey-roster button').filter({hasText:roster[0].name}).click();
  await token(page,'month',5).click();
  await token(page,'day',9).click();
  await page.getByRole('button',{name:'记录生日',exact:true}).click();
  await expect(page.locator('#survey-answer')).toBeHidden();
  await page.getByRole('button',{name:'揭晓答案'}).click();
  await expect(page.locator('#survey-answer')).toContainText('五月生日的人最多，有两人。',{useInnerText:true});
  await expect(page.locator('.survey-leader .survey-cylinder')).toHaveCount(2);
  expect(await page.evaluate(key=>localStorage.getItem(key),key)).toBe(original);
  const saved = await page.evaluate(key=>sessionStorage.getItem(key),datesKey);
  expect(saved).not.toContain(roster[0].name);
  await page.screenshot({path:testInfo.outputPath('birthday-chart.png')});
});

test('a fresh browser can enter a temporary class and record by taps without page overflow',async({page},testInfo)=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/birthday-survey.html');
  await expect(page.locator('#survey-roster-note')).toContainText('没有找到 Ecole Francaise',{useInnerText:true});
  await page.locator('#survey-manual summary').click();
  await page.getByLabel('每行一个姓名').fill('学生甲\n学生乙');
  await page.getByRole('button',{name:'使用这份名单'}).click();
  await token(page,'month',4).click();
  await expect(token(page,'day',31)).toBeDisabled();
  await token(page,'day',30).click();
  await page.getByRole('button',{name:'记录生日',exact:true}).click();
  await expect(page.locator('.survey-cylinder')).toContainText('三十号',{useInnerText:true});
  const pinyin=page.getByRole('checkbox',{name:'拼音',exact:true});
  const english=page.getByRole('checkbox',{name:'英语',exact:true});
  await expect(pinyin).not.toBeChecked();
  await expect(english).not.toBeChecked();
  await expect(token(page,'day',30).locator('rt')).toBeHidden();
  await pinyin.check();
  await expect(token(page,'day',30).locator('rt')).toHaveText('sān shí hào');
  await expect(token(page,'day',30).locator('rt')).toBeVisible();
  await expect(token(page,'day',30).locator('[lang=en]')).toBeHidden();
  await english.check();
  await expect(token(page,'day',30).locator('[lang=en]')).toHaveText('thirtieth');
  await expect(page.locator('.survey-cylinder [lang=en]')).toBeVisible();
  await pinyin.uncheck();
  await expect(token(page,'day',30).locator('rt')).toBeHidden();
  await expect(token(page,'day',30).locator('[lang=en]')).toBeVisible();
  expect(await page.locator('main').innerText()).not.toMatch(/[0-9]/);
  await page.reload();
  await expect(english).toBeChecked();
  await expect(pinyin).not.toBeChecked();
  const scroll = page.locator('.survey-chart-scroll');
  expect(await scroll.evaluate(el=>el.scrollWidth>el.clientWidth)).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({path:testInfo.outputPath('birthday-phone.png')});
});

test('saved birthdays and statistics survive closing the tab and stay separate by class',async({page,context})=>{
  await page.goto('/birthday-survey.html');
  await page.evaluate(({key,original,datesKey})=>{
    localStorage.setItem(key,original);
    // Earlier versions stored birthdays only in the tab, including for inactive classes.
    sessionStorage.setItem(datesKey,JSON.stringify({groupId:'fr',dates:[
      ['french-1',{month:2,day:29}],['private-other',{month:12,day:18}],
    ]}));
  },{key,original,datesKey});
  await page.reload();
  await expect(page.locator('.survey-cylinder')).toContainText('二十九号',{useInnerText:true});
  await token(page,'month',2).click();
  await token(page,'day',20).click();
  await page.getByRole('button',{name:'记录生日',exact:true}).click();
  await page.close();

  const reopened=await context.newPage();
  await reopened.goto('/birthday-survey.html');
  const classPicker=reopened.getByLabel('奖励记录班级');
  const cylinders=reopened.locator('.survey-cylinder');
  await classPicker.selectOption('other');
  await expect(cylinders).toHaveCount(1);
  await expect(cylinders).toContainText('十八号',{useInnerText:true});
  await classPicker.selectOption('fr');
  await expect(cylinders).toHaveCount(2);
  await expect(cylinders.nth(0)).toContainText('二十九号',{useInnerText:true});
  await expect(cylinders.nth(1)).toContainText('二十号',{useInnerText:true});
  await reopened.getByRole('button',{name:'揭晓答案'}).click();
  await expect(reopened.locator('#survey-answer')).toContainText('二月生日的人最多，有两人。',{useInnerText:true});

  await reopened.locator('[data-student="french-1"]').click();
  await reopened.locator('#survey-remove').click();
  await reopened.close();
  const afterClearing=await context.newPage();
  await afterClearing.goto('/birthday-survey.html');
  await expect(afterClearing.locator('.survey-cylinder')).toHaveCount(1);
  await expect(afterClearing.locator('.survey-cylinder')).toContainText('二十号',{useInnerText:true});
  await afterClearing.getByLabel('奖励记录班级').selectOption('other');
  await expect(afterClearing.locator('.survey-cylinder')).toContainText('十八号',{useInnerText:true});
  expect(await afterClearing.evaluate(key=>localStorage.getItem(key),key)).toBe(original);
});

test('migration sends only rosters and birthday dates to the configured teacher page',async({page,context})=>{
  const teacher='https://hanzi-birthday-teacher.carl0123.chatgpt.site/';
  await page.addInitScript(({key,original})=>{
    const sample=JSON.parse(original);
    sample.classes[1].students[0].history=[{id:'private-stamp',kind:'homework',at:'2026-01-01T00:00:00.000Z'}];
    localStorage.setItem(key,JSON.stringify(sample));
  },{key,original});
  await page.goto('/birthday-survey.html');
  await token(page,'month',2).click();
  await token(page,'day',14).click();
  await page.locator('#survey-save').click();
  const origin=new URL(page.url()).origin;
  await context.route(teacher+'?from=hanzi',route=>route.fulfill({contentType:'text/html',body:`<script>
    const sourceOrigin=${JSON.stringify(origin)};
    addEventListener('message',event=>{
      if (event.origin!==sourceOrigin || event.data?.nonce!=='test-transfer') return;
      window.received=event.data.data;
      opener.postMessage({type:'hanzi-birthday-imported'},sourceOrigin);
    });
    opener.postMessage({type:'hanzi-birthday-ready',nonce:'test-transfer'},sourceOrigin);
  </script>`}));
  const popupReady=page.waitForEvent('popup');
  await page.locator('#survey-migrate').click();
  const popup=await popupReady;
  await expect.poll(()=>popup.evaluate(()=>window.received?.classes?.length)).toBe(2);
  const received=await popup.evaluate(()=>window.received);
  expect(received.classes[1].students[0]).toEqual({id:'french-1',name:roster[0].name,birthday:{month:2,day:14}});
  expect(JSON.stringify(received)).not.toContain('private-stamp');
  await expect(page.locator('#survey-migration-status')).toHaveText('记录已迁移到教师页。',{useInnerText:true});
});
