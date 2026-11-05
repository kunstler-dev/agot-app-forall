import { useEffect } from 'react'

import { NovaMark } from '../components/Nova'
import { Card, Header } from '../components/ui'
import { bindBack, openExternal, openTelegram } from '../lib/telegram'
import { t } from '../lib/texts'
import { useApp } from '../store/app'

export function AboutScreen({ onClose }: { onClose: () => void }) {
  const cfg = useApp((s) => s.config)!
  const tn = cfg.tenant
  useEffect(() => bindBack(onClose), [onClose])
  return (
    <div className="sky fixed inset-0 z-30 mx-auto max-w-[480px] overflow-y-auto no-scrollbar">
      <div className="relative flex flex-col gap-4 px-4 pt-5 pb-[max(24px,env(safe-area-inset-bottom))] safe-top">
        <Header title={t('about.title')} onBack={onClose} />
        <Card className="p-5">
          <div className="gold-text font-display text-[36px] leading-tight font-bold">{tn.app_name}</div>
          {tn.app_tagline && <div className="text-[14px] text-muted">{tn.app_tagline}</div>}
          {tn.welcome && <p className="mb-0 text-[14px] leading-relaxed">{tn.welcome}</p>}
        </Card>
        {tn.channel && (
          <Card className="p-4" onClick={() => openTelegram(tn.channel_url)}>
            <div className="text-[11px] font-bold tracking-[0.18em] text-dim uppercase">Канал</div>
            <div className="text-[16px] font-bold">{tn.channel_title || tn.channel} <span className="text-gold">{tn.channel}</span></div>
            {tn.channel_about && <div className="text-[13px] text-muted">{tn.channel_about}</div>}
          </Card>
        )}
        {tn.author_links.length > 0 && (
          <Card className="divide-y divide-line">
            {tn.author_links.map((l) => (
              <button key={l.url} type="button" onClick={() => (l.url.startsWith('https://t.me/') ? openTelegram(l.url) : openExternal(l.url))} className="flex w-full justify-between px-4 py-3 text-left text-[14px] font-bold">
                {l.label}<span className="text-dim">↗</span>
              </button>
            ))}
          </Card>
        )}
        {tn.disclaimer && (
          <Card className="border-gold/30 p-4 text-[13px] leading-relaxed text-muted">{tn.disclaimer}</Card>
        )}
        <Card className="flex flex-col items-center gap-2 p-5 text-center">
          <NovaMark size={64} />
          <div className="font-brand text-[15px] tracking-[0.22em]">STELLA NOVA LABS</div>
          <div className="font-display text-[16px] italic text-muted">“Stars don't fear the dark — they're born in it.”</div>
          <div className="text-[12px] text-dim">Интерактивные приложения для авторов фандомных каналов · Кобург, Германия</div>
        </Card>
      </div>
    </div>
  )
}
