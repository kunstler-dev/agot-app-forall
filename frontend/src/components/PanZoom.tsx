import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

export type View = { scale: number; x: number; y: number }

/**
 * Pinch-zoom and pan for a fixed-size content box (map units). One finger pans, two fingers zoom
 * around their midpoint, a wheel zooms on desktop, double tap zooms in. `onTap` gets map coordinates.
 */
export function PanZoom({
  width,
  height,
  children,
  overlay,
  onTap,
  maxZoom = 5,
}: {
  width: number
  height: number
  children: ReactNode
  overlay: (v: View) => ReactNode
  onTap?: (x: number, y: number) => void
  maxZoom?: number
}) {
  const box = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<View>({ scale: 0, x: 0, y: 0 })
  const viewRef = useRef(view)
  useEffect(() => {
    viewRef.current = view
  }, [view])
  const fit = useRef(1)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<{ dist: number; moved: number; start: { x: number; y: number }; lastTap: number }>({ dist: 0, moved: 0, start: { x: 0, y: 0 }, lastTap: 0 })

  const clamp = useCallback(
    (v: View): View => {
      const el = box.current
      if (!el) return v
      const cw = el.clientWidth
      const ch = el.clientHeight
      const scale = Math.min(Math.max(v.scale, fit.current), fit.current * maxZoom)
      const w = width * scale
      const h = height * scale
      const x = w <= cw ? (cw - w) / 2 : Math.min(0, Math.max(cw - w, v.x))
      const y = h <= ch ? (ch - h) / 2 : Math.min(0, Math.max(ch - h, v.y))
      return { scale, x, y }
    },
    [width, height, maxZoom],
  )

  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const init = () => {
      // fill the width; slightly zoomed in so the map feels close
      fit.current = Math.min(el.clientWidth / width, el.clientHeight / height)
      const s = Math.max(el.clientWidth / width, el.clientHeight / height)
      setView(clamp({ scale: s, x: 0, y: -(height * s - el.clientHeight) / 2 }))
    }
    init()
    const ro = new ResizeObserver(init)
    ro.observe(el)
    return () => ro.disconnect()
  }, [width, height, clamp])

  const zoomAt = useCallback(
    (cx: number, cy: number, factor: number) => {
      setView((v) => {
        const scale = Math.min(Math.max(v.scale * factor, fit.current), fit.current * maxZoom)
        const k = scale / v.scale
        return clamp({ scale, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k })
      })
    },
    [clamp, maxZoom],
  )

  useEffect(() => {
    const el = box.current
    if (!el) return
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      const r = el.getBoundingClientRect()
      zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.15 : 1 / 1.15)
    }
    el.addEventListener('wheel', wheel, { passive: false })
    return () => el.removeEventListener('wheel', wheel)
  }, [zoomAt])

  function local(e: React.PointerEvent) {
    const r = box.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  function down(e: React.PointerEvent) {
    box.current!.setPointerCapture(e.pointerId)
    const p = local(e)
    pointers.current.set(e.pointerId, p)
    if (pointers.current.size === 1) gesture.current = { ...gesture.current, moved: 0, start: p }
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      gesture.current.dist = Math.hypot(a.x - b.x, a.y - b.y)
      gesture.current.moved = 99
    }
  }

  function move(e: React.PointerEvent) {
    const prev = pointers.current.get(e.pointerId)
    if (!prev) return
    const p = local(e)
    pointers.current.set(e.pointerId, p)
    if (pointers.current.size === 1) {
      gesture.current.moved += Math.abs(p.x - prev.x) + Math.abs(p.y - prev.y)
      setView((v) => clamp({ ...v, x: v.x + p.x - prev.x, y: v.y + p.y - prev.y }))
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      if (gesture.current.dist > 0) zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, dist / gesture.current.dist)
      gesture.current.dist = dist
    }
  }

  function up(e: React.PointerEvent) {
    const had = pointers.current.size
    pointers.current.delete(e.pointerId)
    if (had === 1 && gesture.current.moved < 8) {
      const p = local(e)
      const now = Date.now()
      if (now - gesture.current.lastTap < 280) {
        zoomAt(p.x, p.y, 1.8)
        gesture.current.lastTap = 0
        return
      }
      gesture.current.lastTap = now
      const v = viewRef.current
      onTap?.((p.x - v.x) / v.scale, (p.y - v.y) / v.scale)
    }
    if (pointers.current.size < 2) gesture.current.dist = 0
  }

  return (
    <div
      ref={box}
      className="relative h-full w-full touch-none overflow-hidden select-none"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      {view.scale > 0 && (
        <>
          <div
            className="absolute top-0 left-0 origin-top-left will-change-transform"
            style={{ width, height, transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})` }}
          >
            {children}
          </div>
          {overlay(view)}
          <div className="absolute right-3 bottom-3 flex flex-col gap-2">
            {[['+', 1.5], ['−', 1 / 1.5]].map(([l, f]) => (
              <button
                key={String(l)}
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => zoomAt(box.current!.clientWidth / 2, box.current!.clientHeight / 2, f as number)}
                className="press h-9 w-9 rounded-sm border border-[#2A2117] bg-[#EFE6D2] text-[20px] leading-none text-[#2A2117]"
              >
                {l}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
