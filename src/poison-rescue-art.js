function illustration(viewBox, markup) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', viewBox);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.innerHTML = markup;
  return svg;
}

export function createAntidoteBottle() {
  return illustration('0 0 112 112', `
    <path d="M42 14h28v35l21 26a17 17 0 0 1-13 27H34a17 17 0 0 1-13-27l21-26z" fill="#f2f7ff" stroke="#4d3867" stroke-width="4" stroke-linejoin="round"/>
    <path d="M33 65q12-7 23 0t23 0l12 15a14 14 0 0 1-12 18H33a14 14 0 0 1-12-18z" fill="#9a6cce"/>
    <path d="M33 81q11-4 22 1t28-1" fill="none" stroke="#d8b9ff" stroke-width="3" stroke-linecap="round"/>
    <path d="M42 65l-9 14" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/>
    <rect x="38" y="10" width="36" height="14" rx="4" fill="#eac17d" stroke="#4d3867" stroke-width="4"/>
    <path d="M91 25v22m-11-11h22" stroke="#c08833" stroke-width="4" stroke-linecap="round"/>
    <circle cx="62" cy="73" r="3" fill="#fff0b9"/><circle cx="72" cy="89" r="3" fill="#efe0ff"/>
  `);
}

const skinTones = ['#ffd2a5', '#9d5e43', '#ebac79', '#75412f', '#c58356'];
const hairStyles = [
  {front:'M49 55q-7-27 16-32l-2-9 15 6 10-12 7 10q38 0 33 36-23-3-35-20-20 22-44 21z'},
  {front:'M49 61q-12-4-7-15-7-12 4-20 1-14 16-14 8-12 22-6 13-7 23 4 16-2 21 11 14 5 12 17 8 13-12 23l-3-15q-10 6-20-2-10 8-21 0-10 8-22 3l-8 10z'},
  {back:'M54 38Q33 54 38 96l-5 21q20 8 40-17h30q20 25 40 17l-5-21q5-42-16-58z',front:'M48 65q-7-47 34-51 46-5 47 48-22-2-34-24-15 23-47 27z'},
  {back:'M53 41Q27 61 38 106l-8 25q12 11 41 2l6-40h22l6 40q29 9 41-2l-8-25q11-45-15-65z',front:'M47 69q-7-51 38-56 42-2 45 54-20-8-30-29-13 17-42 19l-5 17z'},
];
const hairColors = ['#312830', '#56372b', '#8e4b2f', '#3f2a26', '#9a642e', '#242634'];
const shirtColors = ['#5197c9', '#d17c59', '#67a38b', '#ba78ab'];

export function createRescuedChild(character, appearance=0) {
  const girl = character === 'girl';
  const skin = skinTones[appearance % skinTones.length];
  const hair = hairStyles[appearance % hairStyles.length];
  const hairColor = hairColors[appearance % hairColors.length];
  const shirt = shirtColors[appearance % shirtColors.length];
  return illustration('0 0 176 198', `
    <ellipse cx="88" cy="185" rx="52" ry="7" fill="#54755e" opacity=".2"/>
    <g stroke="#403249" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
      ${hair.back?`<path d="${hair.back}" fill="${hairColor}"/>`:''}
      <path d="M70 144v32l-13 6h24l7-35m17-3v32l13 6H95l-7-35" fill="#4d657e"/>
      <path d="M65 105q-11 3-24 25l-10-13m80-12q11 3 24 25l10-13" fill="none" stroke="#403249" stroke-width="13"/>
      <path d="M65 105q-11 3-24 25l-10-13m80-12q11 3 24 25l10-13" fill="none" stroke="${skin}" stroke-width="8"/>
      <path d="M73 101h30l${girl?'18 49H55':'10 49H63'}z" fill="${shirt}"/>
      <circle data-skin cx="88" cy="62" r="40" fill="${skin}"/>
      <path data-hair d="${hair.front}" fill="${hairColor}"/>
      <path d="M70 64v3m36-3v3M78 80q10 10 20 0" stroke="#281c25" fill="none"/>
    </g>
    <g fill="#ed8e85" opacity=".65"><circle cx="63" cy="76" r="5"/><circle cx="113" cy="76" r="5"/></g>
  `);
}
