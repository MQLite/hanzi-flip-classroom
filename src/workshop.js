// Native word buttons stay alive while their 3D blocks move across the desk.
export function createWorkshopView(host, onSelect, onSubmit) {
  host.innerHTML = `<div id="workshop-active"><div id="workshop-scene" aria-label="立体组词桌面"><div class="workshop-simple-art" aria-hidden="true"></div><div class="desk-intro"><span class="desk-kicker">今天的汉字</span><div class="workshop-target-card"><span id="workshop-pinyin"></span><strong id="workshop-target"></strong></div><p>选一个词语方块<br>放到桌面中央</p></div><div class="desk-tray-caption"><span>我的词语</span><div id="workshop-word" aria-live="polite"></div></div><div id="workshop-tiles" aria-label="可选词语方块"></div><div class="desk-submit"><button id="workshop-submit" class="primary">提交词语 <span aria-hidden="true">↗</span></button><p id="workshop-selection-note" role="status">点选方块，开始今天的发现</p></div><div class="desk-palette-caption">词语方块 <span>轻点选择 · 一次一个</span></div><div id="desk-notebook"><span class="notebook-tab">我的发现</span><div id="desk-ledger-slot"></div><p class="notebook-foot">一个词语，一份新发现。</p></div></div></div><div id="workshop-status" hidden></div>`;
  const find = id => host.querySelector(`#${id}`);
  let paletteKey = '';
  find('workshop-submit').onclick = onSubmit;
  return {
    update({ question, value, options, showPinyin, statusNodes, recorded, locked, phase }) {
      const active = Boolean(question);
      find('workshop-active').hidden = !active;
      find('workshop-status').hidden = active;
      // Reuse the same ledger on the summary; records stay visible at round end.
      const ledger = find('workshop-collection-panel');
      if (ledger) find('desk-ledger-slot').append(ledger);
      if (!active) {
        find('workshop-status').replaceChildren(...statusNodes);
        if (phase === 'complete' && ledger) find('workshop-status').append(ledger);
        return;
      }
      find('workshop-target').textContent = question.character;
      find('workshop-pinyin').textContent = showPinyin ? question.pinyin : '';
      find('workshop-word').textContent = value;
      find('workshop-word').dataset.empty = String(!value);
      find('workshop-scene').dataset.selected = String(Boolean(value));
      find('workshop-submit').disabled = !value || recorded || locked;
      find('workshop-selection-note').textContent = locked ? '本题已结束，点击下一字继续' : recorded ? '这个词已记在本子里，试试其他词吧' : value ? '大声读一读，再提交到词语本' : options.length ? '点选方块，开始今天的发现' : '本题暂无可选词语，请在题库管理中补充';
      const key = JSON.stringify([question.id, options]);
      if (key !== paletteKey) {
        paletteKey = key;
        find('workshop-tiles').replaceChildren(...options.map(word => {
          const button = document.createElement('button');
          button.textContent = word; button.setAttribute('aria-label', word); button.dataset.word = word;
          button.style.setProperty('--word-length', Math.max(2,[...word].length));
          button.onclick = () => onSelect(word);
          return button;
        }));
      }
      find('workshop-tiles').querySelectorAll('button').forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.word === value));
        button.disabled = Boolean(locked);
      });
    },
  };
}
