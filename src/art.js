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
  // Slice 5J part 2: "show me" in the games: Jugnu with a play mark.
  showMe: icon('<image href="assets/jugnu.svg" x="2" y="0" width="50" height="50"/>'
    + '<circle cx="47" cy="47" r="14" fill="#35D07F" stroke="#fff" stroke-width="3"/><path d="M42.5 39.5 L55 47 L42.5 54.5 Z" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>'),
  // Slice 5O: undo one stroke: a curved arrow turning back (not the back button's chevron).
  undo: icon('<path d="M22 24 H38 a13 13 0 0 1 0 26 H28" fill="none" stroke="#4D6BFF" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>'
    + '<path d="M26 12 L12 24 L26 36 Z" fill="#4D6BFF" stroke="#4D6BFF" stroke-width="4" stroke-linejoin="round"/>'),
  musicOff: icon('<path d="M14 24 H24 L36 14 V50 L24 40 H14 Z" fill="#2A2370"/><path d="M44 24 L56 40 M56 24 L44 40" stroke="#2A2370" stroke-width="6" stroke-linecap="round"/>'),
};

// A gold star for a completed character (viewBox 0 0 40 40).
export const STAR = `<svg ${NS} viewBox="0 0 40 40" aria-hidden="true"><path d="M20 3 L25 14 L37 15 L28 23 L31 35 L20 29 L9 35 L12 23 L3 15 L15 14 Z" fill="#FFC21A" stroke="#D99400" stroke-width="2.5" stroke-linejoin="round"/></svg>`;

// The ABC book's page switch (Slice 9A): a folded-back page corner, gold, for
// the bottom right of the switch tile. No text.
export const PAGE_CURL = `<svg ${NS} viewBox="0 0 40 40" aria-hidden="true">
  <path d="M40 4 L40 40 L4 40 Z" fill="#FFE8A3"/>
  <path d="M40 4 L4 40 L14 14 Z" fill="#FFF6D6" stroke="#E0B84A" stroke-width="2" stroke-linejoin="round"/>
</svg>`;

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
// Her name's book (Slice 9C): `word` is her name, already checked to be a to z only
// (src/name.js nameOf); without one, the four little writing lines.
const escapeText = (t) => String(t).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const LITTLE_LINES = '<g stroke-linecap="round"><line x1="40" y1="74" x2="100" y2="74" stroke="#5bb8ff" stroke-width="3"/><line x1="40" y1="92" x2="100" y2="92" stroke="#9aa0b8" stroke-width="2.5" stroke-dasharray="5 4"/><line x1="40" y1="110" x2="100" y2="110" stroke="#4cc25a" stroke-width="3"/><line x1="40" y1="122" x2="100" y2="122" stroke="#b9834d" stroke-width="3.5"/></g>';

// The four little lines on their own: the name tile's picture when there is no name to write.
export const NAME_LINES = `<svg ${NS} viewBox="30 60 80 70" aria-hidden="true">${LITTLE_LINES}</svg>`;

function symbol(book, word = '') {
  const latin = (t, c, size) => `<text x="70" y="${92 + size * 0.36}" text-anchor="middle" font-family="Fredoka, 'Baloo 2', system-ui, sans-serif" font-weight="600" font-size="${size}" fill="${c}">${t}</text>`;
  switch (book.id) {
    case 'name': return word ? latin(escapeText(word), book.spine, Math.min(32, 168 / word.length)) : LITTLE_LINES;
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
export function bookCover(book, { word = '' } = {}) {
  return `<svg ${NS} viewBox="0 0 140 200" aria-hidden="true">
  <rect x="0" y="0" width="140" height="200" rx="10" fill="${book.color}"/>
  <rect x="0" y="0" width="22" height="200" rx="8" fill="${book.spine}"/>
  <rect x="14" y="0" width="8" height="200" fill="${book.spine}"/>
  <rect x="30" y="12" width="100" height="5" rx="2.5" fill="#fff" opacity=".35"/>
  <rect x="30" y="183" width="100" height="5" rx="2.5" fill="#fff" opacity=".35"/>
  <circle cx="76" cy="92" r="46" fill="#fff"/>
  <g transform="translate(6 0)">${symbol(book, word)}</g>
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

// Her name card on her shelf of finds (Slice 9C part 2): her name on the four
// little lines, on a cream card with a gold edge, and a gold star when she
// earned the name's star. `word` is already checked to be a to z only
// (src/name.js nameOf); it is escaped all the same. 220 x 120, two places wide.
export function nameCardArt(word, star = false) {
  const size = Math.min(56, 300 / Math.max(word.length, 1));
  return `<svg ${NS} viewBox="0 0 220 120" aria-hidden="true">
  <rect x="6" y="10" width="208" height="102" rx="18" fill="#FFFDF5" stroke="#E0B84A" stroke-width="6"/>
  <g stroke-linecap="round"><line x1="22" y1="36" x2="198" y2="36" stroke="#5bb8ff" stroke-width="2.5"/><line x1="22" y1="60" x2="198" y2="60" stroke="#9aa0b8" stroke-width="2" stroke-dasharray="5 4"/><line x1="22" y1="84" x2="198" y2="84" stroke="#4cc25a" stroke-width="2.5"/><line x1="22" y1="98" x2="198" y2="98" stroke="#b9834d" stroke-width="3"/></g>
  <text x="110" y="84" text-anchor="middle" font-family="Fredoka, system-ui, sans-serif" font-weight="600" font-size="${size}" fill="#1D2B8F">${escapeText(word)}</text>
  ${star ? `<g transform="translate(172 -4) scale(1.1)">${STAR.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}</g>` : ''}
</svg>`;
}

// ---------------------------------------------------------------------------
// The practice page (Slice 5L). Pictures only, never text, nothing red.

// A pencil: yellow body, wood tip, dark lead, pink-free eraser (lilac).
const PENCIL_PATH = `
  <g transform="rotate(-45 40 40)">
    <rect x="10" y="31" width="44" height="18" rx="3" fill="#FFC21A" stroke="#C98A00" stroke-width="2.5"/>
    <line x1="12" y1="40" x2="52" y2="40" stroke="#E0A800" stroke-width="2"/>
    <rect x="2" y="31" width="10" height="18" rx="3" fill="#B39DDB" stroke="#7E57C2" stroke-width="2.5"/>
    <path d="M54 31 L70 40 L54 49 Z" fill="#F4D7A8" stroke="#C98A00" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M64.5 37 L70 40 L64.5 43 Z" fill="#2A2370"/>
  </g>`;

// The board's pencil tile: a big pencil writing a little line, on lined paper.
export const PENCIL_TILE = `<svg ${NS} viewBox="0 0 80 80" aria-hidden="true">
  <line x1="8" y1="62" x2="72" y2="62" stroke="#8FB8E8" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="8" y1="70" x2="72" y2="70" stroke="#E0B84A" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M12 58 q6 -8 12 0 t12 0" fill="none" stroke="#1D2B8F" stroke-width="3" stroke-linecap="round"/>
  ${PENCIL_PATH}
</svg>`;

// Slice 10F: the Urdu board's Dot Detective tile: a magnifying glass over a
// letter body (ب, without its dot), the dot glowing gold inside the lens.
const DETECTIVE_BODY = '<path d="M60 30 Q64 48 56 54 Q42 60 24 56 Q14 52 16 40" fill="none" stroke="#1D2B8F" stroke-width="5" stroke-linecap="round"/>';
const DETECTIVE_GLASS = '<circle cx="40" cy="66" r="13" fill="#FFF7D6" stroke="#5B3A12" stroke-width="4"/><circle cx="40" cy="66" r="4.5" fill="#FFB703"/>'
  + '<path d="M49 75 L58 84" stroke="#5B3A12" stroke-width="6" stroke-linecap="round"/><path d="M34 60 q3 -3 7 -3" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/>';
export const DETECTIVE_TILE = `<svg ${NS} viewBox="0 0 80 90" aria-hidden="true">${DETECTIVE_BODY}${DETECTIVE_GLASS}</svg>`;
// Its three levels' tiles: the same picture, with 1, 2 or 3 pips (as the Drawing book's levels).
export const detectiveLevelArt = (level) => `<svg ${NS} viewBox="0 0 80 100" aria-hidden="true">${DETECTIVE_BODY}${DETECTIVE_GLASS}`
  + Array.from({ length: level }, (_, i) => `<circle cx="${40 + (i - (level - 1) / 2) * 14}" cy="96" r="4.5" fill="#35D07F"/>`).join('') + '</svg>';

// The badge a starred tile wears in practice mode.
export const PENCIL_BADGE = `<svg ${NS} viewBox="0 0 80 80" aria-hidden="true">
  <circle cx="40" cy="40" r="36" fill="#fff" stroke="#E0B84A" stroke-width="4"/>
  ${PENCIL_PATH}
</svg>`;

// The big next-page tile: a fresh lined page and a fat arrow pointing on.
export const NEXT_PAGE = `<svg ${NS} viewBox="0 0 120 120" aria-hidden="true">
  <rect x="14" y="16" width="62" height="84" rx="8" fill="#fff" stroke="#C9DBF0" stroke-width="4"/>
  <line x1="22" y1="44" x2="68" y2="44" stroke="#8FB8E8" stroke-width="3" stroke-linecap="round"/>
  <line x1="22" y1="58" x2="68" y2="58" stroke="#8FB8E8" stroke-width="3" stroke-linecap="round" stroke-dasharray="5 6"/>
  <line x1="22" y1="72" x2="68" y2="72" stroke="#7CB342" stroke-width="3" stroke-linecap="round"/>
  <path d="M58 46 H86 V30 L112 60 L86 90 V74 H58 Z" fill="#35D07F" stroke="#1E9E5A" stroke-width="5" stroke-linejoin="round"/>
</svg>`;

// A page sticker on her shelf of finds (Slice 5L part 2): her letter on a
// little lined page, a stack of sheets behind it (one sheet per page she has
// done, up to 5 in all), and the number of pages in a gold badge at the top
// right corner. 120 x 120, one place wide. `glyph` is a character id (a to z,
// A to Z, 0 to 20; escaped all the same); `color` is its tile color.
export const STICKER = { maxSheets: 5 };
export function pageStickerArt(glyph, count = 1, color = '#1D2B8F') {
  const n = Math.max(1, Math.round(Number(count)) || 1);
  const sheets = Math.min(n, STICKER.maxSheets);
  const behind = [];
  // The back sheets peek out up and to the right, a little turned.
  for (let i = sheets - 1; i >= 1; i--) {
    behind.push(`<rect x="${18 + i * 4}" y="${20 - i * 4}" width="72" height="88" rx="7" fill="#FFFFFF" stroke="#C9DBF0" stroke-width="2.5" transform="rotate(${i * 2.5} ${54 + i * 4} ${64 - i * 4})"/>`);
  }
  const text = escapeText(glyph);
  const size = text.length > 1 ? 40 : 56;
  const label = String(n);
  const badgeR = label.length > 2 ? 20 : 17;
  return `<svg ${NS} viewBox="0 0 120 120" aria-hidden="true">
  ${behind.join('\n  ')}
  <rect x="18" y="20" width="72" height="88" rx="7" fill="#FFFDF5" stroke="#E0B84A" stroke-width="3"/>
  <g stroke-linecap="round"><line x1="24" y1="44" x2="84" y2="44" stroke="#5bb8ff" stroke-width="2"/><line x1="24" y1="62" x2="84" y2="62" stroke="#9aa0b8" stroke-width="1.6" stroke-dasharray="4 3"/><line x1="24" y1="80" x2="84" y2="80" stroke="#4cc25a" stroke-width="2"/><line x1="24" y1="94" x2="84" y2="94" stroke="#b9834d" stroke-width="2.4"/></g>
  <text x="54" y="80" text-anchor="middle" font-family="Fredoka, system-ui, sans-serif" font-weight="600" font-size="${size}" fill="${color}">${text}</text>
  <circle cx="${104 - badgeR}" cy="${4 + badgeR}" r="${badgeR}" fill="#FFC21A" stroke="#D99400" stroke-width="3"/>
  <text x="${104 - badgeR}" y="${4 + badgeR}" text-anchor="middle" dominant-baseline="central" font-family="Fredoka, system-ui, sans-serif" font-weight="600" font-size="${label.length > 2 ? 15 : 19}" fill="#5A3A00">${escapeText(label)}</text>
</svg>`;
}

// Her name's page sticker (Slice 5L part 3): her name on a little lined page,
// two places wide like her name card, a stack of sheets behind it (one per page
// she has done, up to 5 in all) and the number of pages in a gold badge.
// 220 x 120. `word` comes from the child's profile when the shelf draws it (the
// sticker itself stores no name); it is a to z only (src/name.js nameOf), and
// escaped all the same.
export function namePageStickerArt(word, count = 1) {
  const n = Math.max(1, Math.round(Number(count)) || 1);
  const sheets = Math.min(n, STICKER.maxSheets);
  const behind = [];
  for (let i = sheets - 1; i >= 1; i--) {
    behind.push(`<rect x="${10 + i * 4}" y="${22 - i * 4}" width="176" height="88" rx="9" fill="#FFFFFF" stroke="#C9DBF0" stroke-width="2.5" transform="rotate(${i * 1.5} ${98 + i * 4} ${66 - i * 4})"/>`);
  }
  const size = Math.min(48, 260 / Math.max(word.length, 1));
  const label = String(n);
  const badgeR = label.length > 2 ? 20 : 17;
  return `<svg ${NS} viewBox="0 0 220 120" aria-hidden="true">
  ${behind.join('\n  ')}
  <rect x="10" y="22" width="176" height="88" rx="9" fill="#FFFDF5" stroke="#E0B84A" stroke-width="3"/>
  <g stroke-linecap="round"><line x1="20" y1="46" x2="176" y2="46" stroke="#5bb8ff" stroke-width="2"/><line x1="20" y1="64" x2="176" y2="64" stroke="#9aa0b8" stroke-width="1.6" stroke-dasharray="4 3"/><line x1="20" y1="82" x2="176" y2="82" stroke="#4cc25a" stroke-width="2"/><line x1="20" y1="96" x2="176" y2="96" stroke="#b9834d" stroke-width="2.4"/></g>
  <text x="98" y="82" text-anchor="middle" font-family="Fredoka, system-ui, sans-serif" font-weight="600" font-size="${size}" fill="#1D2B8F">${escapeText(word)}</text>
  <circle cx="${212 - badgeR}" cy="${4 + badgeR}" r="${badgeR}" fill="#FFC21A" stroke="#D99400" stroke-width="3"/>
  <text x="${212 - badgeR}" y="${4 + badgeR}" text-anchor="middle" dominant-baseline="central" font-family="Fredoka, system-ui, sans-serif" font-weight="600" font-size="${label.length > 2 ? 15 : 19}" fill="#5A3A00">${escapeText(label)}</text>
</svg>`;
}

// ---------------------------------------------------------------------------
// Children's profiles (Slice 8A part 2): the 8 animal pictures a child can
// choose (src/children.js ANIMALS), each a friendly face on a white disc,
// viewBox 0 0 100 100. No text.
const face = (inner) => `<svg ${NS} viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="48" fill="#fff"/>${inner}</svg>`;
const EYES = (y = 48, dx = 13, r = 5) => `<circle cx="${50 - dx}" cy="${y}" r="${r}" fill="#2A2370"/><circle cx="${50 + dx}" cy="${y}" r="${r}" fill="#2A2370"/>`
  + `<circle cx="${50 - dx + 1.6}" cy="${y - 1.8}" r="${r * 0.35}" fill="#fff"/><circle cx="${50 + dx + 1.6}" cy="${y - 1.8}" r="${r * 0.35}" fill="#fff"/>`;
const SMILE = (y = 64, w = 8) => `<path d="M${50 - w} ${y} q${w} ${w * 0.8} ${w * 2} 0" fill="none" stroke="#2A2370" stroke-width="3" stroke-linecap="round"/>`;
const CHEEKS = (y = 60, dx = 24) => `<circle cx="${50 - dx}" cy="${y}" r="5" fill="#FF8FB8" opacity=".6"/><circle cx="${50 + dx}" cy="${y}" r="5" fill="#FF8FB8" opacity=".6"/>`;
export const ANIMAL_ART = {
  cat: face(`<path d="M22 40 L26 14 L44 30 Z M78 40 L74 14 L56 30 Z" fill="#F4A340" stroke="#C97A1E" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M28 34 L29 22 L38 30 Z M72 34 L71 22 L62 30 Z" fill="#FFC9D6"/>
    <ellipse cx="50" cy="55" rx="31" ry="27" fill="#F4A340" stroke="#C97A1E" stroke-width="2.5"/>
    <path d="M38 33 l3 9 M50 30 v10 M62 33 l-3 9" stroke="#C97A1E" stroke-width="3" stroke-linecap="round"/>
    ${EYES(52)}<path d="M46 60 h8 l-4 5 z" fill="#FF8FB8"/>${SMILE(66, 5)}
    <path d="M18 58 h14 M18 66 l14 -3 M82 58 h-14 M82 66 l-14 -3" stroke="#C97A1E" stroke-width="2" stroke-linecap="round"/>`),
  dog: face(`<ellipse cx="50" cy="52" rx="28" ry="28" fill="#D9A066" stroke="#9C6B3A" stroke-width="2.5"/>
    <path d="M24 30 q-14 4 -10 30 q4 8 12 2 q2 -18 6 -26 z M76 30 q14 4 10 30 q-4 8 -12 2 q-2 -18 -6 -26 z" fill="#8A5A2E"/>
    <ellipse cx="50" cy="64" rx="15" ry="11" fill="#F6E1C3"/>${EYES(48, 12)}
    <ellipse cx="50" cy="58" rx="6" ry="4.5" fill="#2A2370"/>${SMILE(65, 6)}<path d="M46 70 q4 9 8 0" fill="#FF8FB8"/>`),
  rabbit: face(`<ellipse cx="38" cy="22" rx="8" ry="20" fill="#EDE7F6" stroke="#9E92C7" stroke-width="2.5"/><ellipse cx="62" cy="22" rx="8" ry="20" fill="#EDE7F6" stroke="#9E92C7" stroke-width="2.5"/>
    <ellipse cx="38" cy="23" rx="3.5" ry="13" fill="#FFC9D6"/><ellipse cx="62" cy="23" rx="3.5" ry="13" fill="#FFC9D6"/>
    <ellipse cx="50" cy="60" rx="28" ry="25" fill="#EDE7F6" stroke="#9E92C7" stroke-width="2.5"/>
    ${EYES(56, 12)}${CHEEKS(66, 19)}<path d="M46 64 h8 l-4 4 z" fill="#FF8FB8"/>${SMILE(70, 5)}<rect x="46.5" y="72" width="7" height="6" rx="1.5" fill="#fff" stroke="#9E92C7" stroke-width="1.5"/>`),
  bear: face(`<circle cx="27" cy="28" r="11" fill="#9C6B3A"/><circle cx="73" cy="28" r="11" fill="#9C6B3A"/><circle cx="27" cy="28" r="5" fill="#E0B07A"/><circle cx="73" cy="28" r="5" fill="#E0B07A"/>
    <circle cx="50" cy="54" r="30" fill="#9C6B3A"/><ellipse cx="50" cy="64" rx="14" ry="11" fill="#E0B07A"/>
    ${EYES(48, 12)}<ellipse cx="50" cy="59" rx="6" ry="4" fill="#2A2370"/>${SMILE(66, 5)}`),
  owl: face(`<path d="M24 26 L32 38 L22 40 Z M76 26 L68 38 L78 40 Z" fill="#7E57C2"/>
    <ellipse cx="50" cy="56" rx="29" ry="31" fill="#7E57C2"/><ellipse cx="50" cy="66" rx="17" ry="18" fill="#D1C4E9"/>
    <circle cx="38" cy="46" r="11" fill="#fff" stroke="#5E35B1" stroke-width="2"/><circle cx="62" cy="46" r="11" fill="#fff" stroke="#5E35B1" stroke-width="2"/>
    <circle cx="38" cy="46" r="5.5" fill="#2A2370"/><circle cx="62" cy="46" r="5.5" fill="#2A2370"/><circle cx="39.5" cy="44" r="2" fill="#fff"/><circle cx="63.5" cy="44" r="2" fill="#fff"/>
    <path d="M45 55 h10 l-5 8 z" fill="#FFB300"/><path d="M42 72 q3 3 6 0 M52 72 q3 3 6 0" fill="none" stroke="#9575CD" stroke-width="2" stroke-linecap="round"/>`),
  fox: face(`<path d="M20 22 L38 34 L26 48 Z M80 22 L62 34 L74 48 Z" fill="#EF6C00" stroke="#B84E00" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M24 30 L32 36 L27 42 Z M76 30 L68 36 L73 42 Z" fill="#3E2723"/>
    <path d="M18 44 Q50 22 82 44 Q76 74 50 84 Q24 74 18 44 Z" fill="#EF6C00" stroke="#B84E00" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M22 50 Q38 56 50 84 Q30 76 22 50 Z M78 50 Q62 56 50 84 Q70 76 78 50 Z" fill="#fff"/>
    ${EYES(52, 13, 4.5)}<ellipse cx="50" cy="74" rx="5" ry="4" fill="#2A2370"/>`),
  elephant: face(`<ellipse cx="22" cy="48" rx="16" ry="22" fill="#90A4AE" stroke="#607D8B" stroke-width="2.5"/><ellipse cx="78" cy="48" rx="16" ry="22" fill="#90A4AE" stroke="#607D8B" stroke-width="2.5"/>
    <ellipse cx="22" cy="48" rx="9" ry="14" fill="#F8BBD0"/><ellipse cx="78" cy="48" rx="9" ry="14" fill="#F8BBD0"/>
    <circle cx="50" cy="46" r="24" fill="#B0BEC5" stroke="#607D8B" stroke-width="2.5"/>
    <path d="M42 58 q-2 22 10 28 q6 2 8 -4 q-8 -4 -6 -24 z" fill="#B0BEC5" stroke="#607D8B" stroke-width="2.5" stroke-linejoin="round"/>
    ${EYES(42, 10, 4.5)}${CHEEKS(52, 15)}`),
  fish: face(`<path d="M70 50 L90 32 L90 68 Z" fill="#FFB300" stroke="#E08E00" stroke-width="2.5" stroke-linejoin="round"/>
    <ellipse cx="46" cy="50" rx="30" ry="22" fill="#29B6F6" stroke="#0288D1" stroke-width="2.5"/>
    <path d="M40 28 q8 -10 18 0 z M42 72 q6 8 12 0 z" fill="#FFB300"/>
    <path d="M54 34 q6 16 0 32" fill="none" stroke="#0288D1" stroke-width="2.5"/>
    <circle cx="32" cy="45" r="6" fill="#fff"/><circle cx="31" cy="45" r="3.5" fill="#2A2370"/><circle cx="32" cy="43.5" r="1.3" fill="#fff"/>
    <path d="M20 56 q4 4 8 1" fill="none" stroke="#2A2370" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="44" cy="60" r="3" fill="#B3E5FC"/><circle cx="62" cy="44" r="2.5" fill="#B3E5FC"/>`),
};

// The gear on the front door (Slice 8A part 2), for a grown-up, 64 x 64.
const TEETH = Array.from({ length: 8 }, (_, i) => `<rect x="27" y="4" width="10" height="14" rx="2" transform="rotate(${i * 45} 32 32)"/>`).join('');
export const GEAR = icon(`<g fill="#5C6384">${TEETH}<circle cx="32" cy="32" r="19"/></g><circle cx="32" cy="32" r="8" fill="#fff"/>`);
