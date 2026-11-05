import { Icon, type IconName } from '../icons'
import { hapticSelect } from '../lib/telegram'
import { t } from '../lib/texts'
import { useApp, type Tab } from '../store/app'

const TABS: [Tab, IconName, Parameters<typeof t>[0]][] = [
  ['today', 'scroll', 'tab.today'],
  ['predictions', 'scales', 'tab.predictions'],
  ['map', 'compass', 'tab.map'],
  ['profile', 'shield', 'tab.profile'],
]

/** Icons with small-caps labels; the active tab gets a rule on top and full ink. */
export function TabBar() {
  const tab = useApp((s) => s.tab)
  const setTab = useApp((s) => s.setTab)
  return (
    <nav className="relative z-10 grid grid-cols-4 gap-1 border-t border-rule bg-paper px-2.5 pt-2 pb-[max(12px,env(safe-area-inset-bottom))]">
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
            className={`press flex flex-col items-center gap-1 rounded-xl py-1.5 ${on ? 'bg-gilt/15 text-gilt' : 'text-ink-muted'}`}
          >
            <Icon name={icon} size={23} />
            <span className="text-[11px] font-extrabold">{t(label)}</span>
          </button>
        )
      })}
    </nav>
  )
}
