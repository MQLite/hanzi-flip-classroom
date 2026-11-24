import {findBirthdayClass,groupBirthdays,monthLength,validBirthday} from './birthday-survey-data.js';
import {createPrizeRecordStore, PRIZE_RECORD_KEY} from './prize-record-store.js';
import {bindExplorationJourney} from './island-exploration.js';
import {chineseNumber, classCount, dateEnglish, datePart, englishNumber, line, numberPart, part,
  progressCopy, readSurveyTab, renderCopy, renderStaticSurveyCopy, writeSurveyTab} from './birthday-survey-language.js';
import './birthday-survey.css';

const classDatePrefix = id => `hanzi-flip.birthday-survey.class.v1:${encodeURIComponent(id)}:`;
const classDateKey = (classId,studentId) => classDatePrefix(classId)+encodeURIComponent(studentId);
const manualClass = 'survey/temporary';
const dragType = 'application/x-birthday-token';
const englishList = new Intl.ListFormat('en',{type:'conjunction'});
const copied = (tag,copy,className) => renderCopy(element(tag,undefined,className),copy);
const dateCopy = (value,kind) => line(dateEnglish(value,kind),datePart(value,kind));
const monthColors = ['#98c6be','#96bdce','#c0adcf','#dba4b5','#edb29b','#ebc47f','#eed68f','#d0d68a','#a8cb92','#93c4a5','#9ab8d5','#b2afdb'];
const get = id => document.getElementById(id);
const element = (tag,text,className) => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
};

const saved = readSurveyTab();
const tabDates = new Map();
const dates = new Map();
if (Array.isArray(saved.dates)) {
  for (const row of saved.dates) {
    if (!Array.isArray(row)) continue;
    const [id,date] = row;
    if (typeof id === 'string' && date && validBirthday(date.month,date.day)) {
      tabDates.set(id,{month:date.month,day:date.day});
    }
  }
}
let temporary = Array.isArray(saved.temporary) ? saved.temporary.filter(student =>
  typeof student?.id === 'string' && typeof student.name === 'string') : [];
const classes = createPrizeRecordStore();
const journey = bindExplorationJourney('birthday-survey');
const select = get('survey-class');
const roster = get('survey-roster');
const status = get('survey-status');
const chart = get('survey-chart');
const dateForm = get('survey-date-form');
let groups = classes.get().record.classes;
let groupId = saved.groupId === manualClass && temporary.length ? manualClass
  : groups.find(group=>group.id===saved.groupId)?.id ?? findBirthdayClass(groups)?.id ?? '';
let activeId = '', month = 0, day = 0;
let revealed = false;
let finished = false;
let showPinyin = saved.showPinyin===true;
let showEnglish = saved.showEnglish===true;

function students() {
  if (groupId === manualClass) return temporary;
  return groups.find(group => group.id === groupId)?.students ?? [];
}

function readClassDate(classId,studentId) {
  const key=classDateKey(classId,studentId);
  const date=tabDates.get(studentId);
  try {
    const stored=localStorage.getItem(key);
    if (stored!==null) {
      tabDates.delete(studentId);
      return JSON.parse(stored);
    }
    if (date) {
      localStorage.setItem(key,JSON.stringify(date));
      tabDates.delete(studentId);
    }
    return date;
  } catch {
    return tabDates.get(studentId);
  }
}

function loadClassDates() {
  dates.clear();
  for (const {id} of students()) {
    const date=groupId===manualClass ? tabDates.get(id) : readClassDate(groupId,id);
    if (date && validBirthday(date.month,date.day)) dates.set(id,date);
  }
}

function saveDate(date) {
  if (groupId!==manualClass) {
    try {
      // A cleared record also supersedes any older copy left in a tab.
      localStorage.setItem(classDateKey(groupId,activeId),JSON.stringify(date));
    } catch {
      renderCopy(status,line('The browser could not save this change. Please try again.',
        part('浏览器未能保存这次修改，','liúlǎnqì wèi néng bǎocún zhè cì xiūgǎi,'),part('请重试。','qǐng chóngshì.')));
      return false;
    }
  }
  if (date && groupId===manualClass) tabDates.set(activeId,date);
  else tabDates.delete(activeId);
  if (date) dates.set(activeId,date);
  else dates.delete(activeId);
  return true;
}

function persist() {
  writeSurveyTab({groupId,dates:[...tabDates],temporary,showPinyin,showEnglish});
}

function renderClasses() {
  select.replaceChildren(new Option('选择班级',''));
  for (const group of groups) select.add(new Option(group.name,group.id));
  if (temporary.length) select.add(new Option('临时名单',manualClass));
  select.value = groupId;
  const french = findBirthdayClass(groups);
  const warning = classes.get().warning;
  const count=students().length;
  const message=warning ? line('Prize Record is unavailable. Use a temporary list.',part('暂时无法读取奖励记录。','zànshí wúfǎ dúqǔ jiǎnglì jìlù.'),part('可以使用临时名单。','kěyǐ shǐyòng línshí míngdān.'))
    : groupId===manualClass ? line('Using a temporary list.',part('当前使用','dāngqián shǐyòng'),part('临时名单。','línshí míngdān.'))
    : groupId ? line('Imported '+classCount(count)+'.',part('已导入','yǐ dǎorù'),numberPart(count,{people:true}),part('位学生。','wèi xuésheng.'))
    : french ? line('Choose a class.',part('请选择','qǐng xuǎnzé'),part('要调查的班级。','yào diàochá de bānjí.'))
    : line('Ecole Francaise was not found. Open the site in the browser with the saved Prize Record, or use a temporary list.',
      part('本浏览器','běn liúlǎnqì'),part('没有找到','méiyǒu zhǎodào'),part(' Ecole Francaise。'),part('请用保存过奖励记录的','qǐng yòng bǎocún guo jiǎnglì jìlù de'),part('浏览器打开本站，','liúlǎnqì dǎkāi běnzhàn,'),part('或使用临时名单。','huò shǐyòng línshí míngdān.'));
  renderCopy(get('survey-roster-note'),message);
}

function chooseStudent(id) {
  activeId = id;
  const prior = dates.get(id);
  month = prior?.month ?? 0;
  day = prior?.day ?? 0;
  renderRecorder();
}

function firstUnanswered() {
  const all = students();
  return all.find(student=>!dates.has(student.id))?.id ?? all[0]?.id ?? '';
}

function renderRecorder() {
  const all = students();
  const active = all.find(student=>student.id===activeId);
  if (active) get('survey-student').textContent=active.name;
  else renderCopy(get('survey-student'),line('Choose a class or enter a temporary list.',part('先选择班级','xiān xuǎnzé bānjí'),part('或输入临时名单','huò shūrù línshí míngdān')));
  renderCopy(get('survey-progress'),progressCopy(all.filter(student=>dates.has(student.id)).length,all.length));
  roster.replaceChildren();
  for (const student of all) {
    const item = element('li');
    const pick = element('button');
    const birthday = dates.get(student.id);
    pick.type = 'button';
    pick.dataset.student = student.id;
    pick.setAttribute('aria-pressed',String(student.id===activeId));
    const date=birthday ? line(dateEnglish(birthday.month,'month')+' '+dateEnglish(birthday.day,'day'),datePart(birthday.month,'month'),datePart(birthday.day,'day'))
      : line('To record',part('待记录','dài jìlù'));
    pick.append(element('span',student.name,'survey-name'),copied('span',date,'survey-roster-date'));
    item.append(pick);
    roster.append(item);
  }
  renderDate();
}

function renderDate() {
  renderCopy(get('survey-month-value'),dateCopy(month,'month'));
  renderCopy(get('survey-day-value'),dateCopy(day,'day'));
  get('survey-save').disabled = !activeId || !validBirthday(month,day);
  get('survey-remove').hidden = !dates.has(activeId);
  for (const token of document.querySelectorAll('[data-date-token]')) {
    const {dateToken,value} = token.dataset;
    const selected = dateToken==='month' ? month : day;
    token.setAttribute('aria-pressed',String(Number(value)===selected));
    token.disabled = !activeId || (dateToken==='day' && month!==0 && Number(value)>monthLength(month));
    token.draggable = !token.disabled;
  }
}

function setPart(kind,value) {
  if (!activeId || !Number.isInteger(value) || value<1) return;
  status.textContent = '';
  if (kind==='month' && value<=12) {
    month=value;
    if (day>monthLength(month)) {
      day=0;
      renderCopy(status,line('That day does not exist in this month. Choose another day.',part('这个月没有所选日期，','zhè ge yuè méiyǒu suǒ xuǎn rìqī,'),part('请重新选。','qǐng chóngxīn xuǎn.')));
    }
  } else if (kind==='day' && value<=(month ? monthLength(month) : 31)) {
    day=value;
  }
  renderDate();
}

function addTokens(container,part,count) {
  for (let value=1;value<=count;value++) {
    const token = copied('button',dateCopy(value,part));
    token.type='button';
    token.dataset.dateToken=part;
    token.dataset.value=value;
    token.draggable=true;
    container.append(token);
  }
  container.addEventListener('click',event=>{
    const token=event.target.closest('[data-date-token]');
    if (token && !token.disabled) setPart(part,Number(token.dataset.value));
  });
  container.addEventListener('dragstart',event=>{
    const token=event.target.closest('[data-date-token]');
    if (!token || token.disabled) { event.preventDefault(); return; }
    event.dataTransfer.effectAllowed='copy';
    event.dataTransfer.setData(dragType,`${part}:${token.dataset.value}`);
  });
}

function renderChart() {
  const all = students();
  const result = groupBirthdays(all,dates);
  const rows = Math.max(3,result.max);
  renderCopy(get('survey-result-progress'),progressCopy(result.recorded,all.length));
  get('survey-reveal').disabled = !result.recorded;
  get('survey-finish').hidden = !revealed || !result.recorded;
  get('survey-finish').disabled = finished;
  renderCopy(get('survey-finish'),finished ? line('Finished',part('调查完成','diàochá wánchéng')) : line('Finish the survey',part('完成调查','wánchéng diàochá')));

  const plot = element('div',undefined,'survey-chart-grid');
  plot.style.setProperty('--rows',rows);
  const longestName = result.months.flat().reduce((longest,{name})=>
    Math.max(longest,Array.from(name).reduce((size,character)=>size + (/\p{Script=Han}/u.test(character) ? 2 : 1),0)),0);
  plot.style.setProperty('--base-person-height',Math.max(64,Math.ceil(longestName / 8) * 14 + 24)+'px');
  const axis = element('div',undefined,'survey-axis');
  axis.append(copied('span',line('People',part('人数','rénshù')),'survey-axis-label'));
  const ticks = element('ol',undefined,'survey-y-ticks');
  for (let count=0;count<=rows;count++) {
    const tick = copied('li',line(englishNumber(count),numberPart(count)));
    tick.style.setProperty('--tick',count);
    ticks.append(tick);
  }
  axis.append(ticks);
  const scroller = element('div',undefined,'survey-chart-scroll');
  scroller.tabIndex=0;
  scroller.setAttribute('role','region');
  scroller.setAttribute('aria-label','生日柱状图，横向浏览一月至十二月');
  const columns = element('div',undefined,'survey-chart-months');
  result.months.forEach((birthdays,index)=>{
    const monthNumber=index+1;
    const monthColumn=element('section',undefined,'survey-month-column');
    monthColumn.style.setProperty('--month-color',monthColors[index]);
    const count = birthdays.length;
    const label = copied('h3',dateCopy(monthNumber,'month'));
    label.setAttribute('aria-label',`${chineseNumber(monthNumber)}月，${chineseNumber(count,{people:true})}人`);
    const stack = element('ul',undefined,'survey-stack');
    for (const birthday of birthdays) {
      const cylinder = element('li',undefined,'survey-cylinder');
      cylinder.append(element('strong',birthday.name),copied('span',dateCopy(birthday.day,'day')));
      stack.append(cylinder);
    }
    stack.lastElementChild?.classList.add('survey-cake-top');
    if (revealed && result.leaders.includes(monthNumber)) monthColumn.classList.add('survey-leader');
    monthColumn.append(stack,label);
    columns.append(monthColumn);
  });
  scroller.append(columns);
  plot.append(axis,scroller);
  const priorScroll = chart.querySelector('.survey-chart-scroll')?.scrollLeft ?? 0;
  chart.replaceChildren(plot,copied('p',line('Months',part('月份','yuèfèn')),'survey-x-label'));
  scroller.scrollLeft=priorScroll;

  const answer=get('survey-answer');
  answer.hidden=!revealed || !result.recorded;
  answer.replaceChildren();
  if (answer.hidden) return;
  const winningMonths=result.leaders.flatMap((value,index)=>index ? [part('、'),datePart(value,'month')] : [datePart(value,'month')]);
  const winners=englishList.format(result.leaders.map(value=>dateEnglish(value,'month')));
  const unique=result.leaders.length===1;
  const english=unique ? `${winners} has the most birthdays with ${classCount(result.max)}.`
    : `${winners} tie for first with ${classCount(result.max)} each.`;
  answer.append(copied('strong',line(english,...winningMonths,
    unique ? part('生日的人最多，有','shēngrì de rén zuì duō, yǒu') : part('并列最多，各有','bìngliè zuì duō, gè yǒu'),
    numberPart(result.max,{people:true}),part('人。','rén.'))));
  const shared=result.months.flatMap((birthdays,index)=>birthdays.length>1 ? [[index+1,birthdays]] : []);
  if (shared.length) {
    const details=element('details');
    details.append(copied('summary',line('See who shares a birthday month',part('看看同一个月','kànkan tóng yí ge yuè'),part('生日的同学','shēngrì de tóngxué'))));
    const list=element('ul');
    for (const [sameMonth,birthdays] of shared) {
      const names=birthdays.map(item=>item.name);
      list.append(copied('li',line(`${englishList.format(names)} have birthdays in ${dateEnglish(sameMonth,'month')}.`,part(names.join('、')),
        part('的生日都在','de shēngrì dōu zài'),datePart(sameMonth,'month'),part('。'))));
    }
    details.append(list);
    answer.append(details);
  }
}

function changeClass(id) {
  groupId=id;
  status.textContent='';
  revealed=false;
  loadClassDates();
  renderClasses();
  chooseStudent(firstUnanswered());
  renderChart();
  persist();
}

select.addEventListener('change',()=>changeClass(select.value));
window.addEventListener('storage',event=>{
  if (event.key===PRIZE_RECORD_KEY || event.key===null) {
    classes.refresh();
    groups=classes.get().record.classes;
    if (groupId!==manualClass && !groups.some(group=>group.id===groupId)) {
      changeClass(findBirthdayClass(groups)?.id ?? '');
      return;
    }
    renderClasses();
  } else if (!groupId || groupId===manualClass || !event.key.startsWith(classDatePrefix(groupId))) return;
  loadClassDates();
  if (!students().some(student=>student.id===activeId)) chooseStudent(firstUnanswered());
  else renderRecorder();
  renderChart();
});
get('survey-manual-form').addEventListener('submit',event=>{
  event.preventDefault();
  const names=get('survey-manual-names').value.split(/\r?\n/u).map(name=>name.trim()).filter(Boolean);
  if (!names.length) return;
  const prior=temporary;
  temporary=names.map((name,index)=>prior[index]?.name===name ? prior[index] : {id:'survey/'+crypto.randomUUID(),name});
  const currentIds=new Set(temporary.map(student=>student.id));
  for (const student of prior) if (!currentIds.has(student.id)) tabDates.delete(student.id);
  get('survey-manual').open=false;
  changeClass(manualClass);
});
roster.addEventListener('click',event=>{
  const button=event.target.closest('[data-student]');
  if (!button) return;
  status.textContent='';
  chooseStudent(button.dataset.student);
  roster.querySelector('[aria-pressed="true"]')?.focus();
});
dateForm.addEventListener('submit',event=>{
  event.preventDefault();
  const all=students();
  const active=all.find(student=>student.id===activeId);
  if (!active || !validBirthday(month,day)) return;
  if (!saveDate({month,day})) return;
  renderCopy(status,line(`Recorded ${active.name}’s birthday for ${dateEnglish(month,'month')} ${dateEnglish(day,'day')}.`,
    part('已记录：','yǐ jìlù:'),part(active.name+'，'),datePart(month,'month'),datePart(day,'day'),part('。')));
  const start=all.indexOf(active)+1;
  const next=[...all.slice(start),...all.slice(0,start)].find(student=>!dates.has(student.id));
  revealed=false;
  chooseStudent(next?.id ?? activeId);
  renderChart();
  persist();
});
get('survey-remove').addEventListener('click',()=>{
  if (!dates.has(activeId) || !saveDate(null)) return;
  revealed=false;
  chooseStudent(activeId);
  renderCopy(status,line('Cleared. You can enter the birthday again.',part('已清除，','yǐ qīngchú,'),part('可以重新录入。','kěyǐ chóngxīn lùrù.')));
  renderChart();
  persist();
});
for (const slot of dateForm.querySelectorAll('[data-drop]')) {
  slot.addEventListener('dragover',event=>{
    if (!event.dataTransfer.types.includes(dragType)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect='copy';
    slot.classList.add('survey-drop-over');
  });
  slot.addEventListener('dragleave',()=>slot.classList.remove('survey-drop-over'));
  slot.addEventListener('drop',event=>{
    event.preventDefault();
    slot.classList.remove('survey-drop-over');
    const [kind,value]=event.dataTransfer.getData(dragType).split(':');
    if (kind===slot.dataset.drop) setPart(kind,Number(value));
    else if (kind) renderCopy(status,kind==='month'
      ? line('Drop the month in the Month box.',part('把月份拖到「月份」格。','bǎ yuèfèn tuō dào “yuèfèn” gé.'))
      : line('Drop the day in the Day box.',part('把日期拖到「日期」格。','bǎ rìqī tuō dào “rìqī” gé.')));
  });
}
get('survey-reveal').addEventListener('click',()=>{
  revealed=true;
  renderChart();
});
get('survey-finish').addEventListener('click',()=>{
  finished=true;
  renderChart();
  journey.reportComplete();
});
const pinyinToggle=get('survey-pinyin'),englishToggle=get('survey-english');
function applyLanguages() {
  document.body.classList.toggle('survey-show-pinyin',showPinyin);
  document.body.classList.toggle('survey-show-english',showEnglish);
  pinyinToggle.checked=showPinyin;
  englishToggle.checked=showEnglish;
}
for (const toggle of [pinyinToggle,englishToggle]) {
  toggle.addEventListener('change',()=>{
    showPinyin=pinyinToggle.checked;
    showEnglish=englishToggle.checked;
    applyLanguages();
    persist();
  });
}
addTokens(get('survey-months'),'month',12);
addTokens(get('survey-days'),'day',31);
get('survey-student').setAttribute('aria-live','polite');
get('survey-manual-names').value=temporary.map(student=>student.name).join('\n');
journey.decorate();
renderStaticSurveyCopy(document,{onJourney:Boolean(journey.returnUrl)});
applyLanguages();
// Transfer earlier recordings from all known classes before this tab is closed.
for (const group of groups) {
  for (const {id} of group.students) {
    if (tabDates.has(id)) readClassDate(group.id,id);
  }
}
loadClassDates();
renderClasses();
chooseStudent(firstUnanswered());
renderChart();
persist();
