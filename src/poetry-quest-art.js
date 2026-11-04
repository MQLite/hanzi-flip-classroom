export function roomArt(){return `<svg class="room-art" viewBox="0 0 1200 800" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<defs>
  <linearGradient id="wall" x2="0" y2="1"><stop stop-color="#72786b"/><stop offset="1" stop-color="#394b43"/></linearGradient>
  <linearGradient id="wood" x2="1" y2="0"><stop stop-color="#544331"/><stop offset=".48" stop-color="#806a49"/><stop offset="1" stop-color="#3f362b"/></linearGradient>
  <linearGradient id="floor" x2="0" y2="1"><stop stop-color="#6d5c42"/><stop offset="1" stop-color="#2c342b"/></linearGradient>
  <radialGradient id="light"><stop stop-color="#f7dca1" stop-opacity=".7"/><stop offset="1" stop-color="#d6b66e" stop-opacity="0"/></radialGradient>
  <linearGradient id="glass" x2="0" y2="1"><stop stop-color="#253e3d"/><stop offset="1" stop-color="#6f8b7f"/></linearGradient>
  <pattern id="grain" width="45" height="31" patternUnits="userSpaceOnUse"><path d="M2 6h7m24 9h6M16 27h4" stroke="#e5d4b1" stroke-opacity=".08"/></pattern>
  <filter id="shadow"><feDropShadow dx="4" dy="10" stdDeviation="9" flood-opacity=".38"/></filter>
</defs>
<path fill="url(#wall)" d="M0 0h1200v602H0z"/>
<path fill="#34453d" d="M0 0h1200l-75 47H79z"/>
<path fill="#233a32" opacity=".6" d="M0 0l72 47v540L0 661zm1200 0l-58 47v540l58 68z"/>
<path d="M0 584h1200v216H0z" fill="url(#floor)"/>
<g stroke="#232d25" stroke-width="3" opacity=".55"><path d="M600 584v216M460 584L323 800m-7-216L34 800m711-216l137 216M884 584l282 216M0 642h1200M0 713h1200"/></g>
<path d="M0 579h1200" stroke="#262d23" stroke-width="16"/>
<path d="M79 50h1045" stroke="#b6b092" stroke-opacity=".25" stroke-width="3"/>
<g fill="none" stroke="#263b32" stroke-width="2" opacity=".45"><path d="M350 48l-12 64 19 25-16 37M914 50l-13 46 20 9-9 37M94 537l31-15 28 8"/></g>
<!-- Window and the world beyond -->
<g filter="url(#shadow)"><path d="M424 88h272v287H424z" fill="#302f24" stroke="#241f19" stroke-width="8"/>
<path d="M441 104h238v253H441z" fill="url(#glass)"/>
<circle cx="607" cy="161" r="34" fill="#d8d9ba"/><circle cx="619" cy="153" r="31" fill="#304b49"/>
<path d="M441 281l62-77 61 90 42-46 73 78v31H441z" fill="#243d38"/>
<path d="M441 314q89-21 122 7t116-9v45H441" fill="#52695a"/>
<path d="M560 103v253M440 232h239" stroke="#443d2c" stroke-width="12"/>
<path d="M415 373h291" stroke="#a69266" stroke-width="13"/></g>
<path d="M431 374L306 584h511L684 374" fill="#dcd39b" opacity=".05"/>
<!-- Wardrobe -->
<g filter="url(#shadow)" stroke="#28271e" stroke-width="5" fill="url(#wood)">
<path d="M62 129l29-29h235l26 29v443H62z"/><path d="M77 145h116v380H77zm130 0h128v380H207z"/>
<path d="M58 128h300v19H58zm11 410h277v24H69z" fill="#8a7651"/>
<path d="M80 563v40h28l8-40m183 0l9 40h28v-40"/>
<path d="M90 161h89v347H90zm131 0h99v347h-99z" fill="#6b6146" stroke-width="2"/>
<path d="M211 184l52-19 38 28-17 43-21-11v196h-61V226l-18 10-12-39z" fill="#b0a88a" stroke-width="3"/>
<path d="M241 226v187m-18-163l4 3m8 4l4 4m7 4l4 4m-8 9l4 4m-7 7l4 4" stroke="#615e43" stroke-width="2"/>
<circle cx="179" cy="341" r="7" fill="#c8a768"/><circle cx="221" cy="341" r="7" fill="#c8a768"/>
</g>
<!-- Old mirror, with a face that carries time -->
<g filter="url(#shadow)"><ellipse cx="840" cy="224" rx="99" ry="132" fill="#6d5736" stroke="#2a2b22" stroke-width="7"/>
<ellipse cx="840" cy="224" rx="82" ry="114" fill="#8f9d8d" stroke="#b6a473" stroke-width="3"/>
<path d="M786 327q3-71 55-75 51 5 55 75" fill="#3c5145"/><ellipse cx="840" cy="222" rx="37" ry="49" fill="#b8ab85"/>
<path d="M800 221q-9-67 42-63 50 3 35 63l-13-32q-27 15-49 3z" fill="#c6c6aa"/>
<path d="M809 213l-6 49 14-17m58-34l5 50-14-17" fill="#d2cdb1"/>
<path d="M817 222h10m27 0h10m-25 7l-4 16h10m-17 13q12 5 25-1" fill="none" stroke="#656e58" stroke-width="2"/>
<path d="M799 148l29 28m-54 38l32 35m58-99l25 22" stroke="#d7dac7" opacity=".18" stroke-width="5"/>
</g>
<!-- Door -->
<g filter="url(#shadow)" stroke="#242b22" stroke-width="6"><path d="M990 125l26-22h132l27 22v464H990z" fill="#342f24"/>
<path d="M1008 132h150v449h-150z" fill="url(#wood)"/>
<path d="M1026 154h114v159h-114zm0 182h114v216h-114z" fill="#5d6045" stroke-width="3"/>
<path d="M999 582h169" stroke="#b4a37a" stroke-width="11"/><circle cx="1131" cy="342" r="10" fill="#c4a867" stroke-width="3"/>
<path d="M1018 230l22 7 16-26 20 10" fill="none" stroke="#a09973" stroke-width="2" opacity=".5"/></g>
<!-- Desk, lamp and paper -->
<ellipse cx="615" cy="507" rx="266" ry="174" fill="url(#light)"/>
<g filter="url(#shadow)" stroke="#2c2c20" stroke-width="5"><path d="M386 516h430v43H386z" fill="#9a8257"/>
<path d="M410 558h383v102H410z" fill="url(#wood)"/>
<path d="M426 576h158v63H426zm176 0h174v63H602z" fill="#786548" stroke-width="3"/>
<path d="M421 658l-14 98h25l24-98m292 0l24 98h25l-14-98" fill="#5c503a"/>
<circle cx="506" cy="608" r="6" fill="#c8ae73"/><circle cx="688" cy="608" r="6" fill="#c8ae73"/>
<path d="M528 458l173 11-9 62-177-12z" fill="#d4c59c" stroke-width="2"/>
<path d="M546 477l132 9m-134 4l93 6m-96 6l116 9" stroke="#81775c" stroke-width="2"/>
<path d="M457 511h71l-16-9h-39zm35-14V393" fill="#bca06c" stroke-width="3"/>
<path d="M439 397l32-73h43l32 73z" fill="#c7b27f" stroke-width="3"/>
<path d="M476 324h36m-65 69h90" stroke="#e5d2a1" stroke-width="3"/></g>
<!-- Mailbox -->
<g filter="url(#shadow)" stroke="#222e25" stroke-width="4"><path d="M873 459l40-28 44 28v104h-84z" fill="#5d6550"/>
<path d="M865 462l48-34 51 34" fill="none" stroke="#b6a376" stroke-width="7"/>
<path d="M886 482h56v9h-56z" fill="#1f312a"/><path d="M890 510h47v33h-47z" fill="#b5ac87" stroke-width="2"/>
<path d="M890 510l23 18 24-18" fill="none" stroke-width="2"/>
<path d="M906 565v106m-20 0h54" stroke="#62593d" stroke-width="9"/></g>
<path d="M116 675q29-51 55 0m-39-41l-24-24m43 27l23-28" stroke="#6a7354" fill="none" stroke-width="8"/>
<path d="M113 674h65l-11 60h-43z" fill="#785b3d" stroke="#2d3024" stroke-width="4"/>
<path class="room-warmth" fill="#ffd29a" d="M0 0h1200v800H0z" opacity="0" style="mix-blend-mode:soft-light"/>
<path fill="url(#grain)" d="M0 0h1200v800H0z"/>
<path d="M0 0h1200v800H0z" fill="none" stroke="#172c25" stroke-width="22"/>
</svg>`;}

export function itemIcon(id){
  const paths={
    needle:'<path d="M9 26L26 8M21 7q5-5 8 0-1 5-6 5M10 25q-8-7-4-12t10 4q1 7 9 6"/>',
    route:'<path d="M3 8l9-4 10 4 8-4v25l-8 4-10-4-9 4zm9-4v25M22 8v25M9 18l5-4 5 9 6-7"/>',
    motherLetter:'<path d="M3 8h28v22H3zm0 0l14 12L31 8M3 30l10-12m18 12L21 18"/><circle cx="17" cy="22" r="3"/>',
    homeLetter:'<path d="M3 8h28v22H3zm0 0l14 12L31 8M3 30l10-12m18 12L21 18"/><path d="M13 24l4-3 4 3v4h-8z"/>',
  };
  return `<svg viewBox="0 0 36 38" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[id]??paths.route}</svg>`;
}
