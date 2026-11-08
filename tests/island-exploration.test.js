import {it,expect} from 'vitest';
import {createJourney,completeJourneyStage,courseKey} from '../src/island-journey-core.js';
import {GAME_ORDER} from '../src/game-order.js';
import {EXPLORATIONS} from '../src/exploration.js';
import {scenarioJourneyUrl,getExplorationJourney,reportExplorationComplete} from '../src/island-exploration.js';
import {saveJourney,loadJourneys} from '../src/island-journey-storage.js';
const scenario=EXPLORATIONS.find(s=>s.id==='room-escape');
const state=createJourney({course:{source:'zhongwen',stage:'1',lesson:3,grade:1,revision:'abc'},availability:GAME_ORDER.map(g=>({...g,available:g.id==='explore'})),runId:'room-run'});
it('binds exploration links to the exact course, scenario and run without counting a catalog visit',()=>{
 const url=scenarioJourneyUrl(scenario,state,'https://example.com/class/');expect(new URL(url).pathname).toBe('/class/room.html');
 const search=new URL(url).search;expect(getExplorationJourney('room-escape',search,[state])).toEqual(state);
 expect(state.completed).toEqual([]);expect(getExplorationJourney('city-mission',search,[state])).toBe(null);
 expect(getExplorationJourney('room-escape',search,[{...state,runId:'another'}])).toBe(null);
 expect(getExplorationJourney('room-escape',search,[{...state,course:{...state.course,lesson:2}}])).toBe(null);
 expect(getExplorationJourney('room-escape','?journey=room-run&journeyCourse={',[state])).toBe(null);
 expect(scenarioJourneyUrl(EXPLORATIONS[0],state,'https://example.com/class/')).toBe(EXPLORATIONS[0].href);
});
it('only the current native scenario can complete the run and preserves the question bank',()=>{
 const map=new Map([['hanzi-flip.question-bank','untouched']]);const storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 saveJourney(state,storage);const search=new URL(scenarioJourneyUrl(scenario,state,'https://example.com/')).search;
 expect(reportExplorationComplete('city-mission',search,storage)).toBe(null);
 const result=reportExplorationComplete('room-escape',search,storage);expect(result.state.status).toBe('complete');expect(result.saved).toBe(true);
 expect(courseKey(result.state.course)).toBe(courseKey(state.course));expect(reportExplorationComplete('room-escape',search,storage)).toBe(null);
 expect(loadJourneys(storage)[0].completed).toEqual(['explore']);expect(map.get('hanzi-flip.question-bank')).toBe('untouched');
});
