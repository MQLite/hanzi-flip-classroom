import {test,expect} from '@playwright/test';

test('first-book lesson three offers the room and the return link restores the selection',async({page})=>{
  await page.goto('/?mode=explore&source=zhongwen&stage=1&lesson=3');
  await expect(page.getByLabel('选择册数',{exact:true})).toHaveValue('1');
  await expect(page.getByLabel('选择课次',{exact:true})).toHaveValue('3');
  await expect(page.locator('#exploration-catalog')).toContainText('密室逃脱');
  await page.getByRole('link',{name:'进入情景',exact:true}).click();
  await expect(page.getByRole('heading',{name:'密室逃脱',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'返回情景探索',exact:true}).click();
  await expect(page.getByLabel('选择课次',{exact:true})).toHaveValue('3');
  await page.getByLabel('选择课次',{exact:true}).selectOption('2');
  await expect(page.getByRole('link',{name:'进入情景',exact:true})).toHaveCount(0);
});

test('a scenario-only book does not become the active practice book',async({page})=>{
  await page.goto('/?mode=explore&source=zhongwen&stage=5&lesson=9');
  await expect(page.getByLabel('选择册数',{exact:true})).toHaveValue('5');
  await expect(page.locator('#exploration-catalog')).toContainText('旧屋里的两封信');
  await page.locator('#mode-flip').click();
  await expect(page.locator('#stage')).not.toHaveValue('5');
});

test('the locked room takes twelve clues, allows retries, and exits after collecting the key',async({page},testInfo)=>{
  test.setTimeout(75000);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.addInitScript(()=>{
    window.roomChime=[];
    window.AudioContext=class extends window.AudioContext {
      constructor(){super();window.roomAudio=this;}
      createOscillator(){
        window.roomNotes=(window.roomNotes??0)+1;
        const note=super.createOscillator();
        const start=note.start.bind(note);
        note.start=time=>{
          if(!document.querySelector('#room-fireworks').hasAttribute('hidden'))window.roomChime.push(time);
          start(time);
        };
        return note;
      }
    };
  });
  await page.goto('/room.html');
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await expect(page.locator('#room-fireworks')).toBeHidden();
  await page.getByRole('button',{name:'试开出口',exact:true}).click();
  await expect(page.locator('#room-feedback')).toContainText('门锁着');
  expect(await page.evaluate(()=>window.roomAudio)).toBeUndefined();
  await page.getByRole('button',{name:'开始探索',exact:true}).click();
  const music=page.getByRole('button',{name:'背景音乐',exact:true});
  const audioState=()=>page.evaluate(()=>window.roomAudio?.state);
  await expect.poll(audioState).toBe('running');
  await expect.poll(()=>page.evaluate(()=>window.roomNotes??0)).toBeGreaterThan(0);
  await music.click();
  await expect(music).toHaveAttribute('aria-pressed','false');
  await expect.poll(audioState).toBe('suspended');
  await music.click();
  await expect(music).toHaveAttribute('aria-pressed','true');
  await expect.poll(audioState).toBe('running');
  await expect(page.locator('#room-glyph')).toHaveText('上');
  await expect(page.locator('#room-pinyin')).toBeHidden();
  await page.locator('[data-choice="1"]').click();
  await expect(page.locator('#room-feedback')).toContainText('再想一想');
  await page.getByRole('button',{name:'看拼音',exact:true}).click();
  await expect(page.locator('#room-pinyin')).toHaveText('shàng');
  const steps=[...'上左右下中坐立来去走入出'];
  const choices=[0,1,0,1,1,1,0,1,0,0,0,1];
  for(let i=0;i<steps.length;i++){
    await expect(page.locator('#room-glyph')).toHaveText(steps[i]);
    if(i===1){
      await expect(page.getByRole('button',{name:'向左转，看墙上的画',exact:true})).toBeVisible();
      await page.getByRole('button',{name:'向右转，到小桌边拿托盘',exact:true}).click();
      await expect(page.locator('#room-brush-icon')).toBeHidden();
      await expect(page.locator('#room-feedback')).toContainText('再想一想');
    }
    if(i===7)await page.screenshot({path:testInfo.outputPath('cat-come.png')});
    if(i===1||i===4)await page.screenshot({path:testInfo.outputPath(i===1?'find-tools.png':'rug-center.png')});
    if(i===4){
      await expect(page.locator('[data-choice]')).toHaveCount(3);
      await page.keyboard.press('3');
      await expect(page.locator('#room-feedback')).toContainText('再想一想');
    }
    if(i===9){
      await expect(page.locator('#room-card-icon')).toBeVisible();
      await page.screenshot({path:testInfo.outputPath('paw-trail.png')});
    }
    if(i===10){
      await page.getByRole('button',{name:'留在门外的木地板上',exact:true}).click();
      await expect(page.locator('#room-card-slot')).toBeHidden();
      await expect(page.locator('#room-feedback')).toContainText('再想一想');
      await expect(page.getByRole('button',{name:'跨过门槛，进入小房间',exact:true})).toBeVisible();
      await page.screenshot({path:testInfo.outputPath('entry.png')});
    }
    await page.locator(`[data-choice="${choices[i]}"]`).click();
    if(i===10){
      const cardSlot=page.getByRole('button',{name:'把猫爪卡放进木箱卡槽',exact:true});
      await expect(cardSlot).toBeVisible();
      await expect(page.getByRole('button',{name:'捡起木箱上的钥匙',exact:true})).toBeHidden();
      await expect(page.locator('#room-card-icon')).toBeVisible();
      await page.screenshot({path:testInfo.outputPath('card-slot.png')});
      await cardSlot.click();
      await expect(page.locator('#room-inventory')).toContainText('钥匙已找到');
      await expect(cardSlot).toBeHidden();
      await expect(page.locator('#room-card-icon')).toBeHidden();
      await page.getByRole('button',{name:'试开出口',exact:true}).click();
      await expect(page.locator('#room-feedback')).toContainText('先拿起钥匙');
      await page.screenshot({path:testInfo.outputPath('key-box.png')});
      await page.getByRole('button',{name:'捡起木箱上的钥匙',exact:true}).click();
      await expect(page.locator('#room-inventory')).toContainText('钥匙已拿到');
      await expect(page.locator('#room-fireworks')).toBeHidden();
    }else if(i<11){
      if(i===1){
        await expect(page.getByRole('button',{name:'下一条线索',exact:true})).toBeEnabled();
        await expect(page.locator('#room-brush-icon')).toBeVisible();
        await expect(page.locator('#room-feedback')).toContainText('画框打开了');
        await page.screenshot({path:testInfo.outputPath('left-painting.png')});
      }
      if(i===2){
        await expect(page.getByRole('button',{name:'下一条线索',exact:true})).toBeEnabled();
        await expect(page.locator('#room-tray-icon')).toBeVisible();
        await page.screenshot({path:testInfo.outputPath('right-tray.png')});
      }
      if(i===5){
        await expect(page.getByRole('button',{name:'下一条线索',exact:true})).toBeVisible();
        await page.screenshot({path:testInfo.outputPath('seated.png')});
      }
      if(i===6){
        await expect(page.getByRole('button',{name:'下一条线索',exact:true})).toBeVisible();
        await expect(page.locator('#room-feedback')).toContainText('露出猫爪印');
        await expect(page.locator('#room-card-icon')).toBeVisible();
        await page.screenshot({path:testInfo.outputPath('paw-clue.png')});
      }
      await page.getByRole('button',{name:'下一条线索',exact:true}).click();
    }
  }
  await expect(page.getByRole('heading',{name:'逃脱成功！',exact:true})).toBeVisible();
  await expect(page.locator('#room-door-status')).toHaveText('出口已打开');
  await expect(page.locator('#room-fireworks')).toBeVisible();
  const chimeTimes=await page.evaluate(()=>window.roomChime);
  expect(chimeTimes).toHaveLength(4);
  expect(chimeTimes[1]-chimeTimes[0]).toBeCloseTo(.25,4);
  expect(chimeTimes[2]-chimeTimes[0]).toBeCloseTo(.54,4);
  await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.room-burst')).opacity)>.7);
  await page.screenshot({path:testInfo.outputPath('escaped.png')});
  await expect.poll(audioState).toBe('suspended');
  await page.getByRole('button',{name:'再玩一次',exact:true}).click();
  await expect(page.locator('#room-door-status')).toHaveText('出口已锁');
  await expect(page.locator('#room-fireworks')).toBeHidden();
  expect(errors).toEqual([]);
});

test('the mobile lesson remains playable when WebGL is unavailable',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.addInitScript(()=>{
    const context=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(type,...options){
      return type.startsWith('webgl')?null:context.call(this,type,...options);
    };
  });
  await page.goto('/room.html');
  await expect(page.locator('#room-view-label')).toHaveText('平面图');
  await page.getByRole('button',{name:'开始探索',exact:true}).click();
  await page.locator('[data-choice="0"]').click();
  await expect(page.getByRole('button',{name:'下一条线索',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
