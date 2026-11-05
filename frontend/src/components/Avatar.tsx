/** A medallion: a round frame with a thin inner ring (the only round shape besides radio buttons). */
export function Avatar({ name, url, size = 40 }: { name: string; url?: string | null; size?: number }) {
  const letter = (name || '?').trim().charAt(0).toUpperCase()
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center rounded-full border border-rule-strong p-[3px]" style={{ width: size, height: size }}>
      {url ? (
        <img src={url} alt="" className="h-full w-full rounded-full object-cover grayscale-[35%] sepia-[20%]" />
      ) : (
        <span className="sc flex h-full w-full items-center justify-center rounded-full border border-rule text-gilt" style={{ fontSize: size * 0.42 }}>
          {letter}
        </span>
      )}
    </span>
  )
}
