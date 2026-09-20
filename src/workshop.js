import { validateWord } from './workshop-core.js';

// Keep the form and its event targets alive throughout a round, including IME input.
export function createWorkshopView(host, onDraft) {
  host.innerHTML = `<div id="workshop-active"><div class="workshop-topline"><div class="workshop-target-card"><span id="workshop-pinyin"></span><strong id="workshop-target"></strong></div><div><span class="eyebrow">小小组词师</span><h3>用这个字，组一个词</h3><p>点选字块，也可以输入自己的词语。</p></div></div><div class="workshop-bench"><div id="workshop-scene" aria-label="组词工作台"><div class="workshop-simple-art" aria-hidden="true"><span>▣ ▣ ▣</span><i></i><small>我的组词工作台</small></div></div><div class="workshop-word-wrap"><span>我的词语</span><div id="workshop-word" aria-live="polite"></div></div></div><div class="workshop-edit"><div class="workshop-palette-row"><div id="workshop-tiles" aria-label="可选字块"></div><div class="workshop-edit-actions"><button id="workshop-undo">撤回一字</button><button id="workshop-clear">清空</button></div></div><p id="workshop-palette-note">搭配字可能超出本课，可由老师带读。</p><div class="workshop-input-row"><label for="workshop-input">输入其他词语</label><input id="workshop-input" autocomplete="off" placeholder="2–8 个汉字，包含目标字" aria-describedby="workshop-validation"><span id="workshop-validation" role="status"></span></div><div id="workshop-reference" hidden><div id="workshop-reference-words"></div><p id="workshop-reference-sentence"></p><small>其他合理组词也可以，由老师判断。</small></div></div></div><div id="workshop-status" hidden></div>`;
  const find = id => host.querySelector(`#${id}`);
  const input = find('workshop-input');
  let draft = '', locked = false, composing = false, paletteKey = '';
  const change = value => { if (!locked) onDraft(value); };
  input.addEventListener('compositionstart', () => { composing = true; });
  input.addEventListener('compositionend', () => { composing = false; change(input.value); });
  input.addEventListener('input', () => { if (!composing) change(input.value); });
  input.addEventListener('blur', () => { if (!composing && !locked && input.value !== input.value.trim()) change(input.value.trim()); });
  find('workshop-undo').onclick = () => change([...draft.trim()].slice(0, -1).join(''));
  find('workshop-clear').onclick = () => change('');
  return {
    update({ question, value, tiles, revealed, judgment, showPinyin, statusNodes }) {
      const active = Boolean(question);
      find('workshop-active').hidden = !active;
      find('workshop-status').hidden = active;
      if (!active) { find('workshop-status').replaceChildren(...statusNodes); return; }
      draft = value;
      locked = Boolean(judgment);
      find('workshop-target').textContent = question.character;
      find('workshop-pinyin').textContent = showPinyin ? question.pinyin : '';
      find('workshop-word').textContent = value.trim();
      find('workshop-word').dataset.empty = String(!value.trim());
      if (!composing && input.value !== value) input.value = value;
      input.disabled = locked;
      const validation = validateWord(value, question.character);
      find('workshop-validation').textContent = locked ? '本题已记录' : validation.ok ? '格式符合要求，词义由老师判断' : validation.error;
      input.setAttribute('aria-invalid', String(Boolean(value) && !validation.ok));
      find('workshop-validation').classList.toggle('invalid', Boolean(value) && !validation.ok);
      const key = JSON.stringify([question.id, tiles]);
      if (key !== paletteKey) {
        paletteKey = key;
        find('workshop-tiles').replaceChildren(...tiles.map(character => {
          const button = document.createElement('button');
          button.textContent = character;
          button.className = character === question.character ? 'target-tile' : '';
          button.onclick = () => { if ([...draft.trim()].length < 8) change(draft.trim() + character); };
          return button;
        }));
      }
      find('workshop-tiles').querySelectorAll('button').forEach(button => { button.disabled = locked || [...value.trim()].length >= 8; });
      find('workshop-undo').disabled = locked || !value;
      find('workshop-clear').disabled = locked || !value;
      find('workshop-palette-note').textContent = question.words.some(word => validateWord(word, question.character).ok)
        ? '搭配字可能超出本课，可由老师带读。' : '请老师输入组词；也可重复点选目标字。';
      find('workshop-reference').hidden = !revealed;
      find('workshop-reference-words').textContent = `参考词：${question.words.join(' · ')}`;
      find('workshop-reference-sentence').textContent = `题库例句：${question.sentence}`;
    },
  };
}
