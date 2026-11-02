import {PARADISE_ID} from './curriculum.js';
import china from './assets/flags/cn.svg';
import canada from './assets/flags/ca.svg';
import australia from './assets/flags/au.svg';

// Local flag-icons SVGs (MIT): https://github.com/lipis/flag-icons
const flags=new Map([
  ['中国',{url:china,label:'中国国旗'}],
  ['加拿大',{url:canada,label:'加拿大国旗'}],
  ['澳大利亚',{url:australia,label:'澳大利亚国旗'}],
]);

export function countryFlagForWord(word){
  const source=word?.source;
  if(source?.textbook!==PARADISE_ID||source.book!==2||source.lesson!==1)return null;
  return flags.get(word.word)??null;
}
