import { filterCurriculum } from './curriculum.js'
import { PARADISE_ID, PARADISE_QUESTIONS } from './paradise.js'
import { PARADISE_TRAIN_CONTENT } from './paradise-train-content.js'

export function getParadiseTrainQuestions(selection) {
  const courses = new Set(filterCurriculum(PARADISE_QUESTIONS, {...selection, textbook:PARADISE_ID})
    .map(question=>`${question.book}/${question.lesson}`))
  return PARADISE_TRAIN_CONTENT.filter(record=>courses.has(`${record.book}/${record.lesson}`)).map(record=>({
    id:record.id,
    textbook:PARADISE_ID,
    grade:record.book,
    book:record.book,
    lesson:record.lesson,
    sentence:record.sentence,
    sentenceTrain:{
      tokens:[...record.tokens],
      punctuation:record.punctuation,
      alternatives:record.alternatives.map(tokens=>[...tokens]),
    },
    trainSource:{
      stage:record.stage,
      lessonTitle:record.lessonTitle,
      section:record.section,
      title:record.sourceTitle,
      printedPage:record.printedPage,
      pdfPage:record.pdfPage,
      notes:record.notes??'',
    },
  }))
}

export function paradiseTrainLabel(question) {
  return `汉语乐园 · ${question.trainSource.stage} · 第${question.lesson}课 ${question.trainSource.lessonTitle}`
}
