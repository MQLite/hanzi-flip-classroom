import {line,part} from './birthday-survey-language.js';

const pinyinKey='hanzi-flip.birthday-calendar.pinyin';

export function birthdayCalendarShowsPinyin() {
  try { return sessionStorage.getItem(pinyinKey)!=='off'; }
  catch { return true; }
}

export function setBirthdayCalendarPinyin(enabled) {
  try { sessionStorage.setItem(pinyinKey,enabled ? 'on' : 'off'); }
  catch { /* The switch still works on the current page. */ }
}

export const calendarCopy = {
  question:line('When is your birthday?',
    part('你的','Nǐ de'),part('生日','shēngrì'),part('是','shì'),part('几月几日？','jǐ yuè jǐ rì?')),
  intro:line('',part('依次','Yīcì'),part('说一说','shuō yi shuō'),part('生日，','shēngrì,'),part('再一起','zài yìqǐ'),
    part('看班级的','kàn bānjí de'),part('生日大日历。','shēngrì dà rìlì.')),
  answerer:line('Who will answer now?',part('现在','Xiànzài'),part('请谁','qǐng shéi'),part('回答？','huídá?')),
  missingClass:line('Add a class first.',part('先','Xiān'),part('添加','tiānjiā'),part('班级。','bānjí.')),
  missingStudents:line('Add students to start recording birthdays one at a time.',
    part('添加同学后，','Tiānjiā tóngxué hòu,'),part('就可以','jiù kěyǐ'),part('开始','kāishǐ'),
    part('逐个','zhú gè'),part('录入生日。','lùrù shēngrì.')),
  deleteTitle:line('Delete birthday?',part('删除','Shānchú'),part('生日？','shēngrì?')),
  footer:line('Class rosters and birthday dates are saved in this browser.',
    part('班级名单','Bānjí míngdān'),part('和','hé'),part('生日日期','shēngrì rìqī'),
    part('保存在','bǎocún zài'),part('当前浏览器里。','dāngqián liúlǎnqì lǐ.')),
};

const pageOnly=part('本次修改暂存在这个页面。','Běn cì xiūgǎi zàncún zài zhè ge yèmiàn.');
export const calendarNotice = {
  unreadable:line('',part('已有记录','Yǐ yǒu jìlù'),part('无法读取。','wúfǎ dúqǔ.'),pageOnly),
  unavailable:line('',part('浏览器储存','Liúlǎnqì chǔcún'),part('无法使用。','wúfǎ shǐyòng.'),pageOnly),
  unsaved:line('',part('浏览器未能保存。','Liúlǎnqì wèi néng bǎocún.'),pageOnly),
  invalidRecord:line('',part('记录未能保存，','Jìlù wèi néng bǎocún,'),part('请重试。','qǐng chóngshì.')),
  missingClass:line('',part('请重新选择班级。','Qǐng chóngxīn xuǎnzé bānjí.')),
  missingStudent:line('',part('请重新选择同学。','Qǐng chóngxīn xuǎnzé tóngxué.')),
  retry:line('',part('请重试。','Qǐng chóngshì.')),
};
