import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'

import { Splash } from './components/Splash'
import { TabBar } from './components/TabBar'
import { Toaster } from './components/ui'
import { initTelegram } from './lib/telegram'
import { AboutScreen } from './screens/AboutScreen'
import { AdminScreen } from './screens/AdminScreen'
import { MapScreen } from './screens/MapScreen'
import { PredictionsScreen } from './screens/PredictionsScreen'
import { ProfileScreen } from './screens/ProfileScreen'
import { QuizScreen } from './screens/QuizScreen'
import { SubscribeGate } from './screens/SubscribeGate'
import { TodayScreen } from './screens/TodayScreen'
import { useApp } from './store/app'

const SCREENS = { today: TodayScreen, predictions: PredictionsScreen, map: MapScreen, profile: ProfileScreen }
const MIN_SPLASH_MS = 1900
export default function App() {
  const { tab, me, config, error, load, overlay, open, onboarding, finishOnboarding } = useApp()
  const [splashDone, setSplashDone] = useState(false)

  useEffect(() => {
    initTelegram()
    void load()
    const t = setTimeout(() => setSplashDone(true), MIN_SPLASH_MS)
    return () => clearTimeout(t)
  }, [load])

  const close = useCallback(() => open(null), [open])

  if (!me || !config || !splashDone) return <Splash appName={config?.tenant.app_name} error={error} onRetry={() => void load()} />
  if (!me.subscription.ok) return <SubscribeGate />

  const Screen = SCREENS[tab]
  return (
    <div className="sky relative mx-auto flex h-full max-w-[480px] flex-col overflow-hidden">
      <main className={`relative min-h-0 flex-1 ${tab === 'map' ? 'overflow-hidden' : 'overflow-y-auto'} no-scrollbar`}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={tab} className="h-full" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}>
            <Screen />
          </motion.div>
        </AnimatePresence>
      </main>
      <TabBar />
      {(onboarding || overlay === 'quiz') && <QuizScreen onboarding={onboarding} onDone={onboarding ? finishOnboarding : close} />}
      {overlay === 'about' && <AboutScreen onClose={close} />}
      {overlay === 'admin' && <AdminScreen onClose={close} />}
      <Toaster />
    </div>
  )
}
