// Native vector artwork keeps the witch's expression and empty glass readable
// on both the classroom projector and a phone, without an image download.
export function createPoisonWitch({animate=false,defeated=false}={}){
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 340 300');svg.setAttribute('role','img');
  svg.setAttribute('aria-label','女巫拿着空药瓶，咧嘴坏笑');svg.setAttribute('focusable','false');
  svg.setAttribute('class',`poison-witch${animate?' is-cackling':''}`);
  svg.innerHTML=`
    <ellipse cx="205" cy="285" rx="97" ry="9" fill="#54345f" opacity=".13"/>
    <g class="witch-cackle">
      <path d="M164 252 157 281Q142 292 126 284L141 272 143 252M218 255 228 279Q243 283 254 274L246 292 218 289 204 259" fill="#342740" stroke="#342740" stroke-width="4" stroke-linejoin="round"/>
      <path d="M159 168Q186 181 212 164L239 196 263 270Q208 290 141 272L153 204 132 189Z" fill="#694277" stroke="#412b50" stroke-width="3" stroke-linejoin="round"/>
      <path d="M184 181Q167 220 176 277L146 271 156 204 139 189 160 174Z" fill="#83548f"/>
      <path d="m206 179 16 29 13 65" fill="none" stroke="#9f73ad" stroke-width="4" stroke-linecap="round"/>
      <path d="M194 207a14 14 0 1 0 12 21 14 14 0 0 1-12-21Z" fill="#f3ca6e"/>
      <path d="m157 174-31 20 19 21 14-13-10-8 20-9" fill="#83548f" stroke="#412b50" stroke-width="3" stroke-linejoin="round"/>
      <path d="m145 208 14-5q10 0 11 7l-4 10-9-2-4 3-8-6Z" fill="#b6cf80" stroke="#536447" stroke-width="2"/>
      <path d="M213 175Q239 169 259 176L278 182 270 198Q247 193 226 194" fill="#83548f" stroke="#412b50" stroke-width="3" stroke-linejoin="round"/>
      <path d="M148 101Q128 123 141 156L135 183 156 171 166 157 203 154 219 181 224 151Q235 120 211 100Z" fill="#d4c8d9" stroke="#53415d" stroke-width="3" stroke-linejoin="round"/>
      <path d="m145 130 4 33-5 9m72-41-5 29 8 10" fill="none" stroke="#a391ac" stroke-width="3" stroke-linecap="round"/>
      <path d="M153 103Q176 91 197 105 218 116 214 142 212 164 192 170 165 170 156 150L148 130Z" fill="#bdd78b" stroke="#536447" stroke-width="3"/>
      <path d="M153 121Q146 129 131 134 124 141 138 146L156 143" fill="#bdd78b" stroke="#536447" stroke-width="3" stroke-linecap="round"/>
      <circle cx="138" cy="137" r="2.8" fill="#839a62"/>
      <path d="M158 126Q167 131 175 126M187 124Q197 126 204 118" fill="none" stroke="#3c3940" stroke-width="4" stroke-linecap="round"/>
      <path d="m156 114 17 7m12-6 18-5" fill="none" stroke="#423245" stroke-width="5" stroke-linecap="round"/>
      <g class="witch-grin">
        <path d="M167 142Q190 153 209 134 211 156 193 161 177 159 167 142Z" fill="#3b2847" stroke="#536447" stroke-width="2"/>
        <path d="M174 144Q192 151 206 139L204 146Q190 155 178 149Z" fill="#fff8d9"/>
        <path d="m184 148 1 4m9-5 1 4" stroke="#6d5877" stroke-width="1.5"/>
      </g>
      <path d="m111 103 39-77q4-15 13-7l15 24q24 4 30-14 16 14-6 34l31 38Z" fill="#453050" stroke="#33273e" stroke-width="3" stroke-linejoin="round"/>
      <path d="m125 82 93 4 9 17-113 6Z" fill="#bb879f"/>
      <path d="M166 87h20v15h-20Z" fill="#5e3e6c" stroke="#f3ca6e" stroke-width="4" stroke-linejoin="round"/>
      <path d="M96 108Q154 89 240 98 264 103 249 113 162 132 95 120 81 115 96 108Z" fill="#574065" stroke="#33273e" stroke-width="3"/>
      <path d="M110 111Q170 99 231 104" fill="none" stroke="#80608f" stroke-width="3" stroke-linecap="round"/>
      <g class="witch-bottle-hand">
        <g class="witch-empty-bottle" data-empty="true">
          <path d="M281 184H291V201Q310 214 311 236 311 253 290 255 266 254 266 238 267 215 281 202Z" fill="#f6fcff" fill-opacity=".32" stroke="#609da7" stroke-width="3" stroke-linejoin="round"/>
          <ellipse cx="286" cy="184" rx="9" ry="3" fill="#f9ffff" stroke="#609da7" stroke-width="3"/>
          <path d="M278 215Q272 224 272 235m25-21 6 13" fill="none" stroke="#fff" stroke-opacity=".95" stroke-width="4" stroke-linecap="round"/>
        </g>
        <path d="M269 181q9-5 15 0l10 5q4 6-2 9l-11-5-9 2-8-6Z" fill="#bdd78b" stroke="#536447" stroke-width="2"/>
        <path d="m280 181 8 5m-12-2 9 6" fill="none" stroke="#7a945f" stroke-width="2" stroke-linecap="round"/>
      </g>
    </g>`;
  if(defeated){
    svg.classList.add('is-defeated');
    svg.setAttribute('aria-label','女巫被打败，垂下空药瓶');
    svg.querySelector('.witch-grin').innerHTML='<path d="M173 155q14-15 29-6" fill="none" stroke="#423245" stroke-width="4" stroke-linecap="round"/>';
  }
  return svg;
}
