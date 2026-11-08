import {BUILDING_TYPES} from './building-art.js';
import {buildingBlueprint} from './building-blueprint.js';
import {createBlueprintArt} from './building-blueprint-art.js';
import {visibleBuildingWords} from './building-core.js';
import {createBuildingScene} from './building-scene.js';
const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;};
function button(id,label,primary=false){const node=el('button',label,primary?'primary':'');node.id=id;return node;}
function wordText(word,pinyin=false){
  const box=el('span',undefined,'builder-word-card'),han=el('strong',word.word,'builder-term');
  han.style.setProperty('--word-size',`${word.word.length<=2?38:word.word.length<=4?32:word.word.length<=8?25:20}px`);box.append(han);
  if(pinyin&&word.pinyin)box.append(el('small',word.pinyin,'builder-pinyin'));return box;
}
export function createBuildingView(host,dispatch){
  const controller=new AbortController(),sceneHost=el('div',undefined,'builder-scene');sceneHost.id='builder-scene';
  let model,sceneView,active=false;
  function nextControl(){return host.querySelector('#builder-confirm:not(:disabled),#builder-draw:not(:disabled),[data-builder-card]:not(:disabled),#builder-challenge:not(:disabled),#builder-restore:not(:disabled),#builder-start:not(:disabled)');}
  function syncAnimationControls(){
    const state=model?.state,busy=Boolean(sceneView?.isAnimating);
    for(const [id,disabled]of [['builder-draw',busy||Boolean(state?.pendingId)],['builder-confirm',busy||!state?.pendingId],['builder-challenge',busy||!state?.sentence],['builder-restore',busy]]){const b=host.querySelector(`#${id}`);if(b)b.disabled=disabled;}
    host.querySelectorAll('[data-builder-card]').forEach(b=>b.disabled=busy||!state?.sentence);
    if(!busy&&active&&!document.hidden&&document.activeElement===sceneHost.querySelector('#builder-motion-status'))nextControl()?.focus();
  }
  function prepare(){
    const heading=el('div',undefined,'builder-heading');heading.append(el('span','HANZI BUILDERS','builder-kicker'),el('h3','今天想搭什么？'),el('p','读一个本课字词，搭起一部分；读出重点句子，让建筑重新站起来。'));host.append(heading);
    const layout=el('div',undefined,'builder-prep-layout'),left=el('section'),types=el('div',undefined,'builder-types');types.setAttribute('aria-label','选择建筑类型');
    for(const [type,name]of Object.entries(BUILDING_TYPES)){
      const b=button(`builder-type-${type}`,undefined);b.dataset.builderType=type;b.setAttribute('aria-pressed',String(type===model.structure));
      const words=Array.from({length:9},(_,i)=>({id:`preview${i}`,word:''})),blueprint=buildingBlueprint(type,{words,variant:model.variant}),art=createBlueprintArt(blueprint,{phase:'built',words,builtIds:words.map(w=>w.id),checkedIds:[]});art.setAttribute('aria-hidden','true');b.append(art,el('strong',name),el('small',blueprint.name,'builder-shape-name'));types.append(b);
    }
    left.append(types,el('p',model.pool.label,'builder-course'));const choices=el('div',undefined,'builder-choices');choices.setAttribute('role','group');choices.setAttribute('aria-label','选择本轮搭建字词');
    for(const word of model.pool.words){const b=el('button');b.dataset.builderChoice=word.id;b.setAttribute('aria-pressed',String(model.selectedIds.includes(word.id)));b.append(wordText(word,model.showPinyin));choices.append(b);}left.append(choices);
    if(!model.pool.words.length)left.append(el('p','当前范围没有可用词语，请换课或打开题库管理。','builder-note'));
    const side=el('aside',undefined,'builder-guide'),list=el('ol');for(const text of ['选建筑和本课字词，每课有不同外形。','抽一个词，学生大声读，老师确认后搭一块词砖。','搭好后挑词朗读，每读一词移走一砖；失去支撑的上层词砖会落下。','读出本课重点句子，老师确认后复原全部词砖。'])list.append(el('li',text));side.append(list);
    const label=el('label','本课拯救句子'),select=el('select');select.id='builder-sentence-choice';select.setAttribute('aria-label','本课拯救句子');
    const empty=el('option','只练搭建，暂不用拯救句子');empty.value='';select.append(empty);
    for(const record of model.pool.sentences){const option=el('option',record.sentence);option.value=record.id;select.append(option);}select.value=model.sentenceId;label.append(select);side.append(label);
    if(!model.pool.sentences.length)side.append(el('p','本课暂无重点句子，先练搭建；有本课句子时再开启倒塌与拯救。','builder-note'));
    const count=el('p',`已选 ${model.selectedIds.length} 个词 · 可选1–16个`,'builder-selection-count');count.setAttribute('role','status');side.append(count,el('p',model.pool.note,'builder-note'));
    const start=button('builder-start','开始搭建',true);start.disabled=!model.selectedIds.length;side.append(start);layout.append(left,side);host.append(layout);
  }
  function round(){
    const state=model.state,name=BUILDING_TYPES[state.structure],titles={build:`一起搭${name}`,built:`${name}搭好啦！`,challenge:'挑词读一读，观察建筑的支撑',collapsed:'部分词砖失去支撑了！',cleared:'词砖已安全拆完！',restored:'复原成功，重新站起来啦！'};
    const heading=el('div',undefined,'builder-heading');heading.append(el('span',buildingBlueprint(state.structure,{words:state.words,variant:state.variant}).name,'builder-kicker'),el('h3',titles[state.phase]),el('p',model.pool.label,'builder-course'));host.append(heading);
    const layout=el('div',undefined,'builder-round-layout');layout.append(sceneHost);
    const desk=el('section',undefined,'builder-desk'),progress=el('p',['challenge','collapsed','cleared'].includes(state.phase)?`已认读 ${state.checkedIds.length} 个词 · 剩余 ${visibleBuildingWords(state).length} / ${state.words.length} 块词砖`:`已搭建 ${state.builtIds.length} / ${state.words.length} 块词砖`,'builder-progress');progress.id='builder-progress';progress.setAttribute('role','status');desk.append(progress);
    if((state.phase==='built'&&state.sentence)||state.phase==='challenge'){
      desk.append(el('h4','从词卡里挑一个，大声读出来'),el('p',state.checkedIds.length?'安全！对应词砖和词卡已移走，继续挑一张。':'学生先读，老师点选刚读过的词卡；每读一词，移走一砖。','builder-note'));
      const cards=el('div',undefined,'builder-challenge-cards');cards.setAttribute('role','group');cards.setAttribute('aria-label','挑选已读的本课词卡');
      for(const word of state.words.filter(w=>!state.checkedIds.includes(w.id))){const card=el('button');card.dataset.builderCard=word.id;card.append(wordText(word,model.showPinyin));cards.append(card);}desk.append(cards);
      const left=el('p',`还剩 ${state.words.length-state.checkedIds.length} / ${state.words.length} 张词卡`,'builder-note');left.setAttribute('role','status');desk.append(left);
    }else if(state.phase==='build'){
      const word=state.words.find(w=>w.id===state.pendingId),prompt=el('div',undefined,'builder-prompt');
      prompt.append(el('span',state.phase==='challenge'?`随机挑战 · 已安全读 ${state.checkedIds.length} 个词`:'抽词 → 大声读 → 老师确认','builder-kicker'));
      if(word){const card=wordText(word,model.showPinyin);card.querySelector('strong').id='builder-word';prompt.append(card);}else prompt.append(el('p',state.phase==='challenge'?'建筑站稳了，抽一个词来试试看。':'准备好了吗？抽一个本课字词。'));
      desk.append(prompt);const controls=el('div',undefined,'builder-read-controls'),draw=button('builder-draw',state.phase==='challenge'?'随机抽词':'抽下一个词',true),confirm=button('builder-confirm',state.phase==='challenge'?'读完了，检查建筑':'读完了，搭一部分',true);
      confirm.textContent='读对了，搭一块词砖';draw.disabled=Boolean(state.pendingId);confirm.disabled=!state.pendingId;controls.append(draw,confirm);desk.append(controls,el('p','读错先纠正、再重读，由老师确认。','builder-note'));
    }else if(['collapsed','cleared'].includes(state.phase)){
      const hit=state.words.find(w=>w.id===state.checkedIds.at(-1));desk.append(el('p',state.phase==='cleared'?'所有词砖都已读过并安全拆完。也可以读句子，让建筑重新站起来。':`移走“${hit?.word??''}”后，上面的词砖失去支撑，向下落了。`,'builder-note'),el('h4',state.phase==='cleared'?'读本课重点句子，再搭一次':'本课重点句子，就是拯救办法'));
      const sentence=el('p',state.sentence.sentence,'builder-rescue-sentence');sentence.id='builder-rescue-sentence';desk.append(sentence,el('p',state.sentence.source,'builder-note'),button('builder-restore','句子读完了，复原建筑',true));
    }else{
      desk.append(el('p',state.phase==='restored'?'重点句子救回了建筑，所有同学可以继续参加。':'每个词都读过了，大家合作搭建成功！','builder-success'));
      const challenge=button('builder-challenge',state.phase==='restored'?'再来一次随机挑战':'进入随机读词挑战',true);challenge.disabled=!state.sentence;desk.append(challenge);
      if(!state.sentence)desk.append(el('p','本轮未使用重点句子，先练搭建；选择本课拯救句子后再挑战。','builder-note'));
    }
    if(['restored','cleared'].includes(state.phase)||(state.phase==='built'&&!state.sentence))desk.append(button('builder-next-activity','下一活动：女巫的毒药',true));
    layout.append(desk);host.append(layout);const actions=el('div',undefined,'builder-bottom-controls');actions.append(button('builder-prepare','重新选择建筑与字词'),button('builder-change-lesson','选择其他课'));host.append(actions);
  }
  // Focus follows the next reading action; a held key must not activate that action too.
  host.addEventListener('keydown',event=>{if(event.repeat&&(event.key==='Enter'||event.key===' '))event.preventDefault();},{signal:controller.signal});
  host.addEventListener('click',event=>{
    const b=event.target.closest('button');if(!b||!host.contains(b)||b.disabled)return;
    if(b.dataset.builderChoice){dispatch('choose-word',b.dataset.builderChoice);return;}
    if(b.dataset.builderType){dispatch('structure',b.dataset.builderType);return;}
    if(b.dataset.builderCard){if(!sceneView?.isAnimating)dispatch('challenge-card',b.dataset.builderCard);return;}
    const intent={'builder-start':'start','builder-draw':'draw','builder-confirm':'confirm','builder-challenge':'challenge','builder-restore':'restore','builder-prepare':'prepare','builder-change-lesson':'change-lesson','builder-next-activity':'next-activity'}[b.id];
    if(sceneView?.isAnimating&&['draw','confirm','challenge','restore'].includes(intent))return;
    if(intent)dispatch(intent);
  },{signal:controller.signal});
  host.addEventListener('change',event=>{if(event.target.id==='builder-sentence-choice')dispatch('sentence',event.target.value);},{signal:controller.signal});
  return {update(next){
    const focused=document.activeElement,focus=host.contains(focused)?{id:focused.id,choice:focused.dataset.builderChoice}:null,scroll=host.querySelector('.builder-choices')?.scrollTop??0;
    model=next;host.replaceChildren();host.dataset.phase=next.state?.phase??'prepare';
    if(next.state){round();sceneView??=createBuildingScene(sceneHost,{onBusyChange:syncAnimationControls});sceneView.setActive(active);sceneView.update(next.state);syncAnimationControls();}
    else{sceneView?.setActive(false);prepare();}
    const choices=host.querySelector('.builder-choices');if(choices)choices.scrollTop=scroll;
    if(focus){let target=focus.id?host.querySelector(`#${focus.id}`):[...host.querySelectorAll('[data-builder-choice]')].find(b=>b.dataset.builderChoice===focus.choice);
      if(!target||target.disabled)target=sceneView?.isAnimating?sceneHost.querySelector('#builder-motion-status'):nextControl();target?.focus();}
  },scene:{setActive(value){active=value;sceneView?.setActive(value&&Boolean(model?.state));}},dispose(){controller.abort();sceneView?.dispose();host.replaceChildren();}};
}
