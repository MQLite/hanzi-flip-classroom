import {validBirthday} from './birthday-survey-data.js';

export const BIRTHDAY_CALENDAR_KEY = 'hanzi-flip.birthday-calendar.v1';
const blank = () => ({version:1, selectedClassId:'', classes:[]});

function validCalendar(data) {
  if (data?.version!==1 || !Array.isArray(data.classes)) return false;
  const ids=new Set();
  function validNameAndId(entry) {
    if (typeof entry?.id!=='string'||!entry.id||ids.has(entry.id)||typeof entry.name!=='string'||!entry.name.trim()) return false;
    ids.add(entry.id);
    return true;
  }
  return data.classes.every(group=>validNameAndId(group)&&Array.isArray(group.students)&&
    group.students.every(student=>validNameAndId(student)&&(student.birthday===null||
      validBirthday(student.birthday?.month,student.birthday?.day)))) &&
    (data.selectedClassId==='' || data.classes.some(group=>group.id===data.selectedClassId));
}

export function createBirthdayCalendarStore() {
  let state=blank(), warning='', memoryOnly=false, pending=Promise.resolve();
  function refresh() {
    if (memoryOnly) return state;
    try {
      const raw=localStorage.getItem(BIRTHDAY_CALENDAR_KEY);
      const next=raw===null ? blank() : JSON.parse(raw);
      if (!validCalendar(next)) throw new SyntaxError();
      state=next;
    } catch (error) {
      memoryOnly=true;
      warning=error instanceof SyntaxError ? 'unreadable' : 'unavailable';
    }
    return state;
  }
  function update(change) {
    const commit=()=>{
      const next=structuredClone(refresh());
      change(next);
      if (!validCalendar(next)) throw new Error('invalidRecord');
      state=next;
      if (!memoryOnly) {
        try { localStorage.setItem(BIRTHDAY_CALENDAR_KEY,JSON.stringify(state)); }
        catch {
          memoryOnly=true;
          warning='unsaved';
        }
      }
      return state;
    };
    const result=pending.then(()=>navigator.locks ? navigator.locks.request(BIRTHDAY_CALENDAR_KEY,commit) : commit());
    pending=result.catch(()=>{});
    return result;
  }
  return {refresh,update,warning:()=>warning};
}
