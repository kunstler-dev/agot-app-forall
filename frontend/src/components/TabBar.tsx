import { motion } from 'framer-motion'

import { hapticSelect } from '../lib/telegram'
import { t } from '../lib/texts'
import { useApp, type Tab } from '../store/app'
import { Icon, type IconName } from './icons'

const TABS: [Tab, IconName, Parameters<typeof t>[0]][] = [
  ['today', 'today', 'tab.today'],
  ['predictions', 'scroll', 'tab.predictions'],
  ['map', 'map', 'tab.map'],
  ['profile', 'user', 'tab.profile'],
]

export function TabBar() {
  const tab = useApp((s) => s.tab)
  const setTab = useApp((s) => s.setTab)
  return (
    <nav className="relative z-10 grid grid-cols-4 gap-1 border-t border-line bg-bar/95 px-2.5 pt-2 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur">
      {TABS.map(([id, icon, label]) => {
        const on = tab === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => {
              if (!on) hapticSelect()
              setTab(id)
            }}
            className={`relative flex flex-col items-center gap-1 rounded-xl py-1.5 transition-colors ${on ? 'text-gold' : 'text-dim'}`}
          >
            {on && <motion.span layoutId="tab-glow" className="absolute inset-0 rounded-xl bg-gold/10" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
            <Icon name={icon} className="relative" />
            <span className="relative text-[11px] font-bold">{t(label)}</span>
          </button>
        )
      })}
    </nav>
  )
}
