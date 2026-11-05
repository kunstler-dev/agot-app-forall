import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useState } from 'react'

import { Avatar } from '../components/Avatar'
import { Crest } from '../components/Crest'
import { Icon } from '../components/icons'
import { Card, Empty, Header, Pill, Segmented, Skeleton } from '../components/ui'
import { api, errorText, type PEvent, type Top, type TopRow } from '../lib/api'
import { haptic, hapticResult } from '../lib/telegram'
import { useNow } from '../lib/useNow'
import { t, timeLeft } from '../lib/texts'
import { houseById, useApp } from '../store/app'
import { useToast } from '../lib/toast'

function EventCard({ e, onVote }: { e: PEvent; onVote: (id: number, opt: number) => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  const now = useNow()
  const left = e.deadline_ms - now
  const resolved = e.status === 'resolved'
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {e.tag && <Pill>{e.tag}</Pill>}
          {resolved ? <Pill className="text-hit">итог</Pill> : e.open ? <Pill className="text-gold"><Icon name="bell" size={12} /> {timeLeft(left)}</Pill> : <Pill className="text-muted"><Icon name="lock" size={12} /> ждём итога</Pill>}
        </div>
        <span className="text-[11px] text-dim">{e.votes} голос.</span>
      </div>
      <div className="font-display text-[21px] leading-snug font-bold">{e.question}</div>
      <div className="flex flex-col gap-2">
        {e.options.map((o, i) => {
          const d = e.distribution?.[i]
          const mine = e.my_vote === i
          const correct = resolved && e.correct === i
          return (
            <button
              key={i}
              type="button"
              disabled={!e.open || busy}
              onClick={async () => {
                setBusy(true)
                await onVote(e.id, i)
                setBusy(false)
              }}
              className={`press relative overflow-hidden rounded-xl border px-3.5 py-3 text-left text-[14px] font-semibold disabled:active:scale-100 ${
                correct ? 'border-hit bg-hit/10' : mine ? 'border-gold bg-gold/10' : 'border-line-2 bg-surface-2'
              }`}
            >
              {d && <motion.span className={`absolute inset-y-0 left-0 ${correct ? 'bg-hit/20' : 'bg-nova/15'}`} initial={{ width: 0 }} animate={{ width: `${d.share * 100}%` }} transition={{ duration: 0.6 }} />}
              <span className="relative flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  {mine && <Icon name="check" size={16} className="text-gold" />}
                  {o}
                </span>
                {d && <span className="text-[13px] font-bold text-muted">{Math.round(d.share * 100)}%</span>}
              </span>
            </button>
          )
        })}
      </div>
      {resolved && e.my_vote !== null && (
        <div className={`text-[13px] font-bold ${e.my_points ? 'text-hit' : 'text-muted'}`}>
          {e.my_points ? `Верно! +${e.my_points} очков${e.my_points > e.base_points ? ' — смелый прогноз' : ''}` : 'В этот раз мимо'}
        </div>
      )}
      {e.open && (
        <div className="text-[12px] text-dim">
          {e.my_vote === null ? 'Выбери вариант — до дедлайна можно передумать.' : 'Голос принят. Распределение откроется после дедлайна.'} Угадал вариант, который выбрали меньше {Math.round(e.bold_threshold * 100)}% — очки ×{e.bold_multiplier}.
        </div>
      )}
    </Card>
  )
}

function Row({ r }: { r: TopRow }) {
  const cfg = useApp((s) => s.config)
  const h = houseById(cfg, r.house)
  return (
    <div className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${r.me ? 'border border-gold/40 bg-gold/10' : ''}`}>
      <span className={`w-7 text-center text-[16px] font-extrabold ${r.rank <= 3 ? 'text-gold' : 'text-dim'}`}>{r.rank}</span>
      <Avatar name={r.name} url={r.photo_url} size={34} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-bold">{r.name}{r.me ? ' (вы)' : ''}</div>
        {h && <div className="truncate text-[11px] text-dim">{h.name}</div>}
      </div>
      {h && <Crest spec={h.crest} size={20} />}
      <span className="w-14 text-right text-[14px] font-extrabold text-gold">{r.points}</span>
    </div>
  )
}

export function Leaderboard({ data, emptyText }: { data: Top | undefined; emptyText: string }) {
  if (!data) return <Skeleton className="h-60" />
  const meInTop = data.top.some((r) => r.me)
  return (
    <Card className="p-1.5">
      {data.top.length === 0 ? (
        <Empty icon="crown" title="Пока пусто" text={emptyText} />
      ) : (
        <div className="flex flex-col">{data.top.map((r) => <Row key={r.id} r={r} />)}</div>
      )}
      {!meInTop && (
        <div className="sticky bottom-0 mt-1 border-t border-line bg-surface pt-1.5">
          <div className="flex items-center gap-3 rounded-xl border border-gold/40 bg-gold/10 px-3 py-2.5">
            <span className="w-7 text-center text-[16px] font-extrabold text-dim">{data.me.rank ?? '—'}</span>
            <span className="flex-1 text-[14px] font-bold">Ваше место</span>
            <span className="text-[14px] font-extrabold text-gold">{data.me.points}</span>
          </div>
        </div>
      )}
    </Card>
  )
}

export function PredictionsScreen() {
  const qc = useQueryClient()
  const toast = useToast((s) => s.show)
  const [view, setView] = useState<'events' | 'top'>('events')
  const [period, setPeriod] = useState<'week' | 'season' | 'all'>('season')
  const [scope, setScope] = useState<'predictions' | 'all'>('predictions')
  const events = useQuery({ queryKey: ['predictions'], queryFn: api.predictions, refetchInterval: 60_000 })
  const top = useQuery({ queryKey: ['top', period, scope], queryFn: () => api.top(period, scope), enabled: view === 'top' })

  async function vote(id: number, option: number) {
    try {
      haptic('medium')
      const e = await api.vote(id, option)
      hapticResult('success')
      qc.setQueryData(['predictions'], (old: { events: PEvent[]; season_label: string } | undefined) =>
        old ? { ...old, events: old.events.map((x) => (x.id === id ? e : x)) } : old)
    } catch (err) {
      hapticResult('error')
      toast(errorText(err))
      qc.invalidateQueries({ queryKey: ['predictions'] })
    }
  }

  const list = events.data?.events ?? []
  const open = list.filter((e) => e.open)
  const closed = list.filter((e) => !e.open)
  return (
    <div className="flex flex-col gap-4 px-4 pt-5 pb-8 safe-top">
      <Header title={t('predictions.title')} subtitle={t('predictions.subtitle')} />
      <Segmented value={view} onChange={setView} options={[['events', 'События'], ['top', 'Рейтинг']]} />
      {view === 'events' ? (
        !events.data ? (
          <div className="flex flex-col gap-3"><Skeleton className="h-48" /><Skeleton className="h-48" /></div>
        ) : list.length === 0 ? (
          <Empty icon="scroll" title="Событий пока нет" text="Автор канала скоро добавит прогнозы на новые серии." />
        ) : (
          <div className="flex flex-col gap-3">
            {open.map((e) => <EventCard key={e.id} e={e} onVote={vote} />)}
            {closed.length > 0 && <div className="mt-2 text-[12px] font-bold tracking-[0.18em] text-dim uppercase">Завершённые</div>}
            {closed.map((e) => <EventCard key={e.id} e={e} onVote={vote} />)}
          </div>
        )
      ) : (
        <div className="flex flex-col gap-3">
          <Segmented small value={period} onChange={setPeriod} options={[['week', 'Неделя'], ['season', events.data?.season_label ?? 'Сезон'], ['all', 'Всё время']]} />
          <Segmented small value={scope} onChange={setScope} options={[['predictions', 'Прогнозы'], ['all', 'Все очки']]} />
          <Leaderboard data={top.data} emptyText="Очки появятся, когда автор подведёт итоги первых событий." />
        </div>
      )}
    </div>
  )
}
