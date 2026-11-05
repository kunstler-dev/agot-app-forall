// Heraldic renderer: a crest is data (a blazon), every crest goes through this one function,
// so a whole fandom reads as one armorial. Two modes: colour, and engraving (monochrome,
// tinctures shown by Petra Sancta hatching). Pure string output: usable in the DOM, in a
// canvas (share cards) and in Node (scripts/build_heraldry.ts).

export type Tincture = string

export type Blazon = {
  field: { division: string; tinctures: Tincture[] }
  ordinary: { type: string; tincture: Tincture | null }
  charges: { charge: string; tincture: Tincture; count: number; arrangement: string }[]
  blazon?: string
  canon_exception?: boolean
  /** a ready-made image inside the content directory; shown instead of the rendered blazon */
  image?: string | null
}

export function crestImageUrl(b: Blazon): string | null {
  return b.image ? `/api/content/file/${b.image}` : null
}

/** Charge artwork in a 100×100 box. Placeholders: fill='T' tincture with ink contour, stroke='T'
 * tincture line, stroke='I' / fill='I' ink, fill='G' "armed and langued" (claws and tongue). */
export type ChargeArt = { svg: string; label?: string }
export type ChargeLibrary = Record<string, ChargeArt>

export const TINCTURES: Record<string, string> = {
  or: '#C9A24A',
  argent: '#E8E2D4',
  gules: '#A3302A',
  azure: '#2F4F7A',
  vert: '#3E6B48',
  sable: '#1E1B18',
  purpure: '#5E3A63',
  tenne: '#A5642A',
  sanguine: '#6E2A26',
  murrey: '#6B2E45',
  bleu_celeste: '#6F8FB0',
  rose: '#C9877F',
  cendree: '#8A857B',
  brunatre: '#5E4632',
}
export const METALS = new Set(['or', 'argent'])

const INK = '#1E1A15'
const PAPER = '#EFE6D2'

export function colorOf(t: Tincture | null | undefined): string {
  if (!t) return '#888'
  return TINCTURES[t] ?? (t.startsWith('#') ? t : '#888')
}

/** Nearest named tincture for a custom hex, so engraving can hatch it. */
export function nameOf(t: Tincture): string {
  if (TINCTURES[t]) return t
  if (!t.startsWith('#')) return 'cendree'
  const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
  const [r, g, b] = rgb(t)
  let best = 'cendree'
  let d = Infinity
  for (const [k, v] of Object.entries(TINCTURES)) {
    const [r2, g2, b2] = rgb(v)
    const dd = (r - r2) ** 2 + (g - g2) ** 2 + (b - b2) ** 2
    if (dd < d) {
      d = dd
      best = k
    }
  }
  return best
}

/** Tincture rule: no metal on metal, no colour on colour. Returns human-readable problems. */
export function tinctureProblems(b: Blazon): string[] {
  const out: string[] = []
  const fieldTs = b.field.tinctures
  if (b.field.division !== 'plain') return out // a divided field carries both a metal and a colour
  const base = fieldTs[0]
  const isMetal = (t: string) => METALS.has(t)
  const clash = (t: string | null) => t != null && isMetal(t) === isMetal(base)
  if (b.ordinary.type !== 'none' && clash(b.ordinary.tincture)) out.push(`ordinary ${b.ordinary.tincture} on ${base}`)
  for (const c of b.charges) if (clash(c.tincture)) out.push(`${c.charge} ${c.tincture} on ${base}`)
  return out
}

// ---------- geometry ----------

/** One shield for everyone: a heater, 5:6 (100×120). */
export const SHIELD = 'M4 4 H96 V52 C96 84 76 106 50 116 C24 106 4 84 4 52 Z'

function hatch(id: string, t: string): string {
  // Petra Sancta: or dots, argent plain, gules vertical, azure horizontal, vert bend, purpure bend sinister, sable grid
  const n = nameOf(t)
  const line = (d: string) => `<path d="${d}" stroke="${INK}" stroke-width="0.9"/>`
  const body: Record<string, string> = {
    or: `<circle cx="2" cy="2" r="0.75" fill="${INK}"/>`,
    argent: '',
    gules: line('M2 0 V4'),
    azure: line('M0 2 H4'),
    vert: line('M0 0 L4 4'),
    purpure: line('M4 0 L0 4'),
    sable: line('M2 0 V4') + line('M0 2 H4'),
    tenne: line('M0 2 H4') + line('M4 0 L0 4'),
    sanguine: line('M0 0 L4 4') + line('M4 0 L0 4'),
    murrey: line('M0 0 L4 4') + line('M4 0 L0 4'),
    bleu_celeste: line('M0 1 H4') + line('M0 3 H4'),
    rose: line('M2 0 V4'),
    cendree: `<circle cx="1" cy="1" r="0.5" fill="${INK}"/><circle cx="3" cy="3" r="0.5" fill="${INK}"/>`,
    brunatre: line('M0 0 L4 4') + line('M0 2 H4'),
  }
  return `<pattern id="${id}" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="${PAPER}"/>${body[n] ?? ''}</pattern>`
}

function division(kind: string, c2: string): string {
  const r = (x: number, y: number, w: number, h: number) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c2}"/>`
  switch (kind) {
    case 'per_pale': return r(50, 0, 50, 120)
    case 'per_fess': return r(0, 54, 100, 66)
    case 'per_bend': return `<path d="M0 0 L100 0 L100 116 Z" fill="${c2}"/>`
    case 'per_bend_sinister': return `<path d="M0 0 L100 0 L0 116 Z" fill="${c2}"/>`
    case 'quarterly': return r(50, 0, 50, 54) + r(0, 54, 50, 66)
    case 'per_saltire': return `<path d="M0 0 L50 56 L0 120 Z M100 0 L50 56 L100 120 Z" fill="${c2}"/>`
    case 'per_chevron': return `<path d="M0 120 L0 98 L50 46 L100 98 L100 120 Z" fill="${c2}"/>`
    case 'gyronny': return `<path d="M50 56 L50 0 L100 0 Z M50 56 L100 56 L100 120 Z M50 56 L50 120 L0 120 Z M50 56 L0 56 L0 0 Z" fill="${c2}"/>`
    case 'paly': return [1, 3, 5].map((i) => r(i * (100 / 7), 0, 100 / 7, 120)).join('')
    case 'barry': return [1, 3, 5, 7].map((i) => r(0, i * 13, 100, 13)).join('')
    case 'bendy': return [-60, -20, 20, 60].map((o) => `<path d="M${o} 0 L${o + 20} 0 L${o + 120} 120 L${o + 100} 120 Z" fill="${c2}"/>`).join('')
    case 'chequy': {
      let out = ''
      for (let y = 0; y < 8; y++) for (let x = 0; x < 6; x++) if ((x + y) % 2) out += r(x * 17, y * 15, 17, 15)
      return out
    }
    default: return ''
  }
}

/** Division lines in ink (between the two tinctures). */
function divisionLines(kind: string): string {
  const d: Record<string, string> = {
    per_pale: 'M50 0 V120', per_fess: 'M0 54 H100', per_bend: 'M0 0 L100 116', per_bend_sinister: 'M100 0 L0 116',
    quarterly: 'M50 0 V120 M0 54 H100', per_saltire: 'M0 0 L100 116 M100 0 L0 116', per_chevron: 'M0 98 L50 46 L100 98',
    gyronny: 'M50 0 V120 M0 56 H100 M0 0 L100 116 M100 0 L0 116',
  }
  return d[kind] ? `<path d="${d[kind]}" fill="none" stroke="${INK}" stroke-width="1"/>` : ''
}

function ordinary(kind: string, c: string): string {
  const s = `stroke="${INK}" stroke-width="1"`
  switch (kind) {
    case 'fess': return `<rect x="-2" y="42" width="104" height="24" fill="${c}" ${s}/>`
    case 'pale': return `<rect x="37" y="-2" width="26" height="124" fill="${c}" ${s}/>`
    case 'bend': return `<path d="M-8 8 L8 -8 L108 100 L92 116 Z" fill="${c}" ${s}/>`
    case 'chevron': return `<path d="M-2 94 L50 40 L102 94 L102 116 L50 62 L-2 116 Z" fill="${c}" ${s}/>`
    case 'cross': return `<path d="M39 -2 H61 V42 H102 V64 H61 V122 H39 V64 H-2 V42 H39 Z" fill="${c}" ${s}/>`
    case 'saltire': return `<path d="M-2 -2 L14 -2 L102 104 L102 122 L86 122 L-2 16 Z M102 -2 L86 -2 L-2 104 L-2 122 L14 122 L102 16 Z" fill="${c}" ${s}/>`
    case 'chief': return `<rect x="-2" y="-2" width="104" height="32" fill="${c}" ${s}/>`
    case 'bordure': return `<path d="${SHIELD}" fill="none" stroke="${INK}" stroke-width="16"/><path d="${SHIELD}" fill="none" stroke="${c}" stroke-width="13.6"/><path d="${SHIELD}" fill="none" stroke="${INK}" stroke-width="1" transform="translate(50 60) scale(0.86) translate(-50 -60)"/>`
    case 'pile': return `<path d="M20 -2 L80 -2 L50 98 Z" fill="${c}" ${s}/>`
    default: return ''
  }
}

function placeCharges(arr: string, count: number, hasChief: boolean): { x: number; y: number; s: number }[] {
  const top = hasChief ? 36 : 6
  const cy = hasChief ? 72 : 56
  if (count <= 1 || arr === 'single') return [{ x: 50, y: cy, s: hasChief ? 58 : 72 }]
  if (arr === 'in_pale') return Array.from({ length: count }, (_, i) => ({ x: 50, y: top + 16 + (i * (94 - top)) / count, s: 76 / count }))
  if (arr === 'in_fess' || count === 2) return Array.from({ length: count }, (_, i) => ({ x: 18 + (64 / (count - 1)) * i, y: cy, s: 90 / count }))
  if (arr === 'semy') {
    const pts: { x: number; y: number; s: number }[] = []
    for (let y = top + 12; y < 100; y += 22) for (let x = (y / 22) % 2 ? 22 : 34; x < 90; x += 24) pts.push({ x, y, s: 16 })
    return pts
  }
  // two_one: two above, one below
  return [{ x: 30, y: cy - 16, s: 36 }, { x: 70, y: cy - 16, s: 36 }, { x: 50, y: cy + 22, s: 36 }]
}

export type RenderOpts = { engraved?: boolean; fade?: number; id?: string }

let uid = 0

export function renderBlazon(b: Blazon, lib: ChargeLibrary, opts: RenderOpts = {}): string {
  const id = opts.id ?? `h${++uid}`
  const engraved = !!opts.engraved
  const defs: string[] = [`<clipPath id="${id}c"><path d="${SHIELD}"/></clipPath>`]
  const used = new Map<string, string>()
  const fill = (t: Tincture | null | undefined): string => {
    if (!t) return 'none'
    if (!engraved) return colorOf(t)
    const key = nameOf(t)
    if (!used.has(key)) {
      used.set(key, `${id}p${used.size}`)
      defs.push(hatch(used.get(key)!, key))
    }
    return `url(#${used.get(key)})`
  }
  const [t1, t2] = b.field.tinctures
  const hasChief = b.ordinary.type === 'chief'
  let body = `<rect x="-2" y="-2" width="104" height="124" fill="${fill(t1)}"/>`
  if (b.field.division !== 'plain' && t2) body += division(b.field.division, fill(t2)) + divisionLines(b.field.division)
  if (b.ordinary.type !== 'none') body += ordinary(b.ordinary.type, fill(b.ordinary.tincture))
  for (const c of b.charges) {
    const art = lib[c.charge]
    if (!art) continue
    const tf = fill(c.tincture)
    const armed = engraved ? fill('gules') : colorOf(b.field.tinctures[0] === 'gules' || c.tincture === 'gules' ? 'azure' : 'gules')
    const markup = art.svg
      .replaceAll("fill='T'", `fill="${tf}" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"`)
      .replaceAll("stroke='T'", `stroke="${engraved ? INK : colorOf(c.tincture)}"`)
      .replaceAll("stroke='I'", `stroke="${INK}"`)
      .replaceAll("fill='I'", `fill="${INK}"`)
      .replaceAll("fill='G'", `fill="${armed}" stroke="${INK}" stroke-width="1.2"`)
    for (const p of placeCharges(c.arrangement, c.count, hasChief)) {
      const k = p.s / 100
      body += `<g transform="translate(${(p.x - p.s / 2).toFixed(2)} ${(p.y - p.s / 2).toFixed(2)}) scale(${k.toFixed(3)})" fill="none" stroke-linecap="round" stroke-linejoin="round">${markup}</g>`
    }
  }
  const fade = opts.fade ?? 1
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-3 -3 106 126"><defs>${defs.join('')}</defs><g opacity="${fade}"><g clip-path="url(#${id}c)">${body}</g></g><path d="${SHIELD}" fill="none" stroke="${INK}" stroke-width="2"/></svg>`
}

export function blazonDataUrl(b: Blazon, lib: ChargeLibrary, opts?: RenderOpts): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderBlazon(b, lib, opts))}`
}
