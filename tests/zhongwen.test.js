import { describe, expect, it } from 'vitest'
import * as curriculum from '../src/curriculum.js'
import { DEFAULT_QUESTIONS } from '../src/data.js'
import { createSession } from '../src/core.js'
import { createWorkshopState, remainingWorkshopWords } from '../src/workshop-core.js'
import { validateBank, exportBank, previewImport } from '../src/storage.js'
import { readFileSync } from 'node:fs'

const textbook = 'zhongwen-primary-2023'
const selected = (questions, stage, lesson, scope = 'lesson') =>
  curriculum.filterCurriculum(questions, { textbook, stage, lesson, scope })

describe('Zhongwen primary textbooks', () => {
  it('offers the 24 actual lessons by complete book rather than artificial A/B stages', () => {
    const courses = curriculum.coursesForTextbook(textbook)
    expect(courses).toHaveLength(24)
    expect(courses.find(c => c.book === 1 && c.lesson === 1)?.title).toBe('识字（一）')
    expect(courses.find(c => c.book === 2 && c.lesson === 1)?.title).toBe('在中文学校')
    expect(courses.filter(c => c.stage === '2').map(c => c.lesson)).toEqual([1,2,3,4,5,6,7,8,9,10,11,12])
  })

  it('keeps a book, a lesson and cumulative practice in the selected series', () => {
    const all = curriculum.mergeAllTextbookQuestions(DEFAULT_QUESTIONS)
    const first = selected(all, '2', 1)
    expect(first.map(q => q.character)).toEqual(['在','教','汉','语','写','歌','画'])
    const fullBook = selected(all, '2', 1, 'stage')
    expect(new Set(fullBook.map(q => q.lesson)).size).toBe(12)
    expect(fullBook.every(q => q.textbook === textbook && q.book === 2)).toBe(true)
    const cumulative = selected(all, '2', 1, 'cumulative')
    expect(cumulative.some(q => q.book === 1 && q.lesson === 12)).toBe(true)
    expect(cumulative.every(q => q.textbook === textbook && (q.book === 1 || q.lesson === 1))).toBe(true)
    expect(curriculum.curriculumLabel(first[0])).toBe('中文 · 第二册 · 第1课 在中文学校')
  })

  it('appends missing books without overwriting personal questions or edited textbook questions', () => {
    const initial = curriculum.mergeAllTextbookQuestions(DEFAULT_QUESTIONS)
    const original = selected(initial, '2', 1)[0]
    expect(original).toBeDefined()
    const edited = { ...original, id: 'teacher-edited', sentence: '我在家学习。' }
    const personal = { ...DEFAULT_QUESTIONS[0], id: 'teacher-personal', sentence: '日子过得很快乐。' }
    const bank = [personal, edited, curriculum.PARADISE_QUESTIONS[0]]
    const merged = curriculum.mergeAllTextbookQuestions(bank)
    expect(merged.slice(0, 3)).toEqual(bank)
    expect(merged.filter(q => q.textbook === textbook && q.book === 2 && q.lesson === 1 && q.character === '在')).toEqual([edited])
    expect(curriculum.mergeAllTextbookQuestions(merged)).toEqual(merged)
    expect(validateBank({ schemaVersion: 1, questions: merged }).ok).toBe(true)
    expect(previewImport(exportBank({ schemaVersion: 1, questions: merged })).bank.questions).toEqual(merged)
  })

  it('offers every textbook phrase to the workshop beyond the two examples on each character card', () => {
    const questions = selected(curriculum.mergeAllTextbookQuestions([]), '2', 1)
    const session = createSession({ questions, limit: 100 })
    const state = createWorkshopState(session)
    const pool = remainingWorkshopWords(session, state)
    expect(pool).toEqual(expect.arrayContaining(['在学校','在家','在花园','教汉语','教汉字','教学生','教唱歌','英语','法语','写作业','唱中文歌','画画儿']))
    expect(pool).not.toContain('火山')
    expect(new Set(pool).size).toBe(pool.length)
  })

  it('retains all source entries with provenance, including repeated words and single-character reading exercises', () => {
    const courses = curriculum.coursesForTextbook(textbook)
    expect(courses.filter(c => c.book === 1).map(c => c.characterDetails.length)).toEqual([12,13,12,12,13,12,14,9,14,10,13,10])
    expect(courses.filter(c => c.book === 2).map(c => c.characterDetails.length)).toEqual([7,14,11,12,12,13,14,14,14,6,12,12])
    expect(courses.filter(c => c.book === 1).flatMap(c => c.vocabulary)).toHaveLength(348)
    expect(courses.filter(c => c.book === 2).flatMap(c => c.vocabulary)).toHaveLength(457)
    for (const course of courses) {
      expect(new Set([...course.characters]).size).toBe(course.characterDetails.length)
      for (const item of course.vocabulary) {
        expect(item.word).toBeTruthy()
        expect(item.pinyin).toBeTruthy()
        expect(item.section).toBeTruthy()
        expect(item.pdfPage - item.printedPage).toBe(15)
      }
    }
  })

  it('supplies usable character examples and local stroke vectors for all 285 lesson characters', () => {
    const questions = curriculum.mergeAllTextbookQuestions([]).filter(q => q.textbook === textbook)
    expect(questions).toHaveLength(285)
    for (const q of questions) {
      expect(q.words).toHaveLength(2)
      expect(q.words.every(w => w.includes(q.character) && /^[\p{Script=Han}]{2,8}$/u.test(w)), q.id).toBe(true)
      expect(q.sentence, q.id).toContain(q.character)
      const data = JSON.parse(readFileSync(`public/strokes/${q.character}.json`, 'utf8'))
      expect(data.strokes.length, q.character).toBeGreaterThan(0)
      expect(data.medians.length, q.character).toBe(data.strokes.length)
    }
  })

  it('uses the words inside book-title marks as workshop tiles while retaining the original source spelling', () => {
    const questions = selected(curriculum.mergeAllTextbookQuestions([]), '2', 8)
    const session = createSession({questions, limit:100})
    const pool = remainingWorkshopWords(session, createWorkshopState(session))
    expect(pool).toContain('神奇校车')
    expect(pool).not.toContain('《神奇校车》')
    expect(curriculum.coursesForTextbook(textbook).find(c => c.book === 2 && c.lesson === 8).vocabulary.some(v => v.word === '《神奇校车》')).toBe(true)
  })
})
