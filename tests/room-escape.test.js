import {describe,expect,it} from 'vitest';
import {EXPLORATIONS,matchingExplorations} from '../src/exploration.js';
import {CLUES,createEscape,resolveChoice,continueEscape,takeKey,tryExit} from '../src/room-escape-core.js';

const correct = state => resolveChoice(state,CLUES[state.index].correct);

describe('识字三密室逃脱',()=>{
  it('registers the scenario only for 中文第一册第三课',()=>{
    const selection={source:'zhongwen',stage:'1',lesson:3};
    expect(matchingExplorations(selection).map(({id})=>id)).toEqual(['room-escape']);
    expect(matchingExplorations({...selection,lesson:2})).toEqual([]);
    expect(EXPLORATIONS.find(s=>s.id==='room-escape').href).toBe('./room.html');
  });
  it('keeps a wrong choice in the same place and clue',()=>{
    const state=createEscape();
    expect(tryExit(state)).toBe(state);
    const wrong=resolveChoice(state,1-CLUES[0].correct);
    expect(wrong).toMatchObject({index:0,phase:'clue',key:'hidden',player:state.player,cat:state.cat});
    expect(correct(wrong)).toMatchObject({phase:'solved',index:0});
  });
  it('uses all twelve characters and requires the key and the final direction to exit',()=>{
    expect(CLUES.map(s=>s.char).join('')).toBe('上左右下中坐立来去走入出');
    let state=createEscape();
    for(let i=0;i<CLUES.length-1;i++){
      expect(tryExit(state)).toBe(state);
      state=correct(state);
      if(i===5)expect(state.player.pose).toBe('sit');
      if(i===6)expect(state.player.pose).toBe('stand');
      if(i===7)expect(Math.abs(state.cat.x-state.player.x)).toBeLessThan(1);
      if(i===8)expect(Math.abs(state.cat.x-state.player.x)).toBeGreaterThan(3);
      if(i<CLUES.length-2)state=continueEscape(state);
    }
    expect(state).toMatchObject({key:'found',phase:'key',doorOpen:false});
    expect(continueEscape(state)).toBe(state);
    expect(tryExit(state)).toBe(state);
    state=takeKey(state);
    expect(state).toMatchObject({key:'held',phase:'clue',index:11,doorOpen:false});
    expect(tryExit(state)).toBe(state);
    expect(correct(state)).toMatchObject({key:'held',phase:'escaped',doorOpen:true});
  });
});
