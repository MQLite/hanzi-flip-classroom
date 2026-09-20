import { describe, expect, it } from 'vitest'

import {
  acceptTrainAnswer,
  checkTrainAnswer,
  clearTrainSelection,
  createTrainSession,
  finishTrainDeparture,
  getTrainCurrent,
  getTrainScores,
  markTrainPractice,
  nextTrainQuestion,
  previousTrainQuestion,
  revealTrainAnswer,
  startTrainPractice,
  toggleTrainTile,
  undoTrainTile,
} from '../src/sentence-train-core.js'

const question = (overrides = {}) => ({
  id: 'train-one',
  grade: 1,
  character: '老',
  pinyin: 'lǎo',
  words: ['老师', '老人'],
  sentence: '老师在看书。',
  sentenceTrain: { tokens: ['老师', '在', '看书'], punctuation: '。', alternatives: [] },
  ...overrides,
})

function orderedIds(session, index = session.currentIndex) {
  const questionAtIndex = session.questions[index]
  const palette = session.palettes[index]
  return questionAtIndex.train.tokens.map((text, tokenIndex) => {
    const occurrence = questionAtIndex.train.tokens.slice(0, tokenIndex + 1).filter((token) => token === text).length
    return palette.filter((tile) => tile.text === text)[occurrence - 1].id
  })
}

function selectIds(session, ids) {
  return ids.reduce((next, id) => toggleTrainTile(next, id), session)
}

describe('sentence train session setup and selection', () => {
  it('deduplicates by reference sentence, limits the round, and snapshots nested question data', () => {
    const source = question()
    const sameSentence = question({ id: 'train-copy', character: '师', pinyin: 'shī' })
    const other = question({
      id: 'train-two',
      character: '我',
      pinyin: 'wǒ',
      sentence: '我喜欢喝果汁。',
      sentenceTrain: { tokens: ['我', '喜欢', '喝', '果汁'], punctuation: '。', alternatives: [] },
    })
    const session = createTrainSession({ questions: [source, sameSentence, other], teamNames: ['红队', '蓝队'], random: () => 0.5, limit: 8 })
    source.words[0] = 'changed'
    source.sentenceTrain.tokens[0] = '学生'

    expect(session.questions.map(({ sentence }) => sentence).sort()).toEqual(['我喜欢喝果汁。', '老师在看书。'])
    expect(session.questions.find(({ id }) => id === 'train-one').train.tokens[0]).toBe('老师')
    expect(session.teams.map(({ name }) => name)).toEqual(['红队', '蓝队'])
    expect(session.phase).toBe('active')
    expect(session.mode).toBe('round')
  })

  it('creates independent IDs for repeated words and compares their text sequence', () => {
    let session = createTrainSession({
      questions: [question({
        sentence: '看看老师看书。',
        sentenceTrain: { tokens: ['看', '看', '老师', '看书'], punctuation: '。', alternatives: [] },
      })],
      teamNames: ['甲', '乙'],
      random: () => 0,
    })
    const lookTiles = session.palettes[0].filter(({ text }) => text === '看')
    expect(lookTiles).toHaveLength(2)
    expect(lookTiles[0].id).not.toBe(lookTiles[1].id)

    session = selectIds(session, orderedIds(session))
    session = checkTrainAnswer(session, { teamId: 'team-1' })
    expect(session.checks[0]).toBe('match')
    expect(session.judgments[0]).toMatchObject({ outcome: 'correct', source: 'auto', sentence: '看看老师看书。' })
  })

  it('keeps palette positions stable when toggling, undoing, and clearing selections', () => {
    const created = createTrainSession({ questions: [question()], random: () => 0.25 })
    const palette = created.palettes[0]
    const [first, second] = palette
    let session = toggleTrainTile(created, first.id)
    session = toggleTrainTile(session, second.id)
    expect(session.selections[0]).toEqual([first.id, second.id])
    expect(session.palettes[0]).toEqual(palette)

    session = undoTrainTile(session)
    expect(session.selections[0]).toEqual([first.id])
    session = toggleTrainTile(session, first.id)
    expect(session.selections[0]).toEqual([])
    session = selectIds(session, [first.id, second.id])
    session = clearTrainSelection(session)
    expect(session.selections[0]).toEqual([])
    expect(session.palettes[0]).toEqual(palette)
  })

  it('clears a prior check when the arrangement changes', () => {
    let session = createTrainSession({ questions: [question()], random: () => 0 })
    const wrong = [...orderedIds(session)].reverse()
    session = selectIds(session, wrong)
    session = checkTrainAnswer(session, { teamId: 'team-1' })
    expect(session.checks[0]).toBe('mismatch')

    session = toggleTrainTile(session, wrong[0])
    expect(session.checks[0]).toBeNull()
  })
})

describe('sentence train checking and scoring', () => {
  it('ignores incomplete answers and automatically scores one unrevealed match', () => {
    let session = createTrainSession({ questions: [question()], random: () => 0 })
    session = toggleTrainTile(session, orderedIds(session)[0])
    expect(checkTrainAnswer(session, { teamId: 'team-1' })).toBe(session)

    session = selectIds(session, orderedIds(session).slice(1))
    const scored = checkTrainAnswer(session, { teamId: 'team-2' })
    expect(scored.judgments[0]).toEqual({ outcome: 'correct', teamId: 'team-2', sentence: '老师在看书。', source: 'auto' })
    expect(getTrainScores(scored)).toEqual({ 'team-1': 0, 'team-2': 1 })
    expect(checkTrainAnswer(scored, { teamId: 'team-2' })).toBe(scored)
  })

  it('keeps a wrong arrangement and lets a teacher accept it once', () => {
    let session = createTrainSession({ questions: [question()], random: () => 0 })
    const wrong = [...orderedIds(session)].reverse()
    session = selectIds(session, wrong)
    session = checkTrainAnswer(session, { teamId: 'team-1' })
    expect(session.checks[0]).toBe('mismatch')
    expect(session.selections[0]).toEqual(wrong)
    expect(session.judgments[0]).toBeNull()

    session = acceptTrainAnswer(session, { teamId: 'team-1' })
    expect(session.judgments[0]).toEqual({ outcome: 'correct', teamId: 'team-1', sentence: '看书在老师。', source: 'teacher' })
    expect(getTrainScores(session)['team-1']).toBe(1)
    expect(acceptTrainAnswer(session, { teamId: 'team-1' })).toBe(session)
  })

  it('does not auto-score after reveal and requires the teacher to award a star', () => {
    let session = createTrainSession({ questions: [question()], random: () => 0 })
    session = revealTrainAnswer(session)
    session = selectIds(session, orderedIds(session))
    session = checkTrainAnswer(session, { teamId: 'team-1' })

    expect(session.revealed[0]).toBe(true)
    expect(session.checks[0]).toBe('match')
    expect(session.judgments[0]).toBeNull()
    expect(getTrainScores(session)['team-1']).toBe(0)

    session = acceptTrainAnswer(session, { teamId: 'team-1' })
    expect(session.judgments[0]).toMatchObject({ outcome: 'correct', source: 'teacher' })
    expect(getTrainScores(session)['team-1']).toBe(1)
  })

  it('accepts a declared alternative by token sequence', () => {
    let session = createTrainSession({
      questions: [question({
        sentence: '我和爸爸一起去公园。',
        sentenceTrain: {
          tokens: ['我', '和', '爸爸', '一起', '去', '公园'],
          punctuation: '。',
          alternatives: [['我', '和', '爸爸', '去', '公园', '一起']],
        },
      })],
      random: () => 0,
    })
    const byText = new Map(session.palettes[0].map((tile) => [tile.text, tile.id]))
    session = selectIds(session, ['我', '和', '爸爸', '去', '公园', '一起'].map((text) => byText.get(text)))
    session = checkTrainAnswer(session, { teamId: 'team-1' })
    expect(session.checks[0]).toBe('match')
    expect(session.judgments[0]).toMatchObject({ outcome: 'correct', source: 'auto' })
  })
})

describe('sentence train departure, navigation, and practice', () => {
  const questions = [
    question(),
    question({
      id: 'train-two', character: '我', pinyin: 'wǒ', sentence: '我喜欢喝果汁。',
      sentenceTrain: { tokens: ['我', '喜欢', '喝', '果汁'], punctuation: '。', alternatives: [] },
    }),
  ]

  it('finishes only the current departure token and cannot double-score or skip', () => {
    let session = createTrainSession({ questions, random: () => 0 })
    session = selectIds(session, orderedIds(session))
    session = checkTrainAnswer(session, { teamId: 'team-1' })
    const token = session.departure
    expect(token).toBeTruthy()
    expect(session.phase).toBe('active')
    expect(nextTrainQuestion(session)).toBe(session)
    expect(toggleTrainTile(session, session.palettes[0][0].id)).toBe(session)
    expect(finishTrainDeparture(session, {})).toBe(session)

    session = finishTrainDeparture(session, token)
    expect(session.currentIndex).toBe(1)
    expect(session.departure).toBeNull()
    expect(getTrainScores(session)['team-1']).toBe(1)
    expect(finishTrainDeparture(session, token)).toBe(session)
  })

  it('records skipped questions, preserves review state, and prevents changing settled questions', () => {
    let session = createTrainSession({ questions, random: () => 0 })
    const firstTile = session.palettes[0][0]
    session = toggleTrainTile(session, firstTile.id)
    session = revealTrainAnswer(session)
    session = nextTrainQuestion(session)

    expect(session.judgments[0]).toEqual({ outcome: 'unanswered' })
    session = previousTrainQuestion(session)
    expect(session.currentIndex).toBe(0)
    expect(session.selections[0]).toEqual([firstTile.id])
    expect(session.revealed[0]).toBe(true)
    expect(toggleTrainTile(session, session.palettes[0][1].id)).toBe(session)
  })

  it('marks practice without a score and starts a fresh practice round from only marked snapshots', () => {
    let session = createTrainSession({ questions, random: () => 0 })
    session = toggleTrainTile(session, session.palettes[0][0].id)
    session = markTrainPractice(session)
    session = nextTrainQuestion(session)
    session = nextTrainQuestion(session)
    expect(session.phase).toBe('complete')

    const practice = startTrainPractice(session)
    expect(practice.mode).toBe('practice')
    expect(practice.phase).toBe('active')
    expect(practice.questions.map(({ id }) => id)).toEqual([session.questions[0].id])
    expect(practice.selections).toEqual([[]])
    expect(practice.revealed).toEqual([false])
    expect(practice.judgments).toEqual([null])
    expect(getTrainScores(practice)).toEqual({ 'team-1': 0, 'team-2': 0 })
  })

  it('returns null for an empty round and completes after the last departure', () => {
    const empty = createTrainSession({ questions: [], limit: 8 })
    expect(empty.phase).toBe('empty')
    expect(empty.currentIndex).toBe(-1)
    expect(getTrainCurrent(empty)).toBeNull()

    let single = createTrainSession({ questions: [question()], random: () => 0 })
    single = selectIds(single, orderedIds(single))
    single = checkTrainAnswer(single, { teamId: 'team-1' })
    single = finishTrainDeparture(single, single.departure)
    expect(single.phase).toBe('complete')
    expect(getTrainCurrent(single)).toBeNull()
  })
})
