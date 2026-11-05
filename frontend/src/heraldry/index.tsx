import { useMemo } from 'react'
import { crestImageUrl, renderBlazon, type Blazon } from './render'
import { useHeraldry } from './store'

export type { Blazon } from './render'

/** A crest. `engraved` draws it as an engraving (Petra Sancta hatching); used small and in reveals. */
export function Crest({ blazon, size = 64, engraved = false, fade = 1, className = '' }: { blazon: Blazon | null | undefined; size?: number; engraved?: boolean; fade?: number; className?: string }) {
  const lib = useHeraldry((s) => s.lib)
  const html = useMemo(() => (blazon ? renderBlazon(blazon, lib, { engraved, fade }) : ''), [blazon, lib, engraved, fade])
  const h = Math.round(size * 1.19)
  if (!blazon) return <div style={{ width: size, height: h }} className={`border border-rule ${className}`} />
  const img = crestImageUrl(blazon)
  if (img) return <img src={img} alt="" width={size} height={h} style={{ width: size, height: h, opacity: fade }} className={`shrink-0 object-contain ${engraved ? 'grayscale' : ''} ${className}`} />
  return <div className={`shrink-0  ${className}`} style={{ width: size, height: h }} dangerouslySetInnerHTML={{ __html: html }} />
}
