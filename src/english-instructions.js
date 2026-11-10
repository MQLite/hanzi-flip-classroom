export function withEnglishInstruction(element, english) {
  if (english) element.dataset.englishInstruction = english;
  return element;
}

export function syncEnglishInstructions(host) {
  const enabled = host.classList.contains('show-english-instructions');
  for (const element of host.querySelectorAll('[data-english-instruction]')) {
    const existing = element.querySelector(':scope > .game-instruction-english');
    if (!enabled) {
      existing?.remove();
    } else if (!existing) {
      const translation = document.createElement('span');
      translation.className = 'game-instruction-english';
      translation.lang = 'en';
      translation.textContent = element.dataset.englishInstruction;
      element.append(translation);
    }
  }
}
