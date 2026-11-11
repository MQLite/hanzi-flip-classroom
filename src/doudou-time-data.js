const wantToGo = ['要去', 'yào qù', 'going to'];
const together = ['一起', 'yìqǐ', 'together'];
const decline = ['不了，', 'Bù le,', 'I’ll pass'];
const robot = ['机器人，', 'jīqìrén,', 'robot'];
const charge = ['充电，', 'chōngdiàn,', 'charge the battery'];
const question = [['现在', 'Xiànzài'], ['几点？', 'jǐ diǎn?']];

const periods = [
  {
    id: 'morning', label: ['早上', 'Zǎoshang'], greeting: ['早上好，', 'Zǎoshang hǎo,'],
    reply: ['早上好！', 'Zǎoshang hǎo!'],
    clock: [8, 0], time: ['八点。', 'bā diǎn.'],
    meal: ['早饭', 'zǎofàn', 'breakfast'], food: ['面条。', 'miàntiáo.'],
  },
  {
    id: 'noon', label: ['中午', 'Zhōngwǔ'], greeting: ['中午好，', 'Zhōngwǔ hǎo,'],
    clock: [12, 0], time: ['十二点。', 'shí’èr diǎn.'],
    meal: ['午饭', 'wǔfàn', 'lunch'], food: ['米饭。', 'mǐfàn.'],
  },
  {
    id: 'evening', label: ['晚上', 'Wǎnshang'], greeting: ['晚上好，', 'Wǎnshang hǎo,'],
    clock: [7, 30], time: ['七点半。', 'qī diǎn bàn.'],
    meal: ['晚饭', 'wǎnfàn', 'dinner'], food: ['饺子。', 'jiǎozi.'],
  },
];

function line(speaker, tokens, action) {
  return {speaker, tokens, action};
}

function makeDialogue(period) {
  const {greeting, reply, time, meal, food} = period;
  const conversation = reply ? [
    line('xiaoming', [greeting, ['豆豆！', 'Dòudou!']]),
    line('doudou', [reply]),
    line('xiaoming', question, 'ask'),
  ] : [
    line('xiaoming', [greeting, ['豆豆！', 'Dòudou!'], ...question], 'ask'),
  ];

  conversation.push(
    line('doudou', [['现在', 'Xiànzài'], time], 'answer'),
    line('xiaoming', [['谢谢！', 'Xièxie!'], ['我', 'Wǒ'], wantToGo, ['吃', 'chī'], meal, ['了。', 'le.']]),
    line('doudou', [['你', 'Nǐ'], meal, ['吃', 'chī'], ['什么？', 'shénme?']]),
    line('xiaoming', [['我', 'Wǒ'], ['吃', 'chī'], food], 'food'),
    line('xiaoming', [['你要', 'Nǐ yào'], together, ['吃吗？', 'chī ma?']]),
    line('doudou', [decline, ['谢谢！', 'xièxie!'], ['我是', 'Wǒ shì'], robot, ['不吃', 'bù chī'], [meal[0] + '。', meal[1] + '.', meal[2]]]),
  );

  if (period.id === 'evening') {
    conversation.push(line('doudou', [['请', 'Qǐng'], ['给我', 'gěi wǒ'], charge, ['谢谢！', 'xièxie!']], 'charge'));
  }
  return conversation;
}

export const TIME_SCENES = periods.map(period => ({...period, lines:makeDialogue(period)}));
export const LOVE_LINE = line('doudou', [['爱你！', 'Ài nǐ!']]);
