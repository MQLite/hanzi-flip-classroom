import {createMazeScene} from './maze-scene.js';
import {mazeEncounters} from './maze-core.js';
import {withEnglishInstruction} from './english-instructions.js';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const instruction=(tag,text,english,cls)=>withEnglishInstruction(el(tag,text,cls),english);
const button=(id,text,english,primary=false)=>{const b=instruction('button',text,english,primary?'primary':'');b.id=id;return b;};
export function createMazeView(host,dispatch){
  let model,sceneView,active=false,newlyWon=false,soundEnabled=true;const controller=new AbortController(),sceneHost=el('div',undefined,'maze-stage'),boardHost=el('div',undefined,'maze-board');sceneHost.id='maze-scene';boardHost.id='maze-board';sceneHost.append(boardHost);
  function syncSceneControls(){
    const state=model?.state,busy=Boolean(sceneView?.isAnimating);
    host.querySelectorAll('[data-maze-cell]').forEach(b=>b.disabled=busy||state?.phase!=='play'||!adjacent(state.position,Number(b.dataset.mazeCell)));
    for(const id of ['maze-confirm','maze-cancel']){const b=host.querySelector('#'+id);if(b)b.disabled=busy||state?.pendingIndex===null;}
    const arriving=state?.phase==='complete'&&sceneHost.dataset.motion==='walk',win=host.querySelector('#maze-celebration'),arrival=host.querySelector('#maze-arrival-message');
    if(win)win.hidden=arriving;if(arrival)arrival.hidden=!arriving;
    if(state?.phase==='complete')host.querySelector('h3').textContent=arriving?'最后一步，正在走向出口…':'找到出口啦！';
    if(!busy&&active&&!document.hidden&&document.activeElement===sceneHost.querySelector('#maze-motion-status'))boardHost.focus();
  }
  function adjacent(a,b){return Math.abs(Math.floor(a/9)-Math.floor(b/9))+Math.abs(a%9-b%9)===1;}
  function prepare(){
    host.append(instruction('h3','观察路线，认字出发','Look, read and explore.'),el('p',model.pool.label,'maze-course'));
    const intro=el('div',undefined,'maze-intro');intro.append(el('div','🧭','maze-compass'),instruction('p','先观察通道和岔路。选相邻的格子，读对汉字后前进。','Choose a square next to you. Read its character to move.'));
    const rules=el('ul',undefined,'maze-encounter-rules');
    for(const effect of Object.values(mazeEncounters))rules.append(instruction('li',`${effect.icon} ${effect.name} ${effect.text}`,effect.english));
    intro.append(rules,instruction('p','机关藏在格子里，每个只触发一次。','Hidden surprises only happen once each.'));
    const chips=el('div',undefined,'maze-word-chips');for(const word of model.pool.words.slice(0,30))chips.append(el('span',word.word));intro.append(chips);
    if(!model.pool.words.length)intro.append(instruction('p','当前范围没有可用生字，请换课或打开题库管理。','Choose another lesson or add characters in the question bank.','maze-empty'));
    const start=button('maze-start','观察好了，开始迷宫','Start the maze',true);start.disabled=!model.pool.words.length;intro.append(start);host.append(intro);
  }
  function round(){
    const state=model.state;host.append(el('h3',state.phase==='complete'?'找到出口啦！':'看路线，读汉字，一步一步走'),el('p',model.pool.label,'maze-course'));
    const layout=el('div',undefined,'maze-layout'),left=el('section'),board=boardHost;board.replaceChildren();board.tabIndex=0;board.setAttribute('role','grid');board.setAttribute('aria-label','本课汉字迷宫，方向键选相邻格，读对后确认');
    for(let row=0;row<9;row++){const line=el('div',undefined,'maze-row');line.setAttribute('role','row');for(let col=0;col<9;col++){
      const index=row*9+col,cell=el('div',undefined,`maze-cell${state.grid[index]?'':' maze-wall'}`);cell.setAttribute('role','gridcell');
      if(state.grid[index]){
        const b=el('button');b.dataset.mazeCell=index;b.disabled=state.phase==='complete'||!adjacent(state.position,index);b.setAttribute('aria-label',`${index===state.start?'起点，':index===state.goal?'出口，':''}第${row+1}行第${col+1}列，${state.cells[index].word}`);
        b.append(el('strong',state.cells[index].word));
        if(index===state.position){
          b.setAttribute('aria-current','location');b.classList.add('is-current');
        }
        if(state.visited.includes(index))b.classList.add('is-visited');if(index===state.pendingIndex)b.classList.add('is-pending');
        if(index===state.start)b.classList.add('is-start');if(index===state.goal)b.classList.add('is-exit');cell.append(b);
      }line.append(cell);
    }board.append(line);}left.append(sceneHost);layout.append(left);
    const desk=el('section',undefined,'maze-desk'),progress=instruction('p',`已认读 ${state.steps} 次`,`Reads: ${state.steps}`,'maze-progress');progress.id='maze-progress';progress.setAttribute('role','status');desk.append(progress);
    const encounter=state.move?.encounter;
    if(state.phase==='complete'){
      const arrival=instruction('p','小人正在迈出最后一步…','One last step…','maze-arrival-message');arrival.id='maze-arrival-message';arrival.hidden=true;const celebration=el('div',undefined,'maze-celebration');celebration.id='maze-celebration';if(newlyWon)celebration.classList.add('is-new-win');celebration.append(el('div','🏆 ✨','maze-trophy'),instruction('h4','观察 + 认字，找到出口！','You found the exit!'));desk.append(arrival,celebration);
    }else{
      const prompt=el('div',undefined,'maze-read-prompt'),word=state.pendingIndex===null?null:state.cells[state.pendingIndex];
      if(encounter){
        const effect=mazeEncounters[encounter.kind];
        prompt.id='maze-encounter';prompt.dataset.kind=encounter.kind;prompt.setAttribute('role','status');
        const icon=el('span',effect.icon,'maze-encounter-icon');icon.setAttribute('aria-hidden','true');
        prompt.append(icon,instruction('strong',`${effect.name}！${effect.text}`,effect.english,'maze-encounter-result'));
      }else{
        prompt.append(word?instruction('span','请大声读出这个字','Read this character aloud.','maze-kicker'):instruction('span','先观察，再选择相邻格','Look, then choose a square next to you.','maze-kicker'));
        if(word){const han=el('strong',word.word);han.id='maze-read-word';prompt.append(han);if(model.showPinyin&&word.pinyin)prompt.append(el('small',word.pinyin,'maze-read-pinyin'));}else prompt.append(instruction('p','只走上下左右一格。走到死路，可以退回来。','Move one square up, down, left or right. Turn back at a dead end.'));
      }
      desk.append(prompt);
      const confirm=button('maze-confirm','读对了，前进一步','Correct! Move one step.',true),cancel=button('maze-cancel','先不走，重新选','Choose again');confirm.disabled=cancel.disabled=state.pendingIndex===null;desk.append(confirm,cancel);
    }
    layout.append(desk);host.append(layout);
    const controls=el('div',undefined,'maze-bottom-controls');controls.append(button('maze-restart','再走一张迷宫','Play another maze'));host.append(controls);
  }
  host.addEventListener('click',event=>{const b=event.target.closest('button');if(!b||b.disabled||!host.contains(b))return;if(b.dataset.mazeCell!==undefined){if(!sceneView?.isAnimating)dispatch('cell',Number(b.dataset.mazeCell));return;}const intent={'maze-start':'start','maze-confirm':'confirm','maze-cancel':'cancel','maze-restart':'restart'}[b.id];if(sceneView?.isAnimating&&['confirm','cancel'].includes(intent))return;if(intent)dispatch(intent);},{signal:controller.signal});
  host.addEventListener('keydown',event=>{
    if(event.repeat&&['Enter',' '].includes(event.key)){event.preventDefault();return;}
    if(!model.state||model.state.phase!=='play')return;const delta={ArrowUp:-9,ArrowDown:9,ArrowLeft:-1,ArrowRight:1}[event.key];if(delta!==undefined){event.preventDefault();if(!sceneView?.isAnimating)dispatch('cell',model.state.position+delta);}if(event.key==='Escape'&&!sceneView?.isAnimating)dispatch('cancel');
  },{signal:controller.signal});
  return {update(next){
    const focused=document.activeElement,hadFocus=host.contains(focused),focusId=hadFocus?focused.id:null,previous=model?.state;newlyWon=previous?.phase==='play'&&next.state?.phase==='complete'&&previous.grid===next.state.grid;model=next;host.replaceChildren();host.dataset.phase=next.state?.phase??'prepare';
    if(next.state){round();sceneView??=createMazeScene(sceneHost,boardHost,{onBusyChange:syncSceneControls,instructionHost:host,soundEnabled});sceneView.setActive(active);sceneView.update(next.state);syncSceneControls();}else{sceneView?.setActive(false);prepare();}
    if(hadFocus){const old=focusId?host.querySelector(`#${focusId}`):null;const target=sceneView?.isAnimating?sceneHost.querySelector('#maze-motion-status'):next.state&&next.state.pendingIndex!==null?host.querySelector('#maze-confirm'):old&&!old.disabled?old:host.querySelector('#maze-board,#maze-start');target?.focus();}
  },setSoundEnabled(value){soundEnabled=Boolean(value);sceneView?.setSoundEnabled(soundEnabled);},scene:{setActive(value){active=Boolean(value);sceneView?.setActive(active&&Boolean(model?.state));}},dispose(){controller.abort();sceneView?.dispose();host.replaceChildren();}};
}
