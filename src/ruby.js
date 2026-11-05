export function ruby(text, pinyin) {
  if (!pinyin) return document.createTextNode(text);
  const element = document.createElement('ruby');
  const reading = document.createElement('rt');
  reading.textContent = pinyin;
  element.append(text, reading);
  return element;
}
