import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useState } from 'react'

import { Crest } from '../components/Crest'
import { Icon } from '../components/icons'
import { Button, Card, Divider, Header, Pill, Segmented, Skeleton } from '../components/ui'
import { api, errorText, type CharacterDaily, type CrestDaily, type Daily, type NameRef } from '../lib/api'
import { shareResult } from '../lib/share'
import { haptic, hapticResult } from '../lib/telegram'
import { clock, plural, t } from '../lib/texts'
import { useNow } from '../lib/useNow'
import { houseById, useApp } from '../store/app'
import { useToast } from '../lib/toast'

type Mode = 'character' | 'crest'

function norm(s: string) {
  return s.toLocaleLowerCase('ru').replaceAll('ё', 'е').trim()
}

function Countdown({ to }: { to: number }) {
  const now = useNow(1000)
  return <span className="font-mono tabular-nums">{clock(to - now)}</span>
}

function Autocomplete({ items, exclude, placeholder, onPick, disabled }: {
  items: NameRef[]
  exclude: Set<string>
  placeholder: string
  onPick: (id: string) => void
  disabled?: boolean
}) {
  const [q, setQ] = useState('')
  const matches = useMemo(() => {
    const n = norm(q)
    if (!n) return []
    return items
      .filter((x) => !exclude.has(x.id))
      .map((x) => {
        const names = [x.name, ...x.aliases].map(norm)
        const starts = names.some((v) => v.startsWith(n) || v.split(/[\s-]/).some((w) => w.startsWith(n)))
        const has = names.some((v) => v.includes(n))
        return { x, score: starts ? 0 : has ? 1 : 9 }
      })
      .filter((m) => m.score < 9)
      .sort((a, b) => a.score - b.score || a.x.name.localeCompare(b.x.name))
      .slice(0, 6)
  }, [q, items, exclude])
  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-[14px] border border-line-2 bg-surface-2 px-3.5 focus-within:border-gold/60">
        <Icon name="search" size={18} className="text-dim" />
        <input
          value={q}
          disabled={disabled}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="h-12 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-dim"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        {q && (
          <button type="button" aria-label="Очистить" onClick={() => setQ('')} className="text-dim">
            <Icon name="close" size={18} />
          </button>
        )}
      </div>
      <AnimatePresence>
        {matches.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute inset-x-0 top-[54px] z-20 overflow-hidden rounded-[14px] border border-line-2 bg-surface-2 shadow-2xl"
          >
            {matches.map(({ x }) => (
              <button
                key={x.id}
                type="button"
                onClick={() => {
                  setQ('')
                  onPick(x.id)
                }}
                className="flex w-full items-center justify-between border-b border-line px-4 py-3 text-left text-[15px] last:border-0 active:bg-surface-3"
              >
                <span className="font-semibold">{x.name}</span>
                {x.aliases[0] && <span className="ml-3 truncate text-[12px] text-dim">{x.aliases[0]}</span>}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const CELL = {
  hit: 'bg-hit/90 border-hit text-white',
  partial: 'bg-partial/90 border-partial text-night',
  miss: 'bg-miss border-line-2 text-muted',
}

function GuessGrid({ data, labels }: { data: CharacterDaily; labels: { key: string; label: string }[] }) {
  const rows = [...data.guesses].reverse()
  if (!rows.length) return null
  return (
    <div className="-mx-4 overflow-x-auto px-4 no-scrollbar">
      <div className="min-w-[540px]">
        <div className="grid gap-1 pb-1 text-center text-[10px] font-bold tracking-wide text-dim uppercase" style={{ gridTemplateColumns: `92px repeat(${labels.length}, minmax(0,1fr))` }}>
          <span className="text-left">Имя</span>
          {labels.map((l) => <span key={l.key}>{l.label}</span>)}
        </div>
        <div className="flex flex-col gap-1">
          {rows.map((g, ri) => (
            <div key={g.id} className="grid gap-1" style={{ gridTemplateColumns: `92px repeat(${labels.length}, minmax(0,1fr))` }}>
              <div className={`flex items-center rounded-lg border px-2 py-1.5 text-[12px] leading-tight font-bold ${g.correct ? CELL.hit : 'border-line bg-surface-2'}`}>{g.name}</div>
              {g.cells.map((c, i) => (
                <motion.div
                  key={c.key}
                  initial={ri === 0 ? { rotateX: 90, opacity: 0 } : false}
                  animate={{ rotateX: 0, opacity: 1 }}
                  transition={{ delay: ri === 0 ? i * 0.12 : 0, duration: 0.35 }}
                  className={`flex min-h-[46px] flex-col items-center justify-center rounded-lg border px-1 py-1 text-center text-[10.5px] leading-[1.15] font-semibold ${CELL[c.status]}`}
                >
                  <span className="line-clamp-3 break-words">{c.value}</span>
                  {c.arrow && <Icon name={c.arrow} size={14} stroke={2.6} />}
                </motion.div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Attempts({ used, max }: { used: number; max: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={`h-1.5 flex-1 rounded-full ${i < used ? 'bg-gold' : 'bg-surface-3'}`} />
      ))}
    </div>
  )
}

function StatsRow({ stats, max }: { stats: CharacterDaily['stats']; max: number }) {
  const best = Math.max(1, ...Object.values(stats.dist))
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          [stats.played, 'сыграно'],
          [stats.played ? `${Math.round((100 * stats.won) / stats.played)}%` : '—', 'побед'],
          [stats.streak, 'серия'],
          [stats.best_streak, 'рекорд'],
        ].map(([v, l]) => (
          <div key={String(l)} className="rounded-xl bg-surface-2 py-2">
            <div className="text-[22px] font-extrabold">{v}</div>
            <div className="text-[10px] font-bold tracking-wider text-dim uppercase">{l}</div>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-1">
        {Array.from({ length: max }, (_, i) => {
          const n = stats.dist[String(i + 1)] ?? 0
          return (
            <div key={i} className="flex items-center gap-2 text-[11px]">
              <span className="w-3 text-dim">{i + 1}</span>
              <div className="h-4 rounded bg-nova/70 px-1.5 text-right leading-4 font-bold" style={{ width: `${Math.max(8, (n / best) * 100)}%` }}>{n}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CharacterGame({ daily, onUpdate }: { daily: Daily; onUpdate: (d: Daily) => void }) {
  const cfg = useApp((s) => s.config)!
  const toast = useToast((s) => s.show)
  const data = daily.character
  const names = useQuery({ queryKey: ['names'], queryFn: api.characterNames, staleTime: Infinity })
  const [busy, setBusy] = useState(false)
  const exclude = useMemo(() => new Set(data.guesses.map((g) => g.id)), [data.guesses])
  const used = data.guesses.length
  const house = houseById(cfg, data.answer?.house)

  async function guess(id: string) {
    setBusy(true)
    try {
      const d = await api.guessCharacter(id)
      const g = d.character
      if (g.solved) hapticResult('success')
      else if (g.finished) hapticResult('error')
      else haptic('medium')
      onUpdate(d)
    } catch (e) {
      toast(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  async function share() {
    const { text } = await api.dailyShare('character')
    await shareResult('share_daily', text)
  }

  return (
    <div className="flex flex-col gap-4">
      {!data.finished && (
        <Card className="relative z-30 flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between text-[12px] font-bold text-muted">
            <span>Попытка {used + 1} из {data.max_attempts}</span>
            <span>{data.max_attempts - used} {plural(data.max_attempts - used, 'осталась', 'осталось', 'осталось')}</span>
          </div>
          <Attempts used={used} max={data.max_attempts} />
          <Autocomplete items={names.data ?? []} exclude={exclude} placeholder={t('daily.input')} onPick={guess} disabled={busy || !names.data} />
          {used === 0 && <p className="m-0 text-[13px] text-muted">{t('daily.character.prompt')}</p>}
        </Card>
      )}

      {data.finished && data.answer && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className={`overflow-hidden p-0 ${data.solved ? 'border-gold/50' : ''}`}>
            <div className="flex items-center gap-4 p-4" style={{ background: data.solved ? 'linear-gradient(135deg, rgba(244,201,93,0.18), transparent)' : undefined }}>
              <Crest spec={house?.crest} size={64} />
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-bold tracking-wider text-gold uppercase">{data.solved ? `Угадано за ${used} ${plural(used, 'попытку', 'попытки', 'попыток')}` : 'Не сегодня'}</div>
                <div className="font-display text-[26px] leading-tight font-bold">{data.answer.name}</div>
                {data.answer.bio && <div className="mt-0.5 text-[13px] text-muted">{data.answer.bio}</div>}
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-line px-4 py-3 text-[13px]">
              <span className="text-muted">Следующий персонаж через <Countdown to={daily.next_ms} /></span>
              {data.solved && <Pill className="text-gold">+{data.points} очков</Pill>}
            </div>
            <div className="px-4 pb-4">
              <Button icon="share" onClick={share} className="w-full">Поделиться без спойлеров</Button>
            </div>
          </Card>
        </motion.div>
      )}

      {(data.hints.quote || data.hints.crest || (!data.finished && used > 0)) && (
        <div className="grid grid-cols-2 gap-2">
          <Card className="p-3">
            <div className="mb-1 flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-dim uppercase"><Icon name="quote" size={14} /> Цитата</div>
            {data.hints.quote ? <div className="font-display text-[16px] leading-snug italic">«{data.hints.quote}»</div> : <div className="text-[12px] text-dim">Откроется после {cfg.tenant.daily.hint_quote_after}-й попытки</div>}
          </Card>
          <Card className="flex items-center gap-2 p-3">
            {data.hints.crest ? (
              <>
                <Crest spec={data.hints.crest} size={42} />
                <div className="text-[12px] text-muted">Герб дома персонажа</div>
              </>
            ) : (
              <div className="text-[12px] text-dim"><div className="mb-1 flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase"><Icon name="shield" size={14} /> Герб</div>Откроется после {cfg.tenant.daily.hint_crest_after}-й попытки</div>
            )}
          </Card>
        </div>
      )}

      <GuessGrid data={data} labels={cfg.attributes} />

      {used === 0 && !data.finished && (
        <Card className="p-4 text-[13px] leading-relaxed text-muted">
          <div className="mb-2 font-bold text-ink">Как играть</div>
          <div className="flex flex-col gap-1.5">
            <div><span className="mr-2 inline-block h-3 w-3 rounded-sm bg-hit align-middle" />совпадает</div>
            <div><span className="mr-2 inline-block h-3 w-3 rounded-sm bg-partial align-middle" />частично (союзный дом, общая роль)</div>
            <div><span className="mr-2 inline-block h-3 w-3 rounded-sm border border-line-2 bg-miss align-middle" />не совпадает</div>
            <div><Icon name="up" size={13} className="mr-1 inline" />персонаж появился позже, <Icon name="down" size={13} className="mx-1 inline" />раньше</div>
          </div>
        </Card>
      )}

      {data.finished && (
        <Card className="p-4">
          <div className="mb-3 font-display text-[20px] font-bold">Статистика</div>
          <StatsRow stats={data.stats} max={data.max_attempts} />
        </Card>
      )}
    </div>
  )
}

function CrestGame({ daily, onUpdate }: { daily: Daily; onUpdate: (d: Daily) => void }) {
  const cfg = useApp((s) => s.config)!
  const toast = useToast((s) => s.show)
  const data: CrestDaily = daily.crest
  const [busy, setBusy] = useState(false)
  const items = useMemo(() => cfg.houses.map((h) => ({ id: h.id, name: h.name, aliases: [h.seat].filter(Boolean) })), [cfg.houses])
  const exclude = useMemo(() => new Set(data.guesses.map((g) => g.house)), [data.guesses])
  const used = data.guesses.length

  async function guess(id: string) {
    setBusy(true)
    try {
      const d = await api.guessCrest(id)
      if (d.crest.solved) hapticResult('success')
      else if (d.crest.finished) hapticResult('error')
      else haptic('medium')
      onUpdate(d)
    } catch (e) {
      toast(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col items-center gap-3 overflow-hidden p-5">
        <div className="relative">
          <div className="absolute inset-0 -z-0 rounded-full bg-gold/10 blur-2xl" />
          <motion.div key={data.stage.blur} initial={{ scale: 0.96, opacity: 0.6 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.6 }}>
            <Crest spec={data.answer?.crest ?? data.stage.crest} blur={data.stage.blur} size={150} />
          </motion.div>
        </div>
        {data.stage.words && !data.finished && <div className="font-display text-[18px] italic text-gold">«{data.stage.words}»</div>}
        {data.finished && data.answer ? (
          <div className="text-center">
            <div className="text-[12px] font-bold tracking-wider text-gold uppercase">{data.solved ? `Угадано за ${used} ${plural(used, 'попытку', 'попытки', 'попыток')}` : 'Это был'}</div>
            <div className="font-display text-[28px] font-bold">{data.answer.name}</div>
            {data.answer.words && <div className="font-display text-[17px] italic text-muted">«{data.answer.words}»</div>}
          </div>
        ) : (
          <p className="m-0 text-center text-[13px] text-muted">{t('daily.crest.prompt')}</p>
        )}
      </Card>
      {!data.finished && (
        <Card className="relative z-30 flex flex-col gap-3 p-4">
          <Attempts used={used} max={data.max_attempts} />
          <Autocomplete items={items} exclude={exclude} placeholder={t('daily.crest.input')} onPick={guess} disabled={busy} />
        </Card>
      )}
      {data.guesses.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {data.guesses.map((g) => (
            <span key={g.house} className={`rounded-full border px-3 py-1.5 text-[12px] font-bold ${g.correct ? CELL.hit : 'border-line-2 bg-surface-2 text-muted line-through'}`}>{g.name}</span>
          ))}
        </div>
      )}
      {data.finished && (
        <>
          <Button icon="share" onClick={async () => shareResult('share_crest', (await api.dailyShare('crest')).text)}>Поделиться</Button>
          <div className="text-center text-[13px] text-muted">Новый герб через <Countdown to={daily.next_ms} /></div>
        </>
      )}
    </div>
  )
}

export function TodayScreen() {
  const cfg = useApp((s) => s.config)!
  const qc = useQueryClient()
  const [mode, setMode] = useState<Mode>('character')
  const q = useQuery({ queryKey: ['daily'], queryFn: api.daily, refetchInterval: 5 * 60_000 })
  const update = (d: Daily) => qc.setQueryData(['daily'], d)
  const d = q.data

  return (
    <div className="flex flex-col gap-4 px-4 pt-5 pb-8 safe-top">
      <Header
        title={mode === 'character' ? t('daily.character') : t('daily.crest')}
        subtitle={d ? `#${d.number} · ${cfg.tenant.app_name}` : cfg.tenant.app_name}
        right={d && d.character.stats.streak > 0 ? <Pill className="mt-1 text-gold"><Icon name="flame" size={13} /> {d.character.stats.streak}</Pill> : undefined}
      />
      <Segmented value={mode} onChange={setMode} options={[['character', `${t('daily.character')}${d?.character.finished ? ' ✓' : ''}`], ['crest', `${t('daily.crest')}${d?.crest.finished ? ' ✓' : ''}`]]} />
      {!d ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-36" />
          <Skeleton className="h-24" />
        </div>
      ) : mode === 'character' ? (
        <CharacterGame daily={d} onUpdate={update} />
      ) : (
        <CrestGame daily={d} onUpdate={update} />
      )}
      <Divider label="каждый день новое" />
    </div>
  )
}
