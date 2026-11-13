export const CITY_TOUR_STAGES = [
  {id: 'memory', name: '豆豆的记忆', pinyin: 'Dòudou de jìyì', english: 'Doudou’s Lost Memory'},
  {id: 'mountain', name: '登泰山', pinyin: 'Dēng Tàishān', english: 'Climb Mount Tai'},
  {id: 'river', name: '游长江', pinyin: 'Yóu Chángjiāng', english: 'Sail the Yangtze'},
  {id: 'beijing', name: '北京城里逛一逛', pinyin: 'Běijīng chéngli guàng yi guàng', english: 'Explore Beijing'},
];

export const READING_ROUTES = {
  mountain: {
    landmarks: ['山脚', '南天门'],
    words: [
      ['从','cóng'], ['北京','Běijīng'], ['来','lái'], ['上海','Shànghǎi'], ['义乌','Yìwū'], ['悉尼','Xīní'],
      ['蒙特利尔','Méngtèlì’ěr'], ['纽约','Niǔyuē'], ['温哥华','Wēngēhuá'], ['巴黎','Bālí'], ['登','dēng'], ['泰山','Tàishān'],
    ],
    points: [[19,96],[26,91],[32,86],[38,81],[44,76],[49,72],[54,68],[59,63],[63,58],[68,51],[74,44],[79,36],[85,29]],
    instruction: '读完石阶上的字词，点词牌往上走。',
    arrival: '登顶啦！',
    next: '去游长江',
    nextStage: 'river',
  },
  river: {
    landmarks: ['西 · 长江源头', '东 · 东海'],
    words: [
      ['游','yóu'], ['长江','Chángjiāng'], ['哪','nǎ'], ['国','guó'], ['人','rén'], ['中国','Zhōngguó'],
      ['美国','Měiguó'], ['澳大利亚','Àodàlìyà'], ['加拿大','Jiānádà'], ['英国','Yīngguó'],
      ['法国','Fǎguó'], ['汤加','Tāngjiā'], ['哥伦比亚','Gēlúnbǐyà'],
    ],
    points: [[5,39],[8,42],[11,47],[13,55],[17,61],[23,64],[30,58],[37,53],[44,52],[51,57],[62,50],[73,54],[84,53],[96,48]],
    instruction: '读完江边的字词，点词牌让小船往东走。',
    arrival: '到东海啦！',
    next: '去北京城',
    nextStage: 'beijing',
  },
};

export const BEIJING_STOPS = [
  {
    name: ['颐和园', 'Yíhéyuán', 'Summer Palace'],
    point: [16,31],
    words: [['看', 'kàn', 'look / see'], ['看中国', 'kàn Zhōngguó', 'see China']],
    sentence: [['我们', 'Wǒmen'], ['到', 'dào'], ['颐和园', 'Yíhéyuán'], ['看中国。', 'kàn Zhōngguó.']],
    english: 'Let’s go to the Summer Palace to see China.',
  },
  {
    name: ['故宫', 'Gùgōng', 'Forbidden City'],
    point: [51,59],
    words: [['在', 'zài', 'be in / at'], ['东方', 'dōngfāng', 'the East'], ['在东方', 'zài dōngfāng', 'in the East']],
    sentence: [['故宫', 'Gùgōng'], ['在中国，', 'zài Zhōngguó,'], ['中国', 'Zhōngguó'], ['在东方。', 'zài dōngfāng.']],
    english: 'The Forbidden City is in China. China is in the East.',
  },
  {
    name: ['长城', 'Chángchéng', 'Great Wall'],
    point: [82,26],
    words: [['万里', 'wàn lǐ', 'ten thousand li'], ['长', 'cháng', 'long']],
    sentence: [['万里', 'Wàn lǐ'], ['长城', 'Chángchéng'], ['万里长。', 'wàn lǐ cháng.']],
    english: 'The Great Wall is ten thousand li long.',
  },
  {
    name: ['博物馆', 'bówùguǎn', 'museum'],
    point: [87,78],
    words: [['城里', 'chéngli', 'in the city'], ['逛一逛', 'guàng yi guàng', 'look around']],
    sentence: [['我们', 'Wǒmen'], ['在', 'zài'], ['博物馆', 'bówùguǎn'], ['逛一逛。', 'guàng yi guàng.']],
    english: 'Let’s look around the museum.',
  },
];
