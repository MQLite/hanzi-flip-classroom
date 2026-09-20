import { describe, expect, it } from 'vitest'

import { createSession } from '../src/core.js'
import {
  buildWordAnswers,
  clearWorkshopSelection,
  collectedWords,
  continueWorkshopBatch,
  createWorkshopState,
  getWorkshopScores,
  remainingWorkshopWords,
  resolveWorkshopWord,
  submitWorkshopWord,
  toggleWorkshopTile,
  undoWorkshopTile,
  validateWord,
} from '../src/workshop-core.js'

const question = (id, character, words) => ({
  id,
  grade: 1,
  character,
  pinyin: `${character}音`,
  words,
  sentence: `这是${character}的例句。`,
})

const sessionFor = (...questions) =>
  createSession({ questions, grade: 1, limit: questions.length, random: () => 0.999 })

function selectCharacters(state, session, characters) {
  let nextState = state
  for (const character of characters) {
    const tile = nextState.palette.find(
      (candidate) =>
        candidate.character === character && !nextState.selections.includes(candidate.id),
    )
    if (!tile) throw new Error(`Missing tile for ${character}`)
    nextState = toggleWorkshopTile(nextState, session, tile.id)
  }
  return nextState
}

describe('workshop word validation', () => {
  it('normalizes whitespace, counts non-BMP Han correctly, and enforces the 2–8 boundary', () => {
    expect(validateWord(' 𠀀木 ', '木')).toEqual({ ok: true, value: '𠀀木', error: '' })
    expect(validateWord('木', '木')).toMatchObject({ ok: false })
    expect(validateWord('一二三四五六七八', '一')).toMatchObject({ ok: true })
    expect(validateWord('一二三四五六七八九', '一')).toMatchObject({ ok: false })
  })

  it('returns unique normalized valid references from a question', () => {
    expect(buildWordAnswers(question('sky', '天', [' 今天 ', '今天', '白天', '海洋', '天。']))).toEqual([
      '今天',
      '白天',
    ])
  })
})

describe('workshop batch creation', () => {
  it('selects unique references up to the requested limit and sums every glyph occurrence', () => {
    const session = sessionFor(
      question('sky', '天', ['今天', '白天', '今天']),
      question('tree', '木', ['木头', '木木']),
    )

    const state = createWorkshopState(session, { wordCount: 3, random: () => 0.999 })

    expect(state).toMatchObject({
      phase: 'active',
      references: ['今天', '白天', '木头'],
      totalSlots: 6,
      selections: [],
      draft: '',
      records: [],
      pending: null,
      wordCount: 3,
    })
    expect(state.palette.map(({ character }) => character)).toEqual([...'今天白天木头'])
    expect(state.palette.map(({ slot }) => slot)).toEqual([0, 1, 2, 3, 4, 5])
    expect(new Set(state.palette.map(({ id }) => id)).size).toBe(6)
  })

  it('shuffles both the reference batch and its physical tiles without changing membership', () => {
    const session = sessionFor(question('sky', '天', ['今天', '白天', '天上']))
    const stable = createWorkshopState(session, { wordCount: 2, random: () => 0.999 })
    const shuffled = createWorkshopState(session, { wordCount: 2, random: () => 0 })

    expect(shuffled.references).not.toEqual(stable.references)
    expect(shuffled.references).toHaveLength(2)
    expect(shuffled.palette.map((tile) => tile.character).sort()).toEqual(
      [...shuffled.references.join('')].sort(),
    )
    expect(shuffled.palette.map((tile) => tile.slot)).toEqual([0, 1, 2, 3])
  })

  it('uses the actual available reference count and exposes an empty repairable state', () => {
    const short = createWorkshopState(sessionFor(question('sky', '天', ['今天'])))
    expect(short.references).toEqual(['今天'])
    expect(short.wordCount).toBe(4)
    expect(short.phase).toBe('active')

    const empty = createWorkshopState(sessionFor(question('sky', '天', ['海洋', '天。'])))
    expect(empty).toEqual({
      phase: 'empty',
      references: [],
      palette: [],
      totalSlots: 0,
      selections: [],
      draft: '',
      records: [],
      pending: null,
      wordCount: 4,
    })
  })
})

describe('workshop batch continuation', () => {
  it('starts another batch from unused references while preserving records and scores', () => {
    const session = sessionFor(
      question('dad', '爸', ['爸爸', '老爸']),
      question('tree', '木', ['木头', '树木']),
      question('sky', '天', ['今天', '白天']),
    )
    let state = createWorkshopState(session, { wordCount: 4, random: () => 0.999 })

    for (const [index, word] of state.references.entries()) {
      state = submitWorkshopWord(session, selectCharacters(state, session, word), {
        teamId: index % 2 === 0 ? 'team-1' : 'team-2',
      }).state
    }

    expect(state.phase).toBe('complete')
    expect(remainingWorkshopWords(session, state)).toEqual(['今天', '白天'])

    const continued = continueWorkshopBatch(session, state, { random: () => 0.999 })

    expect(continued).toMatchObject({
      phase: 'active',
      references: ['今天', '白天'],
      wordCount: 4,
      selections: [],
      draft: '',
      pending: null,
    })
    expect(continued.records).toEqual(state.records)
    expect(continued.palette.map(({ character }) => character)).toEqual([...'今天白天'])
    expect(getWorkshopScores(session, continued)).toEqual({ 'team-1': 2, 'team-2': 2 })
  })

  it('does not offer teacher-approved words again and changes nothing when no batch remains', () => {
    const session = sessionFor(question('dad', '爸', ['爸爸', '爸妈', '妈爸']))
    let state = createWorkshopState(session, { wordCount: 2, random: () => 0.999 })
    const pending = submitWorkshopWord(
      session,
      selectCharacters(state, session, '妈爸'),
      { teamId: 'team-1' },
    )
    state = resolveWorkshopWord(session, pending.state, {
      accepted: true,
      pending: pending.state.pending,
    }).state

    for (const word of state.references) {
      state = submitWorkshopWord(session, selectCharacters(state, session, word), {
        teamId: 'team-2',
      }).state
    }

    expect(state.phase).toBe('complete')
    expect(remainingWorkshopWords(session, state)).toEqual([])
    expect(continueWorkshopBatch(session, state, { random: () => 0.999 })).toBe(state)
  })

  it('cannot continue an unfinished batch', () => {
    const session = sessionFor(question('dad', '爸', ['爸爸', '爸妈', '妈爸']))
    const state = createWorkshopState(session, { wordCount: 2, random: () => 0.999 })

    expect(continueWorkshopBatch(session, state)).toBe(state)
  })
})

describe('workshop shared tray selection', () => {
  it('selects physical tiles in order, undoes, and clears without mutating prior state', () => {
    const session = sessionFor(question('dad', '爸', ['爸爸', '爸妈']))
    const initial = createWorkshopState(session, { wordCount: 2, random: () => 0.999 })
    const selected = selectCharacters(initial, session, '爸妈')
    const undone = undoWorkshopTile(selected, session)
    const cleared = clearWorkshopSelection(selected, session)

    expect(selected.draft).toBe('爸妈')
    expect(selected.selections).toHaveLength(2)
    expect(undone.draft).toBe('爸')
    expect(undone.selections).toEqual([selected.selections[0]])
    expect(cleared).toMatchObject({ draft: '', selections: [] })
    expect(initial).toMatchObject({ draft: '', selections: [] })
  })

  it('caps assembly at eight characters while preserving stable palette slots', () => {
    const session = sessionFor(question('long', '一', ['一二三四五六七八', '一九']))
    const initial = createWorkshopState(session, { wordCount: 2, random: () => 0.999 })
    const selected = selectCharacters(initial, session, '一二三四五六七八')
    const ninth = initial.palette.find((tile) => !selected.selections.includes(tile.id))

    expect(selected.draft).toBe('一二三四五六七八')
    expect(toggleWorkshopTile(selected, session, ninth.id)).toBe(selected)
    expect(selected.palette.map((tile) => tile.slot)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  })
})

describe('workshop reference collection', () => {
  it('consumes exactly the submitted physical tiles, leaves slot holes, and completes independently', () => {
    const session = sessionFor(question('dad', '爸', ['爸爸', '爸妈']))
    const initial = createWorkshopState(session, { wordCount: 2, random: () => 0.999 })
    const firstSelection = selectCharacters(initial, session, '爸爸')
    const consumedIds = firstSelection.selections

    const first = submitWorkshopWord(session, firstSelection, { teamId: 'team-1' })

    expect(first).toMatchObject({
      session,
      outcome: 'correct',
      word: '爸爸',
      source: 'reference',
      returnTiles: false,
    })
    expect(first.session).toBe(session)
    expect(first.state).toMatchObject({
      phase: 'active',
      totalSlots: 4,
      selections: [],
      draft: '',
      pending: null,
      records: [{ word: '爸爸', source: 'reference', teamId: 'team-1' }],
    })
    expect(first.state.palette.map((tile) => tile.slot)).toEqual([2, 3])
    expect(first.state.palette.some((tile) => consumedIds.includes(tile.id))).toBe(false)
    expect(firstSelection.palette).toHaveLength(4)

    const remaining = selectCharacters(first.state, session, '爸妈')
    const second = submitWorkshopWord(session, remaining, { teamId: 'team-2' })

    expect(second.state.phase).toBe('complete')
    expect(second.state.palette).toEqual([])
    expect(second.state.references).toEqual(['爸爸', '爸妈'])
    expect(getWorkshopScores(session, second.state)).toEqual({ 'team-1': 1, 'team-2': 1 })
    expect(session.phase).toBe('active')
    expect(session.judgments).toEqual([null])
  })

  it('returns a repeated collected word without scoring or consuming it again', () => {
    const session = sessionFor(question('dad', '爸', ['爸爸', '爸爸爸']))
    const initial = createWorkshopState(session, { wordCount: 2, random: () => 0.999 })
    const collected = submitWorkshopWord(
      session,
      selectCharacters(initial, session, '爸爸'),
      { teamId: 'team-1' },
    )
    const duplicateSelection = selectCharacters(collected.state, session, '爸爸')
    const duplicate = submitWorkshopWord(session, duplicateSelection, { teamId: 'team-2' })

    expect(duplicate).toMatchObject({
      session,
      outcome: 'duplicate',
      word: '爸爸',
      returnTiles: true,
    })
    expect(duplicate.state.palette).toBe(collected.state.palette)
    expect(duplicate.state.records).toEqual(collected.state.records)
    expect(duplicate.state).toMatchObject({ draft: '', selections: [], phase: 'active' })
    expect(getWorkshopScores(session, duplicate.state)).toEqual({ 'team-1': 1, 'team-2': 0 })
  })
})

describe('workshop teacher decisions', () => {
  it('keeps unmatched tiles selected, locks the tray, and attributes acceptance to the submitting team', () => {
    const session = sessionFor(question('dad', '爸', ['爸爸', '爸妈']))
    const initial = createWorkshopState(session, { wordCount: 2, random: () => 0.999 })
    const selected = selectCharacters(initial, session, '妈爸')
    const submission = submitWorkshopWord(session, selected, { teamId: 'team-1' })

    expect(submission).toMatchObject({ session, outcome: 'pending', word: '妈爸' })
    expect(submission.session).toBe(session)
    expect(submission.state.palette).toBe(selected.palette)
    expect(submission.state.selections).toEqual(selected.selections)
    expect(submission.state.pending).toEqual({
      word: '妈爸',
      tileIds: selected.selections,
      teamId: 'team-1',
    })
    expect(toggleWorkshopTile(submission.state, session, selected.selections[0])).toBe(
      submission.state,
    )
    expect(undoWorkshopTile(submission.state, session)).toBe(submission.state)
    expect(clearWorkshopSelection(submission.state, session)).toBe(submission.state)
    expect(submitWorkshopWord(session, submission.state, { teamId: 'team-2' })).toEqual({
      session,
      state: submission.state,
      outcome: 'ignored',
      word: '妈爸',
    })

    const accepted = resolveWorkshopWord(session, submission.state, {
      accepted: true,
      pending: submission.state.pending,
    })

    expect(accepted).toMatchObject({
      session,
      outcome: 'correct',
      word: '妈爸',
      source: 'teacher',
      returnTiles: true,
    })
    expect(accepted.session).toBe(session)
    expect(accepted.state.palette).toBe(selected.palette)
    expect(accepted.state.references).toEqual(initial.references)
    expect(accepted.state).toMatchObject({
      phase: 'active',
      draft: '',
      selections: [],
      pending: null,
      records: [{ word: '妈爸', source: 'teacher', teamId: 'team-1' }],
    })
    expect(getWorkshopScores(session, accepted.state)).toEqual({ 'team-1': 1, 'team-2': 0 })
    expect(collectedWords(session, accepted.state)).toBe(accepted.state.records)
  })

  it('ignores stale decision tokens and rejects the exact pending word without changing inventory', () => {
    const session = sessionFor(question('dad', '爸', ['爸爸', '爸妈']))
    const initial = createWorkshopState(session, { wordCount: 2, random: () => 0.999 })
    const submission = submitWorkshopWord(
      session,
      selectCharacters(initial, session, '妈爸'),
      { teamId: 'team-2' },
    )
    const stale = resolveWorkshopWord(session, submission.state, {
      accepted: true,
      pending: { ...submission.state.pending },
    })

    expect(stale).toEqual({
      session,
      state: submission.state,
      outcome: 'ignored',
      word: '妈爸',
    })

    const rejected = resolveWorkshopWord(session, submission.state, {
      accepted: false,
      pending: submission.state.pending,
    })

    expect(rejected).toMatchObject({
      session,
      outcome: 'incorrect',
      word: '妈爸',
      returnTiles: true,
    })
    expect(rejected.state.palette).toBe(initial.palette)
    expect(rejected.state).toMatchObject({
      phase: 'active',
      draft: '',
      selections: [],
      records: [],
      pending: null,
    })
  })

  it('prevents an accepted teacher word from being collected twice', () => {
    const session = sessionFor(question('dad', '爸', ['爸爸', '爸妈']))
    const initial = createWorkshopState(session, { wordCount: 2, random: () => 0.999 })
    const firstPending = submitWorkshopWord(
      session,
      selectCharacters(initial, session, '妈爸'),
      { teamId: 'team-1' },
    )
    const accepted = resolveWorkshopWord(session, firstPending.state, {
      accepted: true,
      pending: firstPending.state.pending,
    })
    const duplicate = submitWorkshopWord(
      session,
      selectCharacters(accepted.state, session, '妈爸'),
      { teamId: 'team-2' },
    )

    expect(duplicate.outcome).toBe('duplicate')
    expect(duplicate.state.records).toEqual(accepted.state.records)
    expect(getWorkshopScores(session, duplicate.state)).toEqual({ 'team-1': 1, 'team-2': 0 })
  })
})

describe('workshop ignored submissions', () => {
  it('ignores short and non-active submissions and validates teams only for actionable words', () => {
    const session = sessionFor(question('dad', '爸', ['爸爸']))
    const initial = createWorkshopState(session, { random: () => 0.999 })
    const short = selectCharacters(initial, session, '爸')

    expect(submitWorkshopWord(session, short, { teamId: 'missing' })).toEqual({
      session,
      state: short,
      outcome: 'ignored',
      word: '爸',
    })
    expect(() =>
      submitWorkshopWord(session, selectCharacters(initial, session, '爸爸'), {
        teamId: 'missing',
      }),
    ).toThrow(/teamId/)

    const empty = createWorkshopState(sessionFor(question('sky', '天', ['海洋'])))
    expect(submitWorkshopWord(session, empty, { teamId: 'team-1' })).toEqual({
      session,
      state: empty,
      outcome: 'ignored',
      word: '',
    })
  })
})
