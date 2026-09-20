import { describe, expect, it } from 'vitest'

import {
  createSession,
  getScores,
  navigateBack,
  navigateNext,
  revealCurrent,
} from '../src/core.js'
import {
  buildWordOptions,
  buildTiles,
  collectedWords,
  createWorkshopState,
  markWorkshopCurrent,
  selectWorkshopWord,
  setWorkshopDraft,
  submitWorkshopWord,
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

describe('workshop word validation', () => {
  it('accepts repeated characters and trims boundary whitespace', () => {
    expect(validateWord(' 爸爸 ', '爸')).toEqual({ ok: true, value: '爸爸', error: '' })
  })

  it('counts non-BMP Han characters as single characters', () => {
    expect(validateWord('𠀀木', '木')).toEqual({ ok: true, value: '𠀀木', error: '' })
  })

  it('accepts the target character in the final position', () => {
    expect(validateWord('大海', '海')).toEqual({ ok: true, value: '大海', error: '' })
  })

  it.each([
    ['木', '木', '2'],
    ['一二三四五六七八九', '一', '8'],
    ['树 林', '林', '汉字'],
    ['树林。', '林', '汉字'],
    ['大海', '木', '目标字'],
  ])('rejects invalid draft %j with a useful error', (value, character, errorPart) => {
    const result = validateWord(value, character)

    expect(result).toMatchObject({ ok: false, value: value.trim() })
    expect(result.error).toContain(errorPart)
  })
})

describe('workshop tile palettes', () => {
  it('keeps the target and unique Han characters from usable reference words', () => {
    const tiles = buildTiles(
      question('dad', '爸', ['爸爸', '老爸', '爸爸', '父亲', '爸 爸', '爸爸。']),
      () => 0.999,
    )

    expect(tiles).toEqual(['爸', '老'])
  })

  it('uses the normalized value when extracting tiles from a reference word', () => {
    expect(buildTiles(question('dad', '爸', [' 爸爸 ']), () => 0.999)).toEqual(['爸'])
  })

  it('supports non-BMP Han and caps the palette at the target plus twelve other characters', () => {
    const others = [...'一二三四五六七八九十天地人山']
    const tiles = buildTiles(
      question('many', '𠀀', [`𠀀${others.slice(0, 7).join('')}`, `𠀀${others.slice(7).join('')}`]),
      () => 0.999,
    )

    expect(tiles).toHaveLength(13)
    expect(tiles).toEqual(['𠀀', ...others.slice(0, 12)])
    expect(new Set(tiles).size).toBe(13)
  })

  it('shuffles the completed unique palette exactly once', () => {
    let calls = 0
    const tiles = buildTiles(question('tree', '木', ['木林', '木森']), () => {
      calls += 1
      return 0
    })

    expect(tiles).toEqual(['林', '森', '木'])
    expect(calls).toBe(2)
  })

  it('still offers the target when no reference word is usable', () => {
    expect(buildTiles(question('tree', '木', ['森林', '木 林', '木。']), () => 0)).toEqual(['木'])
  })
})

describe('workshop state', () => {
  it('creates one draft, option list, stable palette, and empty record list', () => {
    const session = sessionFor(
      question('tree', '木', ['木林', '树木']),
      question('field', '田', ['田地', '水田']),
    )

    expect(createWorkshopState(session, () => 0.999)).toEqual({
      drafts: ['', ''],
      options: [
        ['木林', '树木'],
        ['田地', '水田'],
      ],
      records: [],
      tiles: [
        ['木', '林', '树'],
        ['田', '地', '水'],
      ],
    })
  })

  it('updates only the active unsettled draft without mutating prior state', () => {
    let session = sessionFor(question('tree', '木', ['木林', '树木']))
    const state = createWorkshopState(session, () => 0.999)
    const updated = setWorkshopDraft(state, session, '树木')

    expect(updated).not.toBe(state)
    expect(updated.drafts).toEqual(['树木'])
    expect(updated.tiles).toBe(state.tiles)
    expect(state.drafts).toEqual([''])

    session = revealCurrent(session)
    session = markWorkshopCurrent(session, updated, { outcome: 'correct', teamId: 'team-1' })
    expect(setWorkshopDraft(updated, session, '木林')).toBe(updated)

    session = navigateNext(session)
    expect(setWorkshopDraft(updated, session, '木林')).toBe(updated)
  })

  it('builds unique normalized valid whole-word options in source order', () => {
    expect(
      buildWordOptions(
        question('sky', '天', [' 今天 ', '白天', '今天', '天气。', '天空', '海洋', null]),
      ),
    ).toEqual(['今天', '白天', '天空'])
  })

  it('selects only offered whole words and can clear the active selection', () => {
    const session = sessionFor(question('sky', '天', ['今天', '白天']))
    const state = createWorkshopState(session)
    const selected = selectWorkshopWord(state, session, '今天')

    expect(selected).not.toBe(state)
    expect(selected.drafts).toEqual(['今天'])
    expect(state.drafts).toEqual([''])
    expect(selectWorkshopWord(selected, session, '天空')).toBe(selected)
    expect(selectWorkshopWord(selected, session, '')).toEqual({
      ...selected,
      drafts: [''],
    })
  })

  it('allows another selection after a correct answer but blocks practice and unanswered cards', () => {
    const initialSession = sessionFor(
      question('sky', '天', ['今天', '白天']),
      question('tree', '木', ['木头']),
    )
    const initialState = createWorkshopState(initialSession)
    const first = submitWorkshopWord(
      initialSession,
      selectWorkshopWord(initialState, initialSession, '今天'),
      { teamId: 'team-1' },
    )

    expect(selectWorkshopWord(first.state, first.session, '白天').drafts[0]).toBe('白天')

    const backOnUnanswered = navigateBack(navigateNext(initialSession))
    expect(selectWorkshopWord(initialState, backOnUnanswered, '今天')).toBe(initialState)

    let practiceSession = revealCurrent(initialSession)
    practiceSession = markWorkshopCurrent(practiceSession, initialState, { outcome: 'practice' })
    expect(selectWorkshopWord(initialState, practiceSession, '今天')).toBe(initialState)
  })
})

describe('workshop whole-word submission', () => {
  it('reveals and scores the first submission, records it, and clears the selection', () => {
    const session = sessionFor(question('sky', '天', ['今天', '白天']))
    const state = selectWorkshopWord(createWorkshopState(session), session, '今天')

    const result = submitWorkshopWord(session, state, { teamId: 'team-2' })

    expect(result.session.revealed).toEqual([true])
    expect(result.session.judgments).toEqual([{ outcome: 'correct', teamId: 'team-2' }])
    expect(getScores(result.session)).toEqual({ 'team-1': 0, 'team-2': 1 })
    expect(result.state.drafts).toEqual([''])
    expect(result.state.records).toEqual([
      { word: '今天', teamId: 'team-2', questionId: 'sky' },
    ])
    expect(state.records).toEqual([])
    expect(collectedWords(result.session, result.state)).toEqual(result.state.records)
  })

  it('records a different offered word on the same correct question without another score', () => {
    const session = sessionFor(question('sky', '天', ['今天', '白天']))
    const state = createWorkshopState(session)
    const first = submitWorkshopWord(
      session,
      selectWorkshopWord(state, session, '今天'),
      { teamId: 'team-1' },
    )
    const second = submitWorkshopWord(
      first.session,
      selectWorkshopWord(first.state, first.session, '白天'),
      { teamId: 'team-2' },
    )

    expect(getScores(second.session)).toEqual({ 'team-1': 1, 'team-2': 0 })
    expect(second.state.records).toEqual([
      { word: '今天', teamId: 'team-1', questionId: 'sky' },
      { word: '白天', teamId: 'team-2', questionId: 'sky' },
    ])
    expect(first.state.records).toEqual([
      { word: '今天', teamId: 'team-1', questionId: 'sky' },
    ])
    expect(second.state.drafts).toEqual([''])
  })

  it('does nothing for absent selections, duplicate question words, or settled non-correct cards', () => {
    const session = sessionFor(question('sky', '天', ['今天', '白天']))
    const state = createWorkshopState(session)
    expect(submitWorkshopWord(session, state, { teamId: 'team-1' })).toEqual({ session, state })

    const first = submitWorkshopWord(
      session,
      selectWorkshopWord(state, session, '今天'),
      { teamId: 'team-1' },
    )
    const duplicateState = { ...first.state, drafts: ['今天'] }
    expect(submitWorkshopWord(first.session, duplicateState, { teamId: 'team-2' })).toEqual({
      session: first.session,
      state: duplicateState,
    })

    let practiceSession = revealCurrent(session)
    practiceSession = markWorkshopCurrent(practiceSession, state, { outcome: 'practice' })
    const selectedPractice = { ...state, drafts: ['今天'] }
    expect(submitWorkshopWord(practiceSession, selectedPractice, { teamId: 'team-1' })).toEqual({
      session: practiceSession,
      state: selectedPractice,
    })
  })

  it('requires a valid team for a valid selected word', () => {
    const session = sessionFor(question('sky', '天', ['今天']))
    const state = selectWorkshopWord(createWorkshopState(session), session, '今天')

    expect(() => submitWorkshopWord(session, state, { teamId: 'missing' })).toThrow(/teamId/)
  })
})

describe('workshop marking and collection', () => {
  it('lets the teacher accept a valid non-reference word after reveal', () => {
    let session = sessionFor(question('tree', '木', ['木林', '树木']))
    const state = setWorkshopDraft(createWorkshopState(session), session, '木头')
    session = revealCurrent(session)

    session = markWorkshopCurrent(session, state, { outcome: 'correct', teamId: 'team-2' })

    expect(getScores(session)).toEqual({ 'team-1': 0, 'team-2': 1 })
    expect(collectedWords(session, state)).toEqual([
      { word: '木头', teamId: 'team-2', questionId: 'tree' },
    ])
  })

  it('rejects invalid correct drafts but permits marking them for practice', () => {
    let session = sessionFor(question('tree', '木', ['木林', '树木']))
    const state = setWorkshopDraft(createWorkshopState(session), session, '大海')
    session = revealCurrent(session)

    expect(() =>
      markWorkshopCurrent(session, state, { outcome: 'correct', teamId: 'team-1' }),
    ).toThrow(/目标字/)

    const practice = markWorkshopCurrent(session, state, { outcome: 'practice' })
    expect(practice.judgments[0]).toEqual({ outcome: 'practice' })
    expect(collectedWords(practice, state)).toEqual([])
  })

  it('inherits reveal and single-settlement rules without awarding twice', () => {
    let session = sessionFor(question('tree', '木', ['木林', '树木']))
    const state = setWorkshopDraft(createWorkshopState(session), session, '木头')

    expect(() =>
      markWorkshopCurrent(session, state, { outcome: 'correct', teamId: 'team-1' }),
    ).toThrow(/reveal/i)

    session = revealCurrent(session)
    const scored = markWorkshopCurrent(session, state, { outcome: 'correct', teamId: 'team-1' })
    const repeated = markWorkshopCurrent(scored, state, {
      outcome: 'correct',
      teamId: 'team-2',
    })

    expect(repeated).toBe(scored)
    expect(getScores(repeated)).toEqual({ 'team-1': 1, 'team-2': 0 })
    expect(collectedWords(repeated, state)).toHaveLength(1)
  })
})
