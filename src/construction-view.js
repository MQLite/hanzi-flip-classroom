import {FORM_CATALOG,STROKE_NAMES} from './construction-data.js';
import {createStrokeAudio} from './stroke-audio.js';
import {mountHandwritingPad} from './handwriting-pad.js';
import {createStrokeGuides} from './stroke-guides.js';
import {showHandwritingScore} from './handwriting-score-dialog.js';
import './handwriting.css';
import {renderComponentPuzzle} from './component-puzzle.js';
import './component-puzzle.css';

const NS='http://www.w3.org/2000/svg',cache=new Map();
const colors=['#e6b857','#79b6c5','#da8f9c','#a3b36e'];
function node(tag,text,className){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;}
function svgNode(tag,attributes={}){const n=document.createElementNS(NS,tag);for(const [key,value] of Object.entries(attributes))n.setAttribute(key,value);return n;}
async function loadGlyph(character){
  if(!cache.has(character))cache.set(character,fetch(`${import.meta.env.BASE_URL}strokes/${encodeURIComponent(character)}.json`).then(r=>{if(!r.ok)throw Error('missing');return r.json();}).then(data=>{
    if(!Array.isArray(data.strokes)||!data.strokes.every(d=>typeof d==='string'&&/^[Mm]/.test(d))||!Array.isArray(data.medians)||data.medians.length!==data.strokes.length||!data.medians.every(stroke=>Array.isArray(stroke)&&stroke.length>=2&&stroke.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite))))throw Error('invalid');return data;
  }).catch(error=>{cache.delete(character);throw error;}));
  return cache.get(character);
}

export function createConstructionView(root,{onAction}){
  const audio=createStrokeAudio();let current=null,epoch=0,audioAttempt=0,visible=true,disposed=false,selected='',muted=false,drag=null,suppressUntil=0,pad=null,scorePopup=null;
  let showStrokeHints = true;
  function dismissScore(){scorePopup?.dispose();scorePopup=null;}
  function scoreMetrics(state){const results=state.strokeScores[state.index];return Object.fromEntries(['shape','position','length'].map(key=>[key,Math.round(results.reduce((sum,r)=>sum+r.metrics[key],0)/results.length)]));}
  function cancelDrag(){if(drag){drag.ghost?.remove();drag=null;}window.removeEventListener('pointermove',pointerMove);window.removeEventListener('pointerup',pointerUp);window.removeEventListener('pointercancel',pointerCancel);}
  function pointerCancel(){cancelDrag();}
  function stop(){audioAttempt++;cancelDrag();pad?.cancel();audio.stop();}
  function action(name,value){if(!visible||disposed)return;onAction(name,value);}
  function button(text,name,value,className=''){const b=node('button',text,className);b.type='button';b.onclick=()=>action(name,value);return b;}
  function status(text){const p=node('p',text,'construction-status');p.setAttribute('role','status');return p;}
  function empty(title,message){const box=node('div',undefined,'construction-empty');box.append(node('h3',title),node('p',message));return box;}
  function glyph(host,character,indices,{fit=false,parts=null}={},token=epoch){
    const svg=svgNode('svg',{viewBox:'0 0 1024 1024','aria-hidden':'true'});host.append(svg);
    loadGlyph(character).then(data=>{
      if(disposed||!visible||token!==epoch||!host.isConnected)return;
      const group=svgNode('g',{transform:'translate(0 900) scale(1 -1)'});svg.append(group);
      for(const i of indices??data.strokes.map((_,i)=>i)){
        const fill=parts?colors[Math.max(0,parts.findIndex(p=>p.indices.includes(i)))%colors.length]:'currentColor';
        group.append(svgNode('path',{d:data.strokes[i],fill}));
      }
      if(fit){const b=group.getBBox(),pad=Math.max(b.width,b.height)*.12+15;svg.setAttribute('viewBox',`${b.x-pad} ${900-b.y-b.height-pad} ${b.width+pad*2} ${b.height+pad*2}`);}
    }).catch(()=>{if(!disposed&&token===epoch&&host.isConnected){svg.remove();host.append(node('span','字形暂未载入，请重试','glyph-load-error'));}});
  }
  function coverage(pool){
    const box=node('div',undefined,'construction-coverage');
    if(pool.independent.length&&current.mode==='puzzle')box.append(node('p',`独体字或规范中保留为整体的部件：${pool.independent.join('、')}。这些字不强拆，可到“笔画很忙”练习。`));
    if(pool.excluded.length&&current.mode==='puzzle')box.append(node('p',`这些字暂不出拼图题：${pool.excluded.join('、')}。可继续做笔画练习。`));
    if(pool.unsupported.length)box.append(node('p',`尚无核定资料：${pool.unsupported.join('、')}。本轮先练习已核定的字。`));
    return box;
  }
  function references(){const d=node('details',undefined,'construction-references');d.append(node('summary','教学资料依据'));const p=node('p','部件参考《现代常用独体字规范》《现代常用字部件及部件名称规范》；笔顺参考《通用规范汉字笔顺规范》，笔名参考教育部书法教育指导纲要。组合部件不等于最小部件，英文说明不作字源推断。');d.append(p);return d;}
  function renderPuzzle(state,pool){renderComponentPuzzle(root,{state,pool,onAction:action,renderGlyph:glyph});}
  function chooseStroke(name){
    const attempt=++audioAttempt;
    selected=name;root.querySelectorAll('[data-stroke-name]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.strokeName===name)));
    const hint=root.querySelector('.selected-stroke-label');if(hint)hint.textContent=`已选：${name} · 拖到白色字影的对应位置，也可点击位置`;
    audio.play(name).then(ok=>{if(!ok&&attempt===audioAttempt&&!muted&&visible&&selected===name){const hint=root.querySelector('.selected-stroke-label');if(hint)hint.textContent=`已选：${name} · 读音未能播放，可再点一次重试。`;}});
  }
  function pointerMove(event){
    if(!drag||event.pointerId!==drag.id)return;
    if(Math.hypot(event.clientX-drag.x,event.clientY-drag.y)>6){drag.moved=true;if(!drag.ghost){drag.ghost=drag.button.cloneNode(true);drag.ghost.classList.add('stroke-drag-ghost');drag.ghost.removeAttribute('id');drag.ghost.setAttribute('aria-hidden','true');document.body.append(drag.ghost);}drag.ghost.style.left=event.clientX+'px';drag.ghost.style.top=event.clientY+'px';}event.preventDefault();
  }
  function placeAt(x,y){
    const grid=root.querySelector('.writing-grid');if(!selected||!grid||!current.geometry)return;
    const r=grid.getBoundingClientRect();if(x<r.left||x>r.right||y<r.top||y>r.bottom)return;
    const p=new DOMPoint(x,y).matrixTransform(grid.getScreenCTM().inverse());action('place',{name:selected,point:[p.x,900-p.y],geometry:current.geometry});
  }
  function pointerUp(event){if(!drag||event.pointerId!==drag.id)return;const moved=drag.moved;cancelDrag();suppressUntil=performance.now()+350;if(moved)placeAt(event.clientX,event.clientY);}
  function strokeButton(name,review=false){
    const b=node('button',undefined,'stroke-card');b.type='button';b.dataset.strokeName=name;b.setAttribute('aria-pressed',String(selected===name));b.setAttribute('aria-label',`${review?'播放':'选择'}${name}`);
    const shape=node('span',undefined,'stroke-shape'),example=FORM_CATALOG.strokeExamples[name];glyph(shape,example.character,[example.index],{fit:true});b.append(shape,node('span',name));
    b.onclick=event=>{if(event.detail&&performance.now()<suppressUntil)return;if(review)audio.play(name);else chooseStroke(name);};
    if(!review)b.onpointerdown=event=>{if(event.button!==0)return;cancelDrag();chooseStroke(name);suppressUntil=performance.now()+500;drag={id:event.pointerId,x:event.clientX,y:event.clientY,button:b,moved:false};window.addEventListener('pointermove',pointerMove,{passive:false});window.addEventListener('pointerup',pointerUp);window.addEventListener('pointercancel',pointerCancel);};
    return b;
  }
  function renderReview(state,pool){
    const panel=node('section',undefined,'stroke-review');panel.append(node('h3',state.completed.length===pool.characters.length?'✦ 本课完成！笔画总复习':'基础笔画 · 复习与预习'),node('p','点笔画听读音。标“本课”的是这节课已经用过的；其他笔画可以提前认识。'));
    const used=new Set(pool.characters.flatMap(c=>c.names)),list=node('div',undefined,'stroke-review-grid');for(const name of STROKE_NAMES){const card=strokeButton(name,true);card.append(node('small',used.has(name)?'本课':'预习'));list.append(card);}panel.append(list,button('返回本课练习','review',false));root.append(panel);
  }
  function renderHandwriting(state,pool){
    const record=state.characters[state.index],layout=node('div',undefined,'writing-layout handwriting-layout'),stage=node('section',undefined,'writing-stage'),side=node('aside',undefined,'writing-side handwriting-side');
    stage.append(node('h3',`写一写：${record.character}`),node('p',`已完成 ${state.placed} / ${record.names.length} 笔 · 本课完成 ${state.completed.length} / ${pool.characters.length} 字`,'stroke-progress'));
    const grid=svgNode('svg',{viewBox:'0 0 1024 1024',class:'writing-grid handwriting-pad',role:'group','aria-label':`${record.character}的触屏描写田字格`});grid.append(svgNode('path',{d:'M512 0V1024M0 512H1024',class:'grid-cross'}),svgNode('path',{d:'M0 0L1024 1024M1024 0L0 1024',class:'grid-diagonal'}));stage.append(grid);
    const messages={
      ready: showStrokeHints ? '从当前编号旁的小圆点起笔，沿虚线和箭头写完一笔后抬手。' : '观察字影，按笔顺逐笔描写。',
      accepted: `写对了：${state.lastName??''}。继续下一笔。`,
      complete: '✦ 这个字写完了！看看你的描写参考分。',
      'wrong-order': '请按笔顺写下一笔。',
      'wrong-direction': '这一笔方向反了，请重新起笔。',
      retry: '再试一次，连续写完这一笔，注意位置和方向。',
    };
    const feedback=status(messages[state.feedback]??messages.ready);feedback.classList.add('handwriting-status');stage.append(feedback);
    const token=epoch;loadGlyph(record.character).then(data=>{
      if(disposed||!visible||token!==epoch||!grid.isConnected)return;if(data.strokes.length!==record.names.length)throw Error('count');current.geometry=data;
      pad=mountHandwritingPad(grid,{geometry:data,state,showStrokeHints,onStroke:points=>action('trace',{points,geometry:data}),onCancel:message=>{if(token===epoch)feedback.textContent=message;}});
    }).catch(()=>{if(token===epoch&&grid.isConnected)feedback.textContent='字形暂未载入，请切换本字后重试。';});
    const instruction = showStrokeHints
      ? '沿细虚线写，不必描满粗字影。写对一笔，自动读出笔画名。'
      : '看字影，按笔顺逐笔写。写对一笔，自动读出笔画名。';
    side.append(node('h3','自己写'),node('p',instruction,'construction-instruction'));
    if(state.scores[state.index]!==null){
      const score=node('section',undefined,'handwriting-score');score.id='handwriting-score';score.dataset.score=state.scores[state.index];score.setAttribute('aria-live','polite');const number=node('strong',String(state.scores[state.index]));number.append(node('small',' / 100'));score.append(node('h4','描写相似度参考分'),number);
      const results=state.strokeScores[state.index],metrics=node('div',undefined,'handwriting-score-metrics');for(const [key,label] of [['shape','形状'],['position','位置'],['length','长短']])metrics.append(node('span',`${label} ${Math.round(results.reduce((sum,r)=>sum+r.metrics[key],0)/results.length)}`));score.append(metrics,node('p','按完成的笔画比较；写得慢、重试不扣分。'));side.append(score);
    }else side.append(node('p',`正在描写第 ${state.placed+1} 笔，完成整字后显示参考分。`,'handwriting-ready'));
    const written=node('div',undefined,'handwriting-written-strokes');written.setAttribute('aria-label','已写对的笔画，可点选再听');for(const name of record.names.slice(0,state.placed)){const b=node('button',name);b.type='button';b.setAttribute('aria-label',`重听${name}`);b.onclick=()=>audio.play(name);written.append(b);}side.append(written);
    if(state.completed.length===pool.characters.length)side.append(node('p','✦ 本课写完啦！可以打开“笔画总复习 / 预习”。','construction-celebrate'));
    const history=node('section',undefined,'handwriting-results');history.append(node('h4','本课描写记录'));const list=node('div',undefined,'handwriting-result-list');state.characters.forEach((c,i)=>{if(state.scores[i]===null)return;const item=node('span');item.dataset.character=c.character;item.append(node('b',c.character),node('span',`${state.scores[i]}分`));list.append(item);});if(!list.children.length)list.append(node('p','完成一个字，就会记下一个参考分。'));history.append(list);side.append(history,coverage(pool),references());layout.append(stage,side);root.append(layout);
  }
  function renderStrokes(state,pool){
    if(!pool.characters.length){root.append(empty('本课暂无核定笔画','请选择其他课次，或补充核定的汉字资料。'),coverage(pool));return;}
    const inputMode=current.inputMode??'drag',switcher=node('div',undefined,'stroke-input-switch');switcher.setAttribute('role','group');switcher.setAttribute('aria-label','练习方式');switcher.append(node('span','练习方式'));
    for(const [value,label] of [['drag','拖动笔画'],['write','触屏描写']]){const b=button(label,'input-mode',value);b.setAttribute('aria-pressed',String(inputMode===value));switcher.append(b);}root.append(switcher);
    const top=node('div',undefined,'writing-top'),record=state.characters[state.index];
    const controls=node('div',undefined,'construction-actions');const prev=button('← 上一字','next',-1),next=button('下一字 →','next',1);prev.disabled=state.index===0;next.disabled=state.index===state.characters.length-1;
    controls.append(prev,node('span',`${state.index+1} / ${state.characters.length}`),next,button('撤回一笔','undo'),button('笔画总复习 / 预习','review',true));
    if(inputMode==='write')controls.append(button('重写本字','rewrite'));
    const mute=node('button',muted?'读音：关闭':'读音：开启');mute.type='button';mute.setAttribute('aria-pressed',String(!muted));mute.onclick=()=>{audioAttempt++;muted=!muted;audio.setMuted(muted);mute.textContent=muted?'读音：关闭':'读音：开启';mute.setAttribute('aria-pressed',String(!muted));};
    const hints = node('button', showStrokeHints ? '笔顺提示：开启' : '笔顺提示：关闭', 'stroke-hints-toggle');
    hints.type = 'button';
    hints.setAttribute('role', 'switch');
    hints.setAttribute('aria-label', '笔顺提示');
    hints.setAttribute('aria-checked', String(showStrokeHints));
    hints.onclick = () => {
      showStrokeHints = !showStrokeHints;
      render();
      root.querySelector('.stroke-hints-toggle')?.focus({preventScroll:true});
    };
    controls.append(mute,hints);top.append(controls);root.append(top);
    if(state.review){renderReview(state,pool);return;}
    if(inputMode==='write'){renderHandwriting(state,pool);return;}
    const layout=node('div',undefined,'writing-layout'),stage=node('section',undefined,'writing-stage'),side=node('aside',undefined,'writing-side');
    stage.append(node('h3',`写一写：${record.character}`),node('p',`已完成 ${state.placed} / ${record.names.length} 笔 · 本课完成 ${state.completed.length} / ${pool.characters.length} 字`,'stroke-progress'));
    const grid=svgNode('svg',{viewBox:'0 0 1024 1024',class:'writing-grid',role:'group','aria-label':`${record.character}的大田字格`});
    grid.append(svgNode('path',{d:'M512 0V1024M0 512H1024',class:'grid-cross'}),svgNode('path',{d:'M0 0L1024 1024M1024 0L0 1024',class:'grid-diagonal'}));stage.append(grid);
    const token=epoch;
    loadGlyph(record.character).then(data=>{
      if(disposed||!visible||epoch!==token||!grid.isConnected)return;
      if(data.strokes.length!==record.names.length)throw Error('count');current.geometry=data;
      const shadow=svgNode('g',{transform:'translate(0 900) scale(1 -1)',class:'glyph-shadow'}),ink=svgNode('g',{transform:'translate(0 900) scale(1 -1)',class:'glyph-written'});grid.append(shadow,ink);
      const targets = data.strokes.map((d, index) => {
        const median = data.medians[index];
        return {d, index, point: median[Math.floor(median.length / 2)]};
      });
      // In review, keyboard focus follows positions from top to bottom.
      if (!showStrokeHints) targets.sort((a, b) => b.point[1] - a.point[1] || a.point[0] - b.point[0]);
      for (const [position, {d, index, point}] of targets.entries()) {
        const path = svgNode('path', {d});
        if (index >= state.placed) {
          path.setAttribute('tabindex', '0');
          path.setAttribute('role', 'button');
          path.setAttribute('aria-label', `字影位置${position + 1}`);
          path.onkeydown = event => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            action('place', {name: selected, point, geometry: data});
          };
        }
        shadow.append(path);
      }
      for (let index = 0; index < state.placed; index++) {
        ink.append(svgNode('path', {d: data.strokes[index], class: index === state.placed - 1 ? 'new-stroke' : ''}));
      }
      if(showStrokeHints)grid.append(createStrokeGuides(data.medians,state.placed));
    }).catch(()=>{if(epoch===token&&grid.isConnected)stage.append(status('字形暂未载入，请重新选择本字重试。'));});
    grid.onclick=event=>placeAt(event.clientX,event.clientY);
    const messages={'wrong-name':'笔画名称还不对应下一笔，请按规范笔顺再选。','wrong-position':'这是别的位置。观察字影，按顺序放入下一笔。',complete:'✦ 这个字完成了！读一读，再练下一个字。',placed:'放对了！请说出下一笔的名称。',ready:'学生先说笔画名称，老师再选择并拖入。'};
    stage.append(status(messages[state.feedback]??messages.ready));
    side.append(node('h3','笔画工具箱'),node('p','选笔画听读音，再拖到田字格。','construction-instruction'),node('p',selected?`已选：${selected}`:'先选一笔','selected-stroke-label'));
    const palette=node('div',undefined,'stroke-palette');const names=new Set(record.names);Object.values(record.aliases??{}).flat().forEach(n=>names.add(n));for(const name of STROKE_NAMES.filter(n=>names.has(n)))palette.append(strokeButton(name));side.append(palette);
    if(showStrokeHints&&Object.keys(record.aliases??{}).length)side.append(node('p',record.aliases[2]?.includes('提')?'女字旁末笔在本字形中称“横”，也接受书写教学中的“提”。':'本字末笔显示为“竖钩”，也接受课堂上使用的“弯钩”。','stroke-variant-note'));
    const instruction = showStrokeHints
      ? '数字标出笔顺，箭头指示行笔方向。每放对一笔，字影就会亮起来。'
      : '按笔顺放入笔画。每放对一笔，字影就会亮起来。';
    side.append(node('p',instruction,'construction-instruction'),coverage(pool),references());layout.append(stage,side);root.append(layout);
  }
  function render(){
    if(!current||!visible||disposed)return;epoch++;pad?.dispose();pad=null;current.geometry=null;cancelDrag();root.replaceChildren();root.classList.add('construction-game');root.dataset.activity=current.mode;root.dataset.inputMode=current.inputMode??'drag';
    const {mode,state,pool}=current;if(mode==='puzzle')renderPuzzle(state,pool);else renderStrokes(state,pool);
  }
  function onHidden(){if(document.hidden)stop();}document.addEventListener('visibilitychange',onHidden);window.addEventListener('blur',stop);
  return {
    update(value){const accepted=current&&visible&&!document.hidden&&value.mode==='strokes'&&value.inputMode==='write'&&current.inputMode==='write'&&current.mode===value.mode&&current.pool===value.pool&&current.state.index===value.state.index&&value.state.placed===current.state.placed+1&&['accepted','complete'].includes(value.state.feedback);
      const changed=!current||current.mode!==value.mode||current.pool!==value.pool||current.state.index!==value.state.index||current.inputMode!==value.inputMode;const advanced=current&&current.state.placed!==value.state.placed;if(changed){dismissScore();stop();selected='';}else if(advanced)selected='';current={...value};render();if(accepted){audioAttempt++;audio.play(value.state.lastName);
        if(value.state.feedback==='complete'){const {state}=value;dismissScore();scorePopup=showHandwritingScore({character:state.characters[state.index].character,score:state.scores[state.index],metrics:scoreMetrics(state),onClose(){scorePopup=null;const summary=root.querySelector('#handwriting-score');if(visible&&!disposed&&summary){summary.tabIndex=-1;summary.focus({preventScroll:true});}}});}
      }},
    setVisible(value){if(visible===value)return;visible=value;epoch++;stop();if(!visible){dismissScore();pad?.dispose();pad=null;}if(visible)render();},
    dispose(){disposed=true;epoch++;dismissScore();stop();pad?.dispose();pad=null;audio.dispose();document.removeEventListener('visibilitychange',onHidden);window.removeEventListener('blur',stop);root.replaceChildren();}
  };
}
