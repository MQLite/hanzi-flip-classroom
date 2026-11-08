import {it,expect} from 'vitest';
import {lessonAppearance} from '../src/lesson-appearance.js';
it('neighboring lesson appearances differ and reopening the same lesson keeps its identity',()=>{
  for(const source of ['paradise','zhongwen','textbook','personal'])for(const stage of ['1A','1','2']){
    const appearances=Array.from({length:12},(_,i)=>lessonAppearance({source,stage,lesson:i+1},'G1'));
    for(let i=1;i<appearances.length;i++){expect(appearances[i].key).not.toBe(appearances[i-1].key);expect(appearances[i].variant).not.toBe(appearances[i-1].variant);}
    expect(new Set(appearances.map(a=>a.variant)).size).toBe(4);expect(lessonAppearance({source,stage,lesson:1},'G1')).toEqual(appearances[0]);
  }
  expect(lessonAppearance({source:'personal'},'G1').key).not.toBe(lessonAppearance({source:'personal'},'G2').key);
});
