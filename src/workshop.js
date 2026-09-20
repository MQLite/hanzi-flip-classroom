export function createWorkshopView(host, onSelect, onSubmit, onUndo, onClear) {
  host.innerHTML = `<div id="workshop-active"><div id="workshop-scene" aria-label="木质活字印刷工作台"><div class="workshop-simple-art" aria-hidden="true"></div><div class="printshop-brief"><span>本题用字</span><strong id="workshop-target"></strong><span id="workshop-pinyin"></span><p>从备选栏找字，按顺序排成一个词。</p></div><div class="printshop-rack-label">备选活字 <small>含干扰字 · 再点可放回</small></div><div class="printshop-shelf-label">成品印版</div><div id="workshop-tiles" aria-label="备选汉字活字块"></div><div class="printshop-feedback" id="workshop-selection-note" role="status">挑选活字，排出一个词语</div><div class="printshop-dock"><div class="printshop-draft"><span>排字顺序</span><div id="workshop-word" aria-live="polite"></div></div><div class="printshop-edit"><button id="workshop-undo">撤回一字</button><button id="workshop-clear">清空</button></div><button id="workshop-submit" class="primary">融合印版</button></div></div><div id="desk-ledger-slot"></div></div><div id="workshop-status" hidden></div>`;
  const find=id=>host.querySelector(`#${id}`);
  let paletteKey='';
  find('workshop-submit').onclick=onSubmit;
  find('workshop-undo').onclick=onUndo;
  find('workshop-clear').onclick=onClear;
  return {
    update({question,phase,value,palette,selections,showPinyin,statusNodes,locked,busy,feedback,invalid}) {
      host.dataset.phase=phase;
      find('workshop-active').hidden=phase==='empty';
      find('workshop-status').hidden=phase==='active';
      if(phase!=='active')find('workshop-status').replaceChildren(...statusNodes);
      find('workshop-target').textContent=question?.character??'';
      find('workshop-pinyin').textContent=showPinyin?question?.pinyin??'':'';
      find('workshop-word').textContent=value;
      find('workshop-word').dataset.empty=String(!value);
      find('workshop-submit').disabled=locked||busy||[...value].length<2;
      find('workshop-undo').disabled=locked||busy||!value;
      find('workshop-clear').disabled=locked||busy||!value;
      const key=JSON.stringify(palette);
      if(key!==paletteKey){
        paletteKey=key;
        find('workshop-tiles').replaceChildren(...palette.map(tile=>{
          const button=document.createElement('button');button.textContent=tile.character;
          button.dataset.tileId=tile.id;button.setAttribute('aria-label',tile.character);
          button.onclick=()=>onSelect(tile.id);return button;
        }));
      }
      find('workshop-tiles').querySelectorAll('button').forEach(button=>{
        const index=selections.indexOf(button.dataset.tileId);
        button.setAttribute('aria-pressed',String(index>=0));
        button.dataset.order=index>=0?String(index+1):'';
        button.disabled=Boolean(locked||busy||(selections.length>=8&&index<0));
      });
      find('workshop-selection-note').textContent=invalid?'本题暂无有效参考词，请老师修改题库':feedback==='success'?'融合成功！印版入架，准备下一题':feedback==='failure'?'融合失败：未匹配本题参考词，再试一次':busy?'正在融合印版…':locked?'本题已结束，可切换下一字':palette.length?'挑选活字，排出一个词语':'暂无可用活字，请在题库中补充参考词';
      find('workshop-scene').dataset.feedback=feedback||'idle';
      find('workshop-scene').setAttribute('aria-busy',String(busy));
    },
  };
}
