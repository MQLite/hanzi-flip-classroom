import scenes from './city-scenes.json';
import './city-exploration.css';

const byId = id => document.getElementById(id);
const requested = Number(new URLSearchParams(location.search).get('scene'));
const index = Number.isInteger(requested) && requested >= 1 && requested <= scenes.length ? requested - 1 : 0;
const scene = scenes[index];
const title = `城市情景 ${index + 1}`;
const showClue = byId('show-clue');
const next = byId('next-scene');
let revealed = 0;

function ruby(text, pinyin) {
  if (!pinyin) return document.createTextNode(text);
  const element = document.createElement('ruby');
  const reading = document.createElement('rt');
  reading.textContent = pinyin;
  element.append(text, reading);
  return element;
}

function showLine(words) {
  const line = document.createElement('p');
  for (const [text, pinyin, english, icon] of words) {
    const word = document.createElement('span');
    word.className = english ? 'clue-word new-word' : 'clue-word';
    word.append(ruby(text, pinyin));
    if (english) {
      const gloss = document.createElement('small');
      gloss.lang = 'en';
      gloss.textContent = english;
      word.append(gloss);
    }
    if (icon && !Array.from(byId('objects').children).some(object => object.textContent === icon)) {
      const object = document.createElement('span');
      object.textContent = icon;
      byId('objects').append(object);
    }
    line.append(word);
  }
  byId('clues').append(line);
}

function showAnswer() {
  const answer = byId('answer');
  const name = document.createElement('p');
  name.append(ruby(`这是${scene.city}。`, `Zhè shì ${scene.pinyin}.`));
  const model = document.createElement('p');
  model.append(ruby(`我从${scene.city}来。`, `Wǒ cóng ${scene.pinyin} lái.`));
  answer.replaceChildren(name, model);
  answer.hidden = false;
  byId('feedback').textContent = '猜对了！一起说一句。';
  byId('choices').querySelectorAll('button').forEach(button => { button.disabled = true; });
  byId('restart-scene').hidden = false;
  next.href = index + 1 < scenes.length ? `?scene=${index + 2}` : './?mode=explore&source=paradise&stage=2A&lesson=2';
  next.textContent = index + 1 < scenes.length ? '下一个情景 →' : '回到情景地图';
  next.hidden = false;
  next.focus();
}

function reset() {
  revealed = 0;
  for (const id of ['clues', 'objects', 'feedback', 'answer']) byId(id).replaceChildren();
  for (const id of ['guess', 'answer', 'restart-scene', 'next-scene']) byId(id).hidden = true;
  byId('choices').querySelectorAll('button').forEach(button => { button.disabled = false; });
  showClue.textContent = '打开第一条线索';
  showClue.hidden = false;
  byId('scene-progress').textContent = `0 / ${scene.lines.length} 条线索`;
}

byId('scene-title').textContent = title;
scenes.forEach((city, i) => {
  const link = document.createElement('a');
  link.href = `?scene=${i + 1}`;
  link.textContent = String(i + 1);
  link.setAttribute('aria-label', `城市情景 ${i + 1}`);
  if (i === index) link.setAttribute('aria-current', 'page');
  byId('scenes').append(link);

  const button = document.createElement('button');
  button.type = 'button';
  button.append(ruby(city.city, city.pinyin));
  button.onclick = () => {
    if (city.id === scene.id) showAnswer();
    else byId('feedback').textContent = '再看看景物和美食线索，试一试。';
  };
  byId('choices').append(button);
});
showClue.onclick = () => {
  showLine(scene.lines[revealed]);
  revealed += 1;
  byId('scene-progress').textContent = `${revealed} / ${scene.lines.length} 条线索`;
  if (revealed === scene.lines.length) {
    showClue.hidden = true;
    byId('guess').hidden = false;
    byId('choices').querySelector('button').focus();
  } else showClue.textContent = '打开下一条线索';
};
byId('restart-scene').onclick = () => { reset(); showClue.focus(); };
reset();
