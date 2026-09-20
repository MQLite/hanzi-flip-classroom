import { describe, expect, it } from 'vitest'

import { PARADISE_COURSES, PARADISE_QUESTIONS } from '../src/paradise.js'
import { SENTENCE_TRAIN_CONTENT } from '../src/sentence-train-content.js'
import { resolveTrainQuestion, validateSentenceTrain } from '../src/sentence-train-data.js'

describe('sentence train built-in content', () => {
  it('links two valid, exact source sentences to every Hanyu Paradise lesson', () => {
    const questions = new Map(PARADISE_QUESTIONS.map((question) => [question.id, question]))
    const coverage = new Map()

    for (const record of SENTENCE_TRAIN_CONTENT) {
      const question = questions.get(record.questionId)
      expect(question, record.questionId).toBeDefined()
      expect(record.sentence).toBe(question.sentence)
      expect(validateSentenceTrain(record.train, record.sentence)).toEqual({ ok: true, errors: [] })
      const key = `${question.book}/${question.lesson}`
      coverage.set(key, (coverage.get(key) ?? 0) + 1)
    }

    expect(PARADISE_COURSES).toHaveLength(36)
    for (const course of PARADISE_COURSES) {
      expect(coverage.get(`${course.book}/${course.lesson}`)).toBeGreaterThanOrEqual(2)
    }
  })

  it('provides at least eight different usable sentences in every stage', () => {
    const questions = new Map(PARADISE_QUESTIONS.map((question) => [question.id, question]))
    const byStage = new Map()
    for (const record of SENTENCE_TRAIN_CONTENT) {
      const stage = questions.get(record.questionId).id.split('-')[1]
      if (!byStage.has(stage)) byStage.set(stage, new Set())
      byStage.get(stage).add(record.sentence)
    }

    expect([...byStage.keys()].sort()).toEqual(['1A', '1B', '2A', '2B', '3A', '3B'])
    expect([...byStage.values()].every((sentences) => sentences.size >= 8)).toBe(true)
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
