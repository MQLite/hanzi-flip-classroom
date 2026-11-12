import {getMolePool} from './mole-vocabulary.js';
import {getLessonSentences} from './lesson-sentences.js';
import {coursesForTextbook, filterCurriculum, textbookForSource} from './curriculum.js';
import {getSudokuCandidates} from './sudoku-vocabulary.js';
import {FORM_CATALOG} from './construction-data.js';

// Share the existing verified single-lesson pool; this game has no nine-word minimum.
export function getPoisonPool(selection,questions=[]){
  const pool=getMolePool({...selection,type:'mixed'},questions);
  const ordered=[...pool.words.filter(w=>w.word.length>1),...pool.words.filter(w=>w.word.length===1)];
  return {...pool,sentences:getLessonSentences(selection,questions),words:ordered.map(word=>({...word,id:word.id.replace(/^mole\//u,'poison/')}))};
}

export function getPoisonChallengePool(selection, questions = []) {
  const pool = getPoisonPool(selection, questions);
  const {source, stage, lesson, grade} = selection;
  const textbook = textbookForSource(source);
  const course = source === 'personal' ? null : coursesForTextbook(textbook).find(item => item.stage === stage && item.lesson === lesson);
  const scoped = source === 'personal' ? questions.filter(question => !question.textbook && question.grade === grade)
    : filterCurriculum(questions, {textbook, stage, lesson, scope:'lesson'});
  const characters = new Set(course?.characters ?? scoped.map(question => question.character));
  const words = pool.words.filter(item => characters.has(item.word) && [...item.word].length === 1);
  const textbookWords = course?.vocabulary ? getSudokuCandidates(selection, questions).words : [];
  const reading = textbookWords.filter(item => item.source.section?.includes('读一读') && [...item.word].length > 1);
  const vocabulary = textbookWords.filter(item => item.source.section !== '课堂补充' && [...item.word].length > 1);
  const existingWords = new Map(pool.words.filter(item => [...item.word].length > 1).map(item => [item.word, item]));
  const examples = [...new Set(scoped.flatMap(question => question.words ?? []))]
    .filter(word => /^\p{Script=Han}{2,12}$/u.test(word))
    .map(word => existingWords.get(word) ?? {word});
  const preferred = reading.length ? reading : vocabulary.length ? vocabulary : examples;
  const extra = preferred.length === 1 ? [...vocabulary, ...examples].find(item => item.word !== preferred[0].word) : undefined;
  const translations = [...preferred.slice(0, 12), ...(extra ? [extra] : [])]
    .map(item => ({...item, id:`poison/translate/${item.word}`}));
  const structures = words.map(word => {
    const form = FORM_CATALOG.characters[word.word];
    const personalQuestion = source === 'personal' ? scoped.find(question => question.character === word.word) : null;
    const type = form?.kind === 'independent' ? '独体字' : source === 'personal' ? personalQuestion?.structure : '';
    const parts = form?.parts.map(part => FORM_CATALOG.components[part.id].name) ?? [];
    return {...word, type, parts};
  });
  const translationLabel = reading.length ? (extra ? '读一读与本课词语' : '读一读') : vocabulary.length ? '本课词语' : source === 'personal' ? '本年级例词' : '本课例词';
  return {...pool, words, translations, structures, translationLabel};
}
