import {withEnglishInstruction} from './english-instructions.js';
import {createPoisonWitch} from './poison-witch.js';

export function poisonChallengeCards(pool, selectedIds, phase) {
  return phase === 'translate' ? pool.translations : pool.structures.filter(card => selectedIds.includes(card.id));
}

export function renderPoisonChallenge(host, model, dispatch) {
  const {challenge, pool, selectedIds, showPinyin} = model;
  const {phase, index} = challenge;
  const section = document.createElement('section');
  section.className = 'poison-challenge';
  const make = (tag, text, className) => {
    const element = document.createElement(tag);
    element.textContent = text;
    if (className) element.className = className;
    return element;
  };
  const button = (label, english, action, primary = true) => {
    const control = withEnglishInstruction(make('button', label, primary ? 'primary' : 'text-button'), english);
    control.type = 'button';
    control.onclick = () => dispatch(action);
    return control;
  };
  const heading = make('h3', '女巫被打败了！');
  heading.tabIndex = -1;
  section.append(heading);
  if (phase === 'victory') {
    const art = document.createElement('div');
    art.className = 'poison-victory-art';
    art.append(createPoisonWitch({defeated:true}));
    section.append(art, make('p', '三轮通关！'), button('再挑战一次', 'Play again', 'restart-challenge'), button('选择其他课', 'Choose another lesson', 'change-lesson', false));
    host.replaceChildren(section);
    return;
  }

  const translating = phase === 'translate';
  const cards = poisonChallengeCards(pool, selectedIds, phase);
  heading.textContent = translating ? '第 2 / 3 轮 · 说英语' : '第 3 / 3 轮 · 分析字的结构';
  const progress = make('p', `已答对 ${index} / ${cards.length}`, 'poison-challenge-count');
  progress.setAttribute('role', 'status');
  section.append(progress);
  const card = cards[index];
  if (!card) {
    section.append(make('p', '翻译轮完成！'), button('进入第三轮 · 分析结构', 'Round 3: Explain character structure', 'start-structure'));
    host.replaceChildren(section);
    return;
  }

  if (translating) {
    section.append(withEnglishInstruction(make('p', `把「${pool.translationLabel}」里的词语翻译成英语。`), 'Say the word in English.'));
  } else {
    section.append(withEnglishInstruction(make('p', '说说这个字是什么结构，部件在什么位置。'), 'Name the character structure and say where its parts go.'));
  }
  const question = document.createElement('div');
  question.className = 'poison-challenge-question';
  if (showPinyin && card.pinyin) question.append(make('small', card.pinyin));
  question.append(make('strong', card.word));
  section.append(question);

  if (!translating && (card.type || card.parts.length)) {
    const hint = document.createElement('details');
    hint.append(make('summary', '看结构提示'));
    if (card.type) hint.append(make('p', card.type));
    if (card.parts.length) hint.append(make('p', `部件：${card.parts.join('、')}`));
    section.append(hint);
  }
  const last = index + 1 === cards.length;
  section.append(button(last ? '答对了，完成本轮' : '答对了，下一题', last ? 'Correct. Finish this round.' : 'Correct. Next question.', 'correct-answer'));
  host.replaceChildren(section);
}
