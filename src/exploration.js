import {ZHONGWEN_ID,PARADISE_ID,coursesForTextbook,stagesForTextbook} from './curriculum.js';
import {ruby,gloss} from './ruby.js';
import {CITY_TOUR_STAGES} from './city-tour-data.js';

// Scenario content is separate from character and vocabulary question banks.
export const EXPLORATIONS=[{
  id:'two-letters',source:'zhongwen',textbook:ZHONGWEN_ID,stage:'5',book:5,lesson:9,
  lessonTitle:'古诗二首',title:'旧屋里的两封信',href:'./quest.html',
  description:'一件旧衣，一面旧镜，两封未寄出的信。观察物件、组合线索，读懂《游子吟》《回乡偶书》里的心意。',
}, {
  id:'city-mission',source:'paradise',textbook:PARADISE_ID,stage:'2A',book:2,lesson:2,
  lessonTitle:'我从北京来',title:'豆豆游中国',href:'./city.html',cityScene:true,
}, {
  id:'room-escape',source:'zhongwen',textbook:ZHONGWEN_ID,stage:'1',book:1,lesson:3,
  lessonTitle:'识字（三）',title:'密室逃脱',href:'./room.html',
  description:'出口锁住了。读懂十二条汉字线索，跟猫咪找到钥匙，一起打开房门。',
}];

export function matchingExplorations({source,stage,lesson}){
  return EXPLORATIONS.filter(s=>s.source===source&&s.stage===stage&&s.lesson===lesson);
}

export function explorationStages(textbook){
  return [...new Set([...stagesForTextbook(textbook),...EXPLORATIONS.filter(s=>s.textbook===textbook).map(s=>s.stage)])];
}
export function explorationCourses(textbook){
  const courses=[...coursesForTextbook(textbook)];
  for(const scenario of EXPLORATIONS.filter(s=>s.textbook===textbook)){
    if(!courses.some(c=>c.book===scenario.book&&c.lesson===scenario.lesson))courses.push({book:scenario.book,stage:scenario.stage,lesson:scenario.lesson,title:scenario.lessonTitle});
  }
  return courses;
}
export function renderExplorations(root,selection,{urlForScenario}={}){
  root.replaceChildren();
  const scenarios=matchingExplorations(selection);
  if(!scenarios.length){
    const empty=document.createElement('div');empty.className='exploration-empty';
    const title=document.createElement('h3');title.textContent='本课情景待补充';
    const note=document.createElement('p');note.textContent='试试中文第一册第3课「密室逃脱」、第五册第9课「旧屋里的两封信」，或汉语乐园 2A 第2课「豆豆的记忆」。';
    empty.append(title,note);root.append(empty);return;
  }
  for(const scenario of scenarios){
    const card=document.createElement('article');card.className='exploration-card';
    const content=document.createElement('div');
    const meta=document.createElement('p');meta.className='exploration-meta';
    const title=document.createElement('h3');title.textContent=scenario.title;
    const description=document.createElement('p');description.textContent=scenario.description;
    const tags=document.createElement('p');tags.className='exploration-tags';
    const link=document.createElement('a');link.className='primary exploration-enter';link.href=urlForScenario?.(scenario)??scenario.href;link.textContent='进入情景';
    content.append(meta,title,description,tags,link);
    const art=document.createElement('div');art.className='exploration-cover';art.setAttribute('aria-hidden','true');
    if(scenario.cityScene){
      art.classList.add('city-exploration-cover');
      meta.replaceChildren(ruby('汉语乐园','Hànyǔ Lèyuán'),' · 2A · ',ruby('第','Dì'),'2',ruby('课','kè'));
      title.replaceChildren(ruby(scenario.title,'Dòudou yóu Zhōngguó'),gloss('Doudou Explores China'));
      description.replaceChildren('和豆豆一起找回记忆、登泰山、游长江，再到北京认地标。',gloss('Find Doudou’s memories, climb Mount Tai, sail the Yangtze and explore Beijing.'));
      tags.replaceChildren(...CITY_TOUR_STAGES.map((stage,index)=>{
        const line=document.createElement('span');
        line.className='city-tour-level';
        line.textContent='第'+(index+1)+'关 · '+stage.name;
        return line;
      }));
      link.replaceChildren(ruby('进入情景','Jìnrù qíngjǐng'),gloss('Open the game'));
      link.setAttribute('aria-label','进入情景');
    }else if(scenario.id==='room-escape'){
      meta.textContent='中文（暨南大学版）· 第一册 · 第3课 识字（三）';
      tags.textContent='12条汉字线索　·　3D密室　·　猫咪同伴';
      art.classList.add('room-exploration-cover');
      art.innerHTML='<svg viewBox="0 0 200 150" width="200" height="150"><path d="M59 117V31h69v86" fill="#c28f58" stroke="#edbc78" stroke-width="8"/><path d="M70 117V41l50 8v68z" fill="#24584e" stroke="#173a36" stroke-width="3"/><circle cx="106" cy="80" r="4" fill="#ffc76b"/><path d="M128 105h43v10h-8v7h-9v-7h-26a15 15 0 1 1 0-10zm-15 1a5 5 0 1 0 0 10 5 5 0 0 0 0-10" fill="#ffd377" fill-rule="evenodd"/><path d="M42 115q-15-3-15-14m5-16 5 6 7-4 6 4 6-6v14q0 10-12 10-12 0-12-10z" fill="#f3a564" stroke="#f3a564" stroke-width="4" stroke-linecap="round"/></svg>';
    }else{
      meta.textContent='中文（暨南大学版）· 第五册 · 第9课 古诗二首';
      tags.textContent='5关探索　·　带提示 / 独立挑战　·　自动保存进度';
      art.innerHTML='<span class="exploration-lamp"></span><span class="exploration-envelope"></span><span class="exploration-cover-caption">两封信，藏着怎样的心意？</span>';
    }
    card.append(art,content);root.append(card);
  }
}
