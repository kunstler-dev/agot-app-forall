import { motion } from 'framer-motion'
import { useState } from 'react'

import { Icon } from '../components/icons'
import { NovaMark } from '../components/Nova'
import { Button } from '../components/ui'
import { api } from '../lib/api'
import { hapticResult, openTelegram } from '../lib/telegram'
import { t } from '../lib/texts'
import { useApp } from '../store/app'

/** Without a subscription to the tenant channel the app does not open. */
export function SubscribeGate() {
  const me = useApp((s) => s.me)!
  const cfg = useApp((s) => s.config)!
  const reloadMe = useApp((s) => s.reloadMe)
  const [opened, setOpened] = useState(false)
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
    <div className="sky relative mx-auto flex h-full max-w-[480px] flex-col px-5 pt-6 pb-[max(20px,env(safe-area-inset-bottom))]">
      <div className="relative flex flex-1 flex-col items-center justify-center gap-5 text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative">
          <div className="flex h-[132px] w-[132px] items-center justify-center rounded-full border border-gold/40 bg-gradient-to-b from-surface-3 to-surface shadow-[0_0_60px_-10px_rgba(244,201,93,0.45)]">
            <span className="gold-text font-display text-[56px] font-bold">{(sub.title || cfg.tenant.app_name).charAt(0)}</span>
          </div>
          <div className="absolute -right-1 -bottom-1"><NovaMark size={40} /></div>
        </motion.div>
        <div className="flex flex-col gap-2">
          <div className="text-[12px] font-bold tracking-[0.2em] text-gold uppercase">{cfg.tenant.app_name}</div>
          <h1 className="m-0 font-display text-[30px] leading-tight font-bold">{t('gate.title')}</h1>
          {sub.title && <div className="text-[15px] font-semibold">{sub.title} · {sub.channel}</div>}
          <p className="m-0 text-[14px] leading-relaxed text-muted">{cfg.tenant.channel_about || t('gate.text')}</p>
        </div>
      </div>
      <div className="relative flex flex-col gap-2.5 pt-4">
        {fail && <div className="text-center text-[13px] text-danger">{t('gate.fail')}</div>}
        <Button icon="bell" onClick={() => { openTelegram(sub.url); setOpened(true) }}>
          {t('gate.subscribe')} {sub.channel}
        </Button>
        <Button kind="secondary" disabled={busy} onClick={check} className={opened ? 'border-gold/50 text-gold' : ''}>
          {busy ? 'Проверяем…' : <><Icon name="check" size={18} /> {t('gate.check')}</>}
        </Button>
      </div>
    </div>
  )
}
