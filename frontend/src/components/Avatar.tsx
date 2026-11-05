export function Avatar({ name, url, size = 40 }: { name: string; url?: string | null; size?: number }) {
  const letter = (name || '?').trim().charAt(0).toUpperCase()
  if (url) return <img src={url} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-surface-3 to-line font-display font-bold text-gold"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {letter}
    </div>
  )
}
