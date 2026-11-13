import {BEIJING_STOPS, CITY_TOUR_STAGES, READING_ROUTES} from './city-tour-data.js';
import {ruby, gloss} from './ruby.js';
import {showLessonCelebration} from './lesson-celebration.js';
import './city-tour.css';

function annotated(text, pinyin, english) {
  const span = document.createElement('span');
  span.className = 'tour-annotation';
  span.append(ruby(text, pinyin), gloss(english));
  return span;
}

function position(node, [x, y]) {
  node.style.left = x + '%';
  node.style.top = y + '%';
}

export function mountCityTour(root, {onStage, onFinish, onRestart}) {
  const find = id => root.querySelector('#' + id);
  const title = find('tour-title');
  const map = find('tour-map');
  const pointsLayer = find('tour-points');
  const doudou = find('tour-doudou');
  const instruction = find('tour-instruction');
  const counter = find('tour-counter');
  const card = find('tour-card');
  const summary = find('tour-summary');
  const landmarks = find('tour-endpoints');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let stage, index, readingIndex, points, cardPoint, scene, pendingArrival;
  let generation = 0, travelTimer = 0;

  function closeScene() {
    generation++;
    scene?.dispose();
    scene = null;
    map.dataset.renderer = 'flat';
  }

  function finishMove() {
    window.clearTimeout(travelTimer);
    const afterMove = pendingArrival;
    pendingArrival = null;
    afterMove?.();
  }

  function moveDoudou(afterMove) {
    card.hidden = true;
    pendingArrival = afterMove;
    position(doudou, points[index]);
    if (scene) scene.moveTo(index, {onArrival:finishMove});
    else if (reducedMotion.matches) finishMove();
    else travelTimer = window.setTimeout(finishMove, 650);
  }

  function loadScene() {
    const current = generation;
    import('./city-tour-3d.js').then(({createTourScene}) => {
      if (current !== generation) return;
      scene = createTourScene(map, {stage, points, onUnavailable:() => {
        closeScene();
        finishMove();
      }});
      map.dataset.renderer = '3d';
      scene.moveTo(index, {immediate:true});
    }).catch(() => {
      if (current === generation) closeScene();
    });
  }

  function placeCard() {
    if (card.hidden || !cardPoint) return;
    const margin = 9;
    const width = map.clientWidth, height = map.clientHeight;
    const halfWidth = card.offsetWidth / 2, halfHeight = card.offsetHeight / 2;
    const [x, y] = cardPoint;
    let centerX = width * x / 100;
    let centerY = height * y / 100;
    if (stage === 'beijing') {
      centerX += (x < 55 ? 1 : -1) * (halfWidth + 22);
    } else if (stage === 'river') {
      centerY += halfHeight + 13;
    } else {
      centerX += width * .04 + halfWidth * .5;
      centerY -= halfHeight * .45;
    }
    card.style.left = Math.min(width - halfWidth - margin, Math.max(halfWidth + margin, centerX)) + 'px';
    card.style.top = Math.min(height - halfHeight - margin, Math.max(halfHeight + margin, centerY)) + 'px';
  }

  function showCard(point, label, kind, content = label) {
    cardPoint = point;
    card.dataset.kind = kind;
    card.replaceChildren(content);
    card.setAttribute('aria-label', label);
    card.hidden = false;
    placeCard();
  }

  function showPoints(active) {
    for (const [step, marker] of [...pointsLayer.children].entries()) {
      marker.classList.toggle('is-read', step < active);
      marker.classList.toggle('is-next', step === active);
    }
  }

  function showRouteWord(route) {
    showPoints(index);
    counter.textContent = index + ' / ' + route.words.length;
    const [word, pinyin] = route.words[index];
    showCard(points[index + 1], word, 'word', ruby(word, pinyin));
  }

  function advanceRoute(route) {
    if (index === route.words.length) {
      open(route.nextStage);
      return;
    }

    index++;
    moveDoudou(() => {
      if (index < route.words.length) {
        showRouteWord(route);
        card.focus({preventScroll:true});
        return;
      }
      showPoints(index);
      counter.textContent = index + ' / ' + route.words.length;
      instruction.textContent = route.arrival;
      const showNext = () => {
        showCard(points[index], route.next, 'next');
        card.focus({preventScroll:true});
      };
      if (stage === 'mountain') showLessonCelebration({title:route.arrival, durationMs:5000, onClose:showNext});
      else showNext();
    });
  }

  function showBeijingReading() {
    const stop = BEIJING_STOPS[index];
    const entries = [stop.name, ...stop.words];
    if (readingIndex < 0) {
      showCard(stop.point, '说出地名', 'prompt');
      return;
    }
    if (readingIndex < entries.length) {
      const entry = entries[readingIndex];
      showCard(stop.point, entry[0], 'reading', annotated(...entry));
      return;
    }
    const content = document.createElement('span');
    const line = document.createElement('span');
    line.className = 'tour-sentence-line';
    line.append(...stop.sentence.map(([hanzi, pinyin]) => ruby(hanzi, pinyin)));
    content.append(line, gloss(stop.english));
    const sentence = stop.sentence.map(([hanzi]) => hanzi).join('');
    showCard(stop.point, sentence, 'sentence', content);
  }

  function showBeijingStop() {
    readingIndex = -1;
    instruction.textContent = '看图说出地名，再点词牌核对。';
    counter.textContent = (index + 1) + ' / ' + BEIJING_STOPS.length;
    showPoints(index);
    showBeijingReading();
  }

  function advanceBeijing() {
    if (readingIndex < BEIJING_STOPS[index].words.length + 1) {
      readingIndex++;
      instruction.textContent = '读完词牌上的字词或句子，点一下继续。';
      showBeijingReading();
      return;
    }

    index++;
    if (index < BEIJING_STOPS.length) {
      moveDoudou(() => {
        showBeijingStop();
        card.focus({preventScroll:true});
      });
      return;
    }

    closeScene();
    stage = 'complete';
    map.hidden = instruction.hidden = counter.hidden = card.hidden = true;
    title.textContent = '四关都完成啦！';
    title.removeAttribute('aria-label');
    summary.hidden = false;
    onStage(stage);
    title.focus();
    onFinish();
  }

  function open(id) {
    closeScene();
    stage = id;
    index = 0;
    root.hidden = map.hidden = instruction.hidden = counter.hidden = false;
    summary.hidden = true;
    map.dataset.scene = id;

    const heading = CITY_TOUR_STAGES.find(item => item.id === id);
    title.replaceChildren(annotated(heading.name, heading.pinyin, heading.english));
    title.setAttribute('aria-label', heading.name);
    const route = READING_ROUTES[id];
    landmarks.hidden = !route;
    points = route ? route.points : BEIJING_STOPS.map(stop => stop.point);
    pointsLayer.replaceChildren(...(route ? points.slice(1) : points).map(point => {
      const marker = document.createElement('span');
      marker.className = 'tour-route-point';
      position(marker, point);
      return marker;
    }));
    position(doudou, points[index]);

    if (route) {
      instruction.textContent = route.instruction;
      landmarks.replaceChildren(...route.landmarks.map(name => {
        const span = document.createElement('span');
        span.textContent = name;
        return span;
      }));
      showRouteWord(route);
    } else {
      showBeijingStop();
    }

    onStage(id);
    title.focus({preventScroll:true});
    window.scrollTo(0, 0);
    loadScene();
  }

  card.onclick = event => {
    if (card.hidden || event.detail > 1) return;
    const route = READING_ROUTES[stage];
    if (route) advanceRoute(route);
    else if (stage === 'beijing') advanceBeijing();
  };
  card.onkeydown = event => {
    if (event.repeat && (event.key === 'Enter' || event.key === ' ')) event.preventDefault();
  };
  const observer = new ResizeObserver(placeCard);
  observer.observe(map);
  observer.observe(card);

  find('tour-restart').onclick = () => {
    root.hidden = true;
    onRestart();
  };
  window.addEventListener('pagehide', event => {
    if (event.persisted) return;
    window.clearTimeout(travelTimer);
    pendingArrival = null;
    observer.disconnect();
    closeScene();
  });
  return {open};
}
