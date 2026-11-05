import { create } from 'zustand'

type ToastState = { text: string | null; show: (t: string) => void }
export const useToast = create<ToastState>((set) => ({
  text: null,
  show: (text) => {
    set({ text })
    setTimeout(() => set((s) => (s.text === text ? { text: null } : s)), 2600)
  },
}))
