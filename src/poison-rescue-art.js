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

export function createRescuedChild(character) {
  const girl = character === 'girl';
  return illustration('0 0 176 198', `
    <ellipse cx="88" cy="185" rx="52" ry="7" fill="#54755e" opacity=".2"/>
    <g stroke="#403249" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
      <path d="M70 144v32l-13 6h24l7-35m17-3v32l13 6H95l-7-35" fill="#4d657e"/>
      <path d="M65 105q-11 3-24 25l-10-13m80-12q11 3 24 25l10-13" fill="none" stroke="#403249" stroke-width="13"/>
      <path d="M65 105q-11 3-24 25l-10-13m80-12q11 3 24 25l10-13" fill="none" stroke="#efb98d" stroke-width="8"/>
      <path d="M73 101h30l${girl?'18 49H55':'10 49H63'}z" fill="${girl?'#dc7298':'#5197c9'}"/>
      ${girl?'<path d="M49 62q-17 36-4 47 21-5 27-22m55-25q17 36 4 47-21-5-27-22" fill="#483546"/>':''}
      <circle cx="88" cy="62" r="40" fill="#ffd2a5"/>
      <path d="${girl?'M49 60q-6-42 37-46 43-1 43 47-24-4-43-25-11 20-37 24z':'M49 55q-7-27 16-32l-2-9 15 6 10-12 7 10q38 0 33 36-23-3-35-20-20 22-44 21z'}" fill="#483546"/>
      <path d="M70 64v3m36-3v3M78 80q10 10 20 0" fill="none"/>
    </g>
    <circle cx="63" cy="76" r="5" fill="#e89387"/><circle cx="113" cy="76" r="5" fill="#e89387"/>
  `);
}
