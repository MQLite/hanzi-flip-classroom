import { SENTENCE_TRAIN_CONTENT } from './sentence-train-content.js'

const HAN_TEXT = /^\p{Script=Han}+$/u
const PUNCTUATION = new Set(['。', '？', '！'])

function issue(path, code, message) {
  return { path, code, message }
}

function normalizeText(value) {
  return typeof value === 'string' ? value.normalize('NFC').trim() : value
}

function tokenSignature(tokens) {
  return [...tokens].sort().join('\u0000')
}

function sameTokenCounts(left, right) {
  return left.length === right.length && tokenSignature(left) === tokenSignature(right)
}

export function normalizeSentenceTrain(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value
  const normalized = {
    ...value,
    tokens: Array.isArray(value.tokens) ? value.tokens.map(normalizeText) : value.tokens,
    punctuation: normalizeText(value.punctuation),
  }
  if (Array.isArray(value.alternatives)) {
    const seen = new Set(Array.isArray(normalized.tokens) ? [JSON.stringify(normalized.tokens)] : [])
    normalized.alternatives = []
    for (const alternative of value.alternatives) {
      const copy = Array.isArray(alternative) ? alternative.map(normalizeText) : alternative
      const key = Array.isArray(copy) ? JSON.stringify(copy) : `invalid:${String(copy)}`
      if (seen.has(key)) continue
      seen.add(key)
      normalized.alternatives.push(copy)
    }
  }
  return normalized
}

export function validateSentenceTrain(value, sentence) {
  const errors = []
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, errors: [issue('$', 'invalid-train', '句子小火车设置必须是一个对象。')] }
  }

  const tokens = value.tokens
  if (!Array.isArray(tokens) || tokens.length < 3 || tokens.length > 7) {
    errors.push(issue('tokens', 'invalid-token-count', '车厢必须包含 3 至 7 个词语。'))
  }
  if (Array.isArray(tokens)) {
    tokens.forEach((token, index) => {
      if (typeof token !== 'string' || token !== normalizeText(token) || !HAN_TEXT.test(token)) {
        errors.push(issue(`tokens[${index}]`, 'invalid-token', '每节车厢只能包含不带空格或标点的汉字。'))
      } else if ([...token].length > 6) {
        errors.push(issue(`tokens[${index}]`, 'invalid-token-length', '每节车厢最多包含 6 个汉字。'))
      }
    })
  }

  if (!PUNCTUATION.has(value.punctuation)) {
    errors.push(issue('punctuation', 'invalid-punctuation', '句尾标点必须是一个中文句号、问号或感叹号。'))
  }

  const alternatives = value.alternatives
  if (!Array.isArray(alternatives)) {
    errors.push(issue('alternatives', 'invalid-alternatives', '其他参考顺序必须是一个数组。'))
  } else {
    if (alternatives.length > 5) {
      errors.push(issue('alternatives', 'too-many-alternatives', '其他参考顺序最多五条。'))
    }
    alternatives.forEach((alternative, index) => {
      const validTokens = Array.isArray(alternative) && alternative.every((token) =>
        typeof token === 'string' && token === normalizeText(token) && HAN_TEXT.test(token) && [...token].length <= 6,
      )
      if (!validTokens || !Array.isArray(tokens) || !sameTokenCounts(alternative, tokens)) {
        errors.push(issue(`alternatives[${index}]`, 'invalid-alternative', '其他参考顺序必须使用完全相同的车厢及出现次数。'))
      }
    })
  }

  if (Array.isArray(tokens) && tokens.every((token) => typeof token === 'string')) {
    const body = tokens.join('')
    if ([...body].length > 28) {
      errors.push(issue('tokens', 'sentence-too-long', '句子正文最多 28 个汉字。'))
    }
    const expected = `${body}${typeof value.punctuation === 'string' ? value.punctuation : ''}`
    if (typeof sentence !== 'string' || normalizeText(sentence) !== expected) {
      errors.push(issue('$', 'sentence-mismatch', '标准车厢连接后必须与原例句完全一致。'))
    }
  }

  return { ok: errors.length === 0, errors }
}

const contentByQuestionId = new Map(SENTENCE_TRAIN_CONTENT.map((record) => [record.questionId, record]))

function cloneTrain(value) {
  return {
    ...value,
    tokens: [...value.tokens],
    alternatives: value.alternatives.map((alternative) => [...alternative]),
  }
}

function cloneQuestion(question) {
  const copy = { ...question }
  if (Array.isArray(question.words)) copy.words = [...question.words]
  if (question.sentenceTrain && typeof question.sentenceTrain === 'object') {
    const manual = normalizeSentenceTrain(question.sentenceTrain)
    copy.sentenceTrain = manual && typeof manual === 'object' ? cloneTrain(manual) : manual
  }
  return copy
}

export function resolveTrainQuestion(question) {
  if (!question || typeof question !== 'object' || Array.isArray(question)) return null

  let train
  if (question.sentenceTrain !== undefined) {
    train = normalizeSentenceTrain(question.sentenceTrain)
    if (!validateSentenceTrain(train, question.sentence).ok) return null
  } else {
    const record = contentByQuestionId.get(question.id)
    if (!record || normalizeText(question.sentence) !== normalizeText(record.sentence)) return null
    train = record.train
  }

  return { ...cloneQuestion(question), train: cloneTrain(train) }
}
