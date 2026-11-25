import {birthdayBalloonParticipants,createBirthdayBalloonDeck} from './birthday-survey-data.js';
import {chineseNumber,dateEnglish,datePart,englishNumber,line,numberPart,part,renderCopy} from './birthday-survey-language.js';
import './birthday-balloons.css';

const copy = {
  retry: line('Try again.',part('再试一次。','zài shì yí cì.')),
  ready: line('Read the date, then choose a balloon.',part('读日期，','dú rìqī,'),part('选气球。','xuǎn qìqiú.')),
  empty: line('Choose a class with birthdays saved in Level One.',
    part('请选择','qǐng xuǎnzé'),part('已录入生日的班级。','yǐ lùrù shēngrì de bānjí.')),
  matched: line('A match!',part('配对成功！','pèiduì chénggōng!')),
  done: line('Round complete!',part('这一轮完成了！','zhè yì lún wánchéng le!')),
  next: line('Play with another group',part('换一批','huàn yì pī'),part('同学','tóngxué')),
};

function element(tag,className,contents) {
  const node=document.createElement(tag);
  node.className=className;
  if (contents) renderCopy(node,contents);
  return node;
}

function dateCopy({month,day}) {
  return line(`${dateEnglish(month,'month')} ${dateEnglish(day,'day')}`,datePart(month,'month'),datePart(day,'day'));
}

export function mountBirthdayBalloons(root,onComplete) {
  let drawBatch, batch=[], index=0, timer, rosterKey;
  let participants=[], flown;
  const flownByClass=new Map();
  const animations=matchMedia('(prefers-reduced-motion: reduce)');
  const footer=element('div','balloon-flight-progress');
  const count=element('p','balloon-flight-count');
  const bar=element('progress','balloon-flight-bar');
  const names=element('p','balloon-flight-names');
  count.setAttribute('aria-live','polite');
  bar.setAttribute('aria-label','已放飞进度');
  footer.hidden=true;
  footer.append(count,bar,names);
  root.after(footer);

  function renderFlightProgress() {
    const total=participants.length;
    footer.hidden=!total;
    if (!total) return;
    const completed=participants.filter(({id})=>flown.has(id));
    renderCopy(count,line(`Released ${englishNumber(completed.length)} of ${englishNumber(total)}`,
      part('已放飞','yǐ fàngfēi'),part(' '),numberPart(completed.length),part(' / '),numberPart(total)));
    bar.max=total;
    bar.value=completed.length;
    names.hidden=!completed.length;
    names.textContent=completed.map(({name})=>name).join('、');
  }

  function drawNextBatch() {
    batch=drawBatch();
    index=0;
    renderRound();
  }

  function showComplete(focus) {
    const title=element('h2','balloon-prompt',copy.done);
    const next=element('button','primary balloon-next',copy.next);
    next.type='button';
    next.setAttribute('aria-label','换一批同学');
    next.addEventListener('click',()=>{drawNextBatch(); root.querySelector('.balloon-date')?.focus({preventScroll:true});});
    root.replaceChildren(title,next);
    if (focus) next.focus({preventScroll:true});
    onComplete();
  }

  function renderRound(focus=false) {
    const round=batch[index];
    if (!round) {
      root.replaceChildren(element('p','balloon-empty',copy.empty));
      return;
    }

    const progress=element('p','balloon-progress',line(`Pair ${englishNumber(index+1)} of ${englishNumber(batch.length)}`,
      part('第','dì'),numberPart(index+1),part('对','duì'),part(' / '),numberPart(batch.length),part('对','duì')));
    const question=element('h2','balloon-prompt',line(`When is ${round.name}’s birthday?`,
      part(round.name),part('的生日','de shēngrì'),part('是几月几号？','shì jǐ yuè jǐ hào?')));
    const scene=element('div','balloon-scene');
    const name=element('div','birthday-balloon balloon-name');
    name.textContent=round.name;
    const choices=element('div','balloon-choices');
    choices.setAttribute('role','group');
    choices.setAttribute('aria-label','选日期');
    const cue=element('p','balloon-cue',copy.ready);
    cue.setAttribute('role','status');
    let locked=false;

    round.options.forEach((date,optionIndex)=>{
      const button=element('button','birthday-balloon balloon-date');
      button.type='button';
      const label=`${chineseNumber(date.month)}月${chineseNumber(date.day)}号`;
      button.setAttribute('aria-label',label);
      const caption=element('span','balloon-date-copy',dateCopy(date));
      caption.style.setProperty('--date-length',String(label.length));
      button.append(caption);
      button.addEventListener('click',()=>{
        if (locked) return;
        if (optionIndex!==round.correctIndex) {
          renderCopy(cue,copy.retry);
          return;
        }
        locked=true;
        choices.querySelectorAll('button').forEach(choice=>choice.setAttribute('aria-disabled','true'));
        name.classList.add('balloon-paired');
        button.classList.add('balloon-paired');
        scene.classList.add('balloon-matched');
        countToThree(1);
      });
      choices.append(button);
    });

    function countToThree(count) {
      renderCopy(cue,line(englishNumber(count),numberPart(count),part('！')));
      timer=setTimeout(()=>{
        if (count<3) {
          countToThree(count+1);
          return;
        }
        renderCopy(cue,copy.matched);
        scene.classList.add('balloon-flying');
        timer=setTimeout(()=>{
          const keepFocus=choices.contains(document.activeElement);
          flown.add(round.id);
          renderFlightProgress();
          index++;
          if (index===batch.length) showComplete(keepFocus);
          else renderRound(keepFocus);
        },animations.matches ? 180 : 780);
      },540);
    }

    scene.append(name,choices);
    root.replaceChildren(progress,question,scene,cue);
    if (focus) choices.querySelector('button').focus({preventScroll:true});
  }

  return {
    setRoster(groupId,students,dates) {
      const nextKey=JSON.stringify([groupId,students.map(({id,name})=>[id,name,dates.get(id)])]);
      if (rosterKey===nextKey) return;
      rosterKey=nextKey;
      clearTimeout(timer);
      participants=birthdayBalloonParticipants(students,dates);
      if (!flownByClass.has(groupId)) flownByClass.set(groupId,new Set());
      flown=flownByClass.get(groupId);
      renderFlightProgress();
      drawBatch=createBirthdayBalloonDeck(students,dates);
      drawNextBatch();
    },
  };
}
