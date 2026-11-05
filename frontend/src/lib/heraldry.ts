// Original procedural heraldry: a crest is described in content (tincture, division, ordinary, charge)
// and rendered here as an SVG string, so it can be shown inline, blurred, or drawn into a canvas.
// The charge silhouettes are simple, stylised shapes drawn for this project.

export type CrestSpec = {
  field: string
  division?: string
  field2?: string | null
  ordinary?: string
  ordinary_color?: string | null
  charge?: string | null
  charge_color?: string | null
  charge_count?: number
}

export const TINCTURES: Record<string, string> = {
  or: '#D9A93B',
  argent: '#E8E6DF',
  gules: '#A3242C',
  azure: '#2B4C8C',
  vert: '#2E6B3F',
  sable: '#1B1B1F',
  purpure: '#5E3375',
  tenne: '#C4672A',
  sanguine: '#6E1E22',
  bleu: '#7FA7D6',
  rose: '#D98BA0',
  cendree: '#8C8C8C',
  murrey: '#7A2A4A',
  ochre: '#B58A3C',
}

export function color(c: string | null | undefined, fallback = '#888'): string {
  if (!c) return fallback
  return TINCTURES[c] ?? (c.startsWith('#') ? c : fallback)
}

// Charges are drawn in a 100×100 box. Each value is SVG markup using the placeholder fill "C"
// (replaced by the charge tincture) and "D" (a darker line color for inner details).
const CHARGES: Record<string, string> = {
  wolf: `<path fill="C" d="M5 45 L15 39 L19 26 L24 34 L29 21 L33 34 C42 37 53 38 63 38 C73 38 80 39 85 43 C90 39 94 31 96 24 C98 35 94 45 86 51 L84 59 L82 73 L87 88 L78 88 L74 71 L70 63 C60 65 50 65 42 63 L40 73 L45 88 L36 88 L32 71 L30 59 C24 55 18 53 14 51 L7 49 Z"/><circle cx="21" cy="41" r="2.4" fill="D"/><path d="M8 47 L17 46" stroke="D" stroke-width="1.6" fill="none"/>`,
  lion: `<path d="M64 66 C82 62 86 46 80 34 C75 25 81 16 90 15" stroke="C" stroke-width="4.5" fill="none" stroke-linecap="round"/><path fill="C" d="M86 10 C93 8 98 13 95 19 C92 23 86 21 86 17 Z"/><path fill="C" d="M40 7 C49 5 56 11 56 18 L61 22 C63 29 58 33 53 35 L59 45 C65 53 69 61 68 69 C72 75 77 80 83 82 L92 84 L90 93 L74 93 C70 89 66 85 62 83 L56 87 L51 97 L37 97 L42 88 L46 80 C40 74 38 66 40 58 L32 53 L20 54 L11 47 L15 42 L27 44 L33 40 L23 33 L12 28 L16 20 L29 26 L35 28 C29 24 27 17 31 12 C33 9 36 7 40 7 Z"/><g stroke="D" stroke-width="1.6" fill="none" stroke-linecap="round"><path d="M44 13 C48 16 48 22 45 26 M50 18 C53 22 52 28 48 31 M41 26 C45 29 47 33 46 37"/></g><circle cx="36" cy="16" r="2.2" fill="D"/><path d="M28 22 L33 23" stroke="D" stroke-width="1.8"/>`,
  dragon: `<path fill="C" d="M45 54 L10 12 L19 28 L6 30 L22 40 L9 48 L39 60 Z M55 54 L90 12 L81 28 L94 30 L78 40 L91 48 L61 60 Z"/><path fill="C" d="M50 46 C60 46 64 56 62 66 C61 74 56 80 50 82 C44 80 39 74 38 66 C36 56 40 46 50 46 Z"/><g stroke="C" stroke-width="5.5" fill="none" stroke-linecap="round"><path d="M46 50 C40 42 36 36 30 30"/><path d="M50 48 L50 26"/><path d="M54 50 C60 42 64 36 70 30"/><path d="M50 82 C50 92 64 96 74 90 C80 86 78 80 72 82"/><path d="M43 78 L38 90 M57 78 L62 90"/></g><path fill="C" d="M30 30 L20 26 L24 34 Z M50 26 L46 15 L54 15 Z M70 30 L80 26 L76 34 Z"/><circle cx="29" cy="29" r="1.6" fill="D"/><circle cx="50" cy="22" r="1.6" fill="D"/><circle cx="71" cy="29" r="1.6" fill="D"/>`,
  stag: `<g stroke="C" stroke-width="4.6" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M44 46 L36 32 L30 14 M36 32 L22 28 M33 23 L40 12 M30 14 L22 10"/><path d="M56 46 L64 32 L70 14 M64 32 L78 28 M67 23 L60 12 M70 14 L78 10"/></g><path fill="C" d="M41 46 L44 38 L47 43 L50 36 L53 43 L56 38 L59 46 Z"/><path fill="C" d="M42 48 L58 48 L62 62 L56 86 C54 90 46 90 44 86 L38 62 Z"/><path fill="C" d="M40 54 L26 48 C28 56 32 60 40 62 Z M60 54 L74 48 C72 56 68 60 60 62 Z"/><circle cx="45" cy="60" r="2.3" fill="D"/><circle cx="55" cy="60" r="2.3" fill="D"/><ellipse cx="50" cy="84" rx="4" ry="2.5" fill="D"/>`,
  kraken: `<ellipse cx="50" cy="26" rx="17" ry="19" fill="C"/><g stroke="C" stroke-width="5.5" fill="none" stroke-linecap="round"><path d="M38 40 C26 46 14 48 12 62 C10 72 20 74 22 66"/><path d="M43 44 C36 56 30 66 32 80 C34 90 44 88 40 80"/><path d="M48 45 C46 60 46 74 48 92"/><path d="M52 45 C54 60 54 74 52 92"/><path d="M57 44 C64 56 70 66 68 80 C66 90 56 88 60 80"/><path d="M62 40 C74 46 86 48 88 62 C90 72 80 74 78 66"/></g><circle cx="43" cy="26" r="3.6" fill="D"/><circle cx="57" cy="26" r="3.6" fill="D"/>`,
  fish: `<path fill="C" d="M8 76 C20 46 46 28 74 28 L90 14 L88 34 L98 46 L80 44 C62 50 44 62 30 86 C24 92 14 88 8 76 Z"/><path fill="C" d="M44 50 L36 34 L52 40 Z M50 60 L58 74 L44 68 Z"/><circle cx="20" cy="70" r="2.6" fill="D"/><g fill="D" opacity="0.45"><circle cx="36" cy="58" r="1.6"/><circle cx="46" cy="50" r="1.6"/><circle cx="56" cy="44" r="1.6"/><circle cx="42" cy="64" r="1.6"/></g>`,
  falcon: `<path fill="C" d="M50 14 C57 14 61 19 61 25 L69 27 L61 31 C62 36 62 41 60 45 C70 36 82 24 92 8 C94 28 86 46 70 56 L66 60 C76 62 84 70 88 78 C78 76 70 72 64 70 L62 82 L70 94 L50 88 L30 94 L38 82 L36 70 C30 72 22 76 12 78 C16 70 24 62 34 60 L30 56 C14 46 6 28 8 8 C18 24 30 36 40 45 C38 38 38 30 41 22 C43 17 46 14 50 14 Z"/><circle cx="54" cy="22" r="2.2" fill="D"/>`,
  eagle: `<path fill="C" d="M50 14 C56 14 60 20 58 26 L66 28 L58 32 L58 44 C70 34 84 30 96 32 C88 40 80 44 72 46 C82 48 88 54 92 60 C80 60 70 56 62 54 L60 70 L72 76 L62 80 L56 90 L50 82 L44 90 L38 80 L28 76 L40 70 L38 54 C30 56 20 60 8 60 C12 54 18 48 28 46 C20 44 12 40 4 32 C16 30 30 34 42 44 L42 30 C42 20 46 14 50 14 Z"/>`,
  crescent: `<path fill="C" d="M62 12 C40 14 24 32 24 52 C24 72 40 88 62 90 C48 82 40 68 40 52 C40 36 48 22 62 12 Z"/>`,
  rose: `<g fill="C"><circle cx="50.0" cy="28.0" r="17"/><circle cx="72.8" cy="44.6" r="17"/><circle cx="64.1" cy="71.4" r="17"/><circle cx="35.9" cy="71.4" r="17"/><circle cx="27.2" cy="44.6" r="17"/></g><g fill="D" opacity="0.35"><path d="M50 52 L73.5 19.6 L71.6 31.2 Z"/><path d="M50 52 L88.0 64.4 L76.5 66.1 Z"/><path d="M50 52 L50.0 92.0 L44.8 81.5 Z"/><path d="M50 52 L12.0 64.4 L20.3 56.2 Z"/><path d="M50 52 L26.5 19.6 L36.8 25.0 Z"/></g><g fill="C"><circle cx="55.9" cy="43.9" r="10"/><circle cx="59.5" cy="55.1" r="10"/><circle cx="50.0" cy="62.0" r="10"/><circle cx="40.5" cy="55.1" r="10"/><circle cx="44.1" cy="43.9" r="10"/></g><circle cx="50" cy="52" r="7" fill="D" opacity="0.6"/>`,
  sun: `<g fill="C"><circle cx="50" cy="50" r="22"/>${Array.from({ length: 12 }, (_, i) => `<path d="M48 8 L52 8 L54 24 L46 24 Z" transform="rotate(${i * 30} 50 50)"/>`).join('')}</g>`,
  spear: `<path fill="C" d="M50 2 L62 26 L55 28 L55 98 L45 98 L45 28 L38 26 Z"/>`,
  sun_spear: `<g fill="C"><path d="M48.5 12 Q50 7 51.5 12 L53.5 28 L46.5 28 Z" transform="rotate(0 50 50)"/><path d="M48.5 12 Q50 7 51.5 12 L53.5 28 L46.5 28 Z" transform="rotate(30 50 50)"/><path d="M48.5 12 Q50 7 51.5 12 L53.5 28 L46.5 28 Z" transform="rotate(60 50 50)"/><path d="M48.5 12 Q50 7 51.5 12 L53.5 28 L46.5 28 Z" transform="rotate(90 50 50)"/><path d="M48.5 12 Q50 7 51.5 12 L53.5 28 L46.5 28 Z" transform="rotate(120 50 50)"/><path d="M48.5 12 Q50 7 51.5 12 L53.5 28 L46.5 28 Z" transform="rotate(150 50 50)"/><path d="M48.5 12 Q50 7 51.5 12 L53.5 28 L46.5 28 Z" transform="rotate(180 50 50)"/><path d="M48.5 12 Q50 7 51.5 12 L53.5 28 L46.5 28 Z" transform="rotate(210 50 50)"/><path d="M48.5 12 Q50 7 51.5 12 L53.5 28 L46.5 28 Z" transform="rotate(240 50 50)"/><path d="M48.5 12 Q50 7 51.5 12 L53.5 28 L46.5 28 Z" transform="rotate(270 50 50)"/><path d="M48.5 12 Q50 7 51.5 12 L53.5 28 L46.5 28 Z" transform="rotate(300 50 50)"/><path d="M48.5 12 Q50 7 51.5 12 L53.5 28 L46.5 28 Z" transform="rotate(330 50 50)"/><path d="M49 19 L51 19 L52.5 29 L47.5 29 Z" transform="rotate(15 50 50)"/><path d="M49 19 L51 19 L52.5 29 L47.5 29 Z" transform="rotate(45 50 50)"/><path d="M49 19 L51 19 L52.5 29 L47.5 29 Z" transform="rotate(75 50 50)"/><path d="M49 19 L51 19 L52.5 29 L47.5 29 Z" transform="rotate(105 50 50)"/><path d="M49 19 L51 19 L52.5 29 L47.5 29 Z" transform="rotate(135 50 50)"/><path d="M49 19 L51 19 L52.5 29 L47.5 29 Z" transform="rotate(165 50 50)"/><path d="M49 19 L51 19 L52.5 29 L47.5 29 Z" transform="rotate(195 50 50)"/><path d="M49 19 L51 19 L52.5 29 L47.5 29 Z" transform="rotate(225 50 50)"/><path d="M49 19 L51 19 L52.5 29 L47.5 29 Z" transform="rotate(255 50 50)"/><path d="M49 19 L51 19 L52.5 29 L47.5 29 Z" transform="rotate(285 50 50)"/><path d="M49 19 L51 19 L52.5 29 L47.5 29 Z" transform="rotate(315 50 50)"/><path d="M49 19 L51 19 L52.5 29 L47.5 29 Z" transform="rotate(345 50 50)"/><circle cx="50" cy="50" r="22"/></g><g transform="rotate(45 50 50)"><path fill="#F0CF6E" stroke="#1a1208" stroke-width="1.6" d="M50 -2 L57 14 L52.5 15 L52.5 104 L47.5 104 L47.5 15 L43 14 Z"/></g>`,
  tower: `<path fill="C" d="M30 92 L34 36 L28 36 L28 18 L36 18 L36 24 L44 24 L44 18 L56 18 L56 24 L64 24 L64 18 L72 18 L72 36 L66 36 L70 92 Z"/><path fill="D" d="M44 92 L44 74 C44 66 56 66 56 74 L56 92 Z M47 44 L53 44 L53 56 L47 56 Z"/>`,
  two_towers: `<path fill="C" d="M8 92 L12 30 L8 30 L8 16 L14 16 L14 22 L20 22 L20 16 L26 16 L26 22 L32 22 L32 16 L38 16 L38 30 L34 30 L36 60 L64 60 L66 30 L62 30 L62 16 L68 16 L68 22 L74 22 L74 16 L80 16 L80 22 L86 22 L86 16 L92 16 L92 30 L88 30 L92 92 Z"/><path fill="D" d="M42 92 L42 76 C42 68 58 68 58 76 L58 92 Z"/>`,
  bear: `<path fill="C" d="M30 94 L34 72 C26 66 22 56 24 46 L14 40 L18 32 L28 34 C30 26 34 20 40 18 C38 12 42 8 46 12 C50 8 56 10 56 16 C62 18 66 24 64 30 L74 30 L86 22 L90 28 L80 38 L70 42 C74 50 74 60 70 68 L74 80 L86 84 L84 92 L64 90 L60 78 L48 80 L48 94 Z"/><circle cx="52" cy="24" r="2.4" fill="D"/><ellipse cx="62" cy="31" rx="3" ry="2" fill="D"/>`,
  owl: `<path fill="C" d="M30 20 L40 30 C46 28 54 28 60 30 L70 20 L72 40 C80 50 80 66 72 78 C66 88 34 88 28 78 C20 66 20 50 28 40 Z"/><circle cx="40" cy="44" r="9" fill="D"/><circle cx="60" cy="44" r="9" fill="D"/><circle cx="40" cy="44" r="4" fill="C"/><circle cx="60" cy="44" r="4" fill="C"/><path fill="D" d="M46 54 L54 54 L50 62 Z"/>`,
  raven: `<path fill="C" d="M86 30 L70 30 C66 22 58 20 52 24 C44 28 42 38 44 46 L20 64 L8 84 L28 74 L24 90 L40 72 C52 76 64 70 68 60 C72 50 70 42 68 38 Z"/><circle cx="62" cy="30" r="2.5" fill="D"/>`,
  heron: `<path fill="C" d="M72 12 C64 12 60 18 62 24 L90 20 L64 30 C66 38 62 44 56 48 C40 54 32 66 34 76 L46 74 L46 94 L50 94 L50 74 L56 72 C66 64 70 50 70 40 C72 32 74 26 72 20 Z"/><circle cx="68" cy="20" r="2" fill="D"/>`,
  ship: `<path fill="C" d="M12 66 L88 66 L78 84 L22 84 Z"/><path fill="C" d="M48 14 L52 14 L52 64 L48 64 Z"/><path fill="C" d="M54 18 C70 26 76 42 74 60 L54 60 Z"/><path fill="C" d="M46 24 C34 32 28 46 30 60 L46 60 Z"/><path d="M8 90 C20 86 30 94 42 90 C54 86 64 94 76 90 C84 88 90 90 94 90" stroke="C" stroke-width="3" fill="none"/>`,
  fox: `<path fill="C" d="M22 14 L40 38 C46 36 54 36 60 38 L78 14 L76 46 C80 54 78 62 72 68 L50 90 L28 68 C22 62 20 54 24 46 Z"/><path fill="D" d="M36 56 L44 54 L42 60 Z M64 56 L56 54 L58 60 Z"/>`,
  horse: `<path fill="C" d="M36 92 L38 70 C30 62 30 50 34 42 L26 46 L24 38 L36 26 L38 14 L46 22 C60 20 72 30 74 44 L84 56 L78 64 L68 58 C64 64 60 70 60 76 L62 92 Z"/><circle cx="46" cy="32" r="2.5" fill="D"/>`,
  dog: `<path fill="C" d="M20 30 C20 20 30 16 36 22 L44 30 C54 28 64 32 70 40 L88 44 L86 56 L70 58 C68 68 60 76 50 78 L48 90 L36 90 L36 76 C26 70 20 58 22 46 L14 40 Z"/><circle cx="52" cy="44" r="3" fill="D"/>`,
  tree: `<path fill="C" d="M46 92 L46 68 C30 70 16 62 16 48 C10 40 16 28 26 28 C28 16 42 10 52 16 C62 8 78 14 80 26 C90 30 92 44 84 52 C84 64 70 70 54 68 L54 92 Z"/><path d="M46 80 L36 92 M54 80 L64 92" stroke="C" stroke-width="4"/>`,
  grapes: `<g fill="C">${[[50, 30], [38, 38], [62, 38], [44, 50], [56, 50], [32, 50], [68, 50], [50, 62], [38, 62], [62, 62], [44, 74], [56, 74], [50, 86]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7.5"/>`).join('')}</g><path d="M50 22 L50 10 L62 6" stroke="C" stroke-width="3" fill="none"/>`,
  seahorse: `<path fill="C" d="M54 10 C66 10 74 20 70 30 L82 32 L70 38 C72 46 70 54 64 60 C72 70 68 84 56 88 C46 92 40 84 46 78 C52 82 58 80 58 74 C58 66 48 64 42 58 C34 50 36 36 44 30 C42 20 46 10 54 10 Z"/><circle cx="58" cy="22" r="2.5" fill="D"/>`,
  merman: `<path fill="C" d="M50 8 C56 8 60 14 58 20 C56 26 44 26 42 20 C40 14 44 8 50 8 Z M38 28 L62 28 L66 46 L58 48 L60 60 C60 70 70 76 78 80 L90 74 L86 90 L72 86 C60 86 50 80 46 70 L42 48 L34 46 Z"/><path d="M66 30 L82 14 M78 10 L86 18" stroke="C" stroke-width="3"/>`,
  fist: `<path fill="C" d="M28 90 L30 62 C22 56 22 46 26 40 L28 26 C28 20 36 20 38 26 L38 22 C38 16 46 16 48 22 C48 16 56 16 58 22 C58 18 66 18 68 24 L70 40 C76 46 76 58 70 62 L72 90 Z"/><path d="M38 28 L38 42 M48 24 L48 42 M58 24 L58 42" stroke="D" stroke-width="2"/>`,
  sword: `<path fill="C" d="M45 2 L55 2 L57 64 L43 64 Z M24 64 L76 64 L76 72 L24 72 Z M45 72 L55 72 L55 88 L45 88 Z"/><circle cx="50" cy="93" r="6" fill="C"/>`,
  star: `<path fill="C" d="M50 6 L61 38 L95 38 L67 58 L78 92 L50 72 L22 92 L33 58 L5 38 L39 38 Z"/>`,
  sword_star: `<path fill="C" d="M48 30 L52 30 L54 76 L46 76 Z M34 76 L66 76 L66 81 L34 81 Z M47 81 L53 81 L53 92 L47 92 Z"/><path fill="C" d="M50 2 L55 14 L68 14 L58 22 L62 34 L50 27 L38 34 L42 22 L32 14 L45 14 Z" transform="translate(0 -2)"/>`,
  flame: `<path fill="C" d="M50 6 C56 22 72 30 72 54 C72 74 62 90 50 92 C38 90 28 76 28 58 C28 44 36 36 40 26 C42 36 46 40 50 42 C48 30 46 18 50 6 Z"/><path fill="D" d="M50 54 C54 62 60 66 58 78 C56 84 44 84 42 78 C40 70 46 64 50 54 Z" opacity="0.5"/>`,
  flayed: `<path d="M14 10 L86 90 M86 10 L14 90" stroke="D" stroke-width="5" stroke-linecap="round"/><g transform="rotate(180 50 50)"><path fill="C" d="M50 8 C57 8 61 14 60 20 C59 27 41 27 40 20 C39 14 43 8 50 8 Z M36 30 L64 30 L84 12 L90 18 L68 42 L66 60 L80 90 L70 94 L50 66 L30 94 L20 90 L34 60 L32 42 L10 18 L16 12 Z"/></g>`,
  figure: `<path fill="C" d="M50 8 C57 8 61 14 60 20 C59 27 41 27 40 20 C39 14 43 8 50 8 Z M36 30 L64 30 L80 18 L86 24 L68 42 L66 60 L72 92 L60 92 L50 66 L40 92 L28 92 L34 60 L32 42 L14 24 L20 18 Z"/>`,
  skull: `<path fill="C" d="M50 12 C70 12 84 26 84 44 C84 56 78 62 72 66 L72 80 L60 80 L60 88 L40 88 L40 80 L28 80 L28 66 C22 62 16 56 16 44 C16 26 30 12 50 12 Z"/><circle cx="36" cy="46" r="9" fill="D"/><circle cx="64" cy="46" r="9" fill="D"/><path fill="D" d="M50 56 L56 66 L44 66 Z"/>`,
  key: `<circle cx="50" cy="24" r="16" fill="none" stroke="C" stroke-width="8"/><path fill="C" d="M46 38 L54 38 L54 92 L46 92 Z M54 70 L66 70 L66 76 L54 76 Z M54 82 L70 82 L70 88 L54 88 Z"/>`,
  crown: `<path fill="C" d="M12 78 L8 30 L30 54 L50 20 L70 54 L92 30 L88 78 Z M12 82 L88 82 L88 92 L12 92 Z"/><circle cx="8" cy="28" r="5" fill="C"/><circle cx="50" cy="18" r="5" fill="C"/><circle cx="92" cy="28" r="5" fill="C"/>`,
  hand: `<path fill="C" d="M34 92 L32 60 L22 46 C18 40 24 34 30 38 L36 46 L36 16 C36 10 44 10 44 16 L44 40 L46 10 C46 4 54 4 54 10 L54 40 L56 14 C56 8 64 8 64 14 L64 42 L66 22 C66 16 74 16 74 22 L72 60 L66 92 Z"/>`,
  lizard: `<path fill="C" d="M50 6 C56 6 58 12 56 18 L58 30 L74 22 L76 28 L60 38 L60 56 L76 64 L74 70 L58 64 C58 76 56 86 52 94 L48 94 C44 86 42 76 42 64 L26 70 L24 64 L40 56 L40 38 L24 28 L26 22 L42 30 L44 18 C42 12 44 6 50 6 Z"/>`,
  boar: `<path fill="C" d="M10 60 C10 44 24 34 42 34 L50 22 L56 34 C72 34 86 44 88 58 L96 64 L88 70 L78 68 L76 80 L66 80 L64 70 L36 70 L34 80 L24 80 L22 68 C14 68 10 64 10 60 Z"/><path d="M84 62 C90 60 92 54 90 50" stroke="D" stroke-width="3" fill="none"/><circle cx="74" cy="48" r="2.5" fill="D"/>`,
  bull: `<path fill="C" d="M14 20 C16 34 24 40 34 40 L36 64 C36 78 44 88 50 88 C56 88 64 78 64 64 L66 40 C76 40 84 34 86 20 C80 28 72 30 64 28 L36 28 C28 30 20 28 14 20 Z"/><circle cx="42" cy="50" r="3" fill="D"/><circle cx="58" cy="50" r="3" fill="D"/>`,
  spider: `<g stroke="C" stroke-width="4" fill="none" stroke-linecap="round"><path d="M42 44 L24 30 L14 40 M42 50 L18 50 L8 62 M44 56 L24 70 L18 86 M58 44 L76 30 L86 40 M58 50 L82 50 L92 62 M56 56 L76 70 L82 86"/></g><ellipse cx="50" cy="40" rx="9" ry="9" fill="C"/><ellipse cx="50" cy="62" rx="12" ry="16" fill="C"/>`,
  scorpion: `<path fill="C" d="M50 92 L46 70 C38 66 36 56 40 48 L28 40 L16 44 L22 30 L32 34 L44 42 L50 40 L56 42 L68 34 L78 30 L84 44 L72 40 L60 48 C64 56 62 66 54 70 Z"/><path d="M50 40 C50 24 60 14 72 14 C80 14 82 22 76 24" stroke="C" stroke-width="5" fill="none"/>`,
  giant: `<path fill="C" d="M50 6 C58 6 63 13 62 21 C61 30 39 30 38 21 C37 13 42 6 50 6 Z M32 32 L68 32 L74 50 L68 52 L66 62 L72 94 L58 94 L50 70 L42 94 L28 94 L34 62 L32 52 L26 50 Z"/><path d="M26 50 L10 40 M74 50 L90 40" stroke="C" stroke-width="8" stroke-linecap="round"/><g fill="none" stroke="D" stroke-width="3"><ellipse cx="12" cy="34" rx="5" ry="7"/><ellipse cx="88" cy="34" rx="5" ry="7"/><ellipse cx="7" cy="24" rx="4" ry="5"/><ellipse cx="93" cy="24" rx="4" ry="5"/></g>`,
  chains: `<g fill="none" stroke="C" stroke-width="6">${[16, 36, 56, 76].map((y, i) => `<ellipse cx="${i % 2 ? 50 : 50}" cy="${y + 4}" rx="${i % 2 ? 8 : 14}" ry="${i % 2 ? 14 : 8}"/>`).join('')}</g>`,
  moose: `<path fill="C" d="M38 92 L40 72 C34 66 34 58 38 54 L40 46 L20 40 C10 34 10 22 16 18 L22 30 L26 20 L30 32 L34 24 L38 38 L46 42 L54 42 L62 38 L66 24 L70 32 L74 20 L78 30 L84 18 C90 22 90 34 80 40 L60 46 L62 54 C66 58 66 66 60 72 L62 92 Z"/>`,
  heart: `<path fill="C" d="M50 88 C20 66 10 50 14 34 C18 20 38 16 50 32 C62 16 82 20 86 34 C90 50 80 66 50 88 Z"/>`,
  wave: `<path d="M6 40 C18 28 30 52 44 40 C58 28 70 52 94 40 M6 62 C18 50 30 74 44 62 C58 50 70 74 94 62" stroke="C" stroke-width="7" fill="none" stroke-linecap="round"/>`,
  mountain: `<path fill="C" d="M6 84 L36 30 L50 52 L64 22 L94 84 Z"/><path fill="D" d="M64 22 L72 38 L66 36 L60 42 L58 34 Z" opacity="0.4"/>`,
  arrow: `<path fill="C" d="M50 6 L62 26 L54 26 L54 80 L64 92 L54 88 L50 94 L46 88 L36 92 L46 80 L46 26 L38 26 Z"/>`,
  axe: `<path fill="C" d="M46 10 L54 10 L54 94 L46 94 Z"/><path fill="C" d="M54 16 C72 14 86 26 86 44 C76 40 66 40 54 44 Z"/>`,
  harp: `<path d="M30 90 L30 14 C50 14 74 34 74 70 L30 90" stroke="C" stroke-width="7" fill="none"/><path d="M40 20 L40 84 M50 26 L50 80 M60 38 L60 76" stroke="C" stroke-width="2.5"/>`,
  feather: `<path fill="C" d="M80 10 C60 14 34 34 26 70 L18 92 L24 92 L32 74 C58 70 78 44 80 10 Z"/><path d="M76 16 L30 72" stroke="D" stroke-width="2"/>`,
  peacock: `<circle cx="50" cy="48" r="34" fill="C" opacity="0.35"/><path fill="C" d="M46 92 L46 56 C40 52 40 42 46 38 C44 30 48 24 54 26 C58 28 58 34 54 38 C60 42 60 52 54 56 L54 92 Z"/>`,
  unicorn: `<path fill="C" d="M36 92 L38 70 C30 62 30 50 34 42 L26 46 L24 38 L36 26 L38 18 L46 22 L64 4 L52 26 C62 28 72 34 74 44 L84 56 L78 64 L68 58 C64 64 60 70 60 76 L62 92 Z"/>`,
  serpent: `<path d="M24 86 C10 70 30 58 50 62 C70 66 86 52 72 38 C60 26 40 40 34 28 C28 16 44 8 58 12" stroke="C" stroke-width="9" fill="none" stroke-linecap="round"/><circle cx="62" cy="13" r="7" fill="C"/>`,
  cross_mark: `<path fill="C" d="M40 10 L60 10 L60 40 L90 40 L90 60 L60 60 L60 90 L40 90 L40 60 L10 60 L10 40 L40 40 Z"/>`,
  lozenge: `<path fill="C" d="M50 6 L84 50 L50 94 L16 50 Z"/>`,
  roundel: `<circle cx="50" cy="50" r="34" fill="C"/>`,
}

export const CHARGE_NAMES = Object.keys(CHARGES)

const SHIELD = 'M5 5 H95 V54 C95 86 74 106 50 116 C26 106 5 86 5 54 Z'

// Metals get a gradient so they read as gold and silver, not as flat yellow and white
const METALS: Record<string, [string, string, string]> = {
  or: ['#F7DE8A', '#D9A93B', '#9E7420'],
  argent: ['#FFFFFF', '#E3E1DA', '#A9A69C'],
}

function division(kind: string, c2: string): string {
  const r = (x: number, y: number, w: number, h: number) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c2}"/>`
  switch (kind) {
    case 'per_pale':
      return r(50, 0, 50, 120)
    case 'per_fess':
      return r(0, 56, 100, 64)
    case 'per_bend':
      return `<path d="M0 0 L100 0 L100 120 Z" fill="${c2}"/>`
    case 'per_bend_sinister':
      return `<path d="M0 0 L100 0 L0 120 Z" fill="${c2}"/>`
    case 'quarterly':
      return r(50, 0, 50, 56) + r(0, 56, 50, 64)
    case 'per_saltire':
      return `<path d="M0 0 L50 56 L0 120 Z M100 0 L50 56 L100 120 Z" fill="${c2}"/>`
    case 'per_chevron':
      return `<path d="M0 120 L0 100 L50 44 L100 100 L100 120 Z" fill="${c2}"/>`
    case 'gyronny':
      return `<path d="M50 56 L50 0 L100 0 Z M50 56 L100 56 L100 120 Z M50 56 L50 120 L0 120 Z M50 56 L0 56 L0 0 Z" fill="${c2}"/>`
    case 'paly':
      return [1, 3, 5].map((i) => r(i * (100 / 7), 0, 100 / 7, 120)).join('')
    case 'barry':
      return [1, 3, 5, 7].map((i) => r(0, i * 13, 100, 13)).join('')
    case 'bendy':
      return [-60, -20, 20, 60].map((o) => `<path d="M${o} 0 L${o + 20} 0 L${o + 120} 120 L${o + 100} 120 Z" fill="${c2}"/>`).join('')
    case 'chequy': {
      let out = ''
      for (let y = 0; y < 8; y++) for (let x = 0; x < 6; x++) if ((x + y) % 2) out += r(x * 17, y * 15, 17, 15)
      return out
    }
    default:
      return ''
  }
}

function ordinary(kind: string, c: string): string {
  switch (kind) {
    case 'fess':
      return `<rect x="0" y="44" width="100" height="22" fill="${c}"/>`
    case 'pale':
      return `<rect x="38" y="0" width="24" height="120" fill="${c}"/>`
    case 'bend':
      return `<path d="M-6 8 L8 -6 L108 94 L94 108 Z" fill="${c}"/>`
    case 'bend_sinister':
      return `<path d="M92 -6 L106 8 L6 108 L-8 94 Z" fill="${c}"/>`
    case 'chevron':
      return `<path d="M0 92 L50 40 L100 92 L100 112 L50 60 L0 112 Z" fill="${c}"/>`
    case 'cross':
      return `<rect x="40" y="0" width="20" height="120" fill="${c}"/><rect x="0" y="40" width="100" height="20" fill="${c}"/>`
    case 'saltire':
      return `<path d="M0 0 L14 0 L100 106 L100 120 L86 120 L0 14 Z M100 0 L86 0 L0 106 L0 120 L14 120 L100 14 Z" fill="${c}"/>`
    case 'chief':
      return `<rect x="0" y="0" width="100" height="32" fill="${c}"/>`
    case 'bordure':
      return `<path d="${SHIELD}" fill="none" stroke="${c}" stroke-width="14"/>`
    case 'orle':
      return `<path d="${SHIELD}" fill="none" stroke="${c}" stroke-width="3" transform="translate(50 60) scale(0.78) translate(-50 -60)"/>`
    case 'pile':
      return `<path d="M22 0 L78 0 L50 96 Z" fill="${c}"/>`
    default:
      return ''
  }
}

function charge(name: string, fill: string, x: number, y: number, size: number): string {
  const art = CHARGES[name] ?? CHARGES.star
  const dark = 'rgba(20,12,4,0.7)'
  const body = art.replaceAll('"C"', `"${fill}"`).replaceAll('"D"', `"${dark}"`)
  const s = size / 100
  // the dark contour drawn under the charge is what makes it look heraldic, not like clip-art
  return `<g transform="translate(${x - size / 2} ${y - size / 2}) scale(${s})"><g stroke="#1a1208" stroke-width="${(2.6 / s).toFixed(2)}" stroke-linejoin="round" stroke-linecap="round" opacity="0.85">${art.replaceAll('"C"', '"#1a1208"').replaceAll('"D"', '"none"')}</g>${body}</g>`
}

let uid = 0

function paint(c: string | null | undefined, id: string, key: string, defs: string[]): string {
  if (c && METALS[c]) {
    const [a, b, d] = METALS[c]
    defs.push(`<linearGradient id="${id}${key}" x1="0" y1="0" x2="0.6" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="0.55" stop-color="${b}"/><stop offset="1" stop-color="${d}"/></linearGradient>`)
    return `url(#${id}${key})`
  }
  return color(c)
}

/** Full SVG markup of a crest (100×120 shield). */
export function crestSvg(spec: CrestSpec, opts: { blur?: number; outline?: boolean } = {}): string {
  const id = `sh${++uid}`
  const defs: string[] = []
  const f1 = paint(spec.field, id, 'f1', defs)
  const f2 = paint(spec.field2 ?? spec.field, id, 'f2', defs)
  const ordColor = paint(spec.ordinary_color, id, 'o', defs)
  const ord = spec.ordinary && spec.ordinary !== 'none' ? ordinary(spec.ordinary, ordColor) : ''
  const hasChief = spec.ordinary === 'chief'
  const count = Math.max(1, Math.min(3, spec.charge_count ?? 1))
  let charges = ''
  if (spec.charge) {
    const fill = paint(spec.charge_color, id, 'c', defs)
    const cy = hasChief ? 70 : 57
    const big = hasChief ? 54 : 68
    if (count === 1) charges = charge(spec.charge, fill, 50, cy, big)
    else if (count === 2) charges = charge(spec.charge, fill, 31, cy, 38) + charge(spec.charge, fill, 69, cy, 38)
    else charges = charge(spec.charge, fill, 30, cy - 15, 34) + charge(spec.charge, fill, 70, cy - 15, 34) + charge(spec.charge, fill, 50, cy + 22, 34)
  }
  const blur = opts.blur ?? 0
  const filter = blur > 0 ? `<filter id="${id}b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${blur / 2}"/></filter>` : ''
  defs.push(
    `<clipPath id="${id}"><path d="${SHIELD}"/></clipPath>`,
    `<radialGradient id="${id}l" cx="0.32" cy="0.22" r="0.95"><stop offset="0" stop-color="#fff" stop-opacity="0.28"/><stop offset="0.45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.42"/></radialGradient>`,
    `<linearGradient id="${id}r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF0B8"/><stop offset="0.35" stop-color="#D9A93B"/><stop offset="0.7" stop-color="#8A6418"/><stop offset="1" stop-color="#E9C56A"/></linearGradient>`,
    `<pattern id="${id}t" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 6 L6 0" stroke="#000" stroke-opacity="0.05" stroke-width="1"/></pattern>`,
    filter,
  )
  const div = spec.division && spec.division !== 'plain' ? division(spec.division, f2) : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -4 108 128"><defs>${defs.join('')}</defs>
<path d="${SHIELD}" fill="#000" opacity="0.35" transform="translate(1.5 3)"/>
<g ${blur > 0 ? `filter="url(#${id}b)"` : ''}><g clip-path="url(#${id})"><rect x="0" y="0" width="100" height="120" fill="${f1}"/>${div}${ord}${charges}<rect width="100" height="120" fill="url(#${id}t)"/><rect width="100" height="120" fill="url(#${id}l)"/></g></g>
<path d="${SHIELD}" fill="none" stroke="#2a1d0c" stroke-width="5.5"/><path d="${SHIELD}" fill="none" stroke="url(#${id}r)" stroke-width="3.2"/><path d="${SHIELD}" fill="none" stroke="#1a1208" stroke-width="0.8" transform="translate(50 60) scale(0.945) translate(-50 -60)" opacity="0.7"/></svg>`
}

export function crestDataUrl(spec: CrestSpec, opts?: { blur?: number }): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(crestSvg(spec, opts))}`
}
