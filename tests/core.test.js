import { describe, expect, it } from 'vitest'

import {
  createSession,
  getCurrentQuestion,
  getScores,
  markCurrent,
  navigateBack,
  navigateNext,
  revealCurrent,
  selectQuestions,
  startPractice,
} from '../src/core.js'

const question = (id, character, grade = 1, pinyin = `${character}音`) => ({
  id,
  grade,
  character,
  pinyin,
  words: [`${character}词一`, `${character}词二`],
  sentence: `这是${character}的例句。`,
})

describe('question selection', () => {
  it('selects at most eight distinct characters from the requested grade', () => {
    const bank = [
      question('yi-1', '一', 1, 'yī'),
      question('yi-2', '一', 1, 'yí'),
      ...'二三四五六七八九十'.split('').map((character, index) =>
        question(`q-${index}`, character),
      ),
      question('other-grade', '山', 2, 'shān'),
    ]

    const selected = selectQuestions(bank, { grade: 1, random: () => 0 })

    expect(selected).toHaveLength(8)
    expect(new Set(selected.map(({ character }) => character)).size).toBe(8)
    expect(selected.every(({ grade }) => grade === 1)).toBe(true)
  })

  it('uses all available distinct characters when fewer than eight exist and permits an empty grade', () => {
    const bank = [question('one', '一'), question('one-alt', '一', 1, 'yí'), question('two', '二')]

    expect(selectQuestions(bank, { grade: 1, random: () => 0 })).toHaveLength(2)
    expect(selectQuestions(bank, { grade: 1, limit: 0, random: () => 0 })).toEqual([])
    expect(selectQuestions(bank, { grade: 4, random: () => 0 })).toEqual([])
  })
})

describe('classroom session', () => {
  it('accepts two to four teams and rejects counts outside that range', () => {
    const bank = [question('one', '一')]

    expect(createSession({ questions: bank, grade: 1, teamNames: ['甲', '乙'] }).teams).toHaveLength(2)
    expect(createSession({ questions: bank, grade: 1, teamNames: ['甲', '乙', '丙', '丁'] }).teams).toHaveLength(4)
    expect(() => createSession({ questions: bank, grade: 1, teamNames: ['甲'] })).toThrow(/2.*4/)
    expect(() => createSession({ questions: bank, grade: 1, teamNames: ['一', '二', '三', '四', '五'] })).toThrow(/2.*4/)
  })

  it('takes a deep snapshot that later bank edits cannot change', () => {
    const bank = [question('one', '一', 1, 'yī')]
    const session = createSession({ questions: bank, grade: 1, random: () => 0 })

    bank[0].pinyin = 'changed'
    bank[0].words[0] = 'changed'

    expect(getCurrentQuestion(session)).toMatchObject({ pinyin: 'yī', words: ['一词一', '一词二'] })
  })

  it('does not start an empty round', () => {
    const session = createSession({ questions: [], grade: 1 })

    expect(session.phase).toBe('empty')
    expect(getCurrentQuestion(session)).toBeNull()
  })

  it('requires reveal before marking and allows each card to settle only once', () => {
    let session = createSession({ questions: [question('one', '一')], grade: 1, random: () => 0 })

    expect(() => markCurrent(session, { outcome: 'correct', teamId: 'team-1' })).toThrow(/reveal/i)
    session = revealCurrent(session)
    const scored = markCurrent(session, { outcome: 'correct', teamId: 'team-1' })
    const repeated = markCurrent(scored, { outcome: 'correct', teamId: 'team-1' })

    expect(getScores(scored)).toEqual({ 'team-1': 1, 'team-2': 0 })
    expect(repeated).toBe(scored)
    expect(getScores(repeated)).toEqual({ 'team-1': 1, 'team-2': 0 })
  })

  it('records an unrevealed card as unanswered when moving next and preserves it on back-navigation', () => {
    let session = createSession({
      questions: [question('one', '一'), question('two', '二')],
      grade: 1,
      random: () => 0.999,
    })

    session = navigateNext(session)
    expect(session.currentIndex).toBe(1)
    expect(session.judgments[0]).toEqual({ outcome: 'unanswered' })

    session = navigateBack(session)
    expect(session.currentIndex).toBe(0)
    expect(session.revealed[0]).toBe(false)
    expect(navigateBack(session)).toBe(session)
  })

  it('completes after the final card and can navigate back from the summary', () => {
    let session = createSession({ questions: [question('one', '一')], grade: 1, random: () => 0 })
    session = navigateNext(session)

    expect(session.phase).toBe('complete')
    expect(session.judgments[0]).toEqual({ outcome: 'unanswered' })

    session = navigateBack(session)
    expect(session.phase).toBe('active')
    expect(session.currentIndex).toBe(0)
  })

  it('builds a deduplicated practice snapshot without changing original scoring', () => {
    let session = createSession({
      questions: [question('one', '一'), question('two', '二')],
      grade: 1,
      random: () => 0.999,
    })
    session = markCurrent(revealCurrent(session), { outcome: 'correct', teamId: 'team-2' })
    session = navigateNext(session)
    session = markCurrent(revealCurrent(session), { outcome: 'practice' })
    const originalScores = getScores(session)

    const practice = startPractice(session)
    const scoredPractice = markCurrent(revealCurrent(practice), {
      outcome: 'correct',
      teamId: 'team-1',
    })

    expect(practice.mode).toBe('practice')
    expect(practice.questions.map(({ character }) => character)).toEqual(['二'])
    expect(getScores(scoredPractice)).toEqual({ 'team-1': 1, 'team-2': 0 })
    expect(getScores(session)).toEqual(originalScores)
    expect(originalScores).toEqual({ 'team-1': 0, 'team-2': 1 })
  })
})
