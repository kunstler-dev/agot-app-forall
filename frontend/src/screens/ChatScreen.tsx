import { useCallback, useEffect, useRef, useState } from 'react'

import { Art } from '../art'
import { Avatar } from '../components/Avatar'
import { Empty } from '../components/ui'
import { Crest } from '../heraldry'
import { Icon } from '../icons'
import { api, errorText, type ChatMessage } from '../lib/api'
import { haptic, hapticResult } from '../lib/telegram'
import { useToast } from '../lib/toast'
import { houseById, useApp } from '../store/app'

const POLL_MS = 3000
const time = (ms: number) => new Date(ms).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })

function Bubble({ m, admin, onDelete, onBan }: { m: ChatMessage; admin: boolean; onDelete: () => void; onBan: () => void }) {
  const cfg = useApp((s) => s.config)
  const h = houseById(cfg, m.user.house)
  return (
    <div className={`flex gap-2 ${m.me ? 'flex-row-reverse' : ''}`}>
      {!m.me && <Avatar name={m.user.name} url={m.user.photo_url} size={32} />}
      <div className={`max-w-[78%] rounded-2xl px-3 py-2 ${m.me ? 'rounded-br-md bg-gilt/20' : 'rounded-bl-md border border-rule bg-paper-2'}`}>
        {!m.me && (
          <div className="mb-0.5 flex items-center gap-1.5 text-xs font-extrabold text-gilt">
            {h && <Crest blazon={h.crest} size={12} />}
            {m.user.name}
          </div>
        )}
        <div className="text-[15px] leading-snug break-words whitespace-pre-wrap">{m.text}</div>
        <div className="mt-0.5 flex items-center justify-end gap-2 text-[10px] text-ink-muted">
          {admin && !m.me && (
            <>
              <button type="button" onClick={onDelete} className="font-extrabold text-wax">удалить</button>
              <button type="button" onClick={onBan} className="font-extrabold text-wax">закрыть чат</button>
            </>
          )}
          <span className="num">{time(m.ms)}</span>
        </div>
      </div>
    </div>
  )
}

export function ChatScreen() {
  const me = useApp((s) => s.me)!
  const toast = useToast((s) => s.show)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loaded, setLoaded] = useState(false)
  const [banned, setBanned] = useState(false)
  const [maxLen, setMaxLen] = useState(500)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const list = useRef<HTMLDivElement>(null)
  const lastId = useRef(0)
  const stick = useRef(true)

  const scrollDown = () => requestAnimationFrame(() => list.current?.scrollTo({ top: list.current.scrollHeight }))

  const merge = useCallback((incoming: ChatMessage[]) => {
    if (!incoming.length) return
    setMessages((old) => {
      const seen = new Set(old.map((m) => m.id))
      return [...old, ...incoming.filter((m) => !seen.has(m.id))].slice(-200)
    })
    lastId.current = Math.max(lastId.current, ...incoming.map((m) => m.id))
    if (stick.current) scrollDown()
  }, [])

  useEffect(() => {
    const alive = { current: true }
    const first = async () => {
      try {
        const r = await api.chat()
        if (!alive.current) return
        setBanned(r.banned)
        setMaxLen(r.max_length)
        merge(r.messages)
      } finally {
        if (alive.current) setLoaded(true)
      }
    }
    void first()
    const id = setInterval(async () => {
      if (document.visibilityState !== 'visible') return
      try {
        const r = await api.chat(lastId.current)
        if (alive.current) merge(r.messages)
      } catch {
        /* the next poll will try again */
      }
    }, POLL_MS)
    return () => {
      alive.current = false
      clearInterval(id)
    }
  }, [merge])

  async function send() {
    const t = text.trim()
    if (!t || busy) return
    setBusy(true)
    try {
      const m = await api.chatSend(t)
      haptic('light')
      setText('')
      stick.current = true
      merge([m])
    } catch (e) {
      hapticResult('error')
      toast(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: number) {
    await api.chatDelete(id)
    setMessages((old) => old.filter((m) => m.id !== id))
  }

  async function ban(userId: number) {
    if (!confirm('Закрыть этому игроку чат и скрыть его сообщения?')) return
    await api.chatBan(userId)
    setMessages((old) => old.filter((m) => m.user.id !== userId))
    toast('Игроку закрыт чат')
  }

  return (
    <div className="flex h-full flex-col">
      <header className="relative h-[86px] shrink-0 overflow-hidden border-b border-rule">
        <Art name="archive" position="center 35%" />
        <div className="absolute inset-0 bg-paper/55" />
        <div className="absolute bottom-2.5 left-4 safe-top">
          <h1 className="sc m-0 text-[26px] leading-none">Общий чат</h1>
          <div className="text-xs font-bold text-ink-muted">Все игроки канала. Без ссылок и рекламы.</div>
        </div>
      </header>
      <div
        ref={list}
        onScroll={(e) => {
          const el = e.currentTarget
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
        }}
        className="no-scrollbar flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-3 py-3"
      >
        {loaded && messages.length === 0 && <Empty text="Здесь пока тихо. Напишите первым." />}
        {messages.map((m) => (
          <Bubble key={m.id} m={m} admin={me.user.is_admin} onDelete={() => remove(m.id)} onBan={() => ban(m.user.id)} />
        ))}
      </div>
      <div className="shrink-0 border-t border-rule bg-paper px-3 pt-2 pb-2">
        {banned ? (
          <p className="m-0 py-2 text-center text-sm font-bold text-wax">Администратор закрыл вам чат.</p>
        ) : (
          <div className="flex items-end gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, maxLen))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void send()
                }
              }}
              rows={1}
              placeholder="Сообщение"
              className="max-h-28 min-h-[44px] flex-1 resize-none rounded-xl border-2 border-rule-strong bg-paper-2 px-3 py-2.5 text-[15px] outline-none focus:border-gilt"
            />
            <button type="button" aria-label="Отправить" disabled={!text.trim() || busy} onClick={send}
              className="ledge flex h-[44px] w-[48px] shrink-0 items-center justify-center rounded-xl bg-wax text-on-wax [--ledge:#6E1C17] disabled:opacity-40">
              <Icon name="send" size={22} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
