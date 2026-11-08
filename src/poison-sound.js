function tone(context,start,duration,from,to,type,volume){
  const oscillator=context.createOscillator(),gain=context.createGain();oscillator.type=type;oscillator.frequency.setValueAtTime(from,start);oscillator.frequency.exponentialRampToValueAtTime(to,start+duration);
  gain.gain.setValueAtTime(.0001,start);gain.gain.linearRampToValueAtTime(volume,start+.02);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);oscillator.connect(gain);gain.connect(context.destination);oscillator.start(start);oscillator.stop(start+duration+.01);
  oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};return {oscillator,gain};
}
export function schedulePoisonSound(context,start=context.currentTime){return [tone(context,start,.36,520,135,'sine',.065),tone(context,start+.14,.42,300,95,'triangle',.055),tone(context,start+.4,.22,160,65,'sine',.065)];}
export function scheduleRescueSound(context,start=context.currentTime){return [tone(context,start,.19,480,610,'sine',.065),tone(context,start+.13,.2,610,760,'sine',.065),tone(context,start+.26,.26,760,980,'triangle',.05)];}
export function createPoisonAudio(){
  let context,nodes=[],enabled=true,generation=0;
  function stop(){generation++;for(const node of nodes){try{node.oscillator.stop();}catch{}node.oscillator.disconnect();node.gain.disconnect();}nodes=[];}
  async function play(schedule){
    if(!enabled||document.hidden)return;stop();const token=generation;
    try{const Audio=window.AudioContext??window.webkitAudioContext;if(!Audio)return;context??=new Audio();if(context.state==='suspended')await context.resume();if(!enabled||token!==generation||document.hidden)return;nodes=schedule(context);}catch{/* Reading stays usable on silent or unsupported devices. */}
  }
  return {playPoison:()=>play(schedulePoisonSound),playRescue:()=>play(scheduleRescueSound),setEnabled(value){enabled=Boolean(value);if(!enabled)stop();},stop,dispose(){stop();context?.close().catch(()=>{});}};
}
