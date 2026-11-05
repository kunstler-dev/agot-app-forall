import { create } from 'zustand'

import { useHeraldry } from '../heraldry/store'
import { api, type Config, type Me } from '../lib/api'
import { setTexts } from '../lib/texts'

export type Tab = 'today' | 'predictions' | 'map' | 'profile'
export type Overlay = 'quiz' | 'about' | 'admin' | null

type State = {
  config: Config | null
  me: Me | null
  error: string | null
  tab: Tab
  overlay: Overlay
  onboarding: boolean
  finishOnboarding: () => void
  load: () => Promise<void>
  reloadMe: () => Promise<void>
  setTab: (t: Tab) => void
  open: (o: Overlay) => void
  patchUser: (u: Partial<Me['user']>) => void
}

function applyTheme(cfg: Config) {
  const r = document.documentElement.style
  // a tenant may tint the two accents; the defaults are the engine's wax and gilt
  if (cfg.tenant.theme.accent && cfg.tenant.theme.accent !== '#B8322A') r.setProperty('--color-wax', cfg.tenant.theme.accent)
  if (cfg.tenant.theme.accent2 && cfg.tenant.theme.accent2 !== '#C9A24A') r.setProperty('--color-gilt', cfg.tenant.theme.accent2)
  document.title = cfg.tenant.app_name
  setTexts(cfg.tenant.texts)
}

const ONBOARDED = 'fk.onboarded'

function storage(key: string, value?: string): string | null {
  try {
    if (value !== undefined) localStorage.setItem(key, value)
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function needsOnboarding(me: Me): boolean {
  return me.subscription.ok && !me.user.house && !storage(ONBOARDED)
}

export const useApp = create<State>((set, get) => ({
  config: null,
  me: null,
  error: null,
  tab: 'today',
  overlay: null,
  onboarding: false,
  finishOnboarding: () => {
    storage(ONBOARDED, '1')
    set({ onboarding: false })
  },
  load: async () => {
    try {
      const [config, me] = await Promise.all([api.config(), api.me(), useHeraldry.getState().load()])
      applyTheme(config)
      set({ config, me, error: null, onboarding: needsOnboarding(me) })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Нет связи с сервером' })
    }
  },
  reloadMe: async () => {
    const me = await api.me()
    set({ me, onboarding: needsOnboarding(me) })
  },
  setTab: (tab) => set({ tab }),
  open: (overlay) => set({ overlay }),
  patchUser: (u) => {
    const me = get().me
    if (me) set({ me: { ...me, user: { ...me.user, ...u } } })
  },
}))

export function houseById(cfg: Config | null, id: string | null | undefined) {
  return cfg?.houses.find((h) => h.id === id) ?? null
}
