import './handwriting-score-dialog.css';

let activeScoreDialog = null;

/** Show one completed character's score. The caller owns progression and results. */
export function showHandwritingScore({character = '', score = 0, metrics, onClose} = {}) {
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
  dialog.querySelector('.handwriting-score-dialog__value').textContent = Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0;

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
    dialog.querySelector('.handwriting-score-dialog__content').append(list);
  }

  const closeButton = dialog.querySelector('button');
  let closed = false;

  function close() {
    if (closed) return;
    closed = true;
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
  return handle;
}
