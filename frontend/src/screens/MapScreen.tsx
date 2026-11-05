import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useCallback, useMemo, useState } from 'react'

import { PanZoom, type View } from '../components/PanZoom'
import { Button, Radio, Rubric, Sheet, Skeleton } from '../components/ui'
import { Crest } from '../heraldry'
import { heraldryLib } from '../heraldry/store'
import { blazonDataUrl, crestImageUrl } from '../heraldry/render'
import { Icon } from '../icons'
import { api, errorText, type GeoSession, type HousePin, type MapLocation, type WorldMap } from '../lib/api'
import { shareResult } from '../lib/share'
import { haptic, hapticResult } from '../lib/telegram'
import { t } from '../lib/texts'
import { useToast } from '../lib/toast'
import { houseById, useApp } from '../store/app'
import { Leaderboard } from './PredictionsScreen'
import { ease, roman } from '../lib/format'

const INK = 'var(--map-ink)'
const PAPER = 'var(--map-paper)'

/** Settlement marks in the manner of engraved maps, drawn at screen size. */
function Mark({ kind, major, x, y, on }: { kind: string; major: boolean; x: number; y: number; on: boolean }) {
  const sw = on ? 1.8 : 1.3
  const fill = on ? '#B8322A' : PAPER
  switch (kind) {
    case 'castle':
      return major ? (
        <g transform={`translate(${x} ${y})`} stroke={INK} strokeWidth={sw} fill={fill}>
          <path d="M-8 5 V-3 H-6 V-6 H-4 V-3 H-1 V-8 H1 V-3 H4 V-6 H6 V-3 H8 V5 Z" />
        </g>
      ) : (
        <g transform={`translate(${x} ${y})`} stroke={INK} strokeWidth={sw} fill={fill}>
          <path d="M-4 5 V-4 H-2.5 V-6 H-0.8 V-4 H0.8 V-6 H2.5 V-4 H4 V5 Z" />
        </g>
      )
    case 'city':
      return (
        <g stroke={INK} strokeWidth={sw} fill={fill}>
          <circle cx={x} cy={y} r={major ? 5.5 : 4} />
          {major && <circle cx={x} cy={y} r={2.4} fill="none" />}
          <circle cx={x} cy={y} r={1} fill={INK} stroke="none" />
        </g>
      )
    case 'ruin':
      return <path d={`M${x - 4.5} ${y - 1.5} A4.8 4.8 0 0 1 ${x + 2} ${y - 4.4} M${x + 4.6} ${y + 1} A4.8 4.8 0 0 1 ${x - 2.5} ${y + 4.2}`} stroke={INK} strokeWidth={sw} fill="none" />
    case 'island':
      return <circle cx={x} cy={y} r={3.5} stroke={INK} strokeWidth={sw} fill={fill} />
    default:
      return <path d={`M${x} ${y - 5} L${x + 4.5} ${y + 3.5} L${x - 4.5} ${y + 3.5} Z`} stroke={INK} strokeWidth={sw} fill={fill} />
  }
}

function Places({ v, data, selected, onPick, hide, path }: {
  v: View
  data: WorldMap
  selected: string | null
  onPick: (l: MapLocation) => void
  hide: boolean
  path: string | null
}) {
  const base = useMemo(() => Math.min(window.innerWidth / data.map.width, 1), [data.map.width])
  const zoom = v.scale / base
  const byId = useMemo(() => Object.fromEntries(data.locations.map((l) => [l.id, l])), [data.locations])
  const p = data.paths.find((x) => x.character === path)
  const pts = p?.stops.map((s) => byId[s.location]).filter(Boolean) ?? []
  const sx = (x: number) => v.x + x * v.scale
  const sy = (y: number) => v.y + y * v.scale
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full">
      {/* places beyond the spoiler level: a blot of paper, no name */}
      {data.hidden.map((h, i) => (
        <ellipse key={i} cx={sx(h.x)} cy={sy(h.y)} rx={9} ry={6.5} fill={PAPER} stroke={INK} strokeOpacity={0.35} strokeWidth={0.8} transform={`rotate(${(i * 37) % 60 - 30} ${sx(h.x)} ${sy(h.y)})`} />
      ))}
      {pts.length > 1 && (
        <g>
          <polyline points={pts.map((l) => `${sx(l.x)},${sy(l.y)}`).join(' ')} fill="none" stroke="#B8322A" strokeWidth={2} strokeDasharray="6 4" strokeLinejoin="round" />
          {pts.map((l, i) => {
            const n = pts[i + 1] ?? pts[i - 1]
            const a = Math.atan2(sy(n.y) - sy(l.y), sx(n.x) - sx(l.x)) + Math.PI / 2
            return (
              <g key={`${l.id}${i}`}>
                <line x1={sx(l.x) - 6 * Math.cos(a)} y1={sy(l.y) - 6 * Math.sin(a)} x2={sx(l.x) + 6 * Math.cos(a)} y2={sy(l.y) + 6 * Math.sin(a)} stroke="#B8322A" strokeWidth={2} />
                <text x={sx(l.x) + 9} y={sy(l.y) - 7} fontSize={11} fontStyle="italic" fill="#B8322A" stroke={PAPER} strokeWidth={3} paintOrder="stroke" fontFamily="Alegreya, Georgia, serif">{roman(i + 1)}</text>
              </g>
            )
          })}
        </g>
      )}
      {!hide && data.locations.map((l) => {
        const show = l.rank === 1 || (l.rank === 2 && zoom > 1.5) || (l.rank === 3 && zoom > 2.4)
        const on = selected === l.id
        const x = sx(l.x)
        const y = sy(l.y)
        return (
          <g key={l.id} className="pointer-events-auto cursor-pointer" onPointerUp={(e) => { e.stopPropagation(); onPick(l) }} onPointerDown={(e) => e.stopPropagation()}>
            <circle cx={x} cy={y} r={16} fill="transparent" />
            {(show || on) && <Mark kind={l.kind} major={l.rank === 1} x={x} y={y} on={on} />}
            {!show && !on && <circle cx={x} cy={y} r={1.6} fill={INK} />}
            {(show || on) && (
              <text x={x + 9} y={y + 4} fontSize={l.rank === 1 ? 14 : 12.5} fontStyle={l.kind === 'castle' ? 'normal' : 'italic'} fill={INK} stroke={PAPER} strokeWidth={3} paintOrder="stroke" fontFamily="Alegreya, Georgia, serif">
                {l.name}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

function HouseLayer({ v, data, onPick }: { v: View; data: WorldMap; onPick: (h: HousePin) => void }) {
  const sx = (x: number) => v.x + x * v.scale
  const sy = (y: number) => v.y + y * v.scale
  const max = Math.max(1, ...data.houses.items.map((h) => h.count))
  const urls = useMemo(() => Object.fromEntries(data.houses.items.map((h) => [h.house, crestImageUrl(h.crest) ?? blazonDataUrl(h.crest, heraldryLib(), { engraved: !h.count })])), [data.houses.items])
  const seen: Record<string, number> = {}
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full">
      {[...data.houses.items].reverse().map((h) => {
        const k = (seen[h.location] = (seen[h.location] ?? -1) + 1)
        const w = 22 + Math.round(20 * Math.sqrt(h.count / max))
        const x = sx(h.x) + k * (w * 0.72)
        const y = sy(h.y)
        const mine = data.my_house === h.house
        return (
          <g key={h.house} className="pointer-events-auto cursor-pointer" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => { e.stopPropagation(); onPick(h) }}>
            <image href={urls[h.house]} x={x - w / 2} y={y - w * 1.19} width={w} height={w * 1.19} />
            <text x={x} y={y + 13} textAnchor="middle" fontSize={12} fontWeight={700} fill={mine ? '#B8322A' : INK} stroke={PAPER} strokeWidth={3} paintOrder="stroke" fontFamily="Alegreya, Georgia, serif" style={{ fontVariantNumeric: 'lining-nums' }}>
              {h.count}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/** The player's mark is a pen cross, the answer a circle, a thin line between them. */
function GeoOverlay({ v, guess, result, leagues }: { v: View; guess: { x: number; y: number } | null; result: GeoSession['last'] | null; leagues: number }) {
  const sx = (x: number) => v.x + x * v.scale
  const sy = (y: number) => v.y + y * v.scale
  const cross = (x: number, y: number) => (
    <g stroke="#B8322A" strokeWidth={2.2} strokeLinecap="round">
      <path d={`M${x - 7} ${y - 6} L${x + 6} ${y + 7} M${x + 7} ${y - 7} L${x - 6} ${y + 6}`} />
    </g>
  )
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full">
      {result && (
        <>
          <line x1={sx(result.x)} y1={sy(result.y)} x2={sx(result.answer.x)} y2={sy(result.answer.y)} stroke={INK} strokeWidth={1} strokeDasharray="2 3" />
          <circle cx={sx(result.answer.x)} cy={sy(result.answer.y)} r={7} fill="none" stroke={INK} strokeWidth={1.8} />
          <circle cx={sx(result.answer.x)} cy={sy(result.answer.y)} r={1.6} fill={INK} />
          <text x={(sx(result.x) + sx(result.answer.x)) / 2 + 6} y={(sy(result.y) + sy(result.answer.y)) / 2} fontSize={12} fontStyle="italic" fill={INK} stroke={PAPER} strokeWidth={3} paintOrder="stroke" fontFamily="Alegreya, Georgia, serif">
            {Math.round(result.distance * leagues)} лиг
          </text>
          <text x={sx(result.answer.x) + 10} y={sy(result.answer.y) + 4} fontSize={13} fill={INK} stroke={PAPER} strokeWidth={3} paintOrder="stroke" fontFamily="Alegreya, Georgia, serif">{result.answer.name}</text>
        </>
      )}
      {(guess || result) && cross(sx((result ?? guess)!.x), sy((result ?? guess)!.y))}
    </svg>
  )
}

function SpoilerSheet({ open, onClose, level, onChange }: { open: boolean; onClose: () => void; level: number; onChange: (l: number) => void }) {
  const cfg = useApp((s) => s.config)!
  return (
    <Sheet open={open} onClose={onClose} title="Без спойлеров">
      <p className="mt-0 text-sm text-ink-muted">{t('map.spoiler')} Всё, что случилось позже, закрыто пятном.</p>
      <ul className="m-0 list-none p-0">
        {cfg.tenant.spoiler_levels.map((l) => (
          <li key={l.level} className="rule-b">
            <button type="button" onClick={() => { haptic('light'); onChange(l.level) }} className="press flex w-full items-start gap-3 py-3 text-left">
              <span className="mt-1"><Radio on={l.level === level} /></span>
              <span className="flex-1">
                <span className="block">{l.label}</span>
                {l.hint && <span className="block text-sm text-ink-muted">{l.hint}</span>}
              </span>
              <span className="sc text-xs text-ink-muted">{roman(l.level)}</span>
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}

function GeoPanel({ session, guess, showingResult, onConfirm, onNext, onClose, busy }: {
  session: GeoSession
  guess: { x: number; y: number } | null
  showingResult: boolean
  onConfirm: () => void
  onNext: () => void
  onClose: () => void
  busy: boolean
}) {
  const last = session.last ?? null
  return (
    <div className="absolute inset-x-0 top-0 z-10 bg-paper-2 px-4 pt-3 pb-3 safe-top double-rule-b">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="sc text-xs text-ink-muted">{t('geo.title')}{session.mode === 'daily' ? ', раунд дня' : ''}</span>
        <span className="num flex items-center gap-3 text-xs text-ink-muted">
          {roman(Math.min(session.round + (showingResult ? 0 : 1), session.rounds))} из {roman(session.rounds)}, {session.total} очк.
          <button type="button" aria-label="Закрыть" onClick={onClose}><Icon name="cross" size={18} /></button>
        </span>
      </div>
      {showingResult && last ? (
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <div className="sc text-base">{last.answer.name}</div>
            <div className="text-sm italic text-ink-muted">{last.score >= session.max_score ? 'Точно в цель.' : 'Отмечено на карте.'}</div>
          </div>
          <div className="num text-lg text-gilt">+{last.score}</div>
        </div>
      ) : session.clue ? (
        <div className="flex items-start gap-3">
          {session.clue.crest && <Crest blazon={session.clue.crest} size={34} engraved />}
          <p className="m-0 text-base italic leading-snug">{session.clue.text}</p>
        </div>
      ) : null}
      <div className="mt-3">
        {showingResult ? (session.finished ? null : <Button onClick={onNext} className="w-full">Следующая запись</Button>)
          : <Button onClick={onConfirm} disabled={!guess || busy} className="w-full">{guess ? 'Отметить здесь' : 'Коснитесь карты'}</Button>}
      </div>
    </div>
  )
}

function MapButton({ icon, label, on, onClick }: { icon: 'shield' | 'quill' | 'compass'; label: string; on?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`press flex items-center gap-1.5 border-b-2 pb-1 ${on ? 'border-ink text-ink' : 'border-transparent text-ink-muted'}`}>
      <Icon name={icon} size={18} />
      <span className="sc text-xs">{label}</span>
    </button>
  )
}

export function MapScreen() {
  const cfg = useApp((s) => s.config)!
  const me = useApp((s) => s.me)!
  const patchUser = useApp((s) => s.patchUser)
  const toast = useToast((s) => s.show)
  const qc = useQueryClient()
  const level = me.user.spoiler_level ?? cfg.tenant.spoiler_levels.at(-1)!.level
  const q = useQuery({ queryKey: ['map', level], queryFn: () => api.map(level) })
  const [sel, setSel] = useState<MapLocation | null>(null)
  const [spoilerOpen, setSpoilerOpen] = useState(false)
  const [pathsOpen, setPathsOpen] = useState(false)
  const [geoMenu, setGeoMenu] = useState(false)
  const [path, setPath] = useState<string | null>(null)
  const [housesOn, setHousesOn] = useState(false)
  const [house, setHouse] = useState<HousePin | null>(null)
  const [geo, setGeo] = useState<GeoSession | null>(null)
  const [guess, setGuess] = useState<{ x: number; y: number } | null>(null)
  const [phase, setPhase] = useState<'aim' | 'result'>('aim')
  const [finishOpen, setFinishOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const geoDaily = useQuery({ queryKey: ['geoDaily'], queryFn: api.geoDaily, enabled: geoMenu || finishOpen })
  const leagues = cfg.tenant.geo.leagues_per_unit ?? 1

  async function changeLevel(l: number) {
    patchUser({ spoiler_level: l })
    await api.settings({ spoiler_level: l })
    setPath(null)
  }

  async function startGeo(mode: 'practice' | 'daily') {
    setGeoMenu(false)
    try {
      const s = await api.geoStart(mode)
      if (s.finished) {
        setGeo(s)
        setFinishOpen(true)
        return
      }
      setSel(null)
      setPath(null)
      setGuess(null)
      setPhase('aim')
      setGeo({ ...s, last: undefined })
    } catch (e) {
      toast(errorText(e))
    }
  }

  async function confirm() {
    if (!geo || !guess) return
    setBusy(true)
    try {
      const s = await api.geoGuess(geo.id, guess.x, guess.y)
      hapticResult(s.last && s.last.score > geo.max_score * 0.6 ? 'success' : 'warning')
      setGeo(s)
      setGuess(null)
      setPhase('result')
      if (s.finished) {
        qc.invalidateQueries({ queryKey: ['geoDaily'] })
        setTimeout(() => setFinishOpen(true), 1200)
      }
    } catch (e) {
      toast(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  const aiming = !!geo && phase === 'aim' && !geo.finished
  const onTap = useCallback((x: number, y: number) => {
    if (!aiming) return
    haptic('light')
    setGuess({ x, y })
  }, [aiming])

  const data = q.data
  const showGeoPanel = !!geo && (!geo.finished || phase === 'result') && !finishOpen

  return (
    <div className="relative flex h-full flex-col">
      {!showGeoPanel && (
        <div className="double-rule-b relative z-10 bg-paper px-4 pt-3 pb-2 safe-top">
          <div className="flex items-baseline justify-between">
            <h1 className="sc m-0 text-lg font-medium">{t('map.title')}</h1>
            <button type="button" onClick={() => setSpoilerOpen(true)} className="flex items-center gap-1 text-sm italic text-ink-muted">
              <Icon name="lock" size={15} /> до: {cfg.tenant.spoiler_levels.find((l) => l.level === level)?.label}
            </button>
          </div>
          <div className="mt-2 flex gap-5">
            <MapButton icon="shield" label="Дома" on={housesOn} onClick={() => { haptic('light'); setHousesOn(!housesOn) }} />
            <MapButton icon="quill" label="Пути" on={!!path} onClick={() => setPathsOpen(true)} />
            <MapButton icon="compass" label="Где это?" onClick={() => setGeoMenu(true)} />
            {housesOn && data && <span className="num ml-auto self-center text-xs text-ink-muted">в домах: {data.houses.total}</span>}
            {path && data && !housesOn && (
              <button type="button" onClick={() => setPath(null)} className="ml-auto self-center text-xs italic text-wax">
                {data.paths.find((p) => p.character === path)?.name} ×
              </button>
            )}
          </div>
        </div>
      )}
      <div className="map-surface relative min-h-0 flex-1">
        {!data ? (
          <div className="p-5"><Skeleton lines={6} /></div>
        ) : (
          <PanZoom
            width={data.map.width}
            height={data.map.height}
            onTap={onTap}
            overlay={(v) => (
              <>
                <Places v={v} data={data} selected={sel?.id ?? null} onPick={(l) => { haptic('light'); setSel(l) }} hide={!!geo || housesOn} path={path} />
                {housesOn && !geo && <HouseLayer v={v} data={data} onPick={(h) => { haptic('light'); setHouse(h) }} />}
                {geo && <GeoOverlay v={v} guess={aiming ? guess : null} result={phase === 'result' ? geo.last ?? null : null} leagues={leagues} />}
              </>
            )}
          >
            <img src="/api/content/map" width={data.map.width} height={data.map.height} alt={data.map.title} draggable={false} className="pointer-events-none block max-w-none" />
          </PanZoom>
        )}
        {showGeoPanel && geo && (
          <GeoPanel session={geo} guess={guess} showingResult={phase === 'result'} busy={busy} onConfirm={confirm}
            onNext={() => setPhase('aim')} onClose={() => { setGeo(null); setGuess(null) }} />
        )}
      </div>

      <Sheet open={!!sel} onClose={() => setSel(null)} title={sel?.name}>
        {sel && (
          <div className="flex flex-col gap-4">
            {sel.region && <div className="sc -mt-2 text-xs text-ink-muted">{sel.region}</div>}
            {sel.description && <p className="dropcap m-0">{sel.description}</p>}
            {sel.houses.length > 0 && (
              <section>
                <Rubric>Дома</Rubric>
                {sel.houses.map((h) => (
                  <div key={h.id} className="rule-b flex items-center gap-3 py-2">
                    <Crest blazon={houseById(cfg, h.id)?.crest} size={22} />
                    <span>{h.name}</span>
                  </div>
                ))}
              </section>
            )}
            {sel.characters.length > 0 && (
              <section>
                <Rubric>Персонажи</Rubric>
                {sel.characters.map((c) => {
                  const hasPath = data?.paths.some((p) => p.character === c.id)
                  return (
                    <button key={c.id} type="button" disabled={!hasPath} onClick={() => { setPath(c.id); setSel(null) }} className="rule-b flex w-full items-baseline justify-between py-2 text-left">
                      <span>{c.name}</span>
                      {hasPath && <span className="text-sm italic text-wax">показать путь</span>}
                    </button>
                  )
                })}
              </section>
            )}
          </div>
        )}
      </Sheet>

      <Sheet open={!!house} onClose={() => setHouse(null)} title={house?.name}>
        {house && data && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <Crest blazon={house.crest} size={60} />
              <div>
                {house.words && <p className="m-0 italic text-ink-muted">«{house.words}»</p>}
                <p className="num m-0">{house.count} игроков, {house.pct}% от всех домов</p>
              </div>
            </div>
            <section>
              <Rubric>Дома канала</Rubric>
              <table className="num w-full border-collapse">
                <tbody>
                  {data.houses.items.filter((h) => h.count > 0).slice(0, 10).map((h, i) => (
                    <tr key={h.house} className="rule-b">
                      <td className={`w-8 py-1.5 ${i < 3 ? 'sc text-gilt' : 'text-ink-muted'}`}>{roman(i + 1)}</td>
                      <td className="py-1.5"><span className="flex items-center gap-2"><Crest blazon={h.crest} size={16} engraved />{h.name}{h.house === data.my_house ? ', ваш' : ''}</span></td>
                      <td className="py-1.5 text-right">{h.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.houses.total === 0 && <p className="text-sm italic text-ink-muted">Тест ещё никто не прошёл.</p>}
            </section>
          </div>
        )}
      </Sheet>

      <Sheet open={pathsOpen} onClose={() => setPathsOpen(false)} title="Пути персонажей">
        {data && data.paths.length === 0 ? <p className="text-sm italic text-ink-muted">На этом уровне спойлеров путей нет.</p> : (
          <ul className="m-0 list-none p-0">
            {data?.paths.map((p) => (
              <li key={p.character} className="rule-b">
                <button type="button" onClick={() => { setPath(p.character); setPathsOpen(false) }} className="press flex w-full items-baseline justify-between py-2.5 text-left">
                  <span className={path === p.character ? 'text-wax' : ''}>{p.name}</span>
                  <span className="num text-sm text-ink-muted">{p.stops.length} мест</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Sheet>

      <Sheet open={geoMenu} onClose={() => setGeoMenu(false)} title={t('geo.title')}>
        <p className="mt-0 text-sm text-ink-muted">{t('geo.subtitle')}</p>
        <div className="flex flex-col items-start gap-3">
          <Button onClick={() => startGeo('daily')} className="w-full">{geoDaily.data?.session?.finished ? 'Итог дня' : 'Раунд дня'}</Button>
          <Button kind="secondary" onClick={() => startGeo('practice')} className="w-full">Тренировка, {cfg.tenant.geo.rounds} записей</Button>
        </div>
        {geoDaily.data && geoDaily.data.top.length > 0 && (
          <div className="mt-5">
            <Rubric>Лучшие сегодня</Rubric>
            <Leaderboard data={{ period: 'day', scope: 'geo', season_label: '', top: geoDaily.data.top.slice(0, 5), me: { rank: null, points: geoDaily.data.session?.total ?? 0 } }} emptyText="" />
          </div>
        )}
      </Sheet>

      <Sheet open={finishOpen} onClose={() => { setFinishOpen(false); setGeo(null) }} title="Итог">
        {geo && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={ease} className="flex flex-col gap-4">
            <p className="num m-0 text-xl">{geo.total} <span className="text-base text-ink-muted">из {geo.max_score * geo.rounds}</span></p>
            <table className="num w-full border-collapse">
              <tbody>
                {geo.results.map((r, i) => (
                  <tr key={i} className="rule-b">
                    <td className="w-8 py-1.5 text-ink-muted">{roman(i + 1)}</td>
                    <td className="py-1.5">{r.answer.name}</td>
                    <td className="py-1.5 text-right text-sm text-ink-muted">{Math.round(r.distance * leagues)} лиг</td>
                    <td className="w-12 py-1.5 text-right">+{r.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Button kind="secondary" icon="seal" onClick={async () => shareResult('share_geo', (await api.geoShare(geo.id)).text)}>Отправить</Button>
            {geo.mode === 'daily' && geoDaily.data && <Leaderboard data={{ period: 'day', scope: 'geo', season_label: '', top: geoDaily.data.top, me: { rank: null, points: geo.total } }} emptyText="" />}
            <Button kind="link" onClick={() => { setFinishOpen(false); setGeo(null) }}>К карте</Button>
          </motion.div>
        )}
      </Sheet>

      <SpoilerSheet open={spoilerOpen} onClose={() => setSpoilerOpen(false)} level={level} onChange={async (l) => { await changeLevel(l); setSpoilerOpen(false) }} />
    </div>
  )
}
