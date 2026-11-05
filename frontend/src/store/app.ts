import { create } from 'zustand'

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
  r.setProperty('--color-gold', cfg.tenant.theme.accent)
  r.setProperty('--color-nova', cfg.tenant.theme.accent2)
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
      const [config, me] = await Promise.all([api.config(), api.me()])
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
