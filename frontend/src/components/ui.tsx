import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, type ReactNode } from 'react'

import { Icon, type IconName } from '../icons'
import { bindBack, haptic } from '../lib/telegram'
import { ease } from '../lib/format'
import { useToast } from '../lib/toast'

/** A card: rounded, framed, raised. The main building block of every screen. */
export function Panel({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={`rounded-2xl border border-rule bg-paper-2 ${onClick ? 'press cursor-pointer' : ''} ${className}`}>
      {children}
    </div>
  )
}

/** A big tappable tile with an illustration on top, a tag and a title, like the game tiles in ELT. */
export function Tile({ art, tag, tagTone = 'gilt', title, text, onClick, active, className = '' }: {
  art: ReactNode
  tag?: ReactNode
  tagTone?: 'gilt' | 'wax' | 'verdigris'
  title: ReactNode
  text?: ReactNode
  onClick?: () => void
  active?: boolean
  className?: string
}) {
  return (
    <button type="button" onClick={() => { haptic('light'); onClick?.() }}
      className={`press relative flex flex-col overflow-hidden rounded-2xl border-2 bg-paper-2 text-left ${active ? 'border-gilt' : 'border-rule'} ${className}`}>
      <div className="h-[92px] w-full overflow-hidden ">{art}</div>
      <div className="flex flex-col gap-1 p-3">
        {tag && <Tag tone={tagTone}>{tag}</Tag>}
        <span className="text-[15px] leading-tight font-extrabold">{title}</span>
        {text && <span className="text-xs leading-snug text-ink-muted">{text}</span>}
      </div>
    </button>
  )
}

export function Tag({ children, tone = 'gilt' }: { children: ReactNode; tone?: 'gilt' | 'wax' | 'verdigris' | 'muted' }) {
  const t = {
    gilt: 'bg-gilt/15 text-gilt',
    wax: 'bg-wax/18 text-wax',
    verdigris: 'bg-verdigris/20 text-verdigris',
    muted: 'bg-ink/8 text-ink-muted',
  }[tone]
  return <span className={`inline-flex w-fit items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-extrabold ${t}`}>{children}</span>
}

export function Button({
  children,
  onClick,
  kind = 'primary',
  disabled,
  icon,
  className = '',
}: {
  children: ReactNode
  onClick?: () => void
  kind?: 'primary' | 'secondary' | 'gilt' | 'link'
  disabled?: boolean
  icon?: IconName
  className?: string
}) {
  const styles = {
    primary: 'ledge bg-wax text-on-wax [--ledge:#6E1C17] px-5 py-3.5',
    gilt: 'ledge bg-gilt text-paper [--ledge:#7A5F22] px-5 py-3.5',
    secondary: 'ledge border-2 border-rule-strong bg-paper-2 text-ink [--ledge:rgba(0,0,0,0.5)] px-5 py-3',
    link: 'text-ink underline decoration-rule-strong underline-offset-4 px-0 py-1',
  }[kind]
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        haptic(kind === 'link' ? 'light' : 'medium')
        onClick?.()
      }}
      className={`inline-flex items-center justify-center gap-2 rounded-xl text-[15px] font-extrabold disabled:opacity-45 ${styles} ${className}`}
    >
      {icon && <Icon name={icon} size={19} />}
      {children}
    </button>
  )
}

/** Page title: small caps, left aligned, an optional folio mark in the margin. */
export function Title({ children, folio, sub, onBack }: { children: ReactNode; folio?: string; sub?: ReactNode; onBack?: () => void }) {
  return (
    <header className="pb-1">
      <div className="flex items-baseline gap-3">
        {onBack && (
          <button type="button" aria-label="Назад" onClick={onBack} className="press -ml-1 self-center text-ink-muted">
            <Icon name="up" rotate={-90} size={22} />
          </button>
        )}
        {folio && <span className="sc w-6 shrink-0 text-xs text-gilt">{folio}</span>}
        <h1 className="sc m-0 text-[28px] leading-none font-medium">{children}</h1>
      </div>
      {sub && <div className={`mt-1 text-sm text-ink-muted ${folio ? 'pl-9' : ''}`}>{sub}</div>}
    </header>
  )
}

/** A rubric: a small-caps section label sitting on a hairline. */
export function Rubric({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="rule-b flex items-baseline justify-between pb-1">
      <span className="sc text-xs text-ink-muted">{children}</span>
      {right && <span className="text-xs text-ink-muted">{right}</span>}
    </div>
  )
}

/** Segmented control: the active option is a solid chip. */
export function Tabs<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="grid gap-1 rounded-xl border border-rule bg-paper-2 p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => {
            haptic('light')
            onChange(v)
          }}
          className={`press rounded-lg py-2 text-[13px] font-extrabold transition-colors ${v === value ? 'bg-gilt text-paper' : 'text-ink-muted'}`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

/** A writing line: only the bottom rule, like a ledger entry. */
export function LineInput({ value, onChange, placeholder, disabled, onClear }: { value: string; onChange: (v: string) => void; placeholder: string; disabled?: boolean; onClear?: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border-2 border-rule-strong bg-paper px-3 focus-within:border-gilt">
      <Icon name="quill" size={18} className="shrink-0 text-ink-muted" />
      <input
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-12 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-muted"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />
      {value && onClear && (
        <button type="button" aria-label="Стереть" onClick={onClear} className="text-ink-muted">
          <Icon name="cross" size={18} />
        </button>
      )}
    </div>
  )
}

export function Radio({ on }: { on: boolean }) {
  return (
    <span className={`inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border ${on ? 'border-ink' : 'border-rule-strong'}`}>
      {on && <span className="h-2 w-2 rounded-full bg-ink" />}
    </span>
  )
}

/** A thin share line (vote split): hairline track, ink fill. */
export function ShareLine({ value, strong }: { value: number; strong?: boolean }) {
  return (
    <div className="h-px w-full bg-rule">
      <div className={`h-px ${strong ? 'bg-verdigris' : 'bg-ink'}`} style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, height: strong ? 2 : 1 }} />
    </div>
  )
}

/** Skeleton: pale ruled lines, no shimmer. */
export function Skeleton({ lines = 4 }: { lines?: number }) {
  return (
    <div className="flex flex-col gap-3 py-2" aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="h-2.5 bg-rule" style={{ width: `${[92, 78, 85, 64, 70][i % 5]}%` }} />
      ))}
    </div>
  )
}

/** A small engraved vignette for empty states. */
export function Vignette() {
  return (
    <svg width="64" height="20" viewBox="0 0 64 20" fill="none" stroke="currentColor" strokeWidth="1" className="text-ink-muted" aria-hidden="true">
      <path d="M2 10h20M42 10h20M32 3c-4 3-4 11 0 14 4-3 4-11 0-14ZM24 10c2-3 5-3 8 0-3 3-6 3-8 0Zm16 0c-2-3-5-3-8 0 3 3 6 3 8 0Z" />
    </svg>
  )
}

export function Empty({ text, action }: { text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 py-8">
      <Vignette />
      <p className="m-0 text-base italic text-ink-muted">{text}</p>
      {action}
    </div>
  )
}

/** Bottom sheet: paper, double rule on top, the Telegram back button closes it. */
export function Sheet({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: ReactNode; title?: string }) {
  useEffect(() => (open ? bindBack(onClose) : undefined), [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-40 bg-black/45" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={ease} onClick={onClose} />
          <motion.div
            className="no-scrollbar fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[86vh] max-w-[480px] overflow-y-auto rounded-t-3xl border-t-2 border-rule-strong bg-paper-2 px-5 pt-3 pb-[max(20px,env(safe-area-inset-bottom))]"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
          >
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-rule-strong" />
            <div className="mb-3 flex items-baseline justify-between gap-3">
              {title ? <h2 className="sc m-0 text-lg font-medium">{title}</h2> : <span />}
              <button type="button" aria-label="Закрыть" onClick={onClose} className="press text-ink-muted">
                <Icon name="cross" size={20} />
              </button>
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export function Toaster() {
  const text = useToast((s) => s.text)
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[max(14px,env(safe-area-inset-top))] z-[60] flex justify-center px-4">
      <AnimatePresence>
        {text && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={ease}
            className="rounded-xl border border-rule-strong bg-paper-2 px-4 py-2.5 text-sm font-bold shadow-xl">
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
