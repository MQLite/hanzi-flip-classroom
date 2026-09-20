import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import * as curriculum from '../src/curriculum.js'
import { validateBank, exportBank, previewImport } from '../src/storage.js'
import { buildWordAnswers, buildCharacterPalette } from '../src/workshop-core.js'

describe('Hanyu Paradise PDF bank', () => {
  it('keeps polyphonic readings tied to each lesson and distinguishes erhua', () => {
    const question = (book, lesson, character) => curriculum.PARADISE_QUESTIONS.find(q => q.book === book && q.lesson === lesson && q.character === character)
    expect(question(1,5,'发')).toMatchObject({pinyin:'fà', words:['头发','短发']})
    expect(question(1,8,'发')).toMatchObject({pinyin:'fā', words:['沙发','发现']})
    expect(question(2,8,'乐').pinyin).toBe('yuè')
    expect(question(3,4,'乐').pinyin).toBe('yuè')
    expect(question(3,11,'乐').pinyin).toBe('lè')
    expect(question(3,8,'觉').pinyin).toBe('jiào')
    expect(question(2,6,'儿')).toMatchObject({pinyin:'ér', words:['儿童','儿歌']})
    expect(question(3,1,'和')).toMatchObject({pinyin:'hé', words:['和好','和平']})
  })

  it('covers all six actual volumes and preserves the separate modern curriculum', () => {
    expect(curriculum.PARADISE_COURSES).toHaveLength(36)
    expect(curriculum.TEXTBOOK_QUESTIONS).toHaveLength(108)
    for (const stage of curriculum.STAGES) {
      const courses = curriculum.PARADISE_COURSES.filter(c => c.stage === stage)
      expect(courses.map(c => c.lesson)).toEqual(stage.endsWith('A') ? [1,2,3,4,5,6] : [7,8,9,10,11,12])
      for (const course of courses) {
        expect(course.vocabulary.length).toBeGreaterThan(0)
        expect(course.pdfStartPage).toBeGreaterThan(0)
        expect(course.vocabulary.every(v => v.pdfPage > 0 && v.word && v.pinyin)).toBe(true)
      }
    }
    const bank = {schemaVersion:1, questions:[...curriculum.TEXTBOOK_QUESTIONS, ...curriculum.PARADISE_QUESTIONS]}
    expect(validateBank(bank).ok).toBe(true)
    expect(previewImport(exportBank(bank)).bank).toEqual(bank)
  })

  it('filters by actual edition, stage and lesson without mixing editions', () => {
    const questions = [...curriculum.TEXTBOOK_QUESTIONS, ...curriculum.PARADISE_QUESTIONS]
    const selected = curriculum.filterCurriculum(questions, {textbook:curriculum.PARADISE_ID, stage:'1A', lesson:1, scope:'lesson'})
    expect(selected.map(q => q.character)).toEqual(expect.arrayContaining(['你','好','再','见']))
    expect(selected.every(q => q.textbook === curriculum.PARADISE_ID && q.lesson === 1)).toBe(true)
    const cumulative = curriculum.filterCurriculum(questions, {textbook:curriculum.PARADISE_ID, stage:'2A', lesson:1, scope:'cumulative'})
    expect(cumulative.some(q => q.book === 1 && q.lesson === 12)).toBe(true)
    expect(cumulative.every(q => q.textbook === curriculum.PARADISE_ID && (q.book === 1 || (q.book === 2 && q.lesson === 1)))).toBe(true)
    expect(curriculum.curriculumLabel(selected[0])).toContain('汉语乐园')
    expect(curriculum.curriculumLabel(curriculum.TEXTBOOK_QUESTIONS[0])).toContain('中文乐园')
  })

  it('adds missing questions idempotently and preserves teacher edits in both editions', () => {
    const edited = {...curriculum.PARADISE_QUESTIONS[0], sentence:'老师修改的例句。'}
    const modern = {...curriculum.TEXTBOOK_QUESTIONS[0], sentence:'新版题目修改。'}
    const original = [edited, modern]
    const merged = curriculum.mergeAllTextbookQuestions(original)
    expect(merged).toHaveLength(curriculum.PARADISE_QUESTIONS.length + 108)
    expect(merged.slice(0,2)).toEqual(original)
    expect(curriculum.mergeAllTextbookQuestions(merged)).toEqual(merged)
    expect(original).toHaveLength(2)
    const collision = {...edited, id:curriculum.PARADISE_QUESTIONS[1].id}
    const colliding = curriculum.mergeAllTextbookQuestions([collision])
    expect(new Set(colliding.map(q => q.id)).size).toBe(colliding.length)
    expect(validateBank({schemaVersion:1, questions:colliding}).ok).toBe(true)
  })

  it('makes every vocabulary character playable, with two valid answers and local strokes', () => {
    for (const course of curriculum.PARADISE_COURSES) {
      const actual = curriculum.PARADISE_QUESTIONS.filter(q => q.book === course.book && q.lesson === course.lesson)
      const expected = new Set([...course.vocabulary.map(v => v.word).join(''), ...course.writingCharacters].filter(c => /\p{Script=Han}/u.test(c)))
      expect(new Set(actual.map(q => q.character))).toEqual(expected)
    }
    for (const q of curriculum.PARADISE_QUESTIONS) {
      const answers = buildWordAnswers(q)
      expect(answers, q.id).toHaveLength(2)
      expect(q.sentence, q.id).toContain(q.character)
      expect(q.pinyin, q.id).toMatch(/^[a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüêńňǹ]+$/u)
      const palette = buildCharacterPalette(q)
      for (const word of answers) for (const char of new Set(word)) {
        expect(palette.filter(tile => tile.character === char).length).toBeGreaterThanOrEqual([...word].filter(c => c === char).length)
      }
      const strokes = JSON.parse(readFileSync(`public/strokes/${q.character}.json`, 'utf8'))
      expect(strokes.strokes.length).toBeGreaterThan(0)
      expect(strokes.medians).toHaveLength(strokes.strokes.length)
    }
  })
})
