// Literal teaching icons only. Unknown/abstract words intentionally have no image.
// Shared meanings share a key so the board can suppress ambiguous picture clues.
const groups=[
  ['sun','☀️',['太阳']],['moon','🌙',['月亮']],['star','⭐',['星星']],
  ['rain','🌧️',['雨','下雨','大雨','小雨']],['snow','🌨️',['雪','下雪','雪花']],['cloud','☁️',['云','白云']],['wind','💨',['风','大风','刮风']],
  ['mountain','⛰️',['山','大山','小山']],['water','💧',['水','水滴','滴水']],['fire','🔥',['火']],['wood','🪵',['木头']],['stone','🪨',['石头']],
  ['tree','🌳',['树','大树']],['leaf','🍃',['树叶']],['flower','🌼',['花','花儿']],['grass','🌱',['草']],
  ['horse','🐴',['马','小马']],['cow','🐄',['牛']],['goat','🐐',['山羊']],['sheep','🐑',['羊','绵羊']],
  ['bird','🐦',['鸟','小鸟']],['fish','🐟',['鱼','小鱼']],['cat','🐱',['猫','小猫']],['dog','🐶',['狗','小狗']],
  ['rabbit','🐇',['兔子','小白兔']],['bug','🐛',['虫','小虫']],['frog','🐸',['青蛙']],['mouse','🐭',['老鼠']],['squirrel','🐿️',['松鼠']],
  ['eye','👀',['眼睛']],['nose','👃',['鼻子']],['ear','👂',['耳朵']],['mouth','👄',['嘴']],['hand','✋',['手']],
  ['bed','🛏️',['床']],['chair','🪑',['椅子']],['sofa','🛋️',['沙发']],['television','📺',['电视']],['lamp','💡',['灯','开灯']],
  ['book','📘',['书']],['notebook','📓',['本子','笔记本']],['pencil','✏️',['笔','铅笔']],['ruler','📏',['尺子']],['bag','🎒',['书包']],
  ['clock','⏰',['闹钟']],['watch','⌚',['手表']],['cup','🥤',['杯子']],['hat','🎩',['帽子']],
  ['apple','🍎',['苹果']],['pear','🍐',['梨']],['banana','🍌',['香蕉']],['watermelon','🍉',['西瓜']],['pineapple','🍍',['菠萝']],
  ['rice','🍚',['米饭']],['noodles','🍜',['面条']],['dumpling','🥟',['饺子']],['egg','🥚',['鸡蛋']],['cake','🎂',['蛋糕']],['vegetable','🥬',['青菜']],
  ['cookie','🍪',['饼干']],['chocolate','🍫',['巧克力']],['icecream','🍦',['冰淇淋']],['hamburger','🍔',['汉堡包']],['sandwich','🥪',['三明治']],['candy','🍬',['糖']],
  ['milk','🥛',['牛奶']],['tea','🍵',['茶']],['coffee','☕',['咖啡']],
  ['car','🚗',['汽车','车']],['train','🚆',['火车']],['airplane','✈️',['飞机']],['ship','🚢',['轮船']],['bicycle','🚲',['自行车']],['bus','🚌',['校车']],
  ['school','🏫',['学校']],['hospital','🏥',['医院']],['home','🏠',['家','我的家','在家']],['gift','🎁',['礼物']],
  ['shower','🚿',['洗澡']],['sleep','🛌',['睡觉']],['newspaper','📰',['看报纸']],['read','📖',['看书']],['write','📝',['写作业']],
  ['music','🎧',['听音乐']],['film','🎬',['看电影']],['game','🎮',['玩儿电子游戏']],['paint','🎨',['画画儿','画画']],['sing','🎤',['唱歌儿','唱歌']],['dance','💃',['跳舞']],
  ['swim','🏊',['游泳']],['skate','⛸️',['滑冰']],['basketball','🏀',['篮球']],['baseball','⚾',['棒球']],['tennis','🎾',['网球']],['pingpong','🏓',['乒乓球']],
  ['traffic','🚦',['红绿灯']],['stop','🛑',['停车']],['map','🗺️',['地图']],['key','🔑',['钥匙']],
]
const pictures=new Map(groups.flatMap(([key,glyph,words])=>words.map(word=>[word,{key,glyph,label:word}])))
const numbers=new Map([...'一二三四五六七八九十'].map((word,index)=>[word,index+1]))
numbers.set('两',2)
const months=new Map([...numbers].filter(([word])=>word!=='两').map(([word,value])=>[`${word}月`,value]))
months.set('十一月',11);months.set('十二月',12)

export function pictureForWord(word) {
  if(numbers.has(word))return {key:`count-${numbers.get(word)}`,count:numbers.get(word),label:word}
  if(months.has(word))return {key:`month-${months.get(word)}`,month:months.get(word),label:word}
  const picture=pictures.get(word)
  return picture?{...picture}:null
}
