// art.js — the shell's pictures, as inline SVG strings so they work offline.
// The house front and the door are adapted from docs/mockups/mockup4.html.
// Jugnu himself is assets/jugnu.svg. Nothing here loads anything from outside.

const NS = 'xmlns="http://www.w3.org/2000/svg"';

// The house front, 1280 x 640. The doorway is at x 580, y 360, 120 x 204:
// the door (DOOR, below) sits exactly over it and swings open to show a warm light.
export const HOUSE = `<svg ${NS} viewBox="0 0 1280 640" preserveAspectRatio="none" aria-hidden="true">
  <defs>
    <radialGradient id="house-lamp"><stop offset="0" stop-color="#FFF3A8" stop-opacity=".95"/><stop offset=".55" stop-color="#FFE066" stop-opacity=".45"/><stop offset="1" stop-color="#FFE066" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1280" height="640" fill="#BFE6FF"/><rect width="1280" height="200" fill="#A8DCFF"/>
  <circle cx="1120" cy="100" r="54" fill="#FFD43B"/><circle cx="1120" cy="100" r="38" fill="#FFF3B0"/>
  <g fill="#fff"><ellipse cx="220" cy="110" rx="70" ry="26"/><ellipse cx="270" cy="96" rx="46" ry="26"/><ellipse cx="900" cy="80" rx="60" ry="22"/><ellipse cx="940" cy="68" rx="40" ry="22"/></g>
  <rect y="520" width="1280" height="120" fill="#7BC67E"/><rect y="510" width="1280" height="16" fill="#68B56B"/>
  <path d="M580 640 L600 560 H680 L700 640 Z" fill="#E8C9A0"/>
  <polygon points="340,210 640,60 940,210" fill="#E84C4C"/><polygon points="370,206 640,80 910,206" fill="#FF6B6B"/>
  <rect x="380" y="200" width="520" height="364" fill="#FFE8C2"/><rect x="380" y="200" width="520" height="14" fill="#F2CF98"/>
  <g transform="translate(420,280)"><rect width="120" height="110" rx="10" fill="#fff"/><rect x="10" y="10" width="100" height="90" rx="6" fill="#BDE6FF"/><rect x="56" y="10" width="8" height="90" fill="#fff"/><path d="M10 10 Q40 40 10 70 Z M110 10 Q80 40 110 70 Z" fill="#FF8FB8"/></g>
  <g transform="translate(740,280)"><rect width="120" height="110" rx="10" fill="#fff"/><rect x="10" y="10" width="100" height="90" rx="6" fill="#BDE6FF"/><rect x="56" y="10" width="8" height="90" fill="#fff"/><path d="M10 10 Q40 40 10 70 Z M110 10 Q80 40 110 70 Z" fill="#FF8FB8"/></g>
  <rect x="570" y="350" width="140" height="214" rx="12" fill="#8A5A2B"/><rect x="580" y="360" width="120" height="204" rx="8" fill="#FFE9A0"/>
  <rect x="580" y="360" width="120" height="204" rx="8" fill="url(#house-lamp)" opacity=".9"/>
  <g fill="#FF8FB8"><circle cx="420" cy="540" r="10"/><circle cx="452" cy="548" r="9"/><circle cx="830" cy="542" r="10"/><circle cx="862" cy="548" r="9"/></g>
  <g fill="#FFD43B"><circle cx="420" cy="540" r="4"/><circle cx="452" cy="548" r="4"/><circle cx="830" cy="542" r="4"/><circle cx="862" cy="548" r="4"/></g>
</svg>`;

export const DOOR = `<svg ${NS} viewBox="0 0 120 204" preserveAspectRatio="none" aria-hidden="true">
  <rect width="120" height="204" rx="8" fill="#C0392B"/>
  <rect x="14" y="16" width="92" height="76" rx="8" fill="#D9534F"/><rect x="14" y="108" width="92" height="80" rx="8" fill="#D9534F"/>
  <circle cx="98" cy="110" r="8" fill="#FFD43B"/><circle cx="60" cy="54" r="16" fill="#FFD43B" opacity=".9"/>
  <path d="M60 44 l3 7 8 1 -6 5 2 8 -7 -4 -7 4 2 -8 -6 -5 8 -1z" fill="#FF8FB8"/>
</svg>`;

// Button icons (from mockup 4), 64 x 64.
const icon = (inner) => `<svg ${NS} viewBox="0 0 64 64" aria-hidden="true">${inner}</svg>`;
export const ICONS = {
  home: icon('<polygon points="32,10 8,32 16,32 16,52 48,52 48,32 56,32" fill="#FF6B6B" stroke="#C93A3A" stroke-width="3" stroke-linejoin="round"/><rect x="26" y="36" width="12" height="16" rx="3" fill="#FFE3A3"/>'),
  back: icon('<path d="M40 14 L20 32 L40 50" fill="none" stroke="#2A2370" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>'),
  musicOn: icon('<path d="M14 24 H24 L36 14 V50 L24 40 H14 Z" fill="#2A2370"/><path d="M44 22 q8 10 0 20 M50 16 q14 16 0 32" stroke="#2A2370" stroke-width="5" fill="none" stroke-linecap="round"/>'),
  musicOff: icon('<path d="M14 24 H24 L36 14 V50 L24 40 H14 Z" fill="#2A2370"/><path d="M44 24 L56 40 M56 24 L44 40" stroke="#2A2370" stroke-width="6" stroke-linecap="round"/>'),
};

// A gold star for a completed character (viewBox 0 0 40 40).
export const STAR = `<svg ${NS} viewBox="0 0 40 40" aria-hidden="true"><path d="M20 3 L25 14 L37 15 L28 23 L31 35 L20 29 L9 35 L12 23 L3 15 L15 14 Z" fill="#FFC21A" stroke="#D99400" stroke-width="2.5" stroke-linejoin="round"/></svg>`;

// A letter due for review: a small firefly light, a warm glowing dot with two little wings. No text.
export const DUE_MARK = `<svg ${NS} viewBox="0 0 40 40" aria-hidden="true">
  <circle cx="20" cy="22" r="15" fill="#FFE066" opacity="0.45"/>
  <ellipse cx="12" cy="14" rx="7" ry="5" fill="#E3F2FF" stroke="#9CC6EC" stroke-width="1.5"/>
  <ellipse cx="28" cy="14" rx="7" ry="5" fill="#E3F2FF" stroke="#9CC6EC" stroke-width="1.5"/>
  <circle cx="20" cy="22" r="9" fill="#FFD43B" stroke="#F2A900" stroke-width="2"/>
  <circle cx="17" cy="19" r="3" fill="#FFF8D6"/>
</svg>`;

// The small padlock on a locked book.
const LOCK = '<g transform="translate(70 170)"><circle r="20" fill="#fff" opacity=".95"/><path d="M-8 -2 V-8 a8 8 0 0 1 16 0 V-2" fill="none" stroke="#6B6F7B" stroke-width="4" stroke-linecap="round"/><rect x="-11" y="-3" width="22" height="16" rx="3" fill="#6B6F7B"/><circle cy="4" r="2.6" fill="#fff"/></g>';

// What sits in each cover's white circle (centre 70, 92; radius 46). Text is the
// characters themselves (allowed on child screens); the rest are pictures.
function symbol(book) {
  const latin = (t, c, size) => `<text x="70" y="${92 + size * 0.36}" text-anchor="middle" font-family="Fredoka, 'Baloo 2', system-ui, sans-serif" font-weight="600" font-size="${size}" fill="${c}">${t}</text>`;
  switch (book.id) {
    case 'abc': return latin('ABC', book.spine, 32);
    case 'num': return latin('123', book.spine, 34);
    case 'urdu': return `<text x="70" y="104" text-anchor="middle" direction="rtl" font-family="'Noto Naskh Arabic', 'Noto Sans Arabic', serif" font-weight="700" font-size="38" fill="${book.spine}">آ ب</text>`;
    case 'shapes': return '<circle cx="50" cy="80" r="13" fill="#8E24AA"/><polygon points="90,64 104,88 76,88" fill="#F9A825"/><rect x="58" y="94" width="24" height="24" rx="3" fill="#1E88E5"/>';
    case 'games': return '<g transform="rotate(-10 70 92)"><rect x="44" y="66" width="52" height="52" rx="11" fill="#FB8C00"/><g fill="#fff"><circle cx="57" cy="79" r="5.5"/><circle cx="83" cy="79" r="5.5"/><circle cx="70" cy="92" r="5.5"/><circle cx="57" cy="105" r="5.5"/><circle cx="83" cy="105" r="5.5"/></g></g>';
    case 'drawing': return '<g transform="rotate(40 70 92)"><rect x="61" y="56" width="18" height="50" rx="3" fill="#00897B"/><rect x="61" y="66" width="18" height="7" fill="#fff" opacity=".7"/><polygon points="61,106 79,106 70,124" fill="#FFD9A8"/><polygon points="66,116 74,116 70,124" fill="#00897B"/></g>';
    case 'stories': return '<path d="M70 76 C60 68 46 68 38 72 V112 C46 108 60 108 70 116 C80 108 94 108 102 112 V72 C94 68 80 68 70 76 Z" fill="#EC407A"/><path d="M70 76 V116" stroke="#fff" stroke-width="3"/><path d="M46 82 H62 M46 92 H62 M78 82 H94 M78 92 H94" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/>';
    default: return '';
  }
}

// One book standing face-out, 140 x 200: a solid cover, a darker spine on the
// left, a white circle holding its symbol, and a lock when it is closed.
export function bookCover(book) {
  return `<svg ${NS} viewBox="0 0 140 200" aria-hidden="true">
  <rect x="0" y="0" width="140" height="200" rx="10" fill="${book.color}"/>
  <rect x="0" y="0" width="22" height="200" rx="8" fill="${book.spine}"/>
  <rect x="14" y="0" width="8" height="200" fill="${book.spine}"/>
  <rect x="30" y="12" width="100" height="5" rx="2.5" fill="#fff" opacity=".35"/>
  <rect x="30" y="183" width="100" height="5" rx="2.5" fill="#fff" opacity=".35"/>
  <circle cx="76" cy="92" r="46" fill="#fff"/>
  <g transform="translate(6 0)">${symbol(book)}</g>
  ${book.open ? '' : LOCK}
</svg>`;
}

// The tablet is upright: Jugnu beside a tablet that turns onto its side, over
// and over, with a green arrow showing the way. No text. 600 x 400; the classes
// are animated in index.html (#turn).
export const TURN = `<svg ${NS} viewBox="0 0 600 400" aria-hidden="true">
  <g class="turn-arrow" fill="none" stroke="#35D07F" stroke-width="14" stroke-linecap="round" stroke-linejoin="round">
    <path d="M300 36 A 176 176 0 0 1 470 160"/>
    <path d="M440 150 L472 166 L488 132"/>
  </g>
  <g class="turn-tab">
    <rect x="215" y="70" width="170" height="270" rx="24" fill="#2A2370"/>
    <rect x="229" y="86" width="142" height="238" rx="12" fill="#FFFFFF"/>
    <g class="turn-lines">
    <line x1="245" y1="160" x2="355" y2="160" stroke="#5bb8ff" stroke-width="5" stroke-linecap="round"/>
    <line x1="245" y1="195" x2="355" y2="195" stroke="#9aa0b8" stroke-width="4" stroke-dasharray="10 8" stroke-linecap="round"/>
    <line x1="245" y1="230" x2="355" y2="230" stroke="#4cc25a" stroke-width="5" stroke-linecap="round"/>
    <line x1="245" y1="252" x2="355" y2="252" stroke="#b9834d" stroke-width="6" stroke-linecap="round"/>
    </g>
    <circle cx="300" cy="332" r="4" fill="#6C6FA8"/>
  </g>
  <image class="turn-jugnu" href="assets/jugnu.svg" x="20" y="200" width="170" height="170"/>
</svg>`;
