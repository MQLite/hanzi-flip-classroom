import {bindExplorationJourney} from './island-exploration.js';
import {showLessonCelebration} from './lesson-celebration.js';
import {paintRiverMap, riverPosition} from './river-map.js';
import {RIVER_ROUTES} from './river-routes.js';
import './rivers.css';

const journey = bindExplorationJourney('two-rivers');
journey.decorate();
const find = name => document.getElementById('river-' + name);
const stagePanel = find('stage');
const map = find('map');
const landscape = find('landscape');
const boat = find('boat');
const word = find('word');
const actions = find('actions');
const arrival = find('arrival');
const next = find('next');
const instruction = find('instruction');
const progress = find('progress');
const mouth = find('mouth');
const reach = find('reach');
const review = find('review');
const reviewTitle = find('review-title');
const reviewEntries = find('review-entries');
const levels = [...document.querySelectorAll('.river-levels li')];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let stage = 0;
let visited = 0;
let boatStep = 0;
let scene;
let finished = false;

function paintMap() {
  paintRiverMap(landscape, RIVER_ROUTES[stage], visited, !review.hidden);
}

function position(element, [x, y]) {
  element.style.setProperty('--x', `${x * 100}%`);
  element.style.setProperty('--y', `${y * 100}%`);
}

function placeWord(route) {
  if (word.hidden || visited >= route.entries.length) return;
  const boatPoint = route.points[visited];
  const point = route.points[visited + 1];
  position(word, scene ? scene.project(visited + 1) : point);
  word.classList.toggle('river-word--above', !scene && point[1] >= .30 && point[1] < boatPoint[1] - .08);
}

function showWord(route) {
  word.textContent = route.entries[visited];
  word.hidden = false;
  placeWord(route);
}

function placeBoat(point, step, moving = false) {
  boatStep = step;
  position(boat, point);
  scene?.setProgress(step, moving);
}

function labelReach(route) {
  reach.textContent = route.reaches.findLast(([step]) => step <= visited)[1];
}

function openStage(index) {
  stage = index;
  visited = 0;
  finished = false;
  const route = RIVER_ROUTES[stage];
  map.dataset.river = route.id;
  for (const [levelIndex, level] of levels.entries()) {
    if (levelIndex === stage) level.setAttribute('aria-current', 'step');
    else level.removeAttribute('aria-current');
  }
  mouth.textContent = `东 · ${route.mouth}`;
  instruction.hidden = false;
  instruction.textContent = route.instruction;
  progress.textContent = `0 / ${route.entries.length}`;
  actions.hidden = true;
  review.hidden = true;
  stagePanel.removeAttribute('data-review');
  landscape.setAttribute('aria-hidden', 'true');
  labelReach(route);
  word.hidden = true;
  scene?.setRoute(route);
  placeBoat(route.points[0], 0);
  scene?.setPaused(false);
  paintMap();
  showWord(route);
}

function dock(route) {
  reviewTitle.textContent = `${route.name} · 带读${route.reviewKind}`;
  reviewEntries.replaceChildren(...route.entries.map((entry, index) => {
    const card = document.createElement('li');
    const number = document.createElement('span');
    number.setAttribute('aria-hidden', 'true');
    number.textContent = index + 1;
    card.append(number, entry);
    return card;
  }));
  landscape.setAttribute('aria-label', `${route.name}从源头到${route.mouth}的全程示意图`);
  landscape.removeAttribute('aria-hidden');
  scene?.setPaused(true);
  stagePanel.setAttribute('data-review', '');
  review.hidden = false;
  actions.hidden = false;
  arrival.textContent = route.arrival;
  instruction.hidden = true;
  next.textContent = stage === RIVER_ROUTES.length - 1 ? '读完了，放烟花' : '去黄河 →';
  paintMap();
  reviewTitle.focus({preventScroll:true});
}

word.onclick = () => {
  if (word.hidden) return;
  const route = RIVER_ROUTES[stage];
  word.hidden = true;
  boat.classList.add('is-sailing');

  function arrive() {
    visited++;
    placeBoat(route.points[visited], visited);
    labelReach(route);
    boat.classList.remove('is-sailing');
    progress.textContent = `${visited} / ${route.entries.length}`;
    if (visited === route.entries.length) dock(route);
    else {
      paintMap();
      showWord(route);
      word.focus({preventScroll:true});
    }
  }

  if (reducedMotion.matches) {
    arrive();
    return;
  }
  const startedAt = performance.now();
  function sail(now) {
    const elapsed = Math.min(1, (now - startedAt) / 580);
    if (elapsed === 1) arrive();
    else {
      const eased = elapsed * elapsed * (3 - 2 * elapsed);
      placeBoat(riverPosition(route.points, visited, eased), visited + eased, true);
      requestAnimationFrame(sail);
    }
  }
  requestAnimationFrame(sail);
};

word.onkeydown = event => {
  if (event.repeat && (event.key === 'Enter' || event.key === ' ')) event.preventDefault();
};

next.onclick = () => {
  if (stage === RIVER_ROUTES.length - 1) {
    if (!finished) {
      finished = true;
      next.textContent = journey.returnUrl ? '返回小岛地图' : '再游一次';
      if (!journey.reportComplete()) showLessonCelebration({title:'长江黄河通关！'});
      return;
    }
    if (journey.returnUrl) {
      location.assign(journey.returnUrl);
      return;
    }
  }
  openStage((stage + 1) % RIVER_ROUTES.length);
  word.scrollIntoView({block:'nearest'});
  word.focus({preventScroll:true});
};

new ResizeObserver(paintMap).observe(map);
openStage(0);

function showFlatMap() {
  scene?.dispose();
  scene = undefined;
  map.dataset.renderer = 'flat';
  reach.hidden = true;
  placeWord(RIVER_ROUTES[stage]);
}

import('./river-scene.js').then(({createRiverScene}) => {
  scene = createRiverScene(map, {
    onUnavailable:showFlatMap,
    onLayout:() => placeWord(RIVER_ROUTES[stage]),
  });
  scene.setRoute(RIVER_ROUTES[stage]);
  scene?.setProgress(boatStep, boat.classList.contains('is-sailing'));
  if (!scene) return;
  scene.setPaused(!review.hidden);
  map.dataset.renderer = '3d';
  reach.hidden = false;
  placeWord(RIVER_ROUTES[stage]);
}).catch(showFlatMap);

window.addEventListener('pagehide', event => {
  if (!event.persisted) scene?.dispose();
});
