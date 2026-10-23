import { ZHONGWEN_BOOK_LABELS } from './zhongwen.js'

// Keep all source entries in order, even single characters, repeated words,
// phrases, and named entities. The workshop deduplicates playable words only.
export function renderZhongwenVocabulary(container, courses, {paradise = false} = {}) {
  container.replaceChildren()
  for (const course of courses) {
    const section = document.createElement('section')
    const heading = document.createElement('h4')
    heading.textContent = `${paradise ? `汉语乐园 ${course.stage}` : ZHONGWEN_BOOK_LABELS[course.stage]} · 第${course.lesson}课 ${course.title}`
    const characters = document.createElement('p')
    characters.className = 'zhongwen-characters'
    characters.textContent = `${paradise ? '识字范围' : '生字'}（${[...course.characters].length}）：${course.characters}`
    section.append(heading, characters)
    if (paradise) {
      const writing = document.createElement('p')
      writing.textContent = course.writingCharacters
        ? `学写字：${course.writingCharacters}`
        : `学写笔画：${course.writingStrokes.join('、')}`
      section.append(writing)
    }
    let group, previous
    for (const item of course.vocabulary) {
      const key = `${item.section}/${item.pdfPage}`
      if (key !== previous) {
        const label = document.createElement('p')
        label.className = 'muted'
        label.textContent = paradise
          ? `${item.section ?? 'New Words词汇表'} · PDF第${item.pdfPage}页（教材第${item.pdfPage - 3}页）`
          : `${item.section} · 教材第${item.printedPage}页`
        group = document.createElement('div')
        group.className = 'zhongwen-word-list'
        section.append(label, group)
        previous = key
      }
      const entry = document.createElement('span')
      const pinyin = document.createElement('small')
      const word = document.createElement('strong')
      pinyin.textContent = item.pinyin
      word.textContent = item.word
      entry.append(pinyin, word)
      group.append(entry)
    }
    container.append(section)
  }
}
