import scenes from './city-scenes.json';
import {ruby, gloss} from './ruby.js';
import {renderRoute} from './city-route.js';
import './city-exploration.css';

const byId = id => document.getElementById(id);
const choices = byId('choices');
const showClue = byId('show-clue');
const next = byId('next-scene');
const map = byId('city-map');
let level = 0;
let revealed = 0;
let solved = false;

function annotate(element, ...words) {
  element.replaceChildren(...words.map(([hanzi, pinyin]) => ruby(hanzi, pinyin)));
}

function guide(element, english, ...words) {
  annotate(element, ...words);
  element.append(gloss(english));
}

function label(button, hanzi, pinyin, english) {
  guide(button, english, [hanzi, pinyin]);
  button.setAttribute('aria-label', hanzi);
}

function renderLine(words) {
  const line = document.createElement('p');
  const objects = byId('objects');
  for (const [text, pinyin, english, icon] of words) {
    const previousReading = line.lastElementChild?.querySelector('rt');
    if (!pinyin && previousReading) {
      previousReading.before(text);
      continue;
    }
    const word = document.createElement('span');
    word.className = english ? 'clue-word new-word' : 'clue-word';
    word.append(ruby(text, pinyin));
    if (english) word.append(gloss(english));
    if (icon && !Array.from(objects.children).some(object => object.textContent === icon)) {
      const object = document.createElement('span');
      object.textContent = icon;
      objects.append(object);
    }
    line.append(word);
  }
  byId('clues').append(line);
}

function renderTracker() {
  const restored = level + Number(solved);
  byId('scenes').replaceChildren(...scenes.map((_, index) => {
    const item = document.createElement('li');
    const complete = index < restored;
    item.textContent = complete ? '✓' : String(index + 1);
    item.setAttribute('aria-label', `Level ${index + 1}: ${complete ? 'solved' : index === level ? 'open' : 'locked'}`);
    if (complete) item.className = 'solved';
    if (index === level) item.setAttribute('aria-current', 'step');
    return item;
  }));
  byId('memory-count').textContent = `${restored} / ${scenes.length}`;
}

function renderProgress() {
  guide(byId('scene-progress'), 'Clues opened', [`${revealed} / ${scenes[level].lines.length} `], ['条线索', 'tiáo xiànsuǒ']);
}

function showAnswer() {
  solved = true;
  renderTracker();
  const scene = scenes[level];
  const city = [scene.city, scene.pinyin];
  const final = level === scenes.length - 1;
  const answer = byId('answer');
  if (final) {
    const speaker = document.createElement('p');
    speaker.className = 'robot-speaker';
    guide(speaker, 'Doudou says', ['豆豆', 'Dòudou'], ['说', 'shuō']);
    const speech = document.createElement('p');
    speech.className = 'robot-speech';
    annotate(speech, ['我', 'Wǒ'], ['从', 'cóng'], city, ['来', 'lái'], ['。']);
    const ending = document.createElement('p');
    ending.className = 'mission-complete';
    ending.lang = 'en';
    ending.textContent = 'All seven memories restored!';
    answer.replaceChildren(speaker, speech, ending);
    answer.hidden = false;
    label(next, '再玩一次', 'Zài wán yí cì', 'Play again');
  } else {
    label(next, '下一关 →', 'Xià yì guān', 'Next level');
  }
  guide(byId('feedback'), 'Correct!', ['猜对了！', 'Cāi duì le!']);
  for (const button of choices.children) button.disabled = true;
  guide(byId('map-city'), scene.english, city);
  map.hidden = false;
  renderRoute(byId('city-route'), scenes.slice(0, level + 1));
  next.hidden = false;
  next.focus({preventScroll:true});
  (final ? answer : map).scrollIntoView({block:'nearest'});
}

function openLevel() {
  revealed = 0;
  solved = false;
  for (const id of ['clues', 'objects', 'feedback', 'answer']) byId(id).replaceChildren();
  for (const id of ['guess', 'answer', 'next-scene', 'city-map']) byId(id).hidden = true;
  for (const button of choices.children) button.disabled = false;
  guide(byId('scene-title'), `Level ${level + 1}`, ['第', 'Dì'], [String(level + 1)], ['关', 'guān']);
  label(showClue, '打开第一条线索', 'Dǎkāi dì yī tiáo xiànsuǒ', 'Open the first clue');
  showClue.hidden = false;
  renderTracker();
  renderProgress();
  byId('scene-title').focus();
}

const alphabeticalCities = [...scenes].sort((a, b) => a.english.localeCompare(b.english, 'en'));
for (const city of alphabeticalCities) {
  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('aria-label', city.city);
  button.append(ruby(city.city, city.pinyin), gloss(city.english));
  button.onclick = () => {
    if (byId('guess').hidden || solved) return;
    if (city.id === scenes[level].id) showAnswer();
    else guide(byId('feedback'), 'Check the clues and try again.', ['再看看线索，', 'Zài kànkan xiànsuǒ,'], ['试一试。', 'shì yi shì.']);
  };
  choices.append(button);
}

byId('start-mission').onclick = () => {
  level = 0;
  byId('briefing').hidden = true;
  byId('game').hidden = false;
  openLevel();
};

showClue.onclick = () => {
  const {lines} = scenes[level];
  if (revealed >= lines.length) return;
  renderLine(lines[revealed]);
  revealed += 1;
  renderProgress();
  if (revealed === lines.length) {
    showClue.hidden = true;
    byId('guess').hidden = false;
    choices.firstElementChild.focus();
  } else {
    label(showClue, '打开下一条线索', 'Dǎkāi xià yì tiáo xiànsuǒ', 'Open the next clue');
  }
};

next.onclick = () => {
  if (!solved) return;
  if (level === scenes.length - 1) {
    byId('game').hidden = true;
    byId('briefing').hidden = false;
    byId('start-mission').focus();
    return;
  }
  level += 1;
  openLevel();
};
