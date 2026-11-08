import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import {FORM_CATALOG,STROKE_NAMES,getConstructionPool} from '../src/construction-data.js';
import {DEFAULT_QUESTIONS} from '../src/data.js';
import {TEXTBOOK_QUESTIONS,PARADISE_QUESTIONS,ZHONGWEN_QUESTIONS} from '../src/curriculum.js';
const all=[...DEFAULT_QUESTIONS,...TEXTBOOK_QUESTIONS,...PARADISE_QUESTIONS,...ZHONGWEN_QUESTIONS];
describe('reviewed character forms',()=>{
  it('covers all current characters with canonical counts and five-category orders',()=>{
    // The official five-way indexing groups 提 with 横, 竖钩 with 竖;
    // 弯钩 may project to 竖 or 折 depending on the actual stroke form.
    const categories=name=>['横','提'].includes(name)?'1':['竖','竖钩'].includes(name)?'2':name==='撇'?'3':['点','捺'].includes(name)?'4':name==='弯钩'?'25':'5';
    expect(Object.keys(FORM_CATALOG.characters)).toHaveLength(498);
    for(const ch of new Set(all.map(q=>q.character))){const record=FORM_CATALOG.characters[ch];const paths=JSON.parse(fs.readFileSync(new URL(`../public/strokes/${ch}.json`,import.meta.url)));expect(record.names.length,ch).toBe(paths.strokes.length);expect(record.names.every((name,i)=>categories(name).includes(record.numericOrder[i])),ch).toBe(true);expect(record.numericOrder,ch).toBe(record.officialOrder.numericOrder);expect(record.names.every(n=>STROKE_NAMES.includes(n)),ch).toBe(true);}
  });
  it('protects independent forms and preserves complete disjoint component partitions',()=>{
    for(const ch of ['我','中','木','人','本','果','天','上','里'])expect(FORM_CATALOG.characters[ch].parts,ch).toEqual([]);
    expect(FORM_CATALOG.characters['国'].parts[0].indices).toEqual([0,1,7]);expect(FORM_CATALOG.characters['回'].parts[0].indices).toEqual([0,1,5]);
    for(const [ch,r] of Object.entries(FORM_CATALOG.characters)){if(!r.parts.length)continue;const indices=r.parts.flatMap(p=>p.indices);expect([...indices].sort((a,b)=>a-b),ch).toEqual(r.names.map((_,i)=>i));for(const p of r.parts)expect(FORM_CATALOG.components[p.id],ch).toBeTruthy();}
  });
  it('pins fine-name corrections and openly records naming variants',()=>{
    for(const [ch,index,name] of [['风',1,'横斜钩'],['气',3,'横斜钩'],['汽',6,'横斜钩'],['九',1,'横折弯钩'],['山',1,'竖折'],['四',3,'竖弯'],['心',1,'卧钩'],['奶',3,'横折折折钩'],['子',1,'弯钩'],['手',3,'竖钩']])expect(FORM_CATALOG.characters[ch].names[index],ch).toBe(name);
    expect(FORM_CATALOG.characters['手'].aliases[3]).toContain('弯钩');expect(FORM_CATALOG.characters['好'].aliases[2]).toContain('提');
  });
  it('uses actual lesson scope, independent introductions and honest unknown coverage',()=>{
    const pool=getConstructionPool({source:'zhongwen',stage:'1',lesson:1,scope:'stage'},all,1);expect(pool.characters.length).toBeGreaterThan(0);expect(pool.characters.length).toBeLessThan(285);expect(pool.newComponents.every(c=>c.english&&c.name)).toBe(true);
    const later=getConstructionPool({source:'zhongwen',stage:'1',lesson:2},all,1);expect(later.newComponents.every(c=>!pool.components.some(p=>p.id===c.id))).toBe(true);
    const first=getConstructionPool({source:'paradise',stage:'1A',lesson:1},all,1),second=getConstructionPool({source:'paradise',stage:'1A',lesson:2},all,1);
    expect(first.newComponents.some(c=>c.name==='单立人'&&c.english.includes('person'))).toBe(true);expect(second.components.some(c=>c.name==='女')).toBe(true);expect(second.newComponents.some(c=>c.name==='女')).toBe(false);
    const custom=getConstructionPool({source:'personal'},[{id:'new',character:'龘',grade:1}],1);expect(custom.characters).toEqual([]);expect(custom.unsupported).toEqual(['龘']);
  });
  it('ships a non-silent Mandarin WAV for each stroke name',()=>{
    for(const name of STROKE_NAMES){const wav=fs.readFileSync(new URL(`../public/audio/stroke-names/${name}.wav`,import.meta.url));expect(wav.toString('ascii',0,4),name).toBe('RIFF');expect(wav.toString('ascii',8,12),name).toBe('WAVE');expect(wav.length,name).toBeGreaterThan(4000);expect(wav.subarray(100).some(b=>b>1),name).toBe(true);}
  });
  it('counts earlier textbook reading vocabulary when introducing components',()=>{
    const earlier=getConstructionPool({source:'zhongwen',stage:'1',lesson:5},all,1),later=getConstructionPool({source:'zhongwen',stage:'1',lesson:7},all,1);
    expect(earlier.characters.some(c=>c.character==='字')).toBe(true);expect(earlier.components.some(c=>c.id==='gf0014-13')).toBe(true);
    expect(later.components.some(c=>c.id==='gf0014-13')).toBe(true);expect(later.newComponents.some(c=>c.id==='gf0014-13')).toBe(false);
  });
});
