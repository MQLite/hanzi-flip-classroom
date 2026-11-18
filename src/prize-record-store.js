export const PRIZE_RECORD_KEY = 'hanzi-flip.prize-record.v1';
const EVENT_TYPES = new Set(['homework', 'participation', 'redeem']);
const emptyRecord = () => ({version:1, selectedClassId:'', classes:[]});

export function prizeBalance(student) {
  let stamps = 0;
  let gifts = 0;
  for (const event of student.history) {
    if (event.kind === 'redeem') {
      stamps -= 10;
      gifts++;
    } else stamps++;
  }
  return {stamps, gifts};
}

export function validatePrizeRecord(record) {
  if (!record || record.version !== 1 || !Array.isArray(record.classes) || typeof record.selectedClassId !== 'string') return false;
  const ids = new Set();
  const validId = id => {
    if (typeof id !== 'string' || !id || ids.has(id)) return false;
    ids.add(id);
    return true;
  };
  const validName = name => typeof name === 'string' && name.trim().length > 0;
  for (const group of record.classes) {
    if (!validId(group.id) || !validName(group.name) || !Array.isArray(group.students)) return false;
    for (const student of group.students) {
      if (!validId(student.id) || !validName(student.name) || !Array.isArray(student.history)) return false;
      let balance = 0;
      for (const event of student.history) {
        if (!validId(event.id) || !EVENT_TYPES.has(event.kind) || typeof event.at !== 'string' || !Number.isFinite(Date.parse(event.at))) return false;
        balance += event.kind === 'redeem' ? -10 : 1;
        if (balance < 0) return false;
      }
    }
  }
  return record.selectedClassId === '' && record.classes.length === 0
    || record.classes.some(group => group.id === record.selectedClassId);
}

function nameFor(value) {
  const name = typeof value === 'string' ? value.normalize('NFC').trim() : '';
  if (!name) throw new Error('请填写名称。');
  return name;
}

export function changePrizeRecord(record, action, {id = () => crypto.randomUUID(), now = () => new Date().toISOString()} = {}) {
  const next = structuredClone(record);
  if (action.type === 'add-class') {
    const name = nameFor(action.name);
    const existing = next.classes.find(group => group.name === name);
    if (existing) next.selectedClassId = existing.id;
    else {
      const group = {id:id(), name, students:[]};
      next.classes.push(group);
      next.selectedClassId = group.id;
    }
    return next;
  }
  const group = next.classes.find(item => item.id === action.classId);
  if (!group) throw new Error('班级已变更，请重新选择。');
  switch (action.type) {
    case 'select-class':
      next.selectedClassId = group.id;
      return next;
    case 'rename-class':
      group.name = nameFor(action.name);
      return next;
    case 'remove-class':
      next.classes = next.classes.filter(item => item.id !== group.id);
      if (next.selectedClassId === group.id) next.selectedClassId = next.classes[0]?.id ?? '';
      return next;
    case 'add-students': {
      const names = [...new Set(String(action.names ?? '').split(/[\n,，、]+/u).map(name => name.trim()).filter(Boolean))];
      if (!names.length) throw new Error('请填写学生姓名。');
      for (const name of names) group.students.push({id:id(), name:nameFor(name), history:[]});
      return next;
    }
  }
  const student = group.students.find(item => item.id === action.studentId);
  if (!student) throw new Error('学生记录已变更，请重新选择。');
  switch (action.type) {
    case 'rename-student':
      student.name = nameFor(action.name);
      break;
    case 'remove-student':
      group.students = group.students.filter(item => item.id !== student.id);
      break;
    case 'award':
      if (!['homework', 'participation'].includes(action.kind)) throw new Error('请选择盖章原因。');
      student.history.push({id:id(), kind:action.kind, at:now()});
      break;
    case 'redeem':
      if (prizeBalance(student).stamps < 10) throw new Error('集满 10 个章后可以兑换礼物。');
      student.history.push({id:id(), kind:'redeem', at:now()});
      break;
    case 'undo':
      student.history.pop();
      break;
    default:
      throw new Error('无法识别这项操作。');
  }
  return next;
}

function browserStorage() {
  try { return globalThis.localStorage; } catch { return null; }
}

export function createPrizeRecordStore({storage = browserStorage(), locks = globalThis.navigator?.locks} = {}) {
  let record = emptyRecord();
  let warning = '';
  let corrupted = false;
  let unsaved = false;
  const listeners = new Set();
  let pending = Promise.resolve();

  function refresh() {
    if (corrupted || unsaved) return;
    try {
      if (!storage) throw new Error('unavailable');
      const raw = storage.getItem(PRIZE_RECORD_KEY);
      if (raw === null) {
        record = emptyRecord();
        return;
      }
      const parsed = JSON.parse(raw);
      if (!validatePrizeRecord(parsed)) throw new SyntaxError('invalid record');
      record = parsed;
    } catch (error) {
      corrupted = error instanceof SyntaxError;
      unsaved = true;
      warning = corrupted ? '已存记录无法读取，新增操作暂存在本页。' : '浏览器未能保存，记录暂存在本页。';
    }
  }

  function emit() {
    for (const listener of listeners) listener({record, warning});
  }
  refresh();
  return {
    get: () => ({record, warning}),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    refresh() {
      refresh();
      emit();
    },
    update(action) {
      const commit = () => {
        // Read again inside the cross-tab lock before changing any balance.
        refresh();
        const updated = changePrizeRecord(record, action);
        if (!validatePrizeRecord(updated)) throw new Error('记录未能保存，请重试。');
        record = updated;
        try {
          if (!storage || corrupted) throw new Error('unavailable');
          storage.setItem(PRIZE_RECORD_KEY, JSON.stringify(record));
          unsaved = false;
          warning = '';
        } catch {
          unsaved = true;
          warning = '浏览器未能保存，记录暂存在本页。';
        }
        emit();
        return record;
      };
      const request = () => locks ? locks.request(PRIZE_RECORD_KEY, commit) : commit();
      const result = pending.then(request);
      pending = result.catch(() => {});
      return result;
    },
  };
}
