import {getMolePool} from './mole-vocabulary.js';
import {getLessonSentences} from './lesson-sentences.js';
import {coursesForTextbook, filterCurriculum, textbookForSource} from './curriculum.js';
import {getSudokuCandidates} from './sudoku-vocabulary.js';

const PARADISE_TIME_WORDS = [
  ['早上', 'zǎo shang'], ['几点', 'jǐ diǎn'], ['半', 'bàn'], ['十二点', 'shí èr diǎn'], ['点', 'diǎn'],
  ['八点半', 'bā diǎn bàn'], ['晚上', 'wǎn shang'], ['现在', 'xiàn zài'], ['两点', 'liǎng diǎn'], ['六点', 'liù diǎn'],
];
const PARADISE_TIME_READING = [
  ['九只', 'jiǔ zhī'], ['小', 'xiǎo'], ['绵羊', 'mián yáng'], ['戴着', 'dài zhe'], ['小铃铛', 'xiǎo líng dang'],
  ['两只', 'liǎng zhī'], ['在', 'zài'], ['山上', 'shān shàng'], ['几只', 'jǐ zhī'], ['下山冈', 'xià shān gāng'],
];
const PARADISE_TIME_REVIEW = new Set(['早上', '几点', '半', '点', '晚上', '现在', '两点', '小', '在', '几只']);
const paradiseTimeCards = entries => entries.map(([word, pinyin]) => ({id:`poison/paradise/2A/3/${word}`, word, pinyin}));

// Share the existing verified single-lesson pool; this game has no nine-word minimum.
export function getPoisonPool(selection,questions=[]){
  const pool=getMolePool({...selection,type:'mixed'},questions);
  const ordered=[...pool.words.filter(w=>w.word.length>1),...pool.words.filter(w=>w.word.length===1)];
  return {...pool,sentences:getLessonSentences(selection,questions),words:ordered.map(word=>({...word,id:word.id.replace(/^mole\//u,'poison/')}))};
}

export function getPoisonChallengePool(selection, questions = []) {
  const pool = getPoisonPool(selection, questions);
  const {source, stage, lesson, grade} = selection;
  if (source === 'paradise' && stage === '2A' && lesson === 3) {
    const words = paradiseTimeCards(PARADISE_TIME_WORDS);
    const readingWords = paradiseTimeCards(PARADISE_TIME_READING);
    const reviewWords = [...words, ...readingWords].filter(card => PARADISE_TIME_REVIEW.has(card.word));
    return {...pool, words, readingWords, reviewWords};
  }
  const textbook = textbookForSource(source);
  const course = source === 'personal' ? null : coursesForTextbook(textbook).find(item => item.stage === stage && item.lesson === lesson);
  const scoped = source === 'personal' ? questions.filter(question => !question.textbook && question.grade === grade)
    : filterCurriculum(questions, {textbook, stage, lesson, scope:'lesson'});
  const characters = new Set(course?.characters ?? scoped.map(question => question.character));
  const characterCards = pool.words.filter(item => characters.has(item.word) && [...item.word].length === 1);
  const textbookWords = course?.vocabulary ? getSudokuCandidates(selection, questions).words : [];
  const reading = textbookWords.filter(item => item.source.section?.includes('读一读') && [...item.word].length > 1);
  const vocabulary = textbookWords.filter(item => item.source.section !== '课堂补充' && [...item.word].length > 1);
  const existingWords = new Map(pool.words.filter(item => [...item.word].length > 1).map(item => [item.word, item]));
  const examples = [...new Set(scoped.flatMap(question => question.words ?? []))]
    .filter(word => /^\p{Script=Han}{2,12}$/u.test(word))
    .map(word => existingWords.get(word) ?? {word});
  const preferred = reading.length ? reading : vocabulary.length ? vocabulary : examples;
  const extra = preferred.length === 1 ? [...vocabulary, ...examples].find(item => item.word !== preferred[0].word) : undefined;
  const readingWords = [...preferred.slice(0, 12), ...(extra ? [extra] : [])]
    .map(item => ({...item, id:`poison/reading/${item.word}`}));
  const words = characterCards.length >= 2 ? characterCards : [...characterCards, ...readingWords];
  return {...pool, words, readingWords};
}
