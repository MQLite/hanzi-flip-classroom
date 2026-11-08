import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import {evaluateHandwritingStroke,createHandwritingState,submitHandwritingStroke,undoHandwritingStroke,rewriteHandwritingCharacter,navigateHandwriting} from '../src/handwriting-core.js';
const horizontal=[[100,700],[800,700]],vertical=[[450,850],[450,180]],hook=[[400,800],[400,200],[340,240]];
const characters=[{character:'十',names:['横','竖']},{character:'一',names:['横']}];
const geometry={medians:[horizontal,vertical]};
describe('trace matching and reference scores',()=>{
  it('accepts modest finger offset and wobble without requiring a brush outline match',()=>{
    const offset=[[115,765],[450,762],[790,765]],wobble=Array.from({length:31},(_,i)=>[100+i*700/30,745+Math.sin(i*Math.PI/3)*22]);
    for(const points of [offset,wobble]){const result=evaluateHandwritingStroke(points,horizontal);expect(result.accepted).toBe(true);expect(result.score).toBeGreaterThanOrEqual(85);expect(result.score).toBeLessThan(98);}
  });
  it('allows natural proportion differences while retaining a meaningful score gradient',()=>{
    const steady=evaluateHandwritingStroke(horizontal,horizontal),shorter=evaluateHandwritingStroke([[170,700],[730,700]],horizontal),shifted=evaluateHandwritingStroke([[100,770],[800,770]],horizontal);
    expect(shorter.accepted).toBe(true);expect(shorter.score).toBeGreaterThanOrEqual(88);expect(shorter.score).toBeLessThan(steady.score);
    expect(shifted.accepted).toBe(true);expect(shifted.score).toBeGreaterThanOrEqual(85);expect(shifted.score).toBeLessThan(steady.score);
    expect(evaluateHandwritingStroke([[100,840],[800,840]],horizontal).accepted).toBe(false);
    expect(evaluateHandwritingStroke([[100,800],[650,300]],[[100,800],[100,300],[650,300]]).accepted).toBe(false);
  });
  it('gives canonical traces100 and near traces a lower but accepted score',()=>{
    const exact=evaluateHandwritingStroke(horizontal,horizontal),near=evaluateHandwritingStroke([[110,725],[430,719],[795,725]],horizontal);
    expect(exact.accepted).toBe(true);expect(exact.score).toBe(100);expect(near.accepted).toBe(true);expect(near.score).toBeGreaterThan(70);expect(near.score).toBeLessThan(100);
  });
  it('rejects backwards, shifted, partial, tap and repeated scribble paths',()=>{
    for(const path of [[...horizontal].reverse(),[[100,450],[800,450]],[[100,700],[280,700]],[[400,700],[400,700]],[[100,700],[800,700],[100,700],[800,700]]])expect(evaluateHandwritingStroke(path,horizontal).accepted,JSON.stringify(path)).toBe(false);
    expect(evaluateHandwritingStroke([[400,800],[400,200]],hook).accepted).toBe(false);
  });
  it('rejects a short dot drawn backwards even when both ends fit the finger tolerance',()=>{
    const median=[[490,562],[531,524]],backwards=[...median].reverse();
    expect(evaluateHandwritingStroke(median,median).accepted).toBe(true);
    expect(evaluateHandwritingStroke(backwards,median)).toMatchObject({accepted:false,reason:'direction'});
    const record=JSON.parse(fs.readFileSync(new URL('../src/data/character-forms.json',import.meta.url))).characters['澳'];
    const geometry=JSON.parse(fs.readFileSync(new URL('../public/strokes/澳.json',import.meta.url)));
    let state=createHandwritingState([{character:'澳',names:record.names}]);
    for(const path of geometry.medians.slice(0,6))state=submitHandwritingStroke(state,path,geometry);
    const next=submitHandwritingStroke(state,backwards,geometry);expect(next.placed).toBe(6);expect(next.lastName).toBeNull();expect(next.feedback).toBe('wrong-direction');
  });
  it('requires a visible terminal hook even when a nearby shortened endpoint is within tolerance',()=>{
    const geometry=JSON.parse(fs.readFileSync(new URL('../public/strokes/师.json',import.meta.url))),median=geometry.medians[4];
    expect(evaluateHandwritingStroke(median.map(([x,y])=>[x+15,y+15]),median).accepted).toBe(true);
    expect(evaluateHandwritingStroke(median.slice(0,-3),median).accepted).toBe(false);
    const curved=JSON.parse(fs.readFileSync(new URL('../public/strokes/熊.json',import.meta.url))),hook=curved.medians[7];
    expect(evaluateHandwritingStroke(hook.map(([x,y])=>[x+15,y+15]),hook).accepted).toBe(true);
    expect(evaluateHandwritingStroke(hook.slice(0,-2),hook).accepted).toBe(false);
    const names=JSON.parse(fs.readFileSync(new URL('../src/data/character-forms.json',import.meta.url))).characters['熊'].names;
    let state=createHandwritingState([{character:'熊',names}]);for(const path of curved.medians.slice(0,7))state=submitHandwritingStroke(state,path,curved);
    const next=submitHandwritingStroke(state,hook.slice(0,-2),curved);expect(next.placed).toBe(7);expect(next.lastName).toBeNull();expect(next.feedback).toBe('wrong-direction');
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
  it('keeps stroke order independent of a lenient numerical grade',()=>{
    const state=createHandwritingState([{character:'二',names:['横','横']}]),lower=[[100,680],[800,680]],next=submitHandwritingStroke(state,lower,{medians:[horizontal,lower]});
    expect(next.placed).toBe(0);expect(next.feedback).toBe('wrong-order');
  });
});
