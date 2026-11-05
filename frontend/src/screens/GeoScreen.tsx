import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { Art } from '../art'
import { Panel, Rubric, Skeleton, Tag, Tile, Title } from '../components/ui'
import { api } from '../lib/api'
import { t } from '../lib/texts'
import { useApp } from '../store/app'
import { MapScreen } from './MapScreen'
import { Leaderboard } from './PredictionsScreen'

/** "Где это?" as its own mode: pick the daily round or practice, then play on the map. */
export function GeoScreen() {
  const cfg = useApp((s) => s.config)!
  const [mode, setMode] = useState<'daily' | 'practice' | null>(null)
  const daily = useQuery({ queryKey: ['geoDaily'], queryFn: api.geoDaily })
  const s = daily.data?.session

  if (mode) return <MapScreen key={mode} geoStart={mode} onExit={() => { setMode(null); void daily.refetch() }} />

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-10 safe-top">
      <Title sub={t('geo.subtitle')}>{t('geo.title')}</Title>
      <Panel className="relative h-[150px] overflow-hidden">
        <Art name="ship" position="center 60%" />
        <div className="absolute inset-x-0 bottom-0 bg-paper/80 px-4 py-2.5">
          <div className="text-xs font-extrabold text-ink-muted uppercase">как играть</div>
          <div className="text-sm font-bold">Записи о местах мира. Отметьте место на карте: чем ближе, тем больше очков.</div>
        </div>
      </Panel>
      <div className="grid grid-cols-2 gap-3">
        <Tile art={<Art name="castle" />} onClick={() => setMode('daily')}
          tag={s?.finished ? `итог: ${s.total}` : s ? 'продолжить' : 'новый'} tagTone={s?.finished ? 'verdigris' : 'wax'}
          title="Раунд дня" text={`${cfg.tenant.geo.rounds} записей, общий рейтинг`} />
        <Tile art={<Art name="knight" />} onClick={() => setMode('practice')}
          tag="без лимита" title="Тренировка" text="Случайные записи с учётом спойлеров" />
      </div>
      <section className="flex flex-col gap-2">
        <Rubric right={daily.data && <Tag tone="muted">{daily.data.top.length} игроков</Tag>}>Лучшие сегодня</Rubric>
        {!daily.data ? <Skeleton lines={4} /> : (
          <Leaderboard data={{ period: 'day', scope: 'geo', season_label: '', top: daily.data.top, me: { rank: null, points: s?.total ?? 0 } }}
            emptyText="Сегодня ещё никто не сыграл раунд дня." />
        )}
      </section>
    </div>
  )
}
