import {blockHome,blockRubble} from './building-models.js';
import {visibleBuildingWords} from './building-core.js';
import {brickTextLayout} from './building-blueprint.js';
const svgNode=(tag,attributes={},text)=>{const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [key,value]of Object.entries(attributes))n.setAttribute(key,String(value));if(text!==undefined)n.textContent=text;return n;};
export function blueprintBlockVisible(block,state){return block.wordId?visibleBuildingWords(state).includes(block.wordId):block.reveal==='base'||state.builtIds.length===state.words.length;}
export function createBlueprintArt(blueprint,state){
  const svg=svgNode('svg',{role:'img','aria-label':`${blueprint.name}，剩余${visibleBuildingWords(state).length}块词砖`}),items=[];let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  blueprint.blocks.forEach((block,index)=>{
    const pose=state.phase==='collapsed'?blockRubble(block,index):blockHome(block),[x,y]=pose.position,[w,h]=block.size;
    minX=Math.min(minX,x-w/2-.12);maxX=Math.max(maxX,x+w/2+.2);minY=Math.min(minY,-y-h/2);maxY=Math.max(maxY,-y+h/2+.12);
    if(!blueprintBlockVisible(block,state))return;
    const group=svgNode('g',{'data-word-brick':block.wordId??'',transform:`translate(${x} ${-y}) rotate(${-pose.rotation[2]*180/Math.PI})`});if(!block.wordId)group.removeAttribute('data-word-brick');
    if(['gable','spire','roof'].includes(block.kind))group.append(svgNode('path',{d:`M${-w/2} ${h/2}L0 ${-h/2}L${w/2} ${h/2}Z`,fill:block.color,stroke:'#496b5633','stroke-width':.025}));
    else group.append(svgNode('rect',{x:-w/2,y:-h/2,width:w,height:h,rx:.045,fill:block.color,stroke:'#496b5633','stroke-width':.025}));
    if(block.word){const {lines,fontSize}=brickTextLayout(block.word,w,h);
      group.append(svgNode('rect',{x:-w*.45,y:-h*.41,width:w*.9,height:h*.82,rx:.04,fill:'#fff5dc'}));lines.forEach((line,i)=>group.append(svgNode('text',{x:0,y:(i-(lines.length-1)/2)*fontSize*1.13,'text-anchor':'middle','dominant-baseline':'central','font-family':'KaiTi, STKaiti, serif','font-size':fontSize,fill:'#315b48'},line)));
    }items.push({group,depth:pose.position[2]+block.size[2]/2});
  });
  svg.setAttribute('viewBox',`${minX-.3} ${minY-.3} ${maxX-minX+.6} ${maxY-minY+.6}`);svg.append(...items.sort((a,b)=>a.depth-b.depth).map(item=>item.group));return svg;
}
