import { ZHONGWEN_CONTENT } from './zhongwen-content.js'

export const ZHONGWEN_ID = 'zhongwen-primary-2023'
export const ZHONGWEN_BOOK_LABELS = { '1': '第一册', '2': '第二册' }
export const ZHONGWEN_COURSES = ZHONGWEN_CONTENT.map(course => ({
  ...course,
  stage: String(course.book),
  unit: Math.ceil(course.lesson / 3),
  characterDetails: course.characters,
  characters: course.characters.map(item => item.character).join(''),
}))

export const ZHONGWEN_QUESTIONS = ZHONGWEN_COURSES.flatMap(course =>
  course.characterDetails.map(item => ({
    id: `zw2023-${course.book}-${course.lesson}-${item.character}`,
    grade: course.book,
    character: item.character,
    pinyin: item.pinyin,
    words: [...item.words],
    sentence: item.sentence,
    textbook: ZHONGWEN_ID,
    book: course.book,
    lesson: course.lesson,
  })),
)
