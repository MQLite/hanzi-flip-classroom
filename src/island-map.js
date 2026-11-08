import {GAME_ORDER} from './game-order.js';
import './island-map.css';

// Distinct coastlines keep the map recognisable without lettering on the land.
const islandForms = [
  {coast:'M18 68C29 40 70 23 113 25l64-6c6 23-9 45-40 55-40 14-91 16-119-6Z',tree:[129,48]},
  {coast:'M15 54C13 30 48 20 73 35c17 9 23 8 39-4 29-20 71-7 73 17 3 29-37 39-64 28-21-9-26-7-45 4-30 16-65 0-61-26Z',tree:[145,49]},
  {coast:'M181 35C153 14 83 17 41 34 6 48 11 73 52 82c39 9 104 0 128-19-41 12-94 9-110-5-18-17 45-33 111-23Z',tree:[40,53]},
  {coast:'M28 72Q14 69 29 56l62-35q13-8 24 2l62 39q18 14-3 16L28 72Z',tree:[109,51]},
  {coast:'M20 72C3 55 43 35 73 39c25 4 24-18 55-20 28-2 58 10 52 24-5 12-39 5-55 13-20 10-27 28-56 27-23 0-40-2-49-11Z',tree:[139,40]},
  {coast:'M100 38C62 7 19 26 24 51c4 20 44 30 76 36 32-7 76-19 78-40 2-25-45-36-78-9Z',tree:[145,48]},
  {coast:'m100 18 24 20 45-8-12 22 28 18-50 2-23 16-28-15-51 3 17-23-26-14 51-1Z',tree:[100,48]},
  {coast:'M24 32 87 23l11 14 61-3 22 26-35 19-36-9-17 14-65-11 15-21-25-8Z',tree:[142,53]},
  {coast:'M19 62C14 38 45 23 73 25c29 2 32 18 55 12 27-7 52-2 55 18 3 23-34 30-57 24-28-7-37 6-66 4-22-2-37-8-41-21Z',tree:[52,48]},
  {coast:'M16 48Q25 30 51 35l28-8 35 8 35-8 27 14q15 8 7 21l-22 12-36-3-31 9-40-8-26 3Q9 66 16 48Z',tree:[153,48]},
  {coast:'M25 52C22 30 59 20 99 22c42-3 78 11 80 31 2 22-36 32-78 31-44 3-76-12-76-32Zm46 0c0 9 17 14 33 13 19 0 32-6 32-14-1-10-19-13-34-12-18 0-31 5-31 13Z',tree:[155,49]},
];
function islandArt(index) {
  const {coast,tree:[x,y]} = islandForms[index];
  return `<svg class="island-art" viewBox="0 0 200 96" aria-hidden="true" focusable="false">
  <ellipse class="island-water" cx="100" cy="78" rx="92" ry="14"/>
  <path class="island-sand" fill-rule="evenodd" d="${coast}"/>
  <path class="island-grass" fill-rule="evenodd" d="${coast}" transform="translate(100 51) scale(.9 .82) translate(-100 -51)"/>
  <path class="island-tree" transform="translate(${x} ${y})" d="M0 0V-23m0 8c-12-13-20-6-19-1 8-3 14 0 19 6m0-6c4-15 16-15 20-8-11 1-16 6-20 12m0-5c-4-13-14-17-17-9 7 2 11 7 17 13"/>
</svg>`;
}

/** A presentation-only map. Journey decisions and storage belong to its caller. */
export function createIslandMap({onStart,onResume,onRestart,onChallenge,embedded=false,host=document.body} = {}) {
  const dialog = document.createElement(embedded?'section':'dialog');
  if(embedded){dialog.className='island-map-home';dialog.hidden=true;}
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
  host.append(dialog);
  if(embedded){dialog.querySelector('.island-map-close').hidden=true;dialog.querySelector('.island-map-summary').append(dialog.querySelector('.island-map-footer'));}

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
    if(embedded)dialog.hidden=true;
    else if (dialog.open) dialog.close();
  }

  function activatePrimary() {
    if(!embedded)close();
    const accepted=primaryAction?.();
    if(embedded&&accepted!==false)close();
  }

  function activateIsland(event) {
    const card = event.target.closest('.island-card');
    if (!card || card.disabled) return;
    if(!embedded)close();
    const accepted=onChallenge?.(card.dataset.mode);
    if(embedded&&accepted!==false)close();
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
      const statusText = {skipped:'已跳过',completed:'已完成',current:'当前岛',available:''}[status];
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `island-card is-${status}`;
      card.dataset.mode = game.id;
      card.dataset.status = status;
      card.disabled = skipped;
      if (status === 'current') card.setAttribute('aria-current','step');
      card.innerHTML = `${islandArt(index)}<span class="island-caption"><span class="island-number">${index + 1}</span><span class="island-label"></span></span><span class="island-status"${statusText?'':' hidden'}></span>`;
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
    if(embedded)dialog.hidden=false;
    else if (!dialog.open) dialog.showModal();
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

  return {open,close,dispose,isOpen:() => embedded?!dialog.hidden:dialog.open};
}
