// The Stella Nova Labs mark as a React component (same geometry as brand/stella-nova-mark.svg).

function sparkle(cx: number, cy: number, r: number, waist: number) {
  const w = r * waist
  return `M${cx},${cy - r} C${cx + w * 0.25},${cy - w} ${cx + w},${cy - w * 0.25} ${cx + r},${cy} C${cx + w},${cy + w * 0.25} ${cx + w * 0.25},${cy + w} ${cx},${cy + r} C${cx - w * 0.25},${cy + w} ${cx - w},${cy + w * 0.25} ${cx - r},${cy} C${cx - w},${cy - w * 0.25} ${cx - w * 0.25},${cy - w} ${cx},${cy - r} Z`
}

export function NovaMark({ size = 40, glow = true, className = '' }: { size?: number; glow?: boolean; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" className={className} aria-label="Stella Nova Labs">
      <defs>
        <radialGradient id="nm-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F4C95D" stopOpacity="0.55" />
          <stop offset="45%" stopColor="#8B7CFF" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#8B7CFF" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="nm-ray" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFF4D6" />
          <stop offset="55%" stopColor="#F4C95D" />
          <stop offset="100%" stopColor="#C9962E" />
        </linearGradient>
      </defs>
      {glow && <circle cx="64" cy="64" r="62" fill="url(#nm-glow)" />}
      <path d={sparkle(64, 64, 32, 0.16)} fill="#8B7CFF" opacity="0.9" transform="rotate(45 64 64)" />
      <path d={sparkle(64, 64, 57, 0.17)} fill="url(#nm-ray)" />
      <circle cx="64" cy="64" r="4.3" fill="#fff" />
    </svg>
  )
}

export function MadeBy({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-2 text-[11px] tracking-[0.18em] text-dim ${className}`}>
      <NovaMark size={18} glow={false} />
      <span className="font-brand">MADE BY STELLA NOVA LABS</span>
    </div>
  )
}
