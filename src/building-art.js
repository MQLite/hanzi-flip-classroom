export const BUILDING_TYPES={house:'房',bridge:'桥',tower:'塔',building:'楼'};
const rect=(x,y,w,h,fill='#c8ad86')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${fill}"/>`;
const house=[rect(68,245,264,12,'#8c9c83'),...Array.from({length:4},(_,i)=>rect(72+i*64,185,64,60)),...Array.from({length:4},(_,i)=>rect(72+i*64,125,64,60)),
  '<path d="M62 132L200 44V132Z" fill="#cb8268"/>','<path d="M200 44L338 132H200Z" fill="#b56e58"/>',rect(170,185,60,60,'#816b50'),rect(93,145,44,38,'#a2c6c0'),rect(262,145,44,38,'#a2c6c0'),rect(265,52,22,40,'#b07863'),'<circle cx="219" cy="217" r="4" fill="#e9cc71"/>'];
const bridge=[...Array.from({length:3},(_,i)=>rect(78+i*108,205,30,52,'#9caa9d')),...Array.from({length:8},(_,i)=>rect(48+i*38,182,38,24,'#bca17f')),
  ...Array.from({length:4},(_,i)=>`<path d="M${50+i*75} 183V145H${125+i*75}V183" fill="none" stroke="#7e9180" stroke-width="7" stroke-linejoin="round"/>`),'<path d="M48 179H352" stroke="#e1c377" stroke-width="6"/>'];
const tower=[rect(117,256,166,9,'#8c9c83')];
for(let i=0;i<5;i++){const w=140-i*20,y=221-i*35;tower.push(rect(200-w/2,y,w,34,'#d1b586'),`<path d="M${190-w/2} ${y}L200 ${y-20}L${210+w/2} ${y}Z" fill="${i%2?'#9c6e5c':'#bc8064'}"/>`);}
for(let i=0;i<4;i++)tower.push(rect(192,230-i*35,16,20,'#718d80'));
tower.push('<path d="M200 63V22M201 23L230 32L201 41" fill="#d9ad62" stroke="#92784f" stroke-width="3"/>');
const building=[rect(100,263,200,10,'#859a87'),rect(103,80,194,12,'#617e71')];
for(let row=0;row<3;row++)for(let col=0;col<4;col++){const x=110+col*45,y=207-row*56;building.push(`<g>${rect(x,y,45,56,'#a8b8a2')}${rect(x+10,y+10,25,29,'#eed596')}</g>`);}
building.push(rect(180,220,40,43,'#6e887a'),'<g><rect x="146" y="92" width="108" height="24" rx="4" fill="#fff4d6"/><text x="200" y="109" text-anchor="middle" font-size="15" fill="#59725e">中文小楼</text></g>');
const parts={house,bridge,tower,building};

export function createBuildingArt({structure='house',progress=0,phase='build'}={}){
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),all=parts[structure]??parts.house;
  const count=Math.ceil(Math.max(0,Math.min(1,progress))*all.length),collapsed=phase==='collapsed';
  svg.setAttribute('viewBox','0 0 400 300');svg.setAttribute('role','img');svg.setAttribute('aria-label',`${collapsed?'已倒塌的':progress===1?'完整的':'正在搭建的'}${BUILDING_TYPES[structure]??'房'}`);
  svg.classList.add('builder-art');if(collapsed)svg.classList.add('is-collapsed');if(phase==='restored')svg.classList.add('is-restored');
  svg.innerHTML=`<ellipse cx="200" cy="272" rx="175" ry="12" fill="#dce4cf"/><circle cx="327" cy="51" r="23" fill="#eedba1" opacity=".7"/>${structure==='bridge'?'<path d="M25 249Q95 228 160 250T300 250T390 248V278H25Z" fill="#bad7d0"/>':''}<g class="builder-ghost">${all.join('')}</g><g>${all.slice(0,count).map((part,i)=>`<g class="built-part" data-build-part="${i}" style="--part:${i}">${part}</g>`).join('')}</g>`;
  return svg;
}
