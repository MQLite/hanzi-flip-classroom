import { describe, expect, it } from 'vitest'
import { PARADISE_COURSES, PARADISE_ID, PARADISE_QUESTIONS } from '../src/paradise.js'
import { PARADISE_TRAIN_CONTENT } from '../src/paradise-train-content.js'
import { getParadiseTrainQuestions, paradiseTrainLabel } from '../src/paradise-train.js'
import { resolveTrainQuestion, validateSentenceTrain } from '../src/sentence-train-data.js'
import { createTrainSession, toggleTrainTile, checkTrainAnswer } from '../src/sentence-train-core.js'

describe('Hanyu Paradise textbook sentence trains', () => {
  it('uses traceable dialogue, song and story excerpts instead of character-card examples', () => {
    expect(new Set(PARADISE_TRAIN_CONTENT.map(q => q.id)).size).toBe(PARADISE_TRAIN_CONTENT.length)
    for (const course of PARADISE_COURSES) {
      const records = PARADISE_TRAIN_CONTENT.filter(q => q.stage === course.stage && q.lesson === course.lesson)
      if (course.stage === '1A' && course.lesson === 3) {expect(records).toHaveLength(0); continue}
      expect(records.length, `${course.stage}/${course.lesson}`).toBeGreaterThanOrEqual(2)
      expect(new Set(records.map(q => q.sentence)).size).toBe(records.length)
      for (const record of records) {
        expect(record.book).toBe(course.book)
        expect(record.lessonTitle).toBe(course.title)
        expect(['对话', '歌曲', '故事']).toContain(record.section)
        expect(record.sourceTitle).toBeTruthy()
        expect(record.pdfPage - record.printedPage).toBe(3)
        expect(record.originalText.replace(/[^\p{Script=Han}]/gu, '')).toContain(record.sentence.slice(0, -1))
        if (record.originalText !== record.sentence) expect(record.notes).toBeTruthy()
        expect(validateSentenceTrain({tokens:record.tokens, punctuation:record.punctuation, alternatives:record.alternatives},record.sentence)).toEqual({ok:true,errors:[]})
      }
    }
    expect(new Set(PARADISE_TRAIN_CONTENT.map(q => q.section))).toEqual(new Set(['对话', '歌曲', '故事']))
  })

  it('selects original A/B books and lessons, cumulatively within the same series', () => {
    const selected = getParadiseTrainQuestions({stage:'1B',lesson:7,scope:'lesson'})
    expect(selected.length).toBeGreaterThanOrEqual(2)
    expect(selected.every(q => q.textbook===PARADISE_ID && q.book===1 && q.lesson===7)).toBe(true)
    expect(paradiseTrainLabel(selected[0])).toBe('汉语乐园 · 1B · 第7课 他是谁')
    for (const stage of ['1A','1B','2A','2B','3A','3B']) {
      const questions = getParadiseTrainQuestions({stage,lesson:stage.endsWith('A')?1:7,scope:'stage'})
      expect(questions.every(q=>q.trainSource.stage===stage)).toBe(true)
      expect(new Set(questions.map(q=>q.lesson)).size).toBe(stage==='1A'?5:6)
    }
    const cumulative = getParadiseTrainQuestions({stage:'2B',lesson:7,scope:'cumulative'})
    expect(cumulative.some(q=>q.book===1&&q.lesson===12)).toBe(true)
    expect(cumulative.every(q=>q.book<2||q.lesson<=7)).toBe(true)
    expect(getParadiseTrainQuestions({stage:'1A',lesson:3,scope:'lesson'})).toEqual([])
    expect(getParadiseTrainQuestions({stage:'4A',lesson:1,scope:'lesson'})).toEqual([])
  })

  it('plays every standard and alternative order with independent copies and source metadata', () => {
    const before = JSON.stringify(PARADISE_QUESTIONS)
    for (const record of PARADISE_TRAIN_CONTENT) {
      const question = getParadiseTrainQuestions({stage:record.stage,lesson:record.lesson,scope:'lesson'}).find(q=>q.id===record.id)
      for (const answer of [record.tokens,...record.alternatives]) {
        let session = createTrainSession({questions:[question]})
        const used = new Set()
        for (const text of answer) {
          const tile = session.palettes[0].find(tile=>tile.text===text&&!used.has(tile.id))
          used.add(tile.id)
          session = toggleTrainTile(session,tile.id)
        }
        session = checkTrainAnswer(session,{teamId:'team-1'})
        expect(session.judgments[0]?.outcome,record.id).toBe('correct')
        expect(session.questions[0].trainSource.pdfPage).toBe(record.pdfPage)
      }
    }
    const first = getParadiseTrainQuestions({stage:'1A',lesson:1,scope:'lesson'})[0]
    first.sentenceTrain.tokens[0] = '修改'
    expect(getParadiseTrainQuestions({stage:'1A',lesson:1,scope:'lesson'})[0].sentenceTrain.tokens[0]).not.toBe('修改')
    expect(PARADISE_QUESTIONS.map(resolveTrainQuestion).filter(Boolean)).toHaveLength(0)
    expect(JSON.stringify(PARADISE_QUESTIONS)).toBe(before)
  })
})
