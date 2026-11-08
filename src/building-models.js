const block=(size,position,color,detail='',kind='box')=>Object.freeze({kind,size:Object.freeze(size),position:Object.freeze(position),color,detail});
const house=[block([4.4,.22,3.5],[0,.11,0],'#819780')];
for(let row=0;row<2;row++){
  const y=.22+(row+.5)*1.08;
  for(const z of [1.4,-1.4])for(const x of [-1.03,1.03])house.push(block([2,1.05,.34],[x,y,z],row?'#e7c694':'#d7af7e',z>0&&row?'window':''));
  for(const x of [-1.99,1.99])house.push(block([.32,1.05,2.5],[x,y,0],row?'#dfbd8c':'#cfa778'));
}
house.push(block([4.8,1.45,3.6],[0,3.105,0],'#bd6b51','','gable'),block([.85,1.35,.15],[0,.91,1.63],'#6f8d89','door'),block([.45,1.15,.55],[1.22,3.45,-.6],'#b78064'));
const bridge=[];
for(const x of [-2.3,0,2.3])bridge.push(block([.9,1.8,2],[x,.9,0],'#90a8a2'));
for(let i=0;i<7;i++)bridge.push(block([.98,.35,2.4],[i-3,1.975,0],i%2?'#d1b582':'#e3c997'));
for(const z of [-1.08,1.08])for(const x of [-2.3,0,2.3])bridge.push(block([2.25,.64,.17],[x,2.47,z],'#6e9284','rail'));
const tower=[block([3.8,.22,3.8],[0,.11,0],'#8a9b84')];
for(let row=0;row<5;row++){
  const w=2.9-row*.4,y=.22+row*.82;
  tower.push(block([w,.64,w],[0,y+.32,0],row%2?'#e7ca9c':'#d6b27f'));
  tower.push(block([w+.55,.32,w+.55],[0,y+.8,0],row%2?'#8f6654':'#b47758','','roof'));
}
for(let row=0;row<4;row++)tower.push(block([.36,.42,.12],[0,.55+row*.82,(2.9-row*.4)/2+.07],'#517f7b','window'));
tower.push(block([.25,.78,.25],[0,4.6,0],'#e1ba60','','spire'));
const building=[block([3.8,.22,2.9],[0,.11,0],'#7d9389')];
for(let row=0;row<4;row++)for(let col=0;col<3;col++)building.push(block([1.12,1.02,2.5],[(col-1)*1.14,.22+(row+.5)*1.05,0],row%2?'#9fbfb6':'#86aaa3','window'));
building.push(block([3.75,.2,2.85],[0,4.52,0],'#527e73'),block([.68,1.1,.15],[0,.77,1.35],'#526f71','door'),block([.7,.7,.7],[.85,4.97,-.5],'#cdb471'));
const models=Object.freeze({house:Object.freeze(house),bridge:Object.freeze(bridge),tower:Object.freeze(tower),building:Object.freeze(building)});
export function buildingBlocks(type){return models[type]??models.house;}
export function blockHome(block){return {position:[...block.position],rotation:[...(block.rotation??[0,0,0])]};}
export function blockRubble(block,index){
  const angle=index*2.399963,radius=1.65+(index%4)*.37;
  const rotation=index===0?[0,.65,0]:block.kind==='box'?[.95+(index%3)*.2,0,((index%5)-2)*.35]:[.08,.8+(index%4)*.5,-.08];
  const [x,y,z]=rotation,a=Math.cos(x),b=Math.sin(x),c=Math.cos(y),d=Math.sin(y),e=Math.cos(z),f=Math.sin(z);
  const halfY=(Math.abs(a*f+b*e*d)*block.size[0]+Math.abs(a*e-b*f*d)*block.size[1]+Math.abs(b*c)*block.size[2])/2;
  return {position:[Math.cos(angle)*radius,halfY+.04+(index%3)*.055,Math.sin(angle)*radius],rotation};
}
function bounce(t){const n=7.5625,d=2.75;if(t<1/d)return n*t*t;if(t<2/d)return n*(t-=1.5/d)*t+.75;if(t<2.5/d)return n*(t-=2.25/d)*t+.9375;return n*(t-=2.625/d)*t+.984375;}
export function sampleBlockMotion({from,to,kind,index=0,progress}){
  const t=Number.isFinite(progress)?Math.max(0,Math.min(1,progress)):0;
  if(t===0||t===1){const pose=t===0?from:to;return {position:[...pose.position],rotation:[...pose.rotation]};}
  const smooth=t*t*(3-2*t),position=from.position.map((v,i)=>v+(to.position[i]-v)*(kind==='drop'?bounce(t):smooth));
  const rotation=from.rotation.map((v,i)=>v+(to.rotation[i]-v)*smooth);
  if(kind!=='drop'){position[1]+=Math.sin(Math.PI*t)*(kind==='restore'?2.8:1.5+(index%3)*.2);rotation[1]+=Math.sin(Math.PI*t)*(kind==='restore'?1.8:.7);}
  return {position,rotation};
}
