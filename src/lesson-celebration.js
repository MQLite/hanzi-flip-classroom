import './lesson-celebration.css';

const DURATION = 10000;
const DEFAULT_BURSTS = 7;
const COLORS = ['#ffd66d', '#ff8fb4', '#80edff', '#b8ffa7', '#c3a4ff', '#fff5c4'];
let activeCelebration = null;

/** Show fireworks. The caller decides when to celebrate a completed round. */
export function showLessonCelebration({onClose, title = '太牛啦', durationMs = DURATION, playSound, burstCount = DEFAULT_BURSTS} = {}) {
  activeCelebration?.dispose();
  const previousFocus = document.activeElement;
  const dialog = document.createElement('dialog');
  dialog.id = 'lesson-celebration';
  dialog.className = 'lesson-celebration';
  dialog.setAttribute('aria-labelledby', 'lesson-celebration-title');
  dialog.innerHTML = `
    <canvas class="lesson-celebration__fireworks" aria-hidden="true"></canvas>
    <h2 id="lesson-celebration-title" class="lesson-celebration__title"></h2>
    <button type="button" class="lesson-celebration__close" autofocus>关闭庆祝</button>
  `;
  const heading = dialog.querySelector('h2');
  heading.textContent = title;
  heading.style.setProperty('--celebration-title-limit', `${88 / Math.max(1, [...title].length)}vw`);
  document.body.append(dialog);
  const canvas = dialog.querySelector('canvas');
  const context = canvas.getContext('2d');
  const closeButton = dialog.querySelector('button');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const spreadAcrossScreen = burstCount > DEFAULT_BURSTS;
  const startedAt = performance.now();
  let width = 0;
  let height = 0;
  let frameId = 0;
  let timerId = 0;
  let closed = false;
  let stopSound;

  function drawBackground() {
    context.clearRect(0, 0, width, height);
    // Stars keep the first frame festive while the next burst is opening.
    for (let i = 0; i < 70; i++) {
      const x = ((i * 0.61803398875) % 1) * width;
      const y = ((i * 0.41421356237) % 1) * height;
      context.fillStyle = i % 3 === 0 ? '#ffe7aa' : '#8ba9d4';
      context.globalAlpha = i % 4 === 0 ? 0.8 : 0.35;
      context.beginPath();
      context.arc(x, y, i % 4 === 0 ? 1.7 : 1, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  }

  function drawConfetti() {
    drawBackground();
    const scale = Math.max(0.75, Math.min(width, height) / 720);
    const pieces = spreadAcrossScreen ? 320 : 180;
    for (let i = 0; i < pieces; i++) {
      const x = ((i * 0.61803398875 + 0.07) % 1) * width;
      const y = ((i * 0.41421356237 + 0.09) % 1) * height;
      context.save();
      context.translate(x, y);
      context.rotate(i * 2.4);
      context.fillStyle = COLORS[i % COLORS.length];
      context.fillRect(-3 * scale, -6 * scale, 6 * scale, 12 * scale);
      context.restore();
    }
  }

  function drawFireworks(elapsed) {
    drawBackground();
    context.globalCompositeOperation = 'lighter';
    const size = Math.min(width, height);
    for (let burst = 0; burst < burstCount; burst++) {
      const cycle = elapsed / 1000 + burst * 0.34;
      const age = cycle % 2.45;
      const round = Math.floor(cycle / 2.45);
      const cx = (0.12 + ((burst * 0.29 + round * 0.19) % 0.76)) * width;
      const cy = spreadAcrossScreen
        ? (0.09 + ((burst * 0.173 + round * 0.131) % 0.76)) * height
        : (0.13 + ((burst * 0.17 + round * 0.13) % 0.55)) * height;
      const progress = Math.min(age / 1.9, 1);
      const radius = size * (0.14 + (burst % 3) * 0.045) * (1 - (1 - progress) ** 2);
      const opacity = Math.max(0, 1 - age / 2.1);
      if (!opacity) continue;
      context.strokeStyle = COLORS[(burst + round) % COLORS.length];
      context.fillStyle = context.strokeStyle;
      context.lineWidth = Math.max(1.6, size / 420);
      for (let particle = 0; particle < 52; particle++) {
        const angle = particle * Math.PI * 2 / 52 + burst * 0.4;
        const variation = 0.7 + ((particle * 17) % 11) / 30;
        const travel = radius * variation;
        const fall = age * age * size * 0.025;
        const x = cx + Math.cos(angle) * travel;
        const y = cy + Math.sin(angle) * travel + fall;
        const tail = Math.max(3, size * 0.018 * opacity);
        context.globalAlpha = opacity * (particle % 4 === 0 ? 1 : 0.7);
        context.beginPath();
        context.moveTo(x - Math.cos(angle) * tail, y - Math.sin(angle) * tail);
        context.lineTo(x, y);
        context.stroke();
        context.beginPath();
        context.arc(x, y, Math.max(1.7, size / 330) * opacity, 0, Math.PI * 2);
        context.fill();
      }
    }
    context.globalAlpha = 1;
    context.globalCompositeOperation = 'source-over';
  }

  function render() {
    if (closed || !context) return;
    if (reducedMotion) drawConfetti();
    else drawFireworks(performance.now() - startedAt);
  }

  function resize() {
    if (closed) return;
    width = dialog.clientWidth;
    height = dialog.clientHeight;
    // A cap keeps projector-size drawing inexpensive on high-density screens.
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context?.setTransform(ratio, 0, 0, ratio, 0, 0);
    render();
  }

  function animate() {
    if (closed) return;
    render();
    frameId = window.requestAnimationFrame(animate);
  }

  function stopSoundWhenHidden() {
    if (document.hidden) stopSound?.();
  }

  function close() {
    if (closed) return;
    closed = true;
    window.clearTimeout(timerId);
    window.cancelAnimationFrame(frameId);
    window.removeEventListener('resize', resize);
    window.removeEventListener('pagehide', close);
    document.removeEventListener('visibilitychange', stopSoundWhenHidden);
    stopSound?.();
    for (const type of ['keydown', 'keyup', 'keypress']) window.removeEventListener(type, isolateKeyboard, true);
    closeButton.removeEventListener('click', close);
    dialog.removeEventListener('cancel', cancel);
    dialog.removeEventListener('close', close);
    if (dialog.open) dialog.close();
    dialog.remove();
    canvas.width = 0;
    canvas.height = 0;
    if (activeCelebration === handle) activeCelebration = null;
    if (previousFocus?.isConnected && typeof previousFocus.focus === 'function') previousFocus.focus({preventScroll: true});
    onClose?.();
  }

  function cancel(event) {
    event.preventDefault();
    close();
  }

  function isolateKeyboard(event) {
    // Window capture also blocks document-level game handlers behind the modal.
    event.stopImmediatePropagation();
    if (event.key === 'Escape') {
      event.preventDefault();
      if (event.type === 'keydown') close();
    } else if (!dialog.contains(event.target)) event.preventDefault();
  }

  const handle = {close, dispose: close};
  activeCelebration = handle;
  closeButton.addEventListener('click', close);
  dialog.addEventListener('cancel', cancel);
  dialog.addEventListener('close', close);
  window.addEventListener('resize', resize);
  window.addEventListener('pagehide', close);
  for (const type of ['keydown', 'keyup', 'keypress']) window.addEventListener(type, isolateKeyboard, true);
  dialog.showModal();
  resize();
  stopSound = playSound?.();
  if (stopSound) document.addEventListener('visibilitychange', stopSoundWhenHidden);
  if (!reducedMotion && context) frameId = window.requestAnimationFrame(animate);
  timerId = window.setTimeout(close, durationMs);
  return handle;
}
