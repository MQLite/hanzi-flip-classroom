import {STROKE_NAMES} from './construction-data.js';
const AUDIO_REVISION='mandarin-pie3-v1';
const END_TIMEOUT_MS=8000;

export function createStrokeAudio({createAudio=url=>new Audio(url)}={}){
  let active=null,finish=null,epoch=0,muted=false,disposed=false;
  function stop(){
    epoch++;
    const clip=active;active=null;
    finish?.(false);
    if(clip){clip.pause();clip.currentTime=0;}
  }
  return {
    async play(name,{waitForEnd=false}={}){
      stop();if(disposed||muted||!STROKE_NAMES.includes(name))return false;
      const token=epoch,clip=createAudio(`${import.meta.env.BASE_URL}audio/stroke-names/${encodeURIComponent(name)}.wav?v=${AUDIO_REVISION}`);active=clip;
      if(waitForEnd)return new Promise(resolve=>{
        const ended=()=>finishPlayback(true),failed=()=>finishPlayback(false);
        const deadline=setTimeout(stop,END_TIMEOUT_MS);
        function finishPlayback(ok){
          if(finish!==finishPlayback)return;
          finish=null;
          if(active===clip)active=null;
          clearTimeout(deadline);
          clip.removeEventListener('ended',ended);
          clip.removeEventListener('error',failed);
          clip.removeEventListener('abort',failed);
          resolve(ok);
        }
        finish=finishPlayback;
        clip.addEventListener('ended',ended);
        clip.addEventListener('error',failed);
        clip.addEventListener('abort',failed);
        try{
          clip.play().then(()=>{if(token!==epoch)clip.pause();},failed);
        }catch{failed();}
      });
      try{await clip.play();if(disposed||token!==epoch){clip.pause();return false;}return true;}
      catch{if(active===clip)active=null;return false;}
    },
    stop,setMuted(value){muted=Boolean(value);if(muted)stop();},dispose(){stop();disposed=true;}
  };
}
