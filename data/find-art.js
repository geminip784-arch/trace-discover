// data/find-art.js — the pictures Slice 5G adds to the find library, drawn in
// docs/mockups/mockup4.html's flat style: soft outlines a shade darker than the
// fill, a white shine, a ground shadow, and on food and animals the same little
// face (dark eyes with a white glint, a smile, pink cheeks).
// Each object is 200 x 240 units, standing on y = 224, like data/finds.js.
// The moving part of each picture is <g class="anim">, so a found object can
// hop, wobble or swing (its `reward` in data/finds.js; CSS in index.html).
// The backdrops are 1280 x 640. None of them paints in a find object.

const NS = 'xmlns="http://www.w3.org/2000/svg"';
const EYE = '#3B2416';

// One object: its ground shadow, then its body inside the animated group.
const art = (body, { rx = 64, origin = '100px 220px' } = {}) =>
  `<svg ${NS} viewBox="0 0 200 240" class="art" style="overflow:visible">`
  + `<ellipse cx="100" cy="226" rx="${rx}" ry="9" fill="#000" opacity=".12"/>`
  + `<g class="anim" style="transform-origin:${origin}">${body}</g></svg>`;

const eyes = (x1, x2, y, r = 6) => `<circle cx="${x1}" cy="${y}" r="${r}" fill="${EYE}"/><circle cx="${x2}" cy="${y}" r="${r}" fill="${EYE}"/>`
  + `<circle cx="${x1 + r / 3}" cy="${y - r / 3}" r="${r / 3}" fill="#fff"/><circle cx="${x2 + r / 3}" cy="${y - r / 3}" r="${r / 3}" fill="#fff"/>`;
const smile = (x, y, w = 11, color = EYE) => `<path d="M${x - w} ${y} Q${x} ${y + 10} ${x + w} ${y}" fill="none" stroke="${color}" stroke-width="3.5" stroke-linecap="round"/>`;
const cheeks = (x1, x2, y, r = 7) => `<circle cx="${x1}" cy="${y}" r="${r}" fill="#FF8FAB" opacity=".55"/><circle cx="${x2}" cy="${y}" r="${r}" fill="#FF8FAB" opacity=".55"/>`;
// The little face: eyes `gap` either side of x, the smile and cheeks below.
const face = (x, y, gap = 17, r = 6) => eyes(x - gap, x + gap, y, r) + smile(x, y + 16, gap * 0.6) + cheeks(x - gap - 12, x + gap + 12, y + 14);
const shine = (x, y, rx, ry, rot = 0) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#fff" opacity=".4" transform="rotate(${rot} ${x} ${y})"/>`;
const wheel = (x, y) => `<circle cx="${x}" cy="${y}" r="20" fill="#3B3B4F"/><circle cx="${x}" cy="${y}" r="8" fill="#C9CED6"/>`;
const leaf = (x, y, rot) => `<ellipse cx="${x}" cy="${y}" rx="22" ry="9" fill="#35D07F" transform="rotate(${rot} ${x} ${y})"/>`;
const stem = (d) => `<path d="${d}" stroke="#5B3A12" stroke-width="7" fill="none" stroke-linecap="round"/>`;
const outline = (fill, edge, w = 4) => `fill="${fill}" stroke="${edge}" stroke-width="${w}" stroke-linejoin="round"`;

// A side-on horse shape, shared by the horse and the zebra (facing right).
function horseShape({ body, edge, mane, legs, hoof, stripes = '' }) {
  const legRects = [52, 72, 118, 138].map((x) => `<rect x="${x}" y="158" width="14" height="58" rx="6" fill="${legs}"/><rect x="${x}" y="208" width="14" height="10" rx="3" fill="${hoof}"/>`).join('');
  return `<path d="M42 132 Q8 150 20 204 Q32 172 48 150 Z" fill="${mane}"/>${legRects}`
    + `<ellipse cx="96" cy="146" rx="62" ry="32" ${outline(body, edge)}/>`
    + `<path d="M128 142 L138 72 L166 66 L162 150 Z" ${outline(body, edge)}/>`
    + `<ellipse cx="166" cy="84" rx="17" ry="33" ${outline(body, edge)} transform="rotate(-55 166 84)"/>`
    + `<path d="M146 64 L144 40 L160 58 Z" ${outline(body, edge, 3)}/>`
    + stripes
    + `<path d="M138 62 Q118 94 126 142 L138 140 Q132 100 152 64 Z" fill="${mane}"/>`
    + `<circle cx="160" cy="80" r="5" fill="${EYE}"/><circle cx="161.6" cy="78.4" r="1.6" fill="#fff"/><circle cx="188" cy="99" r="3" fill="${EYE}"/>`;
}

// Zebra stripes inside the horse's body ellipse (centre 96,146; 62 x 32) and on its neck and legs.
const zebraStripes = (() => {
  let s = '';
  for (const x of [50, 66, 82, 98, 114, 130, 146]) {
    const h = 32 * Math.sqrt(1 - ((x - 96) / 62) ** 2) - 4;
    s += `<path d="M${x} ${(146 - h).toFixed(1)} q7 ${h.toFixed(1)} 0 ${(2 * h).toFixed(1)}" stroke="#2B2B33" stroke-width="7" fill="none" stroke-linecap="round"/>`;
  }
  for (const y of [86, 102, 118, 134]) s += `<path d="M${136 - (y - 72) * 0.12} ${y} L${162 + (y - 72) * 0.02} ${y - 6}" stroke="#2B2B33" stroke-width="6" stroke-linecap="round"/>`;
  for (const x of [52, 72, 118, 138]) s += `<path d="M${x} 178 h14 M${x} 194 h14" stroke="#2B2B33" stroke-width="5"/>`;
  return s;
})();

// Lion's mane: a ring of round tufts.
const maneTufts = Array.from({ length: 14 }, (_, i) => {
  const a = (i / 14) * 2 * Math.PI;
  return `<circle cx="${(100 + 58 * Math.cos(a)).toFixed(1)}" cy="${(112 + 58 * Math.sin(a)).toFixed(1)}" r="22" fill="#D9822B"/>`;
}).join('');

// Sun rays: 12 triangles round the middle.
const sunRays = Array.from({ length: 12 }, (_, i) => {
  const a = (i / 12) * 2 * Math.PI;
  const p = (r, da) => `${(100 + r * Math.cos(a + da)).toFixed(1)} ${(124 + r * Math.sin(a + da)).toFixed(1)}`;
  return `<path d="M${p(56, -0.17)} L${p(88, 0)} L${p(56, 0.17)} Z" fill="#FFB703"/>`;
}).join('');

// Grapes: purple circles in a bunch.
const grapeBalls = [[64, 86], [100, 82], [136, 86], [46, 116], [82, 114], [118, 114], [154, 116], [64, 144], [100, 144], [136, 144], [82, 174], [118, 174], [100, 202]]
  .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="19" ${outline('#9C5DE0', '#7B3FC4', 3)}/><circle cx="${x - 6}" cy="${y - 6}" r="5" fill="#fff" opacity=".45"/>`).join('');

// Quilt patches, 3 x 3.
const QUILT = ['#FF8FAB', '#FFD43B', '#4D96FF', '#35D07F', '#B197FC', '#FFB067', '#4DD4C6', '#FF8FAB', '#FFD43B'];
const quiltPatches = QUILT.map((c, i) => {
  const x = 30 + (i % 3) * 47;
  const y = 92 + Math.floor(i / 3) * 40;
  return `<rect x="${x}" y="${y}" width="46" height="39" fill="${c}"/><rect x="${x + 4}" y="${y + 4}" width="38" height="31" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="5 4" opacity=".8"/>`;
}).join('');

// Rainbow bands.
const rainbowBands = ['#FF6B6B', '#FF9F1C', '#FFD43B', '#35D07F', '#4D96FF', '#9775FA']
  .map((c, i) => { const r = 86 - i * 13; return `<path d="M${100 - r} 200 A${r} ${r} 0 0 1 ${100 + r} 200" stroke="${c}" stroke-width="13" fill="none"/>`; }).join('');
const cloud = (x, y) => `<g fill="#fff"><circle cx="${x}" cy="${y}" r="18"/><circle cx="${x + 18}" cy="${y - 8}" r="20"/><circle cx="${x + 36}" cy="${y}" r="17"/><rect x="${x - 4}" y="${y}" width="44" height="16" rx="8"/></g>`;

// Octopus arms.
const octoArms = [40, 64, 88, 112, 136, 160].map((x, i) => `<path d="M${x} 130 q${i < 3 ? -14 : 14} 30 0 54 q${i < 3 ? 10 : -10} 18 ${i < 3 ? -8 : 8} 26" stroke="#B983FF" stroke-width="16" fill="none" stroke-linecap="round"/>`).join('');

// Jellyfish arms.
const jellyArms = [52, 76, 100, 124, 148].map((x) => `<path d="M${x} 126 q-10 20 0 40 q10 20 0 44" stroke="#FF8FD6" stroke-width="6" fill="none" stroke-linecap="round"/>`).join('');

export const ART = {
  apple: art(`<path d="M100 92 C72 70 28 86 30 136 C32 190 66 224 100 210 C134 224 168 190 170 136 C172 86 128 70 100 92 Z" ${outline('#FF4D4D', '#D93636')}/>`
    + shine(64, 124, 12, 22, 20) + stem('M100 94 Q96 70 110 54') + leaf(132, 64, -25) + face(100, 146)),

  ant: art(`<g stroke="#3B2416" stroke-width="6" stroke-linecap="round" fill="none"><path d="M88 160 L60 208"/><path d="M102 164 L102 212"/><path d="M114 160 L142 208"/>`
    + `<path d="M140 110 Q134 72 112 62"/><path d="M158 110 Q168 72 190 66"/></g><circle cx="112" cy="62" r="7" fill="#4A2C1A"/><circle cx="190" cy="66" r="7" fill="#4A2C1A"/>`
    + '<ellipse cx="50" cy="150" rx="40" ry="32" fill="#4A2C1A"/><ellipse cx="102" cy="156" rx="24" ry="18" fill="#4A2C1A"/><circle cx="148" cy="134" r="30" fill="#4A2C1A"/>'
    + shine(38, 136, 12, 7, -20) + '<circle cx="158" cy="126" r="10" fill="#fff"/><circle cx="161" cy="126" r="5" fill="#3B2416"/>'
    + smile(156, 146, 9, '#fff') + cheeks(138, 172, 144, 5), { rx: 80 }),

  alligator: art('<path d="M44 160 L2 194 L50 188 Z" fill="#4CAF50" stroke="#2E7D32" stroke-width="4" stroke-linejoin="round"/>'
    + [56, 80, 116, 136].map((x) => `<rect x="${x}" y="184" width="16" height="28" rx="6" fill="#43A047"/>`).join('')
    + `<ellipse cx="94" cy="170" rx="62" ry="26" ${outline('#4CAF50', '#2E7D32')}/>`
    + '<path d="M54 150 l8 -10 l8 10 M76 146 l8 -10 l8 10 M98 146 l8 -10 l8 10 M120 150 l8 -10 l8 10" fill="#2E7D32"/>'
    + '<ellipse cx="96" cy="186" rx="48" ry="8" fill="#A5D6A7"/>'
    + `<path d="M140 152 L194 160 Q200 168 190 169 L140 169 Z" ${outline('#4CAF50', '#2E7D32')}/>`
    + `<path d="M140 172 L186 174 Q194 182 184 186 L140 188 Z" ${outline('#43A047', '#2E7D32')}/>`
    + '<path d="M150 169 l5 6 l5 -6 l5 6 l5 -6 l5 6 l5 -6 l5 6 l4 -6 Z" fill="#fff"/>'
    + `<circle cx="142" cy="146" r="14" ${outline('#4CAF50', '#2E7D32')}/><circle cx="143" cy="144" r="8" fill="#fff"/><circle cx="145" cy="144" r="4.5" fill="${EYE}"/>`, { rx: 90 }),

  ball: art(`<circle cx="100" cy="150" r="70" ${outline('#FF6B6B', '#E84C4C')}/><path d="M34 128 C64 154 136 154 166 128" stroke="#fff" stroke-width="14" fill="none"/>`
    + '<path d="M34 174 C64 200 136 200 166 174" stroke="#FFD43B" stroke-width="14" fill="none"/>' + shine(70, 110, 14, 9, -30)),

  banana: art(`<path d="M48 84 C32 160 82 222 172 202 L178 188 C114 192 76 152 80 88 Z" ${outline('#FFE14D', '#E7B500')}/>`
    + '<path d="M60 112 C60 160 92 194 150 198" stroke="#fff" stroke-width="6" opacity=".45" fill="none" stroke-linecap="round"/>'
    + '<rect x="48" y="68" width="30" height="22" rx="6" fill="#8B5A2B"/><circle cx="176" cy="196" r="6" fill="#5B3A12"/>'),

  bus: art(`<rect x="12" y="78" width="176" height="112" rx="18" ${outline('#FFD43B', '#E7B500')}/>`
    + [24, 62, 100].map((x) => `<rect x="${x}" y="92" width="32" height="38" rx="6" fill="#BDE6FF"/>`).join('')
    + '<rect x="144" y="92" width="34" height="56" rx="6" fill="#BDE6FF"/><rect x="12" y="148" width="128" height="10" fill="#FF922B"/>'
    + '<circle cx="180" cy="170" r="6" fill="#FFF3B0"/>' + wheel(52, 192) + wheel(148, 192), { rx: 90 }),

  cat: art('<path d="M146 204 Q192 194 176 140" stroke="#F08C2E" stroke-width="14" fill="none" stroke-linecap="round"/>'
    + `<ellipse cx="100" cy="182" rx="50" ry="40" ${outline('#FFA94D', '#F08C2E')}/>`
    + `<path d="M62 94 L56 44 L96 74 Z M138 94 L144 44 L104 74 Z" ${outline('#FFA94D', '#F08C2E')}/><path d="M66 86 L63 56 L88 74 Z M134 86 L137 56 L112 74 Z" fill="#FF8FAB"/>`
    + `<circle cx="100" cy="112" r="46" ${outline('#FFA94D', '#F08C2E')}/>`
    + '<path d="M90 70 l4 14 M100 68 v16 M110 70 l-4 14" stroke="#F08C2E" stroke-width="4" stroke-linecap="round"/>'
    + '<ellipse cx="100" cy="130" rx="22" ry="14" fill="#FFF3E0"/>' + eyes(82, 118, 106)
    + `<path d="M94 121 h12 l-6 7 z" fill="#FF6B9A"/><path d="M100 128 q-6 8 -12 4 M100 128 q6 8 12 4" stroke="${EYE}" stroke-width="3" fill="none" stroke-linecap="round"/>`
    + `<g stroke="${EYE}" stroke-width="2.5" stroke-linecap="round"><path d="M76 124 H46 M76 131 L48 140 M124 124 H154 M124 131 L152 140"/></g>`
    + '<ellipse cx="80" cy="218" rx="16" ry="8" fill="#FFF3E0"/><ellipse cx="120" cy="218" rx="16" ry="8" fill="#FFF3E0"/>'),

  cup: art('<path d="M84 86 q-10 -14 0 -28 q10 -14 0 -28 M116 86 q-10 -14 0 -28 q10 -14 0 -28" stroke="#C9D6E8" stroke-width="6" fill="none" stroke-linecap="round"/>'
    + `<ellipse cx="100" cy="212" rx="76" ry="13" ${outline('#B8D4FF', '#8DB6F0', 3)}/>`
    + '<path d="M136 124 q36 0 36 30 q0 30 -36 30" stroke="#3A7BE0" stroke-width="12" fill="none"/>'
    + `<path d="M50 100 H150 L142 196 Q140 208 128 208 H72 Q60 208 58 196 Z" ${outline('#4D96FF', '#3A7BE0')}/>`
    + '<ellipse cx="100" cy="100" rx="50" ry="10" fill="#A0612B" stroke="#3A7BE0" stroke-width="4"/>'
    + '<rect x="68" y="120" width="12" height="70" rx="6" fill="#fff" opacity=".35"/>'),

  cake: art('<ellipse cx="100" cy="214" rx="86" ry="12" fill="#E3F2FF"/>'
    + `<rect x="30" y="148" width="140" height="64" rx="12" ${outline('#FF8FAB', '#E86F95')}/>`
    + '<path d="M30 160 Q30 148 42 148 H158 Q170 148 170 160 V168 q-10 12 -20 0 q-10 12 -20 0 q-10 12 -20 0 q-10 12 -20 0 q-10 12 -20 0 q-10 12 -20 0 q-10 12 -20 0 Z" fill="#fff"/>'
    + `<rect x="56" y="102" width="88" height="50" rx="10" ${outline('#FFD9A8', '#E8B77A')}/>`
    + '<path d="M56 112 Q56 102 66 102 H134 Q144 102 144 112 V118 q-11 10 -22 0 q-11 10 -22 0 q-11 10 -22 0 q-11 10 -22 0 Z" fill="#fff"/>'
    + '<rect x="94" y="64" width="12" height="40" rx="3" fill="#4D96FF"/><path d="M94 74 l12 -6 M94 86 l12 -6 M94 98 l12 -6" stroke="#fff" stroke-width="3"/>'
    + '<path d="M100 36 Q114 54 100 64 Q86 54 100 36 Z" fill="#FFB703"/><path d="M100 48 Q106 56 100 62 Q94 56 100 48 Z" fill="#FFF3B0"/>'
    + '<g fill="#fff"><circle cx="54" cy="192" r="4"/><circle cx="82" cy="186" r="4"/><circle cx="118" cy="192" r="4"/><circle cx="146" cy="186" r="4"/></g>'
    + '<g fill="#4D96FF"><circle cx="68" cy="196" r="3.5"/><circle cx="132" cy="196" r="3.5"/></g><g fill="#35D07F"><circle cx="100" cy="196" r="3.5"/><circle cx="160" cy="198" r="3.5"/></g>', { rx: 86 }),

  dog: art('<path d="M144 196 Q182 186 180 150" stroke="#B07A3E" stroke-width="12" fill="none" stroke-linecap="round"/>'
    + `<ellipse cx="100" cy="184" rx="46" ry="38" ${outline('#D9A066', '#B07A3E')}/>`
    + '<ellipse cx="52" cy="118" rx="16" ry="38" fill="#8B5A2B" transform="rotate(14 52 118)"/><ellipse cx="148" cy="118" rx="16" ry="38" fill="#8B5A2B" transform="rotate(-14 148 118)"/>'
    + `<ellipse cx="100" cy="114" rx="46" ry="44" ${outline('#D9A066', '#B07A3E')}/>`
    + '<ellipse cx="120" cy="100" rx="15" ry="13" fill="#B07A3E"/><ellipse cx="100" cy="136" rx="25" ry="18" fill="#FFF3E0"/>' + eyes(82, 118, 104)
    + `<ellipse cx="100" cy="124" rx="9" ry="7" fill="${EYE}"/><path d="M93 142 h14 v8 q-7 9 -14 0 z" fill="#FF6B9A"/>`
    + `<path d="M100 131 v7 M100 138 q-8 8 -14 2 M100 138 q8 8 14 2" stroke="${EYE}" stroke-width="3" fill="none" stroke-linecap="round"/>`
    + '<ellipse cx="80" cy="218" rx="16" ry="8" fill="#FFF3E0"/><ellipse cx="120" cy="218" rx="16" ry="8" fill="#FFF3E0"/>'),

  duck: art('<path d="M34 170 L14 142 L54 158 Z" fill="#FFD43B" stroke="#E7B500" stroke-width="4" stroke-linejoin="round"/>'
    + '<path d="M80 210 l-8 10 h18 Z M112 210 l-8 10 h18 Z" fill="#FF922B"/>'
    + `<ellipse cx="96" cy="178" rx="66" ry="36" ${outline('#FFD43B', '#E7B500')}/>`
    + '<path d="M62 172 Q96 148 130 172 Q100 198 62 172 Z" fill="#FFC21A"/>'
    + `<circle cx="140" cy="110" r="34" ${outline('#FFD43B', '#E7B500')}/>`
    + '<path d="M168 104 Q198 106 198 116 Q188 126 166 122 Z" fill="#FF922B" stroke="#E8740A" stroke-width="3" stroke-linejoin="round"/>'
    + eyes(150, 150, 102) + cheeks(158, 158, 122, 6), { rx: 72 }),

  drum: art(`<path d="M34 112 V188 Q100 222 166 188 V112 Z" ${outline('#FF6B6B', '#E84C4C')}/>`
    + '<path d="M34 124 L56 188 L78 130 L100 198 L122 130 L144 188 L166 124" stroke="#FFD43B" stroke-width="5" fill="none" stroke-linejoin="round"/>'
    + '<path d="M34 186 Q100 222 166 186" stroke="#4D96FF" stroke-width="10" fill="none"/>'
    + '<ellipse cx="100" cy="112" rx="66" ry="20" fill="#FFF6E5" stroke="#4D96FF" stroke-width="8"/>'
    + '<g stroke="#C0853F" stroke-width="8" stroke-linecap="round"><path d="M40 44 L94 106"/><path d="M160 44 L106 106"/></g>'
    + '<circle cx="40" cy="44" r="10" fill="#FFD9A8"/><circle cx="160" cy="44" r="10" fill="#FFD9A8"/>', { rx: 70 }),

  envelope: art(`<rect x="22" y="96" width="156" height="110" rx="10" ${outline('#FFFFFF', '#B8C6DB')}/>`
    + '<path d="M26 202 L84 152 M174 202 L116 152" stroke="#D5DEEA" stroke-width="4" fill="none"/>'
    + `<path d="M24 100 L100 160 L176 100" ${outline('#EAF1FB', '#B8C6DB')}/><circle cx="100" cy="158" r="13" fill="#FFB703"/>`
    + '<rect x="140" y="108" width="26" height="30" rx="3" fill="#4D96FF" stroke="#fff" stroke-width="2" stroke-dasharray="3 3"/>', { rx: 80 }),

  fish: art(`<path d="M52 150 L12 110 Q6 150 12 190 Z" ${outline('#FF8A3D', '#E86A1A')}/><path d="M84 112 Q112 76 140 110 Z" fill="#FFB067"/>`
    + '<path d="M96 192 Q110 214 126 192 Z" fill="#FFB067"/>'
    + `<ellipse cx="108" cy="152" rx="72" ry="46" ${outline('#FF8A3D', '#E86A1A')}/>`
    + '<path d="M80 130 q12 12 0 24 M98 126 q12 12 0 24 M80 156 q12 12 0 24 M98 152 q12 12 0 24 M116 140 q12 12 0 24" stroke="#E86A1A" stroke-width="3" fill="none" stroke-linecap="round"/>'
    + `<circle cx="148" cy="140" r="12" fill="#fff"/><circle cx="151" cy="140" r="6" fill="${EYE}"/>` + smile(166, 160, 8) + shine(118, 120, 14, 6, -10), { rx: 84 }),

  goat: art([50, 70, 118, 138].map((x) => `<rect x="${x}" y="174" width="14" height="44" rx="6" fill="#E6E0D4"/><rect x="${x}" y="210" width="14" height="9" rx="3" fill="#5B3A12"/>`).join('')
    + `<path d="M34 142 L20 118 L44 132 Z" ${outline('#F4F1EA', '#BDB5A6', 3)}/>`
    + `<ellipse cx="94" cy="160" rx="64" ry="34" ${outline('#F4F1EA', '#BDB5A6')}/>`
    + `<path d="M128 152 L142 104 L170 106 L160 160 Z" ${outline('#F4F1EA', '#BDB5A6')}/>`
    + '<path d="M150 84 Q138 52 114 54" stroke="#C0853F" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M162 80 Q156 46 132 44" stroke="#C0853F" stroke-width="9" fill="none" stroke-linecap="round"/>'
    + '<ellipse cx="138" cy="98" rx="20" ry="8" fill="#E6E0D4" stroke="#BDB5A6" stroke-width="3" transform="rotate(24 138 98)"/>'
    + `<ellipse cx="164" cy="106" rx="22" ry="29" ${outline('#F4F1EA', '#BDB5A6')} transform="rotate(-20 164 106)"/>`
    + `<path d="M166 130 L174 160 L182 128 Z" ${outline('#E6E0D4', '#BDB5A6', 3)}/>`
    + `<circle cx="166" cy="98" r="5" fill="${EYE}"/><circle cx="167.6" cy="96.4" r="1.6" fill="#fff"/><circle cx="178" cy="122" r="3" fill="${EYE}"/>`, { rx: 76 }),

  gift: art(`<rect x="44" y="124" width="112" height="90" rx="6" ${outline('#9775FA', '#7B5CE0')}/>`
    + '<g fill="#fff" opacity=".5"><circle cx="64" cy="150" r="5"/><circle cx="136" cy="150" r="5"/><circle cx="64" cy="190" r="5"/><circle cx="136" cy="190" r="5"/></g>'
    + `<rect x="34" y="96" width="132" height="32" rx="6" ${outline('#B197FC', '#8C6CF0')}/>`
    + '<rect x="90" y="96" width="20" height="118" fill="#FFD43B"/>'
    + `<path d="M100 94 Q64 52 58 82 Q58 104 100 94 Z M100 94 Q136 52 142 82 Q142 104 100 94 Z" ${outline('#FFD43B', '#E7B500', 3)}/><circle cx="100" cy="93" r="10" fill="#FFC21A"/>`),

  grapes: art(stem('M100 66 Q104 46 116 36') + '<path d="M104 64 Q130 34 158 52 Q140 82 104 64 Z" fill="#35D07F"/>' + grapeBalls, { rx: 60 }),

  horse: art(horseShape({ body: '#B5733A', edge: '#8B5A2B', mane: '#5B3A12', legs: '#A0612B', hoof: '#3B2416' }), { rx: 80 }),

  igloo: art('<ellipse cx="100" cy="214" rx="96" ry="14" fill="#F1F7FF"/>'
    + `<path d="M18 212 A82 82 0 0 1 182 212 Z" ${outline('#FFFFFF', '#A9CBEA')}/>`
    + '<path d="M23 186 H177 M37 160 H163 M61 140 H139" stroke="#A9CBEA" stroke-width="3"/>'
    + '<path d="M50 186 V212 M150 186 V212 M76 160 V186 M124 160 V186 M60 140 V160 M100 140 V160 M140 140 V160 M84 131 V140 M116 131 V140" stroke="#A9CBEA" stroke-width="3"/>'
    + `<path d="M62 212 V184 A38 38 0 0 1 138 184 V212 Z" ${outline('#FFFFFF', '#A9CBEA')}/><path d="M76 212 V186 A24 24 0 0 1 124 186 V212 Z" fill="#4A6FA5"/>`, { rx: 90 }),

  jug: art('<path d="M138 102 Q184 106 176 148 Q170 178 140 182" stroke="#C96E3A" stroke-width="12" fill="none" stroke-linecap="round"/>'
    + `<path d="M70 66 L44 54 L72 88 Z" ${outline('#E8915B', '#C96E3A')}/>`
    + `<path d="M70 64 H130 L128 92 Q170 140 150 196 Q144 212 126 212 H74 Q56 212 50 196 Q30 140 72 92 Z" ${outline('#E8915B', '#C96E3A')}/>`
    + '<rect x="66" y="58" width="68" height="12" rx="6" fill="#C96E3A"/>'
    + '<path d="M50 150 Q100 168 150 150" stroke="#FFF3E0" stroke-width="8" fill="none"/><g fill="#FFF3E0"><circle cx="70" cy="178" r="5"/><circle cx="100" cy="182" r="5"/><circle cx="130" cy="178" r="5"/></g>'
    + '<rect x="62" y="104" width="10" height="40" rx="5" fill="#fff" opacity=".35"/>'),

  jellyfish: art(jellyArms
    + `<path d="M30 130 Q30 46 100 46 Q170 46 170 130 q-14 12 -28 0 q-14 12 -28 0 q-14 12 -28 0 q-14 12 -28 0 q-14 12 -28 0 Z" ${outline('#FFB3E6', '#F06CC0')}/>`
    + shine(68, 74, 14, 8, -30) + face(100, 96), { rx: 60, origin: '100px 130px' }),

  juice: art('<path d="M120 72 L120 40 L148 26" stroke="#4D96FF" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
    + `<rect x="52" y="76" width="96" height="138" rx="10" ${outline('#FF9F1C', '#E8850A')}/>`
    + `<path d="M52 86 L64 66 H136 L148 86 Z" ${outline('#FFB84D', '#E8850A')}/>`
    + '<circle cx="100" cy="146" r="32" fill="#FFF3E0"/><circle cx="100" cy="146" r="24" fill="#FF9F1C"/>'
    + '<g stroke="#FFF3E0" stroke-width="3"><path d="M100 122 V170 M76 146 H124 M83 129 L117 163 M117 129 L83 163"/></g><circle cx="100" cy="146" r="6" fill="#FFF3E0"/>'
    + '<rect x="60" y="94" width="10" height="110" rx="5" fill="#fff" opacity=".3"/>', { rx: 56 }),

  kite: art('<path d="M100 176 Q78 196 100 212 Q120 228 102 236" stroke="#5B3A12" stroke-width="3" fill="none"/>'
    + '<path d="M86 192 l-12 -8 v16 Z M86 192 l12 -8 v16 Z" fill="#FF8FAB"/><path d="M108 218 l-12 -8 v16 Z M108 218 l12 -8 v16 Z" fill="#4D96FF"/>'
    + '<path d="M100 24 L46 82 L100 82 Z" fill="#FF6B6B"/><path d="M100 24 L154 82 L100 82 Z" fill="#FFD43B"/>'
    + '<path d="M46 82 L100 176 L100 82 Z" fill="#4D96FF"/><path d="M154 82 L100 176 L100 82 Z" fill="#35D07F"/>'
    + '<path d="M100 24 L154 82 L100 176 L46 82 Z M100 24 V176 M46 82 H154" fill="none" stroke="#2A2370" stroke-width="4" stroke-linejoin="round"/>', { rx: 40, origin: '100px 176px' }),

  key: art('<rect x="90" y="128" width="96" height="24" rx="6" fill="#FFD43B" stroke="#E7B500" stroke-width="4"/>'
    + '<path d="M150 150 V184 H166 V150 Z M172 150 V172 H186 V150 Z" fill="#FFD43B" stroke="#E7B500" stroke-width="4" stroke-linejoin="round"/>'
    + '<path d="M18 140 a40 40 0 1 0 80 0 a40 40 0 1 0 -80 0 Z M42 140 a16 16 0 1 0 32 0 a16 16 0 1 0 -32 0 Z" fill="#FFD43B" fill-rule="evenodd" stroke="#E7B500" stroke-width="4"/>'
    + shine(40, 118, 10, 6, -40), { rx: 84 }),

  kettle: art('<path d="M62 100 Q100 34 138 100" stroke="#3B3B4F" stroke-width="12" fill="none" stroke-linecap="round"/>'
    + `<path d="M148 150 L188 110 L196 118 L160 174 Z" ${outline('#2EC4B6', '#1E9E92')}/>`
    + `<path d="M44 210 Q30 120 100 104 Q170 120 156 210 Z" ${outline('#2EC4B6', '#1E9E92')}/>`
    + '<ellipse cx="100" cy="106" rx="42" ry="10" fill="#1E9E92"/><circle cx="100" cy="94" r="9" fill="#3B3B4F"/>'
    + '<rect x="40" y="196" width="120" height="14" rx="7" fill="#1E9E92"/>' + shine(68, 148, 10, 24, 15)),

  lion: art(`<ellipse cx="100" cy="196" rx="52" ry="26" ${outline('#FFC75F', '#E0A33E')}/>`
    + `<circle cx="100" cy="112" r="60" fill="#D9822B"/>${maneTufts}`
    + `<circle cx="66" cy="76" r="13" ${outline('#FFC75F', '#E0A33E', 3)}/><circle cx="134" cy="76" r="13" ${outline('#FFC75F', '#E0A33E', 3)}/>`
    + `<circle cx="100" cy="116" r="44" ${outline('#FFC75F', '#E0A33E')}/>` + eyes(84, 116, 106)
    + '<ellipse cx="100" cy="134" rx="21" ry="13" fill="#FFF3E0"/><path d="M92 124 h16 l-8 9 z" fill="#5B3A12"/>'
    + `<path d="M100 133 q-6 8 -12 4 M100 133 q6 8 12 4" stroke="${EYE}" stroke-width="3" fill="none" stroke-linecap="round"/>` + cheeks(72, 128, 128)
    + '<ellipse cx="78" cy="218" rx="15" ry="8" fill="#FFC75F"/><ellipse cx="122" cy="218" rx="15" ry="8" fill="#FFC75F"/>', { rx: 70 }),

  mango: art(`<path d="M56 98 C90 50 178 82 168 150 C160 214 84 226 50 186 C28 156 36 118 56 98 Z" ${outline('#FFCC33', '#E8A800')}/>`
    + '<path d="M56 98 C76 72 116 70 134 90 C104 88 80 102 64 134 C56 122 52 110 56 98 Z" fill="#8BCB4E" opacity=".85"/>'
    + '<ellipse cx="132" cy="172" rx="30" ry="26" fill="#FF6B3D" opacity=".45"/>' + shine(66, 150, 8, 16, 20)
    + stem('M76 92 Q72 72 82 60') + '<path d="M80 64 Q116 34 148 54 Q118 82 80 64 Z" fill="#35D07F"/>' + face(108, 146)),

  milk: art('<rect x="76" y="40" width="48" height="22" rx="6" fill="#4D96FF"/>'
    + `<path d="M80 60 H120 V86 Q152 102 152 134 V200 Q152 214 138 214 H62 Q48 214 48 200 V134 Q48 102 80 86 Z" ${outline('#FFFFFF', '#B8C6DB')}/>`
    + '<rect x="50" y="138" width="100" height="44" fill="#BDE0FF"/><path d="M100 144 Q113 160 100 174 Q87 160 100 144 Z" fill="#4D96FF"/>'
    + '<rect x="58" y="110" width="10" height="24" rx="5" fill="#E3EAF3"/>', { rx: 60 }),

  moon: art(`<rect x="58" y="196" width="84" height="22" rx="10" ${outline('#9775FA', '#7B5CE0', 3)}/>`
    + `<path d="M161.3 69.7 A80 80 0 1 0 108.5 195.1 A68 68 0 1 1 161.3 69.7 Z" ${outline('#FFE066', '#F2C300')}/>`
    + `<path d="M48 104 q8 8 16 0" stroke="${EYE}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`
    + smile(62, 136, 9) + cheeks(42, 84, 124, 6), { rx: 56 }),

  nest: art('<ellipse cx="72" cy="136" rx="18" ry="24" fill="#BDE0FF" stroke="#8DB6F0" stroke-width="3"/><ellipse cx="100" cy="128" rx="18" ry="24" fill="#D0EBFF" stroke="#8DB6F0" stroke-width="3"/><ellipse cx="128" cy="136" rx="18" ry="24" fill="#BDE0FF" stroke="#8DB6F0" stroke-width="3"/>'
    + `<path d="M18 140 Q22 216 100 216 Q178 216 182 140 Q100 170 18 140 Z" ${outline('#A0612B', '#7A4A1F')}/>`
    + '<g stroke="#7A4A1F" stroke-width="4" stroke-linecap="round"><path d="M30 158 L82 172 M58 180 L140 162 M118 186 L172 160 M40 194 L110 200 M100 204 L160 188 M10 144 L40 136 M160 136 L190 146"/></g>'
    + '<path d="M18 140 Q100 170 182 140" stroke="#C0853F" stroke-width="10" fill="none" stroke-linecap="round"/>', { rx: 86 }),

  nut: art(`<path d="M100 54 C150 68 172 140 156 180 C146 208 54 208 44 180 C28 140 50 68 100 54 Z" ${outline('#B5733A', '#8B5A2B')}/>`
    + `<path d="M44 176 C56 214 144 214 156 176 C130 192 70 192 44 176 Z" ${outline('#E8C9A0', '#C49A6C', 3)}/>`
    + '<path d="M100 56 L95 38 L108 44 Z" fill="#8B5A2B"/>' + shine(72, 110, 9, 22, 15) + face(104, 132)),

  net: art('<path d="M22 216 L104 112" stroke="#C0853F" stroke-width="10" stroke-linecap="round"/>'
    + '<path d="M102 98 Q86 196 150 214 Q194 168 178 64 Z" fill="#E3F2FF" opacity=".85" stroke="#8DB6F0" stroke-width="3" stroke-linejoin="round"/>'
    + '<g stroke="#8DB6F0" stroke-width="2.5" fill="none"><path d="M106 124 L176 96 M108 150 L178 124 M114 176 L178 152 M126 198 L170 182"/><path d="M122 92 Q114 160 138 208 M146 80 Q144 150 160 206 M166 72 Q170 130 176 170"/></g>'
    + '<ellipse cx="140" cy="80" rx="44" ry="22" fill="none" stroke="#FF6B6B" stroke-width="8" transform="rotate(-25 140 80)"/>', { rx: 80 }),

  octopus: art(octoArms + `<ellipse cx="100" cy="106" rx="66" ry="62" ${outline('#B983FF', '#9A5CF0')}/>`
    + '<g fill="#D6B8FF"><circle cx="64" cy="76" r="8"/><circle cx="140" cy="70" r="6"/><circle cx="148" cy="96" r="5"/></g>' + face(100, 116), { rx: 84 }),

  orange: art(`<circle cx="100" cy="148" r="68" ${outline('#FF9F1C', '#E8850A')}/>`
    + '<g fill="#E8850A" opacity=".45"><circle cx="60" cy="122" r="2.5"/><circle cx="140" cy="118" r="2.5"/><circle cx="136" cy="190" r="2.5"/><circle cx="66" cy="186" r="2.5"/><circle cx="100" cy="100" r="2.5"/><circle cx="150" cy="156" r="2.5"/></g>'
    + shine(66, 118, 12, 20, 30) + '<rect x="96" y="72" width="8" height="14" rx="3" fill="#5B3A12"/>' + leaf(122, 74, -20) + face(100, 150)),

  olive: art('<path d="M16 84 Q100 54 186 92" stroke="#7A5C3A" stroke-width="6" fill="none" stroke-linecap="round"/>'
    + '<g fill="#9DBF7A"><ellipse cx="40" cy="64" rx="22" ry="7" transform="rotate(-30 40 64)"/><ellipse cx="96" cy="50" rx="22" ry="7" transform="rotate(10 96 50)"/><ellipse cx="164" cy="66" rx="22" ry="7" transform="rotate(30 164 66)"/><ellipse cx="128" cy="98" rx="20" ry="7" transform="rotate(50 128 98)"/></g>'
    + '<path d="M62 76 V110 M106 70 V122 M150 84 V106" stroke="#7A5C3A" stroke-width="4"/>'
    + [[62, 146], [106, 162], [150, 138]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="24" ry="34" ${outline('#7FA632', '#5C7C1E')}/><circle cx="${x}" cy="${y - 20}" r="8" fill="#FF6B3D"/>${shine(x - 8, y + 4, 4, 10, 10)}`).join(''), { rx: 74 }),

  pencil: art('<g transform="rotate(-40 100 130)">'
    + '<rect x="0" y="110" width="20" height="40" rx="7" fill="#FF8FAB"/><rect x="16" y="108" width="16" height="44" fill="#C9CED6"/>'
    + `<rect x="30" y="110" width="118" height="40" ${outline('#FFD43B', '#E7B500')}/><path d="M30 123 H148 M30 137 H148" stroke="#E7B500" stroke-width="2"/>`
    + `<path d="M148 110 L188 130 L148 150 Z" ${outline('#FFD9A8', '#E8B77A', 3)}/><path d="M174 123 L188 130 L174 137 Z" fill="#3B3B4F"/></g>`, { rx: 70 }),

  pear: art(`<path d="M100 60 C124 60 128 96 136 116 C170 140 172 200 132 212 C116 218 84 218 68 212 C28 200 30 140 64 116 C72 96 76 60 100 60 Z" ${outline('#B5E550', '#8CC23A')}/>`
    + shine(70, 150, 9, 22, 15) + stem('M100 62 Q98 44 108 34') + leaf(128, 44, -20) + face(100, 160)),

  parrot: art('<path d="M20 196 H180" stroke="#8B5A2B" stroke-width="10" stroke-linecap="round"/>'
    + '<path d="M72 168 L42 228 L64 228 L88 176 Z" fill="#24A862"/>'
    + `<ellipse cx="96" cy="140" rx="40" ry="56" ${outline('#35D07F', '#24A862')}/>`
    + '<path d="M70 118 Q58 170 92 190 Q102 150 86 116 Z" fill="#24A862"/><path d="M72 150 Q74 172 90 186" stroke="#FFD43B" stroke-width="6" fill="none" stroke-linecap="round"/>'
    + '<path d="M84 190 v12 M106 190 v12" stroke="#FF922B" stroke-width="6" stroke-linecap="round"/>'
    + `<circle cx="110" cy="84" r="34" ${outline('#35D07F', '#24A862')}/>`
    + '<path d="M136 76 Q168 78 160 110 Q152 100 136 100 Z" fill="#FF6B3D" stroke="#E84C1A" stroke-width="3" stroke-linejoin="round"/>'
    + `<circle cx="120" cy="78" r="9" fill="#fff"/><circle cx="122" cy="78" r="5" fill="${EYE}"/>`, { rx: 70 }),

  queen: art(`<path d="M100 108 L44 214 H156 Z" ${outline('#9775FA', '#7B5CE0')}/><path d="M50 204 H150" stroke="#FFD43B" stroke-width="8" stroke-linecap="round"/>`
    + '<path d="M84 120 L100 136 L116 120" stroke="#FFD43B" stroke-width="5" fill="none" stroke-linecap="round"/>'
    + '<path d="M150 118 L162 196" stroke="#E7B500" stroke-width="6" stroke-linecap="round"/><circle cx="149" cy="112" r="10" fill="#FFD43B"/>'
    + '<path d="M70 88 Q62 124 76 132 L82 96 Z M130 88 Q138 124 124 132 L118 96 Z" fill="#5B3A12"/>'
    + `<circle cx="100" cy="90" r="30" ${outline('#F2C6A0', '#D9A57A', 3)}/>`
    + '<path d="M70 94 Q66 58 100 58 Q134 58 130 94 Q124 72 100 72 Q76 72 70 94 Z" fill="#5B3A12"/>'
    + `<path d="M70 62 L72 26 L88 46 L100 16 L112 46 L128 26 L130 62 Z" ${outline('#FFD43B', '#E7B500', 3)}/>`
    + '<circle cx="100" cy="50" r="6" fill="#FF6B6B"/><circle cx="80" cy="54" r="4" fill="#4D96FF"/><circle cx="120" cy="54" r="4" fill="#4D96FF"/>'
    + eyes(90, 110, 92, 4) + smile(100, 102, 7) + cheeks(82, 118, 102, 5)),

  // Slice 5J part 2: a cricket umpire, a doll drawn like the queen: a long white
  // coat, dark trousers, a white sun hat, and one finger raised high.
  umpire: art(`<path d="M86 196 h12 v20 h-12 Z M102 196 h12 v20 h-12 Z" fill="#2E3A59"/>`
    + `<path d="M100 110 L56 200 H144 Z" ${outline('#FFFFFF', '#AEB8C8')}/>`
    + '<path d="M100 112 V196" stroke="#AEB8C8" stroke-width="3"/><circle cx="100" cy="148" r="3.5" fill="#AEB8C8"/><circle cx="100" cy="170" r="3.5" fill="#AEB8C8"/>'
    + '<path d="M88 116 L100 130 L112 116" stroke="#2E3A59" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
    + '<path d="M118 126 L144 176" stroke="#FFFFFF" stroke-width="13" stroke-linecap="round"/><path d="M118 126 L144 176" stroke="#AEB8C8" stroke-width="2" stroke-linecap="round" opacity=".6"/>'
    + `<circle cx="146" cy="180" r="8" ${outline('#F2C6A0', '#D9A57A', 2.5)}/>`
    + '<path d="M82 126 L52 74" stroke="#AEB8C8" stroke-width="17" stroke-linecap="round"/><path d="M82 126 L52 74" stroke="#FFFFFF" stroke-width="12" stroke-linecap="round"/>'
    // The raised hand: a fist with one finger pointing straight up, bold enough to read small.
    + `<rect x="44" y="20" width="13" height="40" rx="6.5" ${outline('#F2C6A0', '#C98E62', 3)}/>`
    + `<circle cx="50" cy="66" r="12" ${outline('#F2C6A0', '#C98E62', 3)}/>`
    + `<circle cx="100" cy="90" r="30" ${outline('#F2C6A0', '#D9A57A', 3)}/>`
    + '<path d="M72 86 Q74 74 84 72 L80 92 Z M128 86 Q126 74 116 72 L120 92 Z" fill="#5B3A12"/>'
    + `<ellipse cx="100" cy="68" rx="44" ry="9" ${outline('#FFFFFF', '#AEB8C8', 3)}/>`
    + `<path d="M74 66 Q74 38 100 38 Q126 38 126 66 Z" ${outline('#FFFFFF', '#AEB8C8', 3)}/><path d="M75 60 H125" stroke="#4D96FF" stroke-width="5"/>`
    + eyes(90, 110, 92, 4) + smile(100, 102, 7) + cheeks(82, 118, 102, 5)),

  quilt: art(`<rect x="26" y="88" width="150" height="128" rx="10" ${outline('#FFFFFF', '#E0B0C8')}/>${quiltPatches}`
    + '<path d="M26 98 Q26 88 36 88 H166 Q176 88 176 98 V108 H26 Z" fill="#E86F95"/><path d="M26 108 H176" stroke="#C9507A" stroke-width="3"/>', { rx: 86 }),

  rabbit: art(`<ellipse cx="78" cy="62" rx="16" ry="44" ${outline('#F4F1EA', '#C9C2B4')} transform="rotate(-10 78 62)"/><ellipse cx="78" cy="64" rx="7" ry="32" fill="#FFB3C7" transform="rotate(-10 78 64)"/>`
    + `<ellipse cx="122" cy="62" rx="16" ry="44" ${outline('#F4F1EA', '#C9C2B4')} transform="rotate(10 122 62)"/><ellipse cx="122" cy="64" rx="7" ry="32" fill="#FFB3C7" transform="rotate(10 122 64)"/>`
    + `<ellipse cx="100" cy="180" rx="48" ry="40" ${outline('#F4F1EA', '#C9C2B4')}/>`
    + `<circle cx="100" cy="120" r="38" ${outline('#F4F1EA', '#C9C2B4')}/>` + eyes(86, 114, 112)
    + `<path d="M95 124 h10 l-5 6 z" fill="#FF6B9A"/><rect x="95" y="132" width="10" height="9" rx="2" fill="#fff" stroke="#C9C2B4" stroke-width="1.5"/>`
    + `<g stroke="${EYE}" stroke-width="2.5" stroke-linecap="round"><path d="M80 128 H58 M80 134 L60 140 M120 128 H142 M120 134 L140 140"/></g>` + cheeks(76, 124, 130, 6)
    + '<ellipse cx="78" cy="218" rx="18" ry="8" fill="#E6E0D4"/><ellipse cx="122" cy="218" rx="18" ry="8" fill="#E6E0D4"/>'),

  ring: art('<ellipse cx="100" cy="166" rx="58" ry="48" fill="none" stroke="#E7B500" stroke-width="22"/><ellipse cx="100" cy="166" rx="58" ry="48" fill="none" stroke="#FFD43B" stroke-width="14"/>'
    + '<path d="M80 124 H120 L112 108 H88 Z" fill="#E7B500"/>'
    + `<path d="M72 84 L88 60 H112 L128 84 L100 116 Z" ${outline('#74C0FC', '#4D96FF', 3)}/><path d="M72 84 H128 M88 60 L100 84 L112 60 M100 84 V116" stroke="#4D96FF" stroke-width="2" fill="none"/>`
    + '<path d="M150 50 v20 M140 60 h20 M46 70 v14 M39 77 h14" stroke="#FFD43B" stroke-width="4" stroke-linecap="round"/>', { rx: 66 }),

  rainbow: art(rainbowBands + cloud(10, 196) + cloud(150, 196), { rx: 96 }),

  sun: art(sunRays + `<circle cx="100" cy="124" r="52" ${outline('#FFD43B', '#F2B800')}/>` + face(100, 122), { rx: 60, origin: '100px 124px' }),

  sock: art(`<path d="M70 40 H126 V140 L162 172 Q174 206 142 212 Q120 214 100 200 L70 178 Z" ${outline('#FF8FD6', '#E86FBD')}/>`
    + '<rect x="66" y="34" width="64" height="26" rx="6" fill="#fff" stroke="#E86FBD" stroke-width="3"/>'
    + '<rect x="70" y="78" width="56" height="14" fill="#fff" opacity=".75"/><rect x="70" y="106" width="56" height="14" fill="#fff" opacity=".75"/>'
    + '<path d="M144 172 Q170 178 162 202 Q152 212 138 210 Q154 192 144 172 Z" fill="#fff" opacity=".75"/>', { rx: 64 }),

  star: art(`<path d="M100 72 l20 42 46 6 -34 32 9 46 -41 -23 -41 23 9 -46 -34 -32 46 -6 z" ${outline('#FFD43B', '#E7B500')}/>`
    + shine(84, 112, 6, 12, 30) + face(100, 146, 13, 5), { rx: 56 }),

  umbrella: art('<path d="M100 104 V196 Q100 214 84 214 Q70 214 70 200" stroke="#5B3A12" stroke-width="8" fill="none" stroke-linecap="round"/>'
    + `<path d="M20 110 Q24 36 100 32 Q176 36 180 110 Q160 96 140 110 Q120 96 100 110 Q80 96 60 110 Q40 96 20 110 Z" ${outline('#FF6B6B', '#E84C4C')}/>`
    + '<path d="M100 34 Q64 52 60 108 Q80 96 100 108 Q94 62 100 34 Z M100 34 Q140 52 140 108 Q160 96 178 106 Q170 50 100 34 Z" fill="#FFD43B"/>'
    + '<circle cx="100" cy="28" r="6" fill="#5B3A12"/>', { rx: 70 }),

  van: art(`<path d="M20 92 Q20 78 34 78 H128 Q140 78 146 88 L178 138 V180 Q178 190 168 190 H30 Q20 190 20 180 Z" ${outline('#4DD4C6', '#22A99B')}/>`
    + '<path d="M134 92 L164 138 H134 Z" fill="#BDE6FF"/><rect x="34" y="92" width="88" height="44" rx="8" fill="#BDE6FF"/>'
    + '<path d="M128 92 V184" stroke="#22A99B" stroke-width="3"/><rect x="112" y="148" width="12" height="5" rx="2" fill="#22A99B"/>'
    + '<circle cx="174" cy="160" r="6" fill="#FFF3B0"/>' + wheel(56, 192) + wheel(146, 192), { rx: 82 }),

  vase: art('<path d="M100 98 L70 46 M100 98 V34 M100 98 L132 48" stroke="#35A853" stroke-width="5" fill="none" stroke-linecap="round"/>'
    + [[70, 44, '#FF8FD6'], [100, 30, '#FFD43B'], [132, 46, '#FF8FAB']].map(([x, y, c]) => `<g fill="${c}"><circle cx="${x}" cy="${y - 11}" r="9"/><circle cx="${x + 11}" cy="${y}" r="9"/><circle cx="${x}" cy="${y + 11}" r="9"/><circle cx="${x - 11}" cy="${y}" r="9"/></g><circle cx="${x}" cy="${y}" r="7" fill="#FFB703"/>`).join('')
    + `<path d="M70 96 H130 Q126 116 140 140 Q160 176 136 212 H64 Q40 176 60 140 Q74 116 70 96 Z" ${outline('#4D96FF', '#3A7BE0')}/>`
    + '<path d="M54 160 q12 -10 24 0 t24 0 t24 0 t24 0" stroke="#fff" stroke-width="5" fill="none" opacity=".8"/><rect x="66" y="92" width="68" height="10" rx="5" fill="#3A7BE0"/>', { rx: 50 }),

  violin: art('<path d="M28 214 L176 34" stroke="#8B5A2B" stroke-width="5" stroke-linecap="round"/><path d="M34 220 L182 40" stroke="#F4F1EA" stroke-width="3" stroke-linecap="round"/>'
    + '<g transform="rotate(18 100 130)">'
    + `<ellipse cx="100" cy="172" rx="46" ry="40" ${outline('#C0702B', '#8B4A16')}/><ellipse cx="100" cy="108" rx="38" ry="34" ${outline('#C0702B', '#8B4A16')}/>`
    + '<rect x="70" y="128" width="60" height="22" fill="#C0702B"/>'
    + '<path d="M76 140 q-8 -4 0 -8 M124 140 q8 -4 0 -8" stroke="#8B4A16" stroke-width="5" fill="none" stroke-linecap="round"/>'
    + '<path d="M84 132 q-6 12 4 22 M116 132 q6 12 -4 22" stroke="#3B2416" stroke-width="3" fill="none"/>'
    + '<rect x="94" y="22" width="12" height="96" rx="4" fill="#3B2416"/><circle cx="100" cy="20" r="10" fill="#3B2416"/>'
    + '<rect x="86" y="196" width="28" height="14" rx="5" fill="#3B2416"/><rect x="88" y="150" width="24" height="5" fill="#F4E3C3"/>'
    + '<path d="M96 30 V198 M99 30 V198 M102 30 V198 M105 30 V198" stroke="#F4E3C3" stroke-width="1.2"/></g>', { rx: 64 }),

  watch: art('<rect x="76" y="28" width="48" height="74" rx="10" fill="#4D96FF"/><rect x="76" y="158" width="48" height="66" rx="10" fill="#4D96FF"/>'
    + '<g fill="#BDE0FF"><circle cx="100" cy="186" r="4"/><circle cx="100" cy="204" r="4"/></g><rect x="148" y="122" width="12" height="16" rx="3" fill="#E7B500"/>'
    + `<circle cx="100" cy="130" r="52" ${outline('#FFD43B', '#E7B500')}/><circle cx="100" cy="130" r="40" fill="#fff"/>`
    + '<g fill="#3B3B4F"><rect x="98" y="94" width="4" height="10"/><rect x="98" y="156" width="4" height="10"/><rect x="64" y="128" width="10" height="4"/><rect x="126" y="128" width="10" height="4"/></g>'
    + '<path d="M100 130 V104 M100 130 L120 140" stroke="#3B3B4F" stroke-width="5" stroke-linecap="round"/><circle cx="100" cy="130" r="5" fill="#FF6B6B"/>', { rx: 50 }),

  whale: art('<path d="M112 72 Q100 42 84 48 M112 72 Q114 38 130 36 M112 72 Q126 48 142 54" stroke="#74C0FC" stroke-width="7" fill="none" stroke-linecap="round"/>'
    + `<path d="M52 176 L8 198 L18 168 L4 138 L48 158 Z" ${outline('#4D96FF', '#3A7BE0')}/>`
    + `<path d="M40 160 Q40 90 112 90 Q186 90 186 152 Q186 206 112 206 Q62 206 44 184 Z" ${outline('#4D96FF', '#3A7BE0')}/>`
    + '<path d="M58 180 Q112 214 182 168 Q176 204 112 206 Q74 206 58 180 Z" fill="#BDE0FF"/>'
    + '<path d="M100 170 Q110 196 128 186 Q120 174 100 170 Z" fill="#3A7BE0"/>'
    + eyes(150, 150, 140) + smile(164, 158, 10) + cheeks(156, 156, 160, 6) + shine(90, 110, 18, 8, -15), { rx: 90 }),

  worm: art('<path d="M14 216 Q100 168 186 216 Z" fill="#8B5A2B"/><g fill="#6B4420"><circle cx="60" cy="204" r="4"/><circle cx="140" cy="206" r="4"/><circle cx="100" cy="196" r="3"/></g>'
    + '<path d="M62 206 Q50 122 100 106 Q152 94 150 140" stroke="#FF8FAB" stroke-width="34" fill="none" stroke-linecap="round"/>'
    + '<path d="M62 206 Q50 122 100 106 Q152 94 150 130" stroke="#E86F95" stroke-width="34" fill="none" stroke-dasharray="3 15" opacity=".55"/>'
    + eyes(140, 160, 138, 5) + smile(150, 150, 7) + cheeks(130, 170, 150, 5), { rx: 86 }),

  yoyo: art('<path d="M100 26 V92" stroke="#5B3A12" stroke-width="3"/><circle cx="100" cy="20" r="8" fill="none" stroke="#5B3A12" stroke-width="3"/>'
    + `<circle cx="100" cy="150" r="60" ${outline('#FF6B6B', '#E84C4C')}/><circle cx="100" cy="150" r="40" fill="#FFD43B"/><circle cx="100" cy="150" r="13" fill="#E84C4C"/>`
    + '<path d="M70 132 Q100 112 130 132" stroke="#fff" stroke-width="5" fill="none" opacity=".7" stroke-linecap="round"/>', { rx: 54, origin: '100px 26px' }),

  yak: art([50, 70, 116, 136].map((x) => `<rect x="${x}" y="176" width="14" height="40" rx="6" fill="#3B2A1F"/><rect x="${x}" y="210" width="14" height="8" rx="3" fill="#C9C2B4"/>`).join('')
    + '<path d="M30 130 Q14 150 22 176 Q30 160 38 146 Z" fill="#4A372A"/>'
    + `<ellipse cx="94" cy="140" rx="68" ry="40" ${outline('#5B4636', '#3B2A1F')}/><ellipse cx="112" cy="104" rx="34" ry="20" fill="#5B4636"/>`
    + '<path d="M28 146 L36 196 L46 170 L56 202 L66 172 L76 204 L88 174 L98 204 L110 174 L120 204 L132 172 L142 200 L152 168 L162 148 Z" fill="#4A372A"/>'
    + `<ellipse cx="164" cy="140" rx="27" ry="25" ${outline('#5B4636', '#3B2A1F')}/><ellipse cx="176" cy="154" rx="14" ry="11" fill="#8C7462"/>`
    + '<path d="M150 122 Q128 98 142 78" stroke="#F4F1EA" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M178 122 Q198 98 184 78" stroke="#F4F1EA" stroke-width="9" fill="none" stroke-linecap="round"/>'
    + '<path d="M146 122 l6 -12 l6 10 l6 -12 l6 10 l6 -10 l4 12 Z" fill="#4A372A"/>'
    + `<circle cx="168" cy="136" r="7" fill="#fff"/><circle cx="169" cy="136" r="4" fill="${EYE}"/><circle cx="180" cy="154" r="2.5" fill="${EYE}"/>`, { rx: 82 }),

  yogurt: art('<path d="M124 96 L148 36" stroke="#B8C2CF" stroke-width="8" stroke-linecap="round"/><ellipse cx="151" cy="28" rx="11" ry="15" fill="#B8C2CF" transform="rotate(22 151 28)"/>'
    + `<path d="M44 92 H156 L142 210 Q140 216 132 216 H68 Q60 216 58 210 Z" ${outline('#FFFFFF', '#C9D6E8')}/>`
    + '<path d="M50 132 H150 L145 178 H55 Z" fill="#FF8FD6"/><path d="M62 156 q10 -10 20 0 t20 0 t20 0 t20 0" stroke="#fff" stroke-width="5" fill="none"/>'
    + `<ellipse cx="100" cy="92" rx="56" ry="13" ${outline('#FFF6E5', '#C9D6E8')}/><path d="M86 90 q14 -10 28 0" stroke="#F1DFC0" stroke-width="4" fill="none" stroke-linecap="round"/>`, { rx: 56 }),

  zebra: art(horseShape({ body: '#FFFFFF', edge: '#9AA0AC', mane: '#2B2B33', legs: '#FFFFFF', hoof: '#2B2B33', stripes: zebraStripes }), { rx: 80 }),

  zip: art('<path d="M10 24 H60 L96 128 V222 H10 Z" fill="#4D96FF" stroke="#3A7BE0" stroke-width="4" stroke-linejoin="round"/>'
    + '<path d="M190 24 H140 L104 128 V222 H190 Z" fill="#4D96FF" stroke="#3A7BE0" stroke-width="4" stroke-linejoin="round"/>'
    + Array.from({ length: 6 }, (_, i) => { const t = (i + 0.5) / 6; const x = 60 + 36 * t; const y = 24 + 104 * t; return `<rect x="${(x - 9).toFixed(1)}" y="${(y - 4).toFixed(1)}" width="16" height="9" rx="2" fill="#E7EBF0" stroke="#6F7B8A" stroke-width="1.5" transform="rotate(70 ${x.toFixed(1)} ${y.toFixed(1)})"/><rect x="${(200 - x - 5).toFixed(1)}" y="${(y - 4).toFixed(1)}" width="16" height="9" rx="2" fill="#E7EBF0" stroke="#6F7B8A" stroke-width="1.5" transform="rotate(-70 ${(200 - x).toFixed(1)} ${y.toFixed(1)})"/>`; }).join('')
    + Array.from({ length: 8 }, (_, i) => `<rect x="${i % 2 ? 98 : 88}" y="${140 + i * 10}" width="16" height="9" rx="2" fill="#E7EBF0" stroke="#6F7B8A" stroke-width="1.5"/>`).join('')
    + '<path d="M84 118 H116 L110 150 H90 Z" fill="#9AA6B5" stroke="#6F7B8A" stroke-width="3" stroke-linejoin="round"/>'
    + '<rect x="90" y="146" width="20" height="56" rx="10" fill="#C9CED6" stroke="#6F7B8A" stroke-width="3"/><circle cx="100" cy="188" r="6" fill="#4D96FF"/>', { rx: 90 }),
};

// ---------------------------------------------------------------------------
// The outdoor places, 1280 x 640, in the same flat style as the rooms.

const BD = (body) => `<svg ${NS} viewBox="0 0 1280 640" width="1280" height="640">${body}</svg>`;
const SKY = '<rect width="1280" height="640" fill="#BFE6FF"/><rect width="1280" height="170" fill="#A8DCFF"/>';
const CLOUDS = '<g fill="#fff"><ellipse cx="300" cy="90" rx="74" ry="26"/><ellipse cx="350" cy="76" rx="48" ry="26"/>'
  + '<ellipse cx="760" cy="70" rx="64" ry="22"/><ellipse cx="800" cy="58" rx="40" ry="22"/><ellipse cx="1100" cy="110" rx="58" ry="20"/></g>';
const bush = (x, y, c = '#5DB760') => `<g fill="${c}"><circle cx="${x}" cy="${y}" r="26"/><circle cx="${x + 26}" cy="${y - 10}" r="30"/><circle cx="${x + 54}" cy="${y}" r="24"/></g>`;
const tuft = (x, y) => `<path d="M${x} ${y} l6 -16 l4 16 l6 -12 l3 12" stroke="#5DB760" stroke-width="3" fill="none" stroke-linecap="round"/>`;
const flower = (x, y, c) => `<g fill="${c}"><circle cx="${x}" cy="${y - 6}" r="5"/><circle cx="${x + 6}" cy="${y}" r="5"/><circle cx="${x}" cy="${y + 6}" r="5"/><circle cx="${x - 6}" cy="${y}" r="5"/></g><circle cx="${x}" cy="${y}" r="3.5" fill="#FFD43B"/>`;

// Farm-garden: hills, a red barn far left, a wooden fence, grass, a pond, reeds, a leafy tree. No sun.
const GARDEN = BD(SKY + CLOUDS
  + '<ellipse cx="300" cy="360" rx="420" ry="110" fill="#A8D99A"/><ellipse cx="1000" cy="370" rx="480" ry="120" fill="#9BD38A"/>'
  + '<rect y="350" width="1280" height="290" fill="#7BC67E"/>'
  + '<g><rect x="30" y="200" width="200" height="160" fill="#E86F5A"/><polygon points="16,206 130,130 244,206" fill="#C9503E"/>'
  + '<rect x="96" y="270" width="68" height="90" fill="#FFF4E0"/><path d="M96 270 L164 360 M164 270 L96 360" stroke="#E86F5A" stroke-width="6"/></g>'
  + '<g fill="#E0B07A" stroke="#C08A50" stroke-width="3">'
  + Array.from({ length: 21 }, (_, i) => `<path d="M${250 + i * 50} 380 V306 l12 -14 l12 14 V380 Z"/>`).join('')
  + '<rect x="240" y="318" width="1040" height="14" rx="4"/><rect x="240" y="352" width="1040" height="14" rx="4"/></g>'
  + '<rect y="380" width="1280" height="260" fill="#7BC67E"/><rect y="380" width="1280" height="10" fill="#6CB86F"/>'
  + '<ellipse cx="735" cy="400" rx="112" ry="22" fill="#74C0FC"/><ellipse cx="735" cy="400" rx="112" ry="22" fill="none" stroke="#5AA9E6" stroke-width="4"/>'
  + '<path d="M690 398 q14 -6 28 0 M752 404 q14 -6 28 0" stroke="#fff" stroke-width="3" fill="none" opacity=".8" stroke-linecap="round"/>'
  + '<g stroke="#5B8F3A" stroke-width="4" stroke-linecap="round"><path d="M626 404 V364 M638 404 V356 M842 404 V360 M852 404 V368"/></g>'
  + '<g fill="#8B5A2B"><rect x="633" y="350" width="10" height="20" rx="5"/><rect x="837" y="352" width="10" height="20" rx="5"/></g>'
  + '<rect x="1186" y="180" width="26" height="210" rx="8" fill="#8B5A2B"/><g fill="#4CAF50"><circle cx="1198" cy="170" r="70"/><circle cx="1150" cy="210" r="48"/><circle cx="1250" cy="214" r="50"/></g>'
  + bush(260, 396) + bush(980, 392, '#66BB6A')
  + [[300, 560], [520, 470], [660, 600], [930, 560], [1060, 470], [1180, 600], [420, 610]].map(([x, y]) => tuft(x, y)).join('')
  + flower(560, 590, '#FF8FD6') + flower(860, 470, '#FFFFFF') + flower(1120, 560, '#FFB3C7') + flower(380, 470, '#FFFFFF'));

// Zoo: distant trees, three enclosures with green railings and rocks, a sandy path winding across. No sun, no animals.
const railing = (x0, x1) => `<g fill="#3E8E5A">${Array.from({ length: Math.floor((x1 - x0) / 22) + 1 }, (_, i) => `<rect x="${x0 + i * 22}" y="250" width="7" height="130" rx="3"/>`).join('')}</g>`
  + `<rect x="${x0 - 6}" y="250" width="${x1 - x0 + 18}" height="10" rx="5" fill="#2F7A49"/><rect x="${x0 - 6}" y="330" width="${x1 - x0 + 18}" height="8" rx="4" fill="#2F7A49"/>`;
const ZOO = BD(SKY + CLOUDS
  + '<g fill="#5DAA62"><circle cx="80" cy="250" r="70"/><circle cx="200" cy="230" r="80"/><circle cx="420" cy="245" r="74"/><circle cx="640" cy="225" r="82"/><circle cx="860" cy="245" r="76"/><circle cx="1080" cy="230" r="82"/><circle cx="1240" cy="250" r="70"/></g>'
  + '<rect y="250" width="1280" height="390" fill="#9FD88F"/>'
  + '<rect x="160" y="300" width="330" height="80" fill="#B8E2A4"/><rect x="520" y="300" width="330" height="80" fill="#E8D6A8"/><rect x="880" y="300" width="380" height="80" fill="#B8E2A4"/>'
  + '<ellipse cx="300" cy="360" rx="70" ry="16" fill="#74C0FC"/><g fill="#A0A7B4"><ellipse cx="700" cy="350" rx="56" ry="30"/><ellipse cx="750" cy="362" rx="40" ry="20"/></g><rect x="1070" y="300" width="16" height="70" fill="#8B5A2B"/><circle cx="1078" cy="292" r="40" fill="#4CAF50"/>'
  + railing(160, 490) + railing(520, 850) + railing(880, 1260)
  + '<rect y="380" width="1280" height="260" fill="#8BCB7E"/>'
  + '<path d="M0 470 C260 430 420 520 640 480 C860 440 1020 520 1280 470 V560 C1020 610 860 530 640 570 C420 610 260 520 0 560 Z" fill="#F2D9A6"/>'
  + '<path d="M0 470 C260 430 420 520 640 480 C860 440 1020 520 1280 470" stroke="#E3C489" stroke-width="5" fill="none"/>'
  + '<g fill="#E3C489"><circle cx="320" cy="500" r="5"/><circle cx="700" cy="520" r="4"/><circle cx="1000" cy="500" r="5"/><circle cx="540" cy="530" r="4"/></g>'
  + bush(200, 400, '#66BB6A') + bush(1150, 410) + bush(560, 620, '#66BB6A')
  + [[300, 610], [460, 420], [820, 420], [930, 620], [1200, 600]].map(([x, y]) => tuft(x, y)).join(''));

// Sea: sky, the sea with white wave lines, a far sailboat, then the sand with foam at the edge, pebbles and shells. No sun, no fish.
const SEA = BD(SKY + CLOUDS
  + '<rect y="190" width="1280" height="260" fill="#4DABF7"/><rect y="190" width="1280" height="40" fill="#3D9BE9"/>'
  + '<path d="M980 210 L1010 210 L1000 222 L976 222 Z" fill="#fff"/><path d="M994 208 V170 L1014 204 Z" fill="#FFF4E0"/>'
  + Array.from({ length: 4 }, (_, r) => `<path d="${Array.from({ length: 8 }, (_, i) => `M${i * 170 + (r % 2) * 85 + 20} ${262 + r * 44} q14 -10 28 0 t28 0`).join(' ')}" stroke="#fff" stroke-width="4" fill="none" opacity=".6" stroke-linecap="round"/>`).join('')
  + '<path d="M0 440 Q80 424 160 440 T320 440 T480 440 T640 440 T800 440 T960 440 T1120 440 T1280 440 V640 H0 Z" fill="#F7DFA3"/>'
  + '<path d="M0 440 Q80 424 160 440 T320 440 T480 440 T640 440 T800 440 T960 440 T1120 440 T1280 440" stroke="#fff" stroke-width="10" fill="none" stroke-linecap="round"/>'
  + '<g fill="#E8C987"><circle cx="300" cy="520" r="5"/><circle cx="520" cy="600" r="4"/><circle cx="800" cy="510" r="5"/><circle cx="1060" cy="590" r="4"/><circle cx="1180" cy="500" r="5"/></g>'
  + '<g fill="#FFC9D6" stroke="#F49AB2" stroke-width="2"><path d="M420 606 q10 -18 20 0 Z"/><path d="M940 506 q10 -18 20 0 Z"/></g>'
  + '<g fill="#B8C2CF"><ellipse cx="680" cy="610" rx="12" ry="7"/><ellipse cx="1200" cy="620" rx="10" ry="6"/></g>');

export const BACKDROPS = { garden: GARDEN, zoo: ZOO, sea: SEA };
