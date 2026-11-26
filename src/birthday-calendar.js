import {createBirthdayCalendarStore} from './birthday-calendar-store.js';
import {groupBirthdays,monthLength,validBirthday} from './birthday-survey-data.js';
import {chineseNumber,dateEnglish,datePart,line,numberPart,part,progressCopy,readSurveyTab,renderCopy,writeSurveyTab} from './birthday-survey-language.js';
import {bindExplorationJourney} from './island-exploration.js';
import './birthday-survey.css';
import './birthday-calendar.css';

const store=createBirthdayCalendarStore();
const journey=bindExplorationJourney('birthday-calendar');
const get=id=>document.getElementById(id);
const monthSelect=get('calendar-month'), daySelect=get('calendar-day'), studentSelect=get('calendar-student');
const classSelect=get('calendar-class'), entryStatus=get('calendar-entry-status'), grid=get('calendar-grid');
const chineseMonth=month=>chineseNumber(month)+'月';
const chineseDay=day=>chineseNumber(day)+'日';
const classIn=(record,id)=>record.classes.find(group=>group.id===id);
const currentClass=()=>classIn(state,state.selectedClassId);
const currentStudents=()=>currentClass()?.students ?? [];
const monthOptions=Array.from({length:12},(_,i)=>new Option(chineseMonth(i+1),i+1));
let state=store.refresh(), studentId='', displayMonth=0, showingCalendar=false;

function make(tag,className,text) {
  const node=document.createElement(tag);
  if (className) node.className=className;
  if (text!==undefined) node.textContent=text;
  return node;
}

function dayPart(day) {
  const [number,pinyin]=numberPart(day);
  return part(number+'日',pinyin+' rì');
}

function showSentence() {
  const month=Number(monthSelect.value), day=Number(daySelect.value);
  const hasDate=validBirthday(month,day);
  renderCopy(get('calendar-answer-line'),line(
    hasDate ? `My birthday is on ${dateEnglish(month,'month')} ${dateEnglish(day,'day')}.` : 'My birthday is on …',
    part('我的生日','wǒ de shēngrì'),part('是','shì'),
    hasDate ? datePart(month,'month') : part('___月','yuè'),
    hasDate ? dayPart(day) : part('___日','rì'),part('。')));
  get('calendar-save-birthday').disabled=!hasDate;
}

function drawDays(selected) {
  const month=Number(monthSelect.value);
  const days=Array.from({length:monthLength(month)},(_,i)=>new Option(chineseDay(i+1),i+1));
  daySelect.replaceChildren(new Option('选日期',''),...days);
  daySelect.disabled=!month;
  daySelect.value=validBirthday(month,selected) ? String(selected) : '';
  showSentence();
}

function selectStudent(id) {
  const student=currentStudents().find(item=>item.id===id);
  studentId=student?.id ?? '';
  studentSelect.value=studentId;
  monthSelect.value=student?.birthday?.month ?? '';
  drawDays(student?.birthday?.day);
}

function nextStudent({unrecorded=false}={}) {
  const students=currentStudents();
  const start=students.findIndex(student=>student.id===studentId)+1;
  const ordered=[...students.slice(start),...students.slice(0,start)];
  return ordered.find(student=>!unrecorded || !student.birthday)?.id ?? studentId;
}

function renderRecord(roster,recorded) {
  const hasClass=Boolean(currentClass());
  get('calendar-add-students').hidden=!hasClass;
  get('calendar-birthday-form').hidden=!roster.length;
  get('calendar-record-empty').hidden=Boolean(roster.length);
  get('calendar-record-empty').textContent=hasClass ? '添加同学后，就可以开始逐个录入生日。' : '先添加班级。';
  studentSelect.replaceChildren(...roster.map(student=>new Option(student.name,student.id)));
  const active=roster.find(student=>student.id===studentId) ?? roster.find(student=>!student.birthday) ?? roster[0];
  selectStudent(active?.id);
  get('calendar-skip-student').disabled=roster.length<2;
  renderCopy(get('calendar-recorded-count'),progressCopy(recorded,roster.length));
}

function groupByDay(entries) {
  const days=new Map();
  for (const {name,day} of entries) {
    if (!days.has(day)) days.set(day,[]);
    days.get(day).push(name);
  }
  return days;
}

function fullMonth(entries) {
  const days=groupByDay(entries);
  const monthGrid=make('ol','calendar-month-grid');
  monthGrid.setAttribute('aria-label',chineseMonth(displayMonth)+'日历');
  for (let day=1;day<=monthLength(displayMonth);day++) {
    const cell=make('li','calendar-day-cell');
    cell.dataset.day=String(day);
    cell.append(make('strong','calendar-date-label',chineseDay(day)));
    if (days.has(day)) {
      cell.classList.add('has-birthday');
      for (const name of days.get(day)) cell.append(make('span','calendar-person',name));
    }
    monthGrid.append(cell);
  }
  grid.replaceChildren(monthGrid);
}

function yearOverview(months) {
  const overview=make('div','calendar-year-grid');
  for (const [index,entries] of months.entries()) {
    const month=index+1;
    const card=make('section','calendar-month-card');
    card.dataset.month=String(month);
    const title=make('button','calendar-month-open',chineseMonth(month));
    title.type='button';
    title.setAttribute('aria-label','查看'+chineseMonth(month)+'日历');
    title.addEventListener('click',()=>{
      displayMonth=month;
      renderCalendar(months);
      get('calendar-display-title').focus({preventScroll:true});
    });
    const names=make('ul','calendar-birthdays');
    for (const [day,list] of [...groupByDay(entries)].sort(([first],[second])=>first-second)) {
      const row=make('li','calendar-birthday');
      row.append(make('strong','calendar-date-label',chineseDay(day)),make('span','calendar-person',list.join('、')));
      names.append(row);
    }
    card.append(title,names);
    overview.append(card);
  }
  grid.replaceChildren(overview);
}

function renderCalendar(months) {
  const className=currentClass()?.name;
  const title=displayMonth ? chineseMonth(displayMonth)+'生日日历' : '班级生日大日历';
  get('calendar-display-title').textContent=className ? `${className} · ${title}` : title;
  get('calendar-show-year').hidden=!displayMonth;
  if (displayMonth) fullMonth(months[displayMonth-1]);
  else yearOverview(months);
}

function render() {
  const warning=store.warning();
  get('calendar-storage-note').hidden=!warning;
  get('calendar-storage-note').textContent=warning;
  classSelect.replaceChildren(
    ...state.classes.map(group=>new Option(group.name,group.id)));
  if (!state.classes.length) classSelect.add(new Option('请添加班级',''));
  classSelect.value=state.selectedClassId;
  classSelect.disabled=!state.classes.length;
  get('calendar-show-view').disabled=!currentClass();
  get('calendar-record-view').setAttribute('aria-pressed',String(!showingCalendar));
  get('calendar-show-view').setAttribute('aria-pressed',String(showingCalendar));
  get('calendar-record').hidden=showingCalendar;
  get('calendar-display').hidden=!showingCalendar;
  const roster=currentStudents();
  const dates=new Map(roster.map(student=>[student.id,student.birthday]));
  const {months,recorded}=groupBirthdays(roster,dates);
  if (showingCalendar) {
    renderCopy(get('calendar-display-count'),progressCopy(recorded,roster.length));
    get('calendar-finish').hidden=!journey.returnUrl || !recorded;
    renderCalendar(months);
  } else renderRecord(roster,recorded);
}

async function update(change,after=()=>{}) {
  try {
    state=await store.update(change);
    after();
    render();
  } catch (error) {
    render();
    const notice=get('calendar-storage-note');
    notice.textContent=error.message || '请重试。';
    notice.hidden=false;
  }
}

classSelect.addEventListener('change',()=>{
  const id=classSelect.value;
  update(record=>{if (classIn(record,id)) record.selectedClassId=id;},()=>{
    studentId=''; displayMonth=0; entryStatus.textContent='';
    get('calendar-add-students').open=!currentStudents().length;
  });
});

get('calendar-class-form').addEventListener('submit',event=>{
  event.preventDefault();
  const field=get('calendar-class-name');
  const name=field.value.normalize('NFC').trim();
  if (!name) return;
  update(record=>{
    let group=record.classes.find(item=>item.name===name);
    if (!group) {
      group={id:crypto.randomUUID(),name,students:[]};
      record.classes.push(group);
    }
    record.selectedClassId=group.id;
  },()=>{
    field.value=''; studentId=''; entryStatus.textContent='';
    get('calendar-add-class').open=false;
    get('calendar-add-students').open=!currentStudents().length;
  });
});

get('calendar-students-form').addEventListener('submit',event=>{
  event.preventDefault();
  const id=state.selectedClassId;
  const field=get('calendar-student-names');
  const names=field.value.normalize('NFC').split(/[\n,，、]+/u).map(name=>name.trim()).filter(Boolean);
  if (!names.length) return;
  update(record=>{
    const group=classIn(record,id);
    if (!group) throw new Error('请重新选择班级。');
    const existing=new Set(group.students.map(student=>student.name));
    for (const name of new Set(names)) {
      if (!existing.has(name)) group.students.push({id:crypto.randomUUID(),name,birthday:null});
    }
  },()=>{
    field.value=''; studentId=''; entryStatus.textContent='';
    get('calendar-add-students').open=false;
  });
});

studentSelect.addEventListener('change',()=>{entryStatus.textContent='';selectStudent(studentSelect.value);});
monthSelect.addEventListener('change',()=>drawDays(Number(daySelect.value)));
daySelect.addEventListener('change',showSentence);
get('calendar-skip-student').addEventListener('click',()=>{entryStatus.textContent='';selectStudent(nextStudent());});
get('calendar-birthday-form').addEventListener('submit',event=>{
  event.preventDefault();
  const month=Number(monthSelect.value), day=Number(daySelect.value);
  const id=state.selectedClassId, chosen=studentId;
  const student=currentStudents().find(item=>item.id===chosen);
  if (!student || !validBirthday(month,day)) return;
  update(record=>{
    const entry=classIn(record,id)?.students.find(item=>item.id===chosen);
    if (!entry) throw new Error('请重新选择同学。');
    entry.birthday={month,day};
  },()=>{
    entryStatus.textContent=`${student.name} · ${chineseMonth(month)}${chineseDay(day)} 已记录。`;
    studentId=nextStudent({unrecorded:true});
  });
});

get('calendar-record-view').addEventListener('click',()=>{showingCalendar=false;render();});
get('calendar-show-view').addEventListener('click',()=>{
  showingCalendar=true; displayMonth=0; render();
  get('calendar-display-title').focus({preventScroll:true});
});
get('calendar-show-year').addEventListener('click',()=>{
  const month=displayMonth;
  displayMonth=0; render();
  grid.querySelector(`[data-month="${month}"] button`)?.focus({preventScroll:true});
});
get('calendar-finish').addEventListener('click',()=>journey.reportComplete());

for (const [id,key,className] of [['calendar-pinyin','showPinyin','survey-show-pinyin'],['calendar-english','showEnglish','survey-show-english']]) {
  const toggle=get(id);
  toggle.checked=readSurveyTab()[key]===true;
  document.body.classList.toggle(className,toggle.checked);
  toggle.addEventListener('change',()=>{
    document.body.classList.toggle(className,toggle.checked);
    writeSurveyTab({...readSurveyTab(),[key]:toggle.checked});
  });
}
renderCopy(get('calendar-title'),line('When is your birthday?',part('你的','nǐ de'),part('生日','shēngrì'),
  part('是','shì'),part('几月几日？','jǐ yuè jǐ rì?')));
monthSelect.replaceChildren(new Option('选月份',''),...monthOptions);
get('calendar-add-class').open=!currentClass();
get('calendar-add-students').open=Boolean(currentClass())&&!currentStudents().length;
journey.decorate();
render();
