import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'

import { Crest } from '../components/Crest'
import { NovaMark } from '../components/Nova'
import { Button, Card, Progress, Skeleton } from '../components/ui'
import { api, errorText, type HouseStats, type QuizResult } from '../lib/api'
import { houseCard } from '../lib/card'
import { shareResult } from '../lib/share'
import { bindBack, haptic, hapticResult } from '../lib/telegram'
import { useApp } from '../store/app'
import { useToast } from '../lib/toast'

export function QuizScreen({ onboarding = false, onDone }: { onboarding?: boolean; onDone: () => void }) {
  const cfg = useApp((s) => s.config)!
  const patchUser = useApp((s) => s.patchUser)
  const qc = useQueryClient()
  const toast = useToast((s) => s.show)
  const quiz = useQuery({ queryKey: ['quiz'], queryFn: api.quiz, staleTime: Infinity })
  const [step, setStep] = useState(-1) // -1 intro, 0..n-1 questions
  const [answers, setAnswers] = useState<number[]>([])
  const [result, setResult] = useState<(QuizResult & { stats: HouseStats }) | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => bindBack(onDone), [onDone])

  async function pick(i: number) {
    haptic('light')
    const next = [...answers.slice(0, step), i]
    setAnswers(next)
    const n = quiz.data!.questions.length
    if (step + 1 < n) {
      setStep(step + 1)
      return
    }
    setBusy(true)
    try {
      const r = await api.submitQuiz(next)
      hapticResult('success')
      setResult(r)
      patchUser({ house: r.house })
      qc.invalidateQueries({ queryKey: ['profile'] })
    } catch (e) {
      toast(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  async function share() {
    if (!result) return
    setBusy(true)
    try {
      const png = await houseCard({ appName: cfg.tenant.app_name, house: result.name, words: result.words, text: result.text, crest: result.crest, ranking: result.ranking })
      await shareResult('share_quiz', `Я — ${result.name}${result.words ? ` («${result.words}»)` : ''}. А какой дом ты?`, png)
    } finally {
      setBusy(false)
    }
  }

  const q = quiz.data
  return (
    <div className="sky fixed inset-0 z-30 mx-auto flex max-w-[480px] flex-col overflow-y-auto no-scrollbar">
      <div className="relative flex min-h-full flex-col px-5 pt-5 pb-[max(20px,env(safe-area-inset-bottom))] safe-top">
        <div className="flex items-center justify-between">
          <div className="text-[12px] font-bold tracking-[0.2em] text-gold uppercase">{q?.title ?? 'Тест'}</div>
          <button type="button" onClick={onDone} className="text-[13px] font-bold text-muted">{result ? 'Готово' : onboarding ? 'Позже' : 'Закрыть'}</button>
        </div>
        {!q ? (
          <div className="mt-10 flex flex-col gap-3"><Skeleton className="h-40" /><Skeleton className="h-14" /><Skeleton className="h-14" /></div>
        ) : result ? (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-1 flex-col items-center gap-4 pt-6 text-center">
            <motion.div initial={{ scale: 0.5, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 180, damping: 14 }} className="drop-shadow-[0_0_40px_rgba(244,201,93,0.35)]">
              <Crest spec={result.crest} size={150} />
            </motion.div>
            <div>
              <div className="text-[12px] font-bold tracking-[0.2em] text-muted uppercase">Твой дом</div>
              <div className="gold-text font-display text-[40px] leading-tight font-bold">{result.name}</div>
              {result.words && <div className="font-display text-[19px] italic text-muted">«{result.words}»</div>}
            </div>
            <p className="m-0 text-[15px] leading-relaxed">{result.text}</p>
            <Card className="w-full p-4 text-left">
              <div className="mb-3 text-[12px] font-bold tracking-wider text-dim uppercase">Совпадение</div>
              <div className="flex flex-col gap-3">
                {result.ranking.map((r, i) => (
                  <div key={r.house} className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-[14px] font-bold"><span>{r.name}</span><span className={i === 0 ? 'text-gold' : 'text-muted'}>{r.pct}%</span></div>
                    <Progress value={r.pct / 100} className={i === 0 ? 'bg-gold' : 'bg-nova/70'} />
                  </div>
                ))}
              </div>
            </Card>
            {result.stats.total > 0 && (
              <div className="text-[13px] text-muted">
                <span className="font-bold text-ink">{result.stats.houses[result.house] ?? 0}%</span> игроков{cfg.tenant.channel_title ? ` канала «${cfg.tenant.channel_title}»` : ''} тоже {result.name.replace(/^Дом /, 'из дома ')}
              </div>
            )}
            <div className="mt-auto flex w-full flex-col gap-2.5 pt-2">
              <Button icon="share" onClick={share} disabled={busy}>{busy ? 'Готовим карточку…' : 'Поделиться карточкой'}</Button>
              <Button kind="secondary" onClick={onDone}>{onboarding ? 'В приложение' : 'Готово'}</Button>
            </div>
          </motion.div>
        ) : step < 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
            <NovaMark size={84} />
            <h1 className="m-0 font-display text-[38px] leading-tight font-bold">{q.title}</h1>
            <p className="m-0 max-w-[320px] text-[15px] leading-relaxed text-muted">{onboarding && cfg.tenant.welcome ? `${cfg.tenant.welcome} ` : ''}{q.intro}</p>
            <div className="flex -space-x-3 py-2">
              {cfg.houses.filter((h) => h.great).slice(0, 6).map((h) => <Crest key={h.id} spec={h.crest} size={40} />)}
            </div>
            <Button onClick={() => setStep(0)} className="w-full">Начать · {q.questions.length} вопросов</Button>
          </div>
        ) : (
          <div className="flex flex-1 flex-col pt-6">
            <Progress value={step / q.questions.length} />
            <div className="mt-2 text-[12px] font-bold text-dim">Вопрос {step + 1} из {q.questions.length}</div>
            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.22 }} className="flex flex-col gap-3 pt-5">
                <h2 className="m-0 mb-2 font-display text-[28px] leading-tight font-bold">{q.questions[step].text}</h2>
                {q.questions[step].answers.map((a, i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={busy}
                    onClick={() => pick(i)}
                    className={`press rounded-2xl border px-4 py-4 text-left text-[15px] font-semibold ${answers[step] === i ? 'border-gold bg-gold/10' : 'border-line-2 bg-surface/90'}`}
                  >
                    {a}
                  </button>
                ))}
              </motion.div>
            </AnimatePresence>
            {step > 0 && <button type="button" onClick={() => setStep(step - 1)} className="mt-5 self-start text-[13px] font-bold text-muted">← Назад</button>}
          </div>
        )}
      </div>
    </div>
  )
}
