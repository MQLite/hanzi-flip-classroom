import { describe, expect, it } from 'vitest'
import { PARADISE_COURSES, PARADISE_ID, PARADISE_QUESTIONS, mergeAllTextbookQuestions } from '../src/curriculum.js'
import { createWorkshopState, remainingWorkshopWords } from '../src/workshop-core.js'
import { DEFAULT_QUESTIONS } from '../src/data.js'
import { validateBank, exportBank, previewImport } from '../src/storage.js'

const courseQuestions = lesson => PARADISE_QUESTIONS.filter(q => q.book === 1 && q.lesson === lesson)
const poolFor = questions => {
  const session = {questions}
  return remainingWorkshopWords(session, createWorkshopState(session))
}

describe('Hanyu Paradise 1A/1B textbook vocabulary update', () => {
  it('uses the complete actual lesson words rather than illustrative words from character cards', () => {
    expect(poolFor(courseQuestions(1))).toEqual(['老师', '你们', '再见'])
    expect(poolFor(courseQuestions(5))).toEqual(['鼻子', '耳朵', '头发', '我的', '眼睛'])
    expect(poolFor(courseQuestions(1))).not.toContain('老人')
  })

  it('retains the numbers as single-character reading instead of inventing multi-character workshop answers', () => {
    expect(courseQuestions(3).map(q => q.character)).toEqual(['一','二','三','四','五','六','七','八','九','十'])
    expect(poolFor(courseQuestions(3))).toEqual([])
  })

  it('includes the explicit review word 看 in lesson 9 with its actual body-page provenance', () => {
    const course = PARADISE_COURSES.find(c => c.stage === '1B' && c.lesson === 9)
    expect(course.vocabulary.find(v => v.word === '看')).toMatchObject({pinyin:'kàn',pdfPage:19,section:'正文图词（复习词）'})
    expect(courseQuestions(9).find(q => q.character === '看')).toMatchObject({id:'hypy-1B-9-看',pinyin:'kàn'})
  })

  it('adds a missing review-word question while preserving old lesson edits and personal data', () => {
    const edited = {...courseQuestions(9)[0],sentence:'老师改过的例句。'}
    const personal = {...DEFAULT_QUESTIONS[0],id:'personal-paradise-update',sentence:'这是我自己的日记。'}
    const before = [edited,personal]
    const questions = mergeAllTextbookQuestions(before)
    expect(questions.slice(0,2)).toEqual(before)
    expect(questions.find(q => q.id === 'hypy-1B-9-看')).toMatchObject({textbook:PARADISE_ID,book:1,lesson:9})
    expect(mergeAllTextbookQuestions(questions)).toEqual(questions)
    const bank={schemaVersion:1,questions}
    expect(validateBank(bank).ok).toBe(true)
    expect(previewImport(exportBank(bank)).bank).toEqual(bank)
  })
})
