import {it,expect} from 'vitest';
import {getLessonSentences} from '../src/lesson-sentences.js';
import {PARADISE_QUESTIONS,ZHONGWEN_QUESTIONS} from '../src/curriculum.js';
it('uses curated textbook sentences for exactly one lesson without borrowing edited examples',()=>{
  const bank=[...PARADISE_QUESTIONS,...ZHONGWEN_QUESTIONS],before=JSON.stringify(bank);
  for(const selection of [{source:'paradise',stage:'1A',lesson:1},{source:'zhongwen',stage:'1',lesson:2}]){
    const sentences=getLessonSentences(selection,bank.map(q=>({...q,sentence:'这不是课本的句子。'})));
    expect(sentences.length).toBeGreaterThan(0);expect(sentences.every(q=>q.source&&q.sentence!=='这不是课本的句子。')).toBe(true);
    expect(new Set(sentences.map(q=>q.sentence)).size).toBe(sentences.length);
    expect(sentences.some(q=>q.sentence==='我是加拿大人。')).toBe(false);
  }
  expect(JSON.stringify(bank)).toBe(before);
});
it('personal sentences use only current grade, keep teacher text and gracefully accept an empty bank',()=>{
  const bank=[{id:'a',grade:1,sentence:'我爱老师。'},{id:'b',grade:2,sentence:'我爱学校。'},{id:'c',grade:1,sentence:'我爱老师。'},{id:'d',grade:1,sentence:''}];
  expect(getLessonSentences({source:'personal',grade:1},bank).map(q=>q.sentence)).toEqual(['我爱老师。']);
  expect(getLessonSentences({source:'personal',grade:1},[])).toEqual([]);
});
