// pictures.js — the reward pictures, as inline SVG strings so they work offline.
// One per character that has one; the others get the letter glow only.
// Each picture is 200 x 200 and animates itself with CSS (paused while a finger is down).
// `word` is said as "{letter} is for {word}!".

const LAMP = `
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <style>
    .lamp-light { opacity: 0; animation: lamp-on 0.5s ease-out 0.7s forwards; }
    .lamp-bulb { fill: #8a8f9e; animation: lamp-bulb 0.5s ease-out 0.7s forwards; }
    @keyframes lamp-on { to { opacity: 1; } }
    @keyframes lamp-bulb { to { fill: #fff3a0; } }
  </style>
  <path class="lamp-light" d="M62 92 L20 178 H180 L138 92 Z" fill="#ffe680" fill-opacity="0.35"/>
  <circle class="lamp-light" cx="100" cy="98" r="34" fill="#fff6b0" fill-opacity="0.6"/>
  <ellipse cx="100" cy="182" rx="44" ry="10" fill="#4a5a8a"/>
  <rect x="94" y="96" width="12" height="84" rx="6" fill="#7f8fc0"/>
  <circle class="lamp-bulb" cx="100" cy="98" r="14"/>
  <path d="M58 92 L76 34 H124 L142 92 Z" fill="#3fb6a8" stroke="#2c8f84" stroke-width="4" stroke-linejoin="round"/>
</svg>`;

const TEDDY = `
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <style>
    .teddy-wave { transform-box: view-box; transform-origin: 132px 114px;
      animation: teddy-wave 0.5s ease-in-out 0.3s 6 alternate; }
    @keyframes teddy-wave { from { transform: rotate(-12deg); } to { transform: rotate(22deg); } }
  </style>
  <ellipse cx="78" cy="178" rx="20" ry="14" fill="#a8743f"/>
  <ellipse cx="122" cy="178" rx="20" ry="14" fill="#a8743f"/>
  <ellipse cx="100" cy="136" rx="40" ry="44" fill="#b98250"/>
  <ellipse cx="100" cy="142" rx="24" ry="28" fill="#e2bb8a"/>
  <ellipse cx="62" cy="128" rx="13" ry="26" fill="#a8743f" transform="rotate(20 62 128)"/>
  <g class="teddy-wave"><ellipse cx="148" cy="90" rx="13" ry="27" fill="#a8743f" transform="rotate(35 148 90)"/></g>
  <circle cx="64" cy="40" r="17" fill="#a8743f"/>
  <circle cx="136" cy="40" r="17" fill="#a8743f"/>
  <circle cx="64" cy="40" r="8" fill="#e2bb8a"/>
  <circle cx="136" cy="40" r="8" fill="#e2bb8a"/>
  <circle cx="100" cy="66" r="38" fill="#b98250"/>
  <ellipse cx="100" cy="80" rx="18" ry="13" fill="#e2bb8a"/>
  <circle cx="86" cy="60" r="5" fill="#2b2233"/>
  <circle cx="114" cy="60" r="5" fill="#2b2233"/>
  <ellipse cx="100" cy="75" rx="6" ry="4.5" fill="#2b2233"/>
  <path d="M92 84 Q100 91 108 84" fill="none" stroke="#2b2233" stroke-width="3" stroke-linecap="round"/>
</svg>`;

const FAN = `
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <style>
    .fan-blades { transform-box: view-box; transform-origin: 100px 80px;
      animation: fan-spin 0.5s linear infinite; }
    @keyframes fan-spin { to { transform: rotate(360deg); } }
  </style>
  <ellipse cx="100" cy="184" rx="46" ry="10" fill="#4a5a8a"/>
  <rect x="93" y="110" width="14" height="72" rx="7" fill="#7f8fc0"/>
  <circle cx="100" cy="80" r="66" fill="#d7eefc" stroke="#5aa9e6" stroke-width="6"/>
  <g class="fan-blades" fill="#5aa9e6">
    <ellipse cx="100" cy="48" rx="15" ry="30"/>
    <ellipse cx="100" cy="48" rx="15" ry="30" transform="rotate(120 100 80)"/>
    <ellipse cx="100" cy="48" rx="15" ry="30" transform="rotate(240 100 80)"/>
  </g>
  <circle cx="100" cy="80" r="11" fill="#3d6fb3"/>
</svg>`;

export const PICTURES = {
  L: { word: 'lamp', svg: LAMP },
  T: { word: 'teddy', svg: TEDDY },
  F: { word: 'fan', svg: FAN },
};

// The picture for a character id, or null (glow only).
export const pictureFor = (id) => PICTURES[id] ?? null;
