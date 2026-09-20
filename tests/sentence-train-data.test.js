import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'

import { COURSES, TEXTBOOK_QUESTIONS } from '../src/curriculum.js'
import { DEFAULT_QUESTIONS } from '../src/data.js'
import { PARADISE_COURSES, PARADISE_QUESTIONS } from '../src/paradise.js'
import { SENTENCE_TRAIN_CONTENT } from '../src/sentence-train-content.js'
import { resolveTrainQuestion, validateSentenceTrain } from '../src/sentence-train-data.js'

const BUILT_IN_QUESTIONS = [...PARADISE_QUESTIONS, ...TEXTBOOK_QUESTIONS, ...DEFAULT_QUESTIONS]
const SIMPLE_SENTENCE = /^\p{Script=Han}+[。？！]$/u

function isTrainEligible(question) {
  return SIMPLE_SENTENCE.test(question.sentence) && [...question.sentence.slice(0, -1)].length <= 28
}

function courseKey(textbook, book, lesson) {
  return `${textbook}/${book}/${lesson}`
}

describe('sentence train built-in content', () => {
  it('curates every eligible built-in question exactly once with its exact source sentence', () => {
    const questions = new Map(BUILT_IN_QUESTIONS.map((question) => [question.id, question]))
    const expectedIds = BUILT_IN_QUESTIONS.filter(isTrainEligible).map(({ id }) => id).sort()
    const actualIds = SENTENCE_TRAIN_CONTENT.map(({ questionId }) => questionId)

    for (const record of SENTENCE_TRAIN_CONTENT) {
      const question = questions.get(record.questionId)
      expect(question, record.questionId).toBeDefined()
      expect(record.sentence).toBe(question.sentence)
      expect(validateSentenceTrain(record.train, record.sentence)).toEqual({ ok: true, errors: [] })
    }

    expect(new Set(actualIds).size).toBe(actualIds.length)
    expect([...actualIds].sort()).toEqual(expectedIds)
  })

  it('preserves the original 72 exact question, sentence, and segmentation records', () => {
    const legacyDigest = createHash('sha256')
      .update(JSON.stringify(SENTENCE_TRAIN_CONTENT.slice(0, 72)))
      .digest('hex')

    expect(legacyDigest).toBe('19f255b2ca1392e13220b2f62430da228e7caa30ec882390924b0c06a6c7cdd5')
  })

  it('provides every eligible distinct sentence in each of the 72 textbook lessons', () => {
    const questions = new Map(BUILT_IN_QUESTIONS.map((question) => [question.id, question]))
    const actualByCourse = new Map()

    for (const record of SENTENCE_TRAIN_CONTENT) {
      const question = questions.get(record.questionId)
      if (!question?.textbook) continue
      const key = courseKey(question.textbook, question.book, question.lesson)
      if (!actualByCourse.has(key)) actualByCourse.set(key, new Set())
      actualByCourse.get(key).add(record.sentence)
    }

    const textbookBanks = [
      [PARADISE_COURSES, PARADISE_QUESTIONS],
      [COURSES, TEXTBOOK_QUESTIONS],
    ]
    for (const [courses, sourceQuestions] of textbookBanks) {
      expect(courses).toHaveLength(36)
      for (const course of courses) {
        const eligible = sourceQuestions.filter((question) =>
          question.book === course.book && question.lesson === course.lesson && isTrainEligible(question),
        )
        const expectedSentences = [...new Set(eligible.map(({ sentence }) => sentence))].sort()
        const key = courseKey(eligible[0]?.textbook, course.book, course.lesson)
        expect(expectedSentences.length, key).toBeGreaterThanOrEqual(2)
        expect([...(actualByCourse.get(key) ?? [])].sort(), key).toEqual(expectedSentences)
      }
    }
  })

  it('matches the eligible distinct-sentence coverage by bank and stage', () => {
    const questions = new Map(BUILT_IN_QUESTIONS.map((question) => [question.id, question]))
    const courseStages = new Map([
      ...PARADISE_COURSES.map((course) => [
        courseKey(PARADISE_QUESTIONS[0].textbook, course.book, course.lesson),
        course.stage,
      ]),
      ...COURSES.map((course) => [
        courseKey(TEXTBOOK_QUESTIONS[0].textbook, course.book, course.lesson),
        course.stage,
      ]),
    ])
    const coverageKey = (question) => question.textbook
      ? `${question.textbook}/${courseStages.get(courseKey(question.textbook, question.book, question.lesson))}`
      : 'general'
    const expected = new Map()
    const actual = new Map()

    for (const question of BUILT_IN_QUESTIONS.filter(isTrainEligible)) {
      const key = coverageKey(question)
      if (!expected.has(key)) expected.set(key, new Set())
      expected.get(key).add(question.sentence)
    }
    for (const record of SENTENCE_TRAIN_CONTENT) {
      const question = questions.get(record.questionId)
      const key = coverageKey(question)
      if (!actual.has(key)) actual.set(key, new Set())
      actual.get(key).add(record.sentence)
    }

    expect([...actual.keys()].sort()).toEqual([...expected.keys()].sort())
    for (const [key, expectedSentences] of expected) {
      expect([...(actual.get(key) ?? [])].sort(), key).toEqual([...expectedSentences].sort())
    }

    const expectedDistinct = new Set(BUILT_IN_QUESTIONS.filter(isTrainEligible).map(({ sentence }) => sentence))
    const actualDistinct = new Set(SENTENCE_TRAIN_CONTENT.map(({ sentence }) => sentence))
    expect([...actualDistinct].sort()).toEqual([...expectedDistinct].sort())
  })
})

describe('sentence train validation and resolution', () => {
  const sentence = '老师在看书。'
  const valid = { tokens: ['老师', '在', '看书'], punctuation: '。', alternatives: [] }

  it('accepts a valid 3–7-carriage definition that reconstructs the exact sentence', () => {
    expect(validateSentenceTrain(valid, sentence)).toEqual({ ok: true, errors: [] })
    expect(validateSentenceTrain({ ...valid, tokens: ['我', '和', '爸爸', '一起', '去', '公园', '玩'] }, '我和爸爸一起去公园玩。').ok).toBe(true)
  })

  it.each([
    [{ ...valid, tokens: ['老师', '看书'] }, sentence, 'invalid-token-count'],
    [{ ...valid, tokens: ['老师', '在', '认真地', '安安静静地慢慢', '看书'] }, '老师在认真地安安静静地慢慢看书。', 'invalid-token-length'],
    [{ ...valid, tokens: ['老师', '在 ', '看书'] }, sentence, 'invalid-token'],
    [{ ...valid, punctuation: ',' }, sentence, 'invalid-punctuation'],
    [{ ...valid, tokens: ['老师', '看书', '在'] }, sentence, 'sentence-mismatch'],
    [{ ...valid, alternatives: [['在', '老师', '看书', '今天']] }, sentence, 'invalid-alternative'],
    [{ ...valid, alternatives: Array.from({ length: 6 }, () => ['老师', '在', '看书']) }, sentence, 'too-many-alternatives'],
    [{ tokens: ['一二三四五六', '一二三四五六', '一二三四五六', '一二三四五六', '一二三四五'], punctuation: '。', alternatives: [] }, '一二三四五六一二三四五六一二三四五六一二三四五六一二三四五。', 'sentence-too-long'],
  ])('rejects malformed definitions with an actionable code', (value, source, code) => {
    const result = validateSentenceTrain(value, source)
    expect(result.ok).toBe(false)
    expect(result.errors.map((error) => error.code)).toContain(code)
    expect(result.errors.every((error) => error.path && error.message)).toBe(true)
  })

  it('uses a valid manual definition before built-in content and returns isolated copies', () => {
    const question = {
      ...PARADISE_QUESTIONS.find(({ id }) => id === 'hypy-1A-1-老'),
      sentenceTrain: {
        tokens: ['老师', '在', '看书'],
        punctuation: '。',
        alternatives: [['看书', '老师', '在']],
      },
    }

    const first = resolveTrainQuestion(question)
    const second = resolveTrainQuestion(question)
    first.train.tokens[0] = '学生'
    first.train.alternatives[0][0] = '学习'

    expect(second.train).toEqual(question.sentenceTrain)
    expect(second).not.toBe(question)
    expect(second.words).not.toBe(question.words)
  })

  it('requires both the built-in question ID and exact normalized sentence to match', () => {
    const source = PARADISE_QUESTIONS.find(({ id }) => id === 'hypy-1A-1-老')

    expect(resolveTrainQuestion(source)?.train.tokens).toEqual(['老师', '在', '看书'])
    expect(resolveTrainQuestion({ ...source, sentence: '老师在写字。' })).toBeNull()
    expect(resolveTrainQuestion({ ...source, id: 'personal-copy' })).toBeNull()
  })

  it('rejects an invalid manual definition instead of silently falling back to built-in content', () => {
    const source = PARADISE_QUESTIONS.find(({ id }) => id === 'hypy-1A-1-老')
    expect(resolveTrainQuestion({ ...source, sentenceTrain: { ...valid, punctuation: '！' } })).toBeNull()
  })
})
