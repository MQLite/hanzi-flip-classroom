import { mkdir, readFile, copyFile, writeFile } from 'node:fs/promises';
import { DEFAULT_QUESTIONS } from '../src/data.js';
import { TEXTBOOK_QUESTIONS, PARADISE_QUESTIONS } from '../src/curriculum.js';

await mkdir('public/strokes', { recursive: true });
await mkdir('public/licenses', { recursive: true });
const questions = [...DEFAULT_QUESTIONS, ...TEXTBOOK_QUESTIONS, ...PARADISE_QUESTIONS];
const characters = [...new Set(questions.map(q => q.character))];
for (const character of characters) {
  const source = `node_modules/hanzi-writer-data/${character}.json`;
  const data = JSON.parse(await readFile(source, 'utf8'));
  for (const question of questions.filter(q => q.character === character)) {
    if (question.strokeCount !== undefined && data.strokes.length !== question.strokeCount) throw new Error(`笔画数不匹配：${character}`);
  }
  await copyFile(source, `public/strokes/${character}.json`);
}
await copyFile('node_modules/hanzi-writer-data/ARPHICPL.TXT', 'public/licenses/ARPHICPL.TXT');
await copyFile('node_modules/hanzi-writer/LICENSE', 'public/licenses/hanzi-writer-MIT.txt');
await copyFile('node_modules/three/LICENSE', 'public/licenses/three-MIT.txt');
await writeFile('public/strokes/manifest.json', JSON.stringify({ source: 'hanzi-writer-data', version: '2.0.1', characters }, null, 2));
console.log(`Prepared ${characters.length} unchanged local character files and source licenses.`);
