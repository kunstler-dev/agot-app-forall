import { motion } from 'framer-motion'

import { NovaMark } from './Nova'
import { ease } from '../lib/format'

/** Launch: the engraved nova draws itself, then one line of type. One second at most; a tap skips it. */
export function Splash({ appName, error, onRetry, onSkip }: { appName?: string; error?: string | null; onRetry?: () => void; onSkip?: () => void }) {
  return (
    <div className="paper flex h-full flex-col justify-center px-8" onClick={onSkip}>
      <div className="relative">
        <NovaMark size={72} draw className="text-ink" />
        <motion.div className="sc mt-5 text-sm text-ink-muted" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ ...ease, delay: 0.45 }}>
          Stella Nova Labs представляет
        </motion.div>
        {appName && (
          <motion.div className="sc mt-1 text-2xl text-ink" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...ease, delay: 0.6 }}>
            {appName}
          </motion.div>
        )}
        {error && (
          <div className="mt-8 flex flex-col items-start gap-3">
            <p className="m-0 text-base italic text-wax">Ворон не долетел: {error}</p>
            {onRetry && (
              <button type="button" onClick={onRetry} className="sc press border border-rule-strong px-4 py-2 text-sm">
                Ещё раз
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
