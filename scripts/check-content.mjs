// Optional maintainer check; classroom use never fetches this dictionary.
import { writeFile, mkdir } from 'node:fs/promises';
import { DEFAULT_QUESTIONS } from '../src/data.js';

const source = 'https://raw.githubusercontent.com/skishore/makemeahanzi/master/dictionary.txt';
const response = await fetch(source);
if (!response.ok) throw new Error(`Reference lookup failed: ${response.status}`);
const entries = new Map((await response.text()).trim().split('\n').map(line => {
  const entry = JSON.parse(line);
  return [entry.character, entry];
}));
const variants = { '氵': '水', '忄': '心', '讠': '言', '艹': '艸', '攵': '攴', '王': '玉', '见': '見', '风': '風' };
// The vector reference uses a Kangxi index for 行. Retain this discrepancy explicitly;
// modern simplified teaching uses 彳, as independently checked in the dictionary entry.
const reviewedTeachingRadicals = { '行': { radical: '彳', source: 'https://zdic.net/hans/行' } };
const checked = DEFAULT_QUESTIONS.map(q => {
  const entry = entries.get(q.character);
  const review = reviewedTeachingRadicals[q.character];
  return {
    character: q.character,
    readingListed: !!entry?.pinyin.includes(q.pinyin),
    radicalMatches: (variants[q.radical] ?? q.radical) === (variants[review?.radical ?? entry?.radical] ?? review?.radical ?? entry?.radical),
    referenceRadical: entry?.radical,
    ...(review ? { teachingRadical: review.radical, conventionReviewSource: review.source } : {}),
  };
});
await mkdir('docs/codex/hanzi-flip/evidence', { recursive: true });
await writeFile('docs/codex/hanzi-flip/evidence/content-check.json', JSON.stringify({ source, checkedAt: new Date().toISOString(), checked }, null, 2));
const discrepancies = checked.filter(item => !item.readingListed || !item.radicalMatches);
console.log(`${checked.length} characters checked; ${discrepancies.length} reference discrepancies.`);
if (discrepancies.length) console.log(JSON.stringify(discrepancies));
