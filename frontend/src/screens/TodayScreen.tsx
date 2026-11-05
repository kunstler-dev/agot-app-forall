import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'

import { Art } from '../art'
import { Button, Empty, LineInput, Panel, Rubric, Skeleton, Tag, Tile, Title } from '../components/ui'
import { Crest } from '../heraldry'
import { Icon } from '../icons'
import { api, errorText, type CharacterDaily, type CrestDaily, type Daily, type NameRef } from '../lib/api'
import { shareResult } from '../lib/share'
import { haptic, hapticResult } from '../lib/telegram'
import { clock, plural, t } from '../lib/texts'
import { useToast } from '../lib/toast'
import { useNow } from '../lib/useNow'
import { houseById, useApp } from '../store/app'
import { ease, roman } from '../lib/format'

type Mode = 'character' | 'crest'

function norm(s: string) {
  return s.toLocaleLowerCase('ru').replaceAll('ё', 'е').trim()
}

function Countdown({ to }: { to: number }) {
  const now = useNow(1000)
  return <span className="num">{clock(to - now)}</span>
}

/** A ledger line with suggestions underneath, each with the small crest of its house. */
function Autocomplete({ items, exclude, placeholder, onPick, disabled }: {
  items: NameRef[]
  exclude: Set<string>
  placeholder: string
  onPick: (id: string) => void
  disabled?: boolean
}) {
  const cfg = useApp((s) => s.config)
  const [q, setQ] = useState('')
  const matches = useMemo(() => {
    const n = norm(q)
    if (!n) return []
    return items
      .filter((x) => !exclude.has(x.id))
      .map((x) => {
        const names = [x.name, ...x.aliases].map(norm)
        const starts = names.some((v) => v.startsWith(n) || v.split(/[\s-]/).some((w) => w.startsWith(n)))
        return { x, score: starts ? 0 : names.some((v) => v.includes(n)) ? 1 : 9 }
      })
      .filter((m) => m.score < 9)
      .sort((a, b) => a.score - b.score || a.x.name.localeCompare(b.x.name))
      .slice(0, 6)
  }, [q, items, exclude])
  return (
    <div className="relative z-30">
      <LineInput value={q} onChange={setQ} onClear={() => setQ('')} placeholder={placeholder} disabled={disabled} />
      {matches.length > 0 && (
        <ul className="absolute inset-x-0 top-full m-0 list-none border border-t-0 border-rule-strong bg-paper-2 p-0">
          {matches.map(({ x }) => {
            const h = houseById(cfg, x.house ?? x.id)
            return (
              <li key={x.id} className="rule-b last:border-0">
                <button type="button" onClick={() => { setQ(''); onPick(x.id) }} className="press flex w-full items-center gap-3 px-3 py-2.5 text-left">
                  {h ? <Crest blazon={h.crest} size={18} engraved /> : <span className="w-[18px]" />}
                  <span className="flex-1">{x.name}</span>
                  {x.aliases[0] && <span className="truncate text-sm italic text-ink-muted">{x.aliases[0]}</span>}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// a mark in every cell so the grid reads without colour
const MARK = { hit: '✓', partial: '~', miss: '×' }
const CELL = { hit: 'bg-verdigris text-paper', partial: 'bg-ochre text-paper', miss: 'bg-slate text-ink' }

function Ledger({ data, labels }: { data: CharacterDaily; labels: { key: string; label: string }[] }) {
  const rows = [...data.guesses].reverse()
  if (!rows.length) return null
  const cols = `minmax(84px,1.2fr) repeat(${labels.length}, minmax(52px,1fr))`
  return (
    <div className="-mx-5 overflow-x-auto px-5 no-scrollbar">
      <table className="w-full min-w-[520px] border-collapse text-xs">
        <thead>
          <tr className="double-rule-b">
            <th className="sc py-1 pr-2 text-left font-normal text-ink-muted">запись</th>
            {labels.map((l) => <th key={l.key} className="sc px-0.5 py-1 font-normal text-ink-muted">{l.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((g, ri) => (
            <tr key={g.id} style={{ gridTemplateColumns: cols }}>
              <td className={`py-1 pr-2 text-[13px] leading-tight font-extrabold ${g.correct ? 'text-verdigris' : ''}`}>{g.name}</td>
              {g.cells.map((c, i) => (
                <td key={c.key} className="p-0.5">
                  <motion.div
                    initial={ri === 0 ? { rotateX: 90, opacity: 0 } : false}
                    animate={{ rotateX: 0, opacity: 1 }}
                    transition={{ ...ease, delay: ri === 0 ? i * 0.09 : 0 }}
                    className={`flex min-h-[46px] flex-col items-center justify-center rounded-lg px-0.5 py-1 text-center text-[11px] leading-[1.15] font-bold ${CELL[c.status]}`}
                  >
                    <span className="line-clamp-2 break-words">{c.value}</span>
                    <span className="flex items-center gap-0.5 text-xs" aria-label={c.status}>
                      {MARK[c.status]}
                      {c.arrow && <Icon name={c.arrow} size={12} />}
                    </span>
                  </motion.div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Stats({ stats, max }: { stats: CharacterDaily['stats']; max: number }) {
  const best = Math.max(1, ...Object.values(stats.dist))
  return (
    <section className="flex flex-col gap-2">
      <Rubric>Счёт</Rubric>
      <div className="grid grid-cols-4 gap-2">
        {[
          [stats.played, 'сыграно'],
          [stats.played ? `${Math.round((100 * stats.won) / stats.played)}%` : '—', 'угадано'],
          [stats.streak, 'серия'],
          [stats.best_streak, 'рекорд'],
        ].map(([v, l]) => (
          <Panel key={String(l)} className="num py-2.5 text-center">
            <div className="text-xl font-extrabold">{v}</div>
            <div className="text-[10px] font-extrabold text-ink-muted uppercase">{l}</div>
          </Panel>
        ))}
      </div>
      <div className="mt-2 flex flex-col gap-1">
        {Array.from({ length: max }, (_, i) => {
          const n = stats.dist[String(i + 1)] ?? 0
          return (
            <div key={i} className="num flex items-center gap-2 text-xs">
              <span className="w-6 text-ink-muted">{roman(i + 1)}</span>
              <div className="h-px flex-1 bg-rule"><div className="h-[3px] -translate-y-px bg-ink" style={{ width: `${(n / best) * 100}%` }} /></div>
              <span className="w-5 text-right">{n}</span>
            </div>
          )
        })}
      </div>
    </section>
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
      if (d.character.solved) hapticResult('success')
      else if (d.character.finished) hapticResult('error')
      else haptic('medium')
      onUpdate(d)
    } catch (e) {
      toast(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {!data.finished ? (
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between text-sm text-ink-muted">
            <span>Запись {roman(used + 1)} из {roman(data.max_attempts)}</span>
            <span className="num">{data.max_attempts - used} {plural(data.max_attempts - used, 'осталась', 'осталось', 'осталось')}</span>
          </div>
          <Autocomplete items={names.data ?? []} exclude={exclude} placeholder={t('daily.input')} onPick={guess} disabled={busy || !names.data} />
          {used === 0 && <p className="m-0 text-sm italic text-ink-muted">{t('daily.character.prompt')}</p>}
        </section>
      ) : data.answer && (
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={ease} className="flex gap-4 rounded-2xl border-2 border-gilt/60 bg-paper-2 p-4">
          <Crest blazon={house?.crest} size={64} />
          <div className="min-w-0 flex-1">
            <div className="sc text-xs text-gilt">{data.solved ? `угадано с ${used}-й записи` : 'не угадано'}</div>
            <div className="sc text-lg leading-tight">{data.answer.name}</div>
            {data.answer.bio && <p className="mt-1 mb-0 text-sm text-ink-muted">{data.answer.bio}</p>}
            <p className="mt-2 mb-0 text-sm text-ink-muted">
              {data.solved && <><span className="num text-ink">+{data.points}</span> очков. </>}Следующий через <Countdown to={daily.next_ms} />.
            </p>
            <Button kind="gilt" icon="seal" className="mt-3 w-full" onClick={async () => shareResult('share_daily', (await api.dailyShare('character')).text)}>Отправить без спойлеров</Button>
          </div>
        </motion.section>
      )}

      {(data.hints.quote || data.hints.crest || (!data.finished && used > 0)) && (
        <aside className="grid grid-cols-[1fr_auto] gap-4 rounded-2xl border border-rule bg-paper-2 p-3.5">
          <div>
            <Tag>приписка</Tag>
            {data.hints.quote
              ? <p className="m-0 text-base italic">{data.hints.quote}</p>
              : <p className="m-0 text-sm text-ink-muted">Приписка появится после {roman(cfg.tenant.daily.hint_quote_after)}-й записи.</p>}
          </div>
          <div className="flex flex-col items-center">
            {data.hints.crest ? <Crest blazon={data.hints.crest} size={36} /> : <Icon name="lock" size={22} className="mt-1 text-ink-muted" />}
            <span className="sc text-xs text-ink-muted">{data.hints.crest ? 'герб' : `после ${roman(cfg.tenant.daily.hint_crest_after)}`}</span>
          </div>
        </aside>
      )}

      <Ledger data={data} labels={cfg.attributes} />

      {used === 0 && !data.finished && (
        <section className="flex flex-col gap-1.5 text-sm text-ink-muted">
          <Rubric>Как читать ведомость</Rubric>
          <div><span className="mr-2 inline-block w-5 bg-verdigris text-center text-paper">✓</span>совпадает</div>
          <div><span className="mr-2 inline-block w-5 bg-ochre text-center text-paper">~</span>частично: союзный дом, общая роль</div>
          <div><span className="mr-2 inline-block w-5 bg-slate text-center text-ink">×</span>не совпадает</div>
          <div className="flex items-center gap-1"><Icon name="up" size={14} /> появился позже, <Icon name="down" size={14} /> раньше</div>
        </section>
      )}

      {data.finished && <Stats stats={data.stats} max={data.max_attempts} />}
    </div>
  )
}

function CrestGame({ daily, onUpdate }: { daily: Daily; onUpdate: (d: Daily) => void }) {
  const cfg = useApp((s) => s.config)!
  const toast = useToast((s) => s.show)
  const data: CrestDaily = daily.crest
  const [busy, setBusy] = useState(false)
  const items = useMemo(() => cfg.houses.map((h) => ({ id: h.id, name: h.name, aliases: [h.seat].filter(Boolean), house: h.id })), [cfg.houses])
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
    <div className="flex flex-col gap-6">
      <section className="flex flex-col items-center gap-3 rounded-2xl border border-rule bg-paper-2 p-5">
        <motion.div key={`${data.stage.engraved}${data.stage.fade}`} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} transition={{ duration: 0.22 }}>
          <Crest blazon={data.answer?.crest ?? data.stage.crest} engraved={!data.answer && data.stage.engraved} fade={data.answer ? 1 : data.stage.fade} size={150} />
        </motion.div>
        {data.stage.words && !data.finished && <p className="m-0 text-base italic">«{data.stage.words}»</p>}
        {data.finished && data.answer ? (
          <div className="text-center">
            <div className="sc text-xs text-gilt">{data.solved ? `угадано с ${used}-й записи` : 'это был'}</div>
            <div className="sc text-lg">{data.answer.name}</div>
            {data.answer.words && <p className="m-0 text-base italic text-ink-muted">«{data.answer.words}»</p>}
          </div>
        ) : (
          <p className="m-0 text-sm italic text-ink-muted">{t('daily.crest.prompt')}</p>
        )}
      </section>
      {!data.finished && <Autocomplete items={items} exclude={exclude} placeholder={t('daily.crest.input')} onPick={guess} disabled={busy} />}
      {data.guesses.length > 0 && (
        <ol className="m-0 flex list-none flex-col p-0">
          {data.guesses.map((g, i) => (
            <li key={g.house} className="rule-b flex items-center gap-3 py-1.5 text-sm">
              <span className="w-6 text-ink-muted">{roman(i + 1)}</span>
              <span className={`flex-1 ${g.correct ? 'text-verdigris' : 'text-ink-muted line-through'}`}>{g.name}</span>
              <span>{g.correct ? '✓' : '×'}</span>
            </li>
          ))}
        </ol>
      )}
      {data.finished && (
        <div className="flex flex-col items-start gap-2">
          <Button kind="gilt" icon="seal" className="w-full" onClick={async () => shareResult('share_crest', (await api.dailyShare('crest')).text)}>Отправить</Button>
          <p className="m-0 text-sm text-ink-muted">Новый герб через <Countdown to={daily.next_ms} />.</p>
        </div>
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
    <div className="flex flex-col gap-4 px-4 pt-4 pb-10 safe-top">
      <Title folio={d ? `№${d.number}` : undefined} sub={<>{cfg.tenant.app_name}{d && d.character.stats.streak > 0 && <>, серия <span className="num">{d.character.stats.streak}</span></>}</>}>
        {mode === 'character' ? t('daily.character') : t('daily.crest')}
      </Title>
      <div className="grid grid-cols-2 gap-3">
        <Tile art={<Art name="hood" />} active={mode === 'character'} onClick={() => setMode('character')}
          tag={d?.character.finished ? (d.character.solved ? 'угадано' : 'сыграно') : 'новый'} tagTone={d?.character.finished ? 'verdigris' : 'wax'}
          title={t('daily.character')} text={d ? `${d.character.guesses.length} из ${d.character.max_attempts} записей` : ' '} />
        <Tile art={<Art name="shield" />} active={mode === 'crest'} onClick={() => setMode('crest')}
          tag={d?.crest.finished ? (d.crest.solved ? 'угадано' : 'сыграно') : 'новый'} tagTone={d?.crest.finished ? 'verdigris' : 'wax'}
          title={t('daily.crest')} text={d ? `${d.crest.guesses.length} из ${d.crest.max_attempts} попыток` : ' '} />
      </div>
      {q.isError ? <Empty text="Ворон не долетел. Попробуйте ещё раз." /> : !d ? <Skeleton lines={5} /> : mode === 'character' ? <CharacterGame daily={d} onUpdate={update} /> : <CrestGame daily={d} onUpdate={update} />}
    </div>
  )
}
