import { describe, expect, it } from 'vitest'
import { ZHONGWEN_COURSES, ZHONGWEN_ID, ZHONGWEN_QUESTIONS } from '../src/zhongwen.js'
import { ZHONGWEN_TRAIN_CONTENT } from '../src/zhongwen-train-content.js'
import { getZhongwenTrainQuestions, zhongwenTrainLabel } from '../src/zhongwen-train.js'
import { resolveTrainQuestion, validateSentenceTrain } from '../src/sentence-train-data.js'
import { createTrainSession } from '../src/sentence-train-core.js'

describe('Zhongwen textbook sentence train', () => {
  it('provides naturally segmented textbook excerpts in all 24 lessons with traceable sources', () => {
    expect(new Set(ZHONGWEN_TRAIN_CONTENT.map(q => q.id)).size).toBe(ZHONGWEN_TRAIN_CONTENT.length)
    for (const course of ZHONGWEN_COURSES) {
      const records = ZHONGWEN_TRAIN_CONTENT.filter(q => q.book === course.book && q.lesson === course.lesson)
      expect(records.length, `${course.book}/${course.lesson}`).toBeGreaterThanOrEqual(2)
      for (const record of records) {
        expect(record.lessonTitle).toBe(course.title)
        expect(['课文', '阅读']).toContain(record.section)
        expect(record.sourceTitle).toBeTruthy()
        expect(record.pdfPage - record.printedPage).toBe(15)
        expect(record.originalText.replace(/[^\p{Script=Han}]/gu, '')).toContain(record.sentence.slice(0, -1))
        if (record.originalText !== record.sentence) expect(record.notes).toBeTruthy()
        expect(validateSentenceTrain({tokens: record.tokens, punctuation: record.punctuation, alternatives: record.alternatives}, record.sentence)).toEqual({ok: true, errors: []})
      }
    }
  })

  it('selects full books, single lessons and cumulative lessons independently of stored character cards', () => {
    const firstLesson = getZhongwenTrainQuestions({stage: '1', lesson: 1, scope: 'lesson'})
    expect(firstLesson.length).toBeGreaterThanOrEqual(2)
    expect(firstLesson.every(q => q.textbook === ZHONGWEN_ID && q.book === 1 && q.lesson === 1)).toBe(true)
    const book2 = getZhongwenTrainQuestions({stage: '2', lesson: 1, scope: 'stage'})
    expect(new Set(book2.map(q => q.lesson)).size).toBe(12)
    expect(book2.every(q => q.book === 2)).toBe(true)
    const cumulative = getZhongwenTrainQuestions({stage: '2', lesson: 1, scope: 'cumulative'})
    expect(cumulative.some(q => q.book === 1 && q.lesson === 12)).toBe(true)
    expect(cumulative.every(q => q.book === 1 || q.lesson === 1)).toBe(true)
    expect(getZhongwenTrainQuestions({stage: '3', lesson: 1, scope: 'lesson'})).toEqual([])
    expect(getZhongwenTrainQuestions({stage: '2', lesson: 99, scope: 'lesson'})).toEqual([])
  })

  it('plays textbook sentences without changing character examples or sharing mutable segmentation', () => {
    const before = JSON.stringify(ZHONGWEN_QUESTIONS)
    const questions = getZhongwenTrainQuestions({stage: '2', lesson: 1, scope: 'lesson'})
    const first = questions[0]
    expect(zhongwenTrainLabel(first)).toBe('中文（暨南大学版） · 第二册 · 第1课 在中文学校')
    expect(resolveTrainQuestion(first)?.sentence).toBe(first.sentence)
    const session = createTrainSession({questions, random: () => 0.5})
    expect(session.phase).toBe('active')
    expect(session.questions.length).toBeGreaterThanOrEqual(2)
    expect(session.questions.every(q => q.trainSource.printedPage && q.train.tokens.join('') + q.train.punctuation === q.sentence)).toBe(true)
    first.sentenceTrain.tokens[0] = '修改'
    expect(getZhongwenTrainQuestions({stage: '2', lesson: 1, scope: 'lesson'})[0].sentenceTrain.tokens[0]).not.toBe('修改')
    expect(JSON.stringify(ZHONGWEN_QUESTIONS)).toBe(before)
  })
})
