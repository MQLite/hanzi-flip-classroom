import {expect,it} from 'vitest';
import {createBirthdayBalloonDeck, findBirthdayClass, groupBirthdays, monthLength, validBirthday} from '../src/birthday-survey-data.js';
import {chineseNumber, dateEnglish, datePart} from '../src/birthday-survey-language.js';

it('writes Chinese dates, read-aloud counts and English ordinals without decimal digits',()=>{
  expect(datePart(29,'day')).toEqual(['二十九号','èr shí jiǔ hào']);
  expect(datePart(12,'month')).toEqual(['十二月','shí èr yuè']);
  expect(chineseNumber(2,{people:true})).toBe('两');
  expect(chineseNumber(106)).toBe('一百零六');
  expect(chineseNumber(110)).toBe('一百一十');
  expect([11,12,20,23,30,31].map(day=>dateEnglish(day,'day'))).toEqual(
    ['eleventh','twelfth','twentieth','twenty-third','thirtieth','thirty-first']);
});

it('finds the French class across accents, spacing and capitalization without selecting another class',()=>{
  const french={id:'fr',name:' École   Française ',students:[]};
  expect(findBirthdayClass([{id:'other-section',name:'Ecole Francaise 2'},french])).toBe(french);
  expect(findBirthdayClass([{id:'unrelated',name:'周六班'}])).toBeUndefined();
});

it('accepts leap-day birthdays and excludes impossible or stale dates',()=>{
  expect(monthLength(2)).toBe(29);
  expect(validBirthday(2,29)).toBe(true);
  expect(validBirthday(4,31)).toBe(false);
  expect(validBirthday(13,1)).toBe(false);
  const students=[{id:'a',name:'甲'},{id:'b',name:'乙'},{id:'c',name:'丙'}];
  const dates=new Map([['a',{month:5,day:8}],['b',{month:2,day:29}],['c',{month:4,day:31}],['removed',{month:5,day:10}]]);
  const result=groupBirthdays(students,dates);
  expect(result.months).toHaveLength(12);
  expect(result.months[1]).toEqual([{name:'乙',day:29}]);
  expect(result.recorded).toBe(2);
  expect(result.leaders).toEqual([2,5]);
  expect(groupBirthdays(students,new Map()).leaders).toEqual([]);
});

it('uses the fifteen recorded birthdays in three batches without asking about the missing student',()=>{
  const students = Array.from({length:16},(_,i)=>({id:String(i),name:`Student ${i+1}`}));
  const dates = new Map(students.slice(0,15).map(({id},i)=>[id,{month:2,day:i+15}]));
  const nextBatch = createBirthdayBalloonDeck(students,dates,()=>.75);
  const batches = [nextBatch(),nextBatch(),nextBatch()];
  expect(batches.map(batch=>batch.length)).toEqual([5,5,5]);
  const rounds = batches.flat();
  expect(new Set(rounds.map(({name})=>name))).toEqual(new Set(students.slice(0,15).map(({name})=>name)));
  for (const {name,options,correctIndex} of rounds) {
    const {id} = students.find(student=>student.name===name);
    expect(options[correctIndex]).toEqual(dates.get(id));
    expect(options[1-correctIndex]).not.toEqual(options[correctIndex]);
  }
  expect(nextBatch()).toHaveLength(5);
});

it('can offer two distinct valid dates when a class has only one recorded date',()=>{
  const students = [{id:'a',name:'甲'},{id:'b',name:'乙'}];
  const dates = new Map(students.map(({id})=>[id,{month:2,day:29}]));
  const batch = createBirthdayBalloonDeck(students,dates,()=>0)();
  expect(batch).toHaveLength(2);
  for (const {options} of batch) expect(options).toEqual([{month:2,day:29},{month:2,day:28}]);
  expect(createBirthdayBalloonDeck(students,new Map())()).toEqual([]);
});
