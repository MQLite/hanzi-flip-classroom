import HanziWriter from "hanzi-writer";

// This is a display-only writer. Quiz pointer listeners would otherwise attach
// to document and retain each detached diagram after classroom navigation.
function createDisplayTarget(host, width, height) {
  const create = name => document.createElementNS('http://www.w3.org/2000/svg', name);
  const svg = create('svg'), defs = create('defs');
  svg.setAttribute('width', String(width)); svg.setAttribute('height', String(height));
  svg.append(defs); host.append(svg);
  function target(node) {
    return {
      node, svg:node, defs,
      createSubRenderTarget() { const group=create('g'); node.append(group); return target(group); },
      getBoundingClientRect() { return node.getBoundingClientRect(); },
      updateDimensions(w,h) { node.setAttribute('width',String(w)); node.setAttribute('height',String(h)); },
      addPointerStartListener() {}, addPointerMoveListener() {}, addPointerEndListener() {},
    };
  }
  return target(svg);
}

export function mountStrokes(host, question, {inline = false, autoplay = false, delay = 0} = {}) {
  const controller = new AbortController();
  const prefix = inline ? 'card-stroke' : 'stroke';
  const startsAt = performance.now() + delay;
  let writer, step = 0, paused = false, playing = false, disposed = false, timer, play, animationId = 0;
  const content = document.createElement('div');
  content.className = 'stroke-content';
  host.replaceChildren(content);
  const setState = state => { host.dataset.strokeState = state; };
  setState('loading');
  const fallback = document.createElement('span');
  if (inline) {
    fallback.id = `${prefix}-fallback`;
    fallback.textContent = question.character;
    content.append(fallback);
  } else {
    const meta = document.createElement('p');
    meta.className = 'stroke-meta';
    meta.textContent = [question.radical && `部首：${question.radical}`, question.structure, question.components].filter(Boolean).join(' · ');
    content.append(meta);
  }
  const status = document.createElement('p');
  status.id = `${prefix}-status`;
  status.textContent = '正在准备笔顺…';
  status.setAttribute('aria-live', 'polite');
  content.append(status);
  function clean() {
    disposed = true;
    animationId++;
    clearTimeout(timer);
    controller.abort();
    writer?.pauseAnimation();
    content.remove();
  }
  async function load() {
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}strokes/${encodeURIComponent(question.character)}.json`, {signal:controller.signal});
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (disposed) return;
      if (!Array.isArray(data.strokes) || !data.strokes.length ||
          !data.strokes.every(path => typeof path === 'string' && /^[Mm]/.test(path)) ||
          !Array.isArray(data.medians) || data.medians.length !== data.strokes.length ||
          !data.medians.every(stroke => Array.isArray(stroke) && stroke.length >= 2 &&
            stroke.every(point => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite)))) throw new Error('Invalid stroke geometry');
      if (question.character === '行' && question.radical === '彳') data.radStrokes = [0, 1, 2];
      if (question.strokeCount && question.strokeCount !== data.strokes.length) {
        status.textContent = '笔画数与本地演示不一致，请在题库中核对；本题暂不展示动画。';
        setState('fallback');
        return;
      }
      const target = document.createElement('div');
      target.id = `${prefix}-target`;
      target.setAttribute('role', 'img');
      target.setAttribute('aria-label', `${question.character}的笔顺书写`);
      content.append(target);
      const initializedWriter = new HanziWriter(target, {
        rendererOverride:{createRenderTarget:createDisplayTarget},
        width:190, height:190, padding:12,
        showOutline:true, showCharacter:false,
        strokeColor:'#244e41',
        radicalColor:Array.isArray(data.radStrokes) && data.radStrokes.length ? '#cf702e' : null,
        outlineColor:'#d9e3d9', strokeAnimationSpeed:1.3, delayBetweenStrokes:160,
        charDataLoader:(_char, onLoad)=>onLoad(data),
      });
      await initializedWriter.setCharacter(question.character);
      if (disposed) { initializedWriter.pauseAnimation(); return; }
      writer = initializedWriter;
      target.querySelector('svg')?.setAttribute('viewBox', '0 0 190 190');
      if (inline) fallback.hidden = true;
      status.textContent = `共 ${data.strokes.length} 笔${data.radStrokes?.length ? ' · 橙色标出数据中的部首笔画' : ''}`;
      setState('ready');
      const controls = document.createElement('div');
      controls.className = 'stroke-controls';
      content.append(controls);
      function button(label, action) {
        const b = document.createElement('button');
        b.type = 'button'; b.textContent = label; b.onclick = action;
        controls.append(b); return b;
      }
      function animate() {
        if (disposed) return;
        clearTimeout(timer);
        step = 0; paused = false; playing = true;
        setState('playing');
        status.textContent = `正在书写 · 共 ${data.strokes.length} 笔`;
        if (play) play.textContent = '暂停';
        const currentAnimation = ++animationId;
        writer.animateCharacter({onComplete:()=>{
          if (disposed || currentAnimation !== animationId) return;
          playing = paused = false;
          if (play) play.textContent = '播放';
          setState('complete');
          status.textContent = `已完成 ${data.strokes.length} 笔`;
        }});
      }
      if (!inline) play = button('播放', ()=>{
        if (paused) {
          writer.resumeAnimation(); paused = false; playing = true;
          play.textContent = '暂停'; setState('playing');
        } else if (playing) {
          writer.pauseAnimation(); paused = true; playing = false;
          play.textContent = '播放'; setState('paused');
        } else animate();
      });
      button(inline ? '重播笔顺' : '重播', animate);
      if (!inline) button('逐笔', async ()=>{
        animationId++;
        playing = paused = false; play.textContent = '播放';
        if (step >= data.strokes.length) {
          step = 0;
          await writer.hideCharacter({duration:0});
          if (disposed) return;
        }
        writer.animateStroke(step++);
        setState('step');
        status.textContent = `第 ${step} 笔 / 共 ${data.strokes.length} 笔`;
      });
      if (autoplay) timer = setTimeout(animate, Math.max(0, startsAt - performance.now()));
    } catch (error) {
      if (!disposed && error.name !== 'AbortError') {
        status.textContent = `${question.strokeCount ? `共 ${question.strokeCount} 笔 · ` : ''}暂无笔顺演示`;
        content.querySelector(`#${prefix}-target`)?.remove();
        fallback.hidden = false;
        setState('fallback');
      }
    }
  }
  // Synchronous cleanup prevents a late fetch or delayed autoplay reviving an old card.
  void load();
  return clean;
}
