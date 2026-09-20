import { CHARACTER_EXAMPLES } from './curriculum-examples.js'

// Chinese Characters columns, publisher's public syllabi. See docs/curriculum-sources.md.
export const TEXTBOOK_ID = 'chinese-paradise-2023'
export const STAGES = ['1A', '1B', '2A', '2B', '3A', '3B']
export const BOOKS = [
  {book:1, isbn:'9787561964279', published:'2023-11', url:'https://www.blcup.com/PInfo/index/13083'},
  {book:2, isbn:'9787561965108', published:'2024-04', url:'https://www.blcup.com/PInfo/index/13228'},
  {book:3, isbn:'9787561966303', published:'2024-09', url:'https://www.blcup.com/PInfo/index/13458'},
]
const lessons = [
  [
    ['你好','一二三'], ['我叫明明','十工王'], ['一个苹果','人大天'], ['几本书','八九几'],
    ['我十一岁','口日目'], ['你有尺子吗','木本床'], ['摸摸你的眼睛','女子好'], ['她的个子高','个小不'],
    ['他是谁','巴把爸'], ['这是什么','马妈吗'], ['你们喝什么','你他们'], ['饺子很好吃','宁字学'],
  ],
  [
    ['我喜欢狗','牛羊马'], ['山上有树','山上下'], ['这是谁的毛衣','毛手耳'], ['这是什么颜色','米分粉'],
    ['现在几点','果课棵'], ['今天天气怎么样','今天气'], ['今天几月几号','日月明'], ['你去哪儿','火车去'],
    ['今天星期几','生星早'], ['妈妈在厨房','花草茶'], ['你会游泳吗','会今金'], ['我喜欢唱歌','打排拍'],
  ],
  [
    ['我爸爸是医生','厅灯打'], ['我想当音乐家','运动会'], ['我要买巧克力','工红巧'], ['一个本子多少钱','小少沙'],
    ['我星期三有中文课','件作体'], ['你觉得中文课怎么样','元园玩'], ['我的滑板在哪儿','相机板'], ['妈妈在做什么','记词话'],
    ['王老师是哪国人','可河哥'], ['你要去哪儿','见视现'], ['春节你打算做什么','床店庆'], ['生日快乐','送边还'],
  ],
]
export const COURSES = lessons.flatMap((rows, i) => rows.map(([title, characters], j) => ({
  book:i+1, lesson:j+1, unit:Math.floor(j/2)+1, stage:`${i+1}${j<6?'A':'B'}`, title, characters,
})))

export const TEXTBOOK_QUESTIONS = COURSES.flatMap(course => [...course.characters].map(character => {
  const [pinyin, first, second, sentence] = CHARACTER_EXAMPLES[character]
  return {
    id:`cp2023-${course.book}-${course.lesson}-${character}`,
    grade:course.book, character, pinyin, words:[first, second], sentence,
    textbook:TEXTBOOK_ID, book:course.book, lesson:course.lesson,
  }
}))

export function curriculumCourse(question) {
  if (question?.textbook !== TEXTBOOK_ID) return undefined
  return COURSES.find(c => c.book === question.book && c.lesson === question.lesson && c.characters.includes(question.character))
}

export function curriculumLabel(question) {
  const course = curriculumCourse(question)
  return course ? `${course.stage} · 第${course.lesson}课 ${course.title}` : '个人 / 通用题库'
}

export function filterCurriculum(questions, {stage, lesson, scope}) {
  if (!STAGES.includes(stage) || !['stage','lesson','cumulative'].includes(scope)) return []
  const book = Number(stage[0])
  const selected = COURSES.find(c => c.stage === stage && c.lesson === lesson)
  if (scope !== 'stage' && !selected) return []
  return questions.filter(q => {
    const course = curriculumCourse(q)
    if (!course) return false
    if (scope === 'stage') return course.stage === stage
    if (scope === 'lesson') return course.book === book && course.lesson === lesson
    return course.book < book || (course.book === book && course.lesson <= lesson)
  })
}

function identity(q) { return `${q.textbook}/${q.book}/${q.lesson}/${q.character}` }

export function mergeTextbookQuestions(questions) {
  const existing = new Set(questions.map(identity))
  const ids = new Set(questions.map(q => q.id))
  const additions = TEXTBOOK_QUESTIONS.filter(q => !existing.has(identity(q))).map(q => {
    let id = q.id
    while (ids.has(id)) id += '-added'
    ids.add(id)
    return {...q, id, words:[...q.words]}
  })
  return [...questions, ...additions]
}
