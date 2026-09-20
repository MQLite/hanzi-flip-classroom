import { curriculumCourse } from './curriculum.js'
import { normalizeSentenceTrain, validateSentenceTrain } from './sentence-train-data.js'

export const SCHEMA_VERSION = 1
export const STORAGE_KEY = 'hanzi-flip.question-bank'

const REQUIRED_TEXT_FIELDS = ['id', 'character', 'pinyin', 'sentence']
const OPTIONAL_TEXT_FIELDS = ['radical', 'components', 'structure']

function issue(path, code, message) {
  return { path, code, message }
}

function normalizedText(value) {
  return value.normalize('NFC').trim().replace(/\s+/gu, ' ')
}

export function normalizePinyin(value) {
  return typeof value === 'string' ? normalizedText(value).toLocaleLowerCase('zh-CN') : ''
}

function normalizeQuestion(question) {
  const normalized = { ...question }
  for (const field of REQUIRED_TEXT_FIELDS) {
    if (typeof normalized[field] === 'string') normalized[field] = normalizedText(normalized[field])
  }
  if (typeof normalized.pinyin === 'string') normalized.pinyin = normalizePinyin(normalized.pinyin)
  if (Array.isArray(normalized.words)) {
    normalized.words = normalized.words.map((word) =>
      typeof word === 'string' ? normalizedText(word) : word,
    )
  }
  for (const field of OPTIONAL_TEXT_FIELDS) {
    if (typeof normalized[field] === 'string') normalized[field] = normalizedText(normalized[field])
  }
  if (normalized.sentenceTrain !== undefined) {
    normalized.sentenceTrain = normalizeSentenceTrain(normalized.sentenceTrain)
  }
  return normalized
}

export function validateBank(input) {
  const errors = []
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, errors: [issue('$', 'invalid-bank', '题库必须是一个对象。')] }
  }
  if (input.schemaVersion !== SCHEMA_VERSION) {
    errors.push(
      issue(
        'schemaVersion',
        'unsupported-version',
        `不支持题库版本 ${String(input.schemaVersion)}，当前版本为 ${SCHEMA_VERSION}。`,
      ),
    )
  }
  if (!Array.isArray(input.questions)) {
    errors.push(issue('questions', 'invalid-questions', 'questions 必须是一个数组。'))
    return { ok: false, errors }
  }

  const questions = input.questions.map((item) =>
    item && typeof item === 'object' && !Array.isArray(item) ? normalizeQuestion(item) : item,
  )
  const ids = new Map()
  const signatures = new Map()

  questions.forEach((question, index) => {
    const base = `questions[${index}]`
    if (!question || typeof question !== 'object' || Array.isArray(question)) {
      errors.push(issue(base, 'invalid-question', '题目必须是一个对象。'))
      return
    }

    for (const field of REQUIRED_TEXT_FIELDS) {
      if (typeof question[field] !== 'string' || question[field].length === 0) {
        errors.push(issue(`${base}.${field}`, 'required', `${field} 必须是非空文本。`))
      }
    }
    if (!Number.isInteger(question.grade) || question.grade < 1 || question.grade > 4) {
      errors.push(issue(`${base}.grade`, 'invalid-grade', 'grade 必须是 1 至 4 的整数。'))
    }
    const hasCurriculum = ['textbook', 'book', 'lesson'].some(key => question[key] !== undefined)
    if (hasCurriculum && (!curriculumCourse(question) || question.grade !== question.book)) {
      errors.push(issue(`${base}.textbook`, 'invalid-curriculum', '教材归属必须对应所选教材版本的实际课次、汉字和级别。'))
    }
    if (typeof question.character === 'string' && !/^\p{Script=Han}$/u.test(question.character)) {
      errors.push(issue(`${base}.character`, 'invalid-character', 'character 必须是单个汉字。'))
    }
    if (
      !Array.isArray(question.words) ||
      question.words.length !== 2 ||
      question.words.some((word) => typeof word !== 'string' || word.length === 0)
    ) {
      errors.push(issue(`${base}.words`, 'invalid-words', 'words 必须包含两个非空词语。'))
    }
    if (
      question.strokeCount !== undefined &&
      (!Number.isInteger(question.strokeCount) || question.strokeCount <= 0)
    ) {
      errors.push(issue(`${base}.strokeCount`, 'invalid-stroke-count', 'strokeCount 必须是正整数。'))
    }
    for (const field of OPTIONAL_TEXT_FIELDS) {
      if (question[field] !== undefined && typeof question[field] !== 'string') {
        errors.push(issue(`${base}.${field}`, 'invalid-text', `${field} 必须是文本。`))
      }
    }
    if (question.sentenceTrain !== undefined) {
      const trainValidation = validateSentenceTrain(question.sentenceTrain, question.sentence)
      for (const error of trainValidation.errors) {
        const suffix = error.path === '$' ? '' : `.${error.path}`
        errors.push(issue(`${base}.sentenceTrain${suffix}`, error.code, error.message))
      }
    }

    if (typeof question.id === 'string' && question.id.length > 0) {
      if (ids.has(question.id)) {
        errors.push(
          issue(`${base}.id`, 'duplicate-id', `ID 与 questions[${ids.get(question.id)}] 重复。`),
        )
      } else {
        ids.set(question.id, index)
      }
    }
    if (
      Number.isInteger(question.grade) &&
      typeof question.character === 'string' &&
      typeof question.pinyin === 'string'
    ) {
      const signature = hasCurriculum
        ? `${question.textbook}\u0000${question.book}\u0000${question.lesson}\u0000${question.character}`
        : `${question.grade}\u0000${question.character}\u0000${normalizePinyin(question.pinyin)}`
      if (signatures.has(signature)) {
        errors.push(
          issue(
            base,
            'duplicate-question',
            `题目归属和汉字与 questions[${signatures.get(signature)}] 重复（通用题按年级及读音区分）。`,
          ),
        )
      } else {
        signatures.set(signature, index)
      }
    }
  })

  if (errors.length > 0) return { ok: false, errors }
  return { ok: true, bank: { schemaVersion: SCHEMA_VERSION, questions } }
}

function parseImport(text) {
  if (typeof text !== 'string') {
    return { ok: false, error: { code: 'invalid-input', message: '请选择 JSON 文本文件。' } }
  }
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch (cause) {
    return { ok: false, error: { code: 'invalid-json', message: '文件不是有效的 JSON。', cause } }
  }

  const validated = validateBank(parsed)
  if (!validated.ok) {
    return {
      ok: false,
      error: { code: 'validation-failed', message: '题库文件校验失败。', details: validated.errors },
    }
  }
  return { ok: true, bank: validated.bank }
}

export function previewImport(text) {
  const parsed = parseImport(text)
  if (!parsed.ok) return parsed
  const countsByGrade = { 1: 0, 2: 0, 3: 0, 4: 0 }
  for (const question of parsed.bank.questions) countsByGrade[question.grade] += 1
  return {
    ok: true,
    bank: parsed.bank,
    total: parsed.bank.questions.length,
    countsByGrade,
  }
}

export function exportBank(input) {
  const document = Array.isArray(input)
    ? { schemaVersion: SCHEMA_VERSION, questions: input }
    : input
  const validated = validateBank(document)
  if (!validated.ok) {
    const error = new TypeError('Cannot export an invalid question bank')
    error.details = validated.errors
    throw error
  }
  return JSON.stringify(validated.bank, null, 2)
}

function storageError(code, message, cause) {
  return { code, message, cause }
}

export function createQuestionBankStore({
  storage,
  defaultQuestions,
  key = STORAGE_KEY,
} = {}) {
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
    throw new TypeError('A localStorage-compatible storage object is required')
  }
  if (!Array.isArray(defaultQuestions)) throw new TypeError('defaultQuestions must be an array')
  const pendingKey = `${key}.pending`

  function readRaw() {
    try {
      return { ok: true, raw: storage.getItem(key) }
    } catch (cause) {
      return {
        ok: false,
        error: storageError('storage-read-failed', '无法读取本地题库，请重试或检查浏览器存储权限。', cause),
      }
    }
  }

  function save(input) {
    const document = Array.isArray(input)
      ? { schemaVersion: SCHEMA_VERSION, questions: input }
      : input
    const validated = validateBank(document)
    if (!validated.ok) {
      return {
        ok: false,
        error: { code: 'validation-failed', message: '题库未通过校验，未保存。', details: validated.errors },
        pendingBank: document,
      }
    }

    const previous = readRaw()
    if (!previous.ok) return { ...previous, pendingBank: validated.bank }
    const serialized = JSON.stringify(validated.bank)

    try {
      storage.setItem(pendingKey, serialized)
      if (storage.getItem(pendingKey) !== serialized) throw new Error('staged write could not be verified')
      storage.setItem(key, serialized)
      if (storage.getItem(key) !== serialized) throw new Error('committed write could not be verified')
      storage.removeItem?.(pendingKey)
      return { ok: true, bank: validated.bank }
    } catch (cause) {
      try {
        const currentRaw = storage.getItem(key)
        if (currentRaw !== previous.raw) {
          if (previous.raw === null) storage.removeItem?.(key)
          else storage.setItem(key, previous.raw)
        }
      } catch {
        // The caller still receives pendingBank and the last known raw value for recovery.
      }
      try {
        storage.removeItem?.(pendingKey)
      } catch {
        // A blocked cleanup is harmless; pending data never becomes the active bank.
      }
      return {
        ok: false,
        error: storageError('storage-write-failed', '题库保存失败；上次保存的数据已保留。', cause),
        pendingBank: validated.bank,
        previousRaw: previous.raw,
      }
    }
  }

  function load() {
    const read = readRaw()
    if (!read.ok) return read
    if (read.raw === null) {
      const initialized = save(defaultQuestions)
      return initialized.ok ? { ...initialized, source: 'defaults' } : initialized
    }

    let parsed
    try {
      parsed = JSON.parse(read.raw)
    } catch (cause) {
      return {
        ok: false,
        error: storageError('corrupt-data', '已保存的题库无法解析，原始数据未被覆盖。', cause),
        raw: read.raw,
      }
    }
    const validated = validateBank(parsed)
    if (!validated.ok) {
      return {
        ok: false,
        error: {
          code: 'corrupt-data',
          message: '已保存的题库格式无效，原始数据未被覆盖。',
          details: validated.errors,
        },
        raw: read.raw,
      }
    }
    return { ok: true, source: 'saved', bank: validated.bank }
  }

  function importBank(text) {
    const preview = previewImport(text)
    return preview.ok ? save(preview.bank) : preview
  }

  return {
    load,
    save,
    readRaw,
    exportBank,
    previewImport,
    importBank,
    restoreDefaults: () => save(defaultQuestions),
  }
}
