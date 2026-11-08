// Editorial review is the source of truth. This compiler does not infer new
// decompositions/names from IDS or classify geometric strokes automatically.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const source=JSON.parse(fs.readFileSync(path.join(root,'scripts/data/character-forms-review.json'),'utf8'));
const names=new Set(source.strokeNames);
for(const [character,record] of Object.entries(source.characters)){
  const geometry=JSON.parse(fs.readFileSync(path.join(root,'public/strokes',character+'.json'),'utf8'));
  if(record.names.length!==geometry.strokes.length||record.names.some(n=>!names.has(n)))throw Error('Invalid stroke record '+character);
  if(createHash('sha256').update(JSON.stringify(geometry.strokes)).digest('hex')!==record.geometrySha256)throw Error('Unreviewed geometry change '+character);
  if(record.numericOrder!==record.officialOrder.numericOrder||record.numericOrder.length!==record.names.length)throw Error('Canonical order mismatch '+character);
  if(record.parts.length){
    const indices=record.parts.flatMap(p=>p.indices).sort((a,b)=>a-b);
    if(indices.length!==record.names.length||indices.some((n,i)=>n!==i))throw Error('Incomplete/overlapping partition '+character);
    if(record.parts.some(p=>!source.components[p.id]))throw Error('Unknown component '+character);
  }
}
fs.mkdirSync(path.join(root,'src/data'),{recursive:true});
fs.writeFileSync(path.join(root,'src/data/character-forms.json'),JSON.stringify(source)+'\n');
console.log(`Compiled ${Object.keys(source.characters).length} characters, ${Object.keys(source.components).length} components, ${source.strokeNames.length} stroke names.`);
