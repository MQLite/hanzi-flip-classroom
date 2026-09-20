import { resolveTrainQuestion } from './sentence-train-data.js'

const DEFAULT_TEAM_NAMES = ['第一组', '第二组']

function cloneTrain(train) {
  return {
    ...train,
    tokens: [...train.tokens],
    alternatives: train.alternatives.map((alternative) => [...alternative]),
  }
}

function cloneQuestion(question) {
  const copy = { ...question, train: cloneTrain(question.train) }
  if (Array.isArray(question.words)) copy.words = [...question.words]
  if (question.sentenceTrain && typeof question.sentenceTrain === 'object') {
    copy.sentenceTrain = cloneTrain(question.sentenceTrain)
  }
  return copy
}

function makeTeams(teamNames) {
  if (!Array.isArray(teamNames) || teamNames.length < 2 || teamNames.length > 4) {
    throw new RangeError('teamNames must contain 2 to 4 teams')
  }
  return teamNames.map((name, index) => {
    const normalized = typeof name === 'string' ? name.trim() : ''
    if (!normalized) throw new TypeError(`teamNames[${index}] must not be empty`)
    return { id: `team-${index + 1}`, name: normalized }
  })
}

function shuffle(values, random) {
  const shuffled = [...values]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const sample = Number(random())
    const bounded = Number.isFinite(sample) ? Math.min(Math.max(sample, 0), 0.9999999999999999) : 0
    const target = Math.floor(bounded * (index + 1))
    ;[shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]]
  }
  return shuffled
}

function answerSequences(question) {
  return [question.train.tokens, ...question.train.alternatives]
}

function isAnswerText(question, texts) {
  return answerSequences(question).some((answer) =>
    answer.length === texts.length && answer.every((token, index) => token === texts[index]),
  )
}

function makePalette(question, questionIndex, random) {
  const ordered = question.train.tokens.map((text, tokenIndex) => ({
    id: `train-${questionIndex + 1}-${tokenIndex + 1}`,
    text,
  }))
  let candidate = ordered
  for (let attempt = 0; attempt < 12; attempt += 1) {
    candidate = shuffle(ordered, random)
    if (!isAnswerText(question, candidate.map(({ text }) => text))) return candidate
  }
  for (let offset = 1; offset < ordered.length; offset += 1) {
    candidate = [...ordered.slice(offset), ...ordered.slice(0, offset)]
    if (!isAnswerText(question, candidate.map(({ text }) => text))) return candidate
  }
  return candidate
}

function freezeSession(session) {
  for (const question of session.questions) {
    Object.freeze(question.train.tokens)
    for (const alternative of question.train.alternatives) Object.freeze(alternative)
    Object.freeze(question.train.alternatives)
    Object.freeze(question.train)
    if (Array.isArray(question.words)) Object.freeze(question.words)
    if (question.sentenceTrain && typeof question.sentenceTrain === 'object') {
      Object.freeze(question.sentenceTrain.tokens)
      for (const alternative of question.sentenceTrain.alternatives) Object.freeze(alternative)
      Object.freeze(question.sentenceTrain.alternatives)
      Object.freeze(question.sentenceTrain)
    }
    Object.freeze(question)
  }
  for (const team of session.teams) Object.freeze(team)
  for (const palette of session.palettes) {
    for (const tile of palette) Object.freeze(tile)
    Object.freeze(palette)
  }
  for (const selection of session.selections) Object.freeze(selection)
  for (const judgment of session.judgments) if (judgment) Object.freeze(judgment)
  if (session.departure) Object.freeze(session.departure)
  Object.freeze(session.questions)
  Object.freeze(session.teams)
  Object.freeze(session.palettes)
  Object.freeze(session.selections)
  Object.freeze(session.checks)
  Object.freeze(session.revealed)
  Object.freeze(session.judgments)
  return Object.freeze(session)
}

function createSessionFromResolved({ questions, teams, mode, random }) {
  const snapshot = questions.map(cloneQuestion)
  return freezeSession({
    questions: snapshot,
    teams: teams.map((team) => ({ ...team })),
    currentIndex: snapshot.length === 0 ? -1 : 0,
    phase: snapshot.length === 0 ? 'empty' : 'active',
    mode,
    judgments: snapshot.map(() => null),
    revealed: snapshot.map(() => false),
    palettes: snapshot.map((question, index) => makePalette(question, index, random)),
    selections: snapshot.map(() => []),
    checks: snapshot.map(() => null),
    departure: null,
  })
}

export function createTrainSession({
  questions,
  teamNames = DEFAULT_TEAM_NAMES,
  random = Math.random,
  limit = 8,
} = {}) {
  if (!Array.isArray(questions)) throw new TypeError('questions must be an array')
  if (typeof random !== 'function') throw new TypeError('random must be a function')
  if (!Number.isInteger(limit) || limit < 0) throw new RangeError('limit must be a non-negative integer')
  const teams = makeTeams(teamNames)
  const unique = []
  const sentences = new Set()
  for (const question of questions) {
    const resolved = resolveTrainQuestion(question)
    if (!resolved) continue
    const key = resolved.sentence.normalize('NFC').trim()
    if (sentences.has(key)) continue
    sentences.add(key)
    unique.push(resolved)
  }
  const selected = limit === 0 ? [] : shuffle(unique, random).slice(0, limit)
  return createSessionFromResolved({ questions: selected, teams, mode: 'round', random })
}

export function getTrainCurrent(session) {
  if (
    !session ||
    session.phase !== 'active' ||
    session.currentIndex < 0 ||
    session.currentIndex >= session.questions.length
  ) return null
  return session.questions[session.currentIndex]
}

function canEditCurrent(session) {
  return Boolean(
    getTrainCurrent(session) &&
    !session.departure &&
    !session.judgments[session.currentIndex],
  )
}

function withCurrentSelection(session, selection) {
  const selections = [...session.selections]
  const checks = [...session.checks]
  selections[session.currentIndex] = selection
  checks[session.currentIndex] = null
  return freezeSession({ ...session, selections, checks })
}

export function toggleTrainTile(session, id) {
  if (!canEditCurrent(session)) return session
  const index = session.currentIndex
  if (!session.palettes[index].some((tile) => tile.id === id)) return session
  const current = session.selections[index]
  const selectedIndex = current.indexOf(id)
  const selection = selectedIndex === -1
    ? [...current, id]
    : current.filter((_, position) => position !== selectedIndex)
  return withCurrentSelection(session, selection)
}

export function undoTrainTile(session) {
  if (!canEditCurrent(session)) return session
  const current = session.selections[session.currentIndex]
  return current.length === 0 ? session : withCurrentSelection(session, current.slice(0, -1))
}

export function clearTrainSelection(session) {
  if (!canEditCurrent(session)) return session
  return session.selections[session.currentIndex].length === 0
    ? session
    : withCurrentSelection(session, [])
}

function currentTexts(session) {
  const index = session.currentIndex
  const byId = new Map(session.palettes[index].map((tile) => [tile.id, tile.text]))
  return session.selections[index].map((id) => byId.get(id))
}

function completeCurrent(session) {
  const index = session.currentIndex
  return session.selections[index].length === session.palettes[index].length
}

function requireTeam(session, teamId) {
  if (!session.teams.some((team) => team.id === teamId)) {
    throw new TypeError('A valid teamId is required for a correct answer')
  }
}

function sentenceFromTexts(question, texts) {
  return `${texts.join('')}${question.train.punctuation}`
}

function settleCorrect(session, { teamId, source }) {
  requireTeam(session, teamId)
  const index = session.currentIndex
  const texts = currentTexts(session)
  const judgments = [...session.judgments]
  judgments[index] = {
    outcome: 'correct',
    teamId,
    sentence: sentenceFromTexts(session.questions[index], texts),
    source,
  }
  return freezeSession({
    ...session,
    judgments,
    departure: { questionId: session.questions[index].id },
  })
}

export function checkTrainAnswer(session, { teamId } = {}) {
  if (!canEditCurrent(session) || !completeCurrent(session)) return session
  const index = session.currentIndex
  const match = isAnswerText(session.questions[index], currentTexts(session))
  const checks = [...session.checks]
  checks[index] = match ? 'match' : 'mismatch'
  const checked = freezeSession({ ...session, checks })
  if (match && !session.revealed[index]) return settleCorrect(checked, { teamId, source: 'auto' })
  return checked
}

export function acceptTrainAnswer(session, { teamId } = {}) {
  if (!canEditCurrent(session) || !completeCurrent(session)) return session
  if (session.checks[session.currentIndex] === null) return session
  return settleCorrect(session, { teamId, source: 'teacher' })
}

export function revealTrainAnswer(session) {
  if (!canEditCurrent(session)) return session
  const index = session.currentIndex
  if (session.revealed[index]) return session
  const revealed = [...session.revealed]
  revealed[index] = true
  return freezeSession({ ...session, revealed })
}

export function markTrainPractice(session) {
  if (!canEditCurrent(session)) return session
  const judgments = [...session.judgments]
  judgments[session.currentIndex] = { outcome: 'practice' }
  return freezeSession({ ...session, judgments })
}

function advance(session, markUnanswered) {
  const index = session.currentIndex
  const judgments = [...session.judgments]
  if (markUnanswered && !judgments[index]) judgments[index] = { outcome: 'unanswered' }
  if (index === session.questions.length - 1) {
    return freezeSession({ ...session, phase: 'complete', judgments, departure: null })
  }
  return freezeSession({ ...session, currentIndex: index + 1, judgments, departure: null })
}

export function nextTrainQuestion(session) {
  if (!getTrainCurrent(session) || session.departure) return session
  return advance(session, true)
}

export function previousTrainQuestion(session) {
  if (!session || session.departure || session.questions.length === 0) return session
  if (session.phase === 'complete') {
    return freezeSession({ ...session, phase: 'active', currentIndex: session.questions.length - 1 })
  }
  if (session.phase !== 'active' || session.currentIndex === 0) return session
  return freezeSession({ ...session, currentIndex: session.currentIndex - 1 })
}

export function startTrainPractice(session) {
  const questions = session.questions.filter((_, index) => session.judgments[index]?.outcome === 'practice')
  return createSessionFromResolved({
    questions,
    teams: session.teams,
    mode: 'practice',
    random: Math.random,
  })
}

export function finishTrainDeparture(session, token) {
  if (!session?.departure || session.departure !== token) return session
  return advance(session, false)
}

export function getTrainScores(session) {
  const scores = Object.fromEntries(session.teams.map((team) => [team.id, 0]))
  for (const judgment of session.judgments) {
    if (judgment?.outcome === 'correct' && Object.hasOwn(scores, judgment.teamId)) {
      scores[judgment.teamId] += 1
    }
  }
  return scores
}
