const make=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const moleArt='<svg viewBox="0 0 150 125" aria-hidden="true"><ellipse cx="75" cy="112" rx="54" ry="29" fill="#966649"/><circle cx="36" cy="39" r="18" fill="#9a6a4e"/><circle cx="114" cy="39" r="18" fill="#9a6a4e"/><circle cx="36" cy="39" r="10" fill="#d5a488"/><circle cx="114" cy="39" r="10" fill="#d5a488"/><ellipse cx="75" cy="69" rx="53" ry="49" fill="#b78960"/><ellipse cx="75" cy="89" rx="33" ry="25" fill="#ead1a6"/><path d="M56 64q5-8 10 0m18 0q5-8 10 0" fill="none" stroke="#352e27" stroke-width="4" stroke-linecap="round"/><ellipse cx="75" cy="79" rx="9" ry="6" fill="#5a3c31"/><path d="M75 85v7m-9 0q9 10 18 0" fill="none" stroke="#6b4936" stroke-width="2.5" stroke-linecap="round"/><ellipse cx="45" cy="79" rx="9" ry="5" fill="#db9b84"/><ellipse cx="105" cy="79" rx="9" ry="5" fill="#db9b84"/><path d="m60 30 7-15 8 13 12-12 3 17" fill="#708e52"/></svg>';
const hammerArt='<svg viewBox="0 0 110 130" aria-hidden="true"><rect x="49" y="45" width="15" height="78" rx="6" fill="#ac7647" stroke="#754d30" stroke-width="3"/><rect x="13" y="16" width="86" height="43" rx="13" fill="#e3b45a" stroke="#936731" stroke-width="4"/><path d="M27 23v28m58-28v28" stroke="#b5873c" stroke-width="4"/><path d="M38 27h28" stroke="#f7d995" stroke-width="4" stroke-linecap="round"/></svg>';

export function createMoleView(host,dispatch){
  let model,key=null,buttons=[],timers=new Map(),focusSlot=null;
  function cancelAnimations(){for(const timer of timers.values())clearTimeout(timer);timers.clear();}
  function build(){
    cancelAnimations();key=model.state.words;host.replaceChildren();buttons=[];
    const intro=make('div',undefined,'mole-intro');
    intro.append(make('strong','读对一个，就敲一下！'),make('span','学生读词，老师挥锤。没有倒计时，慢慢读。'));
    const note=make('p',undefined,'mole-note');note.id='mole-note';
    const grid=make('div',undefined,'mole-grid');grid.setAttribute('role','group');grid.setAttribute('aria-label','九个地鼠洞');
    for(let slot=0;slot<9;slot++){
      const b=make('button',undefined,'mole-slot');b.type='button';b.dataset.moleSlot=slot;
      b.innerHTML=`<span class="mole-hole" aria-hidden="true"></span><span class="mole-clip"><span class="mole-body">${moleArt}</span></span><span class="mole-plaque"><strong class="mole-word"></strong><small class="mole-pinyin"></small></span><span class="mole-hammer">${hammerArt}</span><span class="mole-burst" aria-hidden="true">✦</span>`;
      b.onclick=()=>dispatch('hit',{slot,wordId:b.dataset.moleId});buttons.push(b);grid.append(b);
    }
    const status=make('p',undefined,'mole-status');status.id='mole-status';status.setAttribute('role','status');
    const empty=make('div',undefined,'mole-empty');empty.id='mole-empty';empty.hidden=true;
    const celebration=make('section',undefined,'mole-celebration');celebration.id='mole-celebration';celebration.hidden=true;celebration.setAttribute('aria-labelledby','mole-complete-title');
    const confetti=make('div',undefined,'mole-confetti');confetti.setAttribute('aria-hidden','true');
    for(let i=0;i<42;i++){const part=make('i');part.style.setProperty('--i',i);part.style.left=`${(i*37)%100}%`;part.style.setProperty('--delay',`${(i%9)*.12}s`);confetti.append(part);}
    const badge=make('div','★','mole-trophy');badge.setAttribute('aria-hidden','true');
    const title=make('h3','全部读对啦！');title.id='mole-complete-title';title.tabIndex=-1;
    const total=make('p');total.id='mole-complete-total';
    const replay=make('button','再玩一轮','primary');replay.onclick=()=>dispatch('restart');
    celebration.append(confetti,badge,title,total,replay);host.append(intro,note,grid,status,empty,celebration);
  }
  function update(value){
    model=value;if(key!==model.state.words)build();
    const state=model.state;host.dataset.phase=state.phase;
    host.querySelector('#mole-note').textContent=model.note;
    for(let slot=0;slot<9;slot++){
      const b=buttons[slot],hole=state.holes[slot],word=hole?state.words.find(w=>w.id===hole.id):null;
      if(document.activeElement===b&&(hole?.status==='hit'||!hole||b.dataset.moleId!==hole.id))focusSlot=slot;
      b.dataset.status=hole?.status??'empty';b.dataset.moleId=hole?.id??'';b.dataset.moleWord=word?.word??'';
      b.disabled=hole?.status!=='up';
      b.setAttribute('aria-label',word?`读对了，敲下${word.word}`:'这个洞已经读完');
      b.querySelector('.mole-word').textContent=word?.word??'';
      b.style.setProperty('--word-size',`${word&&[...word.word].length>6?20:word&&[...word.word].length>3?26:34}px`);
      const pinyin=b.querySelector('.mole-pinyin');pinyin.textContent=word?.pinyin??'';pinyin.hidden=!model.showPinyin||!word?.pinyin;
      if(hole?.status==='hit'&&!timers.has(slot)){
        const id=hole.id;timers.set(slot,setTimeout(()=>{timers.delete(slot);dispatch('settle',{slot,wordId:id});},620));
      }
    }
    const pending=state.holes.some(h=>h?.status==='hit'),complete=state.phase==='complete'&&!pending;
    host.querySelector('#mole-status').textContent=state.phase==='empty'?'':`已读对 ${state.hits.length} / ${state.words.length} 个${pending?' · 好样的！':''}`;
    const empty=host.querySelector('#mole-empty');empty.hidden=state.phase!=='empty';
    empty.textContent=model.type==='words'?'本课没有可用词语，可切换“生字＋词语”或选择其他课。':'本课没有可用生字或词语，请选择其他课次或在题库管理中补充。';
    host.querySelector('.mole-grid').hidden=state.phase==='empty';
    const celebration=host.querySelector('#mole-celebration'),wasHidden=celebration.hidden;celebration.hidden=!complete;
    host.querySelector('#mole-complete-total').textContent=`${state.words.length} 个生字与词语，都被你们读出来了。`;
    if(complete&&wasHidden)host.querySelector('#mole-complete-title').focus({preventScroll:true});
    else if(focusSlot!==null&&!pending){const target=buttons[focusSlot].disabled?buttons.find(b=>!b.disabled):buttons[focusSlot];target?.focus({preventScroll:true});focusSlot=null;}
  }
  return {update,cancelAnimations};
}
