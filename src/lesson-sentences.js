import {filterCurriculum,textbookForSource} from './curriculum.js';
import {getParadiseTrainQuestions} from './paradise-train.js';
import {getZhongwenTrainQuestions} from './zhongwen-train.js';

// Verified textbook excerpts remain independent of editable character-card examples.
export function getLessonSentences(selection={},questions=[]){
  const scope={...selection,scope:'lesson'};
  const records=selection.source==='paradise'?getParadiseTrainQuestions(scope):selection.source==='zhongwen'?getZhongwenTrainQuestions(scope):selection.source==='personal'?questions.filter(q=>!q.textbook&&q.grade===(selection.grade??1)):filterCurriculum(questions,{...scope,textbook:textbookForSource(selection.source)});
  const seen=new Set();return records.flatMap(q=>{
    const sentence=typeof q.sentence==='string'?q.sentence.normalize('NFC').trim():'';
    if(!sentence||sentence.length>160||seen.has(sentence))return [];seen.add(sentence);
    const origin=q.trainSource,source=origin?[origin.section,origin.title,origin.printedPage?`教材第${origin.printedPage}页`:''].filter(Boolean).join(' · '):'本课题库例句';
    return [{id:q.id,sentence,source}];
  });
}
