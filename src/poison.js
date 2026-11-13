import {createPoisonAudio} from './poison-sound.js';
import {createPoisonWitch} from './poison-witch.js';
import {createAntidoteBottle,createRescuedChild} from './poison-rescue-art.js';
import {withEnglishInstruction} from './english-instructions.js';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const actionEnglish = {
  'poison-start': 'Start',
  'poison-begin-hide': 'Ready to hide the poison',
  'poison-seal': 'Done hiding',
  'poison-read': 'Start reading',
  'poison-prepare': 'Change cards',
  'poison-antidote': 'Use the antidote',
  'poison-antidote-skip': 'Skip the antidote',
  'poison-rescue': 'Give the antidote',
  'poison-next': 'Replay this round',
  'poison-restart-challenge': 'Play again',
  'poison-change-lesson': 'Choose another lesson',
};
function term(word,pinyin){
  const box=el('span',undefined,'poison-word'),han=el('strong',word.word,'poison-term');
  han.style.setProperty('--poison-size',`${word.word.length<=2?32:word.word.length<=4?27:word.word.length<=8?21:17}px`);box.append(han);
  if(pinyin&&word.pinyin)box.append(el('small',word.pinyin,'poison-pinyin'));return box;
}
export function createPoisonView(host,dispatch){
  let model={},key=null,cardNodes=[],controller=new AbortController(),active=false,rescueCharacter='boy';const audio=createPoisonAudio();
  let nextAppearance=0;
  function button(id,label,kind='',english=actionEnglish[id]){
    const b=el('button',label,kind);b.id=id;
    return withEnglishInstruction(b,english);
  }
  function heading(title,copy,{titleEnglish,copyEnglish}={}){
    const h=el('div',undefined,'poison-heading');
    const round=model.state?.round??1;
    if(model.state)h.append(el('span',`第 ${round} / 3 轮`,'poison-kicker'));
    h.append(withEnglishInstruction(el('h3',title),titleEnglish));
    if(copy)h.append(withEnglishInstruction(el('p',copy),copyEnglish));
    return h;
  }
  function prepare(){
    host.replaceChildren();host.dataset.phase='prepare';key=null;cardNodes=[];
    host.append(heading('选本课字词',null,{titleEnglish:'Choose lesson cards'}));
    const layout=el('div',undefined,'poison-prep-layout'),left=el('section'),choices=el('div',undefined,'poison-choices');
    choices.setAttribute('role','group');choices.setAttribute('aria-label','选择字词卡');
    for(const word of model.pool.words){const b=el('button');b.dataset.poisonChoice=word.id;b.setAttribute('aria-pressed',String(model.selectedIds.includes(word.id)));b.append(term(word,model.showPinyin));choices.append(b);}
    left.append(el('p',model.pool.label,'poison-course'),choices);
    if(!model.pool.words.length)left.append(el('p','暂无字词，请换课。','poison-empty'));
    const side=el('aside',undefined,'poison-guide');
    const count=el('p',`已选 ${model.selectedIds.length} 张（选 2–16 张）`,'poison-selection-count');count.setAttribute('role','status');side.append(count);
    const valid=model.selectedIds.length>=2&&model.selectedIds.length<=16;
    const rescueLabel=el('label','解药句子（可选）'),rescueSelect=el('select');rescueSelect.id='poison-antidote-choice';rescueSelect.setAttribute('aria-label','本课解药句子');
    const skip=el('option','不用解药');skip.value='';rescueSelect.append(skip);
    for(const record of model.pool.sentences){const option=el('option',record.sentence);option.value=record.id;rescueSelect.append(option);}rescueSelect.value=model.antidoteId;rescueLabel.append(rescueSelect);side.append(rescueLabel);
    const start=button('poison-start','开始','primary');start.disabled=!valid;side.append(start);layout.append(left,side);host.append(layout);
  }
  function cover(ready){
    host.replaceChildren();cardNodes=[];
    host.append(heading(ready?'大家睁眼':'小女巫看屏幕，其他同学闭眼',null,{
      titleEnglish:ready?'Open your eyes.':'Witch, look at the screen. Everyone else, close your eyes.',
    }));
    const panel=el('div',undefined,'poison-cover');panel.append(el('span',ready?'🪄':'🙈','poison-cover-art'));
    panel.append(button(ready?'poison-read':'poison-begin-hide',ready?'开始读':'开始藏毒','primary'));
    if(model.state.round===1)panel.append(button('poison-prepare','换字词','text-button'));
    host.append(panel);
  }
  function antidotePanel(sentenceText){
    const panel=el('div',undefined,'poison-antidote-panel');
    const sentence=el('p',sentenceText);sentence.id='poison-antidote-sentence';
    const feed=button('poison-rescue','喂解药','primary');feed.prepend(createAntidoteBottle());
    const choices=el('div',undefined,'poison-character-options');
    choices.setAttribute('role','radiogroup');choices.setAttribute('aria-label','变回男孩或女孩');
    for(const [value,label,english] of [['boy','男孩','Boy'],['girl','女孩','Girl']]){
      const option=el('label'),radio=el('input');
      radio.type='radio';radio.name='poison-character';radio.value=value;radio.checked=value===rescueCharacter;
      option.append(radio,withEnglishInstruction(el('span',label),english));choices.append(option);
    }
    const actions=el('div',undefined,'poison-antidote-actions');
    actions.append(choices,feed,button('poison-antidote-skip','跳过解药','text-button'));
    panel.append(withEnglishInstruction(el('small','请读出解药句子'),'Read the antidote sentence aloud.'),sentence,actions);
    return panel;
  }
  function buildBoard(animateHit=false,animateRescue=false){
    const state=model.state;host.replaceChildren();cardNodes=[];
    const hiding=state.phase==='hide';
    if(state.phase!=='complete')host.append(hiding
      ? heading('选一张毒药卡',null,{titleEnglish:'Pick one poison card'})
      : heading('读一读','先读，再点卡。',{copyEnglish:'Read aloud, then tap the card.'}));
    const grid=el('div',undefined,'poison-grid');grid.setAttribute('role','group');grid.setAttribute('aria-label',hiding?'秘密选择毒药卡':'本轮字词卡');
    for(const word of state.words){const b=el('button',undefined,'poison-card');b.dataset.poisonCard=word.id;b.append(term(word,model.showPinyin));const status=el('span','','poison-card-status');b.append(status);cardNodes.push({b,status,word});grid.append(b);}host.append(grid);
    const controls=el('div',undefined,'poison-controls');
    if(hiding)controls.append(button('poison-seal','藏好了','primary'));
    if(state.phase==='complete'){
      const magic=el('section',undefined,'poison-magic');magic.id='poison-magic';
      const art=el('div',undefined,'poison-magic-art');art.setAttribute('role','img');art.setAttribute('aria-label','魔法烟雾和小青蛙变身效果');
      if(state.antidoteStatus!=='rescued'){art.setAttribute('role','group');art.setAttribute('aria-label','女巫拿着空瓶坏笑，同学变成小青蛙');art.append(createPoisonWitch({animate:animateHit}));}
      if(state.antidoteStatus==='reading'){
        magic.classList.add('is-reading-antidote');art.classList.add('is-transformed');
      }
      if(state.antidoteStatus==='rescued'){
        art.classList.add('is-rescued');
        art.setAttribute('aria-label',`小青蛙吃下解药，变回${state.rescuedCharacter==='girl'?'女孩':'男孩'}`);
        const child=el('span',undefined,'poison-rescued-child');child.append(createRescuedChild(state.rescuedCharacter,state.rescuedAppearance));art.append(child);
        if(animateRescue){
          art.classList.add('is-feeding');
          const dose=el('span',undefined,'poison-rescue-dose');dose.append(createAntidoteBottle());art.append(dose);
        }
      }else art.append(el('span','🙂','poison-before'));
      art.append(el('span','🐸','poison-frog'));
      for(let i=0;i<9;i++){const puff=el('i');puff.style.setProperty('--puff',i);art.append(puff);}magic.append(art);
      const copy=el('div');if(state.antidoteStatus!=='rescued')copy.append(el('h3','哎呀，中毒啦！'));
      if(['available','unavailable'].includes(state.antidoteStatus)){
        const prompt=el('section',undefined,'poison-antidote-prompt');prompt.id='poison-antidote-prompt';prompt.setAttribute('role','dialog');prompt.setAttribute('aria-modal','false');prompt.setAttribute('aria-label','需要解药吗？');
        const use=button('poison-antidote',state.antidote?'用解药':'暂无解药','primary',state.antidote?actionEnglish['poison-antidote']:null);use.disabled=!state.antidote;
        prompt.append(use,button('poison-antidote-skip',state.antidote?'跳过解药':'继续','',state.antidote?actionEnglish['poison-antidote-skip']:'Continue'));copy.append(prompt);
      }
      if(state.antidoteStatus==='reading')copy.append(antidotePanel(state.antidote.sentence));
      if(['rescued','skipped'].includes(state.antidoteStatus)){
        const finalRound=state.round===3;
        copy.append(button('poison-continue',finalRound?'完成挑战':'下一轮','primary',finalRound?'Finish':'Next round'));
      }
      copy.append(button('poison-next','重玩本轮','text-button'),button('poison-change-lesson','选择其他课','text-button'));magic.append(copy);host.append(magic);
    }
    if(state.round===1&&state.phase!=='complete')controls.append(button('poison-prepare','换字词','text-button'));
    if(state.phase!=='complete'){
      const feedback=el('p',undefined,'poison-feedback');feedback.id='poison-feedback';feedback.setAttribute('role','status');host.append(feedback);
    }
    if(controls.children.length)host.append(controls);
  }
  function updateBoard(){
    const state=model.state;
    for(const {b,status,word}of cardNodes){
      const result=state.results.find(r=>r.cardId===word.id),secret=state.phase==='hide'&&state.poisonIds.includes(word.id),pending=state.phase==='read'&&state.pendingId===word.id;
      b.classList.toggle('is-secret',secret);b.classList.toggle('is-pending',pending);b.classList.toggle('is-used',Boolean(result));b.classList.toggle('is-poison',Boolean(result?.poison));
      b.disabled=state.phase==='complete'||Boolean(result);b.setAttribute('aria-pressed',String(secret||pending));
      // Never expose an unrevealed poison in public attributes, labels or status text.
      status.textContent=secret?'已选':result?'已读':'';
      status.hidden=!status.textContent;
      const p=b.querySelector('.poison-pinyin');if(p)p.hidden=!model.showPinyin;
    }
    const seal=host.querySelector('#poison-seal');if(seal)seal.disabled=state.poisonIds.length!==state.poisonCount;
    const feedback=host.querySelector('#poison-feedback');
    if(feedback){
      const safe=state.phase==='read'&&state.feedback.kind==='safe';
      feedback.textContent=safe?'安全！':'';
      feedback.dataset.kind=safe?'safe':'info';
    }
  }
  function victory(){
    const panel=el('section',undefined,'poison-challenge');
    const title=el('h3','女巫被打败了！');title.tabIndex=-1;
    const art=el('div',undefined,'poison-victory-art');art.append(createPoisonWitch({defeated:true}));
    panel.append(title,art,button('poison-restart-challenge','再挑战一次','primary'),button('poison-change-lesson','选择其他课','text-button'));
    host.replaceChildren(panel);
    return title;
  }
  // Keep the sentence-reading confirmation separate even when Enter is held down.
  host.addEventListener('keydown',event=>{if(event.repeat&&(event.key==='Enter'||event.key===' '))event.preventDefault();},{signal:controller.signal});
  host.addEventListener('click',event=>{
    const b=event.target.closest('button');if(!b||!host.contains(b)||b.disabled)return;
    if(b.dataset.poisonChoice){dispatch('choose-word',b.dataset.poisonChoice);return;}
    if(b.dataset.poisonCard){dispatch('card',b.dataset.poisonCard);return;}
    if(b.id==='poison-rescue'){
      if(model.state?.antidoteStatus!=='reading')return;
      dispatch('rescue',{character:rescueCharacter,appearance:nextAppearance});
      nextAppearance++;
      return;
    }
    const intent={'poison-start':'start','poison-begin-hide':'hide','poison-seal':'seal','poison-read':'read','poison-next':'repeat-round','poison-continue':'advance-round','poison-prepare':'prepare','poison-antidote':'antidote','poison-change-lesson':'change-lesson','poison-antidote-skip':'skip-antidote','poison-restart-challenge':'restart-challenge'}[b.id];
    if(intent)dispatch(intent);
  },{signal:controller.signal});
  host.addEventListener('change',event=>{
    if(event.target.id==='poison-antidote-choice')dispatch('antidote-choice',event.target.value);
    if(event.target.name==='poison-character')rescueCharacter=event.target.value;
  },{signal:controller.signal});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)audio.stop();},{signal:controller.signal});
  return {
    update(next){
      const previous=model.state,previousPinyin=model.showPinyin;model=next;
      if(previous?.words!==next.state?.words)rescueCharacter='boy';
      if(previous&&(!next.state||previous.words!==next.state.words||previous.round!==next.state.round))audio.stop();
      audio.setEnabled(next.soundEnabled!==false);
      host.dataset.round=next.state?.round??1;
      if(next.won){
        if(host.dataset.phase!=='victory'){
          audio.stop();host.dataset.phase='victory';key=null;cardNodes=[];
          const focus=host.contains(document.activeElement),title=victory();
          if(focus)title.focus({preventScroll:true});
        }
        return;
      }
      if(active&&previous?.phase==='read'&&next.state?.phase==='complete')audio.playPoison();
      const animateRescue=active&&previous?.antidoteStatus==='reading'&&next.state?.antidoteStatus==='rescued'&&previous.words===next.state.words;
      if(animateRescue)audio.playRescue();
      const focused=document.activeElement,focus=host.contains(focused)?{id:focused.id,choice:focused.dataset.poisonChoice}:null;
      if(!next.state){prepare();if(focus?.choice)host.querySelectorAll('[data-poison-choice]').forEach(b=>{if(b.dataset.poisonChoice===focus.choice)b.focus();});else if(focus?.id)host.querySelector(`#${focus.id}`)?.focus();return;}
      const changed=key!==next.state.words||previous?.phase!==next.state.phase||previous?.antidoteStatus!==next.state.antidoteStatus||previousPinyin!==next.showPinyin;
      host.dataset.phase=next.state.phase;
      if(changed){key=next.state.words;if(next.state.phase==='cover'||next.state.phase==='ready')cover(next.state.phase==='ready');else buildBoard(previous?.phase==='read'&&next.state.phase==='complete',animateRescue);}
      if(['hide','read','complete'].includes(next.state.phase))updateBoard();
      if(changed&&focus){const target=host.querySelector('#poison-rescue,#poison-begin-hide,#poison-read,#poison-antidote:not(:disabled),#poison-antidote-skip,#poison-continue:not(:disabled),#poison-next,[data-poison-card]:not(:disabled)');target?.focus();}
    },
    scene:{setActive(value){active=value;if(!value)audio.stop();}},
    dispose(){controller.abort();audio.dispose();host.replaceChildren();}
  };
}
