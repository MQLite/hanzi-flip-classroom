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
