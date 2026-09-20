import { describe, expect, it } from 'vitest'

import {
  createSession,
  getScores,
  markCurrent,
  navigateNext,
  revealCurrent,
} from '../src/core.js'
import {
  buildCharacterPalette,
  buildWordAnswers,
  clearWorkshopSelection,
  collectedWords,
  createWorkshopState,
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
  createSession({ questions, grade: 1, random: () => 0.999 })

function selectCharacters(state, session, characters) {
  let nextState = state
  const used = new Set()
  for (const character of characters) {
    const tile = nextState.palettes[session.currentIndex].find(
      (candidate) => candidate.character === character && !used.has(candidate.id),
    )
    if (!tile) throw new Error(`Missing tile for ${character}`)
    used.add(tile.id)
    nextState = toggleWorkshopTile(nextState, session, tile.id)
  }
  return nextState
}

describe('workshop word validation', () => {
  it('normalizes boundary whitespace and counts non-BMP Han as one character', () => {
    expect(validateWord(' 𠀀木 ', '木')).toEqual({ ok: true, value: '𠀀木', error: '' })
  })

  it.each([
    ['木', '木', '2'],
    ['一二三四五六七八九', '一', '8'],
    ['树 林', '林', '汉字'],
    ['树林。', '林', '汉字'],
    ['大海', '木', '目标字'],
  ])('rejects invalid word %j with a useful error', (value, character, errorPart) => {
    const result = validateWord(value, character)

    expect(result).toMatchObject({ ok: false, value: value.trim() })
    expect(result.error).toContain(errorPart)
  })
})

describe('character palettes', () => {
  it('exposes unique normalized valid answers for answerability checks', () => {
    expect(buildWordAnswers(question('sky', '天', [' 今天 ', '今天', '白天', '海洋', '天。']))).toEqual([
      '今天',
      '白天',
    ])
  })

  it('provides the maximum character multiplicity required by every valid answer', () => {
    const palette = buildCharacterPalette(
      question('dad', '爸', ['爸爸', '老爸', '爸爸', '爸 爸', '父亲']),
      () => 0.999,
    )

    expect(palette.filter((tile) => tile.character === '爸')).toHaveLength(2)
    expect(palette.filter((tile) => tile.character === '老')).toHaveLength(1)
    expect(new Set(palette.map((tile) => tile.id)).size).toBe(palette.length)
  })

  it('adds at least three unique distractors absent from all valid answers', () => {
    const palette = buildCharacterPalette(question('sky', '天', ['今天', '白天']), () => 0.999)
    const answerCharacters = new Set(['今', '白', '天'])
    const distractors = palette.filter((tile) => !answerCharacters.has(tile.character))

    expect(palette.length).toBeGreaterThanOrEqual(8)
    expect(palette.length).toBeLessThanOrEqual(12)
    expect(new Set(distractors.map((tile) => tile.character)).size).toBeGreaterThanOrEqual(3)
  })

  it('grows rather than truncating characters needed by long alternative answers', () => {
    const palette = buildCharacterPalette(
      question('sky', '天', ['天一二三四五六七', '天八九十地人山水']),
      () => 0.999,
    )

    for (const character of '天一二三四五六七八九十地人山水') {
      expect(palette.some((tile) => tile.character === character)).toBe(true)
    }
    expect(palette.length).toBeGreaterThan(12)
    expect(palette.length).toBeLessThanOrEqual(19)
  })

  it('shuffles the finished physical tiles', () => {
    const unshuffled = buildCharacterPalette(question('sky', '天', ['今天']), () => 0.999)
    const shuffled = buildCharacterPalette(question('sky', '天', ['今天']), () => 0)

    expect(shuffled.map((tile) => tile.id).sort()).toEqual(unshuffled.map((tile) => tile.id).sort())
    expect(shuffled.map((tile) => tile.id)).not.toEqual(unshuffled.map((tile) => tile.id))
  })
})

describe('workshop character selection state', () => {
  it('creates drafts, palettes, ordered selections, and records for every question', () => {
    const session = sessionFor(
      question('sky', '天', ['今天', '白天']),
      question('tree', '木', ['木头']),
    )
    const state = createWorkshopState(session, () => 0.999)

    expect(state.drafts).toEqual(['', ''])
    expect(state.selections).toEqual([[], []])
    expect(state.records).toEqual([])
    expect(state.palettes).toHaveLength(2)
    expect(state.palettes[0]).toEqual(buildCharacterPalette(session.questions[0], () => 0.999))
  })

  it('toggles physical tiles once and keeps the draft in selection order', () => {
    const session = sessionFor(question('sky', '天', ['今天']))
    const initial = createWorkshopState(session, () => 0.999)
    const today = selectCharacters(initial, session, '今天')
    const firstId = today.selections[0][0]
    const toggledOff = toggleWorkshopTile(today, session, firstId)

    expect(today.drafts).toEqual(['今天'])
    expect(today.selections[0]).toHaveLength(2)
    expect(initial.drafts).toEqual([''])
    expect(toggledOff.drafts).toEqual(['天'])
    expect(toggledOff.selections).toEqual([[today.selections[0][1]]])
  })

  it('undoes the last tile and clears the current selection immutably', () => {
    const session = sessionFor(question('sky', '天', ['今天']))
    const initial = createWorkshopState(session, () => 0.999)
    const selected = selectCharacters(initial, session, '今天')
    const undone = undoWorkshopTile(selected, session)
    const cleared = clearWorkshopSelection(undone, session)

    expect(undone.drafts).toEqual(['今'])
    expect(undone.selections[0]).toEqual([selected.selections[0][0]])
    expect(cleared.drafts).toEqual([''])
    expect(cleared.selections).toEqual([[]])
    expect(selected.drafts).toEqual(['今天'])
  })

  it('ignores selection changes unless the current question is active and unsettled', () => {
    let session = sessionFor(question('sky', '天', ['今天']))
    const state = createWorkshopState(session, () => 0.999)
    const tileId = state.palettes[0][0].id
    session = markCurrent(revealCurrent(session), { outcome: 'practice' })

    expect(toggleWorkshopTile(state, session, tileId)).toBe(state)
    expect(undoWorkshopTile(state, session)).toBe(state)
    expect(clearWorkshopSelection(state, session)).toBe(state)
  })

  it('caps the assembly at eight tiles but permits a replacement after undo', () => {
    const session = sessionFor(question('sky', '天', ['天一二三四五六七']))
    const initial = createWorkshopState(session, () => 0.999)
    const selected = selectCharacters(initial, session, '天一二三四五六七')
    const ninth = initial.palettes[0].find((tile) => !selected.selections[0].includes(tile.id))

    expect(toggleWorkshopTile(selected, session, ninth.id)).toBe(selected)

    const undone = undoWorkshopTile(selected, session)
    const replaced = toggleWorkshopTile(undone, session, ninth.id)
    expect(replaced.selections[0]).toHaveLength(8)
    expect(replaced.drafts[0]).toBe(`天一二三四五六${ninth.character}`)
  })
})

describe('workshop character fusion submission', () => {
  it('scores an exact normalized reference word, records it, and regenerates the palette', () => {
    const session = sessionFor(question('sky', '天', [' 今天 ', '白天']))
    const initial = createWorkshopState(session, () => 0.999)
    const selected = selectCharacters(initial, session, '今天')

    const result = submitWorkshopWord(session, selected, { teamId: 'team-2' }, () => 0)

    expect(result.outcome).toBe('correct')
    expect(result.word).toBe('今天')
    expect(result.session.revealed).toEqual([true])
    expect(result.session.judgments).toEqual([{ outcome: 'correct', teamId: 'team-2' }])
    expect(getScores(result.session)).toEqual({ 'team-1': 0, 'team-2': 1 })
    expect(result.state.drafts).toEqual([''])
    expect(result.state.selections).toEqual([[]])
    expect(result.state.palettes[0]).not.toBe(selected.palettes[0])
    expect(result.state.records).toEqual([
      { word: '今天', teamId: 'team-2', questionId: 'sky' },
    ])
    expect(selected.records).toEqual([])
  })

  it('returns incorrect and clears for retry without settling or rebuilding the palette', () => {
    const session = sessionFor(question('sky', '天', ['今天', '白天']))
    const initial = createWorkshopState(session, () => 0.999)
    const selected = selectCharacters(initial, session, '天白')

    const result = submitWorkshopWord(session, selected, {})

    expect(result).toMatchObject({ session, outcome: 'incorrect', word: '天白' })
    expect(result.state.drafts).toEqual([''])
    expect(result.state.selections).toEqual([[]])
    expect(result.state.palettes[0]).toBe(selected.palettes[0])
    expect(result.state.records).toEqual([])
    expect(result.session.judgments).toEqual([null])
  })

  it('ignores short, inactive, and already-settled submissions without changing references', () => {
    const session = sessionFor(question('sky', '天', ['今天']))
    const initial = createWorkshopState(session, () => 0.999)
    const short = selectCharacters(initial, session, '天')
    expect(submitWorkshopWord(session, short, { teamId: 'team-1' })).toEqual({
      session,
      state: short,
      outcome: 'ignored',
      word: '天',
    })

    const selected = selectCharacters(initial, session, '今天')
    const inactiveSession = navigateNext(session)
    expect(submitWorkshopWord(inactiveSession, selected, { teamId: 'team-1' })).toEqual({
      session: inactiveSession,
      state: selected,
      outcome: 'ignored',
      word: '今天',
    })

    const correct = submitWorkshopWord(session, selected, { teamId: 'team-1' })
    const staleSelection = { ...correct.state, drafts: ['今天'], selections: [selected.selections[0]] }
    const repeated = submitWorkshopWord(correct.session, staleSelection, { teamId: 'team-2' })

    expect(repeated).toEqual({
      session: correct.session,
      state: staleSelection,
      outcome: 'ignored',
      word: '今天',
    })
    expect(getScores(repeated.session)).toEqual({ 'team-1': 1, 'team-2': 0 })
    expect(collectedWords(repeated.session, repeated.state)).toEqual(correct.state.records)
  })

  it('requires a valid team only when a correct candidate is ready to score', () => {
    const session = sessionFor(question('sky', '天', ['今天']))
    const initial = createWorkshopState(session, () => 0.999)
    const correct = selectCharacters(initial, session, '今天')
    const incorrect = selectCharacters(initial, session, '天今')

    expect(() => submitWorkshopWord(session, correct, { teamId: 'missing' })).toThrow(/teamId/)
    expect(submitWorkshopWord(session, incorrect, { teamId: 'missing' }).outcome).toBe('incorrect')
  })
})
