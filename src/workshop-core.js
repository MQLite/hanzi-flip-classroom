const HAN_WORD = /^\p{Script=Han}+$/u
const MIN_WORD_LENGTH = 2
const MAX_WORD_LENGTH = 8

function shuffle(values, random) {
  const shuffled = [...values]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1))
    ;[shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]]
  }
  return shuffled
}

export function validateWord(value, character) {
  const normalized = typeof value === 'string' ? value.trim() : ''
  const length = [...normalized].length

  if (length < MIN_WORD_LENGTH || length > MAX_WORD_LENGTH) {
    return {
      ok: false,
      value: normalized,
      error: `请输入 ${MIN_WORD_LENGTH}–${MAX_WORD_LENGTH} 个汉字`,
    }
  }
  if (!HAN_WORD.test(normalized)) {
    return {
      ok: false,
      value: normalized,
      error: '只能输入汉字，不能包含空格、标点或其他字符',
    }
  }
  if (!normalized.includes(character)) {
    return {
      ok: false,
      value: normalized,
      error: `词语必须包含目标字“${character}”`,
    }
  }

  return { ok: true, value: normalized, error: '' }
}

export function buildWordAnswers(question) {
  const words = Array.isArray(question?.words) ? question.words : []
  const valid = []
  const seen = new Set()

  for (const word of words) {
    const validation = validateWord(word, question?.character)
    if (!validation.ok || seen.has(validation.value)) continue
    seen.add(validation.value)
    valid.push(validation.value)
  }

  return valid
}

// Kept for curriculum integrity checks and callers that need a single-question
// inventory. Batch creation below intentionally uses only its selected references.
export function buildCharacterPalette(question, random = Math.random) {
  if (typeof random !== 'function') throw new TypeError('random must be a function')

  const requiredCounts = new Map()
  for (const word of buildWordAnswers(question)) {
    const wordCounts = new Map()
    for (const character of word) {
      wordCounts.set(character, (wordCounts.get(character) ?? 0) + 1)
    }
    for (const [character, count] of wordCounts) {
      requiredCounts.set(character, Math.max(requiredCounts.get(character) ?? 0, count))
    }
  }

  const characters = []
  for (const [character, count] of requiredCounts) {
    for (let occurrence = 0; occurrence < count; occurrence += 1) characters.push(character)
  }

  return shuffle(
    characters.map((character, index) => ({ id: `tile-${index + 1}`, character })),
    random,
  )
}

function buildReferencePool(session) {
  const references = []
  const seen = new Set()

  for (const question of Array.isArray(session?.questions) ? session.questions : []) {
    for (const word of buildWordAnswers(question)) {
      if (seen.has(word)) continue
      seen.add(word)
      references.push(word)
    }
  }

  return references
}

export function createWorkshopState(
  session,
  { wordCount = 4, random = Math.random } = {},
) {
  if (!Number.isInteger(wordCount) || wordCount < 1) {
    throw new RangeError('wordCount must be a positive integer')
  }
  if (typeof random !== 'function') throw new TypeError('random must be a function')

  const references = shuffle(buildReferencePool(session), random).slice(0, wordCount)
  const characters = shuffle([...references.join('')], random)
  const palette = characters.map((character, slot) => ({
    id: `tile-${slot + 1}`,
    character,
    slot,
  }))

  return {
    phase: references.length === 0 ? 'empty' : 'active',
    references,
    palette,
    totalSlots: palette.length,
    selections: [],
    draft: '',
    records: [],
    pending: null,
    wordCount,
  }
}

function canEdit(state) {
  return state?.phase === 'active' && state.pending === null
}

function withSelection(state, selectedIds) {
  const charactersById = new Map(
    (Array.isArray(state?.palette) ? state.palette : []).map((tile) => [tile.id, tile.character]),
  )
  return {
    ...state,
    selections: selectedIds,
    draft: selectedIds.map((id) => charactersById.get(id)).join(''),
  }
}

function clearSelection(state) {
  if (state.draft === '' && state.selections.length === 0) return state
  return { ...state, selections: [], draft: '' }
}

export function toggleWorkshopTile(state, session, tileId) {
  if (!canEdit(state)) return state
  if (!Array.isArray(state.palette) || !Array.isArray(state.selections)) return state
  if (!state.palette.some((tile) => tile.id === tileId)) return state

  const selectedIndex = state.selections.indexOf(tileId)
  if (selectedIndex === -1 && state.selections.length >= MAX_WORD_LENGTH) return state
  const selectedIds =
    selectedIndex === -1
      ? [...state.selections, tileId]
      : state.selections.filter((_, index) => index !== selectedIndex)
  return withSelection(state, selectedIds)
}

export function undoWorkshopTile(state, session) {
  if (!canEdit(state) || !Array.isArray(state.selections) || state.selections.length === 0) {
    return state
  }
  return withSelection(state, state.selections.slice(0, -1))
}

export function clearWorkshopSelection(state, session) {
  if (!canEdit(state) || !Array.isArray(state.selections) || state.selections.length === 0) {
    return state
  }
  return clearSelection(state)
}

function ignoredResult(session, state, word) {
  return { session, state, outcome: 'ignored', word }
}

function requireTeam(session, teamId) {
  if (!Array.isArray(session?.teams) || !session.teams.some((team) => team.id === teamId)) {
    throw new TypeError('A valid teamId is required for a workshop submission')
  }
}

function referenceIsComplete(state, word) {
  return state.records.some((record) => record.source === 'reference' && record.word === word)
}

function workshopIsComplete(state, records) {
  return state.references.every((word) =>
    records.some((record) => record.source === 'reference' && record.word === word),
  )
}

export function submitWorkshopWord(session, state, { teamId } = {}) {
  const word = typeof state?.draft === 'string' ? state.draft : ''
  if (!canEdit(state) || [...word].length < MIN_WORD_LENGTH) {
    return ignoredResult(session, state, word)
  }

  requireTeam(session, teamId)

  if (state.records.some((record) => record.word === word)) {
    return {
      session,
      state: clearSelection(state),
      outcome: 'duplicate',
      word,
      returnTiles: true,
    }
  }

  if (state.references.includes(word) && !referenceIsComplete(state, word)) {
    const selectedIds = new Set(state.selections)
    const records = [...state.records, { word, source: 'reference', teamId }]
    return {
      session,
      state: {
        ...state,
        phase: workshopIsComplete(state, records) ? 'complete' : 'active',
        palette: state.palette.filter((tile) => !selectedIds.has(tile.id)),
        selections: [],
        draft: '',
        records,
        pending: null,
      },
      outcome: 'correct',
      word,
      source: 'reference',
      returnTiles: false,
    }
  }

  const pending = { word, tileIds: [...state.selections], teamId }
  return {
    session,
    state: { ...state, pending },
    outcome: 'pending',
    word,
  }
}

export function resolveWorkshopWord(session, state, { accepted, pending } = {}) {
  const word = typeof state?.pending?.word === 'string' ? state.pending.word : ''
  if (!state?.pending || state.pending !== pending) return ignoredResult(session, state, word)

  if (!accepted) {
    return {
      session,
      state: { ...state, selections: [], draft: '', pending: null },
      outcome: 'incorrect',
      word,
      returnTiles: true,
    }
  }

  const record = {
    word,
    source: 'teacher',
    teamId: state.pending.teamId,
  }
  return {
    session,
    state: {
      ...state,
      selections: [],
      draft: '',
      records: [...state.records, record],
      pending: null,
    },
    outcome: 'correct',
    word,
    source: 'teacher',
    returnTiles: true,
  }
}

export function collectedWords(session, state) {
  return Array.isArray(state?.records) ? state.records : []
}

export function getWorkshopScores(session, state) {
  const scores = Object.fromEntries(
    (Array.isArray(session?.teams) ? session.teams : []).map((team) => [team.id, 0]),
  )
  for (const record of Array.isArray(state?.records) ? state.records : []) {
    if (Object.hasOwn(scores, record.teamId)) scores[record.teamId] += 1
  }
  return scores
}
