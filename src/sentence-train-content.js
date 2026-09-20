import { TEXTBOOK_QUESTIONS } from './curriculum.js'
import { DEFAULT_QUESTIONS } from './data.js'
import { PARADISE_QUESTIONS } from './paradise.js'
import { OTHER_TRAIN_SEGMENTATIONS } from './sentence-train-other-content.js'
import { PARADISE_TRAIN_SEGMENTATIONS } from './sentence-train-paradise-content.js'

function train(questionId, sentence, tokens, alternatives = []) {
  return {
    questionId,
    sentence,
    train: {
      tokens,
      punctuation: sentence.at(-1),
      alternatives,
    },
  }
}

// Teacher-aid examples linked to their exact built-in question and sentence.
// The segmentations are intentionally explicit: runtime code never guesses word boundaries.
const LEGACY_SENTENCE_TRAIN_CONTENT = [
  train('hypy-1A-1-好', '这个包子真好吃。', ['这个', '包子', '真', '好吃']),
  train('hypy-1A-1-老', '老师在看书。', ['老师', '在', '看书']),
  train('hypy-1A-2-欢', '欢迎你来我家。', ['欢迎', '你', '来', '我家']),
  train('hypy-1A-2-迎', '我们去迎接老师。', ['我们', '去', '迎接', '老师']),
  train('hypy-1A-3-一', '我有十一支笔。', ['我', '有', '十一支', '笔']),
  train('hypy-1A-3-二', '姐姐今年十二岁。', ['姐姐', '今年', '十二岁']),
  train('hypy-1A-4-多', '你今年多大？', ['你', '今年', '多大']),
  train('hypy-1A-4-十', '我今年十一岁。', ['我', '今年', '十一岁']),
  train('hypy-1A-5-鼻', '小猫的鼻子很小。', ['小猫', '的', '鼻子', '很小']),
  train('hypy-1A-5-耳', '小兔的耳朵很长。', ['小兔', '的', '耳朵', '很长']),
  train('hypy-1A-6-矮', '这两棵树高矮不同。', ['这', '两棵树', '高矮', '不同']),
  train('hypy-1A-6-长', '妈妈留着长发。', ['妈妈', '留着', '长发']),

  train('hypy-1B-7-爸', '爸爸在喝茶。', ['爸爸', '在', '喝茶']),
  train('hypy-1B-7-弟', '弟弟有一本书。', ['弟弟', '有', '一本书']),
  train('hypy-1B-8-床', '我早上七点起床。', ['我', '早上', '七点', '起床']),
  train('hypy-1B-8-电', '请把电灯打开。', ['请', '把', '电灯', '打开']),
  train('hypy-1B-9-安', '教室里很安静。', ['教室里', '很', '安静']),
  train('hypy-1B-9-静', '我静静地听故事。', ['我', '静静地', '听', '故事']),
  train('hypy-1B-10-本', '我的本子在书包里。', ['我的', '本子', '在', '书包里']),
  train('hypy-1B-10-笔', '我用铅笔写字。', ['我', '用', '铅笔', '写字']),
  train('hypy-1B-11-茶', '爸爸的茶杯在桌上。', ['爸爸', '的', '茶杯', '在', '桌上']),
  train('hypy-1B-11-果', '我喜欢喝果汁。', ['我', '喜欢', '喝', '果汁']),
  train('hypy-1B-12-包', '妈妈买了几个包子。', ['妈妈', '买了', '几个', '包子']),
  train('hypy-1B-12-吃', '我和家人一起吃饭。', ['我', '和', '家人', '一起', '吃饭']),

  train('hypy-2A-1-哪', '你想去哪儿玩？', ['你', '想', '去哪儿', '玩']),
  train('hypy-2A-1-国', '我想去中国旅行。', ['我', '想', '去', '中国', '旅行']),
  train('hypy-2A-2-北', '我想去北京看长城。', ['我', '想', '去', '北京', '看', '长城']),
  train('hypy-2A-2-京', '爸爸在北京工作。', ['爸爸', '在', '北京', '工作']),
  train('hypy-2A-3-现', '现在该吃午饭了。', ['现在', '该', '吃', '午饭', '了']),
  train('hypy-2A-3-几', '你今天几点起床？', ['你', '今天', '几点', '起床']),
  train('hypy-2A-4-今', '今天我们去公园玩。', ['今天', '我们', '去', '公园', '玩']),
  train('hypy-2A-4-天', '今天的天空很蓝。', ['今天', '的', '天空', '很', '蓝']),
  train('hypy-2A-5-学', '学校门口有一棵大树。', ['学校门口', '有', '一棵', '大树']),
  train('hypy-2A-5-校', '学校离我家很近。', ['学校', '离', '我家', '很近']),
  train('hypy-2A-6-厨', '爸爸在厨房切菜。', ['爸爸', '在', '厨房', '切菜']),
  train('hypy-2A-6-房', '厨房里飘来了饭菜的香味。', ['厨房里', '飘来了', '饭菜', '的', '香味']),

  train('hypy-2B-7-医', '医生耐心地回答了我的问题。', ['医生', '耐心地', '回答了', '我的', '问题']),
  train('hypy-2B-7-也', '我的姐姐也是学生。', ['我的', '姐姐', '也是', '学生']),
  train('hypy-2B-8-想', '我有一个新想法。', ['我', '有', '一个', '新想法']),
  train('hypy-2B-8-乐', '我喜欢听音乐。', ['我', '喜欢', '听', '音乐']),
  train('hypy-2B-9-喜', '我喜欢听小鸟唱歌。', ['我', '喜欢', '听', '小鸟', '唱歌']),
  train('hypy-2B-9-欢', '妹妹喜欢画小动物。', ['妹妹', '喜欢', '画', '小动物']),
  train('hypy-2B-10-山', '山上有一座小亭子。', ['山上', '有', '一座', '小亭子']),
  train('hypy-2B-10-上', '山上有一棵树。', ['山上', '有', '一棵', '树']),
  train('hypy-2B-11-颜', '这盒彩笔有很多颜色。', ['这盒', '彩笔', '有', '很多', '颜色']),
  train('hypy-2B-11-色', '你喜欢什么颜色的书包？', ['你', '喜欢', '什么', '颜色的', '书包']),
  train('hypy-2B-12-谁', '这是谁的外套？', ['这', '是', '谁的', '外套']),
  train('hypy-2B-12-的', '谁的手套落在椅子上了？', ['谁的', '手套', '落在', '椅子上', '了']),

  train('hypy-3A-1-天', '春天的花开了。', ['春天', '的', '花', '开了']),
  train('hypy-3A-1-夏', '夏天可以去游泳。', ['夏天', '可以', '去', '游泳']),
  train('hypy-3A-2-气', '今天的天气很好。', ['今天', '的', '天气', '很好']),
  train('hypy-3A-2-样', '你的新学校怎么样？', ['你的', '新学校', '怎么样']),
  train('hypy-3A-3-泳', '我和爸爸一起去游泳。', ['我', '和', '爸爸', '一起', '去', '游泳']),
  train('hypy-3A-3-冰', '姐姐正在学滑冰。', ['姐姐', '正在', '学', '滑冰']),
  train('hypy-3A-4-歌', '小朋友们一起唱歌儿。', ['小朋友们', '一起', '唱', '歌儿']),
  train('hypy-3A-4-舞', '她喜欢跟着音乐跳舞。', ['她', '喜欢', '跟着', '音乐', '跳舞']),
  train('hypy-3A-5-力', '桌上有一块巧克力。', ['桌上', '有', '一块', '巧克力']),
  train('hypy-3A-5-淋', '弟弟想吃冰淇淋。', ['弟弟', '想', '吃', '冰淇淋']),
  train('hypy-3A-6-果', '这个苹果又大又红。', ['这个', '苹果', '又大', '又红']),
  train('hypy-3A-6-梨', '篮子里有两个梨。', ['篮子里', '有', '两个', '梨']),

  train('hypy-3B-7-语', '我每天学习汉语。', ['我', '每天', '学习', '汉语']),
  train('hypy-3B-7-英', '姐姐会说英语。', ['姐姐', '会', '说', '英语']),
  train('hypy-3B-8-上', '爸爸正在上网查资料。', ['爸爸', '正在', '上网', '查', '资料']),
  train('hypy-3B-8-饭', '全家人一起吃饭。', ['全家人', '一起', '吃饭']),
  train('hypy-3B-9-店', '我到书店买书。', ['我', '到', '书店', '买书']),
  train('hypy-3B-9-走', '我们一起走回家。', ['我们', '一起', '走', '回家']),
  train('hypy-3B-10-机', '飞机飞上了蓝天。', ['飞机', '飞上了', '蓝天']),
  train('hypy-3B-10-船', '一艘轮船从远处开来。', ['一艘', '轮船', '从', '远处', '开来']),
  train('hypy-3B-11-日', '今天是姐姐的生日。', ['今天', '是', '姐姐', '的', '生日']),
  train('hypy-3B-11-乐', '祝你生日快乐。', ['祝', '你', '生日', '快乐']),
  train('hypy-3B-12-年', '我们一起迎接新年。', ['我们', '一起', '迎接', '新年']),
  train('hypy-3B-12-快', '新年快到了。', ['新年', '快', '到了']),
]

function appendCuratedRecords(records, questionIds, questions, segmentations) {
  for (const question of questions) {
    if (questionIds.has(question.id)) continue
    const definition = segmentations[question.sentence]
    if (!definition) continue
    records.push(train(
      question.id,
      question.sentence,
      [...definition.tokens],
      definition.alternatives.map((alternative) => [...alternative]),
    ))
    questionIds.add(question.id)
  }
}

const expandedContent = [...LEGACY_SENTENCE_TRAIN_CONTENT]
const questionIds = new Set(expandedContent.map(({ questionId }) => questionId))
appendCuratedRecords(expandedContent, questionIds, PARADISE_QUESTIONS, PARADISE_TRAIN_SEGMENTATIONS)
appendCuratedRecords(expandedContent, questionIds, TEXTBOOK_QUESTIONS, OTHER_TRAIN_SEGMENTATIONS)
appendCuratedRecords(expandedContent, questionIds, DEFAULT_QUESTIONS, OTHER_TRAIN_SEGMENTATIONS)

export const SENTENCE_TRAIN_CONTENT = expandedContent
