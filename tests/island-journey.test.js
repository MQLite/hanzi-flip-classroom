import {describe,it,expect} from 'vitest';
import {GAME_ORDER} from '../src/game-order.js';
import {createJourney,completeJourneyStage,advanceJourney,pauseJourney,resumeJourney,journeyProgress,courseKey} from '../src/island-journey-core.js';
import {getJourneyAvailability,isJourneyStageComplete} from '../src/island-journey-data.js';
import {loadJourneys,saveJourney,JOURNEY_KEY} from '../src/island-journey-storage.js';
import {ZHONGWEN_QUESTIONS} from '../src/curriculum.js';
const course={source:'zhongwen',stage:'1',lesson:1,grade:1};
const availability=GAME_ORDER.map(g=>({...g,available:['flip','mole'].includes(g.id),reason:'本课未设置'}));
const start=()=>createJourney({course,availability,runId:'test-run'});
describe('ordered lesson journey',()=>{
 it('requires native current-stage completion, skips unavailable islands and is idempotent',()=>{
  const a=start();expect(a.stages.map(s=>s.id)).toEqual(GAME_ORDER.map(g=>g.id));expect(advanceJourney(a)).toBe(a);
  expect(completeJourneyStage(a,'mole')).toBe(a);const b=completeJourneyStage(a,'flip');expect(completeJourneyStage(b,'flip')).toBe(b);
  expect(journeyProgress(b)).toMatchObject({completed:1,total:2,next:'mole'});
  const c=advanceJourney(b);expect(c.stages[c.index].id).toBe('mole');const d=completeJourneyStage(c,'mole');
  expect(d.status).toBe('complete');expect(d.completed).toEqual(['flip','mole']);expect(d.runId).toBe(a.runId);expect(a.completed).toEqual([]);
 });
 it('pauses independent play, resumes without granting progress and distinguishes courses',()=>{
  const a=start(),paused=pauseJourney(a);expect(paused.status).toBe('paused');expect(completeJourneyStage(paused,'flip')).toBe(paused);
  expect(resumeJourney(paused).status).toBe('active');expect(resumeJourney(paused).completed).toEqual([]);
  expect(courseKey(course)).not.toBe(courseKey({...course,lesson:2}));expect(courseKey({...course,source:'personal'})).not.toBe(courseKey(course));
 });
 it('does not celebrate an all-skipped course',()=>{
  const s=createJourney({course,availability:availability.map(g=>({...g,available:false})),runId:'empty'});
  expect(s.status).toBe('empty');expect(journeyProgress(s)).toMatchObject({total:0,complete:false});
 });
});
describe('native completion gates',()=>{
 it('recognizes all eleven games and refuses their partial states',()=>{
  const completed={flip:{session:{phase:'complete'}},mole:{moleState:{phase:'complete',holes:[null]}},maze:{mazeState:{phase:'complete'}},
   puzzle:{puzzleState:{targets:[{character:'明'}],found:['明']}},strokes:{strokeInputMode:'write',handwritingState:{characters:[{character:'一'}],completed:['一']}},
   workshop:{workshopState:{phase:'complete'}},poison:{poisonState:{phase:'complete',antidoteStatus:'skipped'}},building:{buildingState:{phase:'restored'}},
   sudoku:{sudokuState:{phase:'complete'}},train:{session:{phase:'complete',departure:null}},explore:{explorationComplete:true}};
  for(const {id} of GAME_ORDER){expect(isJourneyStageComplete(id,{}),id).toBe(false);expect(isJourneyStageComplete(id,completed[id]),id).toBe(true);}
  expect(isJourneyStageComplete('mole',{moleState:{phase:'complete',holes:[{status:'hit'}]}})).toBe(false);
  expect(isJourneyStageComplete('poison',{poisonState:{phase:'complete',antidoteStatus:'available'}})).toBe(false);
  expect(isJourneyStageComplete('strokes',{strokeState:{characters:[{}],completed:[],review:true}})).toBe(false);
  expect(isJourneyStageComplete('building',{buildingState:{phase:'built',sentence:{sentence:'你好'}}})).toBe(false);
  expect(isJourneyStageComplete('building',{buildingState:{phase:'built',sentence:null}})).toBe(true);
  expect(isJourneyStageComplete('building',{buildingState:{phase:'cleared',sentence:{sentence:'你好'}}})).toBe(true);
  expect(isJourneyStageComplete('workshop',{workshopState:{phase:'complete'},workshopTransition:{outcome:'correct'}})).toBe(false);
 });
 it('uses actual lesson availability, including independent-only puzzles and missing exploration',()=>{
  const rows=getJourneyAvailability(course,ZHONGWEN_QUESTIONS,1);expect(rows.find(r=>r.id==='flip').available).toBe(true);
  expect(rows.find(r=>r.id==='explore')).toMatchObject({available:false,reason:expect.any(String)});
  expect(getJourneyAvailability({...course,lesson:3},ZHONGWEN_QUESTIONS,1).find(r=>r.id==='explore').available).toBe(true);
  const empty=getJourneyAvailability({source:'personal'},[],1);expect(empty.every(r=>!r.available)).toBe(true);
 });
});
describe('isolated validated persistence',()=>{
 const memory=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),map};};
 it('preserves course/run and never writes the question bank',()=>{
  const storage=memory(),state=completeJourneyStage(start(),'flip');storage.map.set('hanzi-flip.question-bank','untouched');
  expect(saveJourney(state,storage)).toBe(true);expect(loadJourneys(storage)[0]).toEqual(state);
  expect(storage.map.get('hanzi-flip.question-bank')).toBe('untouched');
  const other=createJourney({course:{...course,lesson:2},availability,runId:'other'});saveJourney(other,storage);expect(loadJourneys(storage)).toHaveLength(2);
 });
 it('rejects corrupt, invalid and oversized data and tolerates blocked storage',()=>{
  const storage=memory();for(const raw of ['{',JSON.stringify([{...start(),index:999}]),JSON.stringify([{...start(),completed:['explore']}]),'x'.repeat(200001)]){
   storage.map.set(JOURNEY_KEY,raw);expect(loadJourneys(storage)).toEqual([]);
  }
  const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};expect(loadJourneys(blocked)).toEqual([]);expect(saveJourney(start(),blocked)).toBe(false);
  for(let i=0;i<35;i++)saveJourney(createJourney({course:{...course,lesson:i+1},availability,runId:'r'+i}),storage);
  expect(loadJourneys(storage).length).toBeLessThanOrEqual(24);
 });
});
