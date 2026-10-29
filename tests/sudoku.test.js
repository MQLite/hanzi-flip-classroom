import {describe,expect,it} from 'vitest'
import {createSudokuPuzzle,createSudokuState,collectSudokuWord,placeSudokuWord,clearSudokuCell,undoSudoku,getSudokuProgress} from '../src/sudoku-core.js'

function units(values) {
  return [
    ...Array.from({length:9},(_,row)=>values.slice(row*9,row*9+9)),
    ...Array.from({length:9},(_,col)=>Array.from({length:9},(_,row)=>values[row*9+col])),
    ...Array.from({length:9},(_,box)=>Array.from({length:9},(_,i)=>values[(Math.floor(box/3)*3+Math.floor(i/3))*9+(box%3)*3+i%3])),
  ]
}

function solutions(givens, singleOnly=false) {
  const grid=[...givens]
  const candidates=cell=>Array.from({length:9},(_,i)=>i).filter(value=>!grid.some((other,index)=>other===value&&(
    Math.floor(index/9)===Math.floor(cell/9)||index%9===cell%9||
    (Math.floor(index/27)===Math.floor(cell/27)&&Math.floor((index%9)/3)===Math.floor((cell%9)/3)))))
  function visit() {
    let best=-1,choices=[]
    for(let cell=0;cell<81;cell++)if(grid[cell]===null){
      const possible=candidates(cell)
      if(!possible.length)return 0
      if(best<0||possible.length<choices.length){best=cell;choices=possible}
    }
    if(best<0)return 1
    if(singleOnly&&choices.length!==1)return 0
    let count=0
    for(const value of choices){grid[best]=value;count+=visit();if(count>=2)break}
    grid[best]=null
    return count
  }
  return visit()
}

describe('easy nine-word Sudoku puzzles',()=>{
  it('has a valid complete grid, twelve constrained blanks and one directly solvable answer',()=>{
    const puzzle=createSudokuPuzzle({random:()=>0.4})
    expect(puzzle.solution).toHaveLength(81)
    expect(puzzle.givens).toHaveLength(81)
    for(const unit of units(puzzle.solution))expect([...unit].sort()).toEqual([0,1,2,3,4,5,6,7,8])
    expect(puzzle.givens.filter(value=>value===null)).toHaveLength(12)
    for(const unit of units(puzzle.givens))expect([1,2]).toContain(unit.filter(value=>value===null).length)
    expect(solutions(puzzle.givens)).toBe(1)
    expect(solutions(puzzle.givens,true)).toBe(1)
  })

  it('preserves the constraints across random transforms and all allowed blank counts',()=>{
    let seed=47
    const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296)
    const layouts=new Set()
    for(let trial=0;trial<40;trial++) {
      const count=9+trial%10,puzzle=createSudokuPuzzle({random,blankCount:count})
      for(const unit of units(puzzle.solution))expect([...unit].sort()).toEqual([0,1,2,3,4,5,6,7,8])
      for(const unit of units(puzzle.givens))expect([1,2]).toContain(unit.filter(value=>value===null).length)
      expect(puzzle.givens.filter(value=>value===null)).toHaveLength(count)
      expect(solutions(puzzle.givens)).toBe(1)
      expect(solutions(puzzle.givens,true)).toBe(1)
      layouts.add(puzzle.solution.join(''))
    }
    expect(layouts.size).toBeGreaterThan(30)
    for(const blankCount of [0,8,19,12.5])expect(()=>createSudokuPuzzle({blankCount})).toThrow()
  })
})

const words=()=>[...'一二三四五六七八九'].map((word,index)=>({id:`w${index}`,word,pinyin:['yī','èr','sān','sì','wǔ','liù','qī','bā','jiǔ'][index],picture:{key:`count${index+1}`,count:index+1,label:word},source:{section:'测试词表'}}))
function fresh(options={}) {
  const state=createSudokuState({words:words(),teamNames:['一组','二组'],random:()=>0.4,...options})
  expect(state.words).toHaveLength(9)
  return state
}
function collected(state) {
  for(let word=0;word<9;word++)state=collectSudokuWord(state,state.givens.indexOf(word))
  return state
}

describe('vocabulary collection and Sudoku filling',()=>{
  it('snapshots and freezes words without freezing or changing the caller data',()=>{
    const input=words(),state=fresh({words:input})
    input[0].word='改';input[0].picture.key='changed';input[0].source.section='changed'
    expect(state.words[0].word).toBe('一')
    expect(state.words[0].picture.key).toBe('count1')
    expect(state.words[0].source.section).toBe('测试词表')
    expect(Object.isFrozen(state.values)).toBe(true)
    expect(Object.isFrozen(state.words[0])).toBe(true)
    expect(state.phase).toBe('collect')
  })

  it('requires exactly nine distinct named word identities and usable pinyin',()=>{
    expect(()=>fresh({words:words().slice(0,8)})).toThrow()
    const duplicated=words();duplicated[1]={...duplicated[0]}
    expect(()=>fresh({words:duplicated})).toThrow()
    expect(()=>fresh({words:words().map((word,i)=>i?word:{...word,pinyin:''})})).toThrow()
    expect(()=>fresh({teamNames:['一组']})).toThrow()
  })

  it('mixes clear forms and prevents isolated homophones or shared images from being clues',()=>{
    const normal=fresh()
    for(let word=0;word<9;word++) {
      const forms=normal.presentations.filter((_,cell)=>normal.givens[cell]===word)
      expect(forms).toEqual(expect.arrayContaining(['word','pinyin','picture']))
    }
    const input=words();input[0]={...input[0],word:'他',pinyin:'tā',picture:{key:'person',glyph:'🧑'}};input[1]={...input[1],word:'她',pinyin:' tā ',picture:{key:'person',glyph:'🧑'}}
    const state=fresh({words:input})
    for(let word=0;word<2;word++)expect(new Set(state.presentations.filter((_,cell)=>state.givens[cell]===word))).toEqual(new Set(['word']))
  })

  it('copies given clues, deduplicates different forms of a word, and unlocks only after nine',()=>{
    const initial=fresh(),cell=initial.givens.indexOf(0),duplicate=initial.givens.lastIndexOf(0)
    let state=collectSudokuWord(initial,cell)
    state=collectSudokuWord(state,duplicate)
    expect(state.collected).toEqual(['w0'])
    expect(state.givens).toEqual(initial.givens)
    expect(state.values).toEqual(initial.values)
    expect(initial.collected).toEqual([])
    state=collected(state)
    expect(state.phase).toBe('fill')
    expect(getSudokuProgress(state)).toMatchObject({collected:9,filled:0,totalBlanks:12})
    expect(state.scores).toEqual({'team-1':0,'team-2':0})
  })

  it('rejects early filling, unknown words, invalid teams, indices and original-clue edits',()=>{
    const initial=fresh(),cell=initial.givens.indexOf(null)
    expect(placeSudokuWord(initial,{cell,wordId:initial.words[initial.solution[cell]].id,teamId:'team-1'}).values).toEqual(initial.values)
    const state=collected(initial),given=state.givens.findIndex(value=>value!==null)
    for(const attempt of [{cell:-1,wordId:'w0',teamId:'team-1'},{cell:81,wordId:'w0',teamId:'team-1'},{cell,wordId:'missing',teamId:'team-1'},{cell,wordId:'w0',teamId:'unknown'},{cell:given,wordId:'w0',teamId:'team-1'}]) {
      const next=placeSudokuWord(state,attempt)
      expect(next.values).toEqual(state.values)
      expect(next.scores).toEqual(state.scores)
    }
    expect(clearSudokuCell(state,given).values).toEqual(state.values)
    expect(collectSudokuWord(initial,cell).collected).toEqual([])
  })

  it('keeps a wrong answer out of the grid and scores the correct word only once across undo/refill',()=>{
    const initial=collected(fresh()),cell=initial.givens.indexOf(null),correct=initial.words[initial.solution[cell]].id
    const wrong=placeSudokuWord(initial,{cell,wordId:initial.words[(initial.solution[cell]+1)%9].id,teamId:'team-1'})
    expect(wrong.feedback.kind).toBe('error')
    expect(wrong.values[cell]).toBeNull()
    expect(wrong.scores['team-1']).toBe(0)
    let state=placeSudokuWord(wrong,{cell,wordId:correct,teamId:'team-2'})
    expect(state.values[cell]).toBe(initial.solution[cell])
    expect(state.scores['team-2']).toBe(1)
    state=undoSudoku(state)
    expect(state.values[cell]).toBeNull()
    state=placeSudokuWord(state,{cell,wordId:correct,teamId:'team-1'})
    expect(state.scores).toEqual({'team-1':0,'team-2':1})
    state=clearSudokuCell(state,cell)
    expect(state.values[cell]).toBeNull()
    state=undoSudoku(state)
    expect(state.values[cell]).toBe(initial.solution[cell])
    expect(state.scores['team-2']).toBe(1)
  })

  it('finishes on the unique complete grid and can undo completion without scoring twice',()=>{
    let state=collected(fresh())
    for(let cell=0;cell<81;cell++)if(state.givens[cell]===null)state=placeSudokuWord(state,{cell,wordId:state.words[state.solution[cell]].id,teamId:'team-1'})
    expect(state.phase).toBe('complete')
    expect(state.values).toEqual(state.solution)
    expect(state.scores['team-1']).toBe(12)
    expect(getSudokuProgress(state)).toMatchObject({filled:12,totalBlanks:12})
    state=undoSudoku(state)
    expect(state.phase).toBe('fill')
    expect(state.scores['team-1']).toBe(12)
  })
})
