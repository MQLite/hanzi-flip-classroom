import {CLUES,createEscape,resolveChoice,continueEscape,takeKey} from './room-escape-core.js';
import {createRoomScene} from './room-escape-scene.js';
import './room-escape.css';

const root=document.querySelector('#room-app');
root.innerHTML=`
  <header class="room-header">
    <div>
      <a class="room-return" href="./?mode=explore&amp;source=zhongwen&amp;stage=1&amp;lesson=3">返回情景探索</a>
      <p class="room-kicker">识字（三） · 第二课时</p>
      <h1>密室逃脱</h1>
    </div>
    <div class="room-toolbar"><button type="button" id="room-reset" class="room-quiet">重新开始</button><button type="button" id="room-fullscreen" class="room-quiet">全屏</button></div>
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
          <ellipse cx="340" cy="265" rx="80" ry="48" fill="#79a48b" stroke="#47796a" stroke-width="5"/><ellipse cx="340" cy="265" rx="25" ry="14" fill="#dbad76"/>
          <path d="M456 38v131h43m72 0h66" fill="none" stroke="#a47856" stroke-width="10"/>
          <text x="535" y="65" text-anchor="middle">储物间</text><text x="158" y="108" text-anchor="middle">木台</text>
          <rect x="435" y="388" width="87" height="26" rx="6" fill="#397366" stroke="#654a39" stroke-width="4"/>
          <text x="478" y="435" text-anchor="middle">出口</text>
          <g id="room-flat-box"><rect x="556" y="78" width="46" height="34" rx="7" fill="#ae754e" stroke="#754e37" stroke-width="4"/><path d="M556 91h46m-25 0v11" fill="none" stroke="#edbf70" stroke-width="4"/></g>
        </svg>
        <span class="room-flat-actor" id="room-flat-player" aria-label="小朋友">🧒</span><span class="room-flat-actor" id="room-flat-cat" aria-label="猫咪">🐈</span>
        <span class="room-flat-actor" id="room-flat-key" aria-label="钥匙" hidden>🔑</span>
      </div>
      <div class="room-stage-toolbar"><span id="room-view-label" class="room-chip">3D 密室</span><span id="room-door-status" class="room-chip">出口已锁</span></div>
      <div id="room-pins" class="room-pins"></div>
      <div id="room-stage-caption" class="room-stage-caption" hidden>小朋友在这里说话</div>
      <button type="button" id="room-check-door" class="room-quiet room-check-door">试开出口</button>
    </div>
    <section class="room-panel" aria-label="当前汉字线索">
      <div class="room-panel-top"><span id="room-stage-label">任务</span><span id="room-count">0 / 12</span></div>
      <progress id="room-progress" value="0" max="12" aria-label="已完成的汉字线索"></progress>
      <div class="room-clue" aria-live="polite" aria-atomic="true">
        <p id="room-pinyin" class="room-pinyin" hidden></p>
        <p id="room-glyph" class="room-glyph" hidden></p>
        <h2 id="room-intro">门锁住了！</h2>
        <h2 id="room-win" hidden>逃脱成功！</h2>
        <p id="room-prompt" class="room-prompt">和猫咪一起读线索，找到钥匙，打开出口。</p>
      </div>
      <p id="room-feedback" class="room-feedback" role="status"></p>
      <div id="room-choices" class="room-choices" hidden></div>
      <button type="button" id="room-advance" class="room-primary">开始探索</button>
      <div class="room-panel-foot"><span id="room-inventory">🔒 还没找到钥匙</span><button type="button" id="room-hint" class="room-quiet" hidden>看拼音</button></div>
    </section>
  </main>
  <details class="room-guide">
    <summary>教师用法</summary>
    <p><strong>老师：</strong>先请学生读字、指方向或示范动作，再选 A 或 B。左右以画面为准，出入以门为界，来去以说话的小朋友为参照。</p>
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
    const target=CLUES[state.index].choices[Number(pin.dataset.pin)]?.at;
    if(target)position(pin,target);
  }
  if(!$('stage-caption').hidden)position($('stage-caption'),{...state.player,y:state.player.y+1.44});
}
function draw(snapshot=state,animation){
  if(scene)scene.draw(snapshot,animation);
  else{
    position($('flat-player'),snapshot.player);position($('flat-cat'),snapshot.cat);
    $('flat-player').classList.toggle('is-seated',snapshot.player.pose==='sit');
    $('flat-key').hidden=snapshot.key!=='found';
    position($('flat-key'),{x:4.56,y:.5,z:-2.48});
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
  const letter=index===0?'A':'B';
  if(pin){button.dataset.pin=index;button.textContent=letter;button.tabIndex=-1;button.setAttribute('aria-label',`${letter} ${label}`);}
  else{
    button.dataset.choice=index;
    const badge=document.createElement('span');badge.className='room-choice-letter';badge.textContent=letter;
    button.append(badge,document.createTextNode(label));
  }
  const direction=CLUES[state.index].directions?.[index];
  if(direction)button.setAttribute('aria-description',direction);
  button.onclick=()=>choose(index);
  return button;
}
function render({focus=false,redraw=true}={}){
  const clue=CLUES[state.index];
  const escaped=state.phase==='escaped';
  const questioning=started&&state.phase==='clue'&&!moving;
  const revealed=started&&state.phase!=='clue'&&!moving;
  $('stage-label').textContent=escaped?'任务完成':started?'汉字线索':'任务';
  $('count').textContent=`${started?state.index+1:0} / ${CLUES.length}`;
  $('progress').value=started?state.index+(revealed?1:0):0;
  $('intro').hidden=started;
  $('win').hidden=!escaped||moving;
  $('glyph').hidden=!started||escaped;
  $('glyph').textContent=started&&!escaped?clue.char:'';
  $('pinyin').hidden=!started||escaped||!(showHint||revealed);
  $('pinyin').textContent=$('pinyin').hidden?'':clue.pinyin;
  $('prompt').textContent=!started?'和猫咪一起读线索，找到钥匙，打开出口。':escaped?'用「走进去」「走出来」说一说刚才的路线。':moving?'看它怎么行动。':questioning?clue.prompt:state.phase==='key'?'木箱打开了。先拿起钥匙。':'读一读这个字，再看下一条线索。';
  $('feedback').textContent=notice||(!moving?state.feedback:'');
  $('choices').hidden=!questioning;
  $('choices').replaceChildren();$('pins').replaceChildren();
  if(questioning)clue.choices.forEach((option,index)=>{
    $('choices').append(makeChoice(option.label,index));
    if(option.at)$('pins').append(makeChoice(option.label,index,{pin:true}));
  });
  $('advance').hidden=questioning;
  $('advance').disabled=moving;
  $('advance').textContent=!started?'开始探索':moving?'正在行动…':escaped?'再玩一次':state.phase==='key'?'拿起钥匙':'下一条线索';
  $('hint').hidden=!questioning;
  $('hint').disabled=showHint;
  $('check-door').disabled=moving||escaped;
  $('door-status').textContent=state.doorOpen&&!moving?'出口已打开':'出口已锁';
  $('inventory').textContent=state.key==='held'?'🔑 钥匙已拿到':state.key==='found'&&!moving?'🔑 钥匙已找到':'🔒 还没找到钥匙';
  $('stage-caption').hidden=!questioning||clue.actor!=='cat';
  if(redraw)draw();
  projectOverlays();
  if(focus)(questioning?$('choices').firstElementChild:$('advance'))?.focus({preventScroll:true});
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
    return;
  }
  if(!next.travel.length||motionPreference.matches||!scene){render({focus:true});return;}
  moving=true;render({redraw:false});
  const token=++generation;
  const actor=CLUES[next.index].actor??'player';
  const route=[previous[actor],...next.travel];
  const catMoving=actor==='player'&&previous.cat!==next.cat;
  const catRoute=catMoving?[previous.cat,{x:3.85,y:0,z:-.45},...(next.doorOpen?next.travel.slice(1,-1):[]),next.cat]:null;
  const length=route.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-route[i].x,p.z-route[i].z),0);
  const duration=Math.min(1900,Math.max(430,length*190));
  let begin;
  function frame(time){
    if(token!==generation)return;
    begin??=time;
    const ratio=Math.min(1,(time-begin)/duration);
    const move=traverse(route,ratio);
    const snapshot={...previous,[actor]:move.at};
    if(catMoving)snapshot.cat=traverse(catRoute,ratio).at;
    draw(snapshot,{actor,angle:move.angle,beat:ratio*length*7,catMoving,doorAngle:next.doorOpen?1.35*Math.max(0,Math.min(1,(ratio-.63)*8)):0});
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
$('reset').onclick=()=>reset();
$('hint').onclick=()=>{
  if(!started||moving||state.phase!=='clue')return;
  showHint=true;$('pinyin').textContent=CLUES[state.index].pinyin;$('pinyin').hidden=false;$('hint').disabled=true;
  $('choices').firstElementChild?.focus({preventScroll:true});
};
$('check-door').onclick=()=>{
  if(moving||state.doorOpen)return;
  notice=state.key==='found'?'门锁着。先拿起钥匙。':state.key==='held'?'钥匙有了。读最后一条线索，选出口的方向。':'门锁着。先找到钥匙。';
  $('feedback').textContent=notice;
};
if(!document.fullscreenEnabled)$('fullscreen').hidden=true;
$('fullscreen').onclick=async()=>{
  try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}
  catch{$('fullscreen').hidden=true;}
};
document.addEventListener('fullscreenchange',()=>{$('fullscreen').textContent=document.fullscreenElement?'退出全屏':'全屏';});
document.addEventListener('keydown',event=>{
  if(event.repeat||event.altKey||event.ctrlKey||event.metaKey||moving||!started||state.phase!=='clue')return;
  if(event.code==='Digit1'||event.code==='Digit2')choose(event.code==='Digit1'?0:1);
});
render();
