import './poetry-quest.css';
import {createQuest,inspectObject,solvePuzzle,deliverLetter,requestHint,restoreQuest,getProgress,isUnlocked,QUEST_STORAGE_KEY} from './poetry-quest-core.js';
import {PUZZLES,POEMS,WORDS,ITEMS} from './poetry-quest-content.js';
import {roomArt,itemIcon} from './poetry-quest-art.js';

const root=document.querySelector('#quest-app');
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let saved=null,state=null,active=null,selectedLetter=null,itemView=null;
let support=true,saveNote='',feedback=null;
let drafts={};
let renderedPanelKey=null,lastObject='wardrobe';
try{
  const raw=window.localStorage.getItem(QUEST_STORAGE_KEY);
  if(raw){saved=restoreQuest(raw);if(!saved)saveNote='上次记录未能恢复，可以重新探索。';}
}catch{saveNote='此浏览器暂时不能保存进度，本次仍可继续。';}

function persist(){
  saved=state;
  try{window.localStorage.setItem(QUEST_STORAGE_KEY,JSON.stringify(state));}
  catch{saveNote='此浏览器暂时不能保存进度，本次仍可继续。离开页面后需重新开始。';}
}
function header(playing){return `<header class="quest-header">
  <a class="quest-home" href="./"><span class="quest-brand">字</span><span>汉字奇遇岛 <small> / 古诗解谜档案</small></span></a>
  <nav class="quest-header-tools" aria-label="探索工具">
    ${playing?`<span class="quest-saved-tag">${state.mode==='challenge'?'独立挑战':'带提示探索'}</span><button class="q-btn q-btn--plain" id="quest-support" data-action="support" aria-pressed="${support}">词语提示${support?'开':'关'}</button><button class="q-btn" id="quest-book" data-action="book">诗集</button>`:''}
    <button class="q-btn q-btn--plain" data-action="help">玩法</button>
    ${playing?'<button class="q-btn q-btn--plain" id="quest-reset" data-action="reset">重来</button>':''}
  </nav></header>`;}

function landing(){return `${header(false)}<main class="quest-intro">
  <div class="quest-intro-art">${roomArt()}</div><div class="quest-intro-content">
    <span class="quest-kicker">THE LETTERS LEFT BEHIND</span><h1 class="quest-title">旧屋里的两封信</h1>
    <p class="quest-intro-story">一件没缝完的旧衣，一面映着岁月的镜子。<br>屋里有两封未寄出的信。<br>读懂留下的字句，找回记忆，把心意送到。</p>
    <p class="quest-intro-rule">观察物件 · 收集线索 · 组合与推理<br>约10-15分钟，可随时暂停。没有倒计时。</p>
    <div class="quest-start-options"><button class="quest-start-option" data-action="start" data-mode="guided" aria-label="带提示探索" aria-describedby="guided-description"><strong>带提示探索</strong><span id="guided-description">词义与读音提示陪你找线索<br>适合合作讨论</span></button><button class="quest-start-option" data-action="start" data-mode="challenge" aria-label="独立挑战" aria-describedby="challenge-description"><strong>独立挑战</strong><span id="challenge-description">为判断找到诗句依据<br>适合想多想一步的你</span></button></div>
    ${saved?`<button class="q-btn quest-continue" data-action="continue" aria-label="继续上次探索">继续上次探索<span class="quest-saved-tag"> · 已找回 ${getProgress(saved).done} / 5 段记忆</span></button>`:''}
    <p class="quest-intro-note">原创虚构故事，融入《游子吟》《回乡偶书》的诗意与汉字。<br>进度保存在当前浏览器；不需要账号。</p>
    <p id="quest-storage-note" class="quest-storage-note" role="status">${esc(saveNote)}</p>
  </div></main>`;}

const targets=[['wardrobe','衣柜',18,43],['desk','书桌',49,67],['mirror','旧镜',70,27],['door','门口',90,43],['mailbox','信箱',77,68]];
function inventory(){return `<div class="quest-inventory"><div class="quest-inventory-heading"><span>随身的线索</span><span>点选后读一读</span></div><div class="quest-inventory-slots">${Object.entries(ITEMS).map(([id,item])=>{
  const found=state.inventory.includes(id),letter=id.endsWith('Letter'),delivered=Boolean(state.deliveries[id]);
  return `<button class="quest-item ${found?'':'quest-item--empty'}" ${letter?`data-letter="${id}"`:`data-item="${id}"`} ${!found?'disabled':''} data-delivered="${delivered}" aria-pressed="${selectedLetter===id}" aria-label="${found?esc(item.name):'尚未找到的线索'}">${itemIcon(id)}<span><strong>${found?esc(item.name):'等待发现'}</strong><small>${delivered?'已经送达':found?'查看线索':'……'}</small></span></button>`;
}).join('')}</div></div>`;}

function optionGroup(field,label,options,{character=false}={}){
  const chosen=drafts[active]?.[field];
  return `<fieldset class="quest-options"><legend>${esc(label)}</legend><div class="quest-choice-row">${options.map(([value,name],i)=>`<button type="button" class="quest-choice ${character?'quest-choice--character':''}" id="choice-${active}-${field}-${i}" data-field="${field}" data-value="${esc(value)}" aria-pressed="${chosen===value}">${esc(name)}</button>`).join('')}</div></fieldset>`;
}
function puzzleFields(id){
  if(id==='wardrobe')return `<div class="quest-sewing-preview" aria-label="已选部件">${esc(drafts[id]?.left??'□')}<span>${esc(drafts[id]?.right??'□')}</span></div>`+
    optionGroup('left','左边的部件',[['氵','氵'],['纟','纟'],['讠','讠']],{character:true})+
    optionGroup('right','右边的部件',[['夆','夆'],['各','各'],['逢','逢']],{character:true})+
    optionGroup('reading','在这句诗里怎么读',[['fèng','fèng'],['féng','féng']]);
  if(id==='desk')return optionGroup('feeling','便笺里最深的牵挂',[['pride','衣服比别人的好看'],['worry','游子很久不能归来'],['hurry','希望游子早些离家']])+
    optionGroup('evidence','与牵挂相应的诗句',[['thread','慈母手中线'],['late','意恐迟迟归'],['shirt','游子身上衣']]);
  if(id==='mirror')return optionGroup('unchanged','哪一样没有改变',[['hair','鬓边的头发'],['accent','家乡的口音'],['age','离家时的年纪']])+
    optionGroup('changed','哪一样留下了岁月的变化',[['accent','乡音'],['hair','鬓边的头发'],['home','从未住过的地方']]);
  if(id==='door')return optionGroup('self','在老人自己的记忆里，他是',[['tourist','初次到访的游人'],['home','久别归来的家乡人'],['child','还没离家的孩子']])+
    optionGroup('children','在眼前孩子的认识里，他是',[['friend','从小熟悉的朋友'],['guest','不认识的客人'],['teacher','每天见面的老师']])+
    (state.mode==='challenge'?optionGroup('evidence','孩子为什么这样称呼他？找文字依据',[['hair','鬓毛衰'],['voice','乡音无改'],['unknown','儿童相见不相识']]):'');
  return '';
}
function wordSupport(id){
  if(!support)return '';
  const indices=['wardrobe','desk'].includes(id)?[0,1,2,3]:[4,5];
  return `<div class="quest-pinyin">${indices.map(i=>`${esc(WORDS[i][0])} ${esc(WORDS[i][1])}：${esc(WORDS[i][2])}`).join('<br>')}</div>`;
}
function bookPanel(){return `<div class="quest-panel-top"><span>藏在字句里的记忆</span><button class="quest-return-room" data-action="room">回到房间 ↑</button></div><h2>旧屋里的诗集</h2><p class="quest-panel-subtitle">需要时再翻开，线索都在诗里。</p>${POEMS.map(poem=>`<section class="quest-poem"><h3>${poem.title}</h3><p class="author">唐 · ${poem.author}</p>${poem.lines.map(line=>`<div class="quest-poem-line">${line}</div>`).join('')}<p class="quest-poem-note">${poem.note}</p></section>`).join('')}${support?`<div class="quest-pinyin">${WORDS.map(word=>`${word[0]} ${word[1]}：${word[2]}`).join('<br>')}</div>`:''}<button class="q-btn q-btn--light quest-open-book" data-action="room">继续观察房间</button>`;}
function helpPanel(){return `<div class="quest-panel-top"><span>写给探索者</span><button class="quest-return-room" data-action="room">回到房间 ↑</button></div><h2>怎样找回两封信</h2><ol class="quest-help"><li>点衣柜、书桌、旧镜或门口，仔细读留下的文字。</li><li>结合诗句选部件、转动记忆盘、分辨人物视角。选择后点“解开这段记忆”。</li><li>针线可以通向家书，旧镜可以通向归乡。两条路都能先探索。</li><li>卡住时点“给我一点提示”，最多展开两步提示。不会扣分。</li><li>收齐两封信，在信箱先选信，再点收信处。</li></ol><p class="quest-narrative">可以一个人慢慢找，也可以6人分两组，每组轮流观察、阅读和解释依据。</p><p class="quest-panel-subtitle">故事为原创虚构。诗句来自两首古诗，不表示诗人在同一间屋子里留下真实书信。</p><button class="q-btn q-btn--light quest-open-book" data-action="room">回到探索</button>`;}
function completePanel(){return `<section id="quest-complete" class="quest-complete"><div class="quest-panel-top"><span>探索完成</span><span>05 / 05</span></div><div class="quest-seal">归</div><h2>两封信，都已送达</h2><p class="quest-narrative">一封写给临行时的牵挂，<br>一封写给久别后的故乡。<br>旧屋里的灯，终于亮了。</p><p class="quest-poem-note">说给伙伴听：哪一处线索改变了你的判断？指一指支持你的诗句。</p><div class="quest-end-actions"><button class="q-btn q-btn--primary" data-action="book">再读两首诗</button><button class="q-btn q-btn--light" data-action="review">回看收集的记忆</button><a class="q-btn q-btn--light" href="./">返回汉字奇遇岛</a></div><p class="quest-poem-note">如果已经很熟悉，可以暂时合上诗集，试着背给伙伴听。</p></section>`;}
function panel(){
  if(active==='book')return bookPanel();
  if(active==='help')return helpPanel();
  if(itemView){const item=ITEMS[itemView];const canPost=itemView.endsWith('Letter')&&isUnlocked(state,'mailbox')&&!state.deliveries[itemView];return `<div class="quest-panel-top"><span>随身的线索</span><button class="quest-return-room" data-action="room">回到房间 ↑</button></div><h2>${item.name}</h2><div class="quest-recovered">${itemIcon(itemView)}<span>${item.mark}</span></div><p class="quest-narrative">${item.detail}</p>${canPost?`<button class="q-btn q-btn--primary quest-open-book" data-action="post" data-value="${itemView}">拿去信箱投递</button>`:''}<button class="q-btn q-btn--light quest-open-book" data-action="room">继续观察房间</button>`;}
  if(!active)return `<div class="quest-panel-top"><span>一间旧屋 · 两段旅程</span><span class="quest-panel-number">序</span></div><h2>先从哪里找起？</h2><p class="quest-panel-subtitle">观察是一切线索的开始。</p><p class="quest-narrative">衣柜里有一件旧衣，旧镜里有一条归路。你可以选择任意一处先看。</p><p class="quest-verse">临行时，谁在牵挂？<br>归来时，谁还认得？</p><p class="quest-poem-note">点击场景中的物件，读一读它留下的文字。五段记忆将帮助你找齐两封信。</p><button class="q-btn q-btn--light quest-open-book" data-action="book">先翻翻诗集</button>`;
  if(active==='mailbox'&&getProgress(state).complete)return completePanel();
  const puzzle=PUZZLES[active];
  let html=`<div class="quest-panel-top"><span>${puzzle.place} · 记忆档案</span><span class="quest-panel-number">${puzzle.number}</span><button class="quest-return-room" data-action="room">回到房间 ↑</button></div><h2>${puzzle.title}</h2><p class="quest-panel-subtitle">${puzzle.subtitle}</p>`;
  if(!isUnlocked(state,active))return html+`<p class="quest-narrative">${active==='desk'?'先找回衣柜里的针线记忆，家书才能展开。':active==='door'?'先去旧镜前找出变化与不变，再来听孩子的问话。':'还有记忆没有找齐。先看看书桌与门口，找到两封信。'}</p><button class="q-btn q-btn--light quest-open-book" data-action="room">继续寻找线索</button>`;
  if(state.solved.includes(active)){
    const itemId={wardrobe:'needle',desk:'motherLetter',mirror:'route',door:'homeLetter'}[active];
    return html+`<div class="quest-recovered">${itemIcon(itemId)}<span>这段记忆已经找回</span></div><p class="quest-narrative">${puzzle.after}</p>${puzzle.verse?`<p class="quest-verse">${puzzle.verse}</p>`:''}${feedback?.message?`<p id="quest-feedback" class="quest-feedback" data-ok="true" role="status">${esc(feedback.message)}</p>`:''}<button class="q-btn q-btn--light quest-open-book" data-action="room">继续寻找线索</button>`;
  }
  html+=`<p class="quest-narrative">${puzzle.narrative}</p>`;
  if(puzzle.verse)html+=`<p class="quest-verse">${puzzle.verse}</p>`;
  html+=wordSupport(active);
  if(active==='mailbox'){
    const selected=selectedLetter?ITEMS[selectedLetter]:null;
    html+=`<p class="quest-selected-letter">${selected?`已选：${selected.name}<br>${selected.detail}`:'先点选下方线索栏中的一封信。'}</p><div class="quest-destinations"><button class="quest-destination" data-recipient="mother" ${!selected||state.deliveries[selectedLetter]?'disabled':''}>母亲<span>临行的牵挂</span></button><button class="quest-destination" data-recipient="home" ${!selected||state.deliveries[selectedLetter]?'disabled':''}>故乡<span>久别的归来</span></button></div>`;
  }else html+=puzzleFields(active)+`<button class="q-btn q-btn--primary quest-check" id="quest-check" data-action="check">解开这段记忆</button>`;
  if(feedback?.message)html+=`<p id="quest-feedback" class="quest-feedback" data-ok="${feedback.ok}" role="status">${esc(feedback.message)}</p>`;
  const count=state.hints[active]??0;
  html+=`<button class="quest-hint-btn" id="quest-hint" data-action="hint" ${count===2?'disabled':''}>${count===0?'给我一点提示':count===1?'再给我一步提示':'两步提示已展开'}</button>${count?`<div class="quest-hints" id="quest-hints">${puzzle.hint.slice(0,count).map((text,i)=>`<p><span>${i+1}.</span>${text}</p>`).join('')}</div>`:''}`;
  return html;
}

function game(){const progress=getProgress(state);return `${header(true)}<main class="quest-game" data-complete="${progress.complete}"><div class="quest-game-heading"><div><span class="quest-kicker">中文五 · 第9课 · 古诗二首</span><h1 class="quest-title">旧屋里的两封信</h1></div><div class="quest-progress-wrap"><span class="quest-progress-label">已找回的记忆</span><strong id="quest-progress" aria-live="polite">${progress.done} / 5</strong><div class="quest-progress-track"><i style="width:${progress.done*20}%"></i></div></div></div>
<div class="quest-workspace"><section class="quest-room-wrap" aria-label="旧书房"><div class="quest-room" id="quest-room">${roomArt()}${targets.map(([id,label,x,y])=>`<button class="quest-object" data-object="${id}" data-solved="${state.solved.includes(id)}" data-active="${active===id}" aria-label="查看${label}" style="left:${x}%;top:${y}%">${label}${state.solved.includes(id)?' ✓':''}</button>`).join('')}</div><div class="quest-room-caption"><span>点击物件，看看它留下了什么。</span><span>两条线索，都能先探索。</span></div>${inventory()}</section>
<aside class="quest-inspector" id="quest-inspector" aria-label="物件与线索"><div class="quest-inspector-inner">${panel()}</div></aside></div><p id="quest-storage-note" class="quest-storage-note" role="status">${esc(saveNote)}</p><footer class="quest-footnote"><span>原创故事 · 诗意来自《游子吟》《回乡偶书》</span><span>不必赶路。先读懂，再出发。</span></footer></main>`;}
function render(){
  const oldInspector=document.getElementById('quest-inspector');
  const oldScroll=oldInspector?.scrollTop??0;
  const oldFocus=document.activeElement;
  const focusId=document.activeElement?.id;
  const windowY=window.scrollY;
  const key=state?`${active??'room'}/${itemView??''}/${state.solved.includes(active)?'solved':'open'}`:'landing';
  const samePanel=key===renderedPanelKey;
  root.innerHTML=`<div class="quest-shell">${state?game():landing()}</div>`;
  const inspector=document.getElementById('quest-inspector');
  const heading=inspector?.querySelector('h2');
  heading?.setAttribute('tabindex','-1');
  if(samePanel){
    const previous=focusId?document.getElementById(focusId):null;
    previous?.focus({preventScroll:true});
    if(!previous&&oldInspector?.contains(oldFocus))heading?.focus({preventScroll:true});
    if(inspector)inspector.scrollTop=oldScroll;
    if(window.innerWidth<=760)window.scrollTo({top:windowY,left:0,behavior:'instant'});
  }else if(state){
    if(inspector)inspector.scrollTop=0;
    const target=active||itemView?heading:document.querySelector(`[data-object="${lastObject}"]`);
    target?.focus({preventScroll:true});
  }
  renderedPanelKey=key;
}
function scrollPanel(){if(window.innerWidth<=760)requestAnimationFrame(()=>document.getElementById('quest-inspector')?.scrollIntoView({block:'start',behavior:'instant'}));}
function focusFeedback(){requestAnimationFrame(()=>{const node=document.getElementById('quest-feedback');if(node){node.setAttribute('tabindex','-1');node.focus({preventScroll:true});node.scrollIntoView({block:'nearest',behavior:'instant'});}});}
function openObject(id){
  active=id;lastObject=id;itemView=null;feedback=null;state=inspectObject(state,id);persist();render();scrollPanel();
}
function returnToRoom(){active=null;itemView=null;feedback=null;render();if(window.innerWidth<=760)document.getElementById('quest-room').scrollIntoView({block:'start',behavior:'instant'});}

root.addEventListener('click',event=>{
  const b=event.target.closest('button');if(!b||b.disabled)return;
  if(b.dataset.action==='start'){
    if(saved&&(getProgress(saved).done>0||saved.visited.length>0||Object.keys(saved.hints).length>0)&&!window.confirm('开始新探索会替换这次游戏已保存的进度，确定开始吗？'))return;
    state=createQuest({mode:b.dataset.mode});support=state.mode==='guided';active=null;drafts={};feedback=null;selectedLetter=null;itemView=null;persist();render();return;
  }
  if(b.dataset.action==='continue'){state=saved;support=state.mode==='guided';active=getProgress(state).complete?'mailbox':null;feedback=null;render();return;}
  if(b.dataset.action==='help'){
    if(!state){window.alert('点击物件观察线索，读诗句解开机关，最后把两封信送到对应的位置。可独立探索，也可合作讨论；需要时使用提示。');return;}
    active='help';itemView=null;feedback=null;render();scrollPanel();return;
  }
  if(!state)return;
  if(b.dataset.object){openObject(b.dataset.object);return;}
  if(b.dataset.item){itemView=b.dataset.item;active=null;feedback=null;render();scrollPanel();return;}
  if(b.dataset.letter){if(active==='mailbox'&&isUnlocked(state,'mailbox')&&!getProgress(state).complete){selectedLetter=b.dataset.letter;itemView=null;feedback=null;render();}else{itemView=b.dataset.letter;active=null;feedback=null;render();scrollPanel();}return;}
  if(b.dataset.recipient){const r=deliverLetter(state,selectedLetter,b.dataset.recipient);state=r.state;feedback=r;persist();render();focusFeedback();return;}
  if(b.dataset.field){drafts[active]={...drafts[active],[b.dataset.field]:b.dataset.value};feedback=null;render();return;}
  switch(b.dataset.action){
    case 'book':active='book';itemView=null;feedback=null;state=inspectObject(state,'book');persist();render();scrollPanel();break;
    case 'room':returnToRoom();break;
    case 'support':support=!support;render();break;
    case 'check':{const r=solvePuzzle(state,active,drafts[active]);state=r.state;feedback=r;persist();render();focusFeedback();break;}
    case 'post':selectedLetter=b.dataset.value;openObject('mailbox');break;
    case 'hint':state=requestHint(state,active);persist();render();break;
    case 'review':returnToRoom();break;
    case 'reset':if(window.confirm('重新探索会清空这次游戏的线索与投递进度，确定重新开始吗？')){state=createQuest({mode:state.mode});active=null;itemView=null;drafts={};selectedLetter=null;feedback=null;persist();render();}break;
  }
});
render();
