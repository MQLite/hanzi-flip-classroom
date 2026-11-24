import {findBirthdayClass,groupBirthdays,monthLength,validBirthday} from './birthday-survey-data.js';
import {createPrizeRecordStore, PRIZE_RECORD_KEY} from './prize-record-store.js';
import {bindExplorationJourney} from './island-exploration.js';
import './birthday-survey.css';

const sessionKey = 'hanzi-flip.birthday-survey.v1';
const manualClass = 'survey/temporary';
const dragType = 'application/x-birthday-token';
const monthColors = ['#98c6be','#96bdce','#c0adcf','#dba4b5','#edb29b','#ebc47f','#eed68f','#d0d68a','#a8cb92','#93c4a5','#9ab8d5','#b2afdb'];
const get = id => document.getElementById(id);
const element = (tag,text,className) => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
};

function restore() {
  try { return JSON.parse(sessionStorage.getItem(sessionKey)) ?? {}; }
  catch { return {}; }
}

const saved = restore();
const dates = new Map();
if (Array.isArray(saved.dates)) {
  for (const row of saved.dates) {
    if (!Array.isArray(row)) continue;
    const [id,date] = row;
    if (typeof id === 'string' && date && validBirthday(date.month,date.day)) dates.set(id,date);
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

function students() {
  if (groupId === manualClass) return temporary;
  return groups.find(group => group.id === groupId)?.students ?? [];
}

function persist() {
  try { sessionStorage.setItem(sessionKey,JSON.stringify({groupId,dates:[...dates],temporary})); }
  catch { /* Keep the current activity usable when browser storage is off. */ }
}

function renderClasses() {
  select.replaceChildren(new Option('选择班级',''));
  for (const group of groups) select.add(new Option(group.name,group.id));
  if (temporary.length) select.add(new Option('临时名单',manualClass));
  select.value = groupId;
  const french = findBirthdayClass(groups);
  const warning = classes.get().warning;
  get('survey-roster-note').textContent = warning ? '暂时无法读取奖励记录。可以先使用临时名单。'
    : groupId === manualClass ? '当前使用临时名单。'
    : groupId ? '已导入 '+students().length+' 位学生。'
    : french ? '请选择要调查的班级。'
    : '本浏览器没有找到 Ecole Francaise。打开保存过奖励记录的网站和浏览器，或使用临时名单。';
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
  get('survey-student').textContent = active?.name ?? '先选择班级或输入临时名单';
  get('survey-progress').textContent = `已记录 ${all.filter(student=>dates.has(student.id)).length} / ${all.length} 人`;
  roster.replaceChildren();
  for (const student of all) {
    const item = element('li');
    const pick = element('button');
    const birthday = dates.get(student.id);
    pick.type = 'button';
    pick.dataset.student = student.id;
    pick.setAttribute('aria-pressed',String(student.id===activeId));
    pick.append(element('span',student.name,'survey-name'),element('small',birthday ? `${birthday.month}月${birthday.day}号` : '待记录'));
    item.append(pick);
    roster.append(item);
  }
  renderDate();
}

function renderDate() {
  get('survey-month-value').textContent = month ? `${month}月` : '—';
  get('survey-day-value').textContent = day ? `${day}号` : '—';
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

function setPart(part,value) {
  if (!activeId || !Number.isInteger(value) || value<1) return;
  status.textContent = '';
  if (part==='month' && value<=12) {
    month=value;
    if (day>monthLength(month)) {
      day=0;
      status.textContent='这个月没有所选日期，请重新选几号。';
    }
  } else if (part==='day' && value<=(month ? monthLength(month) : 31)) {
    day=value;
  }
  renderDate();
}

function addTokens(container,part,count,suffix) {
  for (let value=1;value<=count;value++) {
    const token = element('button',value+suffix);
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
  get('survey-result-progress').textContent = `已记录 ${result.recorded} / ${all.length} 人`;
  get('survey-reveal').disabled = !result.recorded;
  get('survey-finish').hidden = !revealed || !result.recorded;
  get('survey-finish').disabled = finished;
  get('survey-finish').textContent = finished ? '调查完成' : '完成调查';

  const plot = element('div',undefined,'survey-chart-grid');
  plot.style.setProperty('--rows',rows);
  const longestName = result.months.flat().reduce((longest,{name})=>
    Math.max(longest,Array.from(name).reduce((size,character)=>size + (/\p{Script=Han}/u.test(character) ? 2 : 1),0)),0);
  plot.style.setProperty('--person-height',Math.max(64,Math.ceil(longestName / 8) * 14 + 24)+'px');
  const axis = element('div',undefined,'survey-axis');
  axis.append(element('span','人数','survey-axis-label'));
  const ticks = element('ol',undefined,'survey-y-ticks');
  for (let count=0;count<=rows;count++) {
    const tick = element('li',String(count));
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
    const label = element('h3',monthNumber+'月');
    label.setAttribute('aria-label',`${monthNumber}月，${count} 人`);
    const stack = element('ul',undefined,'survey-stack');
    for (const birthday of birthdays) {
      const cylinder = element('li',undefined,'survey-cylinder');
      cylinder.append(element('strong',birthday.name),element('span',birthday.day+'号'));
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
  chart.replaceChildren(plot,element('p','月份','survey-x-label'));
  scroller.scrollLeft=priorScroll;

  const answer=get('survey-answer');
  answer.hidden=!revealed || !result.recorded;
  answer.replaceChildren();
  if (answer.hidden) return;
  const winningMonths=result.leaders.map(value=>value+'月').join('、');
  const summary=result.leaders.length===1 ? `${winningMonths}生日的人最多，有 ${result.max} 人。`
    : `${winningMonths}并列最多，各有 ${result.max} 人。`;
  answer.append(element('strong',summary));
  const shared=result.months.flatMap((birthdays,index)=>birthdays.length>1 ? [[index+1,birthdays]] : []);
  if (shared.length) {
    const details=element('details');
    details.append(element('summary','看看同一个月生日的同学'));
    const list=element('ul');
    for (const [sameMonth,birthdays] of shared) {
      list.append(element('li',`${birthdays.map(item=>item.name).join('、')}的生日都在${sameMonth}月。`));
    }
    details.append(list);
    answer.append(details);
  }
}

function changeClass(id) {
  groupId=id;
  status.textContent='';
  revealed=false;
  renderClasses();
  chooseStudent(firstUnanswered());
  renderChart();
  persist();
}

select.addEventListener('change',()=>changeClass(select.value));
window.addEventListener('storage',event=>{
  if (event.key!==PRIZE_RECORD_KEY && event.key!==null) return;
  classes.refresh();
  groups=classes.get().record.classes;
  if (groupId!==manualClass && !groups.some(group=>group.id===groupId)) {
    changeClass(findBirthdayClass(groups)?.id ?? '');
    return;
  }
  renderClasses();
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
  for (const student of prior) if (!currentIds.has(student.id)) dates.delete(student.id);
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
  dates.set(activeId,{month,day});
  status.textContent=`已记录：${active.name}，${month}月${day}号。`;
  const start=all.indexOf(active)+1;
  const next=[...all.slice(start),...all.slice(0,start)].find(student=>!dates.has(student.id));
  revealed=false;
  chooseStudent(next?.id ?? activeId);
  renderChart();
  persist();
});
get('survey-remove').addEventListener('click',()=>{
  dates.delete(activeId);
  revealed=false;
  chooseStudent(activeId);
  status.textContent='已清除，可以重新录入。';
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
    const [part,value]=event.dataTransfer.getData(dragType).split(':');
    if (part===slot.dataset.drop) setPart(part,Number(value));
    else if (part) status.textContent=part==='month'?'把月份拖到「月份」格。':'把日期拖到「日期」格。';
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
addTokens(get('survey-months'),'month',12,'月');
addTokens(get('survey-days'),'day',31,'号');
get('survey-student').setAttribute('aria-live','polite');
get('survey-manual-names').value=temporary.map(student=>student.name).join('\n');
journey.decorate();
renderClasses();
chooseStudent(firstUnanswered());
renderChart();
