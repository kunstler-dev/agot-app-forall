import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { Card, Header, Pill, Segmented, Skeleton, Button } from '../components/ui'
import { api, errorText, type AdminStats, type ContentKind, type PEvent } from '../lib/api'
import { bindBack } from '../lib/telegram'
import { timeLeft } from '../lib/texts'
import { useNow } from '../lib/useNow'
import { houseById, useApp } from '../store/app'
import { useToast } from '../lib/toast'

type Tab = 'stats' | 'events' | 'content' | 'status'

function Bars({ data, k, label }: { data: AdminStats['days']; k: keyof AdminStats['days'][number]; label: string }) {
  const vals = data.map((d) => Number(d[k]))
  const max = Math.max(1, ...vals)
  const total = vals.reduce((a, b) => a + b, 0)
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[13px] font-bold">{label}</span>
        <span className="text-[12px] text-muted">сегодня <b className="text-ink">{vals.at(-1)}</b> · всего {total}</span>
      </div>
      <div className="flex h-20 items-end gap-[3px]">
        {vals.map((v, i) => (
          <div key={i} className="flex-1 rounded-t bg-gold/80" style={{ height: `${Math.max(3, (v / max) * 100)}%`, opacity: i === vals.length - 1 ? 1 : 0.55 }} title={`${data[i].day}: ${v}`} />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-dim"><span>{data[0]?.day.slice(5)}</span><span>{data.at(-1)?.day.slice(5)}</span></div>
    </Card>
  )
}

function Stats() {
  const cfg = useApp((s) => s.config)
  const q = useQuery({ queryKey: ['admin-stats'], queryFn: () => api.admin.stats(14) })
  const s = q.data
  if (!s) return <Skeleton className="h-80" />
  const solvedRate = (() => {
    const p = s.days.reduce((a, d) => a + d.daily_played, 0)
    const w = s.days.reduce((a, d) => a + d.daily_solved, 0)
    return p ? Math.round((100 * w) / p) : 0
  })()
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        {[
          [s.totals.players, 'игроков'],
          [s.totals.shares, 'шерингов'],
          [s.totals.quiz_done, 'тестов'],
          [s.totals.votes, 'голосов'],
          [`${solvedRate}%`, 'угадывают'],
          [s.totals.notify_daily, 'подписаны на бота'],
        ].map(([v, l]) => (
          <Card key={String(l)} className="p-3 text-center">
            <div className="text-[22px] font-extrabold">{v}</div>
            <div className="text-[10px] font-bold text-dim uppercase">{l}</div>
          </Card>
        ))}
      </div>
      <Bars data={s.days} k="dau" label="Активные игроки (DAU)" />
      <Bars data={s.days} k="new" label="Новые игроки" />
      <Bars data={s.days} k="daily_played" label="Играли в «Персонажа дня»" />
      <Bars data={s.days} k="daily_solved" label="Угадали персонажа" />
      <Bars data={s.days} k="shares" label="Поделились результатом" />
      <Card className="p-4">
        <div className="mb-2 text-[13px] font-bold">Дома игроков</div>
        <div className="flex flex-col gap-1.5">
          {Object.entries(s.houses).sort((a, b) => b[1] - a[1]).map(([h, n]) => (
            <div key={h} className="flex justify-between text-[13px]"><span>{houseById(cfg, h)?.name ?? h}</span><span className="font-bold text-gold">{n}</span></div>
          ))}
          {Object.keys(s.houses).length === 0 && <div className="text-[13px] text-muted">Тест ещё никто не прошёл</div>}
        </div>
      </Card>
    </div>
  )
}

function EventAdmin({ e, onChange }: { e: PEvent; onChange: () => void }) {
  const toast = useToast((s) => s.show)
  const [busy, setBusy] = useState(false)
  const now = useNow()
  async function run(f: () => Promise<PEvent>, done: string) {
    setBusy(true)
    try {
      const r = await f()
      toast(r.payout ? `${done}: начислено ${r.payout.paid} игрокам по ${r.payout.points}${r.payout.bold ? ' (смелый ×)' : ''}` : done)
      onChange()
    } catch (err) {
      toast(errorText(err))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Card className="flex flex-col gap-2 p-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <Pill>#{e.id}</Pill>
        {e.tag && <Pill>{e.tag}</Pill>}
        <Pill className={e.status === 'resolved' ? 'text-hit' : e.status === 'cancelled' ? 'text-danger' : 'text-gold'}>{e.status === 'open' ? (e.open ? timeLeft(e.deadline_ms - now) : 'приём закрыт') : e.status}</Pill>
        <span className="ml-auto text-[12px] text-muted">{e.votes} голосов</span>
      </div>
      <div className="text-[15px] font-bold">{e.question}</div>
      {e.options.map((o, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`flex-1 rounded-lg px-3 py-2 text-[13px] ${e.correct === i ? 'bg-hit/20 font-bold' : 'bg-surface-2'}`}>
            {o} <span className="text-muted">· {e.distribution?.[i]?.votes ?? 0} ({Math.round((e.distribution?.[i]?.share ?? 0) * 100)}%)</span>
          </div>
          {e.status === 'open' && (
            <button type="button" disabled={busy} onClick={() => confirm(`Исход: «${o}»? Очки будут начислены.`) && run(() => api.admin.resolveEvent(e.id, i), 'Итог сохранён')} className="rounded-lg border border-hit/50 px-2.5 py-2 text-[12px] font-bold text-hit">
              Верно
            </button>
          )}
        </div>
      ))}
      {e.status === 'open' && (
        <div className="flex gap-2 pt-1">
          {e.open && <Button kind="secondary" className="flex-1 py-2.5 text-[13px]" disabled={busy} onClick={() => run(() => api.admin.closeEvent(e.id), 'Приём закрыт')}>Закрыть приём</Button>}
          <Button kind="danger" className="flex-1 py-2.5 text-[13px]" disabled={busy} onClick={() => confirm('Отменить событие?') && run(() => api.admin.cancelEvent(e.id), 'Отменено')}>Отменить</Button>
        </div>
      )}
    </Card>
  )
}

function Events() {
  const qc = useQueryClient()
  const toast = useToast((s) => s.show)
  const q = useQuery({ queryKey: ['admin-events'], queryFn: api.admin.events })
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState('')
  const [hours, setHours] = useState('72')
  const [tag, setTag] = useState('')
  const [points, setPoints] = useState('100')
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin-events'] })
    qc.invalidateQueries({ queryKey: ['predictions'] })
  }
  async function create() {
    try {
      await api.admin.createEvent({
        question,
        options: options.split('\n').map((s) => s.trim()).filter(Boolean),
        deadline_ms: Date.now() + Number(hours) * 3600_000,
        tag,
        base_points: Number(points) || 100,
      })
      setQuestion('')
      setOptions('')
      toast('Событие создано')
      refresh()
    } catch (e) {
      toast(errorText(e))
    }
  }
  const field = 'w-full rounded-xl border border-line-2 bg-surface-2 px-3 py-2.5 text-[14px] outline-none focus:border-gold/60'
  return (
    <div className="flex flex-col gap-3">
      <Card className="flex flex-col gap-2 p-4">
        <div className="font-display text-[20px] font-bold">Новое событие</div>
        <input className={field} placeholder="Вопрос: Кто погибнет в 3-й серии?" value={question} onChange={(e) => setQuestion(e.target.value)} />
        <textarea className={`${field} min-h-24`} placeholder={'Варианты — по одному в строке'} value={options} onChange={(e) => setOptions(e.target.value)} />
        <div className="grid grid-cols-3 gap-2">
          <label className="text-[11px] text-dim">Часов до дедлайна<input className={field} inputMode="numeric" value={hours} onChange={(e) => setHours(e.target.value)} /></label>
          <label className="text-[11px] text-dim">Тег<input className={field} placeholder="S3E3" value={tag} onChange={(e) => setTag(e.target.value)} /></label>
          <label className="text-[11px] text-dim">Очки<input className={field} inputMode="numeric" value={points} onChange={(e) => setPoints(e.target.value)} /></label>
        </div>
        <Button onClick={create} disabled={question.length < 3 || options.split('\n').filter((s) => s.trim()).length < 2}>Создать</Button>
      </Card>
      {!q.data ? <Skeleton className="h-40" /> : q.data.map((e) => <EventAdmin key={e.id} e={e} onChange={refresh} />)}
    </div>
  )
}

function Content() {
  const toast = useToast((s) => s.show)
  const qc = useQueryClient()
  const [kind, setKind] = useState<ContentKind>('characters')
  const q = useQuery({ queryKey: ['admin-content', kind], queryFn: () => api.admin.content(kind) })
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null)
  const [filter, setFilter] = useState('')
  async function save() {
    if (!editing) return
    try {
      await api.admin.saveContent(kind, editing.id, JSON.parse(editing.text))
      toast('Сохранено')
      setEditing(null)
      qc.invalidateQueries({ queryKey: ['admin-content', kind] })
      qc.invalidateQueries({ queryKey: ['config'] })
    } catch (e) {
      toast(e instanceof SyntaxError ? 'Неверный JSON' : errorText(e))
    }
  }
  async function revert(id: string) {
    await api.admin.revertContent(kind, id)
    toast('Возвращено к исходному')
    qc.invalidateQueries({ queryKey: ['admin-content', kind] })
  }
  const items = (q.data?.items ?? []).filter((it) => !filter || JSON.stringify(it).toLowerCase().includes(filter.toLowerCase()))
  return (
    <div className="flex flex-col gap-3">
      <Segmented small value={kind} onChange={(k) => { setKind(k); setEditing(null) }} options={[['characters', 'Персонажи'], ['houses', 'Дома'], ['locations', 'Места'], ['clues', 'Зацепки']]} />
      <input className="rounded-xl border border-line-2 bg-surface-2 px-3 py-2.5 text-[14px] outline-none" placeholder="Поиск" value={filter} onChange={(e) => setFilter(e.target.value)} />
      {editing && (
        <Card className="flex flex-col gap-2 p-3">
          <div className="text-[13px] font-bold">Правка: {editing.id}</div>
          <textarea className="min-h-72 rounded-xl border border-line-2 bg-night p-3 font-mono text-[12px] outline-none" value={editing.text} onChange={(e) => setEditing({ ...editing, text: e.target.value })} spellCheck={false} />
          <div className="flex gap-2">
            <Button className="flex-1" onClick={save}>Сохранить</Button>
            <Button kind="secondary" className="flex-1" onClick={() => setEditing(null)}>Отмена</Button>
          </div>
          <div className="text-[11px] text-dim">Правки проверяются той же схемой, что и файлы контента, и хранятся в базе поверх JSON.</div>
        </Card>
      )}
      {!q.data ? <Skeleton className="h-60" /> : (
        <Card className="divide-y divide-line">
          {items.map((it) => {
            const id = String(it.id)
            return (
              <div key={id} className="flex items-center gap-2 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-bold">{String(it.name ?? it.text ?? id)}</div>
                  <div className="flex gap-1.5 text-[11px] text-dim">{id}{Boolean(it.verify) && <span className="text-partial">· проверить</span>}{Boolean(it._edited) && <span className="text-nova">· изменено</span>}</div>
                </div>
                {Boolean(it._edited) && <button type="button" onClick={() => revert(id)} className="text-[12px] font-bold text-muted">Сброс</button>}
                <button type="button" onClick={() => { const { _edited, ...rest } = it; void _edited; setEditing({ id, text: JSON.stringify(rest, null, 2) }) }} className="rounded-lg border border-line-2 px-2.5 py-1.5 text-[12px] font-bold">Править</button>
              </div>
            )
          })}
        </Card>
      )}
    </div>
  )
}

function Status() {
  const q = useQuery({ queryKey: ['admin-status'], queryFn: api.admin.status })
  const s = q.data
  if (!s) return <Skeleton className="h-40" />
  const row = (label: string, ok: boolean | null, text: string) => (
    <div className="flex items-start gap-3 px-4 py-3">
      <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${ok === null ? 'bg-dim' : ok ? 'bg-hit' : 'bg-danger'}`} />
      <div><div className="text-[14px] font-bold">{label}</div><div className="text-[12px] text-muted">{text}</div></div>
    </div>
  )
  return (
    <div className="flex flex-col gap-3">
      <Card className="divide-y divide-line">
        {row('Бот', s.bot_running, s.bot_running ? `@${s.bot_username} работает` : 'Бот не запущен: проверьте BOT_TOKEN и BOT_MODE')}
        {row('Бот — админ канала', s.bot_is_admin, s.channel ? (s.bot_is_admin ? `Подписка на ${s.channel} проверяется` : s.bot_is_admin === false ? `Добавьте бота администратором в ${s.channel}, иначе гейт пропускает всех` : 'Не удалось проверить') : 'Гейт выключен (канал не задан)')}
        {row('Подписочный гейт', s.gate_problem ? false : true, s.gate_problem ? `Проблема: ${s.gate_problem.text}` : 'Ошибок нет')}
        {s.dev_auth && row('DEV_AUTH', false, 'Включён режим разработки: вход без подписи Telegram. Выключите в проде!')}
      </Card>
    </div>
  )
}

export function AdminScreen({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('stats')
  useEffect(() => bindBack(onClose), [onClose])
  return (
    <div className="sky fixed inset-0 z-30 mx-auto max-w-[480px] overflow-y-auto no-scrollbar">
      <div className="relative flex flex-col gap-4 px-4 pt-5 pb-[max(24px,env(safe-area-inset-bottom))] safe-top">
        <Header title="Админка" subtitle="Видна только ADMIN_IDS" onBack={onClose} />
        <Segmented small value={tab} onChange={setTab} options={[['stats', 'Цифры'], ['events', 'События'], ['content', 'Контент'], ['status', 'Статус']]} />
        {tab === 'stats' && <Stats />}
        {tab === 'events' && <Events />}
        {tab === 'content' && <Content />}
        {tab === 'status' && <Status />}
      </div>
    </div>
  )
}
