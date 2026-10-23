import { ZHONGWEN_BOOK_LABELS } from './zhongwen.js'

// Keep all source entries in order, even single characters, repeated words,
// phrases, and named entities. The workshop deduplicates playable words only.
export function renderZhongwenVocabulary(container, courses) {
  container.replaceChildren()
  for (const course of courses) {
    const section = document.createElement('section')
    const heading = document.createElement('h4')
    heading.textContent = `${ZHONGWEN_BOOK_LABELS[course.stage]} · 第${course.lesson}课 ${course.title}`
    const characters = document.createElement('p')
    characters.className = 'zhongwen-characters'
    characters.textContent = `生字（${course.characterDetails.length}）：${course.characters}`
    section.append(heading, characters)
    let group, previous
    for (const item of course.vocabulary) {
      const key = `${item.section}/${item.pdfPage}`
      if (key !== previous) {
        const label = document.createElement('p')
        label.className = 'muted'
        label.textContent = `${item.section} · 教材第${item.printedPage}页`
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
