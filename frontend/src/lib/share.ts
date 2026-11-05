import { api, type ShareKind } from './api'
import { canShareMessage, openTelegram, shareMessage, tg } from './telegram'
import { useToast } from './toast'

/** Share a result to a Telegram chat: prepared message (Bot API 8.0) → t.me/share link → system share → clipboard. */
export async function shareResult(kind: ShareKind, text: string, cardPngDataUrl?: string): Promise<void> {
  const toast = useToast.getState().show
  let cardId: string | undefined
  try {
    if (cardPngDataUrl) cardId = (await api.shareCard(cardPngDataUrl)).id
  } catch {
    /* the text share still works without a card */
  }
  try {
    const r = await api.sharePrepare(kind, text, cardId)
    if (r.prepared_id && canShareMessage()) {
      await shareMessage(r.prepared_id)
      return
    }
    if (tg) {
      openTelegram(r.fallback_url)
      return
    }
    if (navigator.share) {
      await navigator.share({ text: r.text }).catch(() => {})
      return
    }
    await copyText(r.text)
    toast('Результат скопирован — вставь его в чат')
  } catch {
    await copyText(text)
    toast('Результат скопирован')
  }
}

export async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    ta.remove()
  }
}
