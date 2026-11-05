// Wrapper over window.Telegram.WebApp: in a regular browser (local development) everything is a safe no-op.

type Haptic = {
  impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void
  notificationOccurred: (type: 'error' | 'success' | 'warning') => void
  selectionChanged: () => void
}

type BackButton = { show: () => void; hide: () => void; onClick: (cb: () => void) => void; offClick: (cb: () => void) => void }

type WebApp = {
  initData: string
  initDataUnsafe?: { user?: { photo_url?: string } }
  version?: string
  platform?: string
  colorScheme?: 'light' | 'dark'
  onEvent?: (e: string, cb: () => void) => void
  ready: () => void
  expand: () => void
  disableVerticalSwipes?: () => void
  setHeaderColor?: (color: string) => void
  setBackgroundColor?: (color: string) => void
  setBottomBarColor?: (color: string) => void
  openTelegramLink: (url: string) => void
  openLink: (url: string) => void
  shareMessage?: (id: string, cb?: (sent: boolean) => void) => void
  shareToStory?: (mediaUrl: string, params?: { text?: string; widget_link?: { url: string; name?: string } }) => void
  downloadFile?: (params: { url: string; file_name: string }, cb?: (ok: boolean) => void) => void
  isVersionAtLeast?: (v: string) => boolean
  HapticFeedback?: Haptic
  BackButton?: BackButton
}

declare global {
  interface Window {
    Telegram?: { WebApp?: WebApp }
  }
}

export const tg: WebApp | undefined = window.Telegram?.WebApp?.initData ? window.Telegram.WebApp : undefined

const PAPER = { dark: '#16130F', light: '#EFE6D2' }

const THEME_KEY = 'fk.theme'

/** "Night in the Citadel" is the default for everyone; "Parchment" only if the player chose it
 * in the profile (or ?theme=light for screenshots). */
export function currentScheme(): 'light' | 'dark' {
  const q = new URLSearchParams(location.search).get('theme')
  if (q === 'light' || q === 'dark') return q
  try {
    if (localStorage.getItem(THEME_KEY) === 'light') return 'light'
  } catch {
    /* storage may be blocked */
  }
  return 'dark'
}

export function setScheme(scheme: 'light' | 'dark') {
  try {
    localStorage.setItem(THEME_KEY, scheme)
  } catch {
    /* storage may be blocked */
  }
  applyScheme()
}

export function applyScheme() {
  const scheme = currentScheme()
  document.documentElement.dataset.theme = scheme
  const bg = PAPER[scheme]
  tg?.setHeaderColor?.(bg)
  tg?.setBackgroundColor?.(bg)
  tg?.setBottomBarColor?.(bg)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg)
}

export function initTelegram() {
  applyScheme()
  if (!tg) return
  tg.ready()
  tg.expand()
  tg.disableVerticalSwipes?.()
}

export function openTelegram(url: string) {
  if (tg) tg.openTelegramLink(url)
  else window.open(url, '_blank')
}

export function openExternal(url: string) {
  if (tg) tg.openLink(url)
  else window.open(url, '_blank')
}

export function haptic(style: 'light' | 'medium' | 'heavy' = 'light') {
  tg?.HapticFeedback?.impactOccurred(style)
}

export function hapticResult(type: 'error' | 'success' | 'warning') {
  tg?.HapticFeedback?.notificationOccurred(type)
}

export function hapticSelect() {
  tg?.HapticFeedback?.selectionChanged()
}

export function canShareMessage(): boolean {
  return !!tg?.shareMessage && (tg.isVersionAtLeast?.('8.0') ?? false)
}

export function shareMessage(id: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!tg?.shareMessage) return resolve(false)
    tg.shareMessage(id, (sent) => resolve(!!sent))
  })
}

export function canShareStory(): boolean {
  return !!tg?.shareToStory && (tg.isVersionAtLeast?.('7.8') ?? false)
}

/** Telegram BackButton bound to a handler while a sub-screen is open. */
export function bindBack(handler: (() => void) | null): () => void {
  const b = tg?.BackButton
  if (!b) return () => {}
  if (!handler) {
    b.hide()
    return () => {}
  }
  b.show()
  b.onClick(handler)
  return () => {
    b.offClick(handler)
    b.hide()
  }
}

/** Authorization header for the API. Outside Telegram it's a dev user (the backend accepts it only with DEV_AUTH=1). */
export function authHeader(): string {
  if (tg) return `tma ${tg.initData}`
  const id = new URLSearchParams(location.search).get('dev') ?? '1'
  return `tma dev:${/^\d+$/.test(id) ? id : '1'}`
}
