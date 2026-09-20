import { describe, expect, it } from 'vitest'
import * as curriculum from '../src/curriculum.js'
import { DEFAULT_QUESTIONS } from '../src/data.js'
import { validateBank, exportBank, previewImport } from '../src/storage.js'
import { createSession } from '../src/core.js'
import { readFileSync } from 'node:fs'

describe('new Chinese Paradise curriculum', () => {
  it('covers the publisher character syllabus, including repeated characters by lesson', () => {
    expect(curriculum.COURSES).toHaveLength(36)
    expect(curriculum.TEXTBOOK_QUESTIONS).toHaveLength(108)
    expect(new Set(curriculum.TEXTBOOK_QUESTIONS.map(q => q.character)).size).toBe(99)
    const bank = {schemaVersion: 1, questions: [...DEFAULT_QUESTIONS, ...curriculum.TEXTBOOK_QUESTIONS]}
    expect(validateBank(bank).ok).toBe(true)
    expect(previewImport(exportBank(bank)).bank).toEqual(bank)
  })

  it('limits practice to a stage or lesson and accumulates across books without legacy questions', () => {
    const all = [...DEFAULT_QUESTIONS, ...curriculum.TEXTBOOK_QUESTIONS]
    expect(curriculum.filterCurriculum(all, {stage:'1A', lesson:1, scope:'lesson'}).map(q=>q.character)).toEqual(['一','二','三'])
    const stage = curriculum.filterCurriculum(all, {stage:'1B', lesson:7, scope:'stage'})
    expect(stage).toHaveLength(18)
    expect(stage.every(q=>q.book===1 && q.lesson>=7)).toBe(true)
    const cumulative = curriculum.filterCurriculum(all, {stage:'2A', lesson:1, scope:'cumulative'})
    expect(cumulative).toHaveLength(39)
    const session = createSession({questions:cumulative, limit:100})
    expect(new Set(session.questions.map(q=>q.character)).size).toBe(session.questions.length)
    expect(session.questions.some(q=>q.book===1)).toBe(true)
    expect(session.questions.some(q=>q.book===2)).toBe(true)
  })

  it('appends only missing curriculum identities and preserves teacher edits', () => {
    const edited = {...curriculum.TEXTBOOK_QUESTIONS[0], id:'teacher-copy', sentence:'老师改过的句子。'}
    const original = [DEFAULT_QUESTIONS[0], edited]
    const merged = curriculum.mergeTextbookQuestions(original)
    expect(original).toHaveLength(2)
    expect(merged).toHaveLength(109)
    expect(merged.find(q=>q.id==='teacher-copy')).toEqual(edited)
    expect(curriculum.mergeTextbookQuestions(merged)).toEqual(merged)
  })

  it('rejects fabricated curriculum assignments and duplicate lesson characters', () => {
    const sample = curriculum.TEXTBOOK_QUESTIONS[0]
    for (const overrides of [{book:4}, {lesson:13}, {textbook:'unknown'}, {character:'海'}, {book:undefined}]) {
      expect(validateBank({schemaVersion:1, questions:[{...sample, ...overrides}]}).ok).toBe(false)
    }
    expect(validateBank({schemaVersion:1, questions:[sample, {...sample, id:'duplicate', pinyin:'yí'}]}).ok).toBe(false)
    expect(validateBank({schemaVersion:1, questions:[DEFAULT_QUESTIONS[0]]}).ok).toBe(true)
  })

  it('provides usable examples and local stroke data for every curriculum character', () => {
    for (const q of curriculum.TEXTBOOK_QUESTIONS) {
      expect(q.words.every(word=>word.includes(q.character)), q.character).toBe(true)
      expect(q.sentence, q.character).toContain(q.character)
      const data = JSON.parse(readFileSync(`public/strokes/${q.character}.json`, 'utf8'))
      expect(data.strokes.length, q.character).toBeGreaterThan(0)
      expect(data.medians.length, q.character).toBe(data.strokes.length)
    }
  })

  it('handles imported ID collisions without overwriting either question', () => {
    const personal = {...DEFAULT_QUESTIONS[0], id:curriculum.TEXTBOOK_QUESTIONS[0].id}
    const merged = curriculum.mergeTextbookQuestions([personal])
    expect(merged[0]).toEqual(personal)
    expect(new Set(merged.map(q=>q.id)).size).toBe(merged.length)
    expect(validateBank({schemaVersion:1, questions:merged}).ok).toBe(true)
  })
})
