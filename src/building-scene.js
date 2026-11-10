import * as THREE from 'three';
import {blockHome,blockRubble,sampleBlockMotion} from './building-models.js';
import {buildingBlueprint,brickTextLayout} from './building-blueprint.js';
import {createBlueprintArt,blueprintBlockVisible} from './building-blueprint-art.js';
import {visibleBuildingWords} from './building-core.js';
import {buildingCameraFrame} from './building-camera.js';
import {buildingBlockFallen} from './building-support.js';
import {withEnglishInstruction} from './english-instructions.js';

const node=(tag,cls)=>{const el=document.createElement(tag);el.className=cls;return el;};
export function createBuildingScene(host,{onBusyChange=()=>{}}={}){
  const world=node('div','builder-world'),flat=node('div','builder-flat'),caption=node('p','builder-motion-status'),toggle=node('button','builder-scene-mode');
  caption.id='builder-motion-status';caption.setAttribute('role','status');caption.setAttribute('aria-live','polite');caption.tabIndex=-1;
  toggle.id='builder-scene-mode';toggle.type='button';host.append(world,flat,toggle,caption);
  const controller=new AbortController(),inspect=node('button','builder-inspect'),dialog=node('dialog','builder-inspect-dialog'),title=node('h4','builder-inspect-title'),choiceLabel=node('label','builder-inspect-label'),choice=node('select','builder-inspect-choice'),bigWord=node('strong','builder-inspect-word'),hint=node('p','builder-inspect-hint'),close=node('button','builder-inspect-close');
  inspect.id='builder-inspect';inspect.type='button';inspect.textContent='放大词砖';dialog.id='builder-inspect-dialog';title.id='builder-inspect-title';title.textContent='看清词砖，大声读';dialog.setAttribute('aria-labelledby',title.id);choice.id='builder-inspect-choice';choiceLabel.textContent='选择要放大的词砖';choiceLabel.append(choice);bigWord.id='builder-inspect-word';hint.textContent='可以直接点建筑上的词砖放大。读对后，关闭这里，再点右侧对应词卡拆砖。';close.type='button';close.textContent='关闭，回到建筑';dialog.append(title,choiceLabel,bigWord,hint,close);host.append(inspect,dialog);
  withEnglishInstruction(inspect,'Enlarge a word brick');
  withEnglishInstruction(title,'Look at the word and read it aloud.');
  withEnglishInstruction(hint,'Tap a brick to enlarge it. Read it, close this window, then tap its card to remove the brick.');
  withEnglishInstruction(close,'Close and return to the building');
  const media=matchMedia('(prefers-reduced-motion: reduce)'),scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-5,5,4,-4,.1,80);
  const assembly=new THREE.Group(),river=new THREE.Group(),particles=new THREE.Group();scene.add(assembly,river,particles);
  const geometries={box:new THREE.BoxGeometry(1,1,1),stud:new THREE.CylinderGeometry(.5,.5,1,12),roof:new THREE.CylinderGeometry(.045,.5,1,8),spire:new THREE.ConeGeometry(.5,1,8),dust:new THREE.SphereGeometry(1,7,5),label:new THREE.PlaneGeometry(1,1)};
  const shape=new THREE.Shape();shape.moveTo(-.5,-.5);shape.lineTo(.5,-.5);shape.lineTo(0,.5);shape.closePath();
  geometries.gable=new THREE.ExtrudeGeometry(shape,{depth:1,bevelEnabled:false});geometries.gable.translate(0,0,-.5);
  const materials=new Map();
  function material(color){if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.63,metalness:.025}));return materials.get(color);}
  function mesh(geometry,color,size,position,parent=scene){const m=new THREE.Mesh(geometry,material(color));m.scale.set(...size);m.position.set(...position);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  mesh(geometries.stud,'#b5c9a0',[10.3,.3,8.8],[0,-.2,0]);mesh(geometries.stud,'#d8dfbf',[10.5,.08,9],[0,-.045,0]);
  mesh(geometries.box,'#94c5c8',[8,.025,3.35],[0,.02,0],river);
  const sun=new THREE.DirectionalLight('#fff2d7',3);sun.position.set(-4,10,7);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-8,right:8,top:9,bottom:-8,near:1,far:30});sun.shadow.normalBias=.035;sun.shadow.bias=-.0003;
  scene.add(new THREE.HemisphereLight('#fff9e8','#a5b9ac',2.1),sun);
  const dustMaterial=new THREE.MeshBasicMaterial({color:'#e4cca1',transparent:true,opacity:0,depthWrite:false});
  for(let i=0;i<20;i++){const puff=new THREE.Mesh(geometries.dust,dustMaterial);puff.scale.setScalar(.07+(i%4)*.025);particles.add(puff);}particles.visible=false;
  let renderer,state,blueprint,blocks=[],descriptors=[],motion=null,frame=0,active=false,simple=false,available=true,disposed=false;
  const labels=[];let inspectedId=null;
  function syncInspector(){
    const ids=state?visibleBuildingWords(state):[],words=state?.words.filter(word=>ids.includes(word.id))??[];inspect.disabled=!active||Boolean(motion)||!words.length;
    if(dialog.open&&(!ids.includes(inspectedId)||!active||motion))dialog.close();choice.replaceChildren(...words.map(word=>{const option=document.createElement('option');option.value=word.id;option.textContent=word.word;return option;}));
    if(ids.includes(inspectedId))choice.value=inspectedId;bigWord.textContent=words.find(word=>word.id===choice.value)?.word??'';
  }
  function inspectWord(id){if(!active||motion||!state)return;const ids=visibleBuildingWords(state);inspectedId=ids.includes(id)?id:ids[0];if(!inspectedId)return;syncInspector();if(!dialog.open)dialog.showModal();}
  inspect.addEventListener('click',()=>inspectWord(inspectedId),{signal:controller.signal});close.addEventListener('click',()=>dialog.close(),{signal:controller.signal});choice.addEventListener('change',()=>{inspectedId=choice.value;bigWord.textContent=state.words.find(word=>word.id===inspectedId)?.word??'';},{signal:controller.signal});
  flat.addEventListener('click',event=>{const brick=event.target.closest('[data-word-brick]');if(brick)inspectWord(brick.dataset.wordBrick);},{signal:controller.signal});
  const raycaster=new THREE.Raycaster();
  world.addEventListener('click',event=>{
    if(!active||motion||simple||!available)return;const rect=world.getBoundingClientRect();if(!rect.width||!rect.height)return;scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);raycaster.setFromCamera(new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,1-(event.clientY-rect.top)/rect.height*2),camera);
    for(const hit of raycaster.intersectObjects(assembly.children,true)){let group=hit.object;while(group.parent&&group.parent!==assembly)group=group.parent;if(group.parent!==assembly||!group.visible)continue;if(group.userData.wordId)inspectWord(group.userData.wordId);break;}
  },{signal:controller.signal});
  function setPose(group,pose){group.position.set(...pose.position);group.rotation.set(...pose.rotation);}
  function currentPose(group){return {position:group.position.toArray(),rotation:[group.rotation.x,group.rotation.y,group.rotation.z]};}
  function captionText(){
    host.dataset.renderMode=simple||!available?'flat':'3d';host.dataset.motion=motion?.kind??'idle';host.setAttribute('aria-busy',String(Boolean(motion)));
    const moving={drop:'词砖逐块落下，正在就位…',remove:'读对了！对应词砖正在移出…',collapse:'失去支撑的词砖正在向下落…',settle:'失去支撑的装饰正在落下…',restore:'魔法复原！全部词砖正飞回原位…'};
    const settled={build:'大声读词，让对应词砖一块块搭起来',built:'建筑搭好啦，挑词朗读，每读一词移走一砖',challenge:`词砖站稳了！还剩${state?visibleBuildingWords(state).length:0}块词砖，继续挑选`,collapsed:'部分词砖失去支撑，读出本课句子来拯救',cleared:'词砖已安全拆完',restored:'复原完成！所有词砖重新回来了'};
    caption.textContent=(host.dataset.renderMode==='3d'?'3D积木 · ':'平面显示 · ')+(motion?moving[motion.kind]:settled[state?.phase]??'准备搭建');
    toggle.textContent=host.dataset.renderMode==='3d'?'平面显示':'立体显示';toggle.disabled=!available;toggle.setAttribute('aria-label',host.dataset.renderMode==='3d'?'切换平面显示':'切换立体显示');
    inspect.disabled=!active||Boolean(motion)||!state||!visibleBuildingWords(state).length;
  }
  function draw(){
    if(disposed||!active||document.hidden||simple||!available||!renderer)return;
    try{renderer.render(scene,camera);}catch{fallback();}
  }
  function finish(){
    cancelAnimationFrame(frame);frame=0;const wasBusy=Boolean(motion);
    if(motion){for(const item of motion.items){item.group.visible=item.visibleEnd;item.group.scale.setScalar(1);setPose(item.group,item.to);}motion=null;}
    assembly.position.set(0,0,0);particles.visible=false;captionText();if(wasBusy)onBusyChange(false);resize();
  }
  function fallback(){available=false;simple=true;finish();captionText();}
  function lost(event){event.preventDefault();fallback();}
  function restored(){available=true;captionText();}
  try{
    renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
    renderer.domElement.setAttribute('aria-hidden','true');renderer.domElement.addEventListener('webglcontextlost',lost);renderer.domElement.addEventListener('webglcontextrestored',restored);world.append(renderer.domElement);
  }catch{available=false;simple=true;}
  function resize(){
    if(disposed||!renderer)return;const width=world.clientWidth,height=world.clientHeight;if(!width||!height)return;
    renderer.setSize(width,height,false);const fit=buildingCameraFrame(descriptors,width/height,motion?.kind==='restore'?'restored':state?.phase==='restored'?'built':state?.phase);
    for(const key of ['left','right','top','bottom'])camera[key]=fit[key];camera.position.set(...fit.position);camera.lookAt(...fit.target);camera.updateProjectionMatrix();draw();
  }
  function makeBlock(description){
    const group=new THREE.Group(),size=description.size;group.userData.wordId=description.wordId;assembly.add(group);
    mesh(geometries[description.kind],description.color,size,[0,0,0],group);
    if(description.kind==='box'&&!['window','door','rail'].includes(description.detail)){
      const nx=Math.min(3,Math.max(1,Math.floor(size[0]/.7))),nz=Math.min(2,Math.max(1,Math.floor(size[2]/.7)));
      for(let x=0;x<nx;x++)for(let z=0;z<nz;z++)mesh(geometries.stud,description.color,[.21,.09,.21],[(x-(nx-1)/2)*Math.min(.65,size[0]/nx),size[1]/2+.045,(z-(nz-1)/2)*Math.min(.65,size[2]/nz)],group);
    }
    if(description.detail==='window'&&size[0]>.6){
      mesh(geometries.box,'#e9dfbe',[size[0]*.61,size[1]*.67,.065],[0,.02,size[2]/2+.035],group);
      mesh(geometries.box,'#9ccbd4',[size[0]*.48,size[1]*.53,.075],[0,.02,size[2]/2+.075],group);
      mesh(geometries.box,'#e9dfbe',[.045,size[1]*.55,.08],[0,.02,size[2]/2+.12],group);
    }
    if(description.detail==='door')mesh(geometries.dust,'#f4d078',[.065,.065,.065],[size[0]*.3,0,size[2]/2+.07],group);
    if(description.detail==='rail')for(const x of [-size[0]*.43,size[0]*.43])mesh(geometries.box,description.color,[.13,.27,.2],[x,-size[1]/2-.13,0],group);
    if(description.word){
      const canvas=document.createElement('canvas'),unit=512/(size[0]*.9),text=brickTextLayout(description.word,size[0],size[1]);canvas.width=512;canvas.height=Math.ceil(size[1]*.82*unit);const context=canvas.getContext('2d');
      context.fillStyle='#fff5dc';context.fillRect(0,0,canvas.width,canvas.height);context.strokeStyle='#cbbd94';context.lineWidth=3;context.strokeRect(2,2,canvas.width-4,canvas.height-4);context.fillStyle='#264f3d';context.textAlign='center';context.textBaseline='middle';context.font=`600 ${text.fontSize*unit}px KaiTi, STKaiti, serif`;
      text.lines.forEach((line,i)=>context.fillText(line,256,canvas.height/2+(i-(text.lines.length-1)/2)*text.fontSize*1.13*unit,498));
      const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const labelMaterial=new THREE.MeshBasicMaterial({map:texture}),label=new THREE.Mesh(geometries.label,labelMaterial);label.scale.set(size[0]*.9,size[1]*.82,1);label.position.set(0,0,size[2]/2+.018);group.add(label);labels.push({texture,material:labelMaterial});
    }
    return group;
  }
  function clearLabels(){for(const label of labels){label.texture.dispose();label.material.dispose();}labels.length=0;}
  function tick(now){
    frame=0;if(disposed||!active||document.hidden||simple||!available){finish();return;}
    if(!motion){draw();return;}let done=true;
    for(const item of motion.items){
      const progress=Math.max(0,Math.min(1,(now-item.start)/item.duration));item.group.visible=now>=item.start;
      setPose(item.group,sampleBlockMotion({...item,kind:item.kind,progress}));item.group.scale.setScalar(item.kind==='remove'?1-progress*.85:1);if(progress<1)done=false;
    }
    const t=Math.max(0,Math.min(1,(now-motion.start)/motion.duration));
    particles.visible=motion.kind==='restore'&&t>0&&t<1;dustMaterial.color.set('#e7bd5d');dustMaterial.opacity=Math.sin(Math.PI*t)*.55;
    particles.children.forEach((p,i)=>{const angle=i*2.399963,r=(motion.kind==='restore'?1-t:t)*3.1;p.position.set(Math.cos(angle)*r,.25+Math.sin(Math.PI*t)*(1+(i%4)*.33),Math.sin(angle)*r);});
    draw();if(!motion||disposed)return;if(done)finish();else frame=requestAnimationFrame(tick);
  }
  function animate(kind,indices,removed=[]){
    finish();const start=performance.now(),duration=kind==='drop'?620:kind==='remove'?720:['collapse','settle'].includes(kind)?850:1250,stagger=kind==='drop'?85:kind==='remove'?0:24;
    const items=indices.map((index,order)=>{
      const itemKind=removed.includes(index)?'remove':kind,group=blocks[index],home=blockHome(descriptors[index]),to=['collapse','settle'].includes(itemKind)?blockRubble(descriptors[index],index):itemKind==='remove'?{position:[home.position[0]+1.4,home.position[1]+.5,home.position[2]+2.5],rotation:[0,.6,-.25]}:home;
      const from=kind==='drop'?{position:[home.position[0],home.position[1]+4.4,home.position[2]],rotation:[0,(index%2?1:-1)*.35,0]}:currentPose(group);
      const visibleEnd=itemKind!=='remove'&&(Boolean(descriptors[index].wordId)||!buildingBlockFallen(descriptors[index],index,state));
      group.scale.setScalar(1);setPose(group,from);group.visible=kind!=='drop';return {group,from,to,index,kind:itemKind,start:start+order*stagger,duration,visibleEnd};
    });
    if(!items.length)return;
    motion={kind,items,start,duration:duration+(items.length-1)*stagger};captionText();onBusyChange(true);
    if(media.matches||!active||document.hidden||simple||!available)finish();else frame=requestAnimationFrame(tick);
  }
  const observer=new ResizeObserver(resize);observer.observe(world);
  function visibility(){if(document.hidden){if(dialog.open)dialog.close();finish();}else{resize();draw();}}
  function preference(){if(media.matches)finish();}
  document.addEventListener('visibilitychange',visibility);media.addEventListener('change',preference);
  toggle.onclick=()=>api.setSimple(!simple);
  const api={
    update(next){
      const fresh=state?.words!==next.words||state?.structure!==next.structure||state?.variant!==next.variant,previous=state;
      if(fresh){if(dialog.open)dialog.close();inspectedId=null;finish();clearLabels();assembly.clear();blueprint=buildingBlueprint(next.structure,{words:next.words,variant:next.variant});descriptors=blueprint.blocks;blocks=descriptors.map(makeBlock);}
      state=next;river.visible=next.structure==='bridge';const visible=visibleBuildingWords(next);host.dataset.wordBricks=String(visible.length);host.dataset.parts=String(visible.length);host.dataset.blueprint=blueprint.name;host.setAttribute('aria-label',`${blueprint.name}，${next.phase==='collapsed'?'已倒塌，':''}剩余${visible.length}块词砖：${next.words.filter(w=>visible.includes(w.id)).map(w=>w.word).join('、')}`);
      flat.replaceChildren(createBlueprintArt(blueprint,next));
      const wanted=index=>blueprintBlockVisible(descriptors[index],next,index),indices=blocks.map((_,i)=>i);
      if(fresh){blocks.forEach((group,index)=>{group.visible=wanted(index);setPose(group,buildingBlockFallen(descriptors[index],index,next)?blockRubble(descriptors[index],index):blockHome(descriptors[index]));});}
      else if(next.phase==='restored'&&['collapsed','cleared'].includes(previous.phase)){
        finish();const returning=indices.filter(index=>!blocks[index].visible||buildingBlockFallen(descriptors[index],index,previous));returning.forEach(index=>{if(!blocks[index].visible)setPose(blocks[index],blockRubble(descriptors[index],index));blocks[index].visible=true;});animate('restore',returning);
      }else{
        const added=indices.filter(i=>wanted(i)&&!blueprintBlockVisible(descriptors[i],previous,i)),removed=indices.filter(i=>!wanted(i)&&blueprintBlockVisible(descriptors[i],previous,i));
        const falling=indices.filter(i=>buildingBlockFallen(descriptors[i],i,next)&&!buildingBlockFallen(descriptors[i],i,previous));
        if(falling.length)animate(next.phase==='collapsed'?'collapse':'settle',[...new Set([...removed,...falling])],removed.filter(i=>descriptors[i].wordId));else if(removed.length)animate('remove',removed);else if(added.length)animate('drop',added);
      }
      syncInspector();captionText();resize();
    },
    get isAnimating(){return Boolean(motion);},
    setActive(value){active=value;if(!value){if(dialog.open)dialog.close();finish();}else{captionText();resize();draw();}},
    setSimple(value){simple=Boolean(value)||!available;finish();captionText();resize();},
    dispose(){disposed=true;active=false;if(dialog.open)dialog.close();controller.abort();finish();observer.disconnect();document.removeEventListener('visibilitychange',visibility);media.removeEventListener('change',preference);renderer?.domElement.removeEventListener('webglcontextlost',lost);renderer?.domElement.removeEventListener('webglcontextrestored',restored);clearLabels();Object.values(geometries).forEach(g=>g.dispose());materials.forEach(m=>m.dispose());dustMaterial.dispose();sun.shadow.dispose();renderer?.dispose();host.replaceChildren();},
  };captionText();return api;
}
