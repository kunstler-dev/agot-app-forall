import { useState } from 'react'

import { Avatar } from '../components/Avatar'
import { MadeBy } from '../components/Nova'
import { Button } from '../components/ui'
import { api } from '../lib/api'
import { hapticResult, openTelegram } from '../lib/telegram'
import { t } from '../lib/texts'
import { useApp } from '../store/app'

/** Like a book's flyleaf: a medallion, a few lines, one wax button and a text link. */
export function SubscribeGate() {
  const me = useApp((s) => s.me)!
  const cfg = useApp((s) => s.config)!
  const reloadMe = useApp((s) => s.reloadMe)
  const [busy, setBusy] = useState(false)
  const [fail, setFail] = useState(false)
  const sub = me.subscription

  async function check() {
    setBusy(true)
    setFail(false)
    try {
      const r = await api.subscriptionCheck()
      if (r.ok) {
        hapticResult('success')
        await reloadMe()
      } else {
        hapticResult('error')
        setFail(true)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="paper mx-auto flex h-full max-w-[480px] flex-col px-7 pt-14 pb-[max(24px,env(safe-area-inset-bottom))]">
      <div className="relative flex flex-1 flex-col">
        <div className="sc text-xs text-gilt">{cfg.tenant.app_name}</div>
        <div className="double-rule-t mt-2 pt-8">
          <Avatar name={sub.title || sub.channel} size={84} />
          <h1 className="sc mt-6 mb-2 text-xl font-medium">{t('gate.title')}</h1>
          <p className="m-0 text-base text-ink-muted">{cfg.tenant.channel_about || t('gate.text')}</p>
          <p className="mt-4 mb-0 text-base italic">{sub.title ? `${sub.title}, ${sub.channel}` : sub.channel}</p>
        </div>
      </div>
      <div className="relative flex flex-col items-start gap-4">
        {fail && <p className="m-0 text-sm italic text-wax">{t('gate.fail')}</p>}
        <Button onClick={() => openTelegram(sub.url)} className="w-full">{t('gate.subscribe')}</Button>
        <Button kind="link" disabled={busy} onClick={check}>{busy ? 'Сверяемся со списками…' : t('gate.check')}</Button>
        <MadeBy className="mt-4" />
      </div>
    </div>
  )
}
