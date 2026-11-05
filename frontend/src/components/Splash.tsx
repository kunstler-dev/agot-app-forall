import { motion } from 'framer-motion'

import { NovaMark } from './Nova'

/** Launch screen: the nova flashes, then "Stella Nova Labs presents" and the app name. */
export function Splash({ appName, error, onRetry }: { appName?: string; error?: string | null; onRetry?: () => void }) {
  return (
    <div className="sky relative flex h-full flex-col items-center justify-center overflow-hidden px-6 text-center">
      <motion.div
        className="absolute h-[420px] w-[420px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(244,201,93,0.35), rgba(139,124,255,0.12) 40%, transparent 70%)' }}
        initial={{ scale: 0.2, opacity: 0 }}
        animate={{ scale: [0.2, 1.4, 1], opacity: [0, 1, 0.6] }}
        transition={{ duration: 1.4, ease: 'easeOut' }}
      />
      <motion.div
        initial={{ scale: 0, rotate: -45, opacity: 0 }}
        animate={{ scale: [0, 1.25, 1], rotate: 0, opacity: 1 }}
        transition={{ duration: 0.9, ease: [0.2, 0.9, 0.3, 1.2] }}
        className="relative"
      >
        <NovaMark size={120} />
      </motion.div>
      <motion.div
        className="relative mt-6 font-brand text-[12px] tracking-[0.32em] text-muted"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.6 }}
      >
        STELLA NOVA LABS PRESENTS
      </motion.div>
      {appName && (
        <motion.div
          className="gold-text relative mt-3 font-display text-[44px] leading-none font-bold"
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.15, duration: 0.6 }}
        >
          {appName}
        </motion.div>
      )}
      {error && (
        <div className="relative mt-8 flex flex-col items-center gap-3">
          <div className="text-[13px] text-danger">Не удалось подключиться: {error}</div>
          {onRetry && (
            <button type="button" onClick={onRetry} className="press rounded-xl border border-line-2 bg-surface-2 px-5 py-2.5 text-[14px] font-bold">
              Повторить
            </button>
          )}
        </div>
      )}
    </div>
  )
}
