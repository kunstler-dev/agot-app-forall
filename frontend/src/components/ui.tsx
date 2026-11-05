import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, type ReactNode } from 'react'

import { bindBack, haptic } from '../lib/telegram'
import { useToast } from '../lib/toast'
import { Icon, type IconName } from './icons'

export function Card({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={`rounded-2xl border border-line bg-surface/90 backdrop-blur-sm ${onClick ? 'press cursor-pointer' : ''} ${className}`}>
      {children}
    </div>
  )
}

export function Button({
  children,
  onClick,
  kind = 'primary',
  disabled,
  icon,
  className = '',
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  kind?: 'primary' | 'secondary' | 'ghost' | 'danger'
  disabled?: boolean
  icon?: IconName
  className?: string
  type?: 'button' | 'submit'
}) {
  const styles = {
    primary: 'bg-gradient-to-b from-[#ffe39a] via-gold to-gold-deep text-night shadow-[0_6px_24px_-8px_rgba(244,201,93,0.6)]',
    secondary: 'border border-line-2 bg-surface-2 text-ink',
    ghost: 'text-muted',
    danger: 'border border-danger/40 bg-danger/10 text-danger',
  }[kind]
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={() => {
        haptic('light')
        onClick?.()
      }}
      className={`press flex items-center justify-center gap-2 rounded-[14px] px-4 py-3.5 text-[15px] font-extrabold disabled:opacity-50 ${styles} ${className}`}
    >
      {icon && <Icon name={icon} size={18} />}
      {children}
    </button>
  )
}

export function Header({ title, subtitle, right, onBack }: { title: string; subtitle?: string; right?: ReactNode; onBack?: () => void }) {
  return (
    <div className="flex items-start gap-3">
      {onBack && (
        <button type="button" aria-label="Назад" onClick={onBack} className="press mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-surface">
          <Icon name="back" size={20} />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="m-0 font-display text-[30px] leading-[1.05] font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1.5 mb-0 text-[13px] leading-snug text-muted">{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}

export function Segmented<T extends string>({ value, options, onChange, small }: { value: T; options: [T, string][]; onChange: (v: T) => void; small?: boolean }) {
  return (
    <div className="grid gap-1 rounded-[14px] border border-line bg-surface p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => {
            haptic('light')
            onChange(v)
          }}
          className={`relative rounded-[10px] ${small ? 'py-1.5 text-[12px]' : 'py-2.5 text-[13px]'} font-bold transition-colors ${v === value ? 'text-night' : 'text-muted'}`}
        >
          {v === value && <motion.span layoutId={`seg-${options.map((o) => o[0]).join()}`} className="absolute inset-0 rounded-[10px] bg-gold" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
          <span className="relative">{label}</span>
        </button>
      ))}
    </div>
  )
}

export function Progress({ value, className = 'bg-gold', height = 6 }: { value: number; className?: string; height?: number }) {
  return (
    <div className="overflow-hidden rounded-full bg-surface-3" style={{ height }}>
      <div className={`h-full rounded-full transition-[width] duration-500 ${className}`} style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </div>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded-2xl ${className}`} />
}

export function Empty({ icon = 'star', title, text, action }: { icon?: IconName; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <div className="mb-1 flex h-14 w-14 items-center justify-center rounded-full border border-line bg-surface-2 text-gold">
        <Icon name={icon} size={26} />
      </div>
      <div className="font-display text-[20px] font-bold">{title}</div>
      {text && <div className="max-w-[280px] text-[13px] text-muted">{text}</div>}
      {action}
    </div>
  )
}

export function Pill({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center gap-1 rounded-full border border-line-2 bg-surface-2 px-2.5 py-1 text-[11px] font-bold ${className}`}>{children}</span>
}

/** Bottom sheet with a backdrop; the Telegram back button closes it. */
export function Sheet({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: ReactNode; title?: string }) {
  useEffect(() => (open ? bindBack(onClose) : undefined), [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-40 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[88vh] max-w-[480px] overflow-y-auto rounded-t-[26px] border-t border-line-2 bg-surface px-5 pt-3 pb-[max(20px,env(safe-area-inset-bottom))] no-scrollbar"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => info.offset.y > 120 && onClose()}
          >
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line-2" />
            {title && <div className="mb-3 font-display text-[24px] font-bold">{title}</div>}
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
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="rounded-2xl border border-line-2 bg-surface-2/95 px-4 py-2.5 text-[13px] font-semibold shadow-xl backdrop-blur"
          >
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 text-[11px] font-bold tracking-[0.2em] text-dim uppercase">
      <span className="h-px flex-1 bg-line" />
      {label}
      <span className="h-px flex-1 bg-line" />
    </div>
  )
}
