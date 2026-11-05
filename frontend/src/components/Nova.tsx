// The Stella Nova Labs mark as an engraving: thin ink lines, flat, no halo.
// Same geometry as brand/stella-nova-mark.svg.

const LONG = 'M64 8 L69 59 L120 64 L69 69 L64 120 L59 69 L8 64 L59 59 Z'
const SHORT = 'M64 30 L67 61 L98 64 L67 67 L64 98 L61 67 L30 64 L61 61 Z'

export function NovaMark({ size = 40, draw = false, className = '' }: { size?: number; draw?: boolean; className?: string }) {
  const anim = draw ? { strokeDasharray: 520, strokeDashoffset: 520, animation: 'nova-draw 0.75s ease-out forwards' } : undefined
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" fill="none" stroke="currentColor" className={className} aria-label="Stella Nova Labs">
      <path d={LONG} strokeWidth="2.2" strokeLinejoin="miter" style={anim} />
      <path d={SHORT} strokeWidth="1.4" transform="rotate(45 64 64)" style={anim} />
      <circle cx="64" cy="64" r="3.2" fill="currentColor" stroke="none" />
      <circle cx="64" cy="64" r="16" strokeWidth="0.8" strokeDasharray="1.5 3.5" />
    </svg>
  )
}

export function MadeBy({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 text-ink-muted ${className}`}>
      <NovaMark size={16} />
      <span className="sc text-xs">Made by Stella Nova Labs</span>
    </div>
  )
}
