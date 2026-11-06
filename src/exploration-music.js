const questMelody=[62,null,69,null,70,null,65,null,62,null,63,null,69,null,60,null];
const roomMelody=[
  62,null,65,null,69,null,null,67, 64,null,67,null,69,null,null,null,
  62,null,65,null,67,null,69,null, 72,null,69,null,67,null,null,null,
];
const roomBass=[50,48,46,45];

// Original ambient music, generated only after a player interaction.
export function createExplorationMusic(onChange,{room=false}={}){
  let context,master,enabled=false,requested=false,revision=0,timer=null,pauseTimer=null,nextTime=0,step=0;
  let filter,celebration;
  const melody=room?roomMelody:questMelody;
  const frequency=midi=>440*2**((midi-69)/12);
  function tone(midi,time,length,volume,type='sine',output=master){
    const oscillator=context.createOscillator(),envelope=context.createGain();
    oscillator.type=type;oscillator.frequency.value=frequency(midi);
    envelope.gain.setValueAtTime(0,time);
    envelope.gain.linearRampToValueAtTime(volume,time+.09);
    envelope.gain.exponentialRampToValueAtTime(.0001,time+length);
    oscillator.connect(envelope);envelope.connect(output);
    oscillator.start(time);oscillator.stop(time+length+.05);
    oscillator.onended=()=>{oscillator.disconnect();envelope.disconnect();};
  }
  function schedule(){
    if(!enabled||document.hidden||context.state!=='running')return;
    while(nextTime<context.currentTime+.65){
      const note=melody[step%melody.length];
      if(note!==null){tone(note,nextTime,2.2,.13,'triangle');tone(note+12,nextTime+.025,1.6,.025);}
      if(step%8===0){
        const bass=room?roomBass[(step/8)%roomBass.length]:38;
        tone(bass,nextTime,7,.22);tone(bass+7,nextTime+.12,6.6,.09);
      }
      // Soft, clock-like pulses create suspense without sudden sound effects.
      if(!room&&step%2===0)tone(86,nextTime+.37,.25,.018);
      nextTime+=.85;step++;
    }
  }
  function stopScheduler(){clearInterval(timer);timer=null;}
  function startScheduler(){
    stopScheduler();
    nextTime=Math.max(nextTime,context.currentTime+.06);
    schedule();
    timer=setInterval(schedule,250);
  }
  function pauseWhenIdle(delay){
    clearTimeout(pauseTimer);
    pauseTimer=setTimeout(()=>{
      if(!requested)context.suspend().catch(()=>{});
    },delay);
  }
  function stopCelebration(){
    if(!celebration)return;
    const output=celebration;
    celebration=null;
    output.gain.setTargetAtTime(0,context.currentTime,.018);
    setTimeout(()=>output.disconnect(),120);
    pauseWhenIdle(150);
  }
  function playCelebration(delays){
    if(context?.state!=='running'||document.hidden)return;
    stopCelebration();
    celebration=context.createGain();
    celebration.gain.value=.16;
    celebration.connect(filter);
    const start=context.currentTime+.02;
    for(const [index,delay] of delays.entries()){
      const time=start+delay/1000;
      tone([72,76,79][index],time,.72,.18,'sine',celebration);
      if(index===delays.length-1)tone(84,time,1,.085,'sine',celebration);
    }
    pauseWhenIdle(delays.at(-1)+1150);
  }
  async function setEnabled(value){
    if(requested===value)return;
    requested=value;
    const token=++revision;
    clearTimeout(pauseTimer);
    if(!value){
      enabled=false;stopScheduler();
      if(context&&master){
        master.gain.cancelScheduledValues(context.currentTime);
        master.gain.setTargetAtTime(0,context.currentTime,.045);
        pauseWhenIdle(200);
      }
      onChange();return;
    }
    try{
      if(!context){
        const Audio=window.AudioContext||window.webkitAudioContext;
        if(!Audio)throw new Error('unsupported');
        context=new Audio();master=context.createGain();
        filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=2200;
        master.gain.value=0;master.connect(filter);filter.connect(context.destination);
      }
      await context.resume();
      if(token!==revision)return;
      enabled=true;
      master.gain.cancelScheduledValues(context.currentTime);
      master.gain.setTargetAtTime(room ? .13 : .28,context.currentTime,.25);
      if(document.hidden)context.suspend().catch(()=>{});
      else startScheduler();
      onChange();
    }catch{
      if(token!==revision)return;
      requested=false;enabled=false;stopScheduler();
      onChange('此浏览器暂时不能播放配乐，仍可继续探索。');
    }
  }
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)stopCelebration();
    if(!context||!enabled)return;
    if(document.hidden){stopScheduler();context.suspend().catch(()=>{});}
    else context.resume().then(()=>{if(enabled&&!document.hidden)startScheduler();}).catch(()=>{});
  });
  window.addEventListener('pagehide',()=>{stopCelebration();stopScheduler();context?.suspend().catch(()=>{});});
  window.addEventListener('pageshow',event=>{
    if(event.persisted&&enabled&&context&&!document.hidden){
      context.resume().then(()=>{if(enabled&&!document.hidden)startScheduler();}).catch(()=>{});
    }
  });
  return {setEnabled,playCelebration,stopCelebration,toggle:()=>setEnabled(!requested),get enabled(){return enabled;}};
}
