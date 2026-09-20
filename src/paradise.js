import { PARADISE_CONTENT, PARADISE_EXAMPLES } from './paradise-content.js'

// Local scans of the original six-volume Hanyu Paradise student books.
// Vocabulary/lesson provenance is in PARADISE_CONTENT; examples are teacher aids.
export const PARADISE_ID = 'hanyu-paradise-ab'
export const PARADISE_COURSES = PARADISE_CONTENT.map(course => ({
  ...course,
  unit: Math.floor((course.lesson - 1) / 2) + 1,
  characters: [...new Set([...course.vocabulary.map(v => v.word).join(''), ...course.writingCharacters]
    .filter(character => /\p{Script=Han}/u.test(character)))].join(''),
}))

export const PARADISE_QUESTIONS = PARADISE_COURSES.flatMap(course => [...course.characters].map(character => {
  const [pinyin, first, second, sentence] = course.examples?.[character] ?? PARADISE_EXAMPLES[character]
  return {
    id: `hypy-${course.stage}-${course.lesson}-${character}`,
    grade: course.book, character, pinyin, words: [first, second], sentence,
    textbook: PARADISE_ID, book: course.book, lesson: course.lesson,
  }
}))
