#!/usr/bin/env node
// Engraved-map generator: builds an SVG map from data, deterministically (seeded).
//
//   node scripts/build_map.ts <map.json> <out.svg>
//
// Data (all coordinates in map units, the same units locations.json uses):
// {
//   "width": 1000, "height": 1400, "seed": 7, "title": "…", "subtitle": "…", "title_pos": [x, y],
//   "leagues_per_unit": 1, "rose": [x, y],
//   "lands":     [{ "points": [[x, y], …], "rough": 1 }],        coarse coastline, 30–80 points per landmass
//   "islets":    [{ "near": [x, y], "count": 4 }],                 optional extra scatter
//   "lakes":     [{ "points": [[x, y], …] }],
//   "ranges":    [{ "points": [[x, y], …], "size": 16 }],          mountain ridges as polylines
//   "hills":     [{ "points": [[x, y], …] }],
//   "forests":   [{ "points": [[x, y], …], "density": 1 }],
//   "swamps":    [{ "points": [[x, y], …] }],
//   "rivers":    [{ "points": [[x, y], …], "width": 3 }],          from source to mouth
//   "walls":     [{ "points": [[x, y], …] }],
//   "regions":   [{ "points": [[x, y], …], "tint": 0 }],           watercolour washes, tint index 0–5
//   "labels":    [{ "text": "…", "x": 0, "y": 0, "kind": "region|sea|range", "size": 20, "arc": 0.2, "rotate": 0 }]
// }
//
// The look follows 16th–17th century engraved maps: ink on paper, water-lining along the coast,
// molehill mountains shaded from the north-west, clustered round trees, rivers that widen toward
// the mouth, a graduated frame, a plain eight-point rose, a cartouche and a scale bar.

import { readFileSync, writeFileSync } from 'node:fs'

type P = [number, number]
type Spec = {
  width: number; height: number; seed?: number; title?: string; subtitle?: string; title_pos?: P; leagues_per_unit?: number; rose?: P
  lands: { points: P[]; rough?: number }[]
  islets?: { near: P; count?: number }[]
  lakes?: { points: P[] }[]
  ranges?: { points: P[]; size?: number }[]
  hills?: { points: P[] }[]
  forests?: { points: P[]; density?: number }[]
  swamps?: { points: P[] }[]
  rivers?: { points: P[]; width?: number }[]
  walls?: { points: P[] }[]
  regions?: { points: P[]; tint?: number }[]
  labels?: { text: string; x: number; y: number; kind?: string; size?: number; arc?: number; rotate?: number }[]
}

const INK = '#2A2117'
const INK_SOFT = '#5A4A36'
const PAPER = '#EFE6D2'
const SEA = '#E3D8BF'
const TINTS = ['#7C9A7A', '#B07B4F', '#7E8DA6', '#A68A4A', '#8E6C82', '#9AA07A']

// ---------- deterministic randomness ----------
function rng(seed: number) {
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    return ((s >>> 0) % 1_000_000) / 1_000_000
  }
}
const f1 = (n: number) => (Math.round(n * 10) / 10).toString()

// ---------- geometry ----------
function displace(pts: P[], rnd: () => number, rough: number, closed: boolean, depth = 4): P[] {
  let out: P[] = closed ? [...pts, pts[0]] : [...pts]
  let r = 0.24 * rough
  for (let d = 0; d < depth; d++) {
    const next: P[] = [out[0]]
    for (let i = 0; i < out.length - 1; i++) {
      const [x1, y1] = out[i]
      const [x2, y2] = out[i + 1]
      const len = Math.hypot(x2 - x1, y2 - y1)
      let mx = (x1 + x2) / 2
      let my = (y1 + y2) / 2
      if (len > 2) {
        const off = (rnd() * 2 - 1) * len * r
        mx += (-(y2 - y1) / len) * off
        my += ((x2 - x1) / len) * off
      }
      next.push([mx, my], [x2, y2])
    }
    out = next
    r *= 0.62
  }
  return closed ? out.slice(0, -1) : out
}

/** One pass of Chaikin smoothing: takes the jaggies off without turning the coast into a blob. */
function chaikin(pts: P[], closed: boolean): P[] {
  const out: P[] = []
  const n = pts.length
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[(i + 1) % n]
    out.push([0.75 * x1 + 0.25 * x2, 0.75 * y1 + 0.25 * y2], [0.25 * x1 + 0.75 * x2, 0.25 * y1 + 0.75 * y2])
  }
  if (!closed) {
    out.unshift(pts[0])
    out.push(pts[n - 1])
  }
  return out
}

const poly = (pts: P[], closed = true) => 'M' + pts.map(([x, y]) => `${f1(x)},${f1(y)}`).join('L') + (closed ? 'Z' : '')

function inside(x: number, y: number, pts: P[]): boolean {
  let c = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]
    const [xj, yj] = pts[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-9) + xi) c = !c
  }
  return c
}

function along(pts: P[], step: number): P[] {
  const out: P[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[i + 1]
    const n = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1) / step))
    for (let k = 0; k < n; k++) out.push([x1 + ((x2 - x1) * k) / n, y1 + ((y2 - y1) * k) / n])
  }
  return out
}

function bbox(pts: P[]) {
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }
}

// ---------- terrain glyphs ----------
function molehill(x: number, y: number, s: number, rnd: () => number): string {
  const w = s * (0.85 + rnd() * 0.4)
  const h = s * (0.7 + rnd() * 0.45)
  const peak = x + (rnd() - 0.5) * w * 0.25
  const outline = `M${f1(x - w)},${f1(y)} Q${f1(peak - w * 0.35)},${f1(y - h * 1.15)} ${f1(peak)},${f1(y - h)} Q${f1(peak + w * 0.4)},${f1(y - h * 1.1)} ${f1(x + w)},${f1(y)}`
  // light from the north-west: hatch the right flank
  let hatch = ''
  const n = Math.max(3, Math.round(w / 3.2))
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1)
    const hx = peak + (x + w - peak) * t
    const top = y - h * (1 - t * t) * 0.92
    hatch += `M${f1(hx)},${f1(top + 1.5)}L${f1(hx - 1.2)},${f1(y - 0.5)}`
  }
  return `<path d="${outline}" fill="${PAPER}" stroke="${INK}" stroke-width="1.15"/><path d="${hatch}" stroke="${INK}" stroke-width="0.6" fill="none"/>`
}

function hill(x: number, y: number, rnd: () => number): string {
  const w = 7 + rnd() * 4
  return `<path d="M${f1(x - w)},${f1(y)} Q${f1(x)},${f1(y - w * 0.8)} ${f1(x + w)},${f1(y)}" fill="none" stroke="${INK_SOFT}" stroke-width="0.9"/><path d="M${f1(x + w * 0.2)},${f1(y - w * 0.45)}l2,3" stroke="${INK_SOFT}" stroke-width="0.6"/>`
}

function tree(x: number, y: number, s: number): string {
  // round crown, a shadow crescent on the right, a short trunk
  return `<path d="M${f1(x)},${f1(y)}v${f1(s * 0.7)}" stroke="${INK}" stroke-width="0.8"/><circle cx="${f1(x)}" cy="${f1(y - s * 0.35)}" r="${f1(s)}" fill="${PAPER}" stroke="${INK}" stroke-width="0.8"/><path d="M${f1(x + s * 0.35)},${f1(y - s * 1.1)} A${f1(s)},${f1(s)} 0 0 1 ${f1(x + s * 0.2)},${f1(y + s * 0.6)}" stroke="${INK}" stroke-width="1.4" fill="none"/>`
}

function swampTuft(x: number, y: number): string {
  return `<path d="M${f1(x - 5)},${f1(y)}h10M${f1(x - 2)},${f1(y)}v-4M${f1(x)},${f1(y)}v-6M${f1(x + 2)},${f1(y)}v-4" stroke="${INK_SOFT}" stroke-width="0.7" fill="none"/>`
}

/** A river as a filled ribbon that widens from source to mouth. */
function river(pts: P[], maxW: number, rnd: () => number): string {
  const line = chaikin(displace(pts, rnd, 0.35, false, 3), false)
  const left: P[] = []
  const right: P[] = []
  for (let i = 0; i < line.length; i++) {
    const [x, y] = line[i]
    const [ax, ay] = line[Math.max(0, i - 1)]
    const [bx, by] = line[Math.min(line.length - 1, i + 1)]
    const len = Math.hypot(bx - ax, by - ay) || 1
    const nx = -(by - ay) / len
    const ny = (bx - ax) / len
    const w = (0.35 + (maxW - 0.35) * (i / (line.length - 1)) ** 1.3) / 2
    left.push([x + nx * w, y + ny * w])
    right.push([x - nx * w, y - ny * w])
  }
  return `<path d="${poly([...left, ...right.reverse()])}" fill="${INK}"/>`
}

// ---------- labels ----------
let pathId = 0
function arcLabel(l: NonNullable<Spec['labels']>[number], defs: string[]): string {
  const kind = l.kind ?? 'region'
  const size = l.size ?? (kind === 'sea' ? 20 : kind === 'range' ? 11 : 18)
  const spacing = kind === 'range' ? 2 : size * 0.38
  const text = kind === 'sea' ? l.text : l.text.toUpperCase()
  const width = text.length * (size * 0.62 + spacing) + 20
  const arc = l.arc ?? 0
  const id = `lp${++pathId}`
  const x0 = l.x - width / 2
  const x1 = l.x + width / 2
  const sag = -arc * width * 0.25
  const rot = l.rotate ? ` transform="rotate(${l.rotate} ${l.x} ${l.y})"` : ''
  defs.push(`<path id="${id}" d="M${f1(x0)},${f1(l.y)} Q${f1(l.x)},${f1(l.y + sag)} ${f1(x1)},${f1(l.y)}"${rot}/>`)
  const style = kind === 'sea'
    ? `font-style="italic" fill="${INK_SOFT}" fill-opacity="0.85"`
    : kind === 'range' ? `font-style="italic" fill="${INK_SOFT}"` : `fill="${INK}" fill-opacity="0.82"`
  return `<text font-family="Alegreya SC, Alegreya, Georgia, serif" font-size="${size}" letter-spacing="${f1(spacing)}" ${style}><textPath href="#${id}" startOffset="50%" text-anchor="middle">${text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</textPath></text>`
}

// ---------- decoration ----------
function frame(W: number, H: number): string {
  let ticks = ''
  for (let x = 40; x < W - 30; x += 25) {
    const long = x % 100 === 40 % 100
    ticks += `M${x},14v${long ? 10 : 6}M${x},${H - 14}v-${long ? 10 : 6}`
  }
  for (let y = 40; y < H - 30; y += 25) {
    const long = y % 100 === 40 % 100
    ticks += `M14,${y}h${long ? 10 : 6}M${W - 14},${y}h-${long ? 10 : 6}`
  }
  // alternating bands, as on graduated borders
  let bands = ''
  for (let x = 24, k = 0; x < W - 24; x += 50, k++) if (k % 2) bands += `M${x},24h50`
  return `<g id="frame" fill="none" stroke="${INK}"><rect x="8" y="8" width="${W - 16}" height="${H - 16}" stroke-width="2"/><rect x="14" y="14" width="${W - 28}" height="${H - 28}" stroke-width="0.8"/><rect x="24" y="24" width="${W - 48}" height="${H - 48}" stroke-width="0.8"/><path d="${ticks}" stroke-width="0.8"/><path d="${bands}" stroke-width="3"/></g>`
}

function rose(x: number, y: number, r: number): string {
  let rays = ''
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI / 4) * i - Math.PI / 2
    const rr = i % 2 ? r * 0.55 : r
    const w = r * (i % 2 ? 0.08 : 0.12)
    const tx = x + Math.cos(a) * rr
    const ty = y + Math.sin(a) * rr
    const b = a + Math.PI / 2
    const lx = x + Math.cos(b) * w
    const ly = y + Math.sin(b) * w
    rays += `<path d="M${f1(lx)},${f1(ly)}L${f1(tx)},${f1(ty)}L${f1(2 * x - lx)},${f1(2 * y - ly)}" fill="none" stroke="${INK}" stroke-width="0.9"/><path d="M${x},${y}L${f1(tx)},${f1(ty)}" stroke="${INK}" stroke-width="0.5"/>`
  }
  return `<g id="rose"><circle cx="${x}" cy="${y}" r="${f1(r * 0.62)}" fill="none" stroke="${INK}" stroke-width="0.7"/>${rays}<text x="${x}" y="${f1(y - r - 6)}" text-anchor="middle" font-family="Alegreya SC, Georgia, serif" font-size="${f1(r * 0.36)}" fill="${INK}">N</text></g>`
}

function cartouche(x: number, y: number, title: string, subtitle: string): string {
  const w = Math.max(240, title.length * 22 + 60)
  return `<g id="cartouche"><rect x="${f1(x - w / 2)}" y="${f1(y - 40)}" width="${f1(w)}" height="78" fill="${PAPER}" stroke="${INK}" stroke-width="1.6"/><rect x="${f1(x - w / 2 + 6)}" y="${f1(y - 34)}" width="${f1(w - 12)}" height="66" fill="none" stroke="${INK}" stroke-width="0.6"/><text x="${x}" y="${y + 2}" text-anchor="middle" font-family="Alegreya SC, Georgia, serif" font-size="30" letter-spacing="5" fill="${INK}">${title}</text><text x="${x}" y="${y + 24}" text-anchor="middle" font-family="Alegreya, Georgia, serif" font-style="italic" font-size="13" fill="${INK_SOFT}">${subtitle}</text></g>`
}

function scaleBar(x: number, y: number, leaguesPerUnit: number): string {
  // five segments, each a round number of leagues, about 200 map units in all
  const nice = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500]
  const leagues = nice.find((n) => n / leaguesPerUnit >= 36) ?? 500
  const step = Math.round(leagues / leaguesPerUnit)
  let seg = ''
  for (let i = 0; i < 5; i++) seg += `<rect x="${x + i * step}" y="${y}" width="${step}" height="5" fill="${i % 2 ? PAPER : INK}" stroke="${INK}" stroke-width="0.7"/>`
  const labels = [0, 5].map((i) => `<text x="${x + i * step}" y="${y + 18}" text-anchor="middle" font-family="Alegreya, Georgia, serif" font-size="11" fill="${INK}">${i * leagues}</text>`).join('')
  return `<g id="scale">${seg}${labels}<text x="${x + step * 2.5}" y="${y - 6}" text-anchor="middle" font-family="Alegreya SC, Georgia, serif" font-size="11" fill="${INK_SOFT}">лиги</text></g>`
}

// ---------- assembly ----------
export function buildMap(spec: Spec): string {
  const W = spec.width
  const H = spec.height
  const rnd = rng(spec.seed ?? 1)
  const defs: string[] = []
  // small islands get extra roughness so they never read as boxes
  const lands = spec.lands.map((l) => {
    const b = bbox(l.points)
    const small = Math.max(b.x1 - b.x0, b.y1 - b.y0) < 90
    return chaikin(displace(l.points, rnd, small ? Math.max(1.4, l.rough ?? 1) : l.rough ?? 1, true, small ? 3 : 4), true)
  })
  // islets: a scatter of small rocks off rough coasts
  const islets: P[][] = []
  for (const land of lands) {
    for (let i = 0; i < land.length; i += 23) {
      if (rnd() > 0.1) continue
      const [x, y] = land[i]
      const [ax, ay] = land[(i - 1 + land.length) % land.length]
      const [bx, by] = land[(i + 1) % land.length]
      const len = Math.hypot(bx - ax, by - ay) || 1
      let nx = -(by - ay) / len
      let ny = (bx - ax) / len
      if (inside(x + nx * 6, y + ny * 6, land)) {
        nx = -nx
        ny = -ny
      }
      const d = 10 + rnd() * 18
      const cx = x + nx * d
      const cy = y + ny * d
      if (lands.some((l) => inside(cx, cy, l))) continue
      const r = 2.5 + rnd() * 5
      islets.push(Array.from({ length: 7 }, (_, k) => {
        const a = (k / 7) * Math.PI * 2
        const rr = r * (0.7 + rnd() * 0.5)
        return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr] as P
      }))
    }
  }
  for (const s of spec.islets ?? []) {
    for (let k = 0; k < (s.count ?? 4); k++) {
      const cx = s.near[0] + (rnd() - 0.5) * 50
      const cy = s.near[1] + (rnd() - 0.5) * 40
      const r = 3 + rnd() * 6
      islets.push(Array.from({ length: 7 }, (_, j) => [cx + Math.cos((j / 7) * 6.283) * r * (0.7 + rnd() * 0.5), cy + Math.sin((j / 7) * 6.283) * r * (0.7 + rnd() * 0.5)] as P))
    }
  }
  const mainD = lands.map((l) => poly(l)).join('')
  const isletD = islets.map((l) => poly(l)).join('')
  defs.push(`<path id="land" d="${mainD}"/>`, `<path id="islets" d="${isletD}"/>`, `<clipPath id="landclip"><use href="#land"/></clipPath>`)

  // water-lining: concentric hairlines along every coast, fading outward
  let water = ''
  const lines = 6
  for (let k = lines; k >= 1; k--) {
    const w = k * 7
    water += `<use href="#land" fill="none" stroke="${INK}" stroke-opacity="${f1(0.55 - k * 0.07)}" stroke-width="${w * 2}" stroke-linejoin="round"/><use href="#land" fill="none" stroke="${SEA}" stroke-width="${w * 2 - 1.1}" stroke-linejoin="round"/>`
  }

  // regions: flat watercolour wash, clipped to land, with a fractal edge
  const regions = (spec.regions ?? []).map((r) => {
    const pts = chaikin(displace(r.points, rnd, 1.5, true, 4), true)
    return `<path d="${poly(pts)}" fill="${TINTS[(r.tint ?? 0) % TINTS.length]}" fill-opacity="0.11"/>`
  }).join('')

  const lakes = (spec.lakes ?? []).map((l) => {
    const pts = chaikin(displace(l.points, rnd, 0.5, true, 3), true)
    return `<path d="${poly(pts)}" fill="${SEA}" stroke="${INK}" stroke-width="1.1"/><path d="${poly(pts)}" fill="none" stroke="${INK}" stroke-opacity="0.35" stroke-width="0.6" transform="translate(${f1(bbox(pts).x0 + (bbox(pts).x1 - bbox(pts).x0) / 2)} ${f1(bbox(pts).y0 + (bbox(pts).y1 - bbox(pts).y0) / 2)}) scale(0.72) translate(${f1(-(bbox(pts).x0 + (bbox(pts).x1 - bbox(pts).x0) / 2))} ${f1(-(bbox(pts).y0 + (bbox(pts).y1 - bbox(pts).y0) / 2))})"/>`
  }).join('')

  const rivers = (spec.rivers ?? []).map((r) => river(r.points, r.width ?? 3, rnd)).join('')

  // mountains: molehills along each ridge, varied size and spacing, painted back to front
  const hills: { y: number; svg: string }[] = []
  for (const r of spec.ranges ?? []) {
    const s = r.size ?? 14
    for (const [x, y] of along(r.points, s * 0.95)) {
      const jx = x + (rnd() - 0.5) * s * 0.9
      const jy = y + (rnd() - 0.5) * s * 0.8
      hills.push({ y: jy, svg: molehill(jx, jy, s * (0.75 + rnd() * 0.5), rnd) })
      if (rnd() < 0.45) {
        const ox = jx + (rnd() - 0.5) * s * 1.6
        const oy = jy + s * (0.35 + rnd() * 0.4)
        hills.push({ y: oy, svg: molehill(ox, oy, s * (0.5 + rnd() * 0.3), rnd) })
      }
    }
  }
  for (const h of spec.hills ?? []) for (const [x, y] of along(h.points, 15)) hills.push({ y, svg: hill(x + (rnd() - 0.5) * 6, y + (rnd() - 0.5) * 6, rnd) })

  // forests: round trees, dense in the middle and sparse at the edge
  const trees: { y: number; svg: string }[] = []
  for (const f of spec.forests ?? []) {
    const b = bbox(f.points)
    const cx = (b.x0 + b.x1) / 2
    const cy = (b.y0 + b.y1) / 2
    const rx = (b.x1 - b.x0) / 2
    const ry = (b.y1 - b.y0) / 2
    const target = Math.round(((b.x1 - b.x0) * (b.y1 - b.y0)) / 95 * (f.density ?? 1))
    let placed = 0
    for (let t = 0; t < target * 6 && placed < target; t++) {
      const x = b.x0 + rnd() * (b.x1 - b.x0)
      const y = b.y0 + rnd() * (b.y1 - b.y0)
      if (!inside(x, y, f.points)) continue
      const edge = Math.hypot((x - cx) / rx, (y - cy) / ry)
      if (rnd() < edge * 0.75) continue
      trees.push({ y, svg: tree(x, y, 2.6 + rnd() * 1.4) })
      placed++
    }
  }
  const swamps = (spec.swamps ?? []).map((sw) => {
    const b = bbox(sw.points)
    let out = ''
    for (let i = 0; i < ((b.x1 - b.x0) * (b.y1 - b.y0)) / 260; i++) {
      const x = b.x0 + rnd() * (b.x1 - b.x0)
      const y = b.y0 + rnd() * (b.y1 - b.y0)
      if (inside(x, y, sw.points)) out += swampTuft(x, y)
    }
    return out
  }).join('')

  const walls = (spec.walls ?? []).map((w) => `<path d="${poly(w.points, false)}" fill="none" stroke="${INK}" stroke-width="4.5"/><path d="${poly(w.points, false)}" fill="none" stroke="${PAPER}" stroke-width="2.6"/><path d="${poly(w.points, false)}" fill="none" stroke="${INK}" stroke-width="2.6" stroke-dasharray="1.2 3"/>`).join('')

  const labels = (spec.labels ?? []).map((l) => arcLabel(l, defs)).join('')
  const [rx, ry] = spec.rose ?? [W - 110, H - 140]
  const [tx, ty] = spec.title_pos ?? [W / 2, 80]

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`,
    `<defs>${defs.join('')}</defs>`,
    `<rect width="${W}" height="${H}" fill="${SEA}"/>`,
    `<g id="water">${water}</g>`,
    `<g id="coast"><use href="#islets" fill="none" stroke="${INK}" stroke-opacity="0.3" stroke-width="7"/><use href="#islets" fill="none" stroke="${SEA}" stroke-width="5.9"/><use href="#land" fill="${PAPER}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/><use href="#islets" fill="${PAPER}" stroke="${INK}" stroke-width="1"/></g>`,
    `<g id="regions" clip-path="url(#landclip)">${regions}</g>`,
    `<g id="terrain">${lakes}${swamps}${[...hills, ...trees].sort((a, b) => a.y - b.y).map((h) => h.svg).join('')}</g>`,
    `<g id="rivers">${rivers}</g>`,
    `<g id="routes">${walls}</g>`,
    `<g id="labels">${labels}</g>`,
    rose(rx, ry, 46),
    spec.title ? cartouche(tx, ty, spec.title, spec.subtitle ?? '') : '',
    scaleBar(Math.max(40, rx - 70 - 5 * Math.round((([1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500].find((n) => n / (spec.leagues_per_unit ?? 1) >= 36) ?? 500) / (spec.leagues_per_unit ?? 1)))), ry + 52, spec.leagues_per_unit ?? 1),
    frame(W, H),
    '</svg>',
  ].join('\n')
}

if (process.argv[1]?.endsWith('build_map.ts')) {
  const [, , input, output] = process.argv
  if (!input || !output) {
    console.error('usage: node scripts/build_map.ts <map.json> <out.svg>')
    process.exit(2)
  }
  const spec = JSON.parse(readFileSync(input, 'utf8')) as Spec
  let svg = buildMap(spec)
  try {
    const { optimize } = await import('svgo')
    svg = optimize(svg, { multipass: true, plugins: [{ name: 'preset-default', params: { overrides: { cleanupIds: false, convertShapeToPath: false } } }] }).data
  } catch {
    console.warn('svgo not installed (npm i --prefix scripts svgo): writing unoptimised SVG')
  }
  writeFileSync(output, svg)
  console.log(`wrote ${output} (${Math.round(svg.length / 1024)} KB)`)
}
