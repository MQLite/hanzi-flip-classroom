import {getMolePool} from './mole-vocabulary.js';

// Share the existing verified single-lesson pool; this game has no nine-word minimum.
export function getPoisonPool(selection,questions=[]){
  const pool=getMolePool({...selection,type:'mixed'},questions);
  const ordered=[...pool.words.filter(w=>w.word.length>1),...pool.words.filter(w=>w.word.length===1)];
  return {...pool,words:ordered.map(word=>({...word,id:word.id.replace(/^mole\//u,'poison/')}))};
}
