import './handwriting-score-dialog.css';
import {createHandwritingInk} from './handwriting-pad.js';
import {startLessonFireworks} from './lesson-celebration.js';

let activeScoreDialog = null;

/** Show one completed character's score. The caller owns progression and results. */
export function showHandwritingScore({character = '', score = 0, drawings = [], metrics, onClose} = {}) {
  activeScoreDialog?.dispose();
  const previousFocus = document.activeElement;
  const dialog = document.createElement('dialog');
  dialog.id = 'handwriting-score-dialog';
  dialog.className = 'handwriting-score-dialog';
  dialog.setAttribute('aria-labelledby', 'handwriting-score-dialog-title');
  dialog.innerHTML = `
    <div class="handwriting-score-dialog__content">
      <p class="handwriting-score-dialog__character"></p>
      <h2 id="handwriting-score-dialog-title" class="handwriting-score-dialog__title">描写参考分</h2>
      <p class="handwriting-score-dialog__score"><strong class="handwriting-score-dialog__value"></strong><span class="handwriting-score-dialog__unit">分</span></p>
    </div>
    <button type="button" class="handwriting-score-dialog__close" autofocus>关闭</button>
  `;
  dialog.querySelector('.handwriting-score-dialog__character').textContent = character;
  score = Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0;
  dialog.querySelector('.handwriting-score-dialog__value').textContent = score;
  const content = dialog.querySelector('.handwriting-score-dialog__content');
  if (drawings.length) {
    dialog.classList.add('has-student-ink');
    content.insertAdjacentHTML('beforebegin', `
      <figure class="handwriting-score-dialog__writing">
        <svg viewBox="0 0 1024 1024" role="img" aria-label="学生写的字">
          <path class="score-grid-lines" d="M512 0V1024M0 512H1024M0 0L1024 1024M1024 0L0 1024"/>
        </svg>
        <figcaption>你写的字</figcaption>
      </figure>`);
    dialog.querySelector('svg').append(createHandwritingInk(drawings));
  }

  let canvas;
  if (score >= 90) {
    canvas = document.createElement('canvas');
    canvas.className = 'handwriting-score-dialog__fireworks';
    canvas.setAttribute('aria-hidden', 'true');
    dialog.classList.add('has-fireworks');
    dialog.prepend(canvas);
  } else if (score >= 70) {
    const smile = score >= 80;
    const encouragement = document.createElement('p');
    encouragement.className = 'handwriting-score-dialog__encouragement';
    const headband = '<path d="M15 26l-9 13 9-3 3 7 5-16" fill="#c84850"/><path d="M14 25q18-8 36 0v9q-18-8-36 0z" fill="#c84850"/><path d="m18 27 28 0" stroke="#ffe9bd" stroke-width="2"/>';
    encouragement.innerHTML = `
      <svg viewBox="0 0 64 64" role="img" aria-label="${smile ? '笑脸' : '头戴努力头巾的表情'}">
        <circle cx="32" cy="33" r="23" fill="#ffdc80" stroke="#946028" stroke-width="2"/>
        ${smile ? '' : headband}
        <path d="M22 39q3-6 6 0m8 0q3-6 6 0m-17 5q7 8 14 0" fill="none" stroke="#573924" stroke-width="2.6" stroke-linecap="round"/>
      </svg><span>${smile ? '还不错哦' : '请再接再厉'}</span>`;
    content.append(encouragement);
  }

  const availableMetrics = [['shape', '字形'], ['position', '位置'], ['length', '长度']]
    .filter(([key]) => Number.isFinite(metrics?.[key]) && metrics[key] >= 0 && metrics[key] <= 100);
  if (availableMetrics.length) {
    const list = document.createElement('dl');
    list.className = 'handwriting-score-dialog__metrics';
    for (const [key, label] of availableMetrics) {
      const item = document.createElement('div');
      const term = document.createElement('dt');
      const value = document.createElement('dd');
      term.textContent = label;
      value.textContent = metrics[key];
      item.append(term, value);
      list.append(item);
    }
    content.append(list);
  }

  const closeButton = dialog.querySelector('button');
  let closed = false;
  let stopFireworks, fireworksTimer;

  function close() {
    if (closed) return;
    closed = true;
    if (fireworksTimer !== undefined) window.clearTimeout(fireworksTimer);
    stopFireworks?.();
    window.removeEventListener('pagehide', close);
    for (const type of ['keydown', 'keyup', 'keypress']) window.removeEventListener(type, isolateKeyboard, true);
    closeButton.removeEventListener('click', close);
    dialog.removeEventListener('cancel', cancel);
    dialog.removeEventListener('close', close);
    if (dialog.open) dialog.close();
    dialog.remove();
    if (activeScoreDialog === handle) activeScoreDialog = null;
    if (previousFocus?.isConnected && typeof previousFocus.focus === 'function') previousFocus.focus({preventScroll: true});
    onClose?.();
  }

  function cancel(event) {
    event.preventDefault();
    close();
  }

  function isolateKeyboard(event) {
    // Window capture intercepts document-level classroom shortcuts while native
    // Enter/Space activation remains available on the single close control.
    event.stopImmediatePropagation();
    if (event.key === 'Tab') {
      if (event.type === 'keydown') {
        event.preventDefault();
        closeButton.focus({preventScroll: true});
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      if (event.type === 'keydown') close();
    } else if (!dialog.contains(event.target)) event.preventDefault();
  }

  const handle = {close, dispose: close};
  activeScoreDialog = handle;
  closeButton.addEventListener('click', close);
  dialog.addEventListener('cancel', cancel);
  dialog.addEventListener('close', close);
  window.addEventListener('pagehide', close);
  for (const type of ['keydown', 'keyup', 'keypress']) window.addEventListener(type, isolateKeyboard, true);
  document.body.append(dialog);
  dialog.showModal();
  if (canvas) {
    stopFireworks = startLessonFireworks(canvas);
    fireworksTimer = window.setTimeout(() => {
      stopFireworks();
      canvas.remove();
      dialog.classList.remove('has-fireworks');
    }, 4000);
  }
  return handle;
}
