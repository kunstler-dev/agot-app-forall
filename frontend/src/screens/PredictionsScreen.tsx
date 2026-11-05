import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { Avatar } from '../components/Avatar'
import { Art } from '../art'
import { artFor } from '../art/pick'
import { Empty, Panel, Radio, Rubric, ShareLine, Skeleton, Tabs, Tag, Title } from '../components/ui'
import { Crest } from '../heraldry'
import { Icon } from '../icons'
import { api, errorText, type PEvent, type Top, type TopRow } from '../lib/api'
import { haptic, hapticResult } from '../lib/telegram'
import { t, timeLeft } from '../lib/texts'
import { useToast } from '../lib/toast'
import { useNow } from '../lib/useNow'
import { houseById, useApp } from '../store/app'
import { roman } from '../lib/format'

const date = (ms: number) => new Date(ms).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })

/** One event as an entry in a chronicle: date and tag in the margin, the question as a heading. */
function Entry({ e, onVote }: { e: PEvent; onVote: (id: number, opt: number) => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  const now = useNow()
  const resolved = e.status === 'resolved'
  return (
    <article className="mb-3 overflow-hidden rounded-2xl border border-rule bg-paper-2">
      <div className="relative h-[84px] overflow-hidden [&>svg]:h-full [&>svg]:w-full">
        <Art name={artFor(e.tag || e.question)} />
        <div className="absolute top-2.5 left-3 flex gap-1.5">
          {e.tag && <Tag>{e.tag}</Tag>}
          <Tag tone={e.open ? 'wax' : resolved ? 'verdigris' : 'muted'}>{e.open ? 'приём открыт' : resolved ? 'итог' : 'ждём итога'}</Tag>
        </div>
        <span className="num absolute top-2.5 right-3 text-[11px] font-extrabold text-ink-muted">{date(e.deadline_ms)}</span>
      </div>
      <div className="flex flex-col gap-3 p-4">
        <h2 className="m-0 text-[17px] leading-snug font-extrabold">{e.question}</h2>
        <div className="flex items-center gap-1.5 text-sm text-ink-muted">
          <Icon name={e.open ? 'hourglass' : 'lock'} size={16} />
          {resolved ? 'итог подведён' : e.open ? `до закрытия ${timeLeft(e.deadline_ms - now)}` : 'приём закрыт, ждём итога'}
          <span className="num ml-auto">{e.votes} голос.</span>
        </div>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {e.options.map((o, i) => {
            const d = e.distribution?.[i]
            const mine = e.my_vote === i
            const correct = resolved && e.correct === i
            return (
              <li key={i}>
                <button type="button" disabled={!e.open || busy} onClick={async () => { setBusy(true); await onVote(e.id, i); setBusy(false) }}
                  className={`press flex w-full flex-col gap-1.5 rounded-xl border-2 px-3 py-2.5 text-left ${mine ? 'border-gilt bg-gilt/10' : correct ? 'border-verdigris' : 'border-rule'}`}>
                  <span className="flex w-full items-start gap-2.5">
                    <span className="mt-1"><Radio on={mine} /></span>
                    <span className={`flex-1 ${correct ? 'text-verdigris' : ''}`}>{o}{correct ? ' ✓' : ''}</span>
                    {d && <span className="num text-sm text-ink-muted">{Math.round(d.share * 100)}%</span>}
                  </span>
                  {d && <span className="pl-7"><ShareLine value={d.share} strong={correct} /></span>}
                </button>
              </li>
            )
          })}
        </ul>
        {resolved && e.my_vote !== null && (
          <p className={`m-0 text-sm italic ${e.my_points ? 'text-verdigris' : 'text-ink-muted'}`}>
            {e.my_points ? `Угадано: +${e.my_points} очков${e.my_points > e.base_points ? ', редкий исход' : ''}.` : 'Мимо.'}
          </p>
        )}
        {e.open && (
          <p className="m-0 text-sm text-ink-muted">
            {e.my_vote === null ? 'До срока можно передумать.' : 'Прогноз принят. Расклад голосов откроется после срока.'}
          </p>
        )}
      </div>
    </article>
  )
}

function Row({ r }: { r: TopRow }) {
  const cfg = useApp((s) => s.config)
  const h = houseById(cfg, r.house)
  return (
    <tr className="rule-b">
      <td className={`num w-9 py-2 ${r.rank <= 3 ? 'sc text-gilt' : 'text-ink-muted'}`}>{r.rank <= 3 ? roman(r.rank) : r.rank}</td>
      <td className="py-2">
        <span className="flex items-center gap-2.5">
          <Avatar name={r.name} url={r.photo_url} size={28} />
          <span className="min-w-0 flex-1 truncate">{r.name}{r.me ? ', вы' : ''}</span>
          {h && <Crest blazon={h.crest} size={16} engraved />}
        </span>
      </td>
      <td className="num w-14 py-2 text-right">{r.points}</td>
    </tr>
  )
}

export function Leaderboard({ data, emptyText }: { data: Top | undefined; emptyText: string }) {
  if (!data) return <Skeleton lines={6} />
  const meInTop = data.top.some((r) => r.me)
  return (
    <div>
      {data.top.length === 0 ? <Empty text={emptyText} /> : (
        <table className="w-full border-collapse"><tbody>{data.top.map((r) => <Row key={r.id} r={r} />)}</tbody></table>
      )}
      {!meInTop && (
        <div className="double-rule-t sticky bottom-0 mt-2 flex items-baseline bg-paper py-2">
          <span className="num w-9 text-ink-muted">{data.me.rank ?? '—'}</span>
          <span className="flex-1 italic">Ваше место</span>
          <span className="num">{data.me.points}</span>
        </div>
      )}
    </div>
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
    <div className="flex flex-col gap-4 px-4 pt-4 pb-10 safe-top">
      <Title sub={t('predictions.subtitle')}>{t('predictions.title')}</Title>
      <Tabs value={view} onChange={setView} options={[['events', 'События'], ['top', 'Рейтинг']]} />
      {view === 'top' && (
        <Panel className="relative h-[96px] overflow-hidden [&>svg]:h-full [&>svg]:w-full">
          <Art name="crown" />
          <span className="sc absolute bottom-2.5 left-4 text-xl text-ink">рейтинг канала</span>
        </Panel>
      )}
      {view === 'events' ? (
        !events.data ? <Skeleton lines={7} /> : list.length === 0 ? <Empty text="Записей пока нет. Автор добавит прогнозы к новым сериям." /> : (
          <div>
            {open.map((e) => <Entry key={e.id} e={e} onVote={vote} />)}
            {closed.length > 0 && <div className="mt-4"><Rubric>Закрытые</Rubric></div>}
            {closed.map((e) => <Entry key={e.id} e={e} onVote={vote} />)}
          </div>
        )
      ) : (
        <div className="flex flex-col gap-3">
          <Tabs value={period} onChange={setPeriod} options={[['week', 'Неделя'], ['season', events.data?.season_label ?? 'Сезон'], ['all', 'Всё время']]} />
          <Tabs value={scope} onChange={setScope} options={[['predictions', 'Прогнозы'], ['all', 'Все очки']]} />
          <Leaderboard data={top.data} emptyText="Очков пока нет. Они появятся, когда автор подведёт итоги." />
        </div>
      )}
    </div>
  )
}
