import {mountAnalogClock} from './analog-clock.js';
import {bindExplorationJourney} from './island-exploration.js';
import {gloss} from './ruby.js';
import './clock-stop.css';

const ROUND_COUNT = 6;
const TICKS_PER_CYCLE = 24;
const HOURS = ['十二', '一', '两', '三', '四', '五', '六', '七', '八', '九', '十', '十一'];
const PROMPTS = {
  ready: ['点「开始」，让时钟走起来。', 'Press Start to move the hands.'],
  running: ['喊「停」或点「停」。', 'Say “tíng” or press Stop.'],
  stopped: ['现在几点？', 'What time is it now?'],
  complete: ['六轮完成！', 'All six rounds complete!'],
};

const get = id => document.getElementById(id);
const showTime = mountAnalogClock(get('clock-face'));
const progress = get('clock-round');
const prompt = get('clock-prompt');
const promptEn = get('clock-prompt-en');
const answer = get('clock-answer');
const start = get('clock-start');
const stop = get('clock-stop');
const check = get('clock-check');
const next = get('clock-next');
const voiceOption = get('clock-voice-option');
const voice = get('clock-voice');
const voiceStatus = get('clock-voice-status');
const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
const journey = bindExplorationJourney('clock-stop');
journey.decorate();

let round = 1;
let tick = 0;
let phase = 'ready';
let timer;
let recognizer;

function moveClock(nextTick) {
  tick = nextTick % TICKS_PER_CYCLE;
  showTime([Math.floor(tick / 2) || 12, (tick % 2) * 30]);
}

function render() {
  progress.textContent = `第 ${round} / ${ROUND_COUNT} 轮`;
  [prompt.textContent, promptEn.textContent] = PROMPTS[phase];
  if (phase === 'running' && (!Recognition || !voice.checked)) {
    prompt.textContent = '点「停」。';
    promptEn.textContent = 'Press Stop.';
  }
  start.hidden = phase !== 'ready';
  stop.hidden = phase !== 'running';
  check.hidden = phase !== 'stopped';
  next.hidden = phase !== 'stopped' && phase !== 'complete';
  voice.disabled = phase === 'running';
  voiceOption.hidden = !Recognition || phase === 'stopped' || phase === 'complete';
  if (phase !== 'stopped') answer.hidden = true;

  if (!next.hidden) {
    const [label, english] = phase === 'complete' ? ['再玩一次', 'Play again']
      : round === ROUND_COUNT ? ['完成', 'Finish'] : ['下一轮', 'Next round'];
    next.replaceChildren(label, gloss(english));
    next.setAttribute('aria-label', label);
  }
}

function setVoiceStatus(message) {
  voiceStatus.textContent = message;
  voiceStatus.hidden = !message;
}

function stopListening() {
  const active = recognizer;
  recognizer = undefined;
  active?.abort();
}

function listenForStop() {
  if (!Recognition || !voice.checked) return;
  const unavailable = () => setVoiceStatus('语音暂不可用，可以点「停」。');
  try {
    const active = new Recognition();
    recognizer = active;
    active.lang = 'zh-CN';
    active.continuous = true;
    active.interimResults = true;
    active.onstart = () => {
      if (recognizer === active) setVoiceStatus('正在听「停」…');
    };
    active.onresult = event => {
      if (recognizer !== active) return;
      for (let index = event.resultIndex; index < event.results.length; index++) {
        const phrase = event.results[index][0].transcript.replace(/[\p{P}\s]+/gu, '');
        if (/^(停+|停止|停下|停下来)$/u.test(phrase)) {
          freezeClock();
          return;
        }
      }
    };
    active.onerror = active.onend = () => {
      if (recognizer !== active) return;
      recognizer = undefined;
      unavailable();
    };
    active.start();
  } catch {
    recognizer = undefined;
    unavailable();
  }
}

function freezeClock(focus = true) {
  if (phase !== 'running') return;
  window.clearInterval(timer);
  stopListening();
  setVoiceStatus('');
  phase = 'stopped';
  render();
  if (focus) check.focus({preventScroll:true});
}

start.addEventListener('click', () => {
  if (phase !== 'ready') return;
  moveClock(Math.floor(Math.random() * TICKS_PER_CYCLE));
  phase = 'running';
  render();
  stop.focus({preventScroll:true});
  // Display only whole and half hours so each frozen position is a lesson example.
  timer = window.setInterval(() => moveClock(tick + 1), 800);
  listenForStop();
});
stop.addEventListener('click', () => freezeClock());
check.addEventListener('click', () => {
  answer.textContent = `现在${HOURS[Math.floor(tick / 2)]}点${tick % 2 ? '半' : ''}。`;
  answer.hidden = false;
});
next.addEventListener('click', () => {
  if (phase === 'complete') {
    round = 1;
  } else if (round === ROUND_COUNT) {
    phase = 'complete';
    render();
    journey.reportComplete();
    return;
  } else {
    round++;
  }
  phase = 'ready';
  moveClock(0);
  render();
  start.focus({preventScroll:true});
});
window.addEventListener('pagehide', () => freezeClock(false));
document.querySelector('.clock-actions').addEventListener('keydown', event => {
  if (event.repeat && (event.key === 'Enter' || event.key === ' ')) event.preventDefault();
});
moveClock(0);
render();
