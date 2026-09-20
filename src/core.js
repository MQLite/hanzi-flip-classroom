const DEFAULT_TEAM_NAMES = ['第一组', '第二组']

function assertGrade(grade) {
  if (!Number.isInteger(grade) || grade < 1 || grade > 4) {
    throw new RangeError('grade must be an integer from 1 to 4')
  }
}

function cloneQuestion(question) {
  return {
    ...question,
    words: Array.isArray(question.words) ? [...question.words] : question.words,
  }
}

function freezeSession(session) {
  for (const question of session.questions) {
    if (Array.isArray(question.words)) Object.freeze(question.words)
    Object.freeze(question)
  }
  for (const team of session.teams) Object.freeze(team)
  for (const judgment of session.judgments) {
    if (judgment) Object.freeze(judgment)
  }
  Object.freeze(session.questions)
  Object.freeze(session.teams)
  Object.freeze(session.revealed)
  Object.freeze(session.judgments)
  return Object.freeze(session)
}

function makeTeams(teamNames) {
  if (!Array.isArray(teamNames) || teamNames.length < 2 || teamNames.length > 4) {
    throw new RangeError('teamNames must contain 2 to 4 teams')
  }

  return teamNames.map((name, index) => {
    const normalizedName = typeof name === 'string' ? name.trim() : ''
    if (!normalizedName) throw new TypeError(`teamNames[${index}] must not be empty`)
    return { id: `team-${index + 1}`, name: normalizedName }
  })
}

function shuffle(values, random) {
  const shuffled = [...values]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1))
    ;[shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]]
  }
  return shuffled
}

export function selectQuestions(questions, { grade, limit = 8, random = Math.random } = {}) {
  assertGrade(grade)
  if (!Array.isArray(questions)) throw new TypeError('questions must be an array')
  if (!Number.isInteger(limit) || limit < 0) throw new RangeError('limit must be a non-negative integer')
  if (typeof random !== 'function') throw new TypeError('random must be a function')
  if (limit === 0) return []

  const candidates = shuffle(
    questions.filter((question) => question?.grade === grade),
    random,
  )
  const characters = new Set()
  const selected = []

  for (const question of candidates) {
    if (characters.has(question.character)) continue
    characters.add(question.character)
    selected.push(cloneQuestion(question))
    if (selected.length === limit) break
  }

  return selected
}

function createSessionFromQuestions({ questions, grade, teams, mode }) {
  const snapshot = questions.map(cloneQuestion)
  return freezeSession({
    grade,
    mode,
    phase: snapshot.length === 0 ? 'empty' : 'active',
    questions: snapshot,
    teams,
    currentIndex: snapshot.length === 0 ? -1 : 0,
    revealed: snapshot.map(() => false),
    judgments: snapshot.map(() => null),
  })
}

export function createSession({
  questions,
  grade,
  teamNames = DEFAULT_TEAM_NAMES,
  limit = 8,
  random = Math.random,
} = {}) {
  const teams = makeTeams(teamNames)
  const selected = selectQuestions(questions, { grade, limit, random })
  return createSessionFromQuestions({ questions: selected, grade, teams, mode: 'round' })
}

export function getCurrentQuestion(session) {
  if (!session || session.currentIndex < 0 || session.currentIndex >= session.questions.length) {
    return null
  }
  return session.questions[session.currentIndex]
}

function requireActive(session, action) {
  if (session.phase !== 'active') throw new Error(`Cannot ${action} when session is ${session.phase}`)
}

export function revealCurrent(session) {
  requireActive(session, 'reveal a card')
  if (session.revealed[session.currentIndex]) return session
  const revealed = [...session.revealed]
  revealed[session.currentIndex] = true
  return freezeSession({ ...session, revealed })
}

export function markCurrent(session, { outcome, teamId } = {}) {
  requireActive(session, 'mark a card')
  const index = session.currentIndex
  if (!session.revealed[index]) throw new Error('Reveal the card before marking it')
  if (session.judgments[index]) return session

  if (outcome !== 'correct' && outcome !== 'practice') {
    throw new TypeError("outcome must be 'correct' or 'practice'")
  }
  if (outcome === 'correct' && !session.teams.some((team) => team.id === teamId)) {
    throw new TypeError('A valid teamId is required for a correct answer')
  }

  const judgments = [...session.judgments]
  judgments[index] = outcome === 'correct' ? { outcome, teamId } : { outcome }
  return freezeSession({ ...session, judgments })
}

export function navigateNext(session) {
  if (session.phase !== 'active') return session
  const judgments = [...session.judgments]
  if (!judgments[session.currentIndex]) judgments[session.currentIndex] = { outcome: 'unanswered' }

  if (session.currentIndex === session.questions.length - 1) {
    return freezeSession({ ...session, phase: 'complete', judgments })
  }

  return freezeSession({
    ...session,
    currentIndex: session.currentIndex + 1,
    judgments,
  })
}

export function navigateBack(session) {
  if (session.phase === 'complete' && session.questions.length > 0) {
    return freezeSession({ ...session, phase: 'active', currentIndex: session.questions.length - 1 })
  }
  if (session.phase !== 'active' || session.currentIndex === 0) return session
  return freezeSession({ ...session, currentIndex: session.currentIndex - 1 })
}

export function getScores(session) {
  const scores = Object.fromEntries(session.teams.map((team) => [team.id, 0]))
  for (const judgment of session.judgments) {
    if (judgment?.outcome === 'correct' && Object.hasOwn(scores, judgment.teamId)) {
      scores[judgment.teamId] += 1
    }
  }
  return scores
}

export function getPracticeQuestions(session) {
  return session.questions
    .filter((_, index) => session.judgments[index]?.outcome === 'practice')
    .map(cloneQuestion)
}

export function startPractice(session) {
  return createSessionFromQuestions({
    questions: getPracticeQuestions(session),
    grade: session.grade,
    teams: session.teams.map((team) => ({ ...team })),
    mode: 'practice',
  })
}
