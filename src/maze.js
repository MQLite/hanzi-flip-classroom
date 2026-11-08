const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const button=(id,text,primary=false)=>{const b=el('button',text,primary?'primary':'');b.id=id;return b;};
export function createMazeView(host,dispatch){
  let model;const controller=new AbortController();
  function adjacent(a,b){return Math.abs(Math.floor(a/9)-Math.floor(b/9))+Math.abs(a%9-b%9)===1;}
  function prepare(){
    host.append(el('span','OBSERVE · READ · EXPLORE','maze-kicker'),el('h3','观察路线，认字出发'),el('p',model.pool.label,'maze-course'));
    const intro=el('div',undefined,'maze-intro');intro.append(el('div','🧭','maze-compass'),el('p','先观察通道和岔路，找一找出口在哪里。'),el('p','学生选择相邻汉字并朗读；读对后老师确认，才能前进一步。遇到死路，可以退回来继续找路。'));
    const chips=el('div',undefined,'maze-word-chips');for(const word of model.pool.words.slice(0,30))chips.append(el('span',word.word));intro.append(chips);
    if(!model.pool.words.length)intro.append(el('p','当前范围没有可用生字，请换课或打开题库管理。','maze-empty'));
    const start=button('maze-start','观察好了，开始迷宫',true);start.disabled=!model.pool.words.length;intro.append(start);host.append(intro);
  }
  function round(){
    const state=model.state;host.append(el('span','本课活动 · 第3站','maze-kicker'),el('h3',state.phase==='complete'?'找到出口啦！':'看路线，读汉字，一步一步走'),el('p',model.pool.label,'maze-course'));
    const layout=el('div',undefined,'maze-layout'),left=el('section'),board=el('div',undefined,'maze-board');board.id='maze-board';board.tabIndex=0;board.setAttribute('role','grid');board.setAttribute('aria-label','本课汉字迷宫，方向键选相邻格，读对后确认');
    for(let row=0;row<9;row++){const line=el('div',undefined,'maze-row');line.setAttribute('role','row');for(let col=0;col<9;col++){
      const index=row*9+col,cell=el('div',undefined,`maze-cell${state.grid[index]?'':' maze-wall'}`);cell.setAttribute('role','gridcell');
      if(state.grid[index]){
        const b=el('button');b.dataset.mazeCell=index;b.disabled=state.phase==='complete'||!adjacent(state.position,index);b.setAttribute('aria-label',`${index===state.start?'起点，':index===state.goal?'出口，':''}第${row+1}行第${col+1}列，${state.cells[index].word}`);
        b.append(el('strong',state.cells[index].word));if(index===state.position){b.setAttribute('aria-current','location');b.classList.add('is-current');b.append(el('span','🙂','maze-marker'));}else if(index===state.start||index===state.goal)b.append(el('span',index===state.start?'🚩':'🏁','maze-marker'));
        if(state.visited.includes(index))b.classList.add('is-visited');if(index===state.pendingIndex)b.classList.add('is-pending');if(index===state.goal)b.classList.add('is-exit');cell.append(b);
      }line.append(cell);
    }board.append(line);}left.append(board,el('p','🚩 起点　🏁 出口　🙂 我们的位置','maze-legend'));layout.append(left);
    const desk=el('section',undefined,'maze-desk'),progress=el('p',`已走 ${state.steps} 步`,'maze-progress');progress.id='maze-progress';progress.setAttribute('role','status');desk.append(progress);
    if(state.phase==='complete'){
      const celebration=el('div',undefined,'maze-celebration');celebration.id='maze-celebration';celebration.append(el('div','🏆 ✨','maze-trophy'),el('h4','观察 + 认字，找到出口！'),el('p','本课的搭建、女巫和迷宫活动都完成啦。'));desk.append(celebration,button('maze-next-activity','选择下一课，开始新一组活动',true));
    }else{
      const prompt=el('div',undefined,'maze-read-prompt'),word=state.pendingIndex===null?null:state.cells[state.pendingIndex];prompt.append(el('span',word?'请大声读出这个字':'先观察，再选择相邻格','maze-kicker'));
      if(word){const han=el('strong',word.word);han.id='maze-read-word';prompt.append(han);if(model.showPinyin&&word.pinyin)prompt.append(el('small',word.pinyin,'maze-read-pinyin'));}else prompt.append(el('p','只走上下左右一格。走到死路，可以退回来。'));desk.append(prompt);
      const confirm=button('maze-confirm','读对了，前进一步',true),cancel=button('maze-cancel','先不走，重新选');confirm.disabled=cancel.disabled=state.pendingIndex===null;desk.append(confirm,cancel,el('p','读错先重读；老师确认后才移动。','maze-note'));
    }
    const feedback=el('p',state.feedback,'maze-feedback');feedback.setAttribute('role','status');desk.append(feedback);layout.append(desk);host.append(layout);
    const controls=el('div',undefined,'maze-bottom-controls');controls.append(button('maze-restart','再走一张迷宫'),button('maze-previous-activity','上一活动：女巫的毒药'));host.append(controls);
  }
  host.addEventListener('click',event=>{const b=event.target.closest('button');if(!b||b.disabled||!host.contains(b))return;if(b.dataset.mazeCell!==undefined){dispatch('cell',Number(b.dataset.mazeCell));return;}const intent={'maze-start':'start','maze-confirm':'confirm','maze-cancel':'cancel','maze-restart':'restart','maze-next-activity':'next-activity','maze-previous-activity':'previous-activity'}[b.id];if(intent)dispatch(intent);},{signal:controller.signal});
  host.addEventListener('keydown',event=>{
    if(event.repeat&&['Enter',' '].includes(event.key)){event.preventDefault();return;}
    if(!model.state||model.state.phase!=='play')return;const delta={ArrowUp:-9,ArrowDown:9,ArrowLeft:-1,ArrowRight:1}[event.key];if(delta!==undefined){event.preventDefault();dispatch('cell',model.state.position+delta);}if(event.key==='Escape')dispatch('cancel');
  },{signal:controller.signal});
  return {update(next){const focused=document.activeElement,hadFocus=host.contains(focused),focusId=hadFocus?focused.id:null;model=next;host.replaceChildren();host.dataset.phase=next.state?.phase??'prepare';if(next.state)round();else prepare();if(hadFocus){const old=focusId?host.querySelector(`#${focusId}`):null;const target=next.state&&next.state.pendingIndex!==null?host.querySelector('#maze-confirm'):old&&!old.disabled?old:host.querySelector('#maze-next-activity,#maze-board,#maze-start');target?.focus();}},dispose(){controller.abort();host.replaceChildren();}};
}
