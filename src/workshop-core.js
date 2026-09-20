import { getCurrentQuestion, markCurrent } from './core.js'

const HAN_WORD = /^\p{Script=Han}+$/u
const MIN_WORD_LENGTH = 2
const MAX_WORD_LENGTH = 8
const MAX_OTHER_TILES = 12

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

export function buildTiles(question, random = Math.random) {
  const character = question?.character
  if (typeof random !== 'function') throw new TypeError('random must be a function')
  if (typeof character !== 'string' || [...character].length !== 1 || !HAN_WORD.test(character)) {
    return []
  }

  const otherCharacters = []
  const seen = new Set([character])
  const words = Array.isArray(question.words) ? question.words : []

  for (const word of words) {
    const validation = validateWord(word, character)
    if (!validation.ok) continue
    for (const candidate of validation.value) {
      if (seen.has(candidate)) continue
      seen.add(candidate)
      otherCharacters.push(candidate)
      if (otherCharacters.length === MAX_OTHER_TILES) break
    }
    if (otherCharacters.length === MAX_OTHER_TILES) break
  }

  return shuffle([character, ...otherCharacters], random)
}

export function createWorkshopState(session, random = Math.random) {
  const questions = Array.isArray(session?.questions) ? session.questions : []
  return {
    drafts: questions.map(() => ''),
    tiles: questions.map((question) => buildTiles(question, random)),
  }
}

export function setWorkshopDraft(state, session, value) {
  const index = session?.currentIndex
  if (
    session?.phase !== 'active' ||
    !Number.isInteger(index) ||
    index < 0 ||
    session.judgments?.[index]
  ) {
    return state
  }

  const drafts = [...state.drafts]
  drafts[index] = value
  return { ...state, drafts }
}

export function markWorkshopCurrent(session, state, options = {}) {
  const index = session?.currentIndex
  if (session?.judgments?.[index]) return session

  if (options.outcome === 'correct') {
    const question = getCurrentQuestion(session)
    const validation = validateWord(state?.drafts?.[index] ?? '', question?.character)
    if (!validation.ok) throw new Error(validation.error)
  }

  return markCurrent(session, options)
}

export function collectedWords(session, state) {
  const collected = []

  for (let index = 0; index < session.questions.length; index += 1) {
    const judgment = session.judgments[index]
    if (judgment?.outcome !== 'correct') continue
    collected.push({
      word: typeof state?.drafts?.[index] === 'string' ? state.drafts[index].trim() : '',
      teamId: judgment.teamId,
      questionId: session.questions[index].id,
    })
  }

  return collected
}
