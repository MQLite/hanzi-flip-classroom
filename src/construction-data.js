import catalog from './data/character-forms.json' with {type:'json'};
import {getMolePool} from './mole-vocabulary.js';
import {coursesForTextbook,textbookForSource,TEXTBOOK_QUESTIONS,PARADISE_QUESTIONS,ZHONGWEN_QUESTIONS} from './curriculum.js';

export const FORM_CATALOG=catalog;
export const STROKE_NAMES=catalog.strokeNames;
const originals=[...TEXTBOOK_QUESTIONS,...PARADISE_QUESTIONS,...ZHONGWEN_QUESTIONS];
const idsFor=record=>[...(record?.parts??[]).map(p=>p.id),...(record?.wholeId?[record.wholeId]:[])];

export function getConstructionPool(selection,questions,grade=1){
  const pool=getMolePool({...selection,grade,type:'characters'},questions);
  const characters=[],unsupported=[];
  for(const word of pool.words){const record=catalog.characters[word.word];if(record)characters.push({...record,character:word.word,pinyin:word.pinyin});else unsupported.push(word.word);}
  const puzzles=characters.filter(c=>c.parts.length>1);
  const components=[...new Set(puzzles.flatMap(c=>c.parts.map(p=>p.id)))].map(id=>catalog.components[id]);
  const seen=new Set();
  if(selection.source!=='personal'){
    const textbook=textbookForSource(selection.source),courses=coursesForTextbook(textbook);
    const index=courses.findIndex(c=>c.stage===selection.stage&&c.lesson===selection.lesson);
    for(const course of courses.slice(0,Math.max(0,index))){
      const prior=getMolePool({source:selection.source,stage:course.stage,lesson:course.lesson,grade,type:'characters'},originals);
      for(const word of prior.words)idsFor(catalog.characters[word.word]).forEach(id=>seen.add(id));
    }
  }
  return {characters,puzzles,components,newComponents:components.filter(c=>!seen.has(c.id)),label:pool.label,unsupported,
    independent:characters.filter(c=>c.kind==='independent').map(c=>c.character),
    excluded:characters.filter(c=>!c.parts.length&&c.kind!=='independent').map(c=>c.character),
    introductionLabel:selection.source==='personal'?'本轮部件 · English':'本课新部件 · English'};
}
