import type { ArtName } from './pick'
// Original illustrations in the app palette: flat layered silhouettes, a moon, a few accents.
// Generic medieval motifs drawn for this project; tenants can reuse them for any fandom.
// Every scene is 320×180 (16:9) and scales with its container.

import type { ReactNode } from 'react'

const C = {
  sky: '#1F1B15',
  far: '#2A251D',
  mid: '#342D23',
  near: '#120F0B',
  moon: '#E8DFCC',
  gilt: '#C9A24A',
  wax: '#B8322A',
  ink: '#E8DFCC',
}

function Frame({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden="true">
      <rect width="320" height="180" fill={C.sky} />
      {/* a few stars */}
      {[[24, 22], [70, 40], [118, 18], [196, 30], [240, 14], [292, 44], [150, 52], [40, 70]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 ? 0.9 : 1.4} fill={C.moon} opacity={0.55} />
      ))}
      {children}
    </svg>
  )
}

/** A castle on a hill under the moon, banners in wax. */
export function CastleArt({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <circle cx="252" cy="48" r="22" fill={C.moon} opacity="0.9" />
      <circle cx="244" cy="44" r="22" fill={C.sky} opacity="0.35" />
      <path d="M0 132 C60 112 110 120 160 108 C210 96 262 112 320 100 V180 H0 Z" fill={C.far} />
      <path d="M96 116 V72 H104 V64 H110 V72 H118 V64 H124 V72 H130 V100 H150 V58 H156 V50 H162 V58 H170 V50 H176 V58 H182 V100 H198 V76 H204 V68 H210 V76 H216 V68 H222 V76 H228 V116 Z" fill={C.near} />
      <path d="M159 50 V28 L176 33 L159 38" fill={C.wax} />
      <path d="M107 64 V48 L119 52 L107 56" fill={C.gilt} />
      <rect x="162" y="70" width="6" height="10" fill={C.gilt} opacity="0.8" />
      <rect x="110" y="84" width="5" height="8" fill={C.gilt} opacity="0.6" />
      <path d="M0 150 C80 136 140 148 210 138 C260 131 290 140 320 134 V180 H0 Z" fill={C.near} />
    </Frame>
  )
}

/** A raven on a bare branch against the moon. */
export function RavenArt({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <circle cx="210" cy="70" r="40" fill={C.moon} opacity="0.88" />
      <path d="M0 124 C70 110 120 124 190 114 C240 107 280 118 320 112 V180 H0 Z" fill={C.far} />
      <path d="M40 180 C70 150 110 132 170 122 C210 115 250 118 300 104" stroke={C.near} strokeWidth="7" fill="none" strokeLinecap="round" />
      <path d="M150 126 C160 112 178 108 184 96" stroke={C.near} strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M190 112 C186 96 192 84 204 80 L212 72 L216 80 C226 86 228 100 220 110 L232 120 L216 118 L210 122 L206 116 Z" fill={C.near} />
      <path d="M212 72 L222 70 L214 76 Z" fill={C.near} />
      <circle cx="210" cy="79" r="1.4" fill={C.gilt} />
    </Frame>
  )
}

/** A candle, a scroll and a quill on a desk: the archive. */
export function ArchiveArt({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <path d="M0 128 H320 V180 H0 Z" fill={C.near} />
      <path d="M0 128 H320" stroke={C.far} strokeWidth="2" />
      <rect x="70" y="84" width="16" height="44" fill={C.moon} opacity="0.85" />
      <path d="M78 84 C70 72 76 62 78 54 C82 64 88 72 78 84 Z" fill={C.gilt} />
      <path d="M78 80 C75 74 77 68 78 64 C80 70 82 74 78 80 Z" fill={C.wax} />
      <circle cx="78" cy="70" r="30" fill={C.gilt} opacity="0.08" />
      <path d="M118 112 C118 104 132 104 132 112 H236 C236 104 250 104 250 112 C250 122 236 122 236 116 H132 C132 122 118 122 118 112 Z" fill={C.moon} opacity="0.8" />
      <path d="M142 112 H226 M146 108 H210" stroke={C.mid} strokeWidth="1.2" />
      <path d="M232 128 C246 96 262 74 284 58 C276 84 262 104 238 126 Z" fill={C.moon} opacity="0.75" />
      <path d="M238 126 L284 58" stroke={C.mid} strokeWidth="1" />
      <circle cx="262" cy="118" r="7" fill={C.wax} />
    </Frame>
  )
}

/** A sailing ship on night waves. */
export function ShipArt({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <circle cx="70" cy="52" r="20" fill={C.moon} opacity="0.85" />
      <path d="M0 122 H320 V180 H0 Z" fill={C.far} />
      <path d="M0 134 q20 -6 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0" stroke={C.mid} strokeWidth="2" fill="none" />
      <path d="M0 150 q20 -6 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0" stroke={C.mid} strokeWidth="2" fill="none" />
      <path d="M130 120 H232 L218 138 H146 Z" fill={C.near} />
      <path d="M180 120 V44 M206 120 V66" stroke={C.near} strokeWidth="3" />
      <path d="M182 48 C206 58 210 92 182 112 Z" fill={C.moon} opacity="0.85" />
      <path d="M208 68 C224 76 226 98 208 112 Z" fill={C.moon} opacity="0.75" />
      <path d="M178 48 C160 60 156 92 178 112 Z" fill={C.moon} opacity="0.65" />
      <path d="M180 44 L196 40 L180 36 Z" fill={C.wax} />
    </Frame>
  )
}

/** A winged wyrm over mountains. */
export function WyrmArt({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <path d="M0 140 L40 96 L70 120 L112 70 L150 116 L190 82 L230 122 L270 88 L320 130 V180 H0 Z" fill={C.far} />
      <path d="M112 70 L124 84 L104 82 Z M270 88 L280 98 L262 98 Z" fill={C.moon} opacity="0.5" />
      <path d="M0 160 C80 146 160 156 240 146 C280 141 300 146 320 144 V180 H0 Z" fill={C.near} />
      <g fill={C.near}>
        <path d="M170 64 C150 46 128 40 104 44 C120 50 128 56 134 66 C120 62 108 64 96 72 C116 72 130 76 142 84 Z" />
        <path d="M184 64 C204 44 228 38 252 42 C236 48 228 56 222 66 C236 62 248 64 260 72 C240 72 226 76 214 84 Z" />
        <path d="M150 84 C158 70 172 64 186 66 C198 68 210 78 214 84 C200 90 186 92 172 92 C162 92 154 90 150 84 Z" />
        <path d="M186 66 C192 56 200 50 210 48 L216 44 L214 52 C208 56 204 62 200 70 Z" />
        <path d="M150 86 C130 92 116 104 120 118 C122 126 132 126 132 118" stroke={C.near} strokeWidth="4" fill="none" />
      </g>
      <circle cx="210" cy="50" r="1.3" fill={C.wax} />
    </Frame>
  )
}

/** A hooded figure: someone to guess. */
export function HoodArt({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <circle cx="160" cy="84" r="62" fill={C.mid} opacity="0.55" />
      <path d="M0 150 H320 V180 H0 Z" fill={C.near} />
      <path d="M160 34 C188 34 202 60 200 86 C214 104 226 130 230 156 H90 C94 130 106 104 120 86 C118 60 132 34 160 34 Z" fill={C.near} />
      <path d="M160 50 C176 50 184 66 182 84 C176 96 144 96 138 84 C136 66 144 50 160 50 Z" fill={C.sky} />
      <circle cx="152" cy="76" r="2" fill={C.gilt} />
      <circle cx="168" cy="76" r="2" fill={C.gilt} />
      <text x="160" y="140" textAnchor="middle" fontFamily="Alegreya SC, Georgia, serif" fontSize="34" fill={C.gilt}>?</text>
    </Frame>
  )
}

/** A blank shield with a question mark: today's crest. */
export function ShieldArt({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <path d="M0 150 H320 V180 H0 Z" fill={C.near} />
      <path d="M118 30 H202 V80 C202 114 184 136 160 146 C136 136 118 114 118 80 Z" fill={C.mid} stroke={C.gilt} strokeWidth="3" />
      <path d="M118 30 H202 V54 H118 Z" fill={C.far} />
      <text x="160" y="112" textAnchor="middle" fontFamily="Alegreya SC, Georgia, serif" fontSize="48" fill={C.gilt}>?</text>
      <path d="M96 150 L110 120 M224 150 L210 120" stroke={C.far} strokeWidth="4" />
    </Frame>
  )
}

/** A crown on a cushion: rankings and winners. */
export function CrownArt({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <path d="M0 150 H320 V180 H0 Z" fill={C.near} />
      <path d="M100 140 C100 124 120 118 160 118 C200 118 220 124 220 140 C220 150 100 150 100 140 Z" fill={C.wax} />
      <path d="M124 116 L118 68 L140 90 L160 56 L180 90 L202 68 L196 116 Z" fill={C.gilt} />
      <circle cx="118" cy="66" r="5" fill={C.gilt} />
      <circle cx="160" cy="53" r="6" fill={C.gilt} />
      <circle cx="202" cy="66" r="5" fill={C.gilt} />
      <path d="M126 104 H194" stroke={C.near} strokeWidth="2" />
      <circle cx="160" cy="96" r="5" fill={C.wax} />
    </Frame>
  )
}

const ARTS = { castle: CastleArt, raven: RavenArt, archive: ArchiveArt, ship: ShipArt, wyrm: WyrmArt, hood: HoodArt, shield: ShieldArt, crown: CrownArt }

export function Art({ name, className = '' }: { name: ArtName; className?: string }) {
  const A = ARTS[name]
  return <A className={className} />
}
