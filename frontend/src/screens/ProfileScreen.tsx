import { useQuery } from '@tanstack/react-query'

import { Avatar } from '../components/Avatar'
import { Crest } from '../components/Crest'
import { Icon, type IconName } from '../components/icons'
import { MadeBy } from '../components/Nova'
import { Button, Card, Skeleton } from '../components/ui'
import { api } from '../lib/api'
import { haptic } from '../lib/telegram'
import { plural, t } from '../lib/texts'
import { houseById, useApp } from '../store/app'

function Toggle({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
  return (
    <button type="button" onClick={() => { haptic('light'); onChange(!on) }} className="flex w-full items-center gap-3 px-4 py-3 text-left">
      <div className="flex-1">
        <div className="text-[14px] font-bold">{label}</div>
        <div className="text-[12px] text-muted">{hint}</div>
      </div>
      <span className={`relative h-7 w-12 rounded-full transition-colors ${on ? 'bg-gold' : 'bg-surface-3'}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-[left] ${on ? 'left-6' : 'left-1'}`} />
      </span>
    </button>
  )
}

function MenuItem({ icon, label, onClick }: { icon: IconName; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="press flex w-full items-center gap-3 px-4 py-3.5 text-left">
      <Icon name={icon} size={20} className="text-gold" />
      <span className="flex-1 text-[15px] font-bold">{label}</span>
      <Icon name="back" size={16} className="rotate-180 text-dim" />
    </button>
  )
}

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
    <div className="flex flex-col gap-4 px-4 pt-5 pb-8 safe-top">
      <div className="flex items-center gap-4">
        <Avatar name={u.first_name} url={u.photo_url} size={64} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-[28px] leading-tight font-bold">{u.first_name || 'Игрок'}</div>
          <div className="text-[13px] text-muted">{u.username ? `@${u.username}` : ''}</div>
        </div>
        <div className="text-right">
          <div className="gold-text text-[28px] leading-none font-extrabold">{p?.user.points ?? u.points}</div>
          <div className="text-[11px] font-bold text-dim uppercase">{t('profile.points')}</div>
        </div>
      </div>

      {house ? (
        <Card className="flex items-center gap-4 p-4" onClick={() => open('quiz')}>
          <Crest spec={house.crest} size={58} />
          <div className="flex-1">
            <div className="text-[11px] font-bold tracking-[0.18em] text-dim uppercase">{t('quiz.house')}</div>
            <div className="font-display text-[24px] leading-tight font-bold">{house.name}</div>
            {house.words && <div className="font-display text-[15px] italic text-gold">«{house.words}»</div>}
          </div>
          <span className="text-[12px] font-bold text-muted">Пересдать</span>
        </Card>
      ) : (
        <Card className="flex items-center gap-4 p-4">
          <div className="flex-1">
            <div className="font-display text-[22px] font-bold">Какой ты дом?</div>
            <div className="text-[13px] text-muted">10 вопросов — и герб в профиле</div>
          </div>
          <Button onClick={() => open('quiz')}>{t('quiz.cta')}</Button>
        </Card>
      )}

      {!p ? (
        <Skeleton className="h-28" />
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {([['Неделя', p.ranks.week], ['Сезон', p.ranks.season], ['Всё время', p.ranks.all]] as const).map(([l, r]) => (
            <Card key={l} className="p-3 text-center">
              <div className="text-[22px] leading-none font-extrabold">{r.rank ? `#${r.rank}` : '—'}</div>
              <div className="mt-1 text-[11px] font-bold text-dim uppercase">{l}</div>
              <div className="text-[11px] text-muted">{r.points} очк.</div>
            </Card>
          ))}
        </div>
      )}

      {st && (
        <Card className="grid grid-cols-4 gap-2 p-3 text-center">
          {[
            [st.streak, 'серия', 'flame'],
            [st.best_streak, 'рекорд', 'crown'],
            [st.won, 'угадано', 'check'],
            [p!.predictions_won, 'прогнозы', 'scroll'],
          ].map(([v, l, i]) => (
            <div key={String(l)} className="flex flex-col items-center gap-0.5">
              <Icon name={i as IconName} size={16} className="text-gold" />
              <div className="text-[19px] font-extrabold">{v}</div>
              <div className="text-[10px] font-bold text-dim uppercase">{l}</div>
            </div>
          ))}
        </Card>
      )}
      {st && st.streak > 0 && <div className="-mt-2 text-center text-[12px] text-muted">{st.streak} {plural(st.streak, 'день', 'дня', 'дней')} подряд угадываешь персонажа дня</div>}

      <Card className="divide-y divide-line">
        <Toggle on={u.notify_daily} onChange={(v) => set('notify_daily', v)} label="Новый персонаж дня" hint="Сообщение от бота раз в день" />
        <Toggle on={u.notify_predictions} onChange={(v) => set('notify_predictions', v)} label="Напоминания о прогнозах" hint="За час до закрытия приёма" />
      </Card>

      <Card className="divide-y divide-line">
        <MenuItem icon="shield" label="Пройти тест про дом" onClick={() => open('quiz')} />
        <MenuItem icon="info" label={t('about.title')} onClick={() => open('about')} />
        {u.is_admin && <MenuItem icon="settings" label="Админка" onClick={() => open('admin')} />}
      </Card>

      <MadeBy className="pt-2" />
    </div>
  )
}
