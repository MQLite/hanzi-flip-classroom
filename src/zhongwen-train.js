import { filterCurriculum } from './curriculum.js'
import { ZHONGWEN_ID, ZHONGWEN_NAME, ZHONGWEN_BOOK_LABELS, ZHONGWEN_QUESTIONS } from './zhongwen.js'
import { ZHONGWEN_TRAIN_CONTENT } from './zhongwen-train-content.js'

// Textbook excerpts belong to courses, independently of editable character-card examples.
export function getZhongwenTrainQuestions(selection) {
  const courses = new Set(filterCurriculum(ZHONGWEN_QUESTIONS, {...selection, textbook: ZHONGWEN_ID})
    .map(question => `${question.book}/${question.lesson}`))
  return ZHONGWEN_TRAIN_CONTENT.filter(record => courses.has(`${record.book}/${record.lesson}`)).map(record => ({
    id: record.id,
    textbook: ZHONGWEN_ID,
    grade: record.book,
    book: record.book,
    lesson: record.lesson,
    sentence: record.sentence,
    sentenceTrain: {
      tokens: [...record.tokens],
      punctuation: record.punctuation,
      alternatives: record.alternatives.map(tokens => [...tokens]),
    },
    trainSource: {
      lessonTitle: record.lessonTitle,
      section: record.section,
      title: record.sourceTitle,
      printedPage: record.printedPage,
      pdfPage: record.pdfPage,
      notes: record.notes ?? '',
    },
  }))
}

export function zhongwenTrainLabel(question) {
  return `${ZHONGWEN_NAME} · ${ZHONGWEN_BOOK_LABELS[String(question.book)]} · 第${question.lesson}课 ${question.trainSource.lessonTitle}`
}
