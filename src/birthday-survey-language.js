import {ruby} from './ruby.js';

const surveyTabKey = 'hanzi-flip.birthday-survey.v1';

export function readSurveyTab() {
  try { return JSON.parse(sessionStorage.getItem(surveyTabKey)) ?? {}; }
  catch { return {}; }
}

export function writeSurveyTab(data) {
  try { sessionStorage.setItem(surveyTabKey,JSON.stringify(data)); }
  catch { /* The current page still works when browser storage is off. */ }
}

const digits = '零一二三四五六七八九';
const positions = ['', '十', '百', '千'];
const readings = {零:'líng',一:'yī',二:'èr',三:'sān',四:'sì',五:'wǔ',六:'liù',七:'qī',八:'bā',九:'jiǔ',
  十:'shí',百:'bǎi',千:'qiān',万:'wàn',亿:'yì',两:'liǎng'};
const englishDigits = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven',
  'twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const englishTens = ['', '', 'twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const ordinal = {1:'first',2:'second',3:'third',4:'fourth',5:'fifth',6:'sixth',7:'seventh',8:'eighth',9:'ninth',12:'twelfth'};

export function chineseNumber(value, {people=false}={}) {
  if (value===2 && people) return '两';
  if (value<10) return digits[value];
  for (const [unit,name] of [[1e8,'亿'],[1e4,'万']]) {
    if (value<unit) continue;
    const remainder=value%unit;
    const tail=remainder ? (remainder<unit/10?'零':'')+(remainder>=10&&remainder<20?'一':'')+chineseNumber(remainder) : '';
    return chineseNumber(Math.floor(value/unit))+name+tail;
  }
  let result='', gap=false;
  for (let place=3;place>=0;place--) {
    const digit=Math.floor(value / 10**place)%10;
    if (!digit) { if (result) gap=true; continue; }
    if (gap) result+='零';
    if (digit!==1 || place!==1 || result) result+=digits[digit];
    result+=positions[place];
    gap=false;
  }
  return result;
}

export function englishNumber(value) {
  if (value<20) return englishDigits[value];
  if (value<100) return englishTens[Math.floor(value/10)]+(value%10?'-'+englishDigits[value%10]:'');
  for (const [unit,label] of [[1e9,'billion'],[1e6,'million'],[1e3,'thousand'],[100,'hundred']]) {
    if (value>=unit) {
      const remainder=value%unit;
      return englishNumber(Math.floor(value/unit))+' '+label+(remainder?' '+englishNumber(remainder):'');
    }
  }
}

function englishOrdinal(value) {
  if (ordinal[value]) return ordinal[value];
  if (value===20) return 'twentieth';
  if (value===30) return 'thirtieth';
  if (value>20) return englishTens[Math.floor(value/10)]+'-'+ordinal[value%10];
  return englishNumber(value)+'th';
}

export const part = (text,pinyin) => [text,pinyin];
export const line = (english,...parts) => ({english,parts});
const numeralReading = chinese => Array.from(chinese,character=>readings[character]).join(' ');

export function numberPart(value,options) {
  const chinese=chineseNumber(value,options);
  return part(chinese,numeralReading(chinese));
}

export function datePart(value,kind) {
  if (!value) return part('—');
  const [chinese,pinyin]=numberPart(value);
  return kind==='month' ? part(chinese+'月',pinyin+' yuè') : part(chinese+'号',pinyin+' hào');
}
export function dateEnglish(value,kind) {
  if (!value) return '';
  return kind==='month' ? monthNames[value-1] : englishOrdinal(value);
}
export function classCount(value) {
  return englishNumber(value)+(value===1?' student':' students');
}
export function progressCopy(recorded,total) {
  return line('Recorded '+englishNumber(recorded)+' of '+classCount(total),
    part('已记录','yǐ jìlù'),numberPart(recorded,{people:true}),part('人，共','rén, gòng'),numberPart(total,{people:true}),part('人','rén'));
}
export function renderCopy(node,{english,parts}) {
  node.replaceChildren(...parts.map(([chinese,pinyin])=>ruby(chinese,pinyin)));
  if (english) {
    const translation=document.createElement('small');
    translation.className='survey-gloss';
    translation.lang='en';
    translation.textContent=english;
    node.append(translation);
  }
  return node;
}

const fixed = {
  back: line('Back to activities',part('← '),part('返回','fǎnhuí'),part('情景探索','qíngjǐng tànsuǒ')),
  map: line('Back to island map',part('← '),part('返回','fǎnhuí'),part('小岛地图','xiǎodǎo dìtú')),
  lesson: line('Chinese Paradise · Book Two, Part A · Lesson Four',part('汉语乐园','Hànyǔ Lèyuán'),part(' · '),part('第二册上','dì èr cè shàng'),part(' · '),part('第四课','dì sì kè')),
  question: line('When is your birthday?',part('你的','nǐ de'),part('生日','shēngrì'),part('是','shì'),part('几月几号？','jǐ yuè jǐ hào?')),
  jump: line('See the birthday chart',part('看','kàn'),part('生日统计','shēngrì tǒngjì'),part(' ↓')),
  teacher: line('Open the private teacher page',part('登录','dēnglù'),part('教师页','jiàoshī yè')),
  migrate: line('Move this browser’s records to the teacher page',part('迁移到','qiānyí dào'),part('教师页','jiàoshī yè')),
  class: line('Prize Record class',part('奖励记录','jiǎnglì jìlù'),part('班级','bānjí')),
  temporary: line('Use a temporary list',part('使用','shǐyòng'),part('临时名单','línshí míngdān')),
  names: line('One name per line',part('每行','měi háng'),part('一个','yí ge'),part('姓名','xìngmíng')),
  useNames: line('Use this list',part('使用','shǐyòng'),part('这份','zhè fèn'),part('名单','míngdān')),
  drag: line('Drag or tap to choose the month and day.',part('把月份、日期','bǎ yuèfèn, rìqī'),part('拖到格子里，','tuō dào gézi lǐ,'),part('也可以点选。','yě kěyǐ diǎnxuǎn.')),
  month: line('Month',part('月份','yuèfèn')),
  day: line('Day',part('日期','rìqī')),
  save: line('Record birthday',part('记录','jìlù'),part('生日','shēngrì')),
  remove: line('Clear this birthday',part('清除','qīngchú'),part('这条生日','zhè tiáo shēngrì')),
  chooseMonth: line('Choose a month',part('选','xuǎn'),part('月份','yuèfèn')),
  chooseDay: line('Choose a day',part('选','xuǎn'),part('日期','rìqī')),
  results: line('Which month has the most birthdays?',part('生日','shēngrì'),part('是几月','shì jǐ yuè'),part('的人','de rén'),part('最多？','zuì duō?')),
  reveal: line('Show the answer',part('揭晓','jiēxiǎo'),part('答案','dá’àn')),
  sharing: line('Who has a birthday in the same month?',part('还有谁和谁','hái yǒu shéi hé shéi'),part('同一个月','tóng yí ge yuè'),part('生日？','shēngrì?')),
  footer: line('Birthday months and days are saved by class in this browser. Temporary lists stay in this tab.',
    part('生日只记录月和日，','shēngrì zhǐ jìlù yuè hé rì,'),part('按班级保存在此浏览器。','àn bānjí bǎocún zài cǐ liúlǎnqì.'),
    part('临时名单只保留在当前标签页。','línshí míngdān zhǐ bǎoliú zài dāngqián biāoqiānyè.')),
};

export const birthdayPreviewCopy = {
  meta: line('Chinese Paradise · Book Two, Part A · Lesson Four: What’s the date today?',
    ...fixed.lesson.parts,part(' '),part('今天','jīntiān'),part('几月几号','jǐ yuè jǐ hào')),
  title: fixed.question,
  description: line('Choose a class and drag in each birthday. Find out which month has the most birthdays.',
    part('选班级，','xuǎn bānjí,'),part('拖入','tuō rù'),part('同学的生日。','tóngxué de shēngrì.'),
    part('看看','kànkan'),part('哪一个月','nǎ yí ge yuè'),part('过生日的人最多。','guò shēngrì de rén zuì duō.')),
  tags: line('Class roster · Birthday chart',part('班级名单','bānjí míngdān'),part(' · '),part('生日统计','shēngrì tǒngjì')),
  link: line('Start the birthday survey',part('开始','kāishǐ'),part('生日调查','shēngrì diàochá')),
};

export function renderStaticSurveyCopy(root,{onJourney=false}={}) {
  for (const node of root.querySelectorAll('[data-survey-copy]')) {
    const key=node.dataset.surveyCopy;
    renderCopy(node,fixed[key==='back'&&onJourney?'map':key]);
  }
}
