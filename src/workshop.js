export function createWorkshopView(host, onSelect, onSubmit, onUndo, onClear, onDecision) {
  host.innerHTML = `<div id="workshop-active"><div id="workshop-scene" aria-label="木质活字印刷工作台"><div class="workshop-simple-art" aria-hidden="true"></div><div class="printshop-brief"><strong>共享字盘</strong><span id="workshop-remaining"></span><p>拼出参考词收走活字，其他词可请老师判断。</p></div><div class="printshop-rack-label">备选活字 <small>再点可放回</small></div><div class="printshop-shelf-label">成品印版</div><div id="workshop-tiles" aria-label="备选汉字活字块"></div><div class="printshop-feedback" id="workshop-selection-note" role="status">挑选活字，排出一个词语</div><div class="printshop-dock"><div class="printshop-draft"><span>排字顺序</span><div id="workshop-word" aria-live="polite"></div></div><div class="printshop-edit"><button id="workshop-undo">撤回一字</button><button id="workshop-clear">清空</button></div><button id="workshop-submit" class="primary">融合印版</button><div id="workshop-teacher" hidden><p id="workshop-pending-note"></p><button id="workshop-accept">教师判对</button><button id="workshop-reject">返回重试</button></div></div></div><div id="desk-ledger-slot"></div></div><div id="workshop-status" hidden></div><details id="workshop-references"><summary>教师参考词</summary><div></div></details>`;
  const find=id=>host.querySelector(`#${id}`);
  let paletteKey='', referenceKey='';
  find('workshop-submit').onclick=onSubmit;
  find('workshop-undo').onclick=onUndo;
  find('workshop-clear').onclick=onClear;
  return {
    update({phase,value,palette,totalSlots,selections,references,pending,pendingTeam,statusNodes,locked,busy,feedback}) {
      host.dataset.phase=phase;
      find('workshop-scene').dataset.dense=String(totalSlots>20);
      find('workshop-active').hidden=phase==='empty';
      find('workshop-status').hidden=phase==='active'||busy;
      if(phase!=='active')find('workshop-status').replaceChildren(...statusNodes);
      find('workshop-remaining').textContent=`剩余 ${palette.length} 个活字`;
      find('workshop-word').textContent=value;
      find('workshop-word').dataset.empty=String(!value);
      find('workshop-submit').disabled=locked||busy||[...value].length<2;
      find('workshop-undo').disabled=locked||busy||!value;
      find('workshop-clear').disabled=locked||busy||!value;
      find('workshop-teacher').hidden=!pending||busy;
      find('workshop-pending-note').textContent=pending?`「${pending.word}」未匹配参考词，请老师判断 · ${pendingTeam}`:'';
      // Bind the rendered token so stale controls cannot decide a replacement word.
      find('workshop-accept').onclick=()=>onDecision(true,pending);
      find('workshop-reject').onclick=()=>onDecision(false,pending);
      const nextReferences=JSON.stringify(references);
      if(nextReferences!==referenceKey){
        referenceKey=nextReferences;find('workshop-references').open=false;
        find('workshop-references').querySelector('div').replaceChildren(...references.map(word=>{
          const span=document.createElement('span');span.className='workshop-reference';span.dataset.word=word;span.textContent=word;return span;
        }));
      }
      const key=JSON.stringify(palette);
      if(key!==paletteKey){
        paletteKey=key;
        find('workshop-tiles').style.setProperty('--tray-rows',Math.ceil(totalSlots/4));
        find('workshop-tiles').replaceChildren(...palette.map(tile=>{
          const button=document.createElement('button');button.textContent=tile.character;
          button.dataset.tileId=tile.id;button.dataset.slot=tile.slot;button.setAttribute('aria-label',tile.character);
          button.style.gridColumn=String(tile.slot%4+1);button.style.gridRow=String(Math.floor(tile.slot/4)+1);
          button.onclick=()=>onSelect(tile.id);return button;
        }));
      }
      find('workshop-tiles').querySelectorAll('button').forEach(button=>{
        const index=selections.indexOf(button.dataset.tileId);
        button.setAttribute('aria-pressed',String(index>=0));
        button.dataset.order=index>=0?String(index+1):'';
        button.disabled=Boolean(locked||busy||(selections.length>=8&&index<0));
      });
      find('workshop-selection-note').textContent=pending?'等待教师判断，活字保留在排字台':feedback==='teacher'?'教师认可！印版入架，活字归位':feedback==='success'?'参考匹配！印版入架，继续用剩余活字组词':feedback==='failure'?'活字已归位，再试一次':feedback==='duplicate'?'这个词已收集，换一个词试试':busy?'正在融合印版…':phase==='complete'?'本盘参考词全部完成！':'挑选 2–8 个活字，排出一个词语';
      find('workshop-scene').dataset.feedback=feedback||'idle';
      find('workshop-scene').setAttribute('aria-busy',String(busy));
    },
  };
}
