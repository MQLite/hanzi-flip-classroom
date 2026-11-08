export function hashLesson(value){let hash=2166136261;for(const char of String(value)){hash^=char.codePointAt(0);hash=Math.imul(hash,16777619);}return hash>>>0;}
export function lessonAppearance(selection={},grade=''){
  const group=selection.source==='personal'?`personal/${grade}`:`${selection.source??'paradise'}/${selection.stage??'1A'}`,lesson=Number.isInteger(Number(selection.lesson))?Number(selection.lesson):1;
  return {key:`${group}/${lesson}`,variant:(hashLesson(group)+Math.max(0,lesson))%4};
}
