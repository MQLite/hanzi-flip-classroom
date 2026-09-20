import { describe, expect, it } from 'vitest'

import {
  SCHEMA_VERSION,
  STORAGE_KEY,
  createQuestionBankStore,
  exportBank,
  normalizePinyin,
  previewImport,
  validateBank,
} from '../src/storage.js'

const question = (overrides = {}) => ({
  id: 'one',
  grade: 1,
  character: '一',
  pinyin: 'yī',
  words: ['一个', '一天'],
  sentence: '我有一个苹果。',
  ...overrides,
})

class MemoryStorage {
  constructor(entries = {}) {
    this.values = new Map(Object.entries(entries))
    this.failReads = false
    this.failWritesFor = new Set()
  }

  getItem(key) {
    if (this.failReads) throw new Error('blocked')
    return this.values.has(key) ? this.values.get(key) : null
  }

  setItem(key, value) {
    if (this.failWritesFor.has(key)) throw new Error('quota')
    this.values.set(key, String(value))
  }

  removeItem(key) {
    this.values.delete(key)
  }
}

describe('bank validation', () => {
  it('returns field paths and actionable messages for malformed questions', () => {
    const result = validateBank({
      schemaVersion: SCHEMA_VERSION,
      questions: [question({ character: '两个', words: ['一个'], strokeCount: 0 })],
    })

    expect(result.ok).toBe(false)
    expect(result.errors.map(({ path }) => path)).toEqual(
      expect.arrayContaining(['questions[0].character', 'questions[0].words', 'questions[0].strokeCount']),
    )
    expect(result.errors.every(({ message }) => message.length > 0)).toBe(true)
  })

  it('rejects duplicate IDs and normalized grade-character-pronunciation tuples', () => {
    const result = validateBank({
      schemaVersion: SCHEMA_VERSION,
      questions: [
        question({ id: 'same' }),
        question({ id: 'same', character: '二', pinyin: 'èr', words: ['二月', '二人'] }),
        question({ id: 'other', pinyin: '  YI\u0304  ' }),
      ],
    })

    expect(result.ok).toBe(false)
    expect(result.errors.map(({ code }) => ({ code }))).toEqual(
      expect.arrayContaining([{ code: 'duplicate-id' }, { code: 'duplicate-question' }]),
    )
    expect(normalizePinyin('  YI\u0304   ge  ')).toBe('yī ge')
  })

  it('accepts an empty versioned bank', () => {
    expect(validateBank({ schemaVersion: 1, questions: [] })).toEqual({
      ok: true,
      bank: { schemaVersion: 1, questions: [] },
    })
  })

  it('keeps old questions valid and round-trips normalized sentence-train fields', () => {
    expect(validateBank({ schemaVersion: 1, questions: [question()] }).ok).toBe(true)

    const withTrain = question({
      sentence: '老师在看书。',
      sentenceTrain: {
        tokens: [' 老师 ', '在', '看书'],
        punctuation: '。',
        alternatives: [['看书', '老师', '在'], ['看书', '老师', '在']],
      },
    })
    const result = validateBank({ schemaVersion: 1, questions: [withTrain] })

    expect(result.ok).toBe(true)
    expect(result.bank.questions[0].sentenceTrain).toEqual({
      tokens: ['老师', '在', '看书'],
      punctuation: '。',
      alternatives: [['看书', '老师', '在']],
    })
    expect(JSON.parse(exportBank(result.bank))).toEqual(result.bank)
  })

  it('rejects invalid optional sentence-train fields with nested field paths', () => {
    const result = validateBank({
      schemaVersion: 1,
      questions: [question({
        sentenceTrain: { tokens: ['我', '有'], punctuation: '.', alternatives: [] },
      })],
    })

    expect(result.ok).toBe(false)
    expect(result.errors.map(({ path }) => path)).toEqual(expect.arrayContaining([
      'questions[0].sentenceTrain.tokens',
      'questions[0].sentenceTrain.punctuation',
    ]))
  })
})

describe('import and export', () => {
  it('round-trips a versioned bank and previews counts without touching storage', () => {
    const bank = { schemaVersion: 1, questions: [question(), question({ id: 'mountain', grade: 2, character: '山', pinyin: 'shān', words: ['山上', '高山'] })] }
    const storage = new MemoryStorage({ [STORAGE_KEY]: 'keep me' })

    const text = exportBank(bank)
    const preview = previewImport(text)

    expect(JSON.parse(text)).toEqual(bank)
    expect(preview).toMatchObject({ ok: true, total: 2, countsByGrade: { 1: 1, 2: 1, 3: 0, 4: 0 } })
    expect(storage.getItem(STORAGE_KEY)).toBe('keep me')
  })

  it('rejects unsupported versions, invalid JSON, and duplicate questions without mutation', () => {
    const previousRaw = JSON.stringify({ schemaVersion: 1, questions: [question()] })
    const storage = new MemoryStorage({ [STORAGE_KEY]: previousRaw })
    const store = createQuestionBankStore({ storage, defaultQuestions: [] })

    expect(previewImport('{bad').ok).toBe(false)
    expect(previewImport(JSON.stringify({ schemaVersion: 2, questions: [] })).ok).toBe(false)
    const duplicate = JSON.stringify({ schemaVersion: 1, questions: [question(), question({ id: 'two', pinyin: ' YI\u0304 ' })] })
    expect(store.importBank(duplicate).ok).toBe(false)
    expect(storage.getItem(STORAGE_KEY)).toBe(previousRaw)
  })
})

describe('question bank store', () => {
  it('initializes defaults only when the key is missing and persists an intentional empty bank', () => {
    const defaults = [question()]
    const storage = new MemoryStorage()
    const store = createQuestionBankStore({ storage, defaultQuestions: defaults })

    expect(store.load()).toMatchObject({ ok: true, source: 'defaults', bank: { questions: defaults } })

    expect(store.save([]).ok).toBe(true)
    const reloaded = createQuestionBankStore({ storage, defaultQuestions: defaults }).load()
    expect(reloaded).toMatchObject({ ok: true, source: 'saved', bank: { questions: [] } })
  })

  it('distinguishes corrupt saved data from a missing key and preserves its raw backup', () => {
    const storage = new MemoryStorage({ [STORAGE_KEY]: '{corrupt' })
    const store = createQuestionBankStore({ storage, defaultQuestions: [question()] })

    const result = store.load()

    expect(result).toMatchObject({ ok: false, error: { code: 'corrupt-data' }, raw: '{corrupt' })
    expect(storage.getItem(STORAGE_KEY)).toBe('{corrupt')
  })

  it('reports blocked reads without treating them as missing or overwriting storage', () => {
    const storage = new MemoryStorage({ [STORAGE_KEY]: 'original' })
    storage.failReads = true
    const store = createQuestionBankStore({ storage, defaultQuestions: [question()] })

    expect(store.load()).toMatchObject({ ok: false, error: { code: 'storage-read-failed' } })
    expect(storage.values.get(STORAGE_KEY)).toBe('original')
  })

  it('keeps the last good bank when a staged or committed write fails and returns pending data', () => {
    const previousRaw = JSON.stringify({ schemaVersion: 1, questions: [question()] })
    const replacement = [question({ id: 'two', character: '二', pinyin: 'èr', words: ['二月', '二人'] })]

    for (const failedKey of [`${STORAGE_KEY}.pending`, STORAGE_KEY]) {
      const storage = new MemoryStorage({ [STORAGE_KEY]: previousRaw })
      storage.failWritesFor.add(failedKey)
      const result = createQuestionBankStore({ storage, defaultQuestions: [] }).save(replacement)

      expect(result).toMatchObject({ ok: false, error: { code: 'storage-write-failed' }, pendingBank: { questions: replacement } })
      expect(storage.getItem(STORAGE_KEY)).toBe(previousRaw)
    }
  })

  it('restores defaults transactionally and imports an explicitly confirmed valid preview', () => {
    const defaults = [question()]
    const storage = new MemoryStorage()
    const store = createQuestionBankStore({ storage, defaultQuestions: defaults })
    const emptyText = JSON.stringify({ schemaVersion: 1, questions: [] })

    const preview = store.previewImport(emptyText)
    expect(preview).toMatchObject({ ok: true, total: 0 })
    expect(storage.getItem(STORAGE_KEY)).toBeNull()

    expect(store.importBank(emptyText).ok).toBe(true)
    expect(store.load()).toMatchObject({ ok: true, bank: { questions: [] } })

    expect(store.restoreDefaults().ok).toBe(true)
    expect(store.load()).toMatchObject({ ok: true, bank: { questions: defaults } })
  })
})
