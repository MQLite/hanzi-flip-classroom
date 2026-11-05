const spot = (x,y,z,pose='stand') => ({x,y,z,pose});
const stairs = [spot(-3.4,.22,1.48),spot(-3.4,.44,1.02),spot(-3.4,.66,.56),spot(-3.4,.88,.08)];
const middle = spot(0,0,.85);
const pantryDoor = spot(3.65,0,-.35);
const pantry = spot(3.65,0,-2.18);
const boxSide = spot(4.48,0,-2.18);
const start = spot(-3.4,0,2.5);
const catStart = spot(4.2,0,2.15);
export const EXIT_X=2.6;
const choice = (label,at,via=[]) => ({label,at,via});

export const CLUES = [
  {char:'上',pinyin:'shàng',prompt:'看木台阶。他该往哪里走？',answer:'他走上了台阶。',correct:0,
    choices:[choice('木台顶端',spot(-3.4,.88,-.75),stairs),choice('地面的脚印',spot(-1.75,0,2.5))]},
  {char:'左',pinyin:'zuǒ',prompt:'以屏幕为准，选一个脚印。',answer:'他往画面左边走。',correct:1,directions:['脚印在小朋友右边','脚印在小朋友左边'],
    choices:[choice('脚印 A',spot(-2.45,.88,-.75)),choice('脚印 B',spot(-4.38,.88,-.75))]},
  {char:'右',pinyin:'yòu',prompt:'这次该往哪一边？',answer:'他往画面右边走。',correct:0,directions:['脚印在小朋友右边','脚印在小朋友左边'],
    choices:[choice('脚印 A',spot(-2.45,.88,-.75)),choice('脚印 B',spot(-4.73,.88,-.75))]},
  {char:'下',pinyin:'xià',prompt:'看台阶。他接下来要去哪儿？',answer:'他走下台阶，回到地面。',correct:1,
    choices:[choice('木台上的脚印',spot(-3.6,.88,-1.65)),choice('地面的脚印',start,[spot(-3.4,.88,-.75),...stairs.slice().reverse()])]},
  {char:'中',pinyin:'zhōng',prompt:'找一找房间的中心。',answer:'他走到房间中间。',correct:1,
    choices:[choice('窗旁',spot(1.5,0,-2.8)),choice('圆地毯',middle)]},
  {char:'坐',pinyin:'zuò',prompt:'小朋友到了地毯边。他该做什么？',answer:'他在地毯中间坐下。',correct:1,
    choices:[choice('双脚撑直',null),choice('弯腿落在垫子上',null)],pose:'sit'},
  {char:'立',pinyin:'lì',prompt:'他现在坐着。下一步做什么？',answer:'他从地毯上站起来。',correct:0,
    choices:[choice('起身站稳',null),choice('留在垫子上',null)],pose:'stand'},
  {char:'来',pinyin:'lái',prompt:'小朋友在说话。猫咪要往哪里跑？',answer:'猫咪朝说话的小朋友跑过来。',correct:1,actor:'cat',
    choices:[choice('朝窗边',spot(1.5,0,-2.8)),choice('朝小朋友',spot(.8,0,1.1))]},
  {char:'去',pinyin:'qù',prompt:'小朋友还在原地。猫咪要往哪里跑？',answer:'猫咪离开小朋友，跑到小门旁。',correct:0,actor:'cat',
    choices:[choice('朝小门',spot(4.2,0,-.35)),choice('留在小朋友旁',spot(.8,0,1.1))]},
  {char:'走',pinyin:'zǒu',prompt:'猫咪停在小门旁。小朋友怎样跟上它？',answer:'小朋友沿地上的脚印走到小门前。',correct:0,
    choices:[choice('沿脚印到小门',pantryDoor,[spot(1.75,0,1.05),spot(3.65,0,.8)]),choice('留在地毯旁',middle)]},
  {char:'入',pinyin:'rù',prompt:'小门开着。选一个门的方向。',answer:'他跨过小门，进入储物间。猫咪发现了钥匙！',correct:0,
    choices:[choice('穿过小门到木箱旁',pantry),choice('留在小门外',pantryDoor)],catTo:boxSide},
  {char:'出',pinyin:'chū',prompt:'钥匙拿到了。哪条路能离开房间？',answer:'他用钥匙打开出口，和猫咪一起走出房间。',correct:1,
    choices:[choice('回到圆地毯',middle),choice('穿过有锁的出口',spot(EXIT_X,0,4.85),[pantryDoor,spot(2.85,0,2.15),spot(EXIT_X,0,3.28)])]},
];

export function createEscape(){
  return {index:0,phase:'clue',key:'hidden',doorOpen:false,player:start,cat:catStart,feedback:'',travel:[]};
}

export function tryExit(state){
  if(state.key!=='held'||state.index!==CLUES.length-1||state.phase!=='solved')return state;
  return {...state,phase:'escaped',doorOpen:true};
}

export function resolveChoice(state,selected){
  if(state.phase!=='clue'||!Number.isInteger(selected))return state;
  const clue=CLUES[state.index];
  const option=clue.choices[selected];
  if(!option)return state;
  if(selected!==clue.correct)return {...state,feedback:'再想一想。读出这个字，再选一次。'};
  const last=state.index===CLUES.length-1;
  if(last&&state.key!=='held')return state;
  const actor=clue.actor??'player';
  const next={...state,phase:'solved',feedback:clue.answer,travel:[]};
  if(option.at){
    next[actor]=option.at;
    next.travel=[...option.via,option.at];
  }
  if(clue.pose)next.player={...state.player,pose:clue.pose};
  if(clue.catTo){next.cat=clue.catTo;next.key='found';next.phase='key';}
  if(last){next.cat=spot(EXIT_X+.67,0,4.75);return tryExit(next);}
  return next;
}

export function continueEscape(state){
  if(state.phase!=='solved'||state.index>=CLUES.length-1)return state;
  return {...state,index:state.index+1,phase:'clue',feedback:'',travel:[]};
}

export function takeKey(state){
  if(state.phase!=='key'||state.key!=='found')return state;
  return {...state,index:state.index+1,phase:'clue',key:'held',feedback:'钥匙已拿到。找到出口，读出最后一条线索。',travel:[]};
}
