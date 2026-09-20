import { createTrainScene } from './sentence-train-scene.js';

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

export function createTrainView(host, dispatch, onFallback) {
  host.innerHTML = `
    <div class="train-intro">
      <div class="train-title"><span class="eyebrow">THE SENTENCE EXPRESS</span><h3>把词语排成一句话</h3></div>
      <div class="train-actions"><button id="train-undo">撤回</button><button id="train-clear">清空</button><button id="train-check" class="primary">发车</button></div>
      <div class="train-secondary"><button id="train-reveal" class="text-button">看看参考句</button><button id="train-accept" class="secondary" hidden>老师判对</button></div>
    </div>
    <section id="train-scene" data-mode="simple">
      <div class="train-world-heading"><span>从候车场接上轨道 · 从左到右读 →</span><small id="train-remaining"></small></div>
      <div class="train-track-scroll" tabindex="0" aria-label="句子轨道，可横向滚动">
        <div class="train-world train-track-model">
          <div class="train-engine" aria-hidden="true">小火车</div>
          <div id="train-selected"></div><span id="train-punctuation" aria-hidden="true">。</span>
          <div id="train-palette"></div>
        </div>
      </div>
      <p class="train-scroll-hint">← 可以左右滑动车站，查看全部车厢 →</p>
      <div class="train-reading-row"><span>我的句子</span><p id="train-reading" aria-live="polite"></p></div>
      <p id="train-reference" hidden></p>
    </section>
    <div id="train-feedback" role="status" aria-live="polite"></div>
    <section id="train-summary" hidden></section>`;

  const $ = selector => host.querySelector(selector);
  let key = '', lastPalette, controlsRevision = 0;
  for (const intent of ['undo', 'clear', 'check', 'reveal', 'accept']) {
    $(`#train-${intent}`).onclick = () => dispatch(intent);
  }
  const scene = createTrainScene($('#train-scene'), { onFallback });

  function tileButton(tile, index, location) {
    const button = element('button', tile.text, 'train-tile');
    button.type = 'button';
    button.dataset.tile = tile.id;
    button.setAttribute('aria-label', `${tile.text}，${location}第${index + 1}节`);
    button.onclick = () => dispatch('tile', tile.id);
    return button;
  }

  function update(session) {
    const index = session.currentIndex;
    const question = session.questions[index];
    const active = session.phase === 'active';
    const judgment = session.judgments[index];
    const palette = session.palettes[index] ?? [];
    const selections = session.selections[index] ?? [];
    const locked = !active || Boolean(judgment) || Boolean(session.departure);
    const check = session.checks[index];
    const revealed = session.revealed[index];
    const nextKey = `${session.roundId ?? session.mode}:${question?.id}:${index}:${session.phase}`;
    const focused = document.activeElement?.dataset.tile;

    if (key !== nextKey || lastPalette !== palette) {
      key = nextKey;
      lastPalette = palette;
      controlsRevision++;
      $('#train-palette').replaceChildren(...palette.map((tile, i) => tileButton(tile, i, '候车区')));
      $('#train-selected').replaceChildren();
      $('.train-track-scroll').scrollLeft = 0;
    }
    for (const button of $('#train-palette').children) {
      const selected = selections.includes(button.dataset.tile);
      button.setAttribute('aria-pressed', String(selected));
      button.disabled = locked || selected;
      button.classList.toggle('is-selected', selected);
    }
    const previous = Array.from($('#train-selected').children).map(button => button.dataset.tile).join();
    if (previous !== selections.join()) {
      controlsRevision++;
      $('#train-selected').replaceChildren(...selections.map((id, i) => tileButton(palette.find(tile => tile.id === id), i, '轨道')));
      if (focused) {
        const target = $(`#train-selected [data-tile="${CSS.escape(focused)}"]`) ?? $(`#train-palette [data-tile="${CSS.escape(focused)}"]:not(:disabled)`);
        target?.focus({ preventScroll: true });
      }
    }
    for (const button of $('#train-selected').children) button.disabled = locked;

    const text = selections.map(id => palette.find(tile => tile.id === id)?.text ?? '').join('');
    $('#train-reading').textContent = text + (question?.train.punctuation ?? '');
    $('#train-punctuation').textContent = question?.train.punctuation ?? '';
    const remaining = palette.length - selections.length;
    $('#train-remaining').textContent = remaining ? `还差 ${remaining} 节 · 固定候车位` : '全部到齐，可以发车';
    $('#train-undo').disabled = locked || !selections.length;
    $('#train-clear').disabled = locked || !selections.length;
    $('#train-check').disabled = locked || selections.length !== palette.length;
    $('#train-reveal').disabled = locked || Boolean(revealed);
    $('#train-accept').hidden = locked || !check || (!revealed && check !== 'mismatch');
    $('#train-reference').hidden = !active || (!revealed && !judgment);
    $('#train-reference').textContent = `参考句：${question?.sentence ?? ''}`;

    let feedback = active ? '点击候车区接车厢；点击轨道上的车厢可以放回。' : '';
    if (judgment) {
      feedback = judgment.outcome === 'correct'
        ? `已记分 · ${judgment.source === 'teacher' ? '教师接受' : '参考答案匹配'} · ${judgment.sentence}`
        : judgment.outcome === 'practice' ? '已加入再练一次，点击下一句继续。' : '这一句未作答，回看不再计分。';
    } else if (check === 'mismatch') {
      feedback = '与参考答案不同，可以调整，也可以请老师判断。';
    } else if (check === 'match') {
      feedback = '与参考答案相符；已看过参考句，请老师判对后记分。';
    }
    $('#train-feedback').textContent = feedback;
    $('#train-scene').hidden = !active;
    $('.train-intro').hidden = !active;
    $('.train-actions').hidden = !active;
    $('.train-secondary').hidden = !active;
    const summary = $('#train-summary');
    summary.hidden = active;
    summary.replaceChildren();
    if (!active) {
      summary.append(element('span', session.phase === 'empty' ? '◇' : '★', 'train-summary-symbol'));
      summary.append(element('h3', session.phase === 'empty' ? '当前范围没有可用句子' : '这一轮，顺利到站！'));
      if (session.phase === 'empty') {
        summary.append(element('p', '当前筛选没有有效车厢切分。请在题库管理中为例句设置 3–7 节词语。'));
        const button = element('button', '设置句子题', 'primary');
        button.onclick = () => dispatch('editor');
        summary.append(button);
      } else {
        const count = outcome => session.judgments.filter(item => item?.outcome === outcome).length;
        summary.append(element('p', `${count('correct')} 句已完成 · ${session.judgments.filter(item => item?.source === 'teacher').length} 句教师接受`));
        summary.append(element('p', `${count('practice')} 句再练 · ${count('unanswered')} 句未作答`));
        if (count('practice')) {
          const button = element('button', '开始复习', 'primary');
          button.onclick = () => dispatch('review');
          summary.append(button);
        }
      }
    }
    scene.update({ palette: active ? palette : [], selections: active ? selections : [], key, controlsRevision, punctuation: question?.train.punctuation });
    if (previous !== selections.join() && selections.length && $('#train-scene').dataset.mode === 'simple') {
      $('#train-selected').lastElementChild?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    }
  }

  return { update, scene, dispose() { scene.dispose(); host.replaceChildren(); } };
}
