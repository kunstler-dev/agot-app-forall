import { useQuery } from '@tanstack/react-query'

import { Avatar } from '../components/Avatar'
import { MadeBy } from '../components/Nova'
import { Art } from '../art'
import { Button, Panel, Rubric, Skeleton } from '../components/ui'
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
    <div className="flex flex-col gap-4 px-4 pt-4 pb-10 safe-top">
      <header className="relative overflow-hidden rounded-2xl border border-rule">
        <div className="h-[120px] [&>svg]:h-full [&>svg]:w-full"><Art name="castle" /></div>
        <div className="flex items-end gap-3 bg-paper-2 px-4 pb-4">
          <div className="-mt-10"><Avatar name={u.first_name} url={u.photo_url} size={76} /></div>
          <div className="min-w-0 flex-1 pb-1">
            <h1 className="sc m-0 truncate text-[22px] leading-tight font-medium">{u.first_name || 'Игрок'}</h1>
            {u.username && <div className="text-xs text-ink-muted">@{u.username}</div>}
          </div>
          <div className="num pb-1 text-right">
            <div className="text-2xl leading-none font-extrabold text-gilt">{p?.user.points ?? u.points}</div>
            <div className="text-[10px] font-extrabold text-ink-muted uppercase">{t('profile.points')}</div>
          </div>
        </div>
      </header>

      {house ? (
        <Panel className="flex items-center gap-4 p-4" onClick={() => open('quiz')}>
          <Crest blazon={house.crest} size={64} />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-extrabold text-ink-muted uppercase">ваш дом</div>
            <div className="sc text-lg leading-tight">{house.name}</div>
            {house.words && <div className="serif text-sm italic text-gilt">«{house.words}»</div>}
          </div>
          <span className="text-xs font-extrabold text-ink-muted">пересдать</span>
        </Panel>
      ) : (
        <Panel className="flex items-center gap-4 p-4">
          <div className="flex-1">
            <div className="sc text-lg">Какой ваш дом?</div>
            <div className="text-xs text-ink-muted">Несколько вопросов, и герб в профиле</div>
          </div>
          <Button onClick={() => open('quiz')}>{t('quiz.cta')}</Button>
        </Panel>
      )}

      <section>
        <Rubric>Записи</Rubric>
        {!p ? <Skeleton lines={5} /> : (
          <div className="mt-2 grid grid-cols-3 gap-2">
            {[
              [p.ranks.week.rank ? `#${p.ranks.week.rank}` : '—', 'неделя'],
              [p.ranks.season.rank ? `#${p.ranks.season.rank}` : '—', 'сезон'],
              [p.ranks.all.rank ? `#${p.ranks.all.rank}` : '—', 'всё время'],
              [st?.streak ?? 0, 'серия'],
              [st?.won ?? 0, 'угадано'],
              [p.predictions_won, 'прогнозы'],
            ].map(([v, l]) => (
              <Panel key={String(l)} className="num py-3 text-center">
                <div className="text-xl leading-none font-extrabold">{v}</div>
                <div className="mt-1 text-[10px] font-extrabold text-ink-muted uppercase">{l}</div>
              </Panel>
            ))}
          </div>
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
