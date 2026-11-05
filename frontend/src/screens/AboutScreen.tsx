import { useEffect } from 'react'

import { NovaMark } from '../components/Nova'
import { Rubric, Title } from '../components/ui'
import { bindBack, openExternal, openTelegram } from '../lib/telegram'
import { t } from '../lib/texts'
import { useApp } from '../store/app'

export function AboutScreen({ onClose }: { onClose: () => void }) {
  const cfg = useApp((s) => s.config)!
  const tn = cfg.tenant
  useEffect(() => bindBack(onClose), [onClose])
  return (
    <div className="paper no-scrollbar fixed inset-0 z-30 mx-auto max-w-[480px] overflow-y-auto">
      <div className="relative flex flex-col gap-6 px-5 pt-4 pb-[max(24px,env(safe-area-inset-bottom))] safe-top">
        <Title onBack={onClose}>{t('about.title')}</Title>
        <section>
          <h2 className="sc m-0 text-xl font-medium">{tn.app_name}</h2>
          {tn.app_tagline && <p className="m-0 italic text-ink-muted">{tn.app_tagline}</p>}
          {tn.welcome && <p className="dropcap mt-3 mb-0">{tn.welcome}</p>}
        </section>
        {tn.channel && (
          <section>
            <Rubric>Канал</Rubric>
            <button type="button" onClick={() => openTelegram(tn.channel_url)} className="press py-2 text-left">
              {tn.channel_title || tn.channel} <span className="text-ink-muted">{tn.channel}</span>
            </button>
          </section>
        )}
        {tn.author_links.length > 0 && (
          <section>
            <Rubric>Ссылки</Rubric>
            {tn.author_links.map((l) => (
              <button key={l.url} type="button" onClick={() => (l.url.startsWith('https://t.me/') ? openTelegram(l.url) : openExternal(l.url))} className="rule-b press flex w-full justify-between py-2.5 text-left">
                {l.label}<span className="text-ink-muted">→</span>
              </button>
            ))}
          </section>
        )}
        {tn.disclaimer && <p className="m-0 border-l-2 border-rule-strong pl-3 text-sm text-ink-muted">{tn.disclaimer}</p>}
        <section className="double-rule-t flex items-start gap-4 pt-4">
          <NovaMark size={44} className="shrink-0 text-ink" />
          <div>
            <div className="sc text-base">Stella Nova Labs</div>
            <p className="m-0 text-sm italic text-ink-muted">Stars don't fear the dark — they're born in it.</p>
            <p className="mt-1 mb-0 text-sm text-ink-muted">Интерактивные приложения для авторов фандомных каналов. Кобург, Германия.</p>
          </div>
        </section>
      </div>
    </div>
  )
}
