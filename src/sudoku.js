import {getSudokuProgress} from './sudoku-core.js';

const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
function pictureView(picture){
  const wrap=node('span',undefined,'sudoku-picture');wrap.setAttribute('role','img');wrap.setAttribute('aria-label',picture.label);
  if(picture.count){wrap.classList.add('sudoku-dots');for(let i=0;i<picture.count;i++)wrap.append(node('i'));}
  else if(picture.month){wrap.classList.add('sudoku-calendar');wrap.append(node('b',String(picture.month)),node('small','月'));}
  else wrap.textContent=picture.glyph;
  return wrap;
}
function wordView(word,complete=false,form='word'){
  const wrap=node('span',undefined,'sudoku-word');
  if(complete||form==='word'){
    const han=node('strong',word.word);han.dataset.length=word.word.length;wrap.append(han);
  }
  if(complete||form==='pinyin')wrap.append(node('small',word.pinyin,'sudoku-pinyin'));
  if((complete||form==='picture')&&word.picture)wrap.append(pictureView(word.picture));
  return wrap;
}
function provenance(word){
  const s=word.source;
  return s?`${s.section??''}${s.pdfPage?` · PDF第${s.pdfPage}页`:''}`:'';
}

export function createSudokuView(host,dispatch){
  let model={},boardKey=null,cells=[],selectedCell=null,selectedWord=null,drag=null,suppressClickUntil=0,frame=null,bankKey=null;
  const controller=new AbortController(),options={signal:controller.signal};
  function cancelDrag(){
    if(frame!==null)cancelAnimationFrame(frame);frame=null;
    if(drag){drag.ghost?.remove();if(drag.source.hasPointerCapture?.(drag.pointerId))drag.source.releasePointerCapture(drag.pointerId);}
    drag=null;host.classList.remove('sudoku-dragging');
  }
  function updateHighlights(){
    for(const cell of cells){
      const index=Number(cell.dataset.sudokuCell);
      cell.classList.toggle('sudoku-selected',index===selectedCell);
      cell.tabIndex=index===(selectedCell??0)?0:-1;
    }
    host.querySelectorAll('[data-sudoku-card]').forEach(card=>card.setAttribute('aria-pressed',String(card.dataset.wordId===selectedWord)));
    const clear=host.querySelector('#sudoku-clear');
    if(clear)clear.disabled=selectedCell===null||model.state.givens[selectedCell]!==null||model.state.values[selectedCell]===null;
    const collect=host.querySelector('#sudoku-collect');
    if(collect)collect.textContent=selectedCell!==null&&model.state?.phase==='collect'?`整理选中的词 →`:'将棋盘词拖到这里 / 点此整理';
  }
  function prepare(){
    cancelDrag();boardKey=null;bankKey=null;cells=[];selectedCell=null;selectedWord=null;
    const focusId=document.activeElement?.dataset.sudokuChoice;
    host.replaceChildren();host.dataset.phase='prepare';
    const prep=node('section',undefined,'sudoku-preparation');
    prep.append(node('span','先选9词，再出发','sudoku-kicker'),node('h3','今天，用哪些词来玩？'),node('p',model.label,'sudoku-course'),node('p',model.note,'sudoku-note'));
    if(model.candidates.length<9&&model.availableLessons?.length){
      const alternatives=node('div',undefined,'sudoku-alternatives');alternatives.append(node('span','本册可用课：'));
      for(const lesson of model.availableLessons){const b=node('button',`第${lesson.lesson}课 ${lesson.title}`);b.dataset.sudokuLesson=lesson.lesson;alternatives.append(b);}prep.append(alternatives);
    }
    const choices=node('div',undefined,'sudoku-choices');choices.setAttribute('role','group');choices.setAttribute('aria-label','选择本轮9个词');
    for(const word of model.candidates){
      const b=node('button');b.dataset.sudokuChoice=word.id;b.setAttribute('aria-pressed',String(model.selectedIds.includes(word.id)));
      b.title=provenance(word);b.append(wordView(word,true));choices.append(b);
    }
    prep.append(choices);
    const bottom=node('div',undefined,'sudoku-prep-actions'),count=node('strong',`已选 ${model.selectedIds.length} / 9`);
    count.id='sudoku-choice-count';count.setAttribute('role','status');
    const start=node('button','开始汉字数独','primary');start.id='sudoku-start';start.disabled=model.selectedIds.length!==9;
    bottom.append(count,start);prep.append(bottom,node('p','简单关 · 每行、每列、每宫各有9个不同词 · 每处只留1–2空','sudoku-rule'));
    host.append(prep);
    if(focusId)host.querySelectorAll('[data-sudoku-choice]').forEach(b=>{if(b.dataset.sudokuChoice===focusId)b.focus();});
  }
  function buildBoard(){
    cancelDrag();selectedCell=null;selectedWord=null;bankKey=null;host.replaceChildren();
    const intro=node('div',undefined,'sudoku-intro');
    const step=node('strong');step.id='sudoku-step';const hint=node('p');hint.id='sudoku-instruction';intro.append(step,hint);host.append(intro);
    const layout=node('div',undefined,'sudoku-layout'),left=node('div',undefined,'sudoku-board-area'),scroll=node('div',undefined,'sudoku-board-scroll');
    scroll.tabIndex=0;scroll.setAttribute('aria-label','数独棋盘，窄屏可横向滚动');
    const grid=node('div',undefined,'sudoku-grid');grid.setAttribute('role','grid');grid.setAttribute('aria-label','汉字数独，9行9列');grid.setAttribute('aria-rowcount','9');grid.setAttribute('aria-colcount','9');
    cells=[];
    for(let row=0;row<9;row++){
      const r=node('div',undefined,'sudoku-grid-row');r.setAttribute('role','row');
      for(let col=0;col<9;col++){
        const cell=node('button',undefined,'sudoku-cell');cell.dataset.sudokuCell=row*9+col;
        cell.setAttribute('role','gridcell');cell.setAttribute('aria-rowindex',row+1);cell.setAttribute('aria-colindex',col+1);
        if(col===2||col===5)cell.classList.add('sudoku-box-right');if(row===2||row===5)cell.classList.add('sudoku-box-bottom');
        cells.push(cell);r.append(cell);
      }grid.append(r);
    }
    scroll.append(grid);left.append(scroll);
    const pan=node('div',undefined,'sudoku-pan');pan.append(node('small','每行 / 每列 / 每个粗框内，9词各出现一次。'));
    for(const [direction,label]of[[-1,'← 左移棋盘'],[1,'右移棋盘 →']]){const b=node('button',label);b.dataset.sudokuPan=direction;pan.append(b);}left.append(pan);
    const bank=node('aside',undefined,'sudoku-bank');bank.id='sudoku-bank';bank.setAttribute('aria-label','9个完整词卡');
    bank.append(node('h3','我的9词卡'));
    const collect=node('button','将棋盘词拖到这里 / 点此整理','sudoku-collect');collect.id='sudoku-collect';bank.append(collect);
    const cards=node('div',undefined,'sudoku-cards');cards.id='sudoku-cards';bank.append(cards);
    layout.append(left,bank);host.append(layout);
    const actions=node('div',undefined,'sudoku-actions');
    for(const [id,label]of[['sudoku-undo','撤回上一步'],['sudoku-clear','清空选中格'],['sudoku-prepare','调整9词']]){const b=node('button',label);b.id=id;actions.append(b);}host.append(actions);
    const feedback=node('p',undefined,'sudoku-feedback');feedback.id='sudoku-feedback';feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');host.append(feedback);
  }
  function renderBoard(){
    const state=model.state,progress=getSudokuProgress(state);
    if(boardKey!==state.givens){buildBoard();boardKey=state.givens;}
    host.dataset.phase=state.phase;
    host.querySelector('#sudoku-step').textContent=state.phase==='collect'?`① 整理词卡　${progress.collected} / 9`:state.phase==='complete'?'✓ 汉字数独完成！':`② 填写空格　${progress.filled} / ${progress.totalBlanks}`;
    host.querySelector('#sudoku-instruction').textContent=state.phase==='collect'?'从棋盘拖出任一种形式，右侧自动补全词卡。也可先点棋盘，再点右侧整理。':'从右侧词卡拖入空格；也可先点词卡，再点空格。词卡可以重复使用。';
    cells.forEach((button,index)=>{
      const value=state.values[index],given=state.givens[index]!==null;
      button.classList.toggle('sudoku-given',given);button.classList.toggle('sudoku-filled',!given&&value!==null);
      button.classList.toggle('sudoku-conflict',state.feedback.conflicts.includes(index)||state.feedback.kind==='error'&&state.feedback.cell===index);
      const form=given?state.presentations[index]:'word';
      const renderKey=value===null?'empty':`${value}/${form}`;
      if(button.dataset.renderKey!==renderKey){
        button.replaceChildren();button.dataset.renderKey=renderKey;
        if(value!==null){const word=state.words[value];button.dataset.wordId=word.id;button.append(wordView(word,false,form));}
        else{delete button.dataset.wordId;button.append(node('span','＋','sudoku-empty'));}
      }
      button.dataset.form=value===null?'empty':form;
      const clue=value===null?'空格':form==='word'?state.words[value].word:form==='pinyin'?state.words[value].pinyin:state.words[value].picture.label;
      button.setAttribute('aria-label',`第${Math.floor(index/9)+1}行第${index%9+1}列，${clue}${given?'，原有线索':''}`);
    });
    const key=state.collected.join('|')+`/${state.phase==='collect'}`;
    if(bankKey!==key){
      const cards=host.querySelector('#sudoku-cards');cards.replaceChildren();
      for(let i=0;i<9;i++){
        const word=state.words.find(w=>w.id===state.collected[i]);
        if(word){const card=node('button',undefined,'sudoku-card');card.dataset.sudokuCard='';card.dataset.wordId=word.id;card.title=provenance(word);card.setAttribute('aria-label',`${word.word} ${word.pinyin}，${state.phase==='collect'?'已整理':'选择词卡'}`);card.append(wordView(word,true));cards.append(card);}
        else cards.append(node('div',`词卡 ${i+1}`,'sudoku-card-placeholder'));
      }bankKey=key;
    }
    host.querySelector('#sudoku-collect').hidden=state.phase!=='collect';
    host.querySelector('#sudoku-undo').disabled=!state.history.length;
    const feedback=host.querySelector('#sudoku-feedback');feedback.dataset.kind=state.feedback.kind;feedback.textContent=state.feedback.message;
    updateHighlights();
  }
  host.addEventListener('click',event=>{
    if(Date.now()<suppressClickUntil)return;
    const b=event.target.closest('button');if(!b||!host.contains(b))return;
    if(b.dataset.sudokuChoice){dispatch('choose-word',b.dataset.sudokuChoice);return;}
    if(b.dataset.sudokuLesson){dispatch('lesson',Number(b.dataset.sudokuLesson));return;}
    if(b.dataset.sudokuPan){host.querySelector('.sudoku-board-scroll').scrollBy({left:Number(b.dataset.sudokuPan)*180,behavior:'smooth'});return;}
    if(b.id==='sudoku-start'){dispatch('start');return;}
    if(b.id==='sudoku-prepare'){dispatch('prepare');return;}
    const state=model.state;if(!state)return;
    if(b.dataset.sudokuCell!==undefined){
      selectedCell=Number(b.dataset.sudokuCell);updateHighlights();
      if(state.phase!=='collect'&&state.givens[selectedCell]===null&&selectedWord)dispatch('place',{cell:selectedCell,wordId:selectedWord});
    }else if(b.dataset.sudokuCard!==undefined){
      if(state.phase==='collect')return;
      selectedWord=b.dataset.wordId;updateHighlights();
    }else if(b.id==='sudoku-collect'&&selectedCell!==null)dispatch('collect',selectedCell);
    else if(b.id==='sudoku-undo')dispatch('undo');
    else if(b.id==='sudoku-clear'&&selectedCell!==null)dispatch('clear',selectedCell);
  },options);
  host.addEventListener('keydown',event=>{
    if(event.isComposing||document.querySelector('dialog[open]'))return;
    const b=event.target.closest('[data-sudoku-cell]');
    if(event.key==='Escape'){cancelDrag();selectedWord=null;selectedCell=null;updateHighlights();}
    if(!b)return;
    const cell=Number(b.dataset.sudokuCell),row=Math.floor(cell/9),col=cell%9;
    const next={ArrowLeft:row*9+Math.max(0,col-1),ArrowRight:row*9+Math.min(8,col+1),ArrowUp:Math.max(0,row-1)*9+col,ArrowDown:Math.min(8,row+1)*9+col}[event.key];
    if(next!==undefined){event.preventDefault();selectedCell=next;updateHighlights();cells[next].focus();}
    else if(event.key==='Delete'||event.key==='Backspace'){event.preventDefault();dispatch('clear',cell);}
  },options);
  host.addEventListener('pointerdown',event=>{
    suppressClickUntil=0;
    if(event.button!==0||!model.state||event.isPrimary===false)return;
    const source=event.target.closest('[data-sudoku-cell],[data-sudoku-card]');if(!source)return;
    const state=model.state,cell=source.dataset.sudokuCell===undefined?null:Number(source.dataset.sudokuCell);
    if(state.phase==='collect'?(cell===null||state.givens[cell]===null):source.dataset.sudokuCard===undefined)return;
    cancelDrag();drag={source,cell,wordId:source.dataset.wordId,pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,x:event.clientX,y:event.clientY,ghost:null};
    source.setPointerCapture(event.pointerId);
  },options);
  function autoScroll(){
    if(!drag?.ghost){frame=null;return;}
    const scroll=host.querySelector('.sudoku-board-scroll'),rect=scroll.getBoundingClientRect();
    if(drag.y>=rect.top&&drag.y<=rect.bottom){if(drag.x<rect.left+28)scroll.scrollLeft-=7;else if(drag.x>rect.right-28)scroll.scrollLeft+=7;}
    if(drag.y<40)window.scrollBy(0,-7);else if(drag.y>innerHeight-40)window.scrollBy(0,7);
    frame=requestAnimationFrame(autoScroll);
  }
  host.addEventListener('pointermove',event=>{
    if(!drag||event.pointerId!==drag.pointerId)return;
    drag.x=event.clientX;drag.y=event.clientY;
    if(!drag.ghost&&Math.hypot(drag.x-drag.startX,drag.y-drag.startY)>6){
      const ghost=node('div',undefined,'sudoku-drag-ghost');ghost.append(drag.source.firstElementChild.cloneNode(true));document.body.append(ghost);drag.ghost=ghost;host.classList.add('sudoku-dragging');frame=requestAnimationFrame(autoScroll);
    }
    if(drag.ghost){event.preventDefault();drag.ghost.style.left=`${drag.x}px`;drag.ghost.style.top=`${drag.y}px`;}
  },options);
  host.addEventListener('pointerup',event=>{
    if(!drag||event.pointerId!==drag.pointerId)return;
    const completed=drag,wasDrag=Boolean(drag.ghost);cancelDrag();if(!wasDrag)return;
    suppressClickUntil=Date.now()+350;
    const target=document.elementFromPoint(event.clientX,event.clientY);
    if(!host.contains(target))return;
    if(model.state.phase==='collect'&&target.closest('#sudoku-bank'))dispatch('collect',completed.cell);
    else if(model.state.phase!=='collect'){
      const cell=target.closest('[data-sudoku-cell]');if(cell){selectedCell=Number(cell.dataset.sudokuCell);selectedWord=completed.wordId;dispatch('place',{cell:selectedCell,wordId:selectedWord});}
    }
  },options);
  host.addEventListener('pointercancel',cancelDrag,options);
  return {update(next){model=next;if(model.state)renderBoard();else prepare();},cancelDrag,dispose(){cancelDrag();controller.abort();host.replaceChildren();}};
}
