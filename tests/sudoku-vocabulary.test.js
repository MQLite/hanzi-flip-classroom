import {describe,expect,it} from 'vitest'
import {getSudokuCandidates} from '../src/sudoku-vocabulary.js'
import {pictureForWord} from '../src/sudoku-pictures.js'
import {SUDOKU_VOCABULARY_CONTENT} from '../src/sudoku-vocabulary-content.js'
import {PARADISE_COURSES,ZHONGWEN_COURSES,ZHONGWEN_ID,PARADISE_ID} from '../src/curriculum.js'
import {DEFAULT_QUESTIONS} from '../src/data.js'

describe('same-lesson Sudoku vocabulary',()=>{
  it('prefers the reviewed daily-use choices, including whole reading phrases and single-character words',()=>{
    const result=getSudokuCandidates({source:'zhongwen',stage:'2',lesson:9},[])
    expect(result.words.slice(0,9).map(word=>word.word)).toEqual(['医院','医生','着急','生病','吃药','听见','说话','放学','睡觉'])
    expect(result.words.every(word=>word.source.book===2&&word.source.lesson===9&&word.pinyin)).toBe(true)
    const numbers=getSudokuCandidates({source:'paradise',stage:'1A',lesson:3},[])
    expect(numbers.words.slice(0,9).map(word=>word.word)).toEqual([...'一二三四五六七八九'])
  })

  it('retains honest shortages after reading review rather than borrowing another lesson or helper examples',()=>{
    const result=getSudokuCandidates({source:'paradise',stage:'1A',lesson:1},[])
    expect(result.words.map(word=>word.word)).toEqual(['好','老师','你','你们','再见'])
    expect(result.note).toContain('不足9')
    expect(result.availableLessons.some(course=>course.lesson===3)).toBe(true)
    expect(result.words.some(word=>['老人','好吃','欢迎'].includes(word.word))).toBe(false)
  })

  it('includes verified reading supplements with exact source pages, without modifying the old course words',()=>{
    const before=JSON.stringify(PARADISE_COURSES)
    const result=getSudokuCandidates({source:'paradise',stage:'3A',lesson:4},[])
    expect(result.words.slice(0,9).map(word=>word.word)).toContain('蜻蜓')
    const item=result.words.find(word=>word.word==='蜻蜓')
    expect(item.source.pdfPage-item.source.printedPage).toBe(3)
    expect(item.source.section).toBeTruthy()
    expect(JSON.stringify(PARADISE_COURSES)).toBe(before)
  })

  it('covers all reviewed courses using only their own core and reading entries, preserving pinyin and source',()=>{
    expect(SUDOKU_VOCABULARY_CONTENT).toHaveLength(60)
    for(const entry of SUDOKU_VOCABULARY_CONTENT) {
      const source=entry.textbook===ZHONGWEN_ID?'zhongwen':'paradise'
      const stage=entry.stage??String(entry.book)
      const result=getSudokuCandidates({source,stage,lesson:entry.lesson},[])
      expect(result.words.slice(0,entry.preferredWords.length).map(word=>word.word),`${stage}/${entry.lesson}`).toEqual(entry.preferredWords)
      expect(new Set(result.words.map(word=>word.word)).size).toBe(result.words.length)
      const course=(source==='zhongwen'?ZHONGWEN_COURSES:PARADISE_COURSES).find(course=>course.stage===stage&&course.lesson===entry.lesson)
      const allowed=new Set([...course.vocabulary,...entry.readingVocabulary].map(word=>word.word.replace(/^《(.+)》$/u,'$1')))
      for(const word of result.words) {
        expect(allowed.has(word.word)).toBe(true)
        expect(word.pinyin).toBeTruthy()
        expect(word.source.textbook).toBe(entry.textbook)
        expect(word.source.book).toBe(entry.book)
        expect(word.source.lesson).toBe(entry.lesson)
        expect(word.source.pdfPage-word.source.printedPage).toBe(source==='zhongwen'?15:3)
      }
    }
  })

  it('labels personal character/pinyin choices and refuses unaudited modern-textbook helper words',()=>{
    const saved=JSON.stringify(DEFAULT_QUESTIONS)
    const personal=getSudokuCandidates({source:'personal',grade:1},DEFAULT_QUESTIONS)
    expect(personal.words.length).toBeGreaterThanOrEqual(9)
    expect(personal.label).toContain('个人字题')
    expect(personal.words.every(word=>[...word.word].length===1&&word.pinyin)).toBe(true)
    expect(JSON.stringify(DEFAULT_QUESTIONS)).toBe(saved)
    const modern=getSudokuCandidates({source:'textbook',stage:'1A',lesson:1},[])
    expect(modern.supported).toBe(false)
    expect(modern.words).toEqual([])
    expect(modern.note).toContain('完整词表')
  })
})

describe('optional meaningful pictures',()=>{
  it('uses count and calendar pictures for known quantities and literal icons for concrete words',()=>{
    expect(pictureForWord('三')).toMatchObject({count:3})
    expect(pictureForWord('九月')).toMatchObject({month:9})
    expect(pictureForWord('西瓜')).toMatchObject({glyph:'🍉'})
    expect(pictureForWord('可是')).toBeNull()
    expect(pictureForWord('这是没有核实配图的词')).toBeNull()
  })
})
