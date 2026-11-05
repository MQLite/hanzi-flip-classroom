export function ruby(text, pinyin) {
  if (!pinyin) return document.createTextNode(text);
  const element = document.createElement('ruby');
  const reading = document.createElement('rt');
  reading.textContent = pinyin;
  element.append(text, reading);
  return element;
}

export function gloss(english) {
  const node = document.createElement('small');
  node.lang = 'en';
  node.textContent = english;
  return node;
}
