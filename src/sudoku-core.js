const DIGITS=Array.from({length:9},(_,i)=>i)

const normalized=value=>typeof value==='string'?value.normalize('NFC').trim():''
const pinyinKey=value=>normalized(value).toLowerCase().replace(/[\s'’·-]/gu,'')
const validCell=cell=>Number.isInteger(cell)&&cell>=0&&cell<81

function freezeState(state) {
  for(const word of state.words) {
    if(word.picture)Object.freeze(word.picture)
    if(word.source)Object.freeze(word.source)
    Object.freeze(word)
  }
  for(const team of state.teams)Object.freeze(team)
  for(const entry of state.history)Object.freeze(entry)
  for(const key of ['words','teams','solution','givens','values','presentations','collected','scored','history'])Object.freeze(state[key])
  Object.freeze(state.scores)
  Object.freeze(state.feedback.conflicts)
  Object.freeze(state.feedback)
  return Object.freeze(state)
}
function report(state,kind,message,cell=null,conflicts=[]) {
  return freezeState({...state,feedback:{kind,message,cell,conflicts}})
}
function completePhase(values) {return values.every(value=>value!==null)?'complete':'fill'}

export function createSudokuState({words,teamNames=['向日葵组','小树苗组'],random=Math.random,blankCount=12}={}) {
  if(!Array.isArray(words)||words.length!==9)throw new TypeError('Exactly nine words are required')
  const ids=new Set(),texts=new Set()
  const snapshot=words.map(word=>{
    const id=normalized(word?.id),text=normalized(word?.word),pinyin=normalized(word?.pinyin)
    if(!id||ids.has(id)||!/^\p{Script=Han}{1,12}$/u.test(text)||texts.has(text)||!pinyin)throw new TypeError('Words need unique IDs, distinct Chinese text and pinyin')
    ids.add(id);texts.add(text)
    const picture=word.picture
    const usablePicture=picture&&normalized(picture.key)&&(normalized(picture.glyph)||Number.isInteger(picture.count)&&picture.count>=1&&picture.count<=10||Number.isInteger(picture.month)&&picture.month>=1&&picture.month<=12)
    return {...word,id,word:text,pinyin,picture:usablePicture?{...picture}:null,source:word.source?{...word.source}:undefined}
  })
  if(!Array.isArray(teamNames)||teamNames.length<2||teamNames.length>4||teamNames.some(name=>!normalized(name)))throw new TypeError('Two to four named teams are required')
  const teams=teamNames.map((name,index)=>({id:`team-${index+1}`,name:normalized(name)}))
  const puzzle=createSudokuPuzzle({random,blankCount}),presentations=Array(81).fill('word')
  for(let word=0;word<9;word++) {
    const item=snapshot[word],forms=['word']
    if(snapshot.filter(other=>pinyinKey(other.pinyin)===pinyinKey(item.pinyin)).length===1)forms.push('pinyin')
    if(item.picture&&snapshot.filter(other=>other.picture?.key===item.picture.key).length===1)forms.push('picture')
    const cells=shuffle(puzzle.givens.flatMap((value,cell)=>value===word?[cell]:[]),random)
    cells.forEach((cell,index)=>{presentations[cell]=forms[index<forms.length?index:Math.floor(sample(random)*forms.length)]})
  }
  return freezeState({phase:'collect',words:snapshot,...puzzle,values:[...puzzle.givens],presentations,collected:[],teams,
    scores:Object.fromEntries(teams.map(team=>[team.id,0])),scored:Array(81).fill(false),history:[],
    feedback:{kind:'idle',message:'先从棋盘收集9个不同的词。',cell:null,conflicts:[]}})
}

export function collectSudokuWord(state,cell) {
  if(!validCell(cell)||state.givens[cell]===null)return report(state,'info','请从已有线索中选一个词。')
  if(state.phase!=='collect')return report(state,'info','9词已齐，请从右侧词卡填空。')
  const word=state.words[state.givens[cell]]
  if(state.collected.includes(word.id))return report(state,'info',`“${word.word}”已经整理过了。`,cell)
  const collected=[...state.collected,word.id],phase=collected.length===9?'fill':'collect'
  return report({...state,collected,phase},'success',phase==='fill'?'9词已整理齐，现在可以填写空格。':`已整理“${word.word}”，继续寻找其他词。`,cell)
}

export function placeSudokuWord(state,{cell,wordId,teamId=state.teams[0].id}={}) {
  if(state.phase==='collect')return report(state,'info','先整理齐9个不同的词，再填写空格。')
  const word=state.words.findIndex(item=>item.id===wordId)
  if(!validCell(cell)||word<0||!state.teams.some(team=>team.id===teamId))return report(state,'error','请选择有效词卡、空格和作答小组。')
  if(state.givens[cell]!==null)return report(state,'info','原有线索保留不动，请填写空格。',cell)
  if(word!==state.solution[cell]) {
    const conflicts=state.values.flatMap((value,index)=>value===word&&index!==cell&&sameUnit(cell,index)?[index]:[])
    return report(state,'error',conflicts.length?`再看看：所在行、列或宫里已有“${state.words[word].word}”。`:'这个位置还不合适，再核对词义和线索。',cell,conflicts)
  }
  if(state.values[cell]===word)return report(state,'info','这一格已经填对，不重复得星。',cell)
  const values=[...state.values],scored=[...state.scored],scores={...state.scores}
  values[cell]=word
  const newPoint=!scored[cell]
  if(newPoint){scored[cell]=true;scores[teamId]++}
  const history=[...state.history,{cell,previous:state.values[cell]}]
  const phase=completePhase(values)
  return report({...state,values,scored,scores,history,phase},'success',phase==='complete'?'全部填对，汉字数独完成！':newPoint?'填对了，收获1颗星！':'填对了，这一格已经得过星。',cell)
}

export function clearSudokuCell(state,cell) {
  if(!validCell(cell)||state.givens[cell]!==null||state.values[cell]===null)return report(state,'info','只能撤回自己填过的格子。')
  const values=[...state.values],history=[...state.history,{cell,previous:state.values[cell]}]
  values[cell]=null
  return report({...state,values,history,phase:'fill'},'info','已撤回这一格，词卡仍可重复使用。',cell)
}

export function undoSudoku(state) {
  const last=state.history.at(-1)
  if(!last)return report(state,'info','还没有可撤回的填写。')
  const values=[...state.values];values[last.cell]=last.previous
  return report({...state,values,history:state.history.slice(0,-1),phase:completePhase(values)},'info','已撤回上一步；已得星的格子不会重复计分。',last.cell)
}

export function getSudokuProgress(state) {
  const totalBlanks=state.givens.filter(value=>value===null).length
  const filled=state.values.filter((value,cell)=>state.givens[cell]===null&&value!==null).length
  return {collected:state.collected.length,totalWords:9,filled,totalBlanks,remaining:totalBlanks-filled}
}
const sameUnit=(left,right)=>Math.floor(left/9)===Math.floor(right/9)||left%9===right%9||
  (Math.floor(left/27)===Math.floor(right/27)&&Math.floor((left%9)/3)===Math.floor((right%9)/3))

function sample(random) {
  const value=Number(random())
  return Number.isFinite(value)?Math.min(0.9999999999999999,Math.max(0,value)):0
}
function shuffle(values,random) {
  const result=[...values]
  for(let index=result.length-1;index>0;index--){const target=Math.floor(sample(random)*(index+1));[result[index],result[target]]=[result[target],result[index]]}
  return result
}
function candidates(values,cell) {
  const used=new Set(values.filter((value,index)=>index!==cell&&value!==null&&sameUnit(cell,index)))
  return DIGITS.filter(value=>!used.has(value))
}
function singleCandidateSolution(givens) {
  const values=[...givens]
  while(values.includes(null)) {
    let changed=false
    for(let cell=0;cell<81;cell++)if(values[cell]===null) {
      const possible=candidates(values,cell)
      if(!possible.length)return null
      if(possible.length===1){values[cell]=possible[0];changed=true}
    }
    if(!changed)return null
  }
  return values
}
function makePuzzle(rowOrder,colOrder,symbols,holes) {
  const solution=[],givens=[]
  for(const row of rowOrder)for(const col of colOrder) {
    const value=symbols[(row*3+Math.floor(row/3)+col)%9]
    solution.push(value)
    givens.push(holes.has(row*9+col)?null:value)
  }
  return {solution,givens}
}

export function createSudokuPuzzle({random=Math.random,blankCount=12}={}) {
  if(typeof random!=='function')throw new TypeError('random must be a function')
  if(!Number.isInteger(blankCount)||blankCount<9||blankCount>18)throw new RangeError('blankCount must be 9 to 18')
  // Both masks have exactly one cell in every row, column and box. Their union
  // is a prevalidated single-candidate puzzle; restoring clues stays unique.
  const columns=[0,3,6,1,4,7,2,5,8]
  const primary=columns.map((col,row)=>row*9+col)
  const secondary=columns.map((col,row)=>row*9+(col+1)%9)
  const holes=new Set([...primary,...shuffle(secondary,random).slice(0,blankCount-9)])
  const ordered=()=>shuffle([0,1,2],random).flatMap(band=>shuffle([0,1,2],random).map(inner=>band*3+inner))
  const puzzle=makePuzzle(ordered(),ordered(),shuffle(DIGITS,random),holes)
  const solved=singleCandidateSolution(puzzle.givens)
  if(solved?.every((value,index)=>value===puzzle.solution[index]))return puzzle
  return makePuzzle(DIGITS,DIGITS,DIGITS,new Set([...primary,...secondary.slice(0,blankCount-9)]))
}
