import {FORM_CATALOG} from './construction-data.js';

function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}

function button(label, className, onClick) {
  const element = node('button', label, className);
  element.type = 'button';
  element.onclick = onClick;
  return element;
}

function componentShape(component, renderGlyph, className = 'part-shape') {
  const shape = node('span', undefined, className);
  renderGlyph(shape, component.example.character, component.example.indices, {fit:true});
  return shape;
}

function introductions(pool, renderGlyph) {
  const details = node('details', undefined, 'component-introductions');
  details.append(node('summary', `${pool.introductionLabel} · ${pool.newComponents.length}`));
  const list = node('div', undefined, 'component-intro-list');
  for (const component of pool.newComponents) {
    const item = node('article');
    item.append(componentShape(component, renderGlyph, 'intro-glyph'), node('strong', component.name), node('p', component.english));
    list.append(item);
  }
  if (!pool.newComponents.length) list.append(node('p', '本课使用的这些部件已在此前课次出现，可以复习。'));
  details.append(list);
  return details;
}

function coverage(pool) {
  const box = node('div', undefined, 'construction-coverage');
  if (pool.independent.length) box.append(node('p', `独体字或规范中保留为整体的部件：${pool.independent.join('、')}。这些字不强拆，可到“笔画很忙”练习。`));
  if (pool.excluded.length) box.append(node('p', `这些字暂不出拼图题：${pool.excluded.join('、')}。可继续做笔画练习。`));
  if (pool.unsupported.length) box.append(node('p', `尚无核定资料：${pool.unsupported.join('、')}。本轮先练习已核定的字。`));
  return box;
}

function references() {
  const details = node('details', undefined, 'construction-references');
  details.append(node('summary', '教学资料依据'), node('p', '部件参考《现代常用独体字规范》《现代常用字部件及部件名称规范》；笔顺参考《通用规范汉字笔顺规范》，笔名参考教育部书法教育指导纲要。组合部件不等于最小部件，英文说明不作字源推断。'));
  return details;
}

function animatePart(root, source, target, origin) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !source.animate) return;

  const startTop = Math.max(6, Math.min(origin.top, window.innerHeight - origin.height - 6));
  const end = target.getBoundingClientRect();
  const x = end.left + (end.width - origin.width) / 2 - origin.left;
  const y = end.top + (end.height - origin.height) / 2 - startTop;
  const scale = Math.min(end.width / origin.width, end.height / origin.height);
  const ghost = source.cloneNode(true);
  ghost.classList.add('puzzle-part-flight');
  ghost.setAttribute('aria-hidden', 'true');
  ghost.tabIndex = -1;
  ghost.style.left = origin.left + 'px';
  ghost.style.top = startTop + 'px';
  ghost.style.width = origin.width + 'px';
  ghost.style.height = origin.height + 'px';
  root.querySelector('.component-puzzle').append(ghost);

  target.classList.add('is-landing');
  const motion = ghost.animate([
    {transform:'translate(0px, 0px) scale(1)'},
    {transform:'translate(0px, -20px) scale(1.25)', offset:.3},
    {transform:'translate(' + x + 'px, ' + y + 'px) scale(' + scale + ')'},
  ], {duration:620, easing:'cubic-bezier(.22,.65,.28,1)'});
  const settle = () => {
    ghost.remove();
    target.classList.remove('is-landing');
  };
  motion.onfinish = motion.oncancel = settle;
}

function pickPart(root, source, palette, index, id, previousCount, onAction) {
  const scrollTop = palette.scrollTop;
  const hadFocus = document.activeElement === source;
  onAction('part', id);

  const nextPalette = root.querySelector('.parts-palette');
  const nextCard = nextPalette?.children[index];
  if (!nextCard) return;
  nextPalette.scrollTop = scrollTop;
  if (hadFocus) nextCard.focus({preventScroll:true});

  const selected = root.querySelectorAll('.parts-tray .selected-part');
  if (selected.length !== previousCount + 1) return;
  const target = selected[previousCount];
  target.scrollIntoView({block:'nearest', inline:'nearest', behavior:'instant'});
  animatePart(root, source, target, nextCard.getBoundingClientRect());
}

/** Render the discovery puzzle while leaving state transitions and glyph lifecycle to its owner. */
export function renderComponentPuzzle(root, {state, pool, onAction, renderGlyph}) {
  const wrapper = node('div', undefined, 'component-puzzle');
  const header = node('header', undefined, 'puzzle-heading');
  header.append(node('h3', '这些部件能拼出本课哪个字？'), node('p', '点选部件，再点「合一合」。同一部件可以多选，顺序不限。', 'construction-instruction'));
  wrapper.append(header);

  if (!pool.puzzles.length) {
    const empty = node('div', undefined, 'construction-empty');
    empty.append(node('h3', '本课先练笔画'), node('p', '本课没有可出题的核定分拆。请切换“笔画很忙”，认识整个汉字。'));
    wrapper.append(empty);
  }

  const row = node('div', undefined, 'puzzle-workspace');
  const choices = node('section', undefined, 'puzzle-choices');
  choices.setAttribute('aria-label', '可选择的部件');
  choices.append(node('h4', '部件'));
  const palette = node('div', undefined, 'parts-palette');
  for (const [index, component] of pool.components.entries()) {
    const card = button('', 'part-card', () => pickPart(root, card, palette, index, component.id, state.selected.length, onAction));
    card.setAttribute('aria-label', `选择${component.name}`);
    card.append(componentShape(component, renderGlyph), node('span', component.name));
    palette.append(card);
  }
  choices.append(palette);

  const assembly = node('section', undefined, 'puzzle-assembly');
  assembly.setAttribute('aria-label', '组合选中的部件');
  assembly.append(node('h4', '选中的部件'));
  const tray = node('div', undefined, 'parts-tray');
  tray.setAttribute('aria-label', '选中的部件');
  for (const [index, id] of state.selected.entries()) {
    const component = FORM_CATALOG.components[id];
    const card = button('', 'selected-part', () => onAction('remove', index));
    card.setAttribute('aria-label', `移除第${index + 1}个${component.name}`);
    card.append(componentShape(component, renderGlyph), node('span', `${component.name} ×`));
    tray.append(card);
  }
  if (!state.selected.length) tray.append(node('p', '从上方选择部件。'));
  const check = button('合一合', 'construction-primary', () => onAction('check', null));
  check.disabled = !state.selected.length;
  const message = state.feedback === 'retry' ? '这组还没有拼成本课的字，试着换一换部件。' : state.feedback === 'matched' ? '拼出来了！一起读一读，再找下一个。' : '可以先观察部件的形状。';
  const status = node('p', message, 'construction-status');
  status.setAttribute('role', 'status');
  assembly.append(tray, check, status);

  const answers = node('section', undefined, 'puzzle-answers');
  answers.setAttribute('aria-label', '拼出的汉字和本课发现');
  answers.append(node('h4', '拼出的字'));
  const reveal = node('div', undefined, 'puzzle-reveal');
  reveal.setAttribute('aria-live', 'polite');
  for (const character of state.revealed) {
    const record = pool.puzzles.find(puzzle => puzzle.character === character);
    if (!record) continue;
    const card = node('article');
    renderGlyph(card, character, null, {parts:record.parts});
    card.append(node('strong', character), node('p', record.parts.map(part => FORM_CATALOG.components[part.id].name).join(' ＋ ')));
    reveal.append(card);
  }
  answers.append(reveal);
  answers.append(node('h4', `本课发现 ${state.found.length} / ${pool.puzzles.length}`, 'puzzle-collection-label'));
  const collected = node('div', undefined, 'puzzle-collected');
  for (const character of state.found) collected.append(node('span', character));
  if (!state.found.length) collected.append(node('p', '找到的字会收集在这里。'));
  answers.append(collected);
  if (pool.puzzles.length && state.found.length === pool.puzzles.length) answers.append(node('p', '✦ 本课拼图全部完成！可以继续做笔画练习。', 'construction-celebrate'));
  row.append(choices, assembly, answers);
  wrapper.append(row, introductions(pool, renderGlyph), coverage(pool), references());
  root.append(wrapper);
}
