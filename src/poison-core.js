const text=value=>typeof value==='string'?value.normalize('NFC').trim():'';
function freeze(state){
  for(const key of ['words','results']){state[key].forEach(Object.freeze);Object.freeze(state[key]);}
  Object.freeze(state.poisonIds);Object.freeze(state.feedback);return Object.freeze(state);
}
function report(state,kind,message){return freeze({...state,feedback:{kind,message}});}
export function createPoisonState({words=[],poisonCount=1,round=1,random=Math.random,antidote=null}={}){
  if(!Array.isArray(words)||words.length<2||words.length>16||![1,2].includes(poisonCount)||words.length<=poisonCount)throw new TypeError('Choose 2–16 cards, 1–2 poisons and at least one safe word');
  const ids=new Set(),terms=new Set(),snapshot=words.map(item=>{
    const id=text(item?.id),word=text(item?.word);if(!id||ids.has(id)||!/^\p{Script=Han}{1,12}$/u.test(word)||terms.has(word))throw new TypeError('Distinct valid words and IDs are required');
    ids.add(id);terms.add(word);return {id,word,pinyin:text(item.pinyin)};
  });
  if(typeof random!=='function'||!Number.isInteger(round)||round<1)throw new TypeError('Invalid round or random source');
  for(let i=snapshot.length-1;i>0;i--){const value=Number(random()),j=Math.floor((Number.isFinite(value)?Math.max(0,Math.min(.999999999,value)):0)*(i+1));[snapshot[i],snapshot[j]]=[snapshot[j],snapshot[i]];}
  const rescue=antidote&&text(antidote.sentence)&&text(antidote.sentence).length<=160?Object.freeze({id:text(antidote.id),sentence:text(antidote.sentence),source:text(antidote.source)}):null;
  return freeze({phase:'cover',words:snapshot,poisonCount,poisonIds:[],results:[],pendingId:null,round,antidote:rescue,antidoteStatus:rescue?'available':'unavailable',feedback:{kind:'info',message:'请选一位小女巫，其他同学闭眼。'}});
}
export function beginPoisonHiding(state){return state.phase==='cover'?report({...state,phase:'hide'},'info',`小女巫秘密选择${state.poisonCount}个毒药词。`):state;}
export function togglePoisonWord(state,id){
  if(state.phase!=='hide'||!state.words.some(w=>w.id===id))return state;
  if(state.poisonIds.includes(id))return report({...state,poisonIds:state.poisonIds.filter(item=>item!==id)},'info','已取消这个选择。');
  if(state.poisonIds.length>=state.poisonCount)return report(state,'info',`只需${state.poisonCount}个毒药，先取消再更换。`);
  return report({...state,poisonIds:[...state.poisonIds,id]},'info',`已选${state.poisonIds.length+1} / ${state.poisonCount}个。`);
}
export function sealPoison(state){return state.phase==='hide'&&state.poisonIds.length===state.poisonCount?report({...state,phase:'ready'},'info','毒药已藏好，大家可以睁眼了。'):state;}
export function beginPoisonReading(state){return state.phase==='ready'?report({...state,phase:'read'},'info','请一位同学选词并大声读，读完再揭晓。'):state;}
export function selectPoisonCard(state,id){
  if(state.phase!=='read'||!state.words.some(w=>w.id===id)||state.results.some(r=>r.cardId===id))return state;
  return report({...state,pendingId:id},'info','先大声读出来；读错先纠正，再由老师揭晓。');
}
export function cancelPoisonCard(state){return state.phase==='read'?report({...state,pendingId:null},'info','可以重新选一个词，读完再揭晓。'):state;}
export function revealPoisonCard(state){
  if(state.phase!=='read'||!state.pendingId||state.results.some(r=>r.cardId===state.pendingId))return state;
  const cardId=state.pendingId,poison=state.poisonIds.includes(cardId),results=[...state.results,{cardId,poison}];
  return report({...state,results,pendingId:null,phase:poison||results.length===state.words.length?'complete':'read'},poison?'poison':'safe',poison?'哎呀，中毒啦！魔法变身，本轮结束。':'安全！换下一位同学继续读词。');
}
export function coverPoisonSecrets(state){return state?.phase==='hide'?report({...state,phase:'cover'},'info','请其他同学再次闭眼，再继续藏毒。'):state;}
export function beginPoisonAntidote(state){return state.phase==='complete'&&state.antidoteStatus==='available'?report({...state,antidoteStatus:'reading'},'info','请读出本课解药句子，再由老师确认解救。'):state;}
export function finishPoisonAntidote(state){return state.phase==='complete'&&state.antidoteStatus==='reading'?report({...state,antidoteStatus:'rescued'},'safe','解救成功！同学恢复啦，大家继续参加。'):state;}
export function nextPoisonRound(state){return state.phase==='complete'?createPoisonState({words:state.words,poisonCount:state.poisonCount,round:state.round+1,antidote:state.antidote}):state;}
