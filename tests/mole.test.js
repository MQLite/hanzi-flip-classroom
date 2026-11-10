import {describe,it,expect} from 'vitest';
import {createMoleState,hitMole,settleMole,finishMoleHits} from '../src/mole-core.js';
import {getMolePool} from '../src/mole-vocabulary.js';
import {PARADISE_QUESTIONS,ZHONGWEN_QUESTIONS,TEXTBOOK_QUESTIONS} from '../src/curriculum.js';

const words=Array.from({length:12},(_,i)=>({id:`word-${i}`,word:['一','二','三','四','五','六','七','八','九','十','十一','十二'][i],pinyin:''}));
const create=()=>createMoleState({words,teamNames:['甲组','乙组'],random:()=>.99});
describe('teacher-controlled mole round',()=>{
  it('samples at most nine distinct words and leaves the lesson pool available for another round',()=>{
    const input=Array.from({length:20},(_,i)=>({id:'w'+i,word:'词'+i}));
    const state=createMoleState({words:[...input,input[0]],random:()=>.99});
    expect(state.words).toHaveLength(9);expect(new Set(state.words.map(w=>w.word)).size).toBe(9);
    expect(input).toHaveLength(20);
  });
  it('keeps nine readable moles up until the teacher confirms and only credits a hit once',()=>{
    const initial=create();expect(initial.holes.filter(Boolean)).toHaveLength(9);
    const id=initial.holes[2].id;
    const hit=hitMole(initial,{slot:2,wordId:id,teamId:'team-2'});
    expect(hit.holes[2].status).toBe('hit');expect(hit.scores['team-2']).toBe(1);
    expect(hitMole(hit,{slot:2,wordId:id,teamId:'team-1'})).toBe(hit);
    const settled=settleMole(hit,2,id);expect(settled.holes[2]).toBe(null);
    expect(hitMole(settled,{slot:2,wordId:id,teamId:'team-1'})).toBe(settled);
    expect(initial.holes[2].status).toBe('up');expect(initial.scores['team-2']).toBe(0);
  });
  it('completes only after every entry and settles pending animations safely on mode changes',()=>{
    let state=create();
    while(state.phase==='active'){
      const slot=state.holes.findIndex(h=>h?.status==='up'),id=state.holes[slot].id;
      state=finishMoleHits(hitMole(state,{slot,wordId:id,teamId:'team-1'}));
    }
    expect(state.phase).toBe('complete');expect(state.hits).toHaveLength(9);
    expect(new Set(state.hits.map(h=>h.id)).size).toBe(9);expect(state.scores['team-1']).toBe(9);
    expect(state.holes.every(h=>h===null)).toBe(true);
    expect(hitMole(state,{slot:0,wordId:'word-0',teamId:'team-1'})).toBe(state);
    expect(createMoleState({words:[]}).phase).toBe('empty');
  });
  it('ignores invalid controls and snapshots incoming vocabulary',()=>{
    const input=[{id:'one',word:'一',pinyin:'yī'}],state=createMoleState({words:input});input[0].word='错';
    expect(state.words[0].word).toBe('一');
    expect(hitMole(state,{slot:9,wordId:'one',teamId:'team-1'})).toBe(state);
    expect(hitMole(state,{slot:0,wordId:'one',teamId:'unknown'})).toBe(state);
    expect(settleMole(state,0,'one')).toBe(state);
  });
});
describe('existing lesson vocabulary',()=>{
  it('combines the current lesson characters and verified phrases without pulling another lesson',()=>{
    const pool=getMolePool({source:'zhongwen',stage:'2',lesson:1},ZHONGWEN_QUESTIONS);
    expect(pool.words.map(w=>w.word)).toEqual(expect.arrayContaining(['在','教','汉','语','写','歌','画','教汉语','写作业','在花园']));
    expect(pool.words.some(w=>w.word==='火山')).toBe(false);
    expect(new Set(pool.words.map(w=>w.word)).size).toBe(pool.words.length);
    const chars=getMolePool({source:'zhongwen',stage:'2',lesson:1,type:'characters'},ZHONGWEN_QUESTIONS);
    expect(chars.words.map(w=>w.word)).toEqual(['在','教','汉','语','写','歌','画']);
    expect(getMolePool({source:'zhongwen',stage:'2',lesson:1,type:'words'},ZHONGWEN_QUESTIONS).words.every(w=>[...w.word].length>1)).toBe(true);
  });
  it('uses existing Paradise vocabulary, revised-edition examples and personal entries',()=>{
    expect(getMolePool({source:'paradise',stage:'2A',lesson:1},PARADISE_QUESTIONS).words.some(w=>w.word==='新西兰')).toBe(true);
    expect(getMolePool({source:'textbook',stage:'1A',lesson:1},TEXTBOOK_QUESTIONS).words.some(w=>w.word.length>1)).toBe(true);
    const personal=[{id:'p',character:'球',pinyin:'qiú',grade:1,words:['篮球','足球']},{id:'x',character:'马',pinyin:'mǎ',grade:2,words:['白马']}];
    expect(getMolePool({source:'personal',grade:1},personal).words.map(w=>w.word)).toEqual(['球','篮球','足球']);
    const poems=getMolePool({source:'zhongwen',stage:'5',lesson:9},ZHONGWEN_QUESTIONS);
    expect(poems.words.map(w=>w.word)).toEqual(expect.arrayContaining(['慈','缝','童']));
    expect(poems.label).toContain('第五册');
  });
});
