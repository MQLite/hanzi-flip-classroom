import {createTrainScene} from './sentence-train-scene.js';
function el(tag,text,className){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e}
export function createTrainView(host,dispatch,onFallback){
 host.innerHTML=`<div class="train-intro"><span class="eyebrow">THE SENTENCE EXPRESS</span><h3>把词语排成一句话</h3><p>从左到右接车厢，一起读出你的句子。</p></div><section id="train-scene" data-mode="simple"><div class="train-track-heading"><span>出发轨道 <span aria-hidden="true">←</span></span><small>词语从左到右读 →</small></div><div class="train-track-scroll" tabindex="0" aria-label="句子轨道，可横向滚动"><div class="train-track-model"><div class="train-engine" aria-hidden="true">小火车</div><div id="train-selected"></div><span id="train-punctuation" aria-hidden="true">。</span></div></div><div class="train-reading-row"><span>我的句子</span><p id="train-reading" aria-live="polite"></p></div><div class="train-yard-heading"><span>候车区</span><small id="train-remaining"></small></div><div class="train-yard-model"><div id="train-palette"></div></div></section><div id="train-feedback" role="status" aria-live="polite"></div><p id="train-reference" hidden></p><div class="train-actions"><button id="train-undo">撤回</button><button id="train-clear">清空</button><button id="train-check" class="primary">发车</button></div><div class="train-secondary"><button id="train-reveal" class="text-button">看看参考句</button><button id="train-accept" class="secondary" hidden>老师判对</button></div><section id="train-summary" hidden></section>`;
 const $=s=>host.querySelector(s);let key='',scene,lastPalette,controlsRevision=0;
 $('.train-intro').append($('.train-actions'),$('.train-secondary'));
 $('.train-reading-row').after($('#train-reference'));
 for(const intent of ['undo','clear','check','reveal','accept'])$(`#train-${intent}`).onclick=()=>dispatch(intent);
 scene=createTrainScene($('#train-scene'),{onFallback});
 function tileButton(tile,position,where){const b=el('button',tile.text,'train-tile');b.type='button';b.dataset.tile=tile.id;b.setAttribute('aria-label',`${tile.text}，${where}第${position+1}节`);b.onclick=()=>dispatch('tile',tile.id);return b}
 function update(session){const i=session.currentIndex,q=session.questions[i],active=session.phase==='active',judgment=session.judgments[i],palette=session.palettes[i]??[],selections=session.selections[i]??[],locked=!active||Boolean(judgment)||Boolean(session.departure),check=session.checks[i],revealed=session.revealed[i];
 const nextKey=`${session.roundId??session.mode}:${q?.id}:${i}:${session.phase}`;
 if(key!==nextKey||lastPalette!==palette){controlsRevision++;key=nextKey;lastPalette=palette;$('#train-palette').replaceChildren(...palette.map((tile,n)=>tileButton(tile,n,'候车区')));$('#train-selected').replaceChildren();$('.train-track-scroll').scrollLeft=0}
 const focused=document.activeElement?.dataset.tile,focusInTrack=document.activeElement?.closest('#train-selected');
 for(const b of $('#train-palette').children){const selected=selections.includes(b.dataset.tile);b.setAttribute('aria-pressed',String(selected));b.disabled=locked||selected;b.classList.toggle('is-selected',selected)}
 const previous=Array.from($('#train-selected').children).map(b=>b.dataset.tile).join();
 if(previous!==selections.join()){controlsRevision++;$('#train-selected').replaceChildren(...selections.map((id,n)=>tileButton(palette.find(t=>t.id===id),n,'轨道')));if(focused){const target=host.querySelector(`#train-selected [data-tile="${CSS.escape(focused)}"]`)??host.querySelector(`#train-palette [data-tile="${CSS.escape(focused)}"]:not(:disabled)`);target?.focus({preventScroll:true})}}
 for(const b of $('#train-selected').children)b.disabled=locked;
 const text=selections.map(id=>palette.find(t=>t.id===id)?.text??'').join('');$('#train-reading').textContent=text+(q?.train.punctuation??'');$('#train-punctuation').textContent=q?.train.punctuation??'';
 $('#train-remaining').textContent=`${palette.length-selections.length?`还差 ${palette.length-selections.length} 节`:'全部到齐，可以发车'} · 固定候车位`;
 $('#train-undo').disabled=locked||!selections.length;$('#train-clear').disabled=locked||!selections.length;$('#train-check').disabled=locked||selections.length!==palette.length;$('#train-reveal').disabled=locked||Boolean(revealed);
 $('#train-accept').hidden=locked||!check||(!revealed&&check!=='mismatch');
 $('#train-reference').hidden=!active||(!revealed&&!judgment);$('#train-reference').textContent=`参考句：${q?.sentence??''}`;
 $('#train-feedback').textContent=judgment?judgment.outcome==='correct'?`已记分 · ${judgment.source==='teacher'?'教师接受':'参考答案匹配'} · ${judgment.sentence}`:judgment.outcome==='practice'?'已加入再练一次，点击下一句继续。':'这一句未作答，回看不再计分。':check==='mismatch'?'与参考答案不同，可以调整，也可以请老师判断。':check==='match'?'与参考答案相符；已看过参考句，请老师判对后记分。':active?'点击候车区接车厢；点击轨道上的车厢可以放回。':'';
 $('#train-scene').hidden=!active;$('.train-intro').hidden=!active;$('.train-actions').hidden=!active;$('.train-secondary').hidden=!active;
 const summary=$('#train-summary');summary.hidden=active;summary.replaceChildren();
 if(!active){summary.append(el('span',session.phase==='empty'?'◇':'★','train-summary-symbol'),el('h3',session.phase==='empty'?'当前范围没有可用句子':'这一轮，顺利到站！'));
 if(session.phase==='empty'){summary.append(el('p','当前筛选没有有效车厢切分。请在题库管理中为例句设置 3–7 节词语。'));const b=el('button','设置句子题','primary');b.onclick=()=>dispatch('editor');summary.append(b)}else{const count=outcome=>session.judgments.filter(j=>j?.outcome===outcome).length;summary.append(el('p',`${count('correct')} 句已完成 · ${session.judgments.filter(j=>j?.source==='teacher').length} 句教师接受`),el('p',`${count('practice')} 句再练 · ${count('unanswered')} 句未作答`));if(count('practice')){const b=el('button','开始复习','primary');b.onclick=()=>dispatch('review');summary.append(b)}}}
 scene.update({palette:active?palette:[],selections:active?selections:[],key,controlsRevision});
 if(previous!==selections.join()&&selections.length){const b=$('#train-selected').lastElementChild;b?.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'})}
 }
 return {update,scene,dispose(){scene.dispose();host.replaceChildren()}};
}
