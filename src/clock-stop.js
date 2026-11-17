import {mountAnalogClock} from './analog-clock.js';
import {bindExplorationJourney} from './island-exploration.js';
import {gloss, ruby} from './ruby.js';
import './clock-stop.css';

const ROUND_COUNT = 6;
const TICKS_PER_CYCLE = 24;
const HOURS = [
  ['十二', 'shí’èr'], ['一', 'yī'], ['两', 'liǎng'], ['三', 'sān'], ['四', 'sì'], ['五', 'wǔ'],
  ['六', 'liù'], ['七', 'qī'], ['八', 'bā'], ['九', 'jiǔ'], ['十', 'shí'], ['十一', 'shíyī'],
];
const ROUND_READINGS = ['yī', 'èr', 'sān', 'sì', 'wǔ', 'liù'];
const PROMPTS = {
  ready: ['Press Start to move the hands.', ['点「开始」，', 'Diǎn “kāishǐ”,'], ['让时钟', 'ràng shízhōng'], ['走起来。', 'zǒu qǐlai.']],
  running: ['Say “tíngzhǐ” or press Stop.', ['喊「停止」', 'Hǎn “tíngzhǐ”'], ['或点「停止」。', 'huò diǎn “tíngzhǐ”.']],
  manual: ['Press Stop.', ['点「停止」。', 'Diǎn “tíngzhǐ”.']],
  stopped: ['What time is it now?', ['现在', 'Xiànzài'], ['几点？', 'jǐ diǎn?']],
  complete: ['All six rounds complete!', ['六轮', 'Liù lún'], ['完成！', 'wánchéng!']],
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
if (journey.returnUrl) {
  const back = get('clock-back');
  back.replaceChildren('← ', ruby('返回', 'Fǎnhuí'), ruby('小岛', 'xiǎodǎo'), ruby('地图', 'dìtú'));
  back.removeAttribute('title');
}

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
  progress.replaceChildren(ruby(`第 ${round}`, `Dì ${ROUND_READINGS[round - 1]}`), ' / ', ruby(`${ROUND_COUNT} 轮`, 'liù lún'));
  const promptKey = phase === 'running' && (!Recognition || !voice.checked) ? 'manual' : phase;
  const [translation, ...chunks] = PROMPTS[promptKey];
  prompt.replaceChildren(...chunks.map(([text, reading]) => ruby(text, reading)));
  promptEn.textContent = translation;
  start.hidden = phase !== 'ready';
  stop.hidden = phase !== 'running';
  check.hidden = phase !== 'stopped';
  next.hidden = phase !== 'stopped' && phase !== 'complete';
  voice.disabled = phase === 'running';
  voiceOption.hidden = !Recognition || phase === 'stopped' || phase === 'complete';
  if (phase !== 'stopped') answer.hidden = true;

  if (!next.hidden) {
    const [label, reading, english] = phase === 'complete' ? ['再玩一次', 'Zài wán yí cì', 'Play again']
      : round === ROUND_COUNT ? ['完成', 'Wánchéng', 'Finish'] : ['下一轮', 'Xià yì lún', 'Next round'];
    next.replaceChildren(ruby(label, reading), gloss(english));
    next.setAttribute('aria-label', label);
  }
}

function setVoiceStatus(...chunks) {
  voiceStatus.replaceChildren(...chunks.map(([text, reading]) => ruby(text, reading)));
  voiceStatus.hidden = !chunks.length;
}

function stopListening() {
  const active = recognizer;
  recognizer = undefined;
  active?.abort();
}

function listenForStop() {
  if (!Recognition || !voice.checked) return;
  const unavailable = () => setVoiceStatus(
    ['语音', 'Yǔyīn'], ['暂不可用，', 'zàn bù kěyòng,'], ['可以点', 'kěyǐ diǎn'], ['「停止」。', 'tíngzhǐ.'],
  );
  try {
    const active = new Recognition();
    recognizer = active;
    active.lang = 'zh-CN';
    active.continuous = true;
    active.interimResults = true;
    active.onstart = () => {
      if (recognizer === active) setVoiceStatus(['正在听', 'Zhèngzài tīng'], ['「停止」…', 'tíngzhǐ…']);
    };
    active.onresult = event => {
      if (recognizer !== active) return;
      for (let index = event.resultIndex; index < event.results.length; index++) {
        const result = event.results[index];
        const phrase = result[0].transcript.replace(/[\p{P}\s]+/gu, '');
        // A provisional 停 may be the first syllable of 停止.
        if (/^(?:停止)+$/u.test(phrase) || (result.isFinal && /^(停+|停下|停下来)$/u.test(phrase))) {
          freezeClock();
          setVoiceStatus(['停止', 'Tíngzhǐ']);
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
  setVoiceStatus();
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
  const [hour, reading] = HOURS[Math.floor(tick / 2)];
  const halfHour = tick % 2 === 1;
  answer.replaceChildren(
    ruby('现在', 'Xiànzài'),
    ruby(halfHour ? `${hour}点半。` : `${hour}点。`, halfHour ? `${reading} diǎn bàn.` : `${reading} diǎn.`),
  );
  answer.hidden = false;
});
next.addEventListener('click', () => {
  setVoiceStatus();
  if (phase === 'complete') {
    round = 1;
  } else if (round === ROUND_COUNT) {
    phase = 'complete';
    render();
    journey.reportComplete({
      pinyin: {
        title: 'Tài niú la',
        close: 'Guānbì qìngzhù',
        saveFailure: ['Liúlǎnqì wèi néng bǎocún,', 'běn cì tōngguān jǐn bǎoliú zài běn yè.'],
      },
    });
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
