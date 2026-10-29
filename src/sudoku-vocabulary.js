import {PARADISE_ID,PARADISE_COURSES,ZHONGWEN_ID,ZHONGWEN_NAME,ZHONGWEN_COURSES,ZHONGWEN_BOOK_LABELS} from './curriculum.js'
import {SUDOKU_VOCABULARY_CONTENT} from './sudoku-vocabulary-content.js'
import {pictureForWord} from './sudoku-pictures.js'

const reviewed=new Map(SUDOKU_VOCABULARY_CONTENT.map(record=>[`${record.textbook}/${record.book}/${record.lesson}`,record]))
const clean=word=>typeof word==='string'?word.normalize('NFC').trim().replace(/^《(.+)》$/u,'$1'):''
const validWord=word=>/^\p{Script=Han}{1,12}$/u.test(word)

function lessonWords(course,textbook) {
  const key=`${textbook}/${course.book}/${course.lesson}`,extra=reviewed.get(key)
  const reading=course.vocabulary.filter(item=>item.section?.includes('读一读'))
  const entries=[...reading,...(extra?.readingVocabulary??[]),...course.vocabulary]
  const unique=new Map()
  for(const item of entries) {
    const word=clean(item.word),pinyin=typeof item.pinyin==='string'?item.pinyin.normalize('NFC').trim():''
    if(!validWord(word)||!pinyin||unique.has(word))continue
    unique.set(word,{id:`${key}/${word}`,word,pinyin,picture:pictureForWord(word),
      source:{textbook,book:course.book,lesson:course.lesson,section:item.section??'核心词语',pdfPage:item.pdfPage,
        printedPage:item.printedPage??item.pdfPage-(textbook===PARADISE_ID?3:15)}})
  }
  const preferred=(extra?.preferredWords??[]).map(clean)
  return [...preferred.flatMap(word=>unique.has(word)?[unique.get(word)]:[]),...[...unique.values()].filter(item=>!preferred.includes(item.word))]
}

export function getSudokuCandidates({source,stage,lesson,grade=1}={},bankQuestions=[]) {
  if(source==='personal') {
    const words=[],seen=new Set()
    for(const question of bankQuestions)if(!question.textbook&&question.grade===grade) {
      const word=clean(question.character),pinyin=typeof question.pinyin==='string'?question.pinyin.trim():''
      if(!validWord(word)||!pinyin||seen.has(word))continue
      seen.add(word)
      words.push({id:`personal/${grade}/${word}`,word,pinyin,picture:pictureForWord(word),source:{section:'个人字题',grade}})
    }
    return {words,label:`个人字题 · ${grade}年级`,note:words.length<9?`本年级仅${words.length}个不同字题，不足9；请换年级或在题库管理中补充。`:'使用个人题库的汉字与本题拼音，不改写已保存题目。',supported:true,availableLessons:[]}
  }
  if(source!=='paradise'&&source!=='zhongwen')return {words:[],label:'中文乐园（新版）',note:'这套教材尚未核对完整词表，数独不采用辅助例词。请选择《中文（暨南大学版）》《汉语乐园》或个人字题。',supported:false,availableLessons:[]}
  const textbook=source==='paradise'?PARADISE_ID:ZHONGWEN_ID
  const courses=source==='paradise'?PARADISE_COURSES:ZHONGWEN_COURSES
  const course=courses.find(course=>course.stage===stage&&course.lesson===lesson)
  if(!course)return {words:[],label:'请选择本课',note:'请先选择有效的册数和课次。',supported:false,availableLessons:[]}
  const words=lessonWords(course,textbook),extra=reviewed.get(`${textbook}/${course.book}/${course.lesson}`)
  const label=source==='paradise'?`汉语乐园 · ${stage} · 第${lesson}课 ${course.title}`:`${ZHONGWEN_NAME} · ${ZHONGWEN_BOOK_LABELS[stage]} · 第${lesson}课 ${course.title}`
  const availableLessons=courses.filter(candidate=>candidate.stage===stage).flatMap(candidate=>{
    const count=lessonWords(candidate,textbook).length
    return count>=9?[{lesson:candidate.lesson,title:candidate.title,count}]:[]
  })
  const note=words.length<9?`已核对本课认读内容，只有${words.length}个可用词，不足9；请选择其他课，不借用别课词语。`:
    extra?.note??'优先使用本课读一读中的生活高频词，可在开局前调整9词。'
  return {words,label,note,course,supported:true,availableLessons}
}
