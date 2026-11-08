import {createPoisonAudio} from './poison-sound.js';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
function term(word,pinyin){
  const box=el('span',undefined,'poison-word'),han=el('strong',word.word,'poison-term');
  han.style.setProperty('--poison-size',`${word.word.length<=2?32:word.word.length<=4?27:word.word.length<=8?21:17}px`);box.append(han);
  if(pinyin&&word.pinyin)box.append(el('small',word.pinyin,'poison-pinyin'));return box;
}
export function createPoisonView(host,dispatch){
  let model={},key=null,cardNodes=[],controller=new AbortController(),active=false;const audio=createPoisonAudio();
  function button(id,label,kind=''){const b=el('button',label,kind);b.id=id;return b;}
  function heading(title,copy){const h=el('div',undefined,'poison-heading');h.append(el('span',model.state?`第${model.state.round}轮`:'准备本课词卡','poison-kicker'),el('h3',title),el('p',copy));return h;}
  function prepare(){
    host.replaceChildren();host.dataset.phase='prepare';key=null;cardNodes=[];
    host.append(heading('女巫的小药房','选好词语，再请一位小女巫偷偷藏毒。'));
    const layout=el('div',undefined,'poison-prep-layout'),left=el('section'),choices=el('div',undefined,'poison-choices');
    choices.setAttribute('role','group');choices.setAttribute('aria-label','选择本轮词卡');
    for(const word of model.pool.words){const b=el('button');b.dataset.poisonChoice=word.id;b.setAttribute('aria-pressed',String(model.selectedIds.includes(word.id)));b.append(term(word,model.showPinyin));choices.append(b);}
    left.append(el('p',model.pool.label,'poison-course'),choices);
    if(!model.pool.words.length)left.append(el('p','当前范围还没有可用词语，请换课或打开题库管理。','poison-empty'));
    const side=el('aside',undefined,'poison-guide'),label=el('label','本轮毒药数量'),select=el('select');select.id='poison-count';select.setAttribute('aria-label','本轮毒药数量');
    for(const n of [1,2]){const option=el('option',`${n} 个`);option.value=n;select.append(option);}select.value=model.poisonCount;label.append(select);side.append(label);
    const steps=el('ol');for(const line of ['其他同学闭眼，小女巫选毒药。','藏好后大家睁眼，轮流选词。','学生先读，老师点卡，立即出结果。','中毒就变身，再选择使用或跳过解药。'])steps.append(el('li',line));side.append(steps);
    side.append(el('p',model.pool.note,'poison-note'));const count=el('p',`已选 ${model.selectedIds.length} 张 · 可选2–16张`,'poison-selection-count');count.setAttribute('role','status');side.append(count);
    const valid=model.selectedIds.length>=2&&model.selectedIds.length>model.poisonCount&&model.selectedIds.length<=16;
    if(!valid)side.append(el('p',`藏${model.poisonCount}个毒药，至少需要${model.poisonCount+1}张词卡，留一张安全卡。`,'poison-note'));
    const rescueLabel=el('label','可选解药 · 本课重点句子'),rescueSelect=el('select');rescueSelect.id='poison-antidote-choice';rescueSelect.setAttribute('aria-label','本课解药句子');
    const skip=el('option','不用解药环节');skip.value='';rescueSelect.append(skip);
    for(const record of model.pool.sentences){const option=el('option',record.sentence);option.value=record.id;rescueSelect.append(option);}rescueSelect.value=model.antidoteId;rescueLabel.append(rescueSelect);side.append(rescueLabel);
    if(!model.pool.sentences.length)side.append(el('p','本课暂无重点句子，仍可玩读词与变身。','poison-note'));
    const start=button('poison-start','开始本轮 · 请大家闭眼','primary');start.disabled=!valid;side.append(start);layout.append(left,side);host.append(layout);
  }
  function cover(ready){
    host.replaceChildren();cardNodes=[];
    host.append(heading(ready?'毒药已藏好，大家睁眼':'其他同学，请闭眼',ready?'小女巫请保密；接下来轮流选词、读词。':'请老师指定一位小女巫，闭眼后再继续。'));
    const panel=el('div',undefined,'poison-cover');panel.append(el('span',ready?'🪄':'🙈','poison-cover-art'));
    panel.append(el('p',ready?'词卡上的标记已藏好。':'让小女巫独自看到屏幕。'));
    panel.append(button(ready?'poison-read':'poison-begin-hide',ready?'大家睁眼，开始读词':'大家已闭眼，开始藏毒','primary'));
    panel.append(button('poison-prepare','调整本轮词语','text-button'));host.append(panel);
  }
  function buildBoard(){
    const state=model.state;host.replaceChildren();cardNodes=[];
    host.append(heading(state.phase==='hide'?'嘘，小女巫正在藏毒':state.phase==='complete'?'这一轮遇到魔法啦':'轮流读词，点卡立即检查',state.phase==='hide'?`其他同学继续闭眼；秘密选${state.poisonCount}张卡，再点“藏好了”。`:state.phase==='complete'?'选择使用解药，或继续下一活动。':'学生先读，老师点刚读过的词卡，立即出现结果。'));
    const summary=el('p',undefined,'poison-summary');summary.id='poison-summary';host.append(summary);
    const grid=el('div',undefined,'poison-grid');grid.setAttribute('role','group');grid.setAttribute('aria-label',state.phase==='hide'?'秘密选择毒药词':'本轮词卡');
    for(const word of state.words){const b=el('button',undefined,'poison-card');b.dataset.poisonCard=word.id;b.append(term(word,model.showPinyin));const status=el('span','','poison-card-status');b.append(status);cardNodes.push({b,status,word});grid.append(b);}host.append(grid);
    const controls=el('div',undefined,'poison-controls');
    if(state.phase==='hide')controls.append(button('poison-seal','藏好了，盖住标记','primary'));
    else if(state.phase==='read'){
      controls.append(el('strong','学生先读 · 老师点卡 · 立即检查'));
    }else{
      const magic=el('section',undefined,'poison-magic');magic.id='poison-magic';
      const art=el('div',undefined,'poison-magic-art');art.setAttribute('role','img');art.setAttribute('aria-label','魔法烟雾和小青蛙变身效果');
      if(state.antidoteStatus==='reading')art.classList.add('is-transformed');
      if(state.antidoteStatus==='rescued'){art.classList.add('is-rescued');art.setAttribute('aria-label','解药生效，同学恢复笑脸');}
      art.append(el('span','🙂','poison-before'),el('span','🐸','poison-frog'));
      for(let i=0;i<9;i++){const puff=el('i');puff.style.setProperty('--puff',i);art.append(puff);}magic.append(art);
      const copy=el('div');copy.append(el('span',state.antidoteStatus==='rescued'?'本课句子就是解药':'噗！女巫的魔法出现了','poison-kicker'),el('h3',state.antidoteStatus==='rescued'?'解救成功！同学恢复啦':'哎呀，中毒啦！'),el('p','魔法变身，本轮结束。'));
      const hit=state.words.find(w=>w.id===state.results.at(-1)?.cardId);if(hit)copy.append(el('p',`“${hit.word}”是本轮的毒药词。`));
      if(['available','unavailable'].includes(state.antidoteStatus)){
        const prompt=el('section',undefined,'poison-antidote-prompt');prompt.id='poison-antidote-prompt';prompt.setAttribute('role','dialog');prompt.setAttribute('aria-modal','false');prompt.setAttribute('aria-labelledby','poison-antidote-title');
        const title=el('h4','需要解药吗？');title.id='poison-antidote-title';const use=button('poison-antidote','要解药 · 读本课句子','primary');use.disabled=!state.antidote;
        prompt.append(title,use,button('poison-antidote-skip','不用解药，继续'));if(!state.antidote)prompt.append(el('small','本轮没有解药句子，可以直接继续下一活动。'));copy.append(prompt);
      }
      if(state.antidoteStatus==='reading'){
        const panel=el('div',undefined,'poison-antidote-panel'),sentence=el('p',state.antidote.sentence);sentence.id='poison-antidote-sentence';
        panel.append(el('small','请大声读出解药句子'),sentence,el('small',state.antidote.source),button('poison-rescue','读完了，解救成功','primary'),button('poison-antidote-skip','暂不用解药，继续'));copy.append(panel);
      }
      if(['rescued','skipped'].includes(state.antidoteStatus))copy.append(button('poison-next-activity','下一活动：汉字迷宫','primary'));
      copy.append(button('poison-next','换一位小女巫，再来一轮','primary'),button('poison-change-lesson','选择其他课','text-button'),el('small','大家都可以继续参加下一轮。'));magic.append(copy);host.append(magic);
    }
    controls.append(button('poison-prepare','调整本轮词语','text-button'));host.append(controls);
    const feedback=el('p',undefined,'poison-feedback');feedback.id='poison-feedback';feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');host.append(feedback);
  }
  function updateBoard(){
    const state=model.state;
    for(const {b,status,word}of cardNodes){
      const result=state.results.find(r=>r.cardId===word.id),secret=state.phase==='hide'&&state.poisonIds.includes(word.id),pending=state.phase==='read'&&state.pendingId===word.id;
      b.classList.toggle('is-secret',secret);b.classList.toggle('is-pending',pending);b.classList.toggle('is-used',Boolean(result));b.classList.toggle('is-poison',Boolean(result?.poison));
      b.disabled=state.phase==='complete'||Boolean(result);b.setAttribute('aria-pressed',String(secret||pending));
      // Never expose an unrevealed poison in public attributes, labels or status text.
      status.textContent=state.phase==='hide'?(secret?'已选毒药':'点选'):result?(result.poison?'魔法毒药':'安全 · 已读'):pending?'正在读词':'选词';
      const p=b.querySelector('.poison-pinyin');if(p)p.hidden=!model.showPinyin;
    }
    host.querySelector('#poison-summary').textContent=state.phase==='hide'?`已选 ${state.poisonIds.length} / ${state.poisonCount} 个毒药`:`已读 ${state.results.length} / ${state.words.length} 个词`;
    const seal=host.querySelector('#poison-seal');if(seal)seal.disabled=state.poisonIds.length!==state.poisonCount;
    const reveal=host.querySelector('#poison-reveal');if(reveal)reveal.disabled=!state.pendingId;
    const cancel=host.querySelector('#poison-cancel');if(cancel)cancel.disabled=!state.pendingId;
    const current=host.querySelector('#poison-current');if(current)current.textContent=state.pendingId?`请读：${state.words.find(w=>w.id===state.pendingId).word}`:'请先选一个词';
    const feedback=host.querySelector('#poison-feedback');feedback.textContent=state.feedback.message;feedback.dataset.kind=state.feedback.kind;
  }
  // Keep the sentence-reading confirmation separate even when Enter is held down.
  host.addEventListener('keydown',event=>{if(event.repeat&&(event.key==='Enter'||event.key===' '))event.preventDefault();},{signal:controller.signal});
  host.addEventListener('click',event=>{
    const b=event.target.closest('button');if(!b||!host.contains(b)||b.disabled)return;
    if(b.dataset.poisonChoice){dispatch('choose-word',b.dataset.poisonChoice);return;}
    if(b.dataset.poisonCard){dispatch('card',b.dataset.poisonCard);return;}
    const intent={'poison-start':'start','poison-begin-hide':'hide','poison-seal':'seal','poison-read':'read','poison-next':'next-round','poison-prepare':'prepare','poison-antidote':'antidote','poison-rescue':'rescue','poison-change-lesson':'change-lesson','poison-antidote-skip':'skip-antidote','poison-next-activity':'next-activity'}[b.id];
    if(intent)dispatch(intent);
  },{signal:controller.signal});
  host.addEventListener('change',event=>{if(event.target.id==='poison-count')dispatch('count',Number(event.target.value));if(event.target.id==='poison-antidote-choice')dispatch('antidote-choice',event.target.value);},{signal:controller.signal});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)audio.stop();},{signal:controller.signal});
  return {
    update(next){
      const previous=model.state,previousPinyin=model.showPinyin;model=next;
      audio.setEnabled(next.soundEnabled!==false);
      if(active&&previous?.phase==='read'&&next.state?.phase==='complete')audio.playPoison();
      if(active&&previous?.antidoteStatus!=='rescued'&&next.state?.antidoteStatus==='rescued')audio.playRescue();
      const focused=document.activeElement,focus=host.contains(focused)?{id:focused.id,choice:focused.dataset.poisonChoice}:null;
      if(!next.state){prepare();if(focus?.choice)host.querySelectorAll('[data-poison-choice]').forEach(b=>{if(b.dataset.poisonChoice===focus.choice)b.focus();});else if(focus?.id)host.querySelector(`#${focus.id}`)?.focus();return;}
      const changed=key!==next.state.words||previous?.phase!==next.state.phase||previous?.antidoteStatus!==next.state.antidoteStatus||previousPinyin!==next.showPinyin;
      host.dataset.phase=next.state.phase;
      if(changed){key=next.state.words;if(next.state.phase==='cover'||next.state.phase==='ready')cover(next.state.phase==='ready');else buildBoard();}
      if(['hide','read','complete'].includes(next.state.phase))updateBoard();
      if(changed&&focus){const target=host.querySelector('#poison-rescue,#poison-begin-hide,#poison-read,#poison-antidote:not(:disabled),#poison-antidote-skip,#poison-next,[data-poison-card]:not(:disabled)');target?.focus();}
    },
    scene:{setActive(value){active=value;if(!value)audio.stop();}},
    dispose(){controller.abort();audio.dispose();host.replaceChildren();}
  };
}
