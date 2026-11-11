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
  const readCard = find('tour-read');
  const word = find('tour-word');
  const confirmWord = find('tour-advance');
  const destinations = find('tour-destinations');
  const choices = find('tour-choices');
  const feedback = find('tour-feedback');
  const reading = find('tour-place-reading');
  const words = find('tour-place-words');
  const sentence = find('tour-sentence');
  const confirmSentence = find('tour-confirm-sentence');
  const advanceStage = find('tour-next-stage');
  const arrival = find('tour-arrival');
  const landmarks = find('tour-endpoints');

  let stage, index, atPlace, scene, points, generation = 0;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function closeScene() {
    generation++;
    scene?.dispose();
    scene = null;
    map.dataset.renderer = 'flat';
  }

  function moveDoudou() {
    position(doudou, points[index]);
    scene?.moveTo(index);
  }

  function loadScene() {
    const current = generation;
    import('./city-tour-3d.js').then(({createTourScene}) => {
      if (current !== generation) return;
      scene = createTourScene(map, {stage, points, onUnavailable:closeScene});
      map.dataset.renderer = '3d';
      scene.moveTo(index, {immediate:true});
    }).catch(() => {
      if (current === generation) closeScene();
    });
  }

  function makeMapPoint(point, className, label = '') {
    const node = document.createElement('span');
    node.className = className;
    node.textContent = label;
    position(node, point);
    return node;
  }

  function showTitle(name, pinyin, english) {
    title.replaceChildren(annotated(name, pinyin, english));
    title.setAttribute('aria-label', name);
  }

  function routeStep() {
    const route = READING_ROUTES[stage];
    const complete = index === route.words.length;
    for (const [step, marker] of [...pointsLayer.children].entries()) {
      marker.classList.toggle('is-read', step < index);
      marker.classList.toggle('is-next', step === index);
    }
    counter.textContent = index + ' / ' + route.words.length;
    readCard.hidden = complete;
    arrival.hidden = !complete;
    advanceStage.hidden = !complete;
    if (complete) {
      arrival.textContent = route.arrival;
      advanceStage.textContent = route.next;
    } else {
      word.textContent = route.words[index];
    }
    moveDoudou();
  }

  function showBeijingStop() {
    const stop = BEIJING_STOPS[index];
    atPlace = false;
    instruction.textContent = '说出豆豆身边的地名，再选一选。';
    reading.hidden = true;
    choices.hidden = false;
    feedback.textContent = '';
    counter.textContent = (index + 1) + ' / ' + BEIJING_STOPS.length;
    for (const [step, marker] of [...pointsLayer.children].entries()) {
      marker.classList.toggle('is-read', step < index);
      marker.classList.toggle('is-next', step === index);
    }
    moveDoudou();
  }

  function choosePlace(stop) {
    if (atPlace || stage !== 'beijing') return;
    if (stop !== BEIJING_STOPS[index]) {
      feedback.textContent = '再看看豆豆身边的地标，试一试。';
      return;
    }
    atPlace = true;
    feedback.textContent = '';
    choices.hidden = true;
    instruction.textContent = '读出字词和整句，再去下一站。';
    words.replaceChildren(annotated(...stop.name), ...stop.words.map(row => annotated(...row)));
    const sentenceText = stop.sentence.map(([hanzi]) => hanzi).join('');
    const line = document.createElement('p');
    line.className = 'tour-sentence-line';
    line.replaceChildren(...stop.sentence.map(([hanzi, pinyin]) => ruby(hanzi, pinyin)));
    sentence.replaceChildren(line, gloss(stop.english));
    sentence.setAttribute('aria-label', sentenceText);
    confirmSentence.textContent = index === BEIJING_STOPS.length - 1 ? '读完了，完成探索' : '读完了，去下一站';
    reading.hidden = false;
    sentence.focus({preventScroll:true});
  }

  const placeOrder = [BEIJING_STOPS[2], BEIJING_STOPS[0], BEIJING_STOPS[3], BEIJING_STOPS[1]];
  choices.replaceChildren(...placeOrder.map(stop => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', stop.name[0]);
    button.append(annotated(...stop.name));
    button.onclick = () => choosePlace(stop);
    return button;
  }));

  function open(id) {
    closeScene();
    stage = id;
    index = 0;
    root.hidden = false;
    map.hidden = false;
    map.dataset.scene = id;
    instruction.hidden = counter.hidden = false;
    advanceStage.hidden = true;
    advanceStage.disabled = false;
    arrival.hidden = true;
    find('tour-restart').hidden = true;
    const heading = CITY_TOUR_STAGES.find(item => item.id === id);
    showTitle(heading.name, heading.pinyin, heading.english);
    const route = READING_ROUTES[id];
    destinations.hidden = Boolean(route);
    readCard.hidden = !route;
    landmarks.hidden = !route;

    if (route) {
      points = route.points;
      instruction.textContent = route.instruction;
      landmarks.replaceChildren(...route.landmarks.map(name => {
        const span = document.createElement('span');
        span.textContent = name;
        return span;
      }));
      pointsLayer.replaceChildren(...points.slice(1).map((point, step) => {
        if (id === 'river') return makeMapPoint(point, 'tour-route-point');
        const [x, y] = point;
        const offset = step % 2 ? 1 : -7;
        return makeMapPoint([x + offset, y], 'tour-route-point tour-stair-label', route.words[step]);
      }));
      routeStep();
    } else {
      points = BEIJING_STOPS.map(stop => stop.point);
      pointsLayer.replaceChildren(...points.map(point => makeMapPoint(point, 'tour-route-point tour-city-pin')));
      showBeijingStop();
    }

    onStage(id);
    title.focus();
    loadScene();
  }

  confirmWord.onclick = () => {
    const route = READING_ROUTES[stage];
    if (!route || index >= route.words.length) return;
    index++;
    routeStep();
    if (index !== route.words.length) return;
    if (stage === 'mountain') {
      advanceStage.disabled = true;
      const current = generation;
      window.setTimeout(() => {
        if (current !== generation) return;
        showLessonCelebration({title:route.arrival, durationMs:5000, onClose:() => {
          advanceStage.disabled = false;
          advanceStage.focus();
        }});
      }, reducedMotion.matches ? 0 : 1050);
    } else {
      advanceStage.focus();
    }
  };

  advanceStage.onclick = () => open(READING_ROUTES[stage].nextStage);

  confirmSentence.onclick = () => {
    if (!atPlace || stage !== 'beijing') return;
    index++;
    if (index < BEIJING_STOPS.length) {
      showBeijingStop();
      choices.querySelector('button').focus({preventScroll:true});
      return;
    }
    atPlace = false;
    closeScene();
    stage = 'complete';
    map.hidden = instruction.hidden = counter.hidden = destinations.hidden = true;
    title.textContent = '四关都完成啦！';
    title.removeAttribute('aria-label');
    arrival.textContent = '豆豆找回了记忆，也走完了中国之旅。';
    arrival.hidden = false;
    find('tour-restart').hidden = false;
    onStage(stage);
    title.focus();
    onFinish();
  };

  find('tour-restart').onclick = () => {
    root.hidden = true;
    onRestart();
  };
  window.addEventListener('pagehide', event => { if (!event.persisted) closeScene(); });
  return {open};
}
