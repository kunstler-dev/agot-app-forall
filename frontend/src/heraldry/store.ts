import { create } from 'zustand'

import type { ChargeLibrary } from './render'

/** The charge library comes from the backend (engine + tenant charges), loaded once at startup. */
export const useHeraldry = create<{ lib: ChargeLibrary; ready: boolean; load: () => Promise<void> }>((set) => ({
  lib: {},
  ready: false,
  load: async () => {
    const res = await fetch('/api/heraldry')
    set({ lib: res.ok ? await res.json() : {}, ready: true })
  },
}))

export function heraldryLib(): ChargeLibrary {
  return useHeraldry.getState().lib
}

