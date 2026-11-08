const names={house:['尖顶小屋','平顶庭院','双顶小屋','阶梯屋顶'],bridge:['平梁桥','拱背桥','斜拉桥','廊桥'],tower:['飞檐宝塔','城堡塔','灯塔','阶梯塔'],building:['方正小楼','阶梯楼','双翼楼','中心高楼']};
export function brickTextLayout(word,width,height){
  const chars=[...word];if(!chars.length)return {lines:[],fontSize:0};let best={columns:1,fontSize:0};
  for(let columns=1;columns<=chars.length;columns++){const rows=Math.ceil(chars.length/columns),fontSize=Math.min(width*.88/columns,height*.8/(rows*1.13));if(fontSize>best.fontSize)best={columns,fontSize};}
  return {lines:Array.from({length:Math.ceil(chars.length/best.columns)},(_,i)=>chars.slice(i*best.columns,(i+1)*best.columns).join('')),fontSize:best.fontSize};
}
export function buildingBlueprint(type,{words=[],variant=0}={}){
  if(!names[type])type='house';variant=((Math.trunc(variant)||0)%4+4)%4;
  const blocks=[],add=(size,position,color,kind='box',extra={})=>blocks.push(Object.freeze({kind,size:Object.freeze(size),position:Object.freeze(position),color,detail:'',...extra}));
  const n=Math.max(1,words.length),columns=type==='bridge'?Math.min(8,n):type==='tower'?Math.min(3,Math.ceil(Math.sqrt(n/1.5))):Math.min(4,Math.ceil(Math.sqrt(n))),rows=Math.ceil(n/columns);
  const span=type==='bridge'?7.4:type==='tower'?3.3:4.4,step=span/columns,height=type==='bridge'?.72:type==='tower'?.95:1.0,depth=type==='bridge'?2.0:type==='tower'?1.75:2.4,base=type==='bridge'?1.25:.24;
  const tops=[];
  add([span+.5,.22,depth+.6],[0,.11,0],'#8ba38b','box',{reveal:'base'});
  for(let index=0;index<n;index++){
    const row=Math.floor(index/columns),col=index%columns,count=Math.min(columns,n-row*columns);let x=(col-(count-1)/2)*step,y=base+(row+.5)*height,w=step-.055;
    if(type==='bridge'&&variant===1)y+=Math.sin((col+.5)/columns*Math.PI)*.8;
    if(type==='tower'){if(variant===0)w*=1-row*.035;if(variant===3)x+=row*.14;}
    if(type==='building'){if(variant===1)x+=row*.27;if(variant===2&&columns>1)x+=(col<(count/2)?-.25:.25);if(variant===3)y+=Math.max(0,1-Math.abs(col-(count-1)/2))*.55;}
    add([w,height-.045,depth],[x,y,0],type==='bridge'?'#e0c18c':row%2?'#dec591':'#cdb57f','box',{wordId:words[index]?.id??null,word:words[index]?.word??'',reveal:'word'});tops.push({x,y:y+height/2,w});
  }
  const top=Math.max(...tops.map(t=>t.y));
  if(type==='house'){
    if(variant===0)add([span+.55,1.35,depth+.7],[0,top+.675,0],'#bb7154','gable',{reveal:'finish'});
    if(variant===1){add([span+.7,.3,depth+.7],[0,top+.15,0],'#688d7c','box',{reveal:'finish'});for(const x of [-span/2,span/2])add([.22,.55,depth+.6],[x,top+.55,0],'#8fa38a','box',{reveal:'finish'});}
    if(variant===2)for(const x of [-span/4,span/4])add([span/2+.35,1.0,depth+.7],[x,top+.5,0],'#ba7159','gable',{reveal:'finish'});
    if(variant===3)for(let i=0;i<3;i++)add([span*(1-i*.28)+.4,.36,depth+.55],[0,top+.18+i*.36,0],'#a77c5c','box',{reveal:'finish'});
    add([.35,.65,.45],[span*.3,top+(variant===1?.62:.9),-.5],'#a9896b','box',{reveal:'finish'});
  }else if(type==='bridge'){
    for(const x of [-span*.41,0,span*.41])add([.65,1.2,depth*.85],[x,.65,0],'#88a69b','box',{reveal:'base'});
    if(variant===2){for(const x of [-span*.3,span*.3]){add([.25,top+1.25,.25],[x,(top+1.25)/2,-depth/2],'#729286','box',{reveal:'finish'});for(const dx of [-1,1])add([1.6,.12,.15],[x+dx*.65,top+.55,-depth/2],'#b8a578','box',{rotation:[0,0,dx*.55],reveal:'finish'});}}
    else if(variant===3){for(const x of [-span*.44,span*.44])add([.2,top+1.1,.2],[x,(top+1.1)/2,-depth/2],'#809a80','box',{reveal:'finish'});add([span+.4,.9,depth+.6],[0,top+1.1,0],'#9c7259','gable',{reveal:'finish'});}
    else add([span+.25,.16,.16],[0,top+.16,-depth/2],'#728c77','box',{reveal:'finish'});
  }else if(type==='tower'){
    if(variant===0){for(let row=0;row<rows;row++)add([span+.4-row*.05,.18,depth+.5],[0,base+(row+1)*height+.07,-.04],'#a7775b','box',{reveal:'finish'});add([span+.2,.7,depth+.4],[0,top+.4,0],'#a7775b','gable',{reveal:'finish'});}
    if(variant===1){add([span+.3,.22,depth+.3],[0,top+.11,0],'#8c9b81','box',{reveal:'finish'});for(const x of [-span*.4,0,span*.4])add([.55,.55,depth+.25],[x,top+.495,0],'#a6aa8a','box',{reveal:'finish'});}
    if(variant===2){add([span*.9,.6,depth+.2],[0,top+.3,0],'#8daca3','box',{reveal:'finish'});add([span+.4,.65,depth+.6],[0,top+.925,0],'#bc7258','gable',{reveal:'finish'});}
    if(variant===3)for(let i=0;i<3;i++)add([span*(1-i*.25),.3,depth+.3],[rows*.14/2,top+.15+i*.3,0],'#a28864','box',{reveal:'finish'});
    add([.2,.6,.2],[variant===3?rows*.14/2:0,top+[1,.7,1.55,1.2][variant],0],'#ddb65b','spire',{reveal:'finish'});
  }else{
    for(const t of tops.filter((_,i)=>i>=n-columns))add([t.w+.1,.18,depth+.35],[t.x,t.y+.09,0],'#678d81','box',{reveal:'finish'});
    if(variant===0)add([.65,.65,.7],[span*.3,top+.5,-.4],'#b5a576','box',{reveal:'finish'});
    if(variant===1)add([.35,1.0,.35],[span*.3,top+.55,-.4],'#c3ab74','box',{reveal:'finish'});
    if(variant===2)add([.22,.9,.22],[-span*.45,top+.5,-.4],'#d0b778','spire',{reveal:'finish'});
    if(variant===3)add([span*.45,.9,depth*.8],[0,top+.6,-.1],'#87a99a','box',{reveal:'finish'});
  }
  return Object.freeze({name:names[type][variant],blocks:Object.freeze(blocks)});
}
