import {createPoisonAudio} from './poison-sound.js';
import {createPoisonWitch} from './poison-witch.js';
import {withEnglishInstruction} from './english-instructions.js';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const rounds = [null,
  {task:'读生字', card:'字卡', action:'开始读字', prompt:'学生先读字，老师点卡，立即揭晓。', english:'Read the character aloud. Your teacher taps the card to reveal it.'},
  {task:'说英语', card:'词卡', action:'开始说英语', prompt:'学生先说出词语的英语，老师点卡，立即揭晓。', english:'Say the word in English. Your teacher taps the card to reveal it.'},
  {task:'分析结构', card:'字卡', action:'开始分析结构', prompt:'学生先说出这个字的结构和部件的位置，老师点卡，立即揭晓。', english:'Explain the character structure. Your teacher taps the card to reveal it.'},
];
const actionEnglish = {
  'poison-start': 'Start the round. Close your eyes.',
  'poison-begin-hide': 'Eyes closed. Hide the poison.',
  'poison-seal': 'Done hiding. Cover the choices.',
  'poison-read': 'Open your eyes and start reading.',
  'poison-prepare': 'Change the characters for this round',
  'poison-antidote-skip': 'Skip the antidote',
  'poison-rescue': 'Done reading. Rescue the player!',
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
  let model={},key=null,cardNodes=[],controller=new AbortController(),active=false;const audio=createPoisonAudio();
  function button(id,label,kind='',english=actionEnglish[id]){
    const b=el('button',label,kind);b.id=id;
    return withEnglishInstruction(b,english);
  }
  function heading(title,copy,{titleEnglish,copyEnglish}={}){
    const h=el('div',undefined,'poison-heading');
    const round=model.state?.round??1;
    h.append(el('span',`第 ${round} / 3 轮 · ${rounds[round].task}`,'poison-kicker'),
      withEnglishInstruction(el('h3',title),titleEnglish),
      withEnglishInstruction(el('p',copy),copyEnglish));
    return h;
  }
  function prepare(){
    host.replaceChildren();host.dataset.phase='prepare';key=null;cardNodes=[];
    host.append(heading('女巫的小药房','选好本课生字，再请一位小女巫偷偷藏毒。',{
      copyEnglish:'Choose the lesson characters. Then ask one player to hide the poison in secret.',
    }));
    const layout=el('div',undefined,'poison-prep-layout'),left=el('section'),choices=el('div',undefined,'poison-choices');
    choices.setAttribute('role','group');choices.setAttribute('aria-label','选择本轮字卡');
    for(const word of model.pool.words){const b=el('button');b.dataset.poisonChoice=word.id;b.setAttribute('aria-pressed',String(model.selectedIds.includes(word.id)));b.append(term(word,model.showPinyin));choices.append(b);}
    left.append(el('p',model.pool.label,'poison-course'),choices);
    if(!model.pool.words.length)left.append(el('p','当前范围还没有可用生字，请换课或打开题库管理。','poison-empty'));
    const side=el('aside',undefined,'poison-guide');
    const steps=el('ol');
    const directions=[
      ['其他同学闭眼，小女巫选一张毒药卡。','Everyone else closes their eyes while the witch picks one poison card.'],
      ['藏好后大家睁眼，轮流选字。','Open your eyes and take turns choosing a character.'],
      ['学生先读，老师点卡，立即出结果。','Read the character first. Your teacher taps the card to check it.'],
      ['中毒就变身，再选择使用或跳过解药。','If you pick poison, choose whether to use the antidote.'],
    ];
    for(const [chinese,english] of directions)steps.append(withEnglishInstruction(el('li',chinese),english));
    side.append(steps);
    side.append(el('p',model.pool.note,'poison-note'));const count=el('p',`已选 ${model.selectedIds.length} 张 · 可选2–16张`,'poison-selection-count');count.setAttribute('role','status');side.append(count);
    const valid=model.selectedIds.length>=2&&model.selectedIds.length<=16;
    if(!valid)side.append(el('p','请至少选两张字卡。','poison-note'));
    const rescueLabel=el('label','可选解药 · 本课重点句子'),rescueSelect=el('select');rescueSelect.id='poison-antidote-choice';rescueSelect.setAttribute('aria-label','本课解药句子');
    const skip=el('option','不用解药环节');skip.value='';rescueSelect.append(skip);
    for(const record of model.pool.sentences){const option=el('option',record.sentence);option.value=record.id;rescueSelect.append(option);}rescueSelect.value=model.antidoteId;rescueLabel.append(rescueSelect);side.append(rescueLabel);
    if(!model.pool.sentences.length)side.append(el('p','本课暂无重点句子，仍可玩读词与变身。','poison-note'));
    const start=button('poison-start','开始本轮 · 请大家闭眼','primary');start.disabled=!valid;side.append(start);layout.append(left,side);host.append(layout);
  }
  function cover(ready){
    host.replaceChildren();cardNodes=[];
    const round=rounds[model.state.round];
    host.append(heading(ready?'毒药已藏好，大家睁眼':'其他同学，请闭眼',ready?round.prompt:'请老师指定一位小女巫，闭眼后再继续。',{
      titleEnglish:ready?'Open your eyes.':'Everyone else, close your eyes.',
      copyEnglish:ready?round.english:'Choose one player to be the witch. Continue when everyone else has closed their eyes.',
    }));
    const panel=el('div',undefined,'poison-cover');panel.append(el('span',ready?'🪄':'🙈','poison-cover-art'));
    panel.append(el('p',ready?'毒药的标记已藏好。':'让小女巫独自看到屏幕。'));
    panel.append(button(ready?'poison-read':'poison-begin-hide',ready?`大家睁眼，${round.action}`:'大家已闭眼，开始藏毒','primary',ready?round.english:undefined));
    if(model.state.round===1)panel.append(button('poison-prepare','调整本轮生字','text-button'));
    host.append(panel);
  }
  function buildBoard(animateHit=false){
    const state=model.state;host.replaceChildren();cardNodes=[];
    const round=rounds[state.round];
    const hiding=state.phase==='hide';
    const intro=heading(hiding?'嘘，小女巫正在藏毒':round.task,
      hiding?'其他同学继续闭眼，秘密选一张卡，再点“藏好了”。':round.prompt,{
        copyEnglish:hiding
          ? 'Everyone else keeps their eyes closed. Secretly pick one card, then tap “Done hiding”.'
          : round.english,
      });
    intro.hidden=state.phase==='complete';host.append(intro);
    if(state.round===2&&state.phase!=='complete')host.append(el('p',`词卡来源 · ${model.pool.translationLabel}`,'poison-summary'));
    const summary=el('p',undefined,'poison-summary');summary.id='poison-summary';summary.hidden=state.phase==='complete';host.append(summary);
    const grid=el('div',undefined,'poison-grid');grid.setAttribute('role','group');grid.setAttribute('aria-label',state.phase==='hide'?'秘密选择毒药卡':`本轮${round.card}`);
    for(const word of state.words){const b=el('button',undefined,'poison-card');b.dataset.poisonCard=word.id;b.append(term(word,model.showPinyin));const status=el('span','','poison-card-status');b.append(status);cardNodes.push({b,status,word});grid.append(b);}host.append(grid);
    const controls=el('div',undefined,'poison-controls');
    if(state.phase==='hide')controls.append(button('poison-seal','藏好了，盖住标记','primary'));
    else if(state.phase==='read'){
      controls.append(withEnglishInstruction(el('strong','学生先答 · 老师点卡'),'Answer first. Your teacher taps the card.'));
      if(state.round===3){
        const hints=el('details',undefined,'poison-structure-hints');
        hints.append(el('summary','看部件提示'));
        const list=el('ul');
        for(const item of model.pool.structures.filter(word=>model.selectedIds.includes(word.id))){
          const description=[item.type,item.parts.join('、')].filter(Boolean).join(' · ');
          if(description)list.append(el('li',`${item.word}　${description}`));
        }
        if(list.children.length){hints.append(list);host.append(hints);}
      }
    }else{
      const magic=el('section',undefined,'poison-magic');magic.id='poison-magic';
      const art=el('div',undefined,'poison-magic-art');art.setAttribute('role','img');art.setAttribute('aria-label','魔法烟雾和小青蛙变身效果');
      if(state.antidoteStatus!=='rescued'){art.setAttribute('role','group');art.setAttribute('aria-label','女巫拿着空瓶坏笑，同学变成小青蛙');art.append(createPoisonWitch({animate:animateHit}));}
      if(state.antidoteStatus==='reading')art.classList.add('is-transformed');
      if(state.antidoteStatus==='rescued'){art.classList.add('is-rescued');art.setAttribute('aria-label','解药生效，同学恢复笑脸');}
      art.append(el('span','🙂','poison-before'),el('span','🐸','poison-frog'));
      for(let i=0;i<9;i++){const puff=el('i');puff.style.setProperty('--puff',i);art.append(puff);}magic.append(art);
      const copy=el('div');if(state.antidoteStatus!=='rescued')copy.append(el('h3','哎呀，中毒啦！'));
      if(['available','unavailable'].includes(state.antidoteStatus)){
        const prompt=el('section',undefined,'poison-antidote-prompt');prompt.id='poison-antidote-prompt';prompt.setAttribute('role','dialog');prompt.setAttribute('aria-modal','false');prompt.setAttribute('aria-label','需要解药吗？');
        const use=button('poison-antidote',state.antidote?'要解药 · 读本课句子':'本课暂无解药','primary');use.disabled=!state.antidote;
        if(state.antidote)withEnglishInstruction(use,'Use the antidote: read the lesson sentence.');
        prompt.append(use,button('poison-antidote-skip','不用解药，继续'));copy.append(prompt);
      }
      if(state.antidoteStatus==='reading'){
        const panel=el('div',undefined,'poison-antidote-panel'),sentence=el('p',state.antidote.sentence);sentence.id='poison-antidote-sentence';
        panel.append(withEnglishInstruction(el('small','请读出解药句子'),'Read the antidote sentence aloud.'),sentence,button('poison-rescue','读完了，解救成功','primary'),button('poison-antidote-skip','暂不用解药，继续'));copy.append(panel);
      }
      if(['rescued','skipped'].includes(state.antidoteStatus)){
        const labels=['','进入第二轮 · 说英语','进入第三轮 · 分析结构','完成挑战'];
        const english=['','Round 2: Say the words in English','Round 3: Explain character structure','Finish the challenge'];
        const available=state.round!==1||model.pool.translations.length>=2;
        const proceed=button('poison-continue',available?labels[state.round]:'本课不足两张可翻译的词卡','primary',available?english[state.round]:undefined);
        proceed.disabled=!available;
        copy.append(proceed);
      }
      copy.append(button('poison-next','重玩本轮','text-button'),button('poison-change-lesson','选择其他课','text-button'));magic.append(copy);host.append(magic);
    }
    if(state.round===1)controls.append(button('poison-prepare','调整本轮生字','text-button'));
    host.append(controls);
    const feedback=el('p',undefined,'poison-feedback');feedback.id='poison-feedback';feedback.hidden=state.phase==='complete';feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');host.append(feedback);
  }
  function updateBoard(){
    const state=model.state;
    for(const {b,status,word}of cardNodes){
      const result=state.results.find(r=>r.cardId===word.id),secret=state.phase==='hide'&&state.poisonIds.includes(word.id),pending=state.phase==='read'&&state.pendingId===word.id;
      b.classList.toggle('is-secret',secret);b.classList.toggle('is-pending',pending);b.classList.toggle('is-used',Boolean(result));b.classList.toggle('is-poison',Boolean(result?.poison));
      b.disabled=state.phase==='complete'||Boolean(result);b.setAttribute('aria-pressed',String(secret||pending));
      // Never expose an unrevealed poison in public attributes, labels or status text.
      status.textContent=state.phase==='hide'?(secret?'已选毒药':'点选'):result?(result.poison?'魔法毒药':'安全 · 已答'):pending?'正在回答':'点卡揭晓';
      const p=b.querySelector('.poison-pinyin');if(p)p.hidden=!model.showPinyin;
    }
    host.querySelector('#poison-summary').textContent=state.phase==='hide'?`已选 ${state.poisonIds.length} / 1 张毒药卡`:`已答 ${state.results.length} / ${state.words.length} 张${rounds[state.round].card}`;
    const seal=host.querySelector('#poison-seal');if(seal)seal.disabled=state.poisonIds.length!==state.poisonCount;
    const reveal=host.querySelector('#poison-reveal');if(reveal)reveal.disabled=!state.pendingId;
    const cancel=host.querySelector('#poison-cancel');if(cancel)cancel.disabled=!state.pendingId;
    const current=host.querySelector('#poison-current');if(current)current.textContent=state.pendingId?`请读：${state.words.find(w=>w.id===state.pendingId).word}`:'请先选一个词';
    const feedback=host.querySelector('#poison-feedback');feedback.textContent=state.feedback.kind==='safe'?'安全！换下一位同学。':state.feedback.kind==='info'&&state.phase==='read'?rounds[state.round].prompt:state.feedback.message;feedback.dataset.kind=state.feedback.kind;
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
    const intent={'poison-start':'start','poison-begin-hide':'hide','poison-seal':'seal','poison-read':'read','poison-next':'repeat-round','poison-continue':'advance-round','poison-prepare':'prepare','poison-antidote':'antidote','poison-rescue':'rescue','poison-change-lesson':'change-lesson','poison-antidote-skip':'skip-antidote','poison-restart-challenge':'restart-challenge'}[b.id];
    if(intent)dispatch(intent);
  },{signal:controller.signal});
  host.addEventListener('change',event=>{if(event.target.id==='poison-antidote-choice')dispatch('antidote-choice',event.target.value);},{signal:controller.signal});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)audio.stop();},{signal:controller.signal});
  return {
    update(next){
      const previous=model.state,previousPinyin=model.showPinyin;model=next;
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
      if(active&&previous?.antidoteStatus!=='rescued'&&next.state?.antidoteStatus==='rescued')audio.playRescue();
      const focused=document.activeElement,focus=host.contains(focused)?{id:focused.id,choice:focused.dataset.poisonChoice}:null;
      if(!next.state){prepare();if(focus?.choice)host.querySelectorAll('[data-poison-choice]').forEach(b=>{if(b.dataset.poisonChoice===focus.choice)b.focus();});else if(focus?.id)host.querySelector(`#${focus.id}`)?.focus();return;}
      const changed=key!==next.state.words||previous?.phase!==next.state.phase||previous?.antidoteStatus!==next.state.antidoteStatus||previousPinyin!==next.showPinyin;
      host.dataset.phase=next.state.phase;
      if(changed){key=next.state.words;if(next.state.phase==='cover'||next.state.phase==='ready')cover(next.state.phase==='ready');else buildBoard(previous?.phase==='read'&&next.state.phase==='complete');}
      if(['hide','read','complete'].includes(next.state.phase))updateBoard();
      if(changed&&focus){const target=host.querySelector('#poison-rescue,#poison-begin-hide,#poison-read,#poison-antidote:not(:disabled),#poison-antidote-skip,#poison-continue:not(:disabled),#poison-next,[data-poison-card]:not(:disabled)');target?.focus();}
    },
    scene:{setActive(value){active=value;if(!value)audio.stop();}},
    dispose(){controller.abort();audio.dispose();host.replaceChildren();}
  };
}
