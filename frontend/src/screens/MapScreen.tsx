import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useMemo, useState } from 'react'

import { Crest } from '../components/Crest'
import { Icon } from '../components/icons'
import { PanZoom, type View } from '../components/PanZoom'
import { Button, Card, Pill, Sheet, Skeleton } from '../components/ui'
import { api, errorText, type GeoSession, type HousePin, type MapLocation, type WorldMap } from '../lib/api'
import { crestDataUrl } from '../lib/heraldry'
import { shareResult } from '../lib/share'
import { haptic, hapticResult } from '../lib/telegram'
import { t } from '../lib/texts'
import { houseById, useApp } from '../store/app'
import { Leaderboard } from './PredictionsScreen'
import { useToast } from '../lib/toast'

const KIND_ICON: Record<string, string> = { castle: '♜', city: '◆', ruin: '✶', landmark: '▲', region: '•', sea: '≈', island: '◒' }

function Pins({ v, data, selected, onPick, hidePins, path }: {
  v: View
  data: WorldMap
  selected: string | null
  onPick: (l: MapLocation) => void
  hidePins: boolean
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
      {pts.length > 1 && (
        <g>
          <polyline points={pts.map((l) => `${sx(l.x)},${sy(l.y)}`).join(' ')} fill="none" stroke="#8B7CFF" strokeWidth={4} strokeLinejoin="round" strokeDasharray="2 8" strokeLinecap="round" />
          {pts.map((l, i) => (
            <g key={`${l.id}${i}`}>
              <circle cx={sx(l.x)} cy={sy(l.y)} r={11} fill="#8B7CFF" stroke="#fff" strokeWidth={2} />
              <text x={sx(l.x)} y={sy(l.y) + 4} textAnchor="middle" fontSize={11} fontWeight={800} fill="#fff">{i + 1}</text>
            </g>
          ))}
        </g>
      )}
      {!hidePins &&
        data.locations.map((l) => {
          const show = l.rank === 1 || (l.rank === 2 && zoom > 1.5) || (l.rank === 3 && zoom > 2.4)
          const on = selected === l.id
          return (
            <g key={l.id} className="pointer-events-auto cursor-pointer" onPointerUp={(e) => { e.stopPropagation(); onPick(l) }} onPointerDown={(e) => e.stopPropagation()}>
              <circle cx={sx(l.x)} cy={sy(l.y)} r={16} fill="transparent" />
              <circle cx={sx(l.x)} cy={sy(l.y)} r={on ? 8 : 6} fill={on ? '#F4C95D' : '#3b2a1a'} stroke={on ? '#fff' : '#F4C95D'} strokeWidth={2} />
              {show && (
                <text x={sx(l.x)} y={sy(l.y) - 12} textAnchor="middle" fontSize={l.rank === 1 ? 14 : 12} fontWeight={700} fontFamily="'Cormorant Garamond', Georgia, serif" fill="#2a1d10" stroke="#efe1bd" strokeWidth={3} paintOrder="stroke">
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
  const urls = useMemo(() => Object.fromEntries(data.houses.items.map((h) => [h.house, crestDataUrl(h.crest)])), [data.houses.items])
  // several houses can share a seat: fan them out a little
  const seen: Record<string, number> = {}
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full">
      {[...data.houses.items].reverse().map((h) => {
        const k = seen[h.location] = (seen[h.location] ?? -1) + 1
        const w = 26 + Math.round(22 * Math.sqrt(h.count / max))
        const x = sx(h.x) + k * (w * 0.7)
        const y = sy(h.y)
        const mine = data.my_house === h.house
        return (
          <g key={h.house} className="pointer-events-auto cursor-pointer" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => { e.stopPropagation(); onPick(h) }} opacity={h.count ? 1 : 0.55}>
            <image href={urls[h.house]} x={x - w / 2} y={y - w * 1.185} width={w} height={w * 1.185} />
            {mine && <circle cx={x} cy={y - w * 1.185 - 6} r={4} fill="#F4C95D" stroke="#fff" strokeWidth={1.5} />}
            <rect x={x - 17} y={y + 1} width={34} height={17} rx={8.5} fill={mine ? '#F4C95D' : '#0F1120'} stroke="#F4C95D" strokeWidth={1} />
            <text x={x} y={y + 13} textAnchor="middle" fontSize={11} fontWeight={800} fontFamily="Manrope, sans-serif" fill={mine ? '#06070D' : '#F1F2F8'}>{h.count}</text>
          </g>
        )
      })}
    </svg>
  )
}

function GeoOverlay({ v, guess, result }: { v: View; guess: { x: number; y: number } | null; result: GeoSession['last'] | null }) {
  const sx = (x: number) => v.x + x * v.scale
  const sy = (y: number) => v.y + y * v.scale
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full">
      {result && (
        <>
          <line x1={sx(result.x)} y1={sy(result.y)} x2={sx(result.answer.x)} y2={sy(result.answer.y)} stroke="#F4C95D" strokeWidth={2.5} strokeDasharray="6 6" />
          <circle cx={sx(result.answer.x)} cy={sy(result.answer.y)} r={10} fill="#4CB27A" stroke="#fff" strokeWidth={3} />
          <text x={sx(result.answer.x)} y={sy(result.answer.y) - 16} textAnchor="middle" fontSize={14} fontWeight={800} fontFamily="'Cormorant Garamond', Georgia, serif" fill="#2a1d10" stroke="#efe1bd" strokeWidth={3} paintOrder="stroke">{result.answer.name}</text>
        </>
      )}
      {(guess || result) && (
        <g transform={`translate(${sx((result ?? guess)!.x)} ${sy((result ?? guess)!.y)})`}>
          <path d="M0 0 C-10 -14 -12 -20 -12 -26 A12 12 0 1 1 12 -26 C12 -20 10 -14 0 0 Z" fill="#8B7CFF" stroke="#fff" strokeWidth={2.5} />
          <circle cx={0} cy={-26} r={4.5} fill="#fff" />
        </g>
      )}
    </svg>
  )
}

function SpoilerSheet({ open, onClose, level, onChange }: { open: boolean; onClose: () => void; level: number; onChange: (l: number) => void }) {
  const cfg = useApp((s) => s.config)!
  const levels = cfg.tenant.spoiler_levels
  return (
    <Sheet open={open} onClose={onClose} title="Без спойлеров">
      <p className="mt-0 text-[13px] text-muted">{t('map.spoiler')} Всё, что случилось позже, скрыто на карте и в «Где это?».</p>
      <div className="flex flex-col gap-2">
        {levels.map((l) => (
          <button key={l.level} type="button" onClick={() => { haptic('light'); onChange(l.level) }}
            className={`press flex items-center gap-3 rounded-xl border px-4 py-3 text-left ${l.level === level ? 'border-gold bg-gold/10' : 'border-line-2 bg-surface-2'}`}>
            <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-extrabold ${l.level <= level ? 'bg-gold text-night' : 'bg-surface-3 text-dim'}`}>{l.level}</span>
            <span className="flex-1">
              <span className="block text-[15px] font-bold">{l.label}</span>
              {l.hint && <span className="block text-[12px] text-muted">{l.hint}</span>}
            </span>
            {l.level === level && <Icon name="check" className="text-gold" />}
          </button>
        ))}
      </div>
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
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-2 p-3 text-ink safe-top">
      <Card className="pointer-events-auto p-3.5">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[11px] font-bold tracking-[0.18em] text-gold uppercase">{t('geo.title')}{session.mode === 'daily' ? ' · день' : ''}</span>
          <span className="flex items-center gap-2 text-[12px] font-bold text-muted">
            {Math.min(session.round + (showingResult ? 0 : 1), session.rounds)}/{session.rounds} · {session.total} очк.
            <button type="button" aria-label="Закрыть" onClick={onClose} className="text-dim"><Icon name="close" size={18} /></button>
          </span>
        </div>
        {showingResult && last ? (
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-display text-[20px] font-bold">{last!.answer.name}</div>
              <div className="text-[12px] text-muted">{last!.score >= session.max_score ? 'В точку!' : `Промах на ${Math.round(last!.distance)} ед.`}</div>
            </div>
            <div className="text-[26px] font-extrabold text-gold">+{last!.score}</div>
          </div>
        ) : session.clue ? (
          <div className="flex items-start gap-3">
            {session.clue.crest && <Crest spec={session.clue.crest} size={40} />}
            <div className="font-display text-[18px] leading-snug">{session.clue.text}</div>
          </div>
        ) : null}
      </Card>
      <div className="pointer-events-auto">
        {showingResult ? (
          session.finished ? null : <Button onClick={onNext} className="w-full">Следующая зацепка</Button>
        ) : (
          <Button onClick={onConfirm} disabled={!guess || busy} className="w-full" icon="target">{guess ? 'Здесь!' : 'Коснись карты, чтобы поставить точку'}</Button>
        )}
      </div>
    </div>
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

  return (
    <div className="relative flex h-full flex-col">
      <div className="parchment relative min-h-0 flex-1">
        {!data ? (
          <div className="p-4"><Skeleton className="h-[60vh] opacity-40" /></div>
        ) : (
          <PanZoom
            width={data.map.width}
            height={data.map.height}
            onTap={onTap}
            overlay={(v) => (
              <>
                <Pins v={v} data={data} selected={sel?.id ?? null} onPick={(l) => { haptic('light'); setSel(l) }} hidePins={!!geo || housesOn} path={path} />
                {housesOn && !geo && <HouseLayer v={v} data={data} onPick={(h) => { haptic('light'); setHouse(h) }} />}
                {geo && <GeoOverlay v={v} guess={aiming ? guess : null} result={phase === 'result' ? geo.last ?? null : null} />}
              </>
            )}
          >
            <img src="/api/content/map.svg" width={data.map.width} height={data.map.height} alt={data.map.title} draggable={false} className="pointer-events-none block max-w-none" />
          </PanZoom>
        )}

        {geo && (!geo.finished || phase === 'result') && !finishOpen ? (
          <GeoPanel
            session={geo}
            guess={guess}
            showingResult={phase === 'result'}
            busy={busy}
            onConfirm={confirm}
            onNext={() => setPhase('aim')}
            onClose={() => { setGeo(null); setGuess(null) }}
          />
        ) : (
          <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col gap-2 p-3 text-ink safe-top">
            <div className="pointer-events-auto flex items-center gap-2">
              <div className="flex-1 rounded-2xl border border-line bg-surface/90 px-3.5 py-2 backdrop-blur">
                <div className="font-display text-[20px] leading-tight font-bold">{t('map.title')}</div>
                <button type="button" onClick={() => setSpoilerOpen(true)} className="flex items-center gap-1 text-[12px] font-bold text-gold">
                  <Icon name="eye" size={13} /> до: {cfg.tenant.spoiler_levels.find((l) => l.level === level)?.label}
                </button>
              </div>
              <button type="button" onClick={() => { haptic('light'); setHousesOn(!housesOn) }} className={`press flex h-[52px] w-[52px] flex-col items-center justify-center rounded-2xl border backdrop-blur ${housesOn ? 'border-gold bg-gold/20 text-ink' : 'border-line bg-surface/90 text-muted'}`}>
                <Icon name="shield" size={20} /><span className="text-[9px] font-bold">Дома</span>
              </button>
              <button type="button" onClick={() => setPathsOpen(true)} className={`press flex h-[52px] w-[52px] flex-col items-center justify-center rounded-2xl border backdrop-blur ${path ? 'border-nova bg-nova/20 text-ink' : 'border-line bg-surface/90 text-muted'}`}>
                <Icon name="route" size={20} /><span className="text-[9px] font-bold">Пути</span>
              </button>
              <button type="button" onClick={() => setGeoMenu(true)} className="press flex h-[52px] w-[52px] flex-col items-center justify-center rounded-2xl border border-gold bg-gold text-night shadow-[0_6px_20px_-6px_rgba(244,201,93,0.7)]">
                <Icon name="target" size={20} /><span className="text-[9px] font-bold">Где это?</span>
              </button>
            </div>
            {housesOn && data && (
              <div className="pointer-events-auto self-start">
                <Pill className="border-gold/60 bg-surface/90 backdrop-blur">
                  {data.houses.total ? `Игроков в домах: ${data.houses.total}` : 'Пока никто не прошёл тест'}
                </Pill>
              </div>
            )}
            {path && data && (
              <div className="pointer-events-auto self-start">
                <Pill className="border-nova/60 bg-surface/90 backdrop-blur">
                  Путь: {data.paths.find((p) => p.character === path)?.name}
                  <button type="button" onClick={() => setPath(null)} className="ml-1 text-dim"><Icon name="close" size={12} /></button>
                </Pill>
              </div>
            )}
          </div>
        )}
      </div>

      <Sheet open={!!sel} onClose={() => setSel(null)}>
        {sel && (
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <span className="mt-1 text-[22px] text-gold">{KIND_ICON[sel.kind] ?? '•'}</span>
              <div className="flex-1">
                <div className="font-display text-[28px] leading-tight font-bold">{sel.name}</div>
                {sel.region && <div className="text-[13px] text-muted">{sel.region}</div>}
              </div>
            </div>
            {sel.description && <p className="m-0 text-[15px] leading-relaxed">{sel.description}</p>}
            {sel.houses.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="text-[11px] font-bold tracking-[0.18em] text-dim uppercase">Дома</div>
                <div className="flex flex-wrap gap-2">
                  {sel.houses.map((h) => (
                    <span key={h.id} className="flex items-center gap-2 rounded-xl border border-line-2 bg-surface-2 py-1.5 pr-3 pl-1.5 text-[13px] font-bold">
                      <Crest spec={houseById(cfg, h.id)?.crest} size={22} /> {h.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {sel.characters.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="text-[11px] font-bold tracking-[0.18em] text-dim uppercase">Персонажи</div>
                <div className="flex flex-wrap gap-2">
                  {sel.characters.map((c) => {
                    const hasPath = data?.paths.some((p) => p.character === c.id)
                    return (
                      <button key={c.id} type="button" disabled={!hasPath} onClick={() => { setPath(c.id); setSel(null) }}
                        className={`rounded-xl border px-3 py-1.5 text-[13px] font-bold ${hasPath ? 'border-nova/60 bg-nova/10' : 'border-line-2 bg-surface-2'}`}>
                        {c.name}{hasPath ? ' · путь' : ''}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </Sheet>

      <Sheet open={!!house} onClose={() => setHouse(null)}>
        {house && data && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <Crest spec={house.crest} size={64} />
              <div className="flex-1">
                <div className="font-display text-[28px] leading-tight font-bold">{house.name}</div>
                {house.words && <div className="font-display text-[16px] italic text-gold">«{house.words}»</div>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <Card className="p-3"><div className="text-[26px] font-extrabold">{house.count}</div><div className="text-[11px] font-bold text-dim uppercase">игроков</div></Card>
              <Card className="p-3"><div className="text-[26px] font-extrabold text-gold">{house.pct}%</div><div className="text-[11px] font-bold text-dim uppercase">от всех домов</div></Card>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="text-[11px] font-bold tracking-[0.18em] text-dim uppercase">Рейтинг домов</div>
              {data.houses.items.filter((h) => h.count > 0).slice(0, 8).map((h, i) => (
                <div key={h.house} className={`flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 ${h.house === house.house ? 'bg-gold/10' : ''}`}>
                  <span className="w-5 text-center text-[13px] font-extrabold text-dim">{i + 1}</span>
                  <Crest spec={h.crest} size={20} />
                  <span className="flex-1 text-[14px] font-bold">{h.name}{h.house === data.my_house ? ' · ваш' : ''}</span>
                  <span className="text-[13px] font-extrabold text-gold">{h.count}</span>
                </div>
              ))}
              {data.houses.total === 0 && <div className="text-[13px] text-muted">Пройди тест «Какой ты дом?» в профиле — и твой голос появится на карте.</div>}
            </div>
          </div>
        )}
      </Sheet>

      <Sheet open={pathsOpen} onClose={() => setPathsOpen(false)} title="Пути персонажей">
        {data && data.paths.length === 0 ? (
          <p className="text-[13px] text-muted">На этом уровне спойлеров путей пока нет.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {data?.paths.map((p) => (
              <button key={p.character} type="button" onClick={() => { setPath(p.character); setPathsOpen(false) }}
                className={`press flex items-center justify-between rounded-xl border px-4 py-3 text-left ${path === p.character ? 'border-nova bg-nova/15' : 'border-line-2 bg-surface-2'}`}>
                <span className="text-[15px] font-bold">{p.name}</span>
                <span className="text-[12px] text-muted">{p.stops.length} мест</span>
              </button>
            ))}
          </div>
        )}
        <p className="mb-0 text-[12px] text-dim">Маршруты учитывают ползунок «без спойлеров».</p>
      </Sheet>

      <Sheet open={geoMenu} onClose={() => setGeoMenu(false)} title={t('geo.title')}>
        <p className="mt-0 text-[13px] text-muted">{t('geo.subtitle')}</p>
        <div className="flex flex-col gap-2.5">
          <Button onClick={() => startGeo('daily')} icon="today">{geoDaily.data?.session?.finished ? 'Итог дня и рейтинг' : 'Раунд дня · общий рейтинг'}</Button>
          <Button kind="secondary" onClick={() => startGeo('practice')} icon="target">Тренировка · {cfg.tenant.geo.rounds} зацепок</Button>
        </div>
        {geoDaily.data && geoDaily.data.top.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 text-[11px] font-bold tracking-[0.18em] text-dim uppercase">Лучшие сегодня</div>
            <Leaderboard data={{ period: 'day', scope: 'geo', season_label: '', top: geoDaily.data.top.slice(0, 5), me: { rank: null, points: geoDaily.data.session?.total ?? 0 } }} emptyText="" />
          </div>
        )}
      </Sheet>

      <Sheet open={finishOpen} onClose={() => { setFinishOpen(false); setGeo(null) }} title="Итог раунда">
        <AnimatePresence>
          {geo && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-3">
              <div className="flex items-end justify-between">
                <div className="gold-text text-[44px] leading-none font-extrabold">{geo.total}</div>
                <div className="pb-1 text-[13px] text-muted">из {geo.max_score * geo.rounds}</div>
              </div>
              <div className="flex flex-col gap-1.5">
                {geo.results.map((r, i) => (
                  <div key={i} className="flex justify-between rounded-xl bg-surface-2 px-3 py-2 text-[14px]">
                    <span>{i + 1}. {r.answer.name}</span><span className="font-bold text-gold">+{r.score}</span>
                  </div>
                ))}
              </div>
              <Button icon="share" onClick={async () => shareResult('share_geo', (await api.geoShare(geo.id)).text)}>Поделиться</Button>
              {geo.mode === 'daily' && geoDaily.data && <Leaderboard data={{ period: 'day', scope: 'geo', season_label: '', top: geoDaily.data.top, me: { rank: null, points: geo.total } }} emptyText="" />}
              <Button kind="secondary" onClick={() => { setFinishOpen(false); setGeo(null) }}>К карте</Button>
            </motion.div>
          )}
        </AnimatePresence>
      </Sheet>

      <SpoilerSheet open={spoilerOpen} onClose={() => setSpoilerOpen(false)} level={level} onChange={async (l) => { await changeLevel(l); setSpoilerOpen(false) }} />
    </div>
  )
}
