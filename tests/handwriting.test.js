import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import {evaluateHandwritingStroke,createHandwritingState,submitHandwritingStroke,undoHandwritingStroke,rewriteHandwritingCharacter,navigateHandwriting} from '../src/handwriting-core.js';
const horizontal=[[100,700],[800,700]],vertical=[[450,850],[450,180]],hook=[[400,800],[400,200],[340,240]];
const characters=[{character:'十',names:['横','竖']},{character:'一',names:['横']}];
const geometry={medians:[horizontal,vertical]};
describe('trace matching and reference scores',()=>{
  it('gives canonical traces100 and near traces a lower but accepted score',()=>{
    const exact=evaluateHandwritingStroke(horizontal,horizontal),near=evaluateHandwritingStroke([[110,725],[430,719],[795,725]],horizontal);
    expect(exact.accepted).toBe(true);expect(exact.score).toBe(100);expect(near.accepted).toBe(true);expect(near.score).toBeGreaterThan(70);expect(near.score).toBeLessThan(100);
  });
  it('rejects backwards, shifted, partial, tap and repeated scribble paths',()=>{
    for(const path of [[...horizontal].reverse(),[[100,450],[800,450]],[[100,700],[280,700]],[[400,700],[400,700]],[[100,700],[800,700],[100,700],[800,700]]])expect(evaluateHandwritingStroke(path,horizontal).accepted,JSON.stringify(path)).toBe(false);
    expect(evaluateHandwritingStroke([[400,800],[400,200]],hook).accepted).toBe(false);
  });
  it('handles malformed/oversized input without throwing',()=>{
    for(const points of [null,[],[[NaN,1],[4,6]],[[1,Infinity]],'bad',Array.from({length:5000},()=>[1,1])])expect(evaluateHandwritingStroke(points,horizontal).accepted).toBe(false);
  });
  it('accepts every current canonical stroke, including dots, hooks and multibend strokes',()=>{
    const catalog=JSON.parse(fs.readFileSync(new URL('../src/data/character-forms.json',import.meta.url)));let count=0;
    for(const ch of Object.keys(catalog.characters)){const data=JSON.parse(fs.readFileSync(new URL(`../public/strokes/${ch}.json`,import.meta.url)));data.medians.forEach((median,index)=>{const result=evaluateHandwritingStroke(median,median);expect(result.accepted,`${ch} ${index+1}`).toBe(true);expect(result.score,`${ch} ${index+1}`).toBe(100);count++;});}
    expect(count).toBe(3795);
  });
});
describe('independent handwriting sessions',()=>{
  it('requires the next stroke and only advances/emits the correct name after acceptance',()=>{
    const state=createHandwritingState(characters),wrong=submitHandwritingStroke(state,vertical,geometry);expect(wrong.placed).toBe(0);expect(wrong.feedback).toBe('wrong-order');expect(wrong.lastName).toBe(null);
    const next=submitHandwritingStroke(wrong,horizontal,geometry);expect(next.placed).toBe(1);expect(next.lastName).toBe('横');expect(next.scores[0]).toBe(null);expect(state.drawings[0]).toEqual([]);expect(state.placed).toBe(0);
  });
  it('shows each completed character score and keeps it visible before optional lesson review',()=>{
    let state=createHandwritingState(characters);state=submitHandwritingStroke(state,horizontal,geometry);state=submitHandwritingStroke(state,vertical,geometry);expect(state.scores[0]).toBe(100);expect(state.completed).toEqual(['十']);expect(state.review).toBe(false);
    state=navigateHandwriting(state,1);expect(state.placed).toBe(0);state=submitHandwritingStroke(state,horizontal,{medians:[horizontal]});expect(state.scores).toEqual([100,100]);expect(state.completed).toEqual(['十','一']);expect(state.review).toBe(false);
    state=navigateHandwriting(state,-1);expect(state.placed).toBe(2);expect(state.scores[0]).toBe(100);
  });
  it('undoes and rewrites only the current character without duplicating completion',()=>{
    let state=createHandwritingState(characters);state=submitHandwritingStroke(state,horizontal,geometry);state=submitHandwritingStroke(state,vertical,geometry);const complete=state;
    state=undoHandwritingStroke(state);expect(state.placed).toBe(1);expect(state.scores[0]).toBe(null);expect(state.completed).toEqual([]);expect(complete.scores[0]).toBe(100);
    state=submitHandwritingStroke(state,vertical,geometry);state=navigateHandwriting(state,1);state=submitHandwritingStroke(state,horizontal,{medians:[horizontal]});state=rewriteHandwritingCharacter(state);expect(state.placed).toBe(0);expect(state.scores).toEqual([100,null]);expect(state.completed).toEqual(['十']);
  });
  it('does not penalize retry count or mutate a completed score on extra input',()=>{
    let state=createHandwritingState([characters[1]]);for(let i=0;i<3;i++)state=submitHandwritingStroke(state,vertical,{medians:[horizontal]});state=submitHandwritingStroke(state,horizontal,{medians:[horizontal]});expect(state.scores[0]).toBe(100);expect(submitHandwritingStroke(state,horizontal,{medians:[horizontal]})).toBe(state);
  });
  it('does not accept a nearby parallel later stroke as the current stroke',()=>{
    const state=createHandwritingState([{character:'二',names:['横','横']}]),lower=[[100,660],[800,660]],next=submitHandwritingStroke(state,lower,{medians:[horizontal,lower]});
    expect(next.placed).toBe(0);expect(next.feedback).toBe('wrong-order');expect(next.lastName).toBe(null);
  });
});
