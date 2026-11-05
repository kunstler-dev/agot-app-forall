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
  wolf: `<path fill="C" d="M6 54 L28 42 L38 26 L44 4 L56 24 L68 6 L70 30 C84 38 92 54 90 72 L96 94 L72 86 L60 96 L52 82 L38 76 L28 68 L8 66 Z"/><circle cx="46" cy="40" r="3.5" fill="D"/><path d="M10 62 L32 60" stroke="D" stroke-width="2.5"/>`,
  lion: `<path fill="C" d="M32 96 L38 72 L28 64 L18 68 L12 58 L26 50 L30 38 C22 32 22 20 30 14 C38 6 52 8 56 16 L66 8 L64 22 C70 28 68 38 60 42 L68 48 L84 34 L90 42 L76 56 L68 64 L72 76 L86 82 L82 92 L62 86 L56 76 L50 82 L52 96 Z"/><path d="M68 64 C84 66 94 54 90 40 L96 34" stroke="C" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="44" cy="24" r="3" fill="D"/>`,
  dragon: `<path fill="C" d="M50 92 C38 86 34 74 40 64 C30 62 20 56 14 46 C24 48 32 46 36 40 C30 34 30 24 36 16 C40 26 46 30 52 30 C56 22 64 18 72 20 C68 26 68 32 72 36 C80 34 88 38 92 46 C84 46 78 50 76 56 C82 62 82 72 76 78 C72 70 66 66 60 66 C60 74 58 84 50 92 Z"/><path d="M36 16 L28 8 M72 20 L80 10 M92 46 L98 40" stroke="C" stroke-width="3" stroke-linecap="round"/><circle cx="66" cy="28" r="2.5" fill="D"/>`,
  stag: `<path fill="C" d="M42 92 L44 70 C36 64 34 56 38 50 L30 46 L22 28 L28 30 L30 18 L36 30 L38 22 L42 38 L48 44 L52 44 L58 38 L62 22 L64 30 L70 18 L72 30 L78 28 L70 46 L62 50 C66 56 64 64 56 70 L58 92 Z"/><circle cx="45" cy="56" r="2.5" fill="D"/><circle cx="55" cy="56" r="2.5" fill="D"/>`,
  kraken: `<path fill="C" d="M50 12 C66 12 74 26 70 40 C68 48 62 52 60 56 C70 60 78 70 86 70 C80 78 70 74 64 66 C66 76 72 84 80 88 C70 92 60 84 56 70 C56 80 54 88 50 94 C46 88 44 80 44 70 C40 84 30 92 20 88 C28 84 34 76 36 66 C30 74 20 78 14 70 C22 70 30 60 40 56 C38 52 32 48 30 40 C26 26 34 12 50 12 Z"/><circle cx="43" cy="36" r="3.5" fill="D"/><circle cx="57" cy="36" r="3.5" fill="D"/>`,
  fish: `<path fill="C" d="M10 50 C24 30 50 26 70 40 L90 26 L84 50 L90 74 L70 60 C50 74 24 70 10 50 Z"/><circle cx="26" cy="47" r="3" fill="D"/><path d="M40 38 C46 46 46 54 40 62" stroke="D" stroke-width="2" fill="none"/>`,
  falcon: `<path fill="C" d="M50 16 C58 16 62 22 62 28 L70 30 L62 34 C64 40 64 46 62 50 C74 44 86 32 94 20 C92 40 80 58 64 64 L60 80 L68 92 L50 86 L32 92 L40 80 L36 64 C20 58 8 40 6 20 C14 32 26 44 38 50 C36 42 38 30 42 22 C44 18 46 16 50 16 Z"/><circle cx="54" cy="24" r="2.5" fill="D"/>`,
  eagle: `<path fill="C" d="M50 14 C56 14 60 20 58 26 L66 28 L58 32 L58 44 C70 34 84 30 96 32 C88 40 80 44 72 46 C82 48 88 54 92 60 C80 60 70 56 62 54 L60 70 L72 76 L62 80 L56 90 L50 82 L44 90 L38 80 L28 76 L40 70 L38 54 C30 56 20 60 8 60 C12 54 18 48 28 46 C20 44 12 40 4 32 C16 30 30 34 42 44 L42 30 C42 20 46 14 50 14 Z"/>`,
  crescent: `<path fill="C" d="M62 12 C40 14 24 32 24 52 C24 72 40 88 62 90 C48 82 40 68 40 52 C40 36 48 22 62 12 Z"/>`,
  rose: `<g fill="C"><circle cx="50" cy="28" r="15"/><circle cx="72" cy="44" r="15"/><circle cx="64" cy="70" r="15"/><circle cx="36" cy="70" r="15"/><circle cx="28" cy="44" r="15"/></g><circle cx="50" cy="52" r="12" fill="D" opacity="0.55"/><circle cx="50" cy="52" r="6" fill="C"/>`,
  sun: `<g fill="C"><circle cx="50" cy="50" r="22"/>${Array.from({ length: 12 }, (_, i) => `<path d="M48 8 L52 8 L54 24 L46 24 Z" transform="rotate(${i * 30} 50 50)"/>`).join('')}</g>`,
  spear: `<path fill="C" d="M50 2 L62 26 L55 28 L55 98 L45 98 L45 28 L38 26 Z"/>`,
  sun_spear: `<g fill="C"><circle cx="50" cy="50" r="18" fill="none" stroke="C" stroke-width="5"/>${Array.from({ length: 8 }, (_, i) => `<path d="M48 18 L52 18 L53 28 L47 28 Z" transform="rotate(${i * 45} 50 50)"/>`).join('')}</g><path fill="D" d="M50 2 L56 18 L52.5 19 L52.5 98 L47.5 98 L47.5 19 L44 18 Z"/>`,
  tower: `<path fill="C" d="M30 92 L34 36 L28 36 L28 18 L36 18 L36 24 L44 24 L44 18 L56 18 L56 24 L64 24 L64 18 L72 18 L72 36 L66 36 L70 92 Z"/><path fill="D" d="M44 92 L44 74 C44 66 56 66 56 74 L56 92 Z M47 44 L53 44 L53 56 L47 56 Z"/>`,
  two_towers: `<path fill="C" d="M8 92 L12 30 L8 30 L8 16 L14 16 L14 22 L20 22 L20 16 L26 16 L26 22 L32 22 L32 16 L38 16 L38 30 L34 30 L36 60 L64 60 L66 30 L62 30 L62 16 L68 16 L68 22 L74 22 L74 16 L80 16 L80 22 L86 22 L86 16 L92 16 L92 30 L88 30 L92 92 Z"/><path fill="D" d="M42 92 L42 76 C42 68 58 68 58 76 L58 92 Z"/>`,
  bear: `<path fill="C" d="M14 80 C12 66 20 54 32 48 C30 38 34 30 42 28 C42 22 48 20 50 26 C58 24 66 30 66 38 C76 40 84 48 86 58 C90 66 88 76 84 80 L76 80 L74 70 L66 72 L66 80 L56 80 L54 70 L40 70 L38 80 L28 80 L28 70 L22 72 L22 80 Z"/><circle cx="56" cy="36" r="2.5" fill="D"/>`,
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

const SHIELD = 'M6 6 H94 V56 C94 88 72 108 50 116 C28 108 6 88 6 56 Z'

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
  const dark = 'rgba(0,0,0,0.55)'
  const body = art.replaceAll('"C"', `"${fill}"`).replaceAll('"D"', `"${dark}"`)
  const s = size / 100
  return `<g transform="translate(${x - size / 2} ${y - size / 2}) scale(${s})">${body}</g>`
}

let uid = 0

/** Full SVG markup of a crest (100×120 shield). */
export function crestSvg(spec: CrestSpec, opts: { blur?: number; outline?: boolean } = {}): string {
  const id = `sh${++uid}`
  const f1 = color(spec.field)
  const f2 = color(spec.field2 ?? spec.field)
  const ord = spec.ordinary && spec.ordinary !== 'none' ? ordinary(spec.ordinary, color(spec.ordinary_color)) : ''
  const hasChief = spec.ordinary === 'chief'
  const count = Math.max(1, Math.min(3, spec.charge_count ?? 1))
  let charges = ''
  if (spec.charge) {
    const fill = color(spec.charge_color, '#eee')
    const cy = hasChief ? 70 : 58
    const big = hasChief ? 50 : 60
    if (count === 1) charges = charge(spec.charge, fill, 50, cy, big)
    else if (count === 2) charges = charge(spec.charge, fill, 31, cy, 34) + charge(spec.charge, fill, 69, cy, 34)
    else
      charges =
        charge(spec.charge, fill, 30, cy - 14, 30) + charge(spec.charge, fill, 70, cy - 14, 30) + charge(spec.charge, fill, 50, cy + 22, 30)
  }
  const blur = opts.blur ?? 0
  const filter = blur > 0 ? `<filter id="${id}b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${blur / 2}"/></filter>` : ''
  const shading = `<linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.22"/><stop offset="0.5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.3"/></linearGradient>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -4 108 128"><defs><clipPath id="${id}"><path d="${SHIELD}"/></clipPath>${filter}${shading}</defs>
<g ${blur > 0 ? `filter="url(#${id}b)"` : ''}><g clip-path="url(#${id})"><rect x="0" y="0" width="100" height="120" fill="${f1}"/>${spec.division && spec.division !== 'plain' ? division(spec.division, f2) : ''}${ord}${charges}<rect x="0" y="0" width="100" height="120" fill="url(#${id}g)"/></g></g>
<path d="${SHIELD}" fill="none" stroke="#C9A55A" stroke-width="3"/><path d="${SHIELD}" fill="none" stroke="#2a2216" stroke-width="1" transform="translate(50 60) scale(0.955) translate(-50 -60)" opacity="0.6"/></svg>`
}

export function crestDataUrl(spec: CrestSpec, opts?: { blur?: number }): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(crestSvg(spec, opts))}`
}
