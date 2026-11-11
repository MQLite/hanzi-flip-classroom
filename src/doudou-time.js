import {TIME_SCENES, LOVE_LINE} from './doudou-time-data.js';
import {bindExplorationJourney} from './island-exploration.js';
import {ruby, gloss} from './ruby.js';
import './doudou-time.css';

const journey = bindExplorationJourney('doudou-time');
journey.decorate();

const find = id => document.getElementById(id);
const scene = find('time-scene');
const clock = find('time-clock');
const numbers = find('time-clock-numbers');
const periodList = find('time-periods');
const table = find('time-table');
const poses = find('time-xiaoming').querySelectorAll('[data-pose]');
const robot = find('time-robot');
const heart = find('time-heart');
const speaker = find('time-speaker');
const dialogue = find('time-line');
const instruction = find('time-instruction');
const next = find('time-next');
const loveText = '爱你';
const loveGlyphs = Promise.all(Array.from(loveText, character =>
  fetch(import.meta.env.BASE_URL + 'strokes/' + encodeURIComponent(character) + '.json')
    .then(response => response.ok ? response.json() : null)
    .then(data => data?.strokes)
)).catch(() => null);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let periodIndex = 0, lineIndex = 0, completed = false, awaitingJourney = Boolean(journey.returnUrl);
let chargeTimer = 0;
let bubbleAnimation;

function label(element, hanzi, pinyin, english) {
  element.replaceChildren(ruby(hanzi, pinyin));
  element.setAttribute('aria-label', hanzi);
  if (english) {
    const translation = gloss(english);
    translation.id = element.id + '-english';
    element.append(translation);
    element.setAttribute('aria-describedby', translation.id);
  } else {
    element.removeAttribute('aria-describedby');
  }
}

for (let hour = 1; hour <= 12; hour++) {
  const angle = hour * Math.PI / 6;
  const number = document.createElement('span');
  number.textContent = hour;
  number.style.left = (50 + 39 * Math.sin(angle)) + '%';
  number.style.top = (50 - 39 * Math.cos(angle)) + '%';
  numbers.append(number);
}

const steps = TIME_SCENES.map(period => {
  const item = document.createElement('li');
  label(item, ...period.label);
  periodList.append(item);
  return item;
});

function showClock([hour, minute]) {
  const minuteAngle = minute * 6;
  const hourAngle = ((hour % 12) + minute / 60) * 30;
  clock.querySelector('[data-hand=hour]').style.setProperty('--angle', hourAngle + 'deg');
  clock.querySelector('[data-hand=minute]').style.setProperty('--angle', minuteAngle + 'deg');
  const hourPosition = minute ? hour + '和' + (hour + 1) + '之间' : '数字' + hour;
  const minutePosition = minute ? minute / 5 : 12;
  clock.setAttribute('aria-label', '指针时钟。时针指向' + hourPosition + '，分针指向数字' + minutePosition + '。');
}

function showDialogue({speaker: role, tokens}) {
  const isDoudou = role === 'doudou';
  label(speaker, ...(isDoudou ? ['豆豆', 'Dòudou'] : ['小明', 'Xiǎomíng']));
  scene.dataset.speaker = role;
  dialogue.setAttribute('aria-label', tokens.map(([word]) => word).join(''));

  const chunks = [];
  for (const [word, pinyin, english] of tokens) {
    const token = document.createElement('span');
    token.append(ruby(word, pinyin));
    if (english) {
      token.dataset.word = word.replace(/[，。！？]$/u, '');
      token.append(gloss(english));
    }
    chunks.push(token);
  }
  dialogue.replaceChildren(...chunks);
  bubbleAnimation?.cancel();
  if (!reducedMotion.matches) {
    bubbleAnimation = dialogue.closest('.time-dialogue').animate(
      [{opacity:.4, transform:'translateY(7px)'}, {opacity:1, transform:'translateY(0)'}],
      {duration:220, easing:'ease-out'},
    );
  }
}

function showShot(period, line) {
  const answerIndex = period.lines.findIndex(turn => turn.action === 'answer');
  const wakingUp = period.id === 'morning' && lineIndex <= answerIndex;
  const shot = wakingUp ? 'wake' : line.action === 'food' ? 'food' : 'meal';
  scene.dataset.period = period.id;
  scene.dataset.shot = shot;
  table.hidden = wakingUp;
  const pose = shot === 'food' ? period.id : shot;
  for (const image of poses) image.hidden = image.dataset.pose !== pose;
}

function render() {
  const period = TIME_SCENES[periodIndex];
  const line = period.lines[lineIndex];
  showShot(period, line);
  for (const [index, step] of steps.entries()) {
    if (index === periodIndex) step.setAttribute('aria-current', 'step');
    else step.removeAttribute('aria-current');
  }
  showDialogue(line);
  clock.hidden = line.action !== 'ask' && line.action !== 'answer';
  if (!clock.hidden) showClock(period.clock);
  instruction.hidden = line.action !== 'ask';
  if (line.action === 'ask') {
    label(instruction, '看时钟，说时间。', 'Kàn shízhōng, shuō shíjiān.', 'Look at the clock and say the time.');
    label(next, '我说好了', 'Wǒ shuō hǎo le', 'I’ve said it');
  } else if (line.action === 'charge') {
    label(next, '给豆豆充电', 'Gěi Dòudou chōngdiàn');
  } else if (lineIndex === period.lines.length - 1) {
    const nextPeriod = TIME_SCENES[periodIndex + 1];
    label(next, ...nextPeriod.label);
  } else {
    label(next, '下一句', 'Xià yí jù');
  }
}

async function drawLoveGlyphs(word) {
  const glyphs = await loveGlyphs;
  if (!word?.isConnected || !glyphs?.every(strokes => Array.isArray(strokes) && strokes.length) || !window.Path2D) return;

  const canvas = document.createElement('canvas');
  canvas.height = 256;
  canvas.width = canvas.height * loveText.length;
  const context = canvas.getContext('2d');
  if (!context) return;

  // Match the same 1024-unit, upward-pointing glyph used in the stroke practice.
  const scale = canvas.height / 1024;
  context.fillStyle = getComputedStyle(word).color;
  glyphs.forEach((strokes, index) => {
    context.setTransform(scale, 0, 0, -scale, index * canvas.height, 900 * scale);
    for (const stroke of strokes) context.fill(new Path2D(stroke));
  });

  canvas.className = 'time-love-glyph';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.textContent = loveText;
  word.firstChild.textContent = word.firstChild.textContent.slice(loveText.length);
  word.prepend(canvas);
}

function finishCharging() {
  completed = true;
  robot.classList.remove('is-charging');
  robot.classList.add('is-loving');
  heart.hidden = false;
  showDialogue(LOVE_LINE);
  void drawLoveGlyphs(dialogue.querySelector('ruby'));
  next.disabled = false;
  label(next, ...(awaitingJourney ? ['完成探索', 'Wánchéng tànsuǒ'] : ['再玩一次', 'Zài wán yí cì']));
  next.focus({preventScroll:true});
}

next.onclick = () => {
  if (next.disabled) return;
  if (completed) {
    if (awaitingJourney) {
      awaitingJourney = false;
      label(next, '再玩一次', 'Zài wán yí cì');
      journey.reportComplete();
      return;
    }
    periodIndex = lineIndex = 0;
    completed = false;
    robot.classList.remove('is-loving');
    heart.hidden = true;
    render();
    return;
  }

  const period = TIME_SCENES[periodIndex];
  if (period.lines[lineIndex].action === 'charge') {
    next.disabled = true;
    robot.classList.add('is-charging');
    if (reducedMotion.matches) finishCharging();
    else chargeTimer = window.setTimeout(finishCharging, 800);
    return;
  }
  lineIndex++;
  if (lineIndex === period.lines.length) {
    periodIndex++;
    lineIndex = 0;
  }
  render();
};

next.onkeydown = event => {
  if (event.repeat && (event.key === 'Enter' || event.key === ' ')) event.preventDefault();
};
window.addEventListener('pagehide', event => { if (!event.persisted) window.clearTimeout(chargeTimer); });
render();
