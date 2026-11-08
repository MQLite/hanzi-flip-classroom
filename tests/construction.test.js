import {describe,it,expect} from 'vitest';
import {createPuzzleState,selectPuzzlePart,removePuzzlePart,checkPuzzle,createStrokeState,placeStroke,undoStroke,nextStrokeCharacter} from '../src/construction-core.js';

const targets=[{character:'明',parts:[{id:'日'},{id:'月'}]},{character:'好',parts:[{id:'女'},{id:'子'}]},{character:'林',parts:[{id:'木'},{id:'木'}]},{character:'呆',parts:[{id:'口'},{id:'木'}]},{character:'杏',parts:[{id:'木'},{id:'口'}]}];
const choose=(state,...ids)=>ids.reduce(selectPuzzlePart,state);
const chars=[{character:'三',names:['横','横','横']},{character:'十',names:['横','竖']}];
const geometry={medians:[[[100,700],[800,700]],[[200,450],[700,450]],[[80,180],[850,180]]]};
describe('discovery component puzzle',()=>{
  it('does not expose an answer before a valid combination',()=>{let s=createPuzzleState(targets);s=choose(s,'日');expect(s.revealed).toEqual([]);s=checkPuzzle(s);expect(s.feedback).toBe('retry');expect(s.revealed).toEqual([]);expect(s.found).toEqual([]);});
  it('matches a multiset, requires repeated parts and deduplicates collection',()=>{let s=createPuzzleState(targets);s=checkPuzzle(choose(s,'木'));expect(s.found).toEqual([]);s=checkPuzzle(choose(createPuzzleState(targets),'木','木'));expect(s.found).toEqual(['林']);s=checkPuzzle(choose(s,'木','木'));expect(s.found).toEqual(['林']);});
  it('reveals all legitimate lesson answers and supports removing a selection',()=>{let s=choose(createPuzzleState(targets),'木','女','口');s=removePuzzlePart(s,1);s=checkPuzzle(s);expect(s.revealed).toEqual(['呆','杏']);expect(s.found).toEqual(['呆','杏']);expect(s.selected).toEqual([]);});
  it('ignores unknown parts and excessive selection without mutation',()=>{const s=createPuzzleState(targets);expect(selectPuzzlePart(s,'fake')).toBe(s);const filled=choose(s,'木','木','木','木');expect(selectPuzzlePart(filled,'木')).toBe(filled);expect(s.selected).toEqual([]);});
});
describe('canonical stroke placement',()=>{
  it('requires next stroke name and exact location, including repeated names',()=>{const s=createStrokeState(chars);expect(placeStroke(s,{name:'竖',point:[400,700]},geometry).placed).toBe(0);expect(placeStroke(s,{name:'横',point:[400,450]},geometry).placed).toBe(0);const next=placeStroke(s,{name:'横',point:[450,700]},geometry);expect(next.placed).toBe(1);expect(s.placed).toBe(0);expect(placeStroke(next,{name:'横',point:[450,700]},geometry).placed).toBe(1);});
  it('rejects malformed coordinates and missing geometry',()=>{const s=createStrokeState(chars);for(const point of [[NaN,700],[0,Infinity],null])expect(placeStroke(s,{name:'横',point},geometry).placed).toBe(0);expect(placeStroke(s,{name:'横',point:[300,700]},null).placed).toBe(0);});
  it('opens the final review only after every character is completed',()=>{let s=createStrokeState([chars[0]]);for(const y of [700,450,180])s=placeStroke(s,{name:'横',point:[400,y]},geometry);expect(s.review).toBe(true);});
  it('undoes, records completion only once and retains other character progress',()=>{let s=createStrokeState(chars);for(const y of [700,450,180])s=placeStroke(s,{name:'横',point:[400,y]},geometry);expect(s.completed).toEqual(['三']);expect(placeStroke(s,{name:'横',point:[400,180]},geometry)).toBe(s);s=undoStroke(s);expect(s.completed).toEqual([]);expect(s.placed).toBe(2);s=nextStrokeCharacter(s,1);expect(s.index).toBe(1);expect(s.placed).toBe(0);s=nextStrokeCharacter(s,-1);expect(s.placed).toBe(2);});
});
