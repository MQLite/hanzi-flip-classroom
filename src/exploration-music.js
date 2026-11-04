// Original, gently tense ambient score. No samples, downloads or autoplay.
export function createExplorationMusic(onChange){
  let context,master,enabled=false,timer=null,pauseTimer=null,nextTime=0,step=0;
  const melody=[62,null,69,null,70,null,65,null,62,null,63,null,69,null,60,null];
  const frequency=midi=>440*2**((midi-69)/12);
  function tone(midi,time,length,volume,type='sine'){
    const oscillator=context.createOscillator(),envelope=context.createGain();
    oscillator.type=type;oscillator.frequency.value=frequency(midi);
    envelope.gain.setValueAtTime(0,time);
    envelope.gain.linearRampToValueAtTime(volume,time+.09);
    envelope.gain.exponentialRampToValueAtTime(.0001,time+length);
    oscillator.connect(envelope);envelope.connect(master);
    oscillator.start(time);oscillator.stop(time+length+.05);
    oscillator.onended=()=>{oscillator.disconnect();envelope.disconnect();};
  }
  function schedule(){
    if(!enabled||document.hidden||context.state!=='running')return;
    while(nextTime<context.currentTime+.65){
      const note=melody[step%melody.length];
      if(note!==null){tone(note,nextTime,2.2,.13,'triangle');tone(note+12,nextTime+.025,1.6,.025);}
      if(step%8===0){tone(38,nextTime,7,.22);tone(45,nextTime+.12,6.6,.09);}
      // Soft, clock-like pulses create suspense without sudden sound effects.
      if(step%2===0)tone(86,nextTime+.37,.25,.018);
      nextTime+=.85;step++;
    }
  }
  function stopScheduler(){clearInterval(timer);timer=null;}
  function startScheduler(){stopScheduler();nextTime=context.currentTime+.06;schedule();timer=setInterval(schedule,250);}
  async function toggle(){
    clearTimeout(pauseTimer);
    if(enabled){
      enabled=false;stopScheduler();
      master.gain.cancelScheduledValues(context.currentTime);
      master.gain.setTargetAtTime(0,context.currentTime,.045);
      pauseTimer=setTimeout(()=>{if(!enabled)context.suspend().catch(()=>{});},200);
      onChange();return;
    }
    try{
      if(!context){
        const Audio=window.AudioContext||window.webkitAudioContext;
        if(!Audio)throw new Error('unsupported');
        context=new Audio();master=context.createGain();
        const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=2200;
        master.gain.value=0;master.connect(filter);filter.connect(context.destination);
      }
      await context.resume();enabled=true;
      master.gain.cancelScheduledValues(context.currentTime);
      master.gain.setTargetAtTime(.28,context.currentTime,.25);
      startScheduler();onChange();
    }catch{enabled=false;stopScheduler();onChange('此浏览器暂时不能播放配乐，仍可继续探索。');}
  }
  document.addEventListener('visibilitychange',()=>{
    if(!context||!enabled)return;
    if(document.hidden){stopScheduler();context.suspend().catch(()=>{});}
    else context.resume().then(()=>{if(enabled&&!document.hidden)startScheduler();}).catch(()=>{});
  });
  window.addEventListener('pagehide',()=>{stopScheduler();context?.suspend().catch(()=>{});});
  window.addEventListener('pageshow',event=>{if(event.persisted&&enabled&&context)context.resume().then(startScheduler).catch(()=>{});});
  return {toggle,get enabled(){return enabled;}};
}
