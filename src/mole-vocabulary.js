import {filterCurriculum,textbookForSource,coursesForTextbook,ZHONGWEN_NAME,ZHONGWEN_BOOK_LABELS} from './curriculum.js';
import {getSudokuCandidates} from './sudoku-vocabulary.js';

export function getMolePool({source,stage,lesson,grade=1,type='mixed'}={},questions=[]){
  const textbook=textbookForSource(source);
  const scoped=source==='personal'?questions.filter(q=>!q.textbook&&q.grade===grade):filterCurriculum(questions,{textbook,stage,lesson,scope:'lesson'});
  const course=source==='personal'?null:coursesForTextbook(textbook).find(c=>c.stage===stage&&c.lesson===lesson);
  const found=new Map();
  const add=(word,pinyin='')=>{
    const text=typeof word==='string'?word.normalize('NFC').trim().replace(/^《(.+)》$/u,'$1'):'';
    if(!/^\p{Script=Han}{1,12}$/u.test(text)||found.has(text))return;
    found.set(text,{id:`mole/${source}/${stage??grade}/${lesson??0}/${text}`,word:text,pinyin});
  };
  scoped.forEach(q=>add(q.character,q.pinyin));
  const verified=source==='zhongwen'||source==='paradise';
  if(verified)getSudokuCandidates({source,stage,lesson},questions).words.forEach(w=>add(w.word,w.pinyin));
  else scoped.forEach(q=>(q.words??[]).forEach(word=>add(word)));
  const words=[...found.values()].filter(w=>type==='characters'?[...w.word].length===1:type==='words'?[...w.word].length>1:true);
  const name=source==='zhongwen'?`${ZHONGWEN_NAME} · ${ZHONGWEN_BOOK_LABELS[stage]}`:source==='paradise'?`汉语乐园 · ${stage}`:`中文乐园（新版） · ${stage}`;
  return {words,label:source==='personal'?`个人 / 通用题库 · ${grade}年级`:`${name} · 第${lesson}课 ${course?.title??''}`,
    note:verified?'使用本课生字与已收录教材词表。':source==='personal'?'使用本年级个人字题和已有例词；未收录读音的词不显示拼音。':'使用本课生字和题库已有辅助例词；未收录读音的词不显示拼音。'};
}
