import {describe, it, expect} from 'vitest';
import {changePrizeRecord, createPrizeRecordStore, prizeBalance, validatePrizeRecord, PRIZE_RECORD_KEY} from '../src/prize-record-store.js';

function classroom() {
  let serial = 0;
  const tools = {id:() => 'prize-' + ++serial, now:() => '2026-11-19T01:00:00.000Z'};
  let record = {version:1, selectedClassId:'', classes:[]};
  const apply = action => {
    record = changePrizeRecord(record, action, tools);
    return record;
  };
  apply({type:'add-class', name:'周六班'});
  const classId = record.selectedClassId;
  apply({type:'add-students', classId, names:'小明\n安安，Jack'});
  const studentId = record.classes[0].students[0].id;
  return {apply, classId, studentId, student:() => record.classes[0].students[0], record:() => record};
}

describe('classroom prize records', () => {
  it('preserves spare stamps when exchanging ten and lets the teacher undo the last action', () => {
    const fixture = classroom();
    const {apply, classId, studentId} = fixture;
    const original = fixture.record();
    for (let i = 0; i < 12; i++) apply({type:'award', classId, studentId, kind:i % 2 ? 'homework' : 'participation'});
    expect(original.classes[0].students[0].history).toEqual([]);
    apply({type:'redeem', classId, studentId});
    expect(prizeBalance(fixture.student())).toEqual({stamps:2, gifts:1});
    expect(validatePrizeRecord(fixture.record())).toBe(true);
    apply({type:'undo', classId, studentId});
    expect(prizeBalance(fixture.student())).toEqual({stamps:12, gifts:0});
    apply({type:'undo', classId, studentId});
    expect(prizeBalance(fixture.student())).toEqual({stamps:11, gifts:0});
  });

  it('keeps classes separate and prevents spending stamps that have not been earned', () => {
    const fixture = classroom();
    const {apply, classId, studentId} = fixture;
    expect(() => apply({type:'redeem', classId, studentId})).toThrow('集满 10');
    apply({type:'award', classId, studentId, kind:'homework'});
    apply({type:'add-class', name:'星期日班'});
    const secondId = fixture.record().selectedClassId;
    apply({type:'add-students', classId:secondId, names:'小明'});
    const second = fixture.record().classes[1].students[0];
    expect(prizeBalance(second)).toEqual({stamps:0, gifts:0});
    expect(prizeBalance(fixture.student()).stamps).toBe(1);
    apply({type:'remove-class', classId:secondId});
    expect(fixture.record().selectedClassId).toBe(classId);
  });

  it('rejects invalid histories and duplicate IDs without erasing valid records', () => {
    const valid = classroom().record();
    const invalid = structuredClone(valid);
    invalid.classes[0].students[0].history.push({id:'invalid', kind:'redeem', at:'2026-11-19T01:00:00.000Z'});
    expect(validatePrizeRecord(invalid)).toBe(false);
    invalid.classes[0].students[0].history = [];
    invalid.classes[0].students[1].id = invalid.classes[0].students[0].id;
    expect(validatePrizeRecord(invalid)).toBe(false);
    expect(validatePrizeRecord(valid)).toBe(true);
  });

  it('serializes updates and reads the latest saved record before a second instance writes', async () => {
    const saved = new Map();
    const storage = {getItem:key => saved.get(key) ?? null, setItem:(key, value) => saved.set(key, value)};
    const first = createPrizeRecordStore({storage, locks:null});
    const second = createPrizeRecordStore({storage, locks:null});
    await first.update({type:'add-class', name:'周六班'});
    const classId = first.get().record.selectedClassId;
    await second.update({type:'add-students', classId, names:'安安'});
    const studentId = second.get().record.classes[0].students[0].id;
    await Promise.all([
      first.update({type:'award', classId, studentId, kind:'homework'}),
      second.update({type:'award', classId, studentId, kind:'participation'}),
    ]);
    const restored = createPrizeRecordStore({storage, locks:null});
    expect(prizeBalance(restored.get().record.classes[0].students[0]).stamps).toBe(2);
  });

  it('retains every new action in memory if browser storage is full, then saves them together on recovery', async () => {
    const saved = new Map();
    let full = false;
    const storage = {
      getItem:key => saved.get(key) ?? null,
      setItem(key, value) { if (full) throw new Error('quota'); saved.set(key, value); },
    };
    const store = createPrizeRecordStore({storage, locks:null});
    await store.update({type:'add-class', name:'周六班'});
    const classId = store.get().record.selectedClassId;
    full = true;
    await store.update({type:'add-students', classId, names:'小明'});
    const studentId = store.get().record.classes[0].students[0].id;
    await store.update({type:'award', classId, studentId, kind:'homework'});
    expect(store.get().warning).toContain('暂存在本页');
    full = false;
    await store.update({type:'award', classId, studentId, kind:'participation'});
    const restored = JSON.parse(saved.get(PRIZE_RECORD_KEY));
    expect(prizeBalance(restored.classes[0].students[0]).stamps).toBe(2);
    expect(store.get().warning).toBe('');
  });

  it('keeps an unreadable original storage value intact while allowing temporary classroom records', async () => {
    const saved = new Map([[PRIZE_RECORD_KEY, '{broken']]);
    const storage = {getItem:key => saved.get(key) ?? null, setItem:(key, value) => saved.set(key, value)};
    const store = createPrizeRecordStore({storage, locks:null});
    await store.update({type:'add-class', name:'临时班'});
    expect(store.get().record.classes[0].name).toBe('临时班');
    expect(saved.get(PRIZE_RECORD_KEY)).toBe('{broken');
    expect(store.get().warning).toContain('本页');
  });
});
