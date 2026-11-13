import {PARADISE_ID, ZHONGWEN_ID} from './curriculum.js';
import china from './assets/flags/cn.svg';
import canada from './assets/flags/ca.svg';
import australia from './assets/flags/au.svg';
import look from './assets/sudoku/look.svg';
import long from './assets/sudoku/long.svg';
import paris from './assets/sudoku/paris.svg';
import mother from './assets/sudoku/mother.svg';
import father from './assets/sudoku/father.svg';

// Local flag-icons SVGs (MIT): https://github.com/lipis/flag-icons
const flags = new Map([
  ['中国', {url: china, label: '中国国旗', style: 'sudoku-flag'}],
  ['加拿大', {url: canada, label: '加拿大国旗', style: 'sudoku-flag'}],
  ['澳大利亚', {url: australia, label: '澳大利亚国旗', style: 'sudoku-flag'}],
]);

const illustrations = new Map([
  ['看', {url: look, label: '手搭在眼睛上方向前看', style: 'sudoku-illustration'}],
  ['长', {url: long, label: '箭头指向较长的线', style: 'sudoku-illustration'}],
  ['巴黎', {url: paris, label: '埃菲尔铁塔', style: 'sudoku-illustration'}],
]);
const jianghe = new Map([
  ['母亲', {url: mother, label: '母亲和孩子', style: 'sudoku-illustration'}],
  ['父亲', {url: father, label: '父亲和孩子', style: 'sudoku-illustration'}],
  ['中国', flags.get('中国')],
]);
const picturesByLesson = new Map([
  [`${PARADISE_ID}/2/1`, flags],
  [`${PARADISE_ID}/2/2`, illustrations],
  [`${ZHONGWEN_ID}/2/12`, jianghe],
]);

export function lessonPictureForWord(word) {
  const source = word?.source;
  if (!source) return null;
  return picturesByLesson.get(`${source.textbook}/${source.book}/${source.lesson}`)?.get(word.word) ?? null;
}
