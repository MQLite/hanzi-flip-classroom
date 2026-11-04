function freeze(state){
  for(const key of ['words','holes','teams','hits']){state[key].forEach(value=>value&&Object.freeze(value));Object.freeze(state[key]);}
  Object.freeze(state.scores);return Object.freeze(state);
}
export function createMoleState({words=[],teamNames=['向日葵组','小树苗组'],random=Math.random}={}){
  const seen=new Set();
  const snapshot=words.flatMap(w=>{
    if(!w?.id||!w.word||seen.has(w.word))return [];
    seen.add(w.word);return [{id:w.id,word:w.word,pinyin:w.pinyin??''}];
  });
  for(let i=snapshot.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[snapshot[i],snapshot[j]]=[snapshot[j],snapshot[i]];}
  const teams=teamNames.map((name,i)=>({id:`team-${i+1}`,name}));
  return freeze({words:snapshot,teams,holes:Array.from({length:9},(_,slot)=>snapshot[slot]?{id:snapshot[slot].id,status:'up'}:null),nextIndex:Math.min(9,snapshot.length),hits:[],scores:Object.fromEntries(teams.map(t=>[t.id,0])),phase:snapshot.length?'active':'empty'});
}
export function hitMole(state,{slot,wordId,teamId}={}){
  if(state.phase!=='active'||!Number.isInteger(slot)||!state.teams.some(t=>t.id===teamId))return state;
  const target=state.holes[slot];if(!target||target.id!==wordId||target.status!=='up')return state;
  const holes=[...state.holes];holes[slot]={...target,status:'hit'};
  const hits=[...state.hits,{id:wordId,teamId}];
  return freeze({...state,holes,hits,scores:{...state.scores,[teamId]:state.scores[teamId]+1},phase:hits.length===state.words.length?'complete':'active'});
}
export function settleMole(state,slot,wordId){
  const target=state.holes[slot];if(!target||target.id!==wordId||target.status!=='hit')return state;
  const next=state.words[state.nextIndex],holes=[...state.holes];holes[slot]=next?{id:next.id,status:'up'}:null;
  return freeze({...state,holes,nextIndex:state.nextIndex+(next?1:0)});
}
export function finishMoleHits(state){
  if(!state)return state;
  return state.holes.reduce((next,hole,slot)=>hole?.status==='hit'?settleMole(next,slot,hole.id):next,state);
}
