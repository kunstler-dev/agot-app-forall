import { useMemo } from 'react'

import { crestSvg, type CrestSpec } from '../lib/heraldry'

export function Crest({ spec, size = 64, blur = 0, className = '' }: { spec: CrestSpec | null | undefined; size?: number; blur?: number; className?: string }) {
  const html = useMemo(() => (spec ? crestSvg(spec, { blur }) : ''), [spec, blur])
  if (!spec) return <div style={{ width: size, height: size * 1.185 }} className={`rounded-b-[40%] bg-surface-2 ${className}`} />
  return (
    <div
      className={`shrink-0 [&>svg]:h-full [&>svg]:w-full ${className}`}
      style={{ width: size, height: size * 1.185 }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
