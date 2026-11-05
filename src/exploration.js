import {ZHONGWEN_ID,PARADISE_ID,coursesForTextbook,stagesForTextbook} from './curriculum.js';
import {ruby,gloss} from './ruby.js';

// Scenario content is separate from character and vocabulary question banks.
export const EXPLORATIONS=[{
  id:'two-letters',source:'zhongwen',textbook:ZHONGWEN_ID,stage:'5',book:5,lesson:9,
  lessonTitle:'古诗二首',title:'旧屋里的两封信',href:'./quest.html',
  description:'一件旧衣，一面旧镜，两封未寄出的信。观察物件、组合线索，读懂《游子吟》《回乡偶书》里的心意。',
}, {
  id:'city-mission',source:'paradise',textbook:PARADISE_ID,stage:'2A',book:2,lesson:2,
  lessonTitle:'我从北京来',title:'豆豆的记忆',href:'./city.html',cityScene:true,
}];

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
export function renderExplorations(root,selection){
  root.replaceChildren();
  const scenarios=EXPLORATIONS.filter(s=>s.source===selection.source&&s.stage===selection.stage&&s.lesson===selection.lesson);
  if(!scenarios.length){
    const empty=document.createElement('div');empty.className='exploration-empty';
    const title=document.createElement('h3');title.textContent='本课情景待补充';
    const note=document.createElement('p');note.textContent='可探索《古诗二首》或汉语乐园 2A 第2课《我从北京来》。';
    empty.append(title,note);root.append(empty);return;
  }
  for(const scenario of scenarios){
    const card=document.createElement('article');card.className='exploration-card';
    const content=document.createElement('div');
    const meta=document.createElement('p');meta.className='exploration-meta';
    const title=document.createElement('h3');title.textContent=scenario.title;
    const description=document.createElement('p');description.textContent=scenario.description;
    const tags=document.createElement('p');tags.className='exploration-tags';
    const link=document.createElement('a');link.className='primary exploration-enter';link.href=scenario.href;link.textContent='进入情景';
    content.append(meta,title,description,tags,link);
    const art=document.createElement('div');art.className='exploration-cover';art.setAttribute('aria-hidden','true');
    if(scenario.cityScene){
      art.classList.add('city-exploration-cover');
      art.textContent='🗺️';
      meta.replaceChildren(ruby('汉语乐园','Hànyǔ Lèyuán'),' · 2A · ',ruby('第','Dì'),'2',ruby('课','kè'));
      title.replaceChildren(ruby(scenario.title,'Dòudou de jìyì'),gloss('Doudou’s Lost Memory'));
      description.replaceChildren(ruby('读一读线索，','Dú yi dú xiànsuǒ,'),ruby('猜一猜城市。','cāi yi cāi chéngshì.'),gloss('Read the clues and guess the city.'));
      tags.replaceChildren('7 ',ruby('关','guān'),gloss('7 levels'));
      link.replaceChildren(ruby('进入情景','Jìnrù qíngjǐng'),gloss('Open the game'));
      link.setAttribute('aria-label','进入情景');
    }else{
      meta.textContent='中文（暨南大学版）· 第五册 · 第9课 古诗二首';
      tags.textContent='5关探索　·　带提示 / 独立挑战　·　自动保存进度';
      art.innerHTML='<span class="exploration-lamp"></span><span class="exploration-envelope"></span><span class="exploration-cover-caption">两封信，藏着怎样的心意？</span>';
    }
    card.append(art,content);root.append(card);
  }
}
