export const QUEST_STORAGE_KEY = 'hanzi-flip.poetry-quest.v1';
export const OBJECTS = ['wardrobe','desk','mirror','door','mailbox','book'];
const STAGES = ['wardrobe','desk','mirror','door','mailbox'];
const REQUIRES = {wardrobe:[],desk:['wardrobe'],mirror:[],door:['mirror'],mailbox:['wardrobe','desk','mirror','door']};
const ITEMS = {wardrobe:'needle',desk:'motherLetter',mirror:'route',door:'homeLetter'};

export function createQuest({mode='guided'}={}) {
  return {version:1,mode:mode==='challenge'?'challenge':'guided',solved:[],visited:[],hints:{},inventory:[],deliveries:{}};
}
export function inspectObject(state,id) {
  if (!OBJECTS.includes(id)||state.visited.includes(id)) return state;
  return {...state,visited:[...state.visited,id]};
}
export function requestHint(state,id) {
  if (!STAGES.includes(id)||state.hints[id]>=2) return state;
  return {...state,hints:{...state.hints,[id]:(state.hints[id]??0)+1}};
}
export function isUnlocked(state,id) {
  return id==='book'||Object.hasOwn(REQUIRES,id)&&REQUIRES[id].every(required=>state.solved.includes(required));
}
export function getProgress(state) {
  return {done:state.solved.length,total:5,complete:state.solved.includes('mailbox')};
}
function result(state,ok,message) {return {state,ok,message};}
export function solvePuzzle(state,id,answer) {
  if (!STAGES.includes(id)||id==='mailbox') return result(state,false,'先观察物件，再尝试解开它的线索。');
  if (state.solved.includes(id)) return result(state,true,'这段记忆已经找回，可以再读一遍。');
  if (!isUnlocked(state,id)) return result(state,false,id==='desk'?'先找回衣柜里的针线记忆。':'先去旧镜前，看看哪些东西变了。');
  if (!answer||typeof answer!=='object'||Array.isArray(answer)) return result(state,false,'还缺少一条线索，请继续观察。');
  const correct = {
    wardrobe:answer.left==='纟'&&answer.right==='逢'&&answer.reading==='féng',
    desk:answer.feeling==='worry'&&answer.evidence==='late',
    mirror:answer.unchanged==='accent'&&answer.changed==='hair',
    door:answer.self==='home'&&answer.children==='guest'&&(state.mode!=='challenge'||answer.evidence==='unknown'),
  }[id];
  if (!correct) return result(state,false,{
    wardrobe:'部件、字义和读音要一起对应。想一想，这里是在做什么？',
    desk:'再读一遍灯下的留言：她最放不下的是什么？哪句诗能说明？',
    mirror:'镜子照出外表，声音留下记忆。再找一找诗中的变化与不变。',
    door:'同一个人，在自己和孩子眼中可能有不同身份。请再核对文字依据。',
  }[id]);
  const next={...state,solved:[...state.solved,id],inventory:[...state.inventory,ITEMS[id]]};
  return result(next,true,{
    wardrobe:'细密的针脚重新连在一起。你找回了针线记忆。',
    desk:'家书展开了：原来，临行的牵挂藏在每一针里。',
    mirror:'旧路显现了：乡音仍在，岁月已写在鬓边。',
    door:'门开了。孩子眼中的陌生客，正是久别归来的人。',
  }[id]);
}
export function deliverLetter(state,letter,recipient) {
  if (!isUnlocked(state,'mailbox')) return result(state,false,'还有记忆没有找齐。先看看书桌与门口。');
  const expected={motherLetter:'mother',homeLetter:'home'};
  if (!Object.hasOwn(expected,letter)||expected[letter]!==recipient) return result(state,false,'信中的心意与收信处还没有对应。读一读信封上的字。');
  if (Object.hasOwn(state.deliveries,letter)) return result(state,true,'这封信已经送达。');
  const deliveries={...state.deliveries,[letter]:recipient};
  const complete=Object.keys(deliveries).length===2;
  return result({...state,deliveries,solved:complete?[...state.solved,'mailbox']:state.solved},true,
    complete?'两封信都已送达。旧屋里的灯亮了，归途也亮了。':'一封信已经送达，还有一封在等待。');
}
export function restoreQuest(text) {
  try {
    const s=JSON.parse(text);
    if (!s||s.version!==1||!['guided','challenge'].includes(s.mode)) return null;
    if (!Array.isArray(s.solved)||new Set(s.solved).size!==s.solved.length||s.solved.some(id=>!STAGES.includes(id))) return null;
    if (s.solved.some(id=>!REQUIRES[id].every(required=>s.solved.includes(required)))) return null;
    if (!Array.isArray(s.visited)||new Set(s.visited).size!==s.visited.length||s.visited.some(id=>!OBJECTS.includes(id))) return null;
    if (!s.hints||typeof s.hints!=='object'||Array.isArray(s.hints)||Object.entries(s.hints).some(([id,n])=>!STAGES.includes(id)||!Number.isInteger(n)||n<0||n>2)) return null;
    if (!s.deliveries||typeof s.deliveries!=='object'||Array.isArray(s.deliveries)) return null;
    const entries=Object.entries(s.deliveries);
    if (entries.some(([id,to])=>!['motherLetter','homeLetter'].includes(id)||to!==(id==='motherLetter'?'mother':'home'))) return null;
    if (entries.length&&!isUnlocked(s,'mailbox')) return null;
    if (s.solved.includes('mailbox')!==(entries.length===2)) return null;
    const inventory=s.solved.filter(id=>id!=='mailbox').map(id=>ITEMS[id]);
    if (!Array.isArray(s.inventory)||JSON.stringify(inventory)!==JSON.stringify(s.inventory)) return null;
    return {...createQuest({mode:s.mode}),solved:[...s.solved],visited:[...s.visited],hints:{...s.hints},inventory,deliveries:{...s.deliveries}};
  } catch {return null;}
}
