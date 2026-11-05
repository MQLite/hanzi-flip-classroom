const spot = (x,y,z,pose='stand') => ({x,y,z,pose});
const stairs = [spot(-3.4,.22,1.48),spot(-3.4,.44,1.02),spot(-3.4,.66,.56),spot(-3.4,.88,.08)];
const middle = spot(0,0,.85);
const pantryDoor = spot(3.65,0,-.35);
const pantry = spot(3.65,0,-2.18);
const boxSide = spot(5.03,0,-2.05);
const start = spot(-3.4,0,2.5);
const catStart = spot(4.2,0,2.15);
const pantryPath=[spot(1.75,0,1.05),spot(3.65,0,.8)];
const catClue=spot(.8,0,1.1);
const catPantry=spot(4.2,0,-.35);
export const CAT_TRAIL=[catClue,...pantryPath,catPantry];
export const KEY_SPOT=spot(4.56,1.04,-2.47);
export const CHEST_CARD_SPOT=spot(4.56,.23,-2.145);
export const PAINTING_SPOT=spot(-5.49,1.85,-.85);
export const TRAY_SPOT=spot(-2.45,1.45,-1.49);
export const RUG_CENTER=middle;
export const EXIT_X=2.6;
const choice = (label,at,via=[],pin=at) => ({label,at,via,pin});
const left=choice('向左转，看墙上的画',spot(-4.57,.88,-.75),[],{...PAINTING_SPOT,y:1.08});
const right=choice('向右转，到小桌边拿托盘',spot(-2.45,.88,-.75),[],{...TRAY_SPOT,y:1.36});

export const CLUES = [
  {char:'上',pinyin:'shàng',prompt:'台阶上有一幅画和一张小桌。该往哪里走？',answer:'他走上台阶，来到挂画和小桌前。',correct:0,
    choices:[choice('木台顶端',spot(-3.4,.88,-.75),stairs),choice('地面的脚印',spot(-1.75,0,2.5))]},
  {char:'左',pinyin:'zuǒ',prompt:'向左转，看看墙上挂着什么。',answer:'他向左转，看见一幅地毯画。画框打开了，后面藏着一把刷子。',correct:1,collect:'brush',
    choices:[right,left]},
  {char:'右',pinyin:'yòu',prompt:'向右转，找一个可以接住灰尘的东西。',answer:'他向右转，从小桌上拿起托盘，等会儿可以用它接住灰尘。',correct:0,collect:'tray',
    choices:[right,left]},
  {char:'下',pinyin:'xià',prompt:'画里的地毯在台阶下面。要怎样走过去？',answer:'他走下台阶，去找画里那块圆地毯。',correct:1,
    choices:[choice('木台上的脚印',spot(-3.6,.88,-1.65)),choice('地面的脚印',start,[spot(-3.4,.88,-.75),...stairs.slice().reverse()])]},
  {char:'中',pinyin:'zhōng',prompt:'圆地毯的正中在哪里？',answer:'他走到地毯正中，发现坐垫旁有一张蒙灰的卡片。',correct:1,
    choices:[choice('地毯左边',spot(-1.08,0,.85)),choice('地毯正中',middle),choice('地毯右边',spot(1.08,0,.85))]},
  {char:'坐',pinyin:'zuò',prompt:'坐下仔细看看地毯。',answer:'他坐下来，捡起蒙灰的卡片，放在托盘里。',correct:1,
    choices:[choice('继续站着',null),choice('坐下来看看',null)],pose:'sit',rugClue:'inspected'},
  {char:'立',pinyin:'lì',prompt:'站起来，拍拍卡片上的灰。',answer:'他站起来，用刷子轻拍灰尘，卡片上露出猫爪印。把这张卡片带上。',correct:0,
    choices:[choice('站起来拍拍灰',null),choice('留在垫子上',null)],pose:'stand',rugClue:'revealed'},
  {char:'来',pinyin:'lái',prompt:'卡片上有猫爪印。小朋友把猫咪叫过来。',answer:'猫咪跑到小朋友身边，闻了闻卡片。',correct:1,actor:'cat',
    choices:[choice('朝窗边',spot(1.5,0,-2.8)),choice('朝小朋友',catClue)]},
  {char:'去',pinyin:'qù',prompt:'猫咪认出了气味。它要往哪里跑？',answer:'猫咪跑到小门旁，一路留下了爪印。',correct:0,actor:'cat',
    choices:[choice('朝小门',catPantry,pantryPath),choice('留在小朋友旁',catClue)]},
  {char:'走',pinyin:'zǒu',prompt:'猫咪停在小门旁。小朋友怎样跟上它？',answer:'小朋友沿着猫爪印走到小门前。',correct:0,
    choices:[choice('沿爪印到小门',pantryDoor,pantryPath),choice('留在地毯旁',middle)]},
  {char:'入',pinyin:'rù',prompt:'小门开着，里面有一个印着猫爪的木箱。',answer:'他进门，找到和卡片上图案一样的木箱。把猫爪卡放进木箱的卡槽。',correct:0,
    choices:[choice('穿过小门到木箱旁',pantry),choice('留在小门外',pantryDoor)],catTo:boxSide},
  {char:'出',pinyin:'chū',prompt:'钥匙拿到了。哪条路能离开房间？',answer:'他用钥匙打开出口，和猫咪来到花园。夜空亮起了烟花！',correct:1,
    choices:[choice('回到圆地毯',middle),choice('穿过有锁的出口',spot(EXIT_X,0,4.85),[pantryDoor,spot(2.85,0,2.15),spot(EXIT_X,0,3.28)])]},
];

export function createEscape(){
  return {index:0,phase:'clue',key:'hidden',doorOpen:false,player:start,cat:catStart,feedback:'',travel:[],tools:[],rugClue:'covered'};
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
  if(clue.collect)next.tools=[...state.tools,clue.collect];
  if(clue.rugClue)next.rugClue=clue.rugClue;
  if(clue.catTo){next.cat=clue.catTo;next.phase='match';}
  if(last){next.cat=spot(EXIT_X+.67,0,4.75);return tryExit(next);}
  return next;
}

export function continueEscape(state){
  if(state.phase!=='solved'||state.index>=CLUES.length-1)return state;
  return {...state,index:state.index+1,phase:'clue',feedback:'',travel:[]};
}

export function useClueCard(state){
  if(state.phase!=='match'||state.rugClue!=='revealed')return state;
  return {...state,phase:'key',key:'found',feedback:'猫爪卡放进了卡槽，木箱打开，露出了钥匙！'};
}

export function takeKey(state){
  if(state.phase!=='key'||state.key!=='found')return state;
  return {...state,index:state.index+1,phase:'clue',key:'held',feedback:'钥匙已拿到。找到出口，读出最后一条线索。',travel:[]};
}
