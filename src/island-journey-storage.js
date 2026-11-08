import {validateJourney,courseKey} from './island-journey-core.js';
export const JOURNEY_KEY='hanzi-flip.island-journeys.v1';
function browserStorage(){try{return globalThis.localStorage;}catch{return null;}}
export function loadJourneys(storage=browserStorage()){
 try{const raw=storage?.getItem(JOURNEY_KEY);if(!raw||raw.length>200000)return [];
  const rows=JSON.parse(raw);return Array.isArray(rows)?rows.slice(0,24).map(validateJourney).filter(Boolean):[];
 }catch{return [];}
}
export function saveJourney(state,storage=browserStorage()){
 const clean=validateJourney(state);if(!clean)return false;
 try{const rows=loadJourneys(storage).filter(s=>courseKey(s.course)!==courseKey(clean.course));storage.setItem(JOURNEY_KEY,JSON.stringify([clean,...rows].slice(0,24)));return true;}catch{return false;}
}
