const monthDays = [31,29,31,30,31,30,31,31,30,31,30,31];
const normalizeClass = name => name.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/\s+/gu,'');

export function findBirthdayClass(classes) {
  return classes.find(group => normalizeClass(group.name) === 'ecolefrancaise');
}

export function monthLength(month) {
  return Number.isInteger(month) ? monthDays[month - 1] ?? 0 : 0;
}

export function validBirthday(month, day) {
  return Number.isInteger(day) && day >= 1 && day <= monthLength(month);
}

export function groupBirthdays(students, dates) {
  const months = Array.from({length:12}, () => []);
  let recorded = 0;
  for (const {id, name} of students) {
    const date = dates.get(id);
    if (!date || !validBirthday(date.month,date.day)) continue;
    months[date.month - 1].push({name,day:date.day});
    recorded++;
  }
  const max = Math.max(...months.map(month => month.length));
  const leaders = recorded ? months.flatMap((month,i) => month.length === max ? [i + 1] : []) : [];
  return {months,recorded,max,leaders};
}

export function createBirthdayBalloonDeck(students, dates, random = Math.random) {
  const eligible = students.flatMap(({id,name}) => {
    const date = dates.get(id);
    return date && validBirthday(date.month,date.day) ? [{name,month:date.month,day:date.day}] : [];
  });
  const sameDate = (first,second) => first.month===second.month && first.day===second.day;
  let remaining = [];
  return () => {
    if (!remaining.length) {
      remaining = [...eligible];
      for (let index=remaining.length-1; index>0; index--) {
        const other = Math.floor(random()*(index+1));
        [remaining[index],remaining[other]] = [remaining[other],remaining[index]];
      }
    }
    return remaining.splice(0,5).map(({name,month,day}) => {
      const correct = {month,day};
      const alternatives = eligible.filter(date => !sameDate(date,correct));
      const other = alternatives[Math.floor(random()*alternatives.length)];
      const wrong = other ? {month:other.month,day:other.day}
        : {month,day:day===monthLength(month) ? day-1 : day+1};
      const correctIndex = Math.floor(random()*2);
      return {name,correctIndex,options:correctIndex===0 ? [correct,wrong] : [wrong,correct]};
    });
  };
}
