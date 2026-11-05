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
    <nav className="relative z-10 grid grid-cols-4 border-t border-rule-strong bg-paper pb-[max(10px,env(safe-area-inset-bottom))]">
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
            className={`-mt-px flex flex-col items-center gap-0.5 border-t-2 pt-2 pb-1 ${on ? 'border-ink text-ink' : 'border-transparent text-ink-muted'}`}
          >
            <Icon name={icon} size={22} />
            <span className="sc text-xs">{t(label)}</span>
          </button>
        )
      })}
    </nav>
  )
}
