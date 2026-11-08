import {GAME_ORDER} from './game-order.js';
import './island-map.css';

const islandGlyphs = ['字','鼠','迷','拼','笔','词','药','建','数','句','景'];
const islandArt = `<svg class="island-art" viewBox="0 0 200 96" aria-hidden="true" focusable="false">
  <ellipse class="island-water" cx="100" cy="78" rx="92" ry="14"/>
  <path class="island-sand" d="M16 66C22 52 38 48 52 47c4-22 30-32 49-23 21-14 51-3 54 18 17 0 33 12 31 23-3 22-147 29-170 1Z"/>
  <path class="island-grass" d="M24 58c9-11 26-12 37-13 6-20 27-23 40-14 20-12 44-4 47 16 15 0 27 5 30 13-21 15-126 19-154-2Z"/>
  <path class="island-tree" d="M147 45V20m0 7c-14-15-23-7-22-1 10-3 16 0 22 7m0-6c5-18 18-18 23-10-13 1-18 7-23 14m0-5c-4-15-16-20-19-11 8 3 12 8 19 16"/>
  <path class="island-rock" d="m39 60 8-13 13 2 7 12Z"/>
</svg>`;

/** A presentation-only map. Journey decisions and storage belong to its caller. */
export function createIslandMap({onStart,onResume,onRestart,onChallenge} = {}) {
  const dialog = document.createElement('dialog');
  dialog.id = 'island-map';
  dialog.setAttribute('aria-labelledby','island-map-title');
  dialog.innerHTML = `
    <header class="island-map-header">
      <div class="island-map-heading">
        <h2 id="island-map-title">汉字奇遇岛 <span>· 小岛地图</span></h2>
        <p class="island-map-course"></p>
      </div>
      <button class="island-map-close" type="button" aria-label="关闭小岛地图"><span aria-hidden="true">×</span></button>
    </header>
    <div class="island-map-summary">
      <p class="island-map-progress"></p>
      <p class="island-map-hint">选择小岛，单独挑战</p>
    </div>
    <div class="island-map-ocean">
      <svg class="island-map-route" viewBox="0 0 1200 420" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path d="M110 65H1080Q1180 65 1080 196H220Q90 196 220 330H680"/>
        <path class="island-map-wave" d="M10 310q18-12 36 0t36 0m1000-150q18-12 36 0t36 0M750 380q18-12 36 0t36 0M420 15q18-12 36 0t36 0"/>
      </svg>
      <div class="island-map-islands" aria-label="按顺序排列的小岛"></div>
    </div>
    <footer class="island-map-footer">
      <p class="island-map-warning" role="status" hidden></p>
      <button class="island-map-primary" type="button"></button>
    </footer>`;
  document.body.append(dialog);

  const course = dialog.querySelector('.island-map-course');
  const progress = dialog.querySelector('.island-map-progress');
  const hint = dialog.querySelector('.island-map-hint');
  const islands = dialog.querySelector('.island-map-islands');
  const warning = dialog.querySelector('.island-map-warning');
  const primary = dialog.querySelector('.island-map-primary');
  const closeButton = dialog.querySelector('.island-map-close');
  let disposed = false;
  let primaryAction = onStart;

  function close() {
    if (dialog.open) dialog.close();
  }

  function activatePrimary() {
    close();
    primaryAction?.();
  }

  function activateIsland(event) {
    const card = event.target.closest('.island-card');
    if (!card || card.disabled) return;
    close();
    onChallenge?.(card.dataset.mode);
  }

  closeButton.addEventListener('click',close);
  primary.addEventListener('click',activatePrimary);
  islands.addEventListener('click',activateIsland);

  function open({courseLabel = '',availability,state,storageWarning = ''} = {}) {
    if (disposed) return;
    const rows = availability ?? state?.stages ?? [];
    const completed = new Set(state?.completed ?? []);
    const available = GAME_ORDER.filter(game => rows.find(row => row.id === game.id)?.available === true);
    const done = available.filter(game => completed.has(game.id)).length;
    const currentId = state?.stages?.[state.index]?.id ?? GAME_ORDER[state?.index]?.id;
    course.textContent = courseLabel;
    progress.textContent = `已完成 ${done} / ${available.length} 岛`;
    hint.textContent = available.length ? '选择小岛，单独挑战' : '本课暂未配置可挑战内容';
    warning.textContent = typeof storageWarning === 'string' ? storageWarning : storageWarning ? '浏览器未能保存，闯关进度仅保留在本页。' : '';
    warning.hidden = !warning.textContent;

    if (state?.status === 'complete') {
      primary.textContent = '再闯一次';
      primaryAction = onRestart;
    } else if (state?.status === 'paused' || state?.status === 'active') {
      primary.textContent = '继续闯关';
      primaryAction = onResume;
    } else {
      primary.textContent = '按顺序闯关';
      primaryAction = onStart;
    }
    primary.disabled = available.length === 0;

    islands.replaceChildren();
    let row;
    GAME_ORDER.forEach((game,index) => {
      if (index === 0 || index === 5 || index === 9) {
        row = document.createElement('div');
        row.className = 'island-map-row';
        islands.append(row);
      }
      const entry = rows.find(item => item.id === game.id);
      const skipped = entry?.available !== true;
      const status = skipped ? 'skipped' : completed.has(game.id) ? 'completed' : currentId === game.id && state?.status !== 'complete' ? 'current' : 'available';
      const statusText = {skipped:'已跳过',completed:'已完成',current:'当前岛',available:'可挑战'}[status];
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `island-card is-${status}`;
      card.dataset.mode = game.id;
      card.dataset.status = status;
      card.disabled = skipped;
      if (status === 'current') card.setAttribute('aria-current','step');
      card.innerHTML = `${islandArt}<span class="island-glyph" aria-hidden="true">${islandGlyphs[index]}</span><span class="island-number">${index + 1}</span><span class="island-label"></span><span class="island-status"></span>`;
      card.querySelector('.island-label').textContent = game.label;
      card.querySelector('.island-status').textContent = statusText;
      if (skipped) {
        const reason = document.createElement('span');
        reason.className = 'island-reason';
        reason.textContent = entry?.reason || '本课尚未设置';
        card.append(reason);
      }
      row.append(card);
    });
    if (!dialog.open) dialog.showModal();
  }

  function dispose() {
    if (disposed) return;
    close();
    disposed = true;
    closeButton.removeEventListener('click',close);
    primary.removeEventListener('click',activatePrimary);
    islands.removeEventListener('click',activateIsland);
    dialog.remove();
  }

  return {open,close,dispose,isOpen:() => dialog.open};
}
