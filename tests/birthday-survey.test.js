import {expect,it} from 'vitest';
import {findBirthdayClass, groupBirthdays, monthLength, validBirthday} from '../src/birthday-survey-data.js';

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
