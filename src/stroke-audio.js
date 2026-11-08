import {STROKE_NAMES} from './construction-data.js';
const AUDIO_REVISION='mandarin-pie3-v1';

export function createStrokeAudio({createAudio=url=>new Audio(url)}={}){
  let active=null,epoch=0,muted=false,disposed=false;
  function stop(){epoch++;if(active){active.pause();active.currentTime=0;active=null;}}
  return {
    async play(name){
      stop();if(disposed||muted||!STROKE_NAMES.includes(name))return false;
      const token=epoch,clip=createAudio(`${import.meta.env.BASE_URL}audio/stroke-names/${encodeURIComponent(name)}.wav?v=${AUDIO_REVISION}`);active=clip;
      try{await clip.play();if(disposed||token!==epoch){clip.pause();return false;}return true;}
      catch{if(active===clip)active=null;return false;}
    },
    stop,setMuted(value){muted=Boolean(value);if(muted)stop();},dispose(){stop();disposed=true;}
  };
}
