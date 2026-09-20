import { markCurrent, revealCurrent } from './core.js'

const HAN_WORD = /^\p{Script=Han}+$/u
const MIN_WORD_LENGTH = 2
const MAX_WORD_LENGTH = 8
const MIN_PALETTE_SIZE = 8
const MIN_DISTRACTOR_COUNT = 3
const DISTRACTOR_CHARACTERS = [
  ...'山水木火土日月人大小上下左右中外前后东西南北口手心风雨云石田禾花草鸟鱼虫马牛羊门车学生活好爱家国春夏秋冬红蓝绿金女子文正长高低早晚来去看听说读写',
]

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

export function buildCharacterPalette(question, random = Math.random) {
  if (typeof random !== 'function') throw new TypeError('random must be a function')

  const requiredCounts = new Map()
  const answerCharacters = new Set()
  for (const word of buildWordAnswers(question)) {
    const wordCounts = new Map()
    for (const character of word) {
      answerCharacters.add(character)
      wordCounts.set(character, (wordCounts.get(character) ?? 0) + 1)
    }
    for (const [character, count] of wordCounts) {
      requiredCounts.set(character, Math.max(requiredCounts.get(character) ?? 0, count))
    }
  }

  const target = question?.character
  if (requiredCounts.size === 0 && typeof target === 'string' && [...target].length === 1 && HAN_WORD.test(target)) {
    requiredCounts.set(target, 1)
    answerCharacters.add(target)
  }

  const characters = []
  for (const [character, count] of requiredCounts) {
    for (let occurrence = 0; occurrence < count; occurrence += 1) characters.push(character)
  }

  const distractorsNeeded = Math.max(MIN_DISTRACTOR_COUNT, MIN_PALETTE_SIZE - characters.length)
  const usedDistractors = new Set()
  for (const character of DISTRACTOR_CHARACTERS) {
    if (answerCharacters.has(character) || usedDistractors.has(character)) continue
    usedDistractors.add(character)
    characters.push(character)
    if (usedDistractors.size === distractorsNeeded) break
  }

  const tiles = characters.map((character, index) => ({ id: `tile-${index + 1}`, character }))
  return shuffle(tiles, random)
}

export function createWorkshopState(session, random = Math.random) {
  const questions = Array.isArray(session?.questions) ? session.questions : []
  return {
    drafts: questions.map(() => ''),
    palettes: questions.map((question) => buildCharacterPalette(question, random)),
    selections: questions.map(() => []),
    records: [],
  }
}

function canEditCurrent(session) {
  const index = session?.currentIndex
  return (
    session?.phase === 'active' &&
    Number.isInteger(index) &&
    index >= 0 &&
    index < session.questions.length &&
    session.judgments?.[index] === null
  )
}

function updateCurrentSelection(state, index, selectedIds) {
  const palette = state.palettes[index]
  const charactersById = new Map(palette.map((tile) => [tile.id, tile.character]))
  const drafts = [...state.drafts]
  const selections = [...state.selections]
  drafts[index] = selectedIds.map((id) => charactersById.get(id)).join('')
  selections[index] = selectedIds
  return { ...state, drafts, selections }
}

export function toggleWorkshopTile(state, session, tileId) {
  if (!canEditCurrent(session)) return state

  const index = session.currentIndex
  const palette = state?.palettes?.[index]
  const selectedIds = state?.selections?.[index]
  if (!Array.isArray(palette) || !Array.isArray(selectedIds)) return state
  if (!palette.some((tile) => tile.id === tileId)) return state

  const selectedIndex = selectedIds.indexOf(tileId)
  if (selectedIndex === -1 && selectedIds.length >= MAX_WORD_LENGTH) return state
  const nextIds =
    selectedIndex === -1
      ? [...selectedIds, tileId]
      : selectedIds.filter((_, index) => index !== selectedIndex)
  return updateCurrentSelection(state, index, nextIds)
}

export function undoWorkshopTile(state, session) {
  if (!canEditCurrent(session)) return state
  const index = session.currentIndex
  const selectedIds = state?.selections?.[index]
  if (!Array.isArray(selectedIds) || selectedIds.length === 0) return state
  return updateCurrentSelection(state, index, selectedIds.slice(0, -1))
}

export function clearWorkshopSelection(state, session) {
  if (!canEditCurrent(session)) return state
  const index = session.currentIndex
  const selectedIds = state?.selections?.[index]
  if (!Array.isArray(selectedIds) || selectedIds.length === 0) return state
  return updateCurrentSelection(state, index, [])
}

export function submitWorkshopWord(session, state, { teamId } = {}, random = Math.random) {
  const index = session?.currentIndex
  const word = typeof state?.drafts?.[index] === 'string' ? state.drafts[index] : ''
  if (!canEditCurrent(session) || [...word].length < MIN_WORD_LENGTH) {
    return { session, state, outcome: 'ignored', word }
  }

  const question = session.questions[index]
  const correct = buildWordAnswers(question).includes(word)
  if (!correct) {
    return {
      session,
      state: clearWorkshopSelection(state, session),
      outcome: 'incorrect',
      word,
    }
  }
  if (!session.teams.some((team) => team.id === teamId)) {
    throw new TypeError('A valid teamId is required for a correct answer')
  }

  let nextSession = revealCurrent(session)
  nextSession = markCurrent(nextSession, { outcome: 'correct', teamId })

  const drafts = [...state.drafts]
  const palettes = [...state.palettes]
  const selections = [...state.selections]
  drafts[index] = ''
  palettes[index] = buildCharacterPalette(question, random)
  selections[index] = []

  return {
    session: nextSession,
    state: {
      ...state,
      drafts,
      palettes,
      selections,
      records: [...state.records, { word, teamId, questionId: question.id }],
    },
    outcome: 'correct',
    word,
  }
}

export function collectedWords(session, state) {
  return Array.isArray(state?.records) ? state.records : []
}
