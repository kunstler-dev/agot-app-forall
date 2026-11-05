import { useQuery } from '@tanstack/react-query'

import { Avatar } from '../components/Avatar'
import { MadeBy } from '../components/Nova'
import { Button, Rubric, Skeleton } from '../components/ui'
import { Crest } from '../heraldry'
import { api } from '../lib/api'
import { currentScheme, haptic, setScheme } from '../lib/telegram'
import { useState } from 'react'
import { t } from '../lib/texts'
import { houseById, useApp } from '../store/app'

function Toggle({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
  return (
    <button type="button" onClick={() => { haptic('light'); onChange(!on) }} className="rule-b flex w-full items-center gap-3 py-3 text-left">
      <span className="flex-1">
        <span className="block">{label}</span>
        <span className="block text-sm text-ink-muted">{hint}</span>
      </span>
      <span className="sc text-sm">{on ? <span className="text-ink">вкл.</span> : <span className="text-ink-muted">выкл.</span>}</span>
    </button>
  )
}

function ThemeSwitch() {
  const [scheme, set] = useState(currentScheme())
  return (
    <section>
      <Rubric>Оформление</Rubric>
      {(['dark', 'light'] as const).map((k) => (
        <button key={k} type="button" onClick={() => { haptic('light'); setScheme(k); set(k) }} className="rule-b flex w-full items-baseline justify-between py-3 text-left">
          <span>{k === 'dark' ? 'Ночь в Цитадели' : 'Пергамент'}</span>
          <span className="sc text-sm">{scheme === k ? <span className="text-ink">выбрано</span> : ''}</span>
        </button>
      ))}
    </section>
  )
}

function Link({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rule-b press flex w-full items-baseline justify-between py-3 text-left">
      <span>{label}</span>
      <span className="text-ink-muted">→</span>
    </button>
  )
}

/** Like a title page: name, the house crest, then the record as a table. */
export function ProfileScreen() {
  const cfg = useApp((s) => s.config)!
  const me = useApp((s) => s.me)!
  const open = useApp((s) => s.open)
  const patchUser = useApp((s) => s.patchUser)
  const q = useQuery({ queryKey: ['profile'], queryFn: api.profile })
  const p = q.data
  const u = me.user
  const house = houseById(cfg, u.house)

  async function set(k: 'notify_daily' | 'notify_predictions', v: boolean) {
    patchUser({ [k]: v })
    await api.settings({ [k]: v })
  }

  const st = p?.daily.character
  return (
    <div className="flex flex-col gap-6 px-5 pt-6 pb-10 safe-top">
      <header className="double-rule-b flex flex-col items-center gap-3 pb-5 text-center">
        <Avatar name={u.first_name} url={u.photo_url} size={72} />
        <div>
          <h1 className="sc m-0 text-xl font-medium">{u.first_name || 'Игрок'}</h1>
          {u.username && <div className="text-sm text-ink-muted">@{u.username}</div>}
        </div>
        {house ? (
          <button type="button" onClick={() => open('quiz')} className="press flex flex-col items-center gap-1">
            <Crest blazon={house.crest} size={72} />
            <span className="sc text-base">{house.name}</span>
            {house.words && <span className="text-sm italic text-ink-muted">«{house.words}»</span>}
          </button>
        ) : (
          <Button kind="secondary" onClick={() => open('quiz')}>{t('quiz.cta')}: какой ваш дом</Button>
        )}
      </header>

      <section>
        <Rubric>Записи</Rubric>
        {!p ? <Skeleton lines={5} /> : (
          <table className="num w-full border-collapse">
            <tbody>
              {[
                ['Очки', p.user.points],
                ['Место за неделю', p.ranks.week.rank ?? '—'],
                ['Место за сезон', p.ranks.season.rank ?? '—'],
                ['Место за всё время', p.ranks.all.rank ?? '—'],
                ['Серия персонажа дня', st?.streak ?? 0],
                ['Лучшая серия', st?.best_streak ?? 0],
                ['Угадано персонажей', st?.won ?? 0],
                ['Верных прогнозов', p.predictions_won],
              ].map(([l, v]) => (
                <tr key={String(l)} className="rule-b"><td className="py-1.5 text-ink-muted">{l}</td><td className="py-1.5 text-right">{v}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <Rubric>Ворон приносит</Rubric>
        <Toggle on={u.notify_daily} onChange={(v) => set('notify_daily', v)} label="Персонажа дня" hint="Одно сообщение в день" />
        <Toggle on={u.notify_predictions} onChange={(v) => set('notify_predictions', v)} label="Напоминания о прогнозах" hint="За час до закрытия" />
      </section>

      <ThemeSwitch />

      <section>
        <Rubric>Прочее</Rubric>
        <Link label="Пройти тест про дом" onClick={() => open('quiz')} />
        <Link label={t('about.title')} onClick={() => open('about')} />
        {u.is_admin && <Link label="Админка" onClick={() => open('admin')} />}
      </section>

      <MadeBy className="pt-2" />
    </div>
  )
}
