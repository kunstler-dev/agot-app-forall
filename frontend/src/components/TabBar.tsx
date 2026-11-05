import { Icon, type IconName } from '../icons'
import { hapticSelect } from '../lib/telegram'
import { t } from '../lib/texts'
import { useApp, type Tab } from '../store/app'

const ALL: [Tab, IconName, Parameters<typeof t>[0]][] = [
  ['today', 'scroll', 'tab.today'],
  ['geo', 'target', 'tab.geo'],
  ['predictions', 'scales', 'tab.predictions'],
  ['map', 'compass', 'tab.map'],
  ['chat', 'chat', 'tab.chat'],
  ['profile', 'shield', 'tab.profile'],
]

/** Icons with small-caps labels; the active tab gets a rule on top and full ink. */
export function TabBar() {
  const tab = useApp((s) => s.tab)
  const setTab = useApp((s) => s.setTab)
  const features = useApp((s) => s.config?.tenant.features)
  const TABS = ALL.filter(([id]) => (id !== 'predictions' || features?.predictions !== false) && (id !== 'chat' || features?.chat !== false))
  return (
    <nav style={{ gridTemplateColumns: `repeat(${TABS.length}, minmax(0, 1fr))` }} className="relative z-10 grid gap-1 border-t border-rule bg-paper px-2.5 pt-2 pb-[max(12px,env(safe-area-inset-bottom))]">
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
            <span className="text-[10.5px] font-extrabold whitespace-nowrap">{t(label)}</span>
          </button>
        )
      })}
    </nav>
  )
}
