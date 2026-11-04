import {describe,it,expect} from 'vitest';
import {createQuest,inspectObject,solvePuzzle,deliverLetter,requestHint,restoreQuest,getProgress} from '../src/poetry-quest-core.js';

const sewing={left:'纟',right:'逢',reading:'féng'};
const letter={feeling:'worry',evidence:'late'};
const mirror={unchanged:'accent',changed:'hair'};
const visitor={self:'home',children:'guest',evidence:'unknown'};
function memories(mode='guided'){
  let s=createQuest({mode});
  for(const [id,answer] of [['mirror',mirror],['door',visitor],['wardrobe',sewing],['desk',letter]])s=solvePuzzle(s,id,answer).state;
  return s;
}

describe('poetry quest',()=>{
  it('requires the story evidence before opening a dependent object',()=>{
    const s=createQuest();
    expect(solvePuzzle(s,'desk',letter).ok).toBe(false);
    expect(solvePuzzle(s,'door',visitor).state).toBe(s);
    expect(deliverLetter(s,'motherLetter','mother').ok).toBe(false);
    expect(getProgress(s)).toEqual({done:0,total:5,complete:false});
  });
  it('keeps wrong character components or readings from recovering the sewing memory',()=>{
    const s=createQuest();
    for(const answer of [{...sewing,left:'氵'},{...sewing,right:'夆'},{...sewing,reading:'fèng'}]){
      const result=solvePuzzle(s,'wardrobe',answer);expect(result.ok).toBe(false);expect(result.state).toBe(s);
    }
    const next=solvePuzzle(s,'wardrobe',sewing).state;
    expect(next.inventory).toContain('needle');expect(next.solved).toEqual(['wardrobe']);
    expect(s.solved).toEqual([]);
  });
  it('allows the return-home branch before the sewing branch without awarding duplicate memories',()=>{
    const s=memories();expect(getProgress(s).done).toBe(4);
    expect(s.inventory).toEqual(expect.arrayContaining(['needle','motherLetter','route','homeLetter']));
    expect(solvePuzzle(s,'door',visitor).state).toBe(s);
    expect(new Set(s.inventory).size).toBe(s.inventory.length);
  });
  it('requires text evidence in challenge mode in addition to assigning the two perspectives',()=>{
    const start=solvePuzzle(createQuest({mode:'challenge'}),'mirror',mirror).state;
    expect(solvePuzzle(start,'door',{self:'home',children:'guest'}).ok).toBe(false);
    expect(solvePuzzle(start,'door',{...visitor,evidence:'hair'}).ok).toBe(false);
    expect(solvePuzzle(start,'door',visitor).ok).toBe(true);
    const guided=solvePuzzle(createQuest(),'mirror',mirror).state;
    expect(solvePuzzle(guided,'door',{self:'home',children:'guest'}).ok).toBe(true);
  });
  it('delivers each letter only to its recipient and completes after both letters',()=>{
    let s=memories();
    expect(deliverLetter(s,'motherLetter','home').ok).toBe(false);
    s=deliverLetter(s,'homeLetter','home').state;
    expect(getProgress(s)).toEqual({done:4,total:5,complete:false});
    expect(deliverLetter(s,'homeLetter','home').state).toBe(s);
    s=deliverLetter(s,'motherLetter','mother').state;
    expect(getProgress(s)).toEqual({done:5,total:5,complete:true});
    expect(deliverLetter(s,'motherLetter','mother').state).toBe(s);
  });
  it('records exploration and caps hints without counting them as solved',()=>{
    let s=inspectObject(createQuest(),'mirror');
    s=inspectObject(s,'mirror');expect(s.visited).toEqual(['mirror']);
    s=requestHint(requestHint(requestHint(s,'mirror'),'mirror'),'mirror');
    expect(s.hints.mirror).toBe(2);expect(getProgress(s).done).toBe(0);
    expect(inspectObject(s,'not-an-object')).toBe(s);
  });
  it('round trips valid progress and rejects corrupted or impossible saves',()=>{
    let s=memories('challenge');s=deliverLetter(s,'motherLetter','mother').state;
    expect(restoreQuest(JSON.stringify(s))).toEqual(s);
    for(const text of ['not json','null','{}',JSON.stringify({...s,solved:['desk']}),JSON.stringify({...s,mode:'other'}),JSON.stringify({...s,deliveries:{motherLetter:'home'}})])expect(restoreQuest(text)).toBe(null);
    const complete=deliverLetter(s,'homeLetter','home').state;
    expect(getProgress(restoreQuest(JSON.stringify(complete))).complete).toBe(true);
  });
});
