import {CAT_TRAIL,CLUES,KEY_SPOT,PAINTING_SPOT,RUG_CENTER,TRAY_SPOT,createEscape,resolveChoice,continueEscape,takeKey} from './room-escape-core.js';
import {createRoomScene} from './room-escape-scene.js';
import './room-escape.css';

const root=document.querySelector('#room-app');
const icon=(path,fill='none')=>`<svg viewBox="0 0 24 24" aria-hidden="true" fill="${fill}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
const symbols={
  back:icon('<path d="M19 12H5m6-6-6 6 6 6"/>'),
  reset:icon('<path d="M3 10a9 9 0 1 1 2 9m-2-14v5h5"/>'),
  full:icon('<path d="M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5"/>'),
  lock:icon('<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>'),
  key:icon('<circle cx="7.5" cy="8" r="4.5"/><path d="m11 11.5 8 8 2-2m-6-2 2-2"/>'),
  play:icon('<path d="M8 5v14l11-7z" fill="currentColor"/>'),
  next:icon('<path d="M5 12h14m-6-6 6 6-6 6"/>'),
  stand:icon('<circle cx="12" cy="4" r="2"/><path d="M12 7v8m-4-4 4-3 4 3m-4 4-3 6m3-6 3 6"/>'),
  sit:icon('<circle cx="9" cy="5" r="2"/><path d="M9 8v8h6v5m-6-9h5m-8 8h8"/>'),
  brush:icon('<path d="m4 18 9-9m-1-2 3-3 5 5-3 3zM13 10l-4 4m7-1-3 3m6-5-3 4"/>'),
  painting:icon('<rect x="2" y="4" width="20" height="16" rx="1.5" fill="#f0d19b"/><ellipse cx="12" cy="12" rx="7" ry="4.3" fill="#72a38a"/><ellipse cx="12" cy="12" rx="1.65" ry="1.2" fill="#eab777" stroke="none"/>'),
  tray:icon('<path d="M3 12h18l-2 6H5zm2-3h14"/>'),
  card:icon('<rect x="5" y="3" width="14" height="18" rx="2" fill="#d4bc99"/><path d="M8 9l8 3m-8 2 6 2"/>'),
  paw:icon('<path d="M8 17c0-3 2-5 4-5s4 2 4 5-2 3-4 2c-2 1-4 1-4-2z"/><circle cx="6" cy="10" r="1"/><circle cx="10" cy="6" r="1"/><circle cx="14" cy="6" r="1"/><circle cx="18" cy="10" r="1"/>'),
};
function firework(x,y,color,radius,delay){
  const rays=Array.from({length:14},(_,index)=>{
    const angle=index*Math.PI/7;
    const distance=radius*(index%3===0?.9:1);
    const dx=Math.cos(angle),dy=Math.sin(angle);
    return `<path d="M${(dx*distance*.31).toFixed(1)} ${(dy*distance*.31).toFixed(1)}L${(dx*distance*.8).toFixed(1)} ${(dy*distance*.8).toFixed(1)}"/><circle cx="${(dx*distance).toFixed(1)}" cy="${(dy*distance).toFixed(1)}" r="2.1" fill="currentColor" stroke="none"/>`;
  }).join('');
  return `<g transform="translate(${x} ${y})" style="color:${color}"><g class="room-burst" style="--burst-delay:${delay}ms" fill="none" stroke="currentColor" stroke-width="2.7" stroke-linecap="round">${rays}</g></g>`;
}
root.innerHTML=`
  <header class="room-header">
    <div class="room-heading">
      <a class="room-quiet" aria-label="返回情景探索" title="返回情景探索" href="./?mode=explore&amp;source=zhongwen&amp;stage=1&amp;lesson=3">${symbols.back}</a>
      <h1>密室逃脱</h1>
    </div>
    <div class="room-toolbar"><button type="button" id="room-reset" class="room-quiet" aria-label="重新开始" title="重新开始">${symbols.reset}</button><button type="button" id="room-fullscreen" class="room-quiet" aria-label="全屏" title="全屏">${symbols.full}</button></div>
  </header>
  <main class="room-game" aria-label="密室逃脱游戏">
    <div class="room-stage" id="room-stage">
      <div class="room-fallback" id="room-fallback" hidden>
        <svg viewBox="0 0 680 510" preserveAspectRatio="none" aria-label="密室平面图" role="img">
          <rect width="680" height="510" rx="18" fill="#c9d9bf"/>
          <rect x="38" y="32" width="604" height="370" rx="12" fill="#f6deb1" stroke="#9c6b4c" stroke-width="8"/>
          <path d="M54 89h572M54 145h572M54 201h572M54 257h572M54 313h572M54 369h572" stroke="#e2c393" stroke-width="2"/>
          <rect x="65" y="81" width="184" height="149" rx="7" fill="#bd895c" stroke="#956846" stroke-width="5"/>
          <path d="M120 228h77v81h-77z" fill="#d6a675" stroke="#966646" stroke-width="3"/><path d="M120 249h77m-77 20h77m-77 20h77" stroke="#946846" stroke-width="3"/>
          <ellipse cx="340" cy="256" rx="91" ry="61" fill="#79a48b" stroke="#47796a" stroke-width="5"/><ellipse id="room-flat-cushion" cx="340" cy="256" rx="25" ry="14" fill="#dbad76"/>
          <path d="M456 38v131h43m72 0h66" fill="none" stroke="#a47856" stroke-width="10"/>
          <rect x="435" y="388" width="87" height="26" rx="6" fill="#397366" stroke="#654a39" stroke-width="4"/>
          <g id="room-flat-box"><rect x="556" y="78" width="46" height="34" rx="7" fill="#ae754e" stroke="#754e37" stroke-width="4"/><path d="M556 91h46m-25 0v11" fill="none" stroke="#edbf70" stroke-width="4"/></g>
        </svg>
        <div id="room-flat-trail" class="room-flat-trail" aria-hidden="true" hidden></div>
        <span class="room-flat-actor" id="room-flat-player" aria-label="小朋友">🧒</span><span class="room-flat-actor" id="room-flat-cat" aria-label="猫咪">🐈</span>
        <span class="room-flat-actor" id="room-flat-key" aria-label="钥匙" hidden>🔑</span>
        <span class="room-flat-prop" id="room-flat-painting" aria-label="墙上的地毯画">${symbols.painting}</span>
        <span class="room-flat-prop" id="room-flat-tray" aria-label="托盘" hidden>${symbols.tray}</span>
        <span class="room-flat-prop" id="room-flat-card" aria-label="线索卡" hidden></span>
      </div>
      <div class="room-sr-only"><span id="room-view-label">3D 密室</span><span id="room-door-status">出口已锁</span></div>
      <div id="room-pins" class="room-pins"></div>
      <button type="button" id="room-key-pickup" class="room-key-pickup" aria-label="捡起木箱上的钥匙" title="捡起钥匙" hidden></button>
      <div id="room-stage-caption" class="room-stage-caption" aria-label="小朋友在说话" hidden>•••</div>
      <button type="button" id="room-check-door" class="room-quiet room-check-door" aria-label="试开出口" title="试开出口">${symbols.lock}</button>
      <svg id="room-fireworks" class="room-fireworks" viewBox="0 0 1000 620" preserveAspectRatio="none" aria-hidden="true" hidden>
        ${firework(235,148,'#ffe6a0',76,0)}${firework(710,106,'#ffc3d2',85,250)}${firework(460,80,'#a9eff5',58,540)}
      </svg>
    </div>
    <section class="room-panel" aria-label="当前汉字线索">
      <div class="room-panel-top"><span id="room-count">0 / 12</span><span class="room-items"><span id="room-brush-icon" role="img" aria-label="刷子" hidden>${symbols.brush}</span><span id="room-tray-icon" role="img" aria-label="托盘" hidden>${symbols.tray}</span><span id="room-key-icon" aria-hidden="true" hidden>${symbols.key}</span></span></div>
      <progress id="room-progress" value="0" max="12" aria-label="已完成的汉字线索"></progress>
      <div class="room-clue" aria-live="polite" aria-atomic="true">
        <p id="room-pinyin" class="room-pinyin" hidden></p>
        <p id="room-glyph" class="room-glyph" hidden></p>
        <h2 id="room-intro">找钥匙</h2>
        <h2 id="room-win" hidden>逃脱成功！</h2>
        <p id="room-prompt" class="room-sr-only">和猫咪一起读线索，找到钥匙，打开出口。</p>
      </div>
      <p id="room-feedback" class="room-sr-only" role="status"></p>
      <span id="room-signal" class="room-signal" aria-hidden="true" hidden></span>
      <div id="room-choices" class="room-choices" hidden></div>
      <button type="button" id="room-advance" class="room-primary">开始探索</button>
      <div class="room-panel-foot"><span id="room-inventory" class="room-sr-only">还没找到钥匙</span><button type="button" id="room-hint" class="room-quiet" aria-label="看拼音" title="看拼音" hidden>ā</button></div>
    </section>
  </main>
  <details class="room-guide">
    <summary>教师用法</summary>
    <p><strong>老师：</strong>先请学生读字，再点场景里的圆点或动作图标。数字键 1、2、3 也可选择。左右以画面为准，出入以门为界，来去以气泡旁的小朋友为参照。点 ā 显示拼音。</p>
    <p><strong>学生：</strong>轮流认读并选择。找到钥匙后读最后一条线索，通关后用「上台阶」「走进去」「走出来」复述路线。</p>
  </details>`;

const $=id=>document.getElementById(`room-${id}`);
const motionPreference=window.matchMedia('(prefers-reduced-motion: reduce)');
let state=createEscape();
let started=false,moving=false,showHint=false,notice='',generation=0;
let scene;

function flatProject({x,y,z}){
  return {left:50+x*7.8,top:42+z*9.8-y*4.2};
}
function project(point){return scene?scene.project(point):flatProject(point);}
function position(node,point){
  const {left,top}=project(point);
  node.style.left=`${left}%`;node.style.top=`${top}%`;
}
function projectOverlays(){
  for(const pin of $('pins').children){
    const index=Number(pin.dataset.pin);
    const target=CLUES[state.index].choices[index]?.pin;
    if(!target)continue;
    pin.classList.toggle('room-pin-neutral',[1,2,4].includes(state.index));
    if(state.index===11&&index===1)position(pin,{...target,y:1,z:3.48});
    else position(pin,target);
  }
  if(!$('stage-caption').hidden)position($('stage-caption'),{...state.player,y:state.player.y+1.44});
  if(!$('key-pickup').hidden)position($('key-pickup'),scene?{...KEY_SPOT,y:KEY_SPOT.y-.28}:KEY_SPOT);
}
function draw(snapshot=state,animation){
  if(scene)scene.draw(snapshot,{intro:!started,...animation});
  else{
    position($('flat-player'),snapshot.player);position($('flat-cat'),snapshot.cat);
    $('flat-player').classList.toggle('is-seated',snapshot.player.pose==='sit');
    $('flat-key').hidden=snapshot.key!=='found';
    const overhead=snapshot.index===4&&snapshot.phase==='clue';
    $('flat-cushion').style.display=overhead?'none':'';
    const trail=$('flat-trail');
    trail.hidden=snapshot.index!==9&&(snapshot.index!==8||snapshot.phase!=='solved');
    if(!trail.hidden&&!trail.firstChild){
      for(let i=1;i<9;i++){
        const print=document.createElement('span');
        print.innerHTML=symbols.paw;
        trail.append(print);
        position(print,traverse(CAT_TRAIL,i/9).at);
      }
    }
    position($('flat-key'),KEY_SPOT);
    $('flat-tray').hidden=snapshot.tools.includes('tray');
    position($('flat-painting'),PAINTING_SPOT);
    position($('flat-tray'),TRAY_SPOT);
    const card=$('flat-card');
    card.hidden=overhead||snapshot.index<4||snapshot.index>7;
    card.innerHTML=snapshot.rugClue==='revealed'?symbols.paw:symbols.card;
    const holding=snapshot.rugClue!=='covered';
    position(card,holding?{...snapshot.player,x:snapshot.player.x+.38,y:snapshot.player.y+.4}:{...RUG_CENTER,z:RUG_CENTER.z+.52});
    $('fallback').classList.toggle('room-flat-open',snapshot.doorOpen);
  }
}
function activateFallback(){
  scene=null;
  $('stage').querySelector('canvas')?.remove();
  $('fallback').hidden=false;$('view-label').textContent='平面图';
  draw();projectOverlays();
}
try{scene=createRoomScene($('stage'),projectOverlays);}catch{scene=null;}
if(scene)$('stage').querySelector('canvas').addEventListener('webglcontextlost',event=>{event.preventDefault();activateFallback();});
else activateFallback();

function makeChoice(label,index,{pin=false}={}){
  const button=document.createElement('button');
  button.type='button';button.className=pin?'room-pin':'room-choice';
  button.dataset.choice=index;
  button.setAttribute('aria-label',label);
  if(pin)button.dataset.pin=index;
  else button.innerHTML=index===1?symbols.sit:symbols.stand;
  const direction=CLUES[state.index].directions?.[index];
  if(direction)button.setAttribute('aria-description',direction);
  button.onclick=()=>choose(index);
  return button;
}
function signal(mark=''){
  $('signal').textContent=mark;
  $('signal').hidden=!mark;
}
function render({focus=false,redraw=true}={}){
  const clue=CLUES[state.index];
  const escaped=state.phase==='escaped';
  const questioning=started&&state.phase==='clue'&&!moving;
  const revealed=started&&state.phase!=='clue'&&!moving;
  $('count').textContent=`${started?state.index+1:0} / ${CLUES.length}`;
  $('progress').value=started?state.index+(revealed?1:0):0;
  $('intro').hidden=started;
  $('win').hidden=!escaped||moving;
  $('fireworks').toggleAttribute('hidden',!escaped||moving);
  $('key-pickup').hidden=state.phase!=='key'||moving;
  $('glyph').hidden=!started||escaped;
  $('glyph').textContent=started&&!escaped?clue.char:'';
  $('pinyin').hidden=!started||escaped||!showHint;
  $('pinyin').textContent=$('pinyin').hidden?'':clue.pinyin;
  $('prompt').textContent=!started?'和猫咪一起读线索，找到钥匙，打开出口。':escaped?'用「走进去」「走出来」说一说刚才的路线。':moving?'看它怎么行动。':questioning?clue.prompt:state.phase==='key'?'木箱打开了。先拿起钥匙。':'读一读这个字，再看下一条线索。';
  $('feedback').textContent=notice||(!moving?state.feedback:'');
  signal(revealed&&state.phase==='solved'?'✓':'');
  $('choices').hidden=!questioning||clue.choices.some(option=>option.at);
  $('choices').replaceChildren();$('pins').replaceChildren();
  if(questioning)clue.choices.forEach((option,index)=>{
    const parent=option.at?$('pins'):$('choices');
    parent.append(makeChoice(option.label,index,{pin:!!option.at}));
  });
  $('advance').hidden=questioning;
  $('advance').disabled=moving;
  const action=!started?'开始探索':moving?'正在行动…':escaped?'再玩一次':state.phase==='key'?'拿起钥匙':'下一条线索';
  $('advance').setAttribute('aria-label',action);$('advance').title=action;
  $('advance').innerHTML=!started?symbols.play:escaped?symbols.reset:state.phase==='key'?symbols.key:symbols.next;
  $('hint').hidden=!questioning;
  $('hint').disabled=showHint;
  $('check-door').disabled=moving||escaped;
  $('check-door').hidden=started&&state.phase!=='key';
  $('door-status').textContent=state.doorOpen&&!moving?'出口已打开':'出口已锁';
  $('inventory').textContent=state.key==='held'?'🔑 钥匙已拿到':state.key==='found'&&!moving?'🔑 钥匙已找到':'🔒 还没找到钥匙';
  $('key-icon').hidden=state.key!=='held';
  $('brush-icon').hidden=!state.tools.includes('brush')||state.rugClue==='revealed';
  $('tray-icon').hidden=!state.tools.includes('tray')||state.rugClue==='revealed';
  $('stage-caption').hidden=!questioning||clue.actor!=='cat';
  if(redraw)draw();
  projectOverlays();
  if(focus)(questioning?root.querySelector('[data-choice]'):$('advance'))?.focus({preventScroll:true});
}

function traverse(points,ratio){
  const distances=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.y-points[i].y,p.z-points[i].z));
  const total=distances.reduce((sum,d)=>sum+d,0);
  let position=total*ratio;
  for(let i=0;i<distances.length;i++){
    const segment=distances[i];
    if(segment===0)continue;
    if(position<=segment||i===distances.length-1){
      const start=points[i],end=points[i+1],t=Math.min(1,position/segment);
      return {at:{x:start.x+(end.x-start.x)*t,y:start.y+(end.y-start.y)*t,z:start.z+(end.z-start.z)*t,pose:'stand'},angle:Math.atan2(end.x-start.x,end.z-start.z)};
    }
    position-=segment;
  }
  return {at:points.at(-1)};
}
function choose(index){
  if(!started||moving)return;
  const previous=state;
  const next=resolveChoice(previous,index);
  if(next===previous)return;
  state=next;notice='';
  if(next.phase==='clue'){
    $('feedback').textContent=next.feedback;
    signal('↺');
    return;
  }
  const cleaning=previous.rugClue==='inspected'&&next.rugClue==='revealed';
  if((!next.travel.length&&!cleaning)||motionPreference.matches||!scene){render({focus:true});return;}
  moving=true;render({redraw:false});
  const token=++generation;
  const actor=CLUES[next.index].actor??'player';
  const route=[previous[actor],...next.travel];
  const catMoving=actor==='player'&&previous.cat!==next.cat;
  const catRoute=catMoving?[previous.cat,{x:3.85,y:0,z:-.45},...(next.doorOpen?next.travel.slice(1,-1):[]),next.cat]:null;
  const length=route.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-route[i].x,p.z-route[i].z),0);
  const lookingLeft=next.index===1;
  const lookingRight=next.index===2;
  const duration=cleaning?1550:lookingLeft?1350:lookingRight?860:Math.min(1900,Math.max(430,length*190));
  let begin;
  function frame(time){
    if(token!==generation)return;
    begin??=time;
    const ratio=Math.min(1,(time-begin)/duration);
    if(cleaning)draw({...previous,player:next.player},{cleaning:ratio});
    else{
      const walking=lookingLeft?Math.min(1,ratio/.56):ratio;
      const move=traverse(route,walking);
      const snapshot={...previous,[actor]:move.at};
      if(catMoving)snapshot.cat=traverse(catRoute,ratio).at;
      const turn=Math.min(1,ratio/.28);
      const angle=lookingLeft?Math.PI*(1+turn/2):lookingRight?Math.PI*(turn-.5):move.angle;
      draw(snapshot,{actor:lookingLeft&&walking===1?undefined:actor,angle,beat:walking*length*7,catMoving,travelProgress:ratio,doorAngle:next.doorOpen?1.35*Math.max(0,Math.min(1,(ratio-.63)*8)):0});
    }
    if(ratio<1)requestAnimationFrame(frame);
    else {moving=false;render({focus:true});}
  }
  requestAnimationFrame(frame);
}

function reset({begin=false}={}){
  generation++;state=createEscape();started=begin;moving=false;showHint=false;notice='';
  render({focus:true});
}
$('advance').onclick=()=>{
  if(moving)return;
  if(!started||state.phase==='escaped'){reset({begin:true});return;}
  state=state.phase==='key'?takeKey(state):continueEscape(state);
  showHint=false;notice='';render({focus:true});
};
$('key-pickup').onclick=()=>{
  if(state.phase==='key'&&!moving)$('advance').click();
};
$('reset').onclick=()=>reset();
$('hint').onclick=()=>{
  if(!started||moving||state.phase!=='clue')return;
  showHint=true;$('pinyin').textContent=CLUES[state.index].pinyin;$('pinyin').hidden=false;$('hint').disabled=true;
  root.querySelector('[data-choice]')?.focus({preventScroll:true});
};
$('check-door').onclick=()=>{
  if(moving||state.doorOpen)return;
  notice=state.key==='found'?'门锁着。先拿起钥匙。':state.key==='held'?'钥匙有了。读最后一条线索，选出口的方向。':'门锁着。先找到钥匙。';
  $('feedback').textContent=notice;
  signal('🔒');
};
if(!document.fullscreenEnabled)$('fullscreen').hidden=true;
$('fullscreen').onclick=async()=>{
  try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}
  catch{$('fullscreen').hidden=true;}
};
document.addEventListener('fullscreenchange',()=>{
  const label=document.fullscreenElement?'退出全屏':'全屏';
  $('fullscreen').setAttribute('aria-label',label);$('fullscreen').title=label;
});
document.addEventListener('keydown',event=>{
  if(event.repeat||event.altKey||event.ctrlKey||event.metaKey||moving||!started||state.phase!=='clue')return;
  if(/^Digit[1-3]$/.test(event.code))choose(Number(event.code.at(-1))-1);
});
render();
